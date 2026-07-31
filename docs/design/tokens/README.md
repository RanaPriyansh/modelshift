# FORGE Terrain Token Handoff

Status: Local design handoff.

Specification: DTCG 2025.10.

The Design Tokens Community Group format is the stable exchange source.

The files are:

- `forge-terrain.core.tokens.json`
- `forge-terrain.semantic.light.tokens.json`
- `forge-terrain.semantic.dark.tokens.json`
- `forge-terrain.platform-map.json`
- `forge-terrain.ios.json`

## Figma import

Create the collection `FORGE / Primitive`.

Import `forge-terrain.core.tokens.json` as its first mode.

Create the collection `FORGE / Semantic`.

Import the Light and Dark semantic files as two modes.

Use the names `Light` and `Dark`.

The semantic files contain identical token names and types.

Figma normalizes nested token names with forward slashes.

Core dimensions use `px`, durations use `s`, and font families use one string.

These values match the current Figma DTCG importer requirements.

Phase 1 received explicit approval on 2026-08-01.

Do not import these files before the Figma plan structure is selected.

The current Starter plan cannot create the planned Light and Dark modes.

Use `docs/design/FIGMA_PHASE_1_EXECUTION_PLAN.md` for the selected structure.

## Web mapping

`forge-terrain.platform-map.json` maps each semantic token to its CSS custom property.

The generator verifies every Light and Dark value against `app/forge-system.css`.

The current CSS variable names retain their implementation names.

The design token names use learner, AI contribution, and tested evidence semantics.

## iOS mapping

`forge-terrain.ios.json` provides adaptive Light and Dark values.

It also records native typography, layout, navigation, accessibility, and recovery requirements.

The DTCG `px` distance unit translates to iOS points during platform implementation.

This file is a design handoff.

It is not a compiled SwiftUI implementation.

## Commands

Generate the files:

```text
node scripts/design/build-forge-terrain-tokens.mjs --write
```

Verify the committed files:

```text
node scripts/design/build-forge-terrain-tokens.mjs --check
```

Official references:

- DTCG Format Module 2025.10: <https://www.designtokens.org/TR/2025.10/format/>
- Figma variable mode import: <https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables>
