import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { writePlaywrightArtifactManifest } from "../../scripts/ops/playwright-artifact-manifest";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const temporaryDirectories: string[] = [];
afterEach(async () => { await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

describe("bounded Playwright artifact staging", () => {
  it("stages only selected screenshots and enforces the count bound", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "forge-artifacts-")); temporaryDirectories.push(root);
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 115, 121, 110, 116, 104, 101, 116, 105, 99]);
    for (let index = 0; index < 42; index += 1) await writeFile(resolve(root, `test-failed-${index + 1}.png`), png);
    await writeFile(resolve(root, "trace.zip"), Buffer.from("request body must not be retained"));
    await symlink(resolve(root, "test-failed-1.png"), resolve(root, "test-failed-99.png"));
    const output = resolve(root, "manifest.json"); const stage = resolve(root, "stage");
    const manifest = await writePlaywrightArtifactManifest(root, SHA, output, "playwright-failure-1", stage);
    expect(manifest.artifacts).toHaveLength(40);
    expect(manifest.excluded_count).toBe(2);
    expect(manifest.truncated).toBe(true);
    expect((await readdir(stage)).filter((name) => name.endsWith(".png"))).toHaveLength(40);
    expect((await readdir(stage)).some((name) => name === "test-failed-99.png")).toBe(false);
    expect((await readdir(stage)).some((name) => name.endsWith(".zip"))).toBe(false);
    expect(JSON.parse(await readFile(output, "utf8")).tested_sha).toBe(SHA);
    await writeFile(resolve(stage, "stale.png"), png);
    const second = await writePlaywrightArtifactManifest(root, SHA, output, "playwright-failure-2", stage);
    expect(second.retained_artifact_ids).toEqual(["playwright-failure-2"]);
    expect((await readdir(stage)).some((name) => name === "stale.png")).toBe(false);
  });

  it("uses the trusted physical root when a temporary-directory ancestor canonicalizes", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "forge-artifact-canonical-root-")); temporaryDirectories.push(root);
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 115, 121, 110, 116, 104, 101, 116, 105, 99]);
    await writeFile(resolve(root, "test-failed-1.png"), png);
    const manifest = await writePlaywrightArtifactManifest(root, SHA, resolve(root, "release-ops", "manifest.json"), "playwright-failure-1", resolve(root, "release-ops", "stage"));
    expect(manifest.artifacts).toEqual([{ path: "test-failed-1.png", bytes: png.length }]);
  });

  it.each(["equal", "outside", "ancestor", "output-overlap"])("rejects a %s stage path before it can remove sentinel evidence", async (caseName) => {
    const container = await mkdtemp(resolve(tmpdir(), "forge-artifact-boundary-")); temporaryDirectories.push(container);
    const root = resolve(container, "test-results"); await mkdir(root);
    const output = resolve(root, "release-ops", "manifest.json");
    const sentinel = resolve(container, `${caseName}-sentinel.txt`); await writeFile(sentinel, "preserve me");
    const stage = caseName === "equal"
      ? root
      : caseName === "outside"
        ? resolve(container, "outside-stage")
        : caseName === "ancestor"
          ? container
          : resolve(root, "release-ops");
    if (caseName === "outside") {
      await mkdir(stage);
      await writeFile(resolve(stage, "outside-sentinel.txt"), "outside evidence");
    }

    await expect(writePlaywrightArtifactManifest(root, SHA, output, "playwright-failure-1", stage)).rejects.toThrow(/stage-dir|overlap/);
    await expect(readFile(sentinel, "utf8")).resolves.toBe("preserve me");
    if (caseName === "outside") await expect(readFile(resolve(stage, "outside-sentinel.txt"), "utf8")).resolves.toBe("outside evidence");
  });

  it("rejects a symlinked stage parent before it can remove outside evidence", async () => {
    const container = await mkdtemp(resolve(tmpdir(), "forge-artifact-symlink-parent-")); temporaryDirectories.push(container);
    const root = resolve(container, "test-results"); const outside = resolve(container, "outside");
    await Promise.all([mkdir(root), mkdir(outside)]);
    const outsideStage = resolve(outside, "stage"); await mkdir(outsideStage);
    const sentinel = resolve(outsideStage, "sentinel.txt"); await writeFile(sentinel, "outside evidence");
    await symlink(outside, resolve(root, "link"));

    await expect(writePlaywrightArtifactManifest(root, SHA, resolve(root, "release-ops", "manifest.json"), "playwright-failure-1", resolve(root, "link", "stage"))).rejects.toThrow(/symlink|trusted root/);
    await expect(readFile(sentinel, "utf8")).resolves.toBe("outside evidence");
  });

  it("rejects symlink roots, stages, and outputs before destructive staging", async () => {
    const container = await mkdtemp(resolve(tmpdir(), "forge-artifact-symlink-")); temporaryDirectories.push(container);
    const realRoot = resolve(container, "real-root"); const rootLink = resolve(container, "root-link"); await mkdir(realRoot); await symlink(realRoot, rootLink);
    const rootSentinel = resolve(realRoot, "root-sentinel.txt"); await writeFile(rootSentinel, "root evidence");
    await expect(writePlaywrightArtifactManifest(rootLink, SHA, resolve(rootLink, "release-ops", "manifest.json"), "playwright-failure-1", resolve(rootLink, "stage"))).rejects.toThrow(/root.*symlink/);
    await expect(readFile(rootSentinel, "utf8")).resolves.toBe("root evidence");

    const root = resolve(container, "test-results"); const outside = resolve(container, "outside"); await Promise.all([mkdir(root), mkdir(outside)]);
    const stageSentinel = resolve(outside, "stage-sentinel.txt"); await writeFile(stageSentinel, "stage evidence");
    await symlink(outside, resolve(root, "stage"));
    await expect(writePlaywrightArtifactManifest(root, SHA, resolve(root, "release-ops", "manifest.json"), "playwright-failure-1", resolve(root, "stage"))).rejects.toThrow(/symlink/);
    await expect(readFile(stageSentinel, "utf8")).resolves.toBe("stage evidence");

    const safeStage = resolve(root, "safe-stage"); const releaseOps = resolve(root, "release-ops"); await Promise.all([mkdir(safeStage), mkdir(releaseOps)]);
    const stagedSentinel = resolve(safeStage, "staged-sentinel.txt"); await writeFile(stagedSentinel, "staged evidence");
    const outputTarget = resolve(outside, "manifest.json"); await writeFile(outputTarget, "outside manifest"); await symlink(outputTarget, resolve(releaseOps, "manifest.json"));
    await expect(writePlaywrightArtifactManifest(root, SHA, resolve(releaseOps, "manifest.json"), "playwright-failure-1", safeStage)).rejects.toThrow(/output.*symlink/);
    await expect(readFile(stagedSentinel, "utf8")).resolves.toBe("staged evidence");
    await expect(readFile(outputTarget, "utf8")).resolves.toBe("outside manifest");
  });
});
