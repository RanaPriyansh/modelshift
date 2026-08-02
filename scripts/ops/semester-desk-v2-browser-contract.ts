/**
 * The only browser release flow for FORGE.
 *
 * Both local-source and production-artifact checks must exercise this exact
 * student journey in both configured browser projects.
 */
export const SEMESTER_DESK_V2_CANONICAL_BROWSER_SPEC =
  "tests/e2e/semester-desk-v2-canonical.spec.ts" as const;

export const SEMESTER_DESK_V2_BROWSER_PROJECTS = Object.freeze([
  "desktop",
  "mobile",
] as const);

export const SEMESTER_DESK_V2_LOCAL_REPORT_DIRECTORY =
  "semester-desk-v2-local" as const;

export const SEMESTER_DESK_V2_PRODUCTION_REPORT_DIRECTORY =
  "semester-desk-v2-production" as const;
