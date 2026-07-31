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
  /**
   * Rejects cycles and repeated object references. Use this when the caller
   * must supply a tree that has the same reference semantics as parsed JSON.
   */
  readonly rejectRepeatedReferences?: boolean;
  /**
   * Rejects each string value and object key above this UTF-16 code-unit
   * length. Callers must supply a trusted non-negative safe integer.
   */
  readonly maximumStringLength?: number;
  /**
   * Rejects a snapshot when its exact UTF-8 JSON representation exceeds this
   * byte count. Callers must supply a trusted non-negative safe integer.
   */
  readonly maximumSerializedJsonBytes?: number;
}

function optionalTrustedLimit(
  name: string,
  value: number | undefined,
): number | null {
  if (value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative safe integer.`);
  }
  return value;
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
  const maximumStringLength = optionalTrustedLimit(
    "maximumStringLength",
    options.maximumStringLength,
  );
  const maximumSerializedJsonBytes = optionalTrustedLimit(
    "maximumSerializedJsonBytes",
    options.maximumSerializedJsonBytes,
  );
  const budget = { nodes: 0, serializedJsonBytes: 0 };
  const visited = options.rejectRepeatedReferences
    ? new WeakSet<object>()
    : null;

  function accountSerializedBytes(bytes: number): void {
    if (maximumSerializedJsonBytes === null) return;
    if (bytes > maximumSerializedJsonBytes - budget.serializedJsonBytes) {
      throw new TypeError(
        "Input exceeds the serialized JSON byte boundary.",
      );
    }
    budget.serializedJsonBytes += bytes;
  }

  function accountJsonString(candidate: string): void {
    if (
      maximumStringLength !== null
      && candidate.length > maximumStringLength
    ) {
      throw new TypeError("Input string exceeds the string-length boundary.");
    }
    if (maximumSerializedJsonBytes === null) return;

    accountSerializedBytes(2);
    for (let index = 0; index < candidate.length; index += 1) {
      const codeUnit = candidate.charCodeAt(index);
      if (
        codeUnit === 0x08
        || codeUnit === 0x09
        || codeUnit === 0x0a
        || codeUnit === 0x0c
        || codeUnit === 0x0d
        || codeUnit === 0x22
        || codeUnit === 0x5c
      ) {
        accountSerializedBytes(2);
      } else if (codeUnit <= 0x1f) {
        accountSerializedBytes(6);
      } else if (codeUnit <= 0x7f) {
        accountSerializedBytes(1);
      } else if (codeUnit <= 0x7ff) {
        accountSerializedBytes(2);
      } else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
        const nextCodeUnit = candidate.charCodeAt(index + 1);
        if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
          accountSerializedBytes(4);
          index += 1;
        } else {
          accountSerializedBytes(6);
        }
      } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
        accountSerializedBytes(6);
      } else {
        accountSerializedBytes(3);
      }
    }
  }

  function visit(candidate: unknown, depth: number): unknown {
    budget.nodes += 1;
    if (
      budget.nodes > BOUNDED_JSON_SNAPSHOT_LIMITS.maximumNodes
      || depth > BOUNDED_JSON_SNAPSHOT_LIMITS.maximumDepth
    ) {
      throw new TypeError("Input graph exceeds the bounded JSON snapshot boundary.");
    }
    if (candidate === null) {
      accountSerializedBytes(4);
      return candidate;
    }
    if (typeof candidate === "string") {
      accountJsonString(candidate);
      return candidate;
    }
    if (typeof candidate === "boolean") {
      accountSerializedBytes(candidate ? 4 : 5);
      return candidate;
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      accountSerializedBytes(JSON.stringify(candidate).length);
      return candidate;
    }
    if (typeof candidate !== "object") {
      throw new TypeError("Input must be finite JSON data.");
    }
    if (options.rejectObject?.(candidate) === true) {
      throw new TypeError("Input object is not allowed.");
    }
    if (visited?.has(candidate)) {
      throw new TypeError("Input graph contains a repeated object reference.");
    }
    visited?.add(candidate);

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
      accountSerializedBytes(2 + Math.max(0, length - 1));
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
    accountSerializedBytes(
      2 + keys.length + Math.max(0, keys.length - 1),
    );
    const output: Record<string, unknown> = {};
    for (const key of keys as string[]) {
      accountJsonString(key);
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
