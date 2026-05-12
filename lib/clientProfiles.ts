import { doc, getDoc, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  asString,
  getOrganizerDisplayName,
  isOrganizerNamePlaceholder,
} from "@/lib/profileNames";

export interface ResolvedOrganizer {
  id?: string;
  name: string;
  avatarURL?: string;
}

async function readUser(uid: string): Promise<DocumentData | null> {
  if (!uid) return null;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function resolveOrganizerFromEventData(
  eventData: DocumentData | Record<string, unknown> | null | undefined
): Promise<ResolvedOrganizer> {
  const organizerId = asString(eventData?.organizerId);
  const organizerProfile = organizerId ? await readUser(organizerId) : null;
  const eventName = asString(eventData?.organizerName);
  const profileName = organizerProfile
    ? getOrganizerDisplayName(organizerProfile, "")
    : "";

  const name = isOrganizerNamePlaceholder(eventName)
    ? profileName || "Organization"
    : eventName || profileName || "Organization";

  const avatarURL =
    asString(eventData?.organizerAvatarURL) ||
    asString(organizerProfile?.avatarURL);

  return {
    id: organizerId || undefined,
    name,
    avatarURL: avatarURL || undefined,
  };
}

export async function resolveOrganizerForEvent(
  eventId: string,
  eventData?: DocumentData | Record<string, unknown> | null
): Promise<ResolvedOrganizer> {
  if (eventData) return resolveOrganizerFromEventData(eventData);
  if (!eventId) return { name: "Organization" };

  const eventSnap = await getDoc(doc(db, "events", eventId));
  return resolveOrganizerFromEventData(
    eventSnap.exists() ? eventSnap.data() : null
  );
}
