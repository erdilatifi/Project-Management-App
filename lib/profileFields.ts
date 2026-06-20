/** DB column for job/role title on `profiles` (not `job_title`). */
export const PROFILE_ROLE_COLUMN = "role_title" as const;

export function getProfileRoleTitle(
  profile: { role_title?: string | null; job_title?: string | null } | null | undefined
): string {
  if (!profile) return "";
  const value = profile.role_title ?? profile.job_title;
  return typeof value === "string" ? value : "";
}
