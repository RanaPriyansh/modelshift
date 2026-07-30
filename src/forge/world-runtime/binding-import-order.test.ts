import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

interface BindingImportOrderCase {
  readonly name: string;
  readonly bindingModule: string;
  readonly bindingExport: string;
  readonly worldsModule: string;
  readonly worldExport: string;
  readonly taskCode: string;
  readonly runtimeBindingDigest: string;
  readonly packageIntegrityHash: string;
}

interface BindingImportOrderResult {
  readonly graphFrozenBeforeWorldImport: boolean;
  readonly mutationResults: readonly ("changed" | "no_op" | "threw")[];
  readonly taskCode: string;
  readonly runtimeBindingDigest: string;
  readonly packageIntegrityHash: string;
}

function runFreshProcess<T>(source: string): T {
  const result = spawnSync("pnpm", ["exec", "tsx", "-e", source], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  expect(result.status, result.stderr || result.stdout).toBe(0);
  const finalLine = result.stdout.trim().split("\n").at(-1);
  expect(finalLine).toBeTruthy();
  return JSON.parse(finalLine!) as T;
}

const BINDING_IMPORT_ORDER_CASES: readonly BindingImportOrderCase[] = [
  {
    name: "Force & Motion",
    bindingModule: "./src/forge/world-runtime/force-and-motion-binding.ts",
    bindingExport: "FORCE_AND_MOTION_RUNTIME_BINDING",
    worldsModule: "./src/forge/worlds.ts",
    worldExport: "FORCE_AND_MOTION_WORLD",
    taskCode: "cargo_pod_force_graph",
    runtimeBindingDigest: "sha256:318d3d0e0e6b98f7cbfbcce003e13b621346c5b6e0bf60bf72c904dd4ca8e597",
    packageIntegrityHash: "sha256:0b4ee9c6329d038e42903e009c74b18005c60a65fe32c2770130fdbd4f72e36e",
  },
  {
    name: "Proportional Reasoning",
    bindingModule: "./src/forge/world-runtime/proportional-reasoning-binding.ts",
    bindingExport: "PROPORTIONAL_REASONING_RUNTIME_BINDING",
    worldsModule: "./src/forge/worlds.ts",
    worldExport: "PROPORTIONAL_REASONING_WORLD",
    taskCode: "map_scale_transfer",
    runtimeBindingDigest: "sha256:b2f134f91ee9cd71750e19c8b440751bcf93415aec10a254e1b0ac491e8840c1",
    packageIntegrityHash: "sha256:f55197c4985ae4a2964f40411a2ded4c8519779ea8dab046ccc211a64e8fb0e4",
  },
  {
    name: "Source Corroboration",
    bindingModule: "./src/forge/world-runtime/source-corroboration-binding.ts",
    bindingExport: "SOURCE_CORROBORATION_RUNTIME_BINDING",
    worldsModule: "./src/forge/worlds.ts",
    worldExport: "SOURCE_CORROBORATION_WORLD",
    taskCode: "source_corroboration_transfer",
    runtimeBindingDigest: "sha256:a172f067f6135bdcec13c66053ef250ef92692db734b60ddf8e396fb8b0dc4b5",
    packageIntegrityHash: "sha256:4002e3f6868709f4dca81ce5909140d9bffa96470487ca052f3dd529f6b8a013",
  },
  {
    name: "Primary Source Reasoning",
    bindingModule: "./src/forge/world-runtime/primary-source-binding.ts",
    bindingExport: "PRIMARY_SOURCE_RUNTIME_BINDING",
    worldsModule: "./src/forge/worlds.ts",
    worldExport: "PRIMARY_SOURCE_REASONING_WORLD",
    taskCode: "washington_street_1937_transfer",
    runtimeBindingDigest: "sha256:b3401c71f330d82fdd31958af836683742c9e37f2f3d8cd6cf8f2a887f782029",
    packageIntegrityHash: "sha256:71e60e96a1a6cb9fbd117fc6516c2f0355744e546b315482e1d17604f13a3e6f",
  },
  {
    name: "Argument & Evidence retained internal",
    bindingModule: "./src/forge/world-runtime/argument-evidence-binding.ts",
    bindingExport: "ARGUMENT_EVIDENCE_RUNTIME_BINDING",
    worldsModule: "./src/forge/worlds.internal.ts",
    worldExport: "ARGUMENT_EVIDENCE_WORLD",
    taskCode: "bus_route_late_arrivals_table",
    runtimeBindingDigest: "sha256:a38c116d6b81e0e30f2f5d711c0f19346eefc76504859b3fc929c317731ab9fc",
    packageIntegrityHash: "sha256:c60de18c1bd0cf910379c76fde69d3eb5bd9f9952b21f27d2c25a9a5e796b6df",
  },
];

describe("runtime binding definition-time immutability", () => {
  it.each(BINDING_IMPORT_ORDER_CASES)(
    "freezes $name before its World catalog module is imported",
    (testCase) => {
      const result = runFreshProcess<BindingImportOrderResult>(`
        (async () => {
          const bindingModule = await import(${JSON.stringify(testCase.bindingModule)});
          const binding = bindingModule[${JSON.stringify(testCase.bindingExport)}];
          const graphFrozen = (value, seen = new WeakSet()) => {
            if (value === null || (typeof value !== "object" && typeof value !== "function")) return true;
            if (seen.has(value)) return true;
            seen.add(value);
            if (!Object.isFrozen(value)) return false;
            return Reflect.ownKeys(value).every((key) => {
              const descriptor = Object.getOwnPropertyDescriptor(value, key);
              return !descriptor || !("value" in descriptor) || graphFrozen(descriptor.value, seen);
            });
          };
          const mutations = [
            [binding.proof, "taskCode", "forged_task"],
            [binding.evidence.remainsUntested, 0, "forged limitation"],
            [binding.actions[0], "id", "action.forged"],
            [binding.support, "policyId", "policy.forged"],
            [binding.access.accommodations[0], "id", "access.forged"],
            [binding.sourceBindings[0], "domainSourceRef", "source.forged"],
          ];
          const mutationResults = mutations.map(([target, key, value]) => {
            try {
              return Reflect.set(target, key, value) ? "changed" : "no_op";
            } catch {
              return "threw";
            }
          });
          const worldsModule = await import(${JSON.stringify(testCase.worldsModule)});
          const pack = worldsModule[${JSON.stringify(testCase.worldExport)}];
          const digests = await import("./scripts/ops/release-digests.ts");
          process.stdout.write(JSON.stringify({
            graphFrozenBeforeWorldImport: graphFrozen(binding),
            mutationResults,
            taskCode: pack.runtime.proof.taskCode,
            runtimeBindingDigest: digests.runtimeBindingDigest(pack.runtime),
            packageIntegrityHash: digests.packageIntegrityHash(pack),
          }));
        })().catch((error) => {
          console.error(error);
          process.exit(1);
        });
      `);

      expect(result).toEqual({
        graphFrozenBeforeWorldImport: true,
        mutationResults: ["no_op", "no_op", "no_op", "no_op", "no_op", "no_op"],
        taskCode: testCase.taskCode,
        runtimeBindingDigest: testCase.runtimeBindingDigest,
        packageIntegrityHash: testCase.packageIntegrityHash,
      });
    },
  );

  it("ignores content-manifest JSON poisoned before retained authority is imported", () => {
    const result = runFreshProcess<{
      readonly mutationSucceeded: boolean;
      readonly identity: { readonly runtimeBindingDigest: string; readonly packageIntegrityHash: string };
    }>(`
      (async () => {
        const manifestModule = await import("./scripts/ops/content-package-manifest.json");
        const entry = manifestModule.default.packages.find(
          (candidate) => candidate.id === "world.proportional-reasoning",
        );
        const mutationSucceeded = Reflect.set(
          entry,
          "runtime_binding_digest",
          "sha256:forged-before-authority-import",
        ) && Reflect.set(
          entry,
          "package_integrity_hash",
          "sha256:forged-before-authority-import",
        );
        const retained = await import("./src/forge/world-runtime/retained-runtime-binding.ts");
        const worlds = await import("./src/forge/worlds.ts");
        const identity = retained.retainedRuntimeIdentityFor(worlds.PROPORTIONAL_REASONING_WORLD);
        process.stdout.write(JSON.stringify({ mutationSucceeded, identity }));
      })().catch((error) => {
        console.error(error);
        process.exit(1);
      });
    `);

    expect(result.mutationSucceeded).toBe(true);
    expect(result.identity).toEqual({
      runtimeBindingDigest: "sha256:b2f134f91ee9cd71750e19c8b440751bcf93415aec10a254e1b0ac491e8840c1",
      packageIntegrityHash: "sha256:f55197c4985ae4a2964f40411a2ded4c8519779ea8dab046ccc211a64e8fb0e4",
    });
  });
});
