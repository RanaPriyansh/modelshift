# Figma Phase 1 Execution Plan

Status: Approved. Starter generator ready. Generator run not verified.

Date: 2026-08-01.

Target file: <https://www.figma.com/design/qzdsINs69QK44KiorK9plj/FORGE-Terrain-Product-Design-System>

## 1. Approval

The user approved Figma Phase 1 on 2026-08-01.

Phase 1 can create foundations.

Phase 1 cannot create final page designs.

No Phase 1 mutation has succeeded in Figma.

The local Figma generator is complete.

The generator is in `scripts/design/figma-forge-terrain-plugin`.

## 2. Current constraint

The connected account has a Full seat on the Figma Starter plan.

The Starter plan does not support additional variable modes.

The approved design system requires Light and Dark semantic values.

The Starter plan also excludes published team libraries, Dev Mode, and Code Connect.

The Figma connector returns `INVALID_ARGUMENT` for the valid new file.

The Chrome file chooser also cannot upload the token files without the required extension permission.

The Figma desktop application is the next execution path.

The macOS session must be unlocked before that path can run.

## 3. Recommended structure

Use an Education, Professional, Organization, or Enterprise file.

Create two collections:

| Collection | Modes | Variables |
| --- | --- | ---: |
| `FORGE / Primitive` | `Value` | 54 |
| `FORGE / Semantic` | `Light`, `Dark` | 16 |
| Total | Three mode columns | 70 |

The Primitive collection contains:

- 32 color values.
- 8 space values.
- 2 radius values.
- 1 minimum target value.
- 4 layout values.
- 3 motion values.
- 4 typeface values.

The Semantic collection aliases its 16 values to the correct Light or Dark color primitives.

This structure supports automatic appearance switching.

## 4. Starter fallback

Use this structure for the current Starter-compatible build.

Create three collections:

| Collection | Modes | Variables |
| --- | --- | ---: |
| `FORGE / Primitive` | `Value` | 54 |
| `FORGE / Semantic / Light` | `Value` | 16 |
| `FORGE / Semantic / Dark` | `Value` | 16 |
| Total | Three single-mode collections | 86 |

This structure preserves semantic aliases.

This structure does not support automatic Light and Dark mode switching.

Designers must bind each appearance to a different collection.

## 5. Phase 1 checklist

### P1.a Collections

Create the selected collection structure.

Rename the default modes.

Return every collection identifier and mode identifier.

### P1.b Primitive variables

Create 54 primitive variables.

Set the exact Light and Dark color values from the token handoff.

Set space, radius, target, layout, motion, and typeface values.

### P1.c Semantic variables

Create 16 semantic color variables.

Alias each semantic value to a primitive color.

Do not use raw semantic colors.

### P1.d Scopes

Use these scopes:

| Group | Scope |
| --- | --- |
| Space | `GAP` |
| Radius | `CORNER_RADIUS` |
| Target and layout | `WIDTH_HEIGHT` |
| Typeface | `FONT_FAMILY` |
| Motion | No scope |
| Background and surface | Fill scopes |
| Border | `STROKE_COLOR` |
| Text | `TEXT_FILL` |
| Authority colors | Fill, stroke, and text scopes |
| Focus | `STROKE_COLOR` |

No variable can use `ALL_SCOPES`.

### P1.e Code syntax

Add current CSS names for the 16 semantic colors.

Add Swift names from `forge-terrain.platform-map.json`.

Do not describe planned code names as implemented code names.

### P1.f Text styles

Create these web text styles:

- `Web/Display/Hero`
- `Web/Display/Page`
- `Web/Heading/Section`
- `Web/Heading/Item`
- `Web/Body/Large`
- `Web/Body/Default`
- `Web/Body/Small`
- `Web/Label/Default`
- `Web/Label/Mono`
- `Web/Reflection/Prompt`

Create these iOS text styles:

- `iOS/Large Title`
- `iOS/Title`
- `iOS/Title 3`
- `iOS/Body`
- `iOS/Subheadline`
- `iOS/Callout`
- `iOS/Caption`
- `iOS/Technical`

Use Geist for the main web styles.

Use Geist Mono for web technical labels.

Use Libre Baskerville for the reflection prompt.

Use SF Pro for iOS styles.

Use Geist Mono for the iOS technical specimen in Figma.

The native implementation will use SF Mono.

### P1.g Paint and effect styles

Create these environmental paint styles:

- `Scene/Horizon Cobalt`
- `Scene/Field Alpine`
- `Scene/Threshold Ember`

Create these authority paint styles:

- `Authority/Learner`
- `Authority/AI Contribution`
- `Authority/Tested Evidence`
- `Authority/Quiet`

Create these effect styles:

- `Elevation/Quiet`
- `Elevation/Floating`

Use effects only for real hierarchy.

### P1.h Validation

Confirm:

1. The selected collections exist.
2. All planned variables exist.
3. Every semantic value is an alias.
4. Light and Dark values match the token handoff.
5. No scope is broader than required.
6. The text styles use the planned font families.
7. The paint and effect styles use stable names.
8. No text layer has a missing font.
9. The Figma file contains no partial duplicate collection.
10. Every created item has a returned identifier.

## 6. Exit criteria

The recommended paid-plan structure exits Phase 1 with:

- 2 collections.
- 70 variables.
- 18 text styles.
- 7 paint styles.
- 2 effect styles.
- 0 broken aliases.
- 0 missing fonts.

The Starter fallback exits Phase 1 with:

- 3 collections.
- 86 variables.
- 18 text styles.
- 7 paint styles.
- 2 effect styles.
- 0 broken aliases.
- 0 missing fonts.

## 7. Execution rules

Use sequential Figma mutations.

Use no more than ten logical operations in one call.

Check for an existing item before creation.

Load each font before a text mutation.

Change the current page once in one script.

Stop after each API error.

Inspect the file before a retry.

Keep the recovery ledger at `/private/tmp/dsb-state-forge-terrain-20260801.json`.

## 8. Official references

- Figma plans and features: <https://help.figma.com/hc/en-us/articles/360040328273-Figma-plans-and-features>
- Figma variable modes: <https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables>
- Figma Starter plan: <https://help.figma.com/hc/en-us/articles/13838684089751-Starter-plan-overview>
