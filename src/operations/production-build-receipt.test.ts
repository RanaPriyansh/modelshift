import {
  execFileSync,
} from "node:child_process";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  PRODUCTION_BUILD_RECEIPT_FILE,
  PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION,
  assertExactProductionBuild,
  clearProductionRuntimeCache,
  parseProductionBuildReceipt,
  readProductionArtifactIdentity,
  writeProductionBuildReceipt,
} from "../../scripts/ops/production-build-receipt";
import {
  productionBuildId,
  readBuildSourceCommit,
} from "../../scripts/ops/build-source-identity";
import {
  assertProductionRuntimeSnapshot,
  createProductionRuntimeSnapshot,
  removeProductionRuntimeSnapshot,
} from "../../scripts/ops/production-runtime-snapshot";

const temporaryRoots: string[] = [];

function root(): string {
  const directory = mkdtempSync(resolve(tmpdir(), "forge-build-receipt-"));
  temporaryRoots.push(directory);
  mkdirSync(resolve(directory, ".next/server"), { recursive: true });
  mkdirSync(resolve(directory, ".next/static/chunks"), { recursive: true });
  mkdirSync(resolve(directory, ".next/cache"), { recursive: true });
  mkdirSync(resolve(directory, ".next/diagnostics"), { recursive: true });
  mkdirSync(resolve(directory, "public"), { recursive: true });
  writeFileSync(resolve(directory, ".next/BUILD_ID"), "build-one\n");
  writeFileSync(
    resolve(directory, ".next/required-server-files.json"),
    JSON.stringify({ files: [] }),
  );
  writeFileSync(resolve(directory, ".next/server/app.js"), "server-one");
  writeFileSync(resolve(directory, ".next/static/chunks/app.js"), "public-one");
  writeFileSync(resolve(directory, "public/asset.txt"), "public-directory-one");
  return directory;
}

function initializedReceiptRoot(): Readonly<{
  directory: string;
  sourceCommit: string;
}> {
  const directory = root();
  rmSync(resolve(directory, ".next/cache"), { recursive: true });
  writeFileSync(
    resolve(directory, ".gitignore"),
    ".next/\n.env.production\noutside-receipt.json\n",
  );
  writeFileSync(resolve(directory, "source.txt"), "source-one\n");
  writeFileSync(resolve(directory, "package.json"), "{}\n");
  writeFileSync(resolve(directory, "next.config.ts"), "export default {};\n");
  writeFileSync(resolve(directory, "tsconfig.json"), "{}\n");
  mkdirSync(resolve(directory, "scripts/ops"), { recursive: true });
  writeFileSync(
    resolve(directory, "scripts/ops/build-source-identity.ts"),
    "export const fixture = true;\n",
  );
  execFileSync("git", ["init", "--quiet"], { cwd: directory });
  execFileSync(
    "git",
    ["config", "user.email", "forge-receipt@example.test"],
    { cwd: directory },
  );
  execFileSync("git", ["config", "user.name", "FORGE receipt test"], {
    cwd: directory,
  });
  execFileSync(
    "git",
    [
      "add",
      ".gitignore",
      "source.txt",
      "public",
      "package.json",
      "next.config.ts",
      "tsconfig.json",
      "scripts/ops/build-source-identity.ts",
    ],
    { cwd: directory },
  );
  execFileSync("git", ["commit", "--quiet", "-m", "source one"], {
    cwd: directory,
  });
  const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: directory,
    encoding: "utf8",
  }).trim();
  writeFileSync(
    resolve(directory, ".next/BUILD_ID"),
    `${productionBuildId(sourceCommit)}\n`,
  );
  return { directory, sourceCommit };
}

