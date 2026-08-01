# Figma Editable Source Status

Status: Local source integrity and the current Figma desktop audit pass.

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

The desktop execution uses source revision
`4d57ed8d31d8e8ab8ae5a327522dc0135accd442`.

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
- 33 components.
- 28 generated frames.

The Figma variable editor showed 16 Light semantic aliases.

The Figma variable editor also showed 16 Dark semantic aliases.

No broken semantic alias marker was visible.

The saved evidence includes upper and lower Dark variable editor panels.

The local checker verifies all 16 Light aliases and all 16 Dark aliases.

The connector cannot supply an independent variable readback.

The public, web, focus, iOS, state, accessibility, and coverage boards passed the current desktop visual audit.

The iOS preview text renders with file-safe Inter or Geist faces.

Native SwiftUI continues to use the system font.

The desktop property panel shows current bindings for:

- `color/surface/default`
- `color/border/default`
- `color/action/learner`

The durable evidence manifest is:

`docs/design/evidence/forge-terrain/forge-figma-desktop-audit-current-manifest.json`

The historical pre-fix manifest remains at:

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

## Completed Figma rerun

The current `FORGE Terrain Builder` run completed in the target file.

The `09 Archive` receipt shows 33 components.

The checker verifies 32 mode-matched semantic aliases.

The checker verifies paint-level component bindings.

The iOS component and application boards show complete preview text.

Fifteen current PNG evidence files record the pages, receipt, variables, and bindings.

Two Dark variable captures cover all 16 aliases.

The clean iOS component capture shows the complete assistance disclosure.
