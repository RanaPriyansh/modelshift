import "server-only";

/**
 * Production binding-key activation needs a separately reviewed server secret
 * source. The university account-context boundary stays unavailable until then.
 */
export function readUniversityAccountContextBindingKey(): Uint8Array | null {
  return null;
}
