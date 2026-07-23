import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertNoAdultPilotPublicArtifactLeaks,
  scanAdultPilotProductionPublicAssets,
} from "../../src/components/forge/pilot/adult-pilot-public-artifact-boundary";

import { readPublicAssetDigest } from "./release-digests";
import { publicBuildBoundaryReceiptLine } from "./public-build-boundary-receipt";

const RETAINED_ARGUMENT_EVIDENCE_MARKERS = [
  "argument-evidence",
  "world.argument-evidence",
  "source.argument-evidence.authored-fixture",
  "forge-internal:source.argument-evidence.authored-fixture",
  "The rooftop garden lowers",
  "rooftop_garden_evidence_table",
  "The new morning bus route reduced",
  "bus_route_late_arrivals_table",
  "roof.outcome-linked",
  "supports_with_limit",
  "bus.outcome-linked",
  "compares_named_outcome",
  "other_changes_not_ruled_out",
  "8ce3d6a8138f49a499202cacf4d38b58e03d7978bf151b3138020bdf24ce9ed9",
  "a38c116d6b81e0e30f2f5d711c0f19346eefc76504859b3fc929c317731ab9fc",
  "6529ad6571852c31eadd49a30b7889c7da46ff1268dfa9bc4579bb69ba4d07d1",
  "sha256:a38c116d6b81e0e30f2f5d711c0f19346eefc76504859b3fc929c317731ab9fc",
  "sha256:6529ad6571852c31eadd49a30b7889c7da46ff1268dfa9bc4579bb69ba4d07d1",
] as const;

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

export function verifyPublicBuildBoundary(root = process.cwd()): void {
  const staticDirectory = resolve(root, ".next/static");
  const files = filesUnder(staticDirectory);
  const leaks: string[] = [];
  for (const file of files) {
    const bytes = readFileSync(file);
    for (const marker of RETAINED_ARGUMENT_EVIDENCE_MARKERS) {
      if (bytes.includes(Buffer.from(marker))) leaks.push(`${file}: ${marker}`);
    }
  }
  const adultPilotLeaks = scanAdultPilotProductionPublicAssets(root);
  if (leaks.length > 0) {
    throw new Error(`Retained unavailable Argument & Evidence data reached public build assets:\n${leaks.join("\n")}`);
  }
  assertNoAdultPilotPublicArtifactLeaks(adultPilotLeaks);
  process.stdout.write(publicBuildBoundaryReceiptLine(files.length, readPublicAssetDigest(root)));
}

verifyPublicBuildBoundary();
