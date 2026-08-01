import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
const read = (relativePath) => readFile(new URL(relativePath, root), "utf8");
const rootPath = fileURLToPath(root);

async function collectSwiftFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSwiftFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".swift") ? [entryPath] : [];
  }));
  return files.flat();
}

const [
  atlasSource,
  figmaSource,
  figmaCheckerSource,
  goalSource,
  inventorySource,
  figmaStatusSource,
  figmaAuditSource,
  iosHandoffSource,
] = await Promise.all([
  read("src/components/forge/design-lab/ProductDesignAtlas.tsx"),
  read("scripts/design/figma-forge-terrain-plugin/code.js"),
  read("scripts/design/check-forge-terrain-figma-plugin.mjs"),
  read("docs/design/FORGE_NORTH_STAR_AND_COMPLETION_GOALS.md"),
  read("docs/design/FORGE_PAGE_INVENTORY_AND_REQUIREMENTS.md"),
  read("docs/design/FIGMA_EDITABLE_SOURCE_STATUS.md"),
  read("docs/design/evidence/forge-terrain/forge-figma-desktop-audit-current-manifest.json"),
  read("docs/design/FORGE_IOS_NATIVE_HANDOFF.md"),
]);
const figmaAudit = JSON.parse(figmaAuditSource);
const iosSwiftFiles = await collectSwiftFiles(
  path.join(rootPath, "ios", "FORGETerrain", "FORGETerrain"),
);
const iosSwiftSource = (
  await Promise.all(iosSwiftFiles.map((file) => readFile(file, "utf8")))
).join("\n");

const identifierPattern = /(?:PUB|APP|FOCUS|IOS)-\d+/g;
const uniqueIdentifiers = (source) => [...new Set(source.match(identifierPattern) ?? [])].sort();
const atlasIdentifiers = uniqueIdentifiers(atlasSource);
const figmaIdentifiers = uniqueIdentifiers(figmaSource);
const expectedFamilyCounts = {
  APP: 14,
  FOCUS: 3,
  IOS: 18,
  PUB: 11,
};

assert.equal(atlasIdentifiers.length, 46, "The coded atlas must contain 46 canonical identifiers.");
assert.deepEqual(
  figmaIdentifiers,
  atlasIdentifiers,
  "The Figma generator and coded atlas must use the same identifiers.",
);

for (const [family, count] of Object.entries(expectedFamilyCounts)) {
  assert.equal(
    atlasIdentifiers.filter((identifier) => identifier.startsWith(`${family}-`)).length,
    count,
    `The ${family} family must contain ${count} identifiers.`,
  );
}

const representativeSource = figmaSource.slice(
  figmaSource.indexOf("const PUBLIC_SCREENS"),
  figmaSource.indexOf("const CANONICAL_COVERAGE"),
);
assert.equal(
  uniqueIdentifiers(representativeSource).length,
  21,
  "The Figma generator must contain 21 representative editable identifiers.",
);

for (const state of [
  "Loading",
  "Empty",
  "Offline",
  "Blocked",
  "Contaminated",
  "Withdrawn",
  "Error",
  "Safe fallback",
]) {
  assert.match(atlasSource, new RegExp(`["']${state}["']`), `Missing shared state: ${state}.`);
}

for (const marker of [
  "Vivid at thresholds. Quiet during work. Precise when evidence appears.",
  "Learner acts. AI assists. Evidence decides.",
  "Recall -> Attempt -> Repair -> Prove -> Return",
]) {
  assert(goalSource.includes(marker), `Missing North Star marker: ${marker}`);
}

for (const gate of [
  "Editable source",
  "Page inventory",
  "Visual fidelity",
  "Design-system integrity",
  "Web implementation",
  "Responsive behavior",
  "Themes",
  "Accessibility behavior",
  "iOS handoff",
  "Provenance",
]) {
  assert(goalSource.includes(`| ${gate} |`), `Missing completion gate: ${gate}.`);
}

