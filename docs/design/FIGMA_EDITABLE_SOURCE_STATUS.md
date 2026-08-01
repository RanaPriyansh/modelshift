# Figma Editable Source Status

Status: Generator ready. Figma run not verified.

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
- The plugin manifest is valid JSON.
- The plugin JavaScript passes `node --check`.
- The mock Figma run creates 10 pages, 86 variables, 17 components, and 28 frames.
- The token build check passes.
- Repository lint and type checks pass.
- 109 source and evaluation test files pass.
- 969 source and evaluation tests pass.

## Current external blockers

The Figma connector returns `INVALID_ARGUMENT` for the new file.

The Chrome file chooser needs the extension file-access permission.

The macOS session is locked.

The generator has not run in Figma.

No editable-source completion claim is valid yet.

## Next action

Unlock macOS.

Open the target file in the Figma desktop application.

Import `scripts/design/figma-forge-terrain-plugin/manifest.json` as a development plugin.

Run `FORGE Terrain Builder`.

Audit the build receipt, variables, styles, components, and boards.
