export const BOUNDED_JSON_SNAPSHOT_LIMITS = Object.freeze({
  maximumNodes: 4_096,
  maximumDepth: 12,
  maximumArrayLength: 512,
  maximumObjectKeys: 256,
});

const ARRAY_INDEX = /^(0|[1-9]\d*)$/;

export interface BoundedJsonSnapshotOptions {
  /**
   * Accepts dictionary objects created with `Object.create(null)`. This is
   * reserved for already-detached internal projector snapshots; request
   * ingestion keeps the ordinary-object-only default.
   */
  readonly allowNullPrototypeObjects?: boolean;
  /**
   * Optional trusted-runtime classifier checked before reflective traversal.
   * Server-only callers use this with Node's intrinsic Proxy detector so a
   * caller Proxy is refused without invoking any of its traps.
   */
  readonly rejectObject?: (value: object) => boolean;
}

/**
 * Detaches one bounded, finite JSON-shaped snapshot from an untrusted graph.
 *
 * The source graph is inspected only through own-property descriptors. In
 * particular, caller getters and setters are never invoked. The returned
 * objects and arrays have ordinary prototypes and data properties, so schema
 * parsers never need to traverse the caller's graph.
 *
 * Browser JavaScript cannot intrinsically identify a transparent Proxy.
 * Reflection traps may therefore run while descriptors are captured; revoked
 * or throwing traps fail the snapshot closed at the calling boundary. A
 * transparent Proxy is still detached without any ordinary property reads.
 */
export function boundedJsonSnapshot(
  value: unknown,
  options: Readonly<BoundedJsonSnapshotOptions> = {},
): unknown {
  const budget = { nodes: 0 };

  function visit(candidate: unknown, depth: number): unknown {
    budget.nodes += 1;
    if (
      budget.nodes > BOUNDED_JSON_SNAPSHOT_LIMITS.maximumNodes
      || depth > BOUNDED_JSON_SNAPSHOT_LIMITS.maximumDepth
    ) {
      throw new TypeError("Input graph exceeds the bounded JSON snapshot boundary.");
    }
    if (
      candidate === null
      || typeof candidate === "string"
      || typeof candidate === "boolean"
      || (typeof candidate === "number" && Number.isFinite(candidate))
    ) {
      return candidate;
    }
    if (typeof candidate !== "object") {
      throw new TypeError("Input must be finite JSON data.");
    }
    if (options.rejectObject?.(candidate) === true) {
      throw new TypeError("Input object is not allowed.");
    }

    if (Array.isArray(candidate)) {
      if (Object.getPrototypeOf(candidate) !== Array.prototype) {
        throw new TypeError("Input array is not allowed.");
      }
      const lengthDescriptor = Object.getOwnPropertyDescriptor(candidate, "length");
      if (
        !lengthDescriptor
        || !("value" in lengthDescriptor)
        || typeof lengthDescriptor.value !== "number"
        || !Number.isSafeInteger(lengthDescriptor.value)
        || lengthDescriptor.value < 0
        || lengthDescriptor.value > BOUNDED_JSON_SNAPSHOT_LIMITS.maximumArrayLength
      ) {
        throw new TypeError("Input array is not allowed.");
      }
      const length = lengthDescriptor.value;
      const keys = Reflect.ownKeys(candidate);
      if (
        keys.some((key) => (
          key !== "length"
          && (typeof key !== "string" || !ARRAY_INDEX.test(key))
        ))
      ) {
        throw new TypeError("Input array has undeclared properties.");
      }
      const output: unknown[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(candidate, String(index));
        if (
          !descriptor
          || !descriptor.enumerable
          || !("value" in descriptor)
          || descriptor.get
          || descriptor.set
        ) {
          throw new TypeError("Input arrays must be dense data arrays.");
        }
        output.push(visit(descriptor.value, depth + 1));
      }
      return output;
    }

    const prototype = Object.getPrototypeOf(candidate);
    if (
      prototype !== Object.prototype
      && !(options.allowNullPrototypeObjects === true && prototype === null)
    ) {
      throw new TypeError("Input objects must use the ordinary object prototype.");
    }
    const keys = Reflect.ownKeys(candidate);
    if (
      keys.length > BOUNDED_JSON_SNAPSHOT_LIMITS.maximumObjectKeys
      || keys.some((key) => typeof key !== "string")
    ) {
      throw new TypeError("Input object keys are not allowed.");
    }
    const output: Record<string, unknown> = {};
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
      if (
        !descriptor
        || !descriptor.enumerable
        || !("value" in descriptor)
        || descriptor.get
        || descriptor.set
      ) {
        throw new TypeError("Input accessors are not allowed.");
      }
      Object.defineProperty(output, key, {
        configurable: true,
        enumerable: true,
        value: visit(descriptor.value, depth + 1),
        writable: true,
      });
    }
    return output;
  }

  return visit(value, 0);
}
