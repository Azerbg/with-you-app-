/**
 * Shared user-display utilities.
 * Safe against null / undefined — never throws.
 */

interface DisplayUser {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

/**
 * Returns a human-readable display name.
 * Priority: firstName + lastName → email prefix → fallback.
 */
export function getDisplayName(
  user: DisplayUser,
  fallback = "Élève",
): string {
  const first = user.firstName?.trim();
  const last  = user.lastName?.trim();
  if (first && last)  return `${first} ${last}`;
  if (first)          return first;
  if (last)           return last;
  if (user.email)     return user.email.split("@")[0];
  return fallback;
}

/**
 * Returns 1-2 uppercase initials from any non-empty string.
 * Never throws even if name is empty.
 */
export function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || name[0].toUpperCase();
}
