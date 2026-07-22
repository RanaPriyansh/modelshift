import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
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
});
