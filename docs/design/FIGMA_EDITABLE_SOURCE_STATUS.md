# Figma Editable Source Status

Status: Local source integrity passes. Figma source rerun required after generator fixes.

Date: 2026-08-01.

## Target

- File: `FORGE Terrain Product Design System`
- Key: `qzdsINs69QK44KiorK9plj`
- URL: <https://www.figma.com/design/qzdsINs69QK44KiorK9plj/FORGE-Terrain-Product-Design-System>
- Plan: Starter

## Selected structure

The file uses three single-mode collections:

1. `FORGE / Primitive`
2. `FORGE / Semantic / Light`
3. `FORGE / Semantic / Dark`

The generator creates:

- 54 primitive variables.
- 16 Light semantic aliases.
- 16 Dark semantic aliases.
- 33 reusable web and iOS component records.
- Eligible token-matched component fills, strokes, and text colors bind to mode-specific semantic variables.
- 18 text styles.
- 7 paint styles.
- 2 effect styles.
- 10 pages.
- Reusable web components.
- Reusable iOS compounds.
- 6 public-site boards.
- 6 web-application boards.
- 3 focus boards.
- 6 iOS boards.
- Shared state and accessibility boards.
- 1 canonical coverage index for all 46 public, web, focus, and iOS families.

## Generator

Path:

`scripts/design/figma-forge-terrain-plugin`

The plugin only removes nodes that it created in an earlier run.

The plugin writes a build receipt to `09 Archive`.

The plugin makes no network request.

## Verified local facts

- The Figma file exists and opens in Chrome.
- The file starts with one empty page.
- The Figma Runtime Phase 0 gap analysis is complete.
- The file has no source conflict with the approved local system.
- The plugin manifest is valid JSON.
- The plugin JavaScript passes `node --check`.
- The mock Figma run creates 10 pages, 86 variables, 33 components, and 28 frames.
- The checker verifies 32 semantic alias targets and component variable bindings.
- The 46 Figma coverage identifiers match the complete coded atlas.
- The checker verifies 21 representative editable identifiers.
- The token build check passes.
- Repository lint and type checks pass.
- 110 source and evaluation test files pass.
- 972 source and evaluation tests pass.

## Desktop execution result

The saved desktop execution predates the current source integrity fix.

The development plugin was imported from:

`scripts/design/figma-forge-terrain-plugin/manifest.json`

Figma accepted the plugin as `FORGE Terrain Builder`.

The plugin completed in the target file.

Figma showed all ten planned pages:

1. `00 Cover`
2. `01 Foundations`
3. `02 Web Components`
4. `03 Public Site`
5. `04 Web Application`
6. `05 Focus Mode`
7. `06 iOS Components`
8. `07 iOS Application`
9. `08 States and Accessibility`
10. `09 Archive`

The build receipt reports:

- 10 pages.
- 3 variable collections.
- 86 variables.
- 18 text styles.
- 7 paint styles.
- 2 effect styles.
- 17 components in the pre-fix desktop receipt.
- 28 generated frames.

The desktop variable editor showed 16 Light semantic aliases.

The desktop variable editor also showed 16 Dark semantic aliases.

No broken semantic alias marker was visible.

The saved evidence does not include the variable editor panel.

The connector cannot supply an independent variable readback.

The public, web, focus, iOS, state, accessibility, and coverage boards passed a pre-fix desktop visual audit.

The durable evidence manifest is:

`docs/design/evidence/forge-terrain/forge-figma-desktop-audit-manifest.json`

## Connector limitation

The following Figma endpoints return `INVALID_ARGUMENT` for the target file:

- Plugin API execution.
- Metadata inspection.
- Library inspection.
- Web design capture.

The local design atlas returned HTTP 200 before the web design capture attempt.

The capture endpoint failed before it created a capture.

The desktop Figma audit supplies the source evidence that the connector could not supply.

## Required Figma rerun gate

Import the updated plugin into the target Figma file.

Run `FORGE Terrain Builder`.

Confirm 33 components in the `09 Archive` receipt.

Confirm 32 semantic aliases point to mode-matched primitive variables.

Confirm eligible token-matched component fills, strokes, and text colors show correct variable bindings.

Inspect the iOS component board for complete text rendering.

Capture new evidence after this inspection.
