export function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isOrganizerNamePlaceholder(value: unknown): boolean {
  const name = asString(value).toLocaleLowerCase("en-US");
  return name === "" || name === "organizer";
}

export function getOrganizerDisplayName(
  data: Record<string, unknown> | null | undefined,
  fallback = "Organization"
): string {
  if (!data) return fallback;

  const fullName =
    asString(data.fullName) ||
    `${asString(data.firstName)} ${asString(data.lastName)}`.trim();

  return (
    asString(data.organizationName) ||
    fullName ||
    asString(data.contactName) ||
    asString(data.displayName) ||
    asString(data.email) ||
    fallback
  );
}

export function getStudentDisplayName(
  data: Record<string, unknown> | null | undefined,
  fallback = "Student"
): string {
  if (!data) return fallback;

  const fullName =
    asString(data.fullName) ||
    `${asString(data.firstName)} ${asString(data.lastName)}`.trim();

  return fullName || asString(data.displayName) || asString(data.email) || fallback;
}
