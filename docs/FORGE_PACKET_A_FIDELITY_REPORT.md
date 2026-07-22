# FORGE Packet A — Experience Fidelity Report

**Implementation base:** `2e6dc1e33313ae8afc848803f6b0aa77f2cc713d`
**Reference inspected:** `https://forge-design-lab.priyansh-rana.chatgpt.site/`
**Scope:** presentation tokens, shared primitives, and rendered-access verification only

## Fidelity ledger

| Reference contract | Packet A result | Disposition |
| --- | --- | --- |
| Paper-led shell, precise instrument panel, strong sans/mono hierarchy | Warm paper navigation and question-led home surround the existing dark learning/Studio instruments; shared system-sans and mono tokens replace inconsistent shell typography. | Preserved, intentionally not pixel copied. |
| One dominant learner question before a course catalog | Home opens on one question and its existing planner controls; working Worlds remain an honest catalog below it. | Preserved. |
| Visual meaning supports, but does not replace, explicit language | Status diamonds are paired with text; phase labels, status labels, and actions carry their meaning in accessible names. | Strengthened. |
| Dense tools appear only where they are useful | Studio remains a dark bounded authoring instrument; World reducers and proof flows are unchanged. | Preserved. |
| Quiet proof and evidence claims | No badges, mastery language, scores, streaks, color-only outcomes, or motion-only state cues were added. | Preserved. |

## Route and access evidence

- Browser inspection on the production build at `127.0.0.1:3111`: Home at 1440×900 and 320×800, Studio at 1440×900, and Primary Source Reasoning at 1440×900 all had zero horizontal overflow and no console entries. The primary-source image loaded with its existing descriptive accessible name and `naturalWidth` 846.
- The focused Chromium test covers Home, Studio, Login, Account, all four Worlds, Evidence, and Trail at exactly 320×800. It checks overflow ≤1 px, 44 px operational targets, 16 px input floors, valid roving-tab state when present, one skip link per route, unique visible action names, native controls, reduced motion, forced colors, increased contrast, and retained text status meaning.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3111 pnpm test:e2e` completed with **45 passed, 19 intentional cross-project skips, 0 failed** after the image-locator and unique-action-name contract updates.
- Core computed text/background contrast ratios are asserted at or above 4.5:1: heading 16.53:1, body 5.58:1, dark instrument 16.69:1, and amber action 10.18:1.
- Keyboard traversal remains explicit: route skip links move focus to the route main target; the home-to-Force & motion World journey uses the unique accessible action name.

Visual artifacts are retained outside the repository at:

- `/Users/Priyansh/.codex/visualizations/2026/07/21/019f8705-865e-7631-a921-ee4b5690b778/forge-packet-a-production-desktop.png`
- `/Users/Priyansh/.codex/visualizations/2026/07/21/019f8705-865e-7631-a921-ee4b5690b778/forge-packet-a-production-320.png`
- `/Users/Priyansh/.codex/visualizations/2026/07/21/019f8705-865e-7631-a921-ee4b5690b778/forge-packet-a-production-studio.png`
- `/Users/Priyansh/.codex/visualizations/2026/07/21/019f8705-865e-7631-a921-ee4b5690b778/forge-packet-a-production-primary-source.png`

## Old `e73dc9d` disposition, file by file

| Old file | Packet A disposition |
| --- | --- |
| `app/forge-system.css` | Selectively reconciled into the current-base shared token layer. Current route structure and World-specific reducer styling remain outside this layer. |
| `app/layout.tsx` | Selectively reconciled: deterministic global system-layer ordering and smooth-scroll marker only. Existing request-nonce handling stays unchanged. |
| `docs/FORGE_VISUAL_SYSTEM_FIDELITY_LEDGER.md` | Not ported verbatim because it describes an old base. This current-base report replaces its worker evidence without touching `docs/program/**`. |
| `src/components/forge/ForgeHome.tsx` | Selectively reconciled with shared kicker/status/heading/trust-line presentation and unique action names. Planner state, routes, age-mode behavior, and evidence copy are untouched. |
| `src/components/forge/ForgePrimitives.tsx` | Ported as reusable presentation-only primitives. No state, policy, or evidence authority is introduced. |
| `src/components/forge/ForgeShell.tsx` | Selectively reconciled with the shared paper mark and trust line; existing navigation destinations and World shell semantics are preserved. |
| `tests/e2e/forge-design-system.spec.ts` | Superseded by the narrower current-base `forge-experience-system.spec.ts`, which covers all required routes and explicit 320 px/access modes. |

## Governance and cross-lane dispositions

- The implementation remains based on `2e6dc1e`. Later `origin/main` updates `1a57832` and `2789a66` are documentation/authority only; per principal direction this slice is not rebased. `AGENTS.md`, `COMPLETION_MATRIX.md`, and `ARCHITECTURE_DECISIONS.md` were read from their current `origin/main` versions before handoff.
- **ADR-001:** access accommodations remain separate from cognitive support. This packet adds focus, mobile, forced-colors, and motion affordances only; it neither labels accessibility as help nor changes proof/support/evidence data.
- **ADR-005:** device age preference and grown-up-present semantics are unchanged. This packet does not weaken, hide, bypass, or relabel a route gate, and does not imply authority from local controls.
- Completion-matrix stop-ship 6 is addressed for this candidate by the named primary-source image locator and a complete rerun. The accessible Exit-world icon remains exposed; it was not hidden to satisfy a global image-count assertion.
- `AGE-01`, `AGE-02`, evidence-vocabulary D-01, and the other release stop-ships remain principal/cross-lane work. Packet A does not claim them solved, strengthen device-local evidence, or authorize deployment.
- Ownership deviations are limited to `tests/e2e/forge-expansion.spec.ts` (principal-directed figure/named source-image locator) and `tests/e2e/forge.spec.ts` (its keyboard target now uses the intentional unique accessible name). Neither changes product behavior.

## Residual risks and intentional cuts

Safari and Firefox rendered checks, screen-reader sessions, and representative learner/access research remain unrun. The reference's future map, people layer, cloud counters, and proof-scheduling surfaces remain intentionally absent rather than simulated. This is a current-base presentation/access slice, not proof of educational validity, production readiness, or a deployed release.
