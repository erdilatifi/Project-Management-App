/**
 * Utility functions for displaying user names consistently across the app
 */

const PLACEHOLDER_LABELS = new Set([
  "unknown",
  "unknown user",
  "unknown-user",
  "unknown_user",
  "no email",
  "no-email",
  "no_email",
]);

const sanitize = (value?: string | null) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  if (PLACEHOLDER_LABELS.has(trimmed.toLowerCase())) return null;
  return trimmed;
};

/**
 * Get display name from profile data
 * Priority: full_name > username > email username part
 */
export function getUserDisplayName(profile: {
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  display_name?: string | null;
  id?: string | null;
}): string {
  const fromFullName = sanitize(profile.full_name);
  if (fromFullName) return fromFullName;

  const fromDisplayName = sanitize(profile.display_name);
  if (fromDisplayName) return fromDisplayName;

  const fromUsername = sanitize(profile.username);
  if (fromUsername) return fromUsername;

  const sanitizedEmail = sanitize(profile.email);
  if (sanitizedEmail) {
    const emailParts = sanitizedEmail.split('@');
    if (emailParts[0]) {
      return emailParts[0];
    }
  }

  const fromId = sanitize(profile.id);
  if (fromId) return fromId.slice(0, 8);

  return 'User';
}

/**
 * Get initials from a display name
 */
export function getInitials(name: string): string {
  if (!name || !name.trim()) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  return name[0].toUpperCase();
}
