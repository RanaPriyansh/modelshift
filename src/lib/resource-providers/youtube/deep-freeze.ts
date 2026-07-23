/**
 * Fixture contracts are value objects. Freezing the complete parsed value
 * prevents a caller from mutating a nested policy field after validation.
 */
export function deepFreeze<T>(value: T): T {
  const visited = new WeakSet<object>();

  function freeze(candidate: unknown): void {
    if (candidate === null || typeof candidate !== "object" || visited.has(candidate)) return;
    visited.add(candidate);
    for (const child of Object.values(candidate)) freeze(child);
    Object.freeze(candidate);
  }

  freeze(value);
  return value;
}