assert.match(inventorySource, /\| `PUB-01` \|/);
assert.match(inventorySource, /\| `APP-14` \|/);
assert.match(inventorySource, /\| `FOCUS-03` \|/);
assert.match(inventorySource, /\| `IOS-18` \|/);
assert.equal(figmaAudit.schema, "forge.figma.desktop-audit.v2");
assert.equal(figmaAudit.status, "pass");
assert.equal(figmaAudit.sourceRevision, "4d57ed8d31d8e8ab8ae5a327522dc0135accd442");
const figmaGeneratorDigest = createHash("sha256").update(figmaSource).digest("hex");
const figmaEvidenceCurrent = figmaGeneratorDigest === figmaAudit.generator.sha256;
const figmaCheckerDigest = createHash("sha256").update(figmaCheckerSource).digest("hex");
assert.equal(figmaEvidenceCurrent, true, "The current Figma evidence must match the generator.");
assert.equal(
  figmaCheckerDigest,
  figmaAudit.generator.checkerSha256,
  "The current Figma evidence must match the checker.",
);
assert.match(
  figmaStatusSource,
  /Status: Local source integrity and the current Figma desktop audit pass\./,
);
assert.deepEqual(
  figmaAudit.counts,
  {
    pages: 10,
    collections: 3,
    variables: 86,
    textStyles: 18,
    paintStyles: 7,
    effectStyles: 2,
    components: 33,
    generatedFrames: 28,
    canonicalCoverageIdentifiers: 46,
    representativeEditableIdentifiers: 21,
  },
  "The Figma desktop audit counts must match its recorded source revision.",
);
assert.deepEqual(
  figmaAudit.semanticAliases,
  { light: 16, dark: 16, broken: 0 },
  "The Figma desktop audit must prove every semantic alias.",
);
assert.equal(figmaAudit.pages.length, 10, "The Figma audit must list ten generated pages.");
assert.equal(figmaAudit.evidence.length, 15, "The Figma audit must contain fifteen evidence images.");
assert.deepEqual(
  figmaAudit.visualReview,
  {
    status: "pass",
    iosComponents: "No zoom popup covers the assistance disclosure.",
    darkVariables: "The upper and lower captures cover all 16 semantic aliases.",
  },
  "The Figma evidence must include a passed visual review.",
);
for (const evidence of figmaAudit.evidence) {
  const image = await readFile(new URL(evidence.path, root));
  const digest = createHash("sha256").update(image).digest("hex");
  assert.equal(digest, evidence.sha256, `Figma evidence hash mismatch: ${evidence.path}`);
  assert.equal(
    image.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    `Figma evidence is not PNG data: ${evidence.path}`,
  );
}
assert.equal(
  uniqueIdentifiers(iosHandoffSource).filter((identifier) => identifier.startsWith("IOS-")).length,
  18,
  "The iOS handoff must contain all 18 canonical screen identifiers.",
);
assert.match(iosHandoffSource, /NATIVE_REFERENCE_SOURCE_READY/);
assert.equal(
  uniqueIdentifiers(iosSwiftSource).filter((identifier) => identifier.startsWith("IOS-")).length,
  18,
  "The native SwiftUI source must contain all 18 canonical screen identifiers.",
);

await access(new URL("app/app/paths/page.tsx", root));
for (const removedRoute of ["app/app/path/page.tsx", "app/plan/page.tsx"]) {
  await assert.rejects(
    access(new URL(removedRoute, root)),
    { code: "ENOENT" },
    `${removedRoute} must stay removed.`,
  );
}

const requiredArtifacts = [
  "docs/design/FORGE_COMPLETE_PRODUCT_DESIGN_SYSTEM.md",
  "docs/design/FORGE_TASTE_SYNTHESIS.md",
  "docs/design/FORGE_STUDENT_DESIGN_LANGUAGE.md",
  "docs/design/FORGE_COMPLETE_DESIGN_ATLAS_FIDELITY_LEDGER.md",
  "docs/design/FIGMA_RUNTIME_PHASE_0_GAP_ANALYSIS.md",
  "scripts/design/figma-forge-terrain-plugin/manifest.json",
  "scripts/design/check-forge-terrain-figma-plugin.mjs",
  "scripts/design/audit-forge-design-atlas.mjs",
  "scripts/design/capture-forge-design-atlas.mjs",
  "scripts/design/check-forge-ios-native.mjs",
  "docs/design/evidence/forge-terrain/forge-design-atlas-capture-manifest.json",
  "docs/design/evidence/forge-terrain/forge-figma-desktop-audit-current-manifest.json",
  "docs/design/evidence/forge-terrain/forge-figma-desktop-audit-manifest.json",
  "ios/FORGETerrain/project.yml",
  "ios/FORGETerrain/FORGETerrain.xcodeproj/project.pbxproj",
];
await Promise.all(requiredArtifacts.map((relativePath) => access(new URL(relativePath, root))));

console.log(
  JSON.stringify(
    {
      status: "local_requirements_pass",
      canonicalFamilies: expectedFamilyCounts,
      canonicalIdentifiers: atlasIdentifiers.length,
      representativeEditableIdentifiers: 21,
      figmaDesktopAudit: {
        status: "current",
        sourceRevision: figmaAudit.sourceRevision,
        pages: figmaAudit.counts.pages,
        variables: figmaAudit.counts.variables,
        components: figmaAudit.counts.components,
        generatedFrames: figmaAudit.counts.generatedFrames,
        semanticAliases: figmaAudit.semanticAliases,
        evidenceImages: figmaAudit.evidence.length,
      },
      currentFigmaGenerator: {
        sha256: figmaGeneratorDigest,
        evidenceCurrent: figmaEvidenceCurrent,
        pages: 10,
        variables: 86,
        components: 33,
        generatedFrames: 28,
        verifiedAliasTargets: 32,
      },
      sharedStates: 8,
      externalGates: [
        "Install a compatible iOS Simulator runtime and complete native runtime checks.",
        "Complete learner review and asset-rights review.",
      ],
    },
    null,
    2,
  ),
);
