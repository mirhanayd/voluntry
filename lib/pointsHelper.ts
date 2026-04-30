import {
  doc,
  getDoc,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

/**
 * Award points to a user via a Firestore transaction.
 *  1. Reads users/{uid}, increments the `points` field.
 *  2. Updates any matching participation (userId + eventId) to set attendanceConfirmed: true.
 */
export async function awardPoints(
  uid: string,
  eventId: string,
  points: number
): Promise<void> {
  // ── Client-side auth guard ──────────────────────────────────────────────
  if (!auth.currentUser) {
    throw new Error("Not authenticated");
  }

  const userRef = doc(db, "users", uid);

  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error(`User ${uid} not found`);
    }

    const currentPoints: number = userSnap.data().points ?? 0;
    transaction.update(userRef, { points: currentPoints + points });
  });

  // Update matching participations outside the transaction
  // (Firestore transactions only support document references, not queries)
  const partQuery = query(
    collection(db, "participations"),
    where("userId", "==", uid),
    where("eventId", "==", eventId)
  );
  const partSnap = await getDocs(partQuery);

  for (const partDoc of partSnap.docs) {
    const { updateDoc: fbUpdateDoc } = await import("firebase/firestore");
    await fbUpdateDoc(partDoc.ref, { attendanceConfirmed: true });
  }
}

/**
 * Generate a certificate document in the "certificates" collection.
 * Reads event and user data, then writes the certificate.
 */
export async function generateCertificate(
  uid: string,
  eventId: string
): Promise<string> {
  // ── Client-side auth guard ──────────────────────────────────────────────
  if (!auth.currentUser) {
    throw new Error("Not authenticated");
  }

  // Read event document
  const eventSnap = await getDoc(doc(db, "events", eventId));
  if (!eventSnap.exists()) {
    throw new Error(`Event ${eventId} not found`);
  }
  const eventData = eventSnap.data();

  // Read user document
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) {
    throw new Error(`User ${uid} not found`);
  }
  const userData = userSnap.data();

  // Write certificate
  const certRef = await addDoc(collection(db, "certificates"), {
    uid,
    eventId,
    eventTitle: eventData.title ?? "",
    eventDate: eventData.date ?? "",
    organizerName: eventData.organizerName ?? "",
    pointValue: eventData.pointValue ?? 0,
    studentName: userData.fullName ?? "",
    universityName: userData.universityName ?? "",
    departmentName: userData.departmentName ?? "",
    issuedAt: new Date().toISOString(),
  });

  // Reuse userData already fetched above (no redundant Firestore read)
  const avatarURL =
    typeof userData.avatarURL === "string" &&
    userData.avatarURL.trim() !== ""
      ? userData.avatarURL
      : "";

  await addDoc(collection(db, "feed-posts"), {
    userId: uid,
    eventId,
    eventTitle: eventData.title ?? "",
    eventDate: eventData.date ?? "",
    organizerName: eventData.organizerName ?? "",
    pointValue: eventData.pointValue ?? 0,
    studentName: userData.fullName ?? "",
    universityName: userData.universityName ?? "",
    departmentName: userData.departmentName ?? "",
    certificateId: certRef.id,
    avatarURL,
    isPublic: true,
    createdAt: new Date().toISOString(),
  });

  // The auto-generated Firestore id is already the doc id
  // Optionally store it inside the document for easy access
  const { updateDoc: fbUpdateDoc } = await import("firebase/firestore");
  await fbUpdateDoc(certRef, { certificateId: certRef.id });

  return certRef.id;
}