afterEach(() => {
  for (const directory of temporaryRoots.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("production build receipt", () => {
  it("binds server and static output while excluding cache, diagnostics, traces, and the receipt", () => {
    const directory = root();
    const first = readProductionArtifactIdentity(directory);

    writeFileSync(resolve(directory, ".next/cache/compiler.bin"), "cache");
    writeFileSync(resolve(directory, ".next/diagnostics/build.json"), "log");
    writeFileSync(resolve(directory, ".next/trace"), "trace");
    writeFileSync(
      resolve(directory, ".next", PRODUCTION_BUILD_RECEIPT_FILE),
      "receipt",
    );
    expect(readProductionArtifactIdentity(directory)).toEqual(first);

    writeFileSync(resolve(directory, ".next/server/app.js"), "server-two");
    const changed = readProductionArtifactIdentity(directory);
    expect(changed.artifactDigest).not.toBe(first.artifactDigest);
    expect(changed.artifactFileCount).toBe(first.artifactFileCount);
  });

  it("rejects symlinks and malformed or extensible receipt shapes", () => {
    const directory = root();
    symlinkSync(
      resolve(directory, ".next/server/app.js"),
      resolve(directory, ".next/server/alias.js"),
    );
    expect(() => readProductionArtifactIdentity(directory)).toThrow(
      "rejected a symlink",
    );

    const valid = {
      schemaVersion: PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION,
      sourceCommit: "a".repeat(40),
      sourceTree: "b".repeat(40),
      sourceState: "clean",
      buildId: "build-one",
      artifactDigest: `sha256:${"c".repeat(64)}`,
      publicAssetDigest: `sha256:${"d".repeat(64)}`,
      artifactFileCount: 3,
      publicDirectoryDigest: `sha256:${"e".repeat(64)}`,
      publicDirectoryFileCount: 2,
      runtimeCachePolicy: "fresh_ephemeral_next_cache_v1",
    };
    expect(parseProductionBuildReceipt(JSON.stringify(valid))).toEqual(valid);
    expect(() => parseProductionBuildReceipt(JSON.stringify({
      ...valid,
      expectedSha: "a".repeat(40),
    }))).toThrow("strict versioned schema");
    expect(() => parseProductionBuildReceipt(JSON.stringify({
      ...valid,
      artifactFileCount: 0,
    }))).toThrow("strict versioned schema");

    let getterCalls = 0;
    const hostile = new Proxy({
      get schemaVersion() {
        getterCalls += 1;
        return PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION;
      },
    }, {
      ownKeys() {
        getterCalls += 1;
        return ["schemaVersion"];
      },
    });
    expect(() => parseProductionBuildReceipt(hostile)).toThrow(
      "bounded JSON text",
    );
    expect(getterCalls).toBe(0);
  });

  it("uses unambiguous framing for trees that collide under NUL delimiters", () => {
    const left = root();
    const right = root();
    rmSync(resolve(left, ".next/server/app.js"));
    rmSync(resolve(right, ".next/server/app.js"));
    writeFileSync(resolve(left, ".next/server/a"), "X\0b\0Y");
    writeFileSync(resolve(left, ".next/server/c"), "Z");
    writeFileSync(resolve(right, ".next/server/a"), "X");
    writeFileSync(resolve(right, ".next/server/b"), "Y\0c\0Z");

    const leftIdentity = readProductionArtifactIdentity(left);
    const rightIdentity = readProductionArtifactIdentity(right);
    expect(leftIdentity.artifactFileCount)
      .toBe(rightIdentity.artifactFileCount);
    expect(leftIdentity.artifactDigest)
      .not.toBe(rightIdentity.artifactDigest);
  });

  it("binds receipt creation to the build marker and replaces a receipt symlink without following it", () => {
    const { directory, sourceCommit } = initializedReceiptRoot();
    const outside = resolve(directory, "outside-receipt.json");
    const receiptPath = resolve(
      directory,
      ".next",
      PRODUCTION_BUILD_RECEIPT_FILE,
    );
    writeFileSync(outside, "outside sentinel\n");
    symlinkSync(outside, receiptPath);

    const receipt = writeProductionBuildReceipt(directory);
    expect(receipt.sourceCommit).toBe(sourceCommit);
    expect(receipt.sourceState).toBe("clean");
    expect(lstatSync(receiptPath).isSymbolicLink()).toBe(false);
    expect(readFileSync(outside, "utf8")).toBe("outside sentinel\n");
    expect(assertExactProductionBuild(sourceCommit, directory))
      .toEqual(receipt);

    writeFileSync(resolve(directory, "source.txt"), "source-two\n");
    execFileSync("git", ["add", "source.txt"], { cwd: directory });
    execFileSync("git", ["commit", "--quiet", "-m", "source two"], {
      cwd: directory,
    });
    expect(() => writeProductionBuildReceipt(directory)).toThrow(
      "different source commit",
    );
  });

  it("rejects ignored build inputs at the exact assertion boundary", () => {
    const { directory, sourceCommit } = initializedReceiptRoot();
    writeProductionBuildReceipt(directory);
    writeFileSync(resolve(directory, ".env.production"), "SHOULD_NOT_LOAD=1\n");
    expect(() => assertExactProductionBuild(sourceCommit, directory)).toThrow(
      "hidden or ignored build inputs",
    );
  });

  it("marks dirty, ignored, or provider-contradicted build-time source unverified", () => {
    const { directory, sourceCommit } = initializedReceiptRoot();
    expect(readBuildSourceCommit(directory)).toBe(sourceCommit);

    writeFileSync(resolve(directory, "source.txt"), "dirty source\n");
    expect(readBuildSourceCommit(directory)).toBe("unverified");
    execFileSync("git", ["restore", "source.txt"], { cwd: directory });

    writeFileSync(resolve(directory, ".env.production"), "HIDDEN=1\n");
    expect(readBuildSourceCommit(directory)).toBe("unverified");
    rmSync(resolve(directory, ".env.production"));

    expect(readBuildSourceCommit(directory, {
      ...process.env,
      VERCEL: "1",
      VERCEL_GIT_COMMIT_SHA: "f".repeat(40),
    })).toBe("unverified");
  });

  it("will not clear a cache that Next declares as a required server input", () => {
    const directory = root();
    writeFileSync(
      resolve(directory, ".next/required-server-files.json"),
      JSON.stringify({ files: [".next/cache/fetch-cache/entry"] }),
    );
    expect(() => clearProductionRuntimeCache(directory)).toThrow(
      "required or malformed cache input",
    );
    expect(lstatSync(resolve(directory, ".next/cache")).isDirectory())
      .toBe(true);
  });

  it("serves verification from an isolated byte snapshot and detects snapshot mutation", () => {
    const { directory, sourceCommit } = initializedReceiptRoot();
    writeProductionBuildReceipt(directory);
    const snapshot = createProductionRuntimeSnapshot(
      sourceCommit,
      directory,
    );
    try {
      writeFileSync(
        resolve(directory, ".next/server/app.js"),
        "mutated original artifact",
      );
      expect(() => assertProductionRuntimeSnapshot(snapshot)).not.toThrow();

      const snapshotPublicFile = resolve(
        snapshot.root,
        "public/asset.txt",
      );
      chmodSync(snapshotPublicFile, 0o600);
      writeFileSync(snapshotPublicFile, "mutated runtime snapshot");
      expect(() => assertProductionRuntimeSnapshot(snapshot)).toThrow(
        "no longer matches",
      );
    } finally {
      removeProductionRuntimeSnapshot(snapshot);
    }
  });
});
