/**
 * Job-title utilities — dynamic, not hardcoded.
 *
 * A role's slug is the canonical source of truth.
 * Convention: slug "some-role-name" → job_title "some_role_name"
 * (hyphen → underscore, already lowercase)
 *
 * Seniority is computed from the slug:
 *   - "admin"              → highest (0)
 *   - ends with "manager" or "director" (or those bare slugs) → high (1)
 *   - otherwise            → standard (2)
 * Within the same tier, alphabetical ordering is used as a tiebreak.
 *
 * This means any custom role the admin creates (e.g. "content-strategist")
 * automatically gets job_title "content_strategist" with standard seniority,
 * and a "content-lead" role (ends with neither "manager" nor "admin") would
 * sit at the standard tier too.
 */

/** Convert a role slug to a job_title value by replacing hyphens with underscores. */
export function slugToJobTitle(slug: string): string {
  return slug.replace(/-/g, "_");
}

/**
 * Compute a numeric seniority score for a slug (lower = more senior).
 * Used to pick the "most senior" title from a set of assigned roles.
 */
export function slugSeniority(slug: string): number {
  if (slug === "admin") return 0;
  if (
    slug.endsWith("-director") ||
    slug === "director" ||
    slug.endsWith("-manager") ||
    slug === "manager"
  )
    return 1;
  return 2;
}

/**
 * Given an array of role slugs, return the job_title derived from
 * the most senior one. Returns null if the array is empty.
 */
export function deriveMostSeniorJobTitle(slugs: string[]): string | null {
  if (!slugs.length) return null;
  const sorted = [...slugs].sort((a, b) => {
    const diff = slugSeniority(a) - slugSeniority(b);
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  });
  const best = sorted[0];
  if (!best) return null;
  return slugToJobTitle(best);
}
