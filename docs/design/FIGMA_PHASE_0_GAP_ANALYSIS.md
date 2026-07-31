# Figma Phase 0 Gap Analysis

Status: Phase 0 discovery complete.

Date: 2026-08-01.

## 1. Source identity

Code source:

- Worktree: `/Users/Priyansh/Documents/codex-buildweek/worktrees/forge-complete-design-system-20260801`
- Branch: `agent/forge-complete-design-system-20260801`
- Revision: `684f5a898fa2ece3a1e4a61c1a51f0716b535400`

Figma source:

- File: `FORGE Product Design System - Public, Web, iOS`
- Key: `BxrzaLocs29c53U1xLyfdc`
- URL: <https://www.figma.com/design/BxrzaLocs29c53U1xLyfdc>

## 2. Code inventory

The repository contains:

- 61 route page files.
- 15 canonical application route files.
- 12 main public route files.
- 45 non-test FORGE component files.
- 33 distinct FORGE CSS custom properties.
- 29 shared semantic, spacing, and radius properties in `app/forge-system.css`.
- Light, Dark, and System theme behavior.
- One local design lab.
- One implemented scenic public home.
- One implemented web application direction.
- One non-native iPhone display study.

The code remains the value source for existing tokens.

## 3. Figma inventory

The Figma file contains:

- One page named `Page 1`.
- Zero frames.
- Zero variable collections.
- Zero variables.
- Zero styles.
- Zero components.
- Zero component sets.

No Code Connect mapping exists in the repository.

No code and Figma value conflict exists because the Figma file is empty.

## 4. Available Figma resources

Available fonts include:

- Geist.
- Geist Mono.
- Inter.
- Libre Baskerville.
- SF Pro.
- SF Pro Rounded.
- Roboto families.

Subscribed libraries include:

- Simple Design System.
- Material 3 Design Kit.
- iOS and iPadOS 27.
- iOS and iPadOS 26.
- macOS, watchOS, and visionOS libraries.

The iOS 27 library contains native tab bars, buttons, toolbars, alerts, and status bars.

The Simple Design System contains basic web form and button components.

## 5. Planned Figma structure

Pages:

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

Variable collections:

- `FORGE / Primitive`
- `FORGE / Semantic`

The Semantic collection has Light and Dark modes.

Planned styles:

- 9 text styles.
- Semantic color styles where a style is useful.
- One minimal elevated effect.

Planned first component set:

- Button.
- Icon button.
- Text input.
- Text area.
- Choice row.
- Theme control.
- Status label.
- Source receipt.
- Evidence boundary.
- Next action.
- Path step.
- Return row.
- Empty state.
- Offline state.
- Error state.

Planned iOS compounds:

- Terrain header.
- Next action.
- Evidence boundary.
- Source receipt.
- Return row.
- Path milestone.

Native controls will use the Apple iOS 27 library.

## 6. Gap analysis

| Area | Code | Figma | Gap |
| --- | --- | --- | --- |
| Color tokens | Implemented | Missing | Create primitive and semantic variables |
| Theme modes | Implemented | Missing | Create Light and Dark modes |
| Typography | Mixed fallbacks | Missing | Create Geist, Geist Mono, and SF Pro styles |
| Spacing | Implemented | Missing | Create 4 px scale |
| Radius | Implemented | Missing | Create 6 px and 12 px values |
| Motion | Documented | Missing | Create motion values and examples |
| Web components | Partial | Missing | Build core component sets |
| Public pages | Partial | Missing | Design canonical page families |
| Web application | Partial | Missing | Design canonical application families |
| Focus mode | Implemented in routes | Missing | Design protected states |
| iOS application | No native source | Missing | Design native screen families |
| Error states | Partial | Missing | Create shared state patterns |
| Code Connect | Missing | Missing | Add after components stabilize |

## 7. Product requirements locked in Phase 0

The public site starts from one learner goal.

The application home shows one next meaningful action.

The iOS application uses native Apple navigation and controls.

Protected proof removes instructional help.

Accessibility support remains available.

Light, Dark, and System themes are required.

The system does not use points, badges, streaks, ranks, or infinite feeds.

The visual direction uses landscapes at thresholds and quiet surfaces during work.

## 8. Phase 0 exclusions

Phase 0 did not create Figma variables, styles, components, or screens.

Phase 0 did not change production routes.

Phase 0 did not create a native iOS project.

Phase 0 did not deploy, push, merge, or change external data.

## 9. Phase 1 approval gate

Phase 1 will create Figma foundations only.

It will create:

- File pages.
- Primitive variables.
- Light and Dark semantic variables.
- Text styles.
- Core color and effect styles.
- A foundations documentation frame.

Phase 1 will not create final page designs.

Explicit user approval is required before Phase 1 starts.

