import { describe, expect, it } from "vitest";

import { publicBuildBoundaryReceiptLine } from "../../../../scripts/ops/public-build-boundary-receipt";

describe("public build boundary receipt", () => {
  it("preserves the provider parser's canonical success line byte-for-byte", () => {
    expect(publicBuildBoundaryReceiptLine(42, "3a940a75490bafefb9b043dfae403233a2c883e0408a18cdf3d1cb5968e10894")).toBe(
      "Public build boundary verified across 42 static assets; public asset digest 3a940a75490bafefb9b043dfae403233a2c883e0408a18cdf3d1cb5968e10894.\n",
    );
  });
});
