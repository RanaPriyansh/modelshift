import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function readReleaseDigests(root = process.cwd()) {
  return {
    lockfile: digest(resolve(root, "pnpm-lock.yaml")),
    contentManifest: digest(resolve(root, "scripts/ops/content-package-manifest.json")),
    evaluatorBaseline: digest(resolve(root, "scripts/ops/evaluation-baseline.json")),
    databaseMigration: "not_configured",
  } as const;
}
