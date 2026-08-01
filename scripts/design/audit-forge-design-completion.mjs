import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = (relativePath) => readFile(new URL(relativePath, root), "utf8");

const [
  atlasSource,
  figmaSource,
  goalSource,
  inventorySource,
  figmaStatusSource,
  iosHandoffSource,
] = await Promise.all([
  read("src/components/forge/design-lab/ProductDesignAtlas.tsx"),
  read("scripts/design/figma-forge-terrain-plugin/code.js"),
  read("docs/design/FORGE_NORTH_STAR_AND_COMPLETION_GOALS.md"),
  read("docs/design/FORGE_PAGE_INVENTORY_AND_REQUIREMENTS.md"),
  read("docs/design/FIGMA_EDITABLE_SOURCE_STATUS.md"),
  read("docs/design/FORGE_IOS_NATIVE_HANDOFF.md"),
]);

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
assert.match(figmaStatusSource, /Status: Generator ready\. Figma run not verified\./);
assert.match(figmaStatusSource, /No editable-source completion claim is valid yet\./);
assert.equal(
  uniqueIdentifiers(iosHandoffSource).filter((identifier) => identifier.startsWith("IOS-")).length,
  18,
  "The iOS handoff must contain all 18 canonical screen identifiers.",
);
assert.match(iosHandoffSource, /NO_NATIVE_TARGET/);

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
];
await Promise.all(requiredArtifacts.map((relativePath) => access(new URL(relativePath, root))));

console.log(
  JSON.stringify(
    {
      status: "local_requirements_pass",
      canonicalFamilies: expectedFamilyCounts,
      canonicalIdentifiers: atlasIdentifiers.length,
      representativeEditableIdentifiers: 21,
      sharedStates: 8,
      externalGates: [
        "Run and audit the generator in the target Figma file.",
        "Create and verify a native iOS target.",
        "Complete learner review and asset-rights review.",
      ],
    },
    null,
    2,
  ),
);
