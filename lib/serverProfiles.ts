import { adminDb } from "@/lib/firebaseAdmin";
import {
  asString,
  getOrganizerDisplayName,
  isOrganizerNamePlaceholder,
} from "@/lib/profileNames";

export async function resolveCertificateOrganizerName(
  cert: Record<string, unknown>
): Promise<string> {
  const certificateName = asString(cert.organizerName);
  if (!isOrganizerNamePlaceholder(certificateName)) return certificateName;

  const eventId = asString(cert.eventId);
  let eventData: Record<string, unknown> | null = null;

  if (eventId) {
    const eventSnap = await adminDb.collection("events").doc(eventId).get();
    eventData = eventSnap.exists ? eventSnap.data() ?? null : null;
  }

  const eventName = asString(eventData?.organizerName);
  if (!isOrganizerNamePlaceholder(eventName)) return eventName;

  const organizerId = asString(cert.organizerId) || asString(eventData?.organizerId);
  if (!organizerId) return "Organization";

  const organizerSnap = await adminDb.collection("users").doc(organizerId).get();
  return getOrganizerDisplayName(
    organizerSnap.exists ? organizerSnap.data() ?? null : null,
    "Organization"
  );
}
