import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { PRIMARY_SOURCE_RUNTIME_BINDING } from "../forge/world-runtime/primary-source-binding";
import {
  assertPrimarySourceContentPackageManifest,
  primarySourceRuntimeBindingDigest,
  readReleaseDigests,
} from "../../scripts/ops/release-digests";

function clonedBinding(): {
  protocolVersion: string;
  proof: { validatorId: string; blockedActionKinds: string[] };
  sourceBindings: Array<{ sourceItemId: string }>;
} {
  return structuredClone(PRIMARY_SOURCE_RUNTIME_BINDING) as unknown as {
    protocolVersion: string;
    proof: { validatorId: string; blockedActionKinds: string[] };
    sourceBindings: Array<{ sourceItemId: string }>;
  };
}

describe("retained content package identity", () => {
  it("records the bumped Primary Source package and its exact runtime binding", () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "scripts/ops/content-package-manifest.json"), "utf8")) as {
      packages: Array<{ id: string; version: string; runtime_binding_digest?: string }>;
    };
    const primarySource = manifest.packages.find((entry) => entry.id === "world.primary-source-reasoning");
    expect(primarySource).toEqual(expect.objectContaining({
      version: "1.0.1",
      runtime_binding_digest: primarySourceRuntimeBindingDigest(),
    }));
    const exactBytes = readFileSync(resolve(process.cwd(), "scripts/ops/content-package-manifest.json"), "utf8");
    expect(readReleaseDigests().contentManifest).toBe(createHash("sha256").update(exactBytes).digest("hex"));
  });

  it("rejects a stale immutable version or runtime-binding digest", () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "scripts/ops/content-package-manifest.json"), "utf8")) as {
      packages: Array<{ id: string; version: string; runtime_binding_digest?: string }>;
    };
    const primarySource = manifest.packages.find((entry) => entry.id === "world.primary-source-reasoning");
    expect(primarySource).toBeDefined();
    primarySource!.runtime_binding_digest = "sha256:stale";
    expect(() => assertPrimarySourceContentPackageManifest(manifest)).toThrow(/immutable version and exact runtime-binding digest/);
  });

  it.each([
    ["protocol", (binding: ReturnType<typeof clonedBinding>) => { binding.protocolVersion = "1.0.2"; }],
    ["validator", (binding: ReturnType<typeof clonedBinding>) => { binding.proof.validatorId = "validator.primary-source-reasoning-transfer.v2"; }],
    ["source", (binding: ReturnType<typeof clonedBinding>) => { binding.sourceBindings[0]!.sourceItemId = "source.loc.changed"; }],
    ["proof lock", (binding: ReturnType<typeof clonedBinding>) => { binding.proof.blockedActionKinds = ["instructional_support", "model_action"]; }],
  ])("changes retained content identity when %s changes", (_name, mutate) => {
    const retainedBytes = readFileSync(resolve(process.cwd(), "scripts/ops/content-package-manifest.json"), "utf8");
    const candidate = clonedBinding();
    mutate(candidate);
    const candidateBytes = retainedBytes.replace(
      primarySourceRuntimeBindingDigest(),
      primarySourceRuntimeBindingDigest(candidate as typeof PRIMARY_SOURCE_RUNTIME_BINDING),
    );
    expect(candidateBytes).not.toBe(retainedBytes);
    expect(createHash("sha256").update(candidateBytes).digest("hex")).not.toBe(
      createHash("sha256").update(retainedBytes).digest("hex"),
    );
  });
});
