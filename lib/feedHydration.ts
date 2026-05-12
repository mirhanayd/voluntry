import {
  doc,
  getDoc,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FeedPost } from "@/components/FeedCard";
import {
  asString,
  getOrganizerDisplayName,
  getStudentDisplayName,
  isOrganizerNamePlaceholder,
} from "@/lib/profileNames";

type Cache = Map<string, DocumentData | null>;

async function readCached(
  collectionName: "certificates" | "events" | "users",
  id: string,
  cache: Cache
): Promise<DocumentData | null> {
  const key = `${collectionName}:${id}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  let data: DocumentData | null = null;
  try {
    const snap = await getDoc(doc(db, collectionName, id));
    data = snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error(`Failed to load ${collectionName}/${id}:`, err);
  }
  cache.set(key, data);
  return data;
}

export async function hydrateFeedPosts(posts: FeedPost[]): Promise<FeedPost[]> {
  const cache: Cache = new Map();

  return Promise.all(
    posts.map(async (post) => {
      const next: FeedPost = { ...post };
      const type = next.type || "achievement";
      const studentId = asString(next.userId);

      if (
        studentId &&
        (type === "achievement" || type === "certificate_share") &&
        (!asString(next.studentName) || !asString(next.avatarURL))
      ) {
        const studentData = await readCached("users", studentId, cache);
        if (studentData) {
          next.studentName =
            asString(next.studentName) || getStudentDisplayName(studentData, "");
          next.avatarURL =
            asString(next.avatarURL) || asString(studentData.avatarURL);
          next.universityName =
            asString(next.universityName) || asString(studentData.universityName);
          next.departmentName =
            asString(next.departmentName) || asString(studentData.departmentName);
        }
      }

      const certificateId = asString(next.certificateId);
      const certificateData =
        !asString(next.eventId) && certificateId
          ? await readCached("certificates", certificateId, cache)
          : null;
      const eventId = asString(next.eventId) || asString(certificateData?.eventId);
      const needsOrganizer =
        eventId ||
        asString(next.organizerId) ||
        isOrganizerNamePlaceholder(next.organizerName) ||
        !asString(next.organizerAvatarURL);

      if (needsOrganizer) {
        const eventData = eventId
          ? await readCached("events", eventId, cache)
          : null;
        const organizerId =
          asString(next.organizerId) ||
          asString(certificateData?.organizerId) ||
          asString(eventData?.organizerId);
        const organizerData = organizerId
          ? await readCached("users", organizerId, cache)
          : null;

        const postName = asString(next.organizerName);
        const certificateName = asString(certificateData?.organizerName);
        const eventName = asString(eventData?.organizerName);
        const profileName = organizerData
          ? getOrganizerDisplayName(organizerData, "")
          : "";

        next.organizerName = isOrganizerNamePlaceholder(postName)
          ? isOrganizerNamePlaceholder(certificateName)
            ? isOrganizerNamePlaceholder(eventName)
              ? profileName || "Organization"
              : eventName
            : certificateName
          : postName;
        next.eventId = eventId || asString(next.eventId) || undefined;
        next.organizerId = organizerId || asString(next.organizerId) || undefined;
        next.organizerAvatarURL =
          asString(next.organizerAvatarURL) ||
          asString(certificateData?.organizerAvatarURL) ||
          asString(eventData?.organizerAvatarURL) ||
          asString(organizerData?.avatarURL) ||
          undefined;
      }

      return next;
    })
  );
}
