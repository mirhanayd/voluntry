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

      // Always fetch fresh user data for student posts so that avatar
      // and name stay up-to-date even after the user changes their profile.
      if (
        studentId &&
        (type === "achievement" || type === "certificate_share")
      ) {
        const studentData = await readCached("users", studentId, cache);
        if (studentData) {
          next.studentName =
            asString(next.studentName) || getStudentDisplayName(studentData, "");
          // Always prefer the live profile avatar over the snapshot stored in
          // the feed-post document so profile-picture changes propagate.
          next.avatarURL =
            asString(studentData.avatarURL) || asString(next.avatarURL);
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

      // Always attempt to resolve the organizer so the avatar stays fresh.
      const organizerId =
        asString(next.organizerId) ||
        asString(certificateData?.organizerId);

      const eventData = eventId
        ? await readCached("events", eventId, cache)
        : null;

      const resolvedOrganizerId =
        organizerId ||
        asString(eventData?.organizerId);

      const organizerData = resolvedOrganizerId
        ? await readCached("users", resolvedOrganizerId, cache)
        : null;

      // Resolve organizer name
      const postName = asString(next.organizerName);
      const certificateName = asString(certificateData?.organizerName);
      const eventName = asString(eventData?.organizerName);
      const profileName = organizerData
        ? getOrganizerDisplayName(organizerData, "")
        : "";

      if (
        isOrganizerNamePlaceholder(postName) ||
        !postName
      ) {
        next.organizerName = isOrganizerNamePlaceholder(certificateName)
          ? isOrganizerNamePlaceholder(eventName)
            ? profileName || "Organization"
            : eventName
          : certificateName;
      }

      next.eventId = eventId || asString(next.eventId) || undefined;
      next.organizerId = resolvedOrganizerId || asString(next.organizerId) || undefined;

      // Always prefer the live organizer profile avatar so profile-picture
      // changes propagate to feed posts.
      next.organizerAvatarURL =
        asString(organizerData?.avatarURL) ||
        asString(next.organizerAvatarURL) ||
        asString(certificateData?.organizerAvatarURL) ||
        asString(eventData?.organizerAvatarURL) ||
        undefined;

      return next;
    })
  );
}
