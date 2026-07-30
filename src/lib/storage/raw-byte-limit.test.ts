import { describe, expect, it } from "vitest";

import { exceedsUtf8ByteLimit } from "./raw-byte-limit";

describe("UTF-8 raw storage byte limit", () => {
  it("counts ASCII, multi-byte scalars, surrogate pairs, and unpaired surrogates", () => {
    expect(exceedsUtf8ByteLimit("abcd", 4)).toBe(false);
    expect(exceedsUtf8ByteLimit("abcd", 3)).toBe(true);
    expect(exceedsUtf8ByteLimit("é", 1)).toBe(true);
    expect(exceedsUtf8ByteLimit("é", 2)).toBe(false);
    expect(exceedsUtf8ByteLimit("🧭", 3)).toBe(true);
    expect(exceedsUtf8ByteLimit("🧭", 4)).toBe(false);
    expect(exceedsUtf8ByteLimit("\ud800", 2)).toBe(true);
    expect(exceedsUtf8ByteLimit("\ud800", 3)).toBe(false);
  });

  it("fails closed for invalid limits", () => {
    expect(exceedsUtf8ByteLimit("", -1)).toBe(true);
    expect(exceedsUtf8ByteLimit("", Number.POSITIVE_INFINITY)).toBe(true);
  });
});
