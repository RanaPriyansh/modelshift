# FORGE Final Design Requirement Audit

Status: Local source requirements pass. Figma rerun, runtime, rights, and learner gates remain open.

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
| Editable Figma source | Rerun required | The pre-fix desktop source contains 10 pages, 3 collections, 86 variables, 17 components, and 28 frames. The current local generator creates 33 components. |
| Figma semantic aliases and bindings | Local pass, Figma rerun required | The local checker verifies 32 mode-matched alias targets and eligible token-matched component fills, strokes, and text bindings. |
| Static source parity | Pass | The 46 Figma coverage identifiers match the coded atlas. |
| Representative boards | Pass locally | The generator contains 21 editable representative screen identifiers. |
| Responsive behavior | Pass | Atlas and canonical route browser audits report zero horizontal overflow. |
| Keyboard behavior | Pass | Skip links move focus to the correct main content. |
| Reduced Motion | Pass | The audited atlas and routes retain no active motion over one millisecond. |
| Forced Colors | Pass | The audited surfaces retain boundaries, focus, and meaningful controls. |
| Route identity | Pass | `/app/paths` is canonical. `/app/path` and `/plan` return HTTP 404. |
| iOS design handoff | Pass locally | All 18 iOS families have structure, state, and accessibility contracts. |
| Native iOS source | Pass locally | The SwiftUI reference contains all 18 screen IDs and passes the iOS 17 SDK type check. |
| Production build | Pass locally | The Webpack build passed. The public boundary verified 121 assets. |
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
`a186bd6bca82d6ba0555d13af5084c65995ad1c70b43d140546cbb1ca91c042e`.

The default Turbopack build cannot follow the linked `node_modules` path in this isolated worktree.

The Figma desktop audit manifest is
`docs/design/evidence/forge-terrain/forge-figma-desktop-audit-manifest.json`.

The Figma connector still returns `INVALID_ARGUMENT`.

The connector limitation does not invalidate the completed desktop audit.

## Open external gates

### Figma source rerun

Run the updated generator in the target Figma file.

Confirm 33 components in the `09 Archive` receipt.

Confirm 32 mode-matched semantic aliases.

Confirm eligible token-matched component fills, strokes, and text colors use correct variable bindings.

Capture the variable editor panel and the iOS component board after the rerun.

The Figma connector returns `INVALID_ARGUMENT` for variable readback.

### Native iOS runtime verification

The SwiftUI reference target exists at `ios/FORGETerrain/FORGETerrain.xcodeproj`.

The machine lists iOS 26.5 simulator devices, but every listed runtime is unavailable.

Install a compatible runtime before simulator, Dynamic Type, VoiceOver, or native motion claims.

### Learner and rights review

No local test proves learner preference or learning efficacy.

Review the design with representative learners.

Clear image rights before production use.

## Completion decision

The local design and implementation evidence passes.

The complete goal remains active because the Figma rerun, native runtime, learner-review, and rights gates remain open.
