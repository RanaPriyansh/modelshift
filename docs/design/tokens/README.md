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

For a paid plan, create the collection `FORGE / Semantic`.

Import the Light and Dark semantic files as two modes named `Light` and `Dark`.

The semantic files contain identical token names and types.

Figma normalizes nested token names with forward slashes.

Core dimensions use `px`, durations use `s`, and font families use one string.

These values match the current Figma DTCG importer requirements.

Phase 1 received explicit approval on 2026-08-01.

The selected Starter-compatible structure uses separate Light and Dark semantic collections.

The local generator creates and aliases these collections from the same token source.

Use `docs/design/FIGMA_PHASE_1_EXECUTION_PLAN.md` for the selected structure.

Use `scripts/design/figma-forge-terrain-plugin` to create the complete editable source.

## Web mapping

`forge-terrain.platform-map.json` maps each semantic token to its CSS custom property.

The generator verifies every Light and Dark value against `app/forge-system.css`.

The current CSS variable names retain their implementation names.

The design token names use learner, AI contribution, and tested evidence semantics.

## iOS mapping

`forge-terrain.ios.json` provides adaptive Light and Dark values.

It also records native typography, layout, navigation, accessibility, and recovery requirements.

Use `../FORGE_IOS_NATIVE_HANDOFF.md` for the complete screen and interaction contract.

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
