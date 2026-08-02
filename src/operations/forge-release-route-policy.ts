export const FORGE_CANONICAL_ROUTE_PATHNAMES = [
  "/",
  "/app",
  "/how-forge-works",
  "/university",
  "/privacy",
  "/terms",
  "/support",
  "/api/health",
] as const;

export const FORGE_METADATA_ROUTE_PATHNAMES = [
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/opengraph-image",
  "/twitter-image",
  "/icon.svg",
] as const;

const SAFE_METHODS = new Set(["GET", "HEAD"]);
const CANONICAL_PATHNAMES = new Set<string>(FORGE_CANONICAL_ROUTE_PATHNAMES);
const METADATA_PATHNAMES = new Set<string>(FORGE_METADATA_ROUTE_PATHNAMES);
const FORBIDDEN_ENCODED_PATH_BYTES = /%(?:00|2f|5c)/i;

export type ForgeReleaseRouteKind = "canonical" | "metadata" | "framework" | "retired";

export type ForgeReleaseRouteDecision = Readonly<{
  allowed: boolean;
  kind: ForgeReleaseRouteKind;
  method: string;
  pathname: string | null;
}>;

/**
 * Convert a request pathname to the form used by the release allowlist.
 * Query strings and fragments do not create separate application routes.
 */
export function normalizeForgeReleasePathname(pathname: unknown): string | null {
  if (typeof pathname !== "string") return null;

  const queryOrFragment = pathname.search(/[?#]/);
  const rawPathname = queryOrFragment === -1 ? pathname : pathname.slice(0, queryOrFragment);

  if (
    rawPathname === ""
    || !rawPathname.startsWith("/")
    || rawPathname.startsWith("//")
    || rawPathname.includes("\\")
    || FORBIDDEN_ENCODED_PATH_BYTES.test(rawPathname)
  ) {
    return null;
  }

  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(rawPathname);
  } catch {
    return null;
  }

  if (
    !decodedPathname.startsWith("/")
    || decodedPathname.startsWith("//")
    || decodedPathname.includes("\\")
    || decodedPathname.includes("\0")
  ) {
    return null;
  }

  const segments = decodedPathname.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) return null;

  const collapsedPathname = decodedPathname.replace(/\/{2,}/g, "/");
  return collapsedPathname === "/" ? "/" : collapsedPathname.replace(/\/+$/, "");
}

function normalizeMethod(method: unknown): string {
  return typeof method === "string" ? method.toUpperCase() : "";
}

function isNextFrameworkPath(pathname: string): boolean {
  return pathname === "/_next" || pathname.startsWith("/_next/");
}

/**
 * Keep only the release routes that belong to the Semester Desk product.
 * Retired route source stays in the repository but cannot become a public URL.
 */
export function classifyForgeReleaseRoute(
  method: unknown,
  pathname: unknown,
): ForgeReleaseRouteDecision {
  const normalizedMethod = normalizeMethod(method);
  const normalizedPathname = normalizeForgeReleasePathname(pathname);

  if (!SAFE_METHODS.has(normalizedMethod) || !normalizedPathname) {
    return {
      allowed: false,
      kind: "retired",
      method: normalizedMethod,
      pathname: normalizedPathname,
    };
  }

  if (CANONICAL_PATHNAMES.has(normalizedPathname)) {
    return {
      allowed: true,
      kind: "canonical",
      method: normalizedMethod,
      pathname: normalizedPathname,
    };
  }

  if (METADATA_PATHNAMES.has(normalizedPathname)) {
    return {
      allowed: true,
      kind: "metadata",
      method: normalizedMethod,
      pathname: normalizedPathname,
    };
  }

  if (isNextFrameworkPath(normalizedPathname)) {
    return {
      allowed: true,
      kind: "framework",
      method: normalizedMethod,
      pathname: normalizedPathname,
    };
  }

  return {
    allowed: false,
    kind: "retired",
    method: normalizedMethod,
    pathname: normalizedPathname,
  };
}
