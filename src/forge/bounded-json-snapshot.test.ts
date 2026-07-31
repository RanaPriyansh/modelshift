import { describe, expect, it } from "vitest";
import { types as nodeUtilTypes } from "node:util";

import {
  BOUNDED_JSON_SNAPSHOT_LIMITS,
  boundedJsonSnapshot,
} from "./bounded-json-snapshot";

function nestedObject(depth: number): Record<string, unknown> {
  let value: Record<string, unknown> = {};
  for (let index = 0; index < depth; index += 1) {
    value = { child: value };
  }
  return value;
}

function nodeBoundaryGraph(extraLeafCount = 0): unknown[] {
  return Array.from({ length: 255 }, (_, index) => (
    Array.from(
      { length: index === 254 ? 30 + extraLeafCount : 15 },
      () => null,
    )
  ));
}

describe("bounded JSON snapshot", () => {
  it("detaches ordinary JSON data and keeps pollution-shaped keys inert", () => {
    const input: Record<string, unknown> = {
      nested: { value: "original" },
    };
    Object.defineProperty(input, "__proto__", {
      configurable: true,
      enumerable: true,
      value: { pollution: "inert-data" },
      writable: true,
    });

    const snapshot = boundedJsonSnapshot(input) as Record<string, unknown>;

    expect(snapshot).toEqual(input);
    expect(snapshot).not.toBe(input);
    expect(snapshot.nested).not.toBe(input.nested);
    expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
    expect(Object.hasOwn(snapshot, "__proto__")).toBe(true);
    expect(Object.getPrototypeOf(snapshot)).not.toEqual({ pollution: "inert-data" });
  });

  it("rejects accessor properties without invoking their getter or setter", () => {
    let getterCalls = 0;
    let setterCalls = 0;
    const input: Record<string, unknown> = {};
    Object.defineProperty(input, "hostile", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("getter must not run");
      },
      set() {
        setterCalls += 1;
        throw new Error("setter must not run");
      },
    });

    expect(() => boundedJsonSnapshot(input)).toThrow(TypeError);
    expect(getterCalls).toBe(0);
    expect(setterCalls).toBe(0);
  });

  it("rejects non-enumerable object fields and array elements", () => {
    const hiddenObject: Record<string, unknown> = {};
    Object.defineProperty(hiddenObject, "schemaVersion", {
      configurable: true,
      enumerable: false,
      value: "hidden",
      writable: true,
    });
    const hiddenArray = ["visible"];
    Object.defineProperty(hiddenArray, "0", {
      configurable: true,
      enumerable: false,
      value: "hidden",
      writable: true,
    });

    expect(Object.keys(hiddenObject)).toEqual([]);
    expect(Object.keys(hiddenArray)).toEqual([]);
    expect(() => boundedJsonSnapshot(hiddenObject)).toThrow(TypeError);
    expect(() => boundedJsonSnapshot(hiddenArray)).toThrow(TypeError);
  });

  it("never uses ordinary proxy property reads and contains hostile proxy failures", () => {
    let getCalls = 0;
    const descriptorOnlyProxy = new Proxy({ value: "safe snapshot" }, {
      get() {
        getCalls += 1;
        throw new Error("ordinary proxy traversal is forbidden");
      },
    });
    expect(boundedJsonSnapshot(descriptorOnlyProxy)).toEqual({ value: "safe snapshot" });
    expect(getCalls).toBe(0);

    let ownKeyCalls = 0;
    const hostileProxy = new Proxy({}, {
      ownKeys() {
        ownKeyCalls += 1;
        throw new Error("hostile proxy");
      },
    });
    expect(() => boundedJsonSnapshot(hostileProxy)).toThrow("hostile proxy");
    expect(ownKeyCalls).toBe(1);
  });

  it("lets a trusted runtime reject proxies before any reflection trap", () => {
    let ownKeyCalls = 0;
    let prototypeCalls = 0;
    const proxy = new Proxy({ value: "must not be inspected" }, {
      ownKeys() {
        ownKeyCalls += 1;
        return ["value"];
      },
      getPrototypeOf() {
        prototypeCalls += 1;
        return Object.prototype;
      },
    });

    expect(() => boundedJsonSnapshot(proxy, {
      rejectObject: nodeUtilTypes.isProxy,
    })).toThrow(TypeError);
    expect(ownKeyCalls).toBe(0);
    expect(prototypeCalls).toBe(0);
  });

  it("rejects symbol keys, sparse arrays, and arrays with undeclared properties", () => {
    const symbolKeyed = { value: "ordinary" };
    Object.defineProperty(symbolKeyed, Symbol("hidden"), {
      enumerable: false,
      value: "not JSON",
    });

    const sparse = new Array<unknown>(2);
    sparse[1] = "present";
    const decorated = ["present"] as unknown[] & { label?: string };
    decorated.label = "not an array index";

    expect(() => boundedJsonSnapshot(symbolKeyed)).toThrow(TypeError);
    expect(() => boundedJsonSnapshot(sparse)).toThrow(TypeError);
    expect(() => boundedJsonSnapshot(decorated)).toThrow(TypeError);
  });

  it("rejects array subclasses and custom prototypes while requiring an explicit null-prototype opt-in", () => {
    class ArraySubclass extends Array<unknown> {}
    const nullPrototype = Object.create(null) as Record<string, unknown>;
    nullPrototype.value = "internal detached dictionary";

    expect(() => boundedJsonSnapshot(new ArraySubclass("value"))).toThrow(TypeError);
    expect(() => boundedJsonSnapshot(Object.create({ inherited: true }))).toThrow(TypeError);
    expect(() => boundedJsonSnapshot(nullPrototype)).toThrow(TypeError);
    expect(boundedJsonSnapshot(nullPrototype, {
      allowNullPrototypeObjects: true,
    })).toEqual({ value: "internal detached dictionary" });
  });

  it("rejects cycles and pins the exact depth boundary", () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;

    expect(() => boundedJsonSnapshot(cycle)).toThrow(TypeError);
    expect(() => boundedJsonSnapshot(
      nestedObject(BOUNDED_JSON_SNAPSHOT_LIMITS.maximumDepth),
    )).not.toThrow();
    expect(() => boundedJsonSnapshot(
      nestedObject(BOUNDED_JSON_SNAPSHOT_LIMITS.maximumDepth + 1),
    )).toThrow(TypeError);
  });

  it("pins the exact node, array-length, and object-key boundaries", () => {
    const exactNodeLimit = nodeBoundaryGraph();
    const overNodeLimit = nodeBoundaryGraph(1);
    const exactArrayLimit = Array.from(
      { length: BOUNDED_JSON_SNAPSHOT_LIMITS.maximumArrayLength },
      () => null,
    );
    const overArrayLimit = [...exactArrayLimit, null];
    const exactObjectLimit = Object.fromEntries(Array.from(
      { length: BOUNDED_JSON_SNAPSHOT_LIMITS.maximumObjectKeys },
      (_, index) => [`key${index}`, null],
    ));
    const overObjectLimit = {
      ...exactObjectLimit,
      oneMoreKey: null,
    };

    expect(() => boundedJsonSnapshot(exactNodeLimit)).not.toThrow();
    expect(() => boundedJsonSnapshot(overNodeLimit)).toThrow(TypeError);
    expect(() => boundedJsonSnapshot(exactArrayLimit)).not.toThrow();
    expect(() => boundedJsonSnapshot(overArrayLimit)).toThrow(TypeError);
    expect(() => boundedJsonSnapshot(exactObjectLimit)).not.toThrow();
    expect(() => boundedJsonSnapshot(overObjectLimit)).toThrow(TypeError);
  });
});
