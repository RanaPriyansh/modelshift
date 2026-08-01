# FORGE Final Design Requirement Audit

Status: Local requirements pass. External source and learner gates remain open.

Date: 2026-08-01.

## Direction

The design system uses one permanent rule:

> Vivid at thresholds. Quiet during work. Precise when evidence appears.

The product uses one trust rule:

> Learner acts. AI assists. Evidence decides.

The learning loop is:

```text
Recall -> Attempt -> Repair -> Prove -> Return
```

## Local requirement result

| Requirement | Result | Evidence |
| --- | --- | --- |
| Taste synthesis | Pass | The source images map to one documented middle-ground direction. |
| Product design language | Pass | Public, work, focus, evidence, state, theme, and iOS rules exist. |
| Canonical inventory | Pass | 11 public, 14 application, 3 focus, and 18 iOS identifiers exist. |
| Coded design atlas | Pass | All 46 identifiers render at desktop and 320 CSS pixels. |
| Shared states | Pass | Eight required recovery states render in both audited viewports. |
| Editable-source generator | Pass locally | The generator creates 10 pages, 86 variables, 17 components, and 28 frames. |
| Static source parity | Pass | The 46 Figma coverage identifiers match the coded atlas. |
| Representative boards | Pass locally | The generator contains 21 editable representative screen identifiers. |
| Responsive behavior | Pass | Atlas and canonical route browser audits report zero horizontal overflow. |
| Keyboard behavior | Pass | Skip links move focus to the correct main content. |
| Reduced Motion | Pass | The audited atlas and routes retain no active motion over one millisecond. |
| Forced Colors | Pass | The audited surfaces retain boundaries, focus, and meaningful controls. |
| Route identity | Pass | `/app/paths` is canonical. `/app/path` and `/plan` return HTTP 404. |
| iOS design handoff | Pass locally | All 18 iOS families have structure, state, and accessibility contracts. |
| Native iOS source | Pass locally | The SwiftUI reference contains all 18 screen IDs and passes the iOS 17 SDK type check. |
| Production build | Pass locally | The Webpack build passed. The public boundary verified 106 assets. |
| Production claim | Not made | This work is local and is not deployed. |

## Verification commands

```text
pnpm design:tokens:check
pnpm design:figma:check
pnpm design:ios:check
FORGE_DESIGN_ATLAS_URL=http://localhost:3035/internal/design-lab pnpm design:atlas:capture
FORGE_DESIGN_ATLAS_URL=http://localhost:3035/internal/design-lab pnpm design:atlas:check
pnpm design:completion:audit
pnpm lint
pnpm typecheck
pnpm test
pnpm exec next build --webpack
pnpm exec tsx scripts/ops/verify-public-build-boundary.ts
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3035 pnpm exec playwright test tests/e2e/forge-refoundation.spec.ts tests/e2e/forge-experience-system.spec.ts --project=desktop
```

The public boundary digest is
`b75e559a0bff74ca778a990a58768de7576d6e07d451579033247a0329f19166`.

The default Turbopack build cannot follow the linked `node_modules` path in this isolated worktree.

## Open external gates

### Editable Figma source

The target Figma file is still empty.

The Figma connector returns `INVALID_ARGUMENT`.

The macOS session remains locked.

Run the verified local plugin in Figma.

Then inspect every variable, style, component, board, and build receipt.

### Native iOS runtime verification

The SwiftUI reference target exists at `ios/FORGETerrain/FORGETerrain.xcodeproj`.

The machine has no installed iOS Simulator runtime.

Install a compatible runtime before simulator, Dynamic Type, VoiceOver, or native motion claims.

### Learner and rights review

No local test proves learner preference or learning efficacy.

Review the design with representative learners.

Clear image rights before production use.

## Completion decision

The local design and implementation evidence passes.

The complete goal remains active because the editable Figma, native runtime, learner-review, and rights gates remain open.
