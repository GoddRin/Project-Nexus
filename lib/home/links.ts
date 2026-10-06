/**
 * Links out of Nexus Home, in one place.
 *
 * The National Project Atlas selects a project from `?select=<slug>` (see the "Handle URL
 * ?select={id}" effect in app/(dashboard)/dashboard/projects-map/ScicNationalMapClient.tsx,
 * which also accepts a project id or code). The Atlas is a public route, so these links work
 * signed out as well.
 */
export const HOME_HREF = "/home";
export const COMMAND_CENTER_HREF = "/dashboard";
export const ATLAS_HREF = "/dashboard/projects-map";

/** The Atlas, opened on one project */
export function atlasHref(slug: string): string {
  return `${ATLAS_HREF}?select=${encodeURIComponent(slug)}`;
}

/** A project's own profile page */
export function projectHref(id: string): string {
  return `/dashboard/projects/${encodeURIComponent(id)}`;
}

/** A Newsroom post */
export function newsHref(slug: string): string {
  return `${HOME_HREF}/news/${encodeURIComponent(slug)}`;
}
