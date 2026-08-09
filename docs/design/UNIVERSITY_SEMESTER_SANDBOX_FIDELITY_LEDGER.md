# University semester sandbox fidelity ledger

**Target implementation:** `9511ec5bd1ef381a98385245ee752f74941606b5`

**Target tree:** `27db9b670964f9c1feac33a8916681361bc80727`

**Design basis:** the existing FORGE shell, typography, paper/ink/cyan/violet
tokens, mono evidence labels, 1,280 CSS pixel reading surface, semester
boundary vocabulary, and visible authority ceiling. This is a connected
source-review-to-next-job treatment inside the existing internal research
route, not a new visual brand or a public product route.

**Fidelity ceiling:** source, contract, build, DOM, keyboard, and viewport
measurements are bound below. Exact screenshot comparison is not complete
because the connected Chrome screenshot endpoint was unavailable and macOS
Screen Recording permission was unavailable. No visual-parity, accessibility
conformance, participant-comprehension, production, or efficacy claim follows.

## Five-point fidelity ledger

| Point | Intended behavior | Bound evidence | Disposition |
| --- | --- | --- | --- |
| 1. Product grounding | Extend the existing FORGE editorial system without adding a dashboard, chat shell, new palette, ornamental asset, or hidden score. | The surface reuses the author shell, existing typography and tokens, mono labels, native controls, bounded reading width, and existing source/Today/Recovery/Protected Study vocabulary. No image, icon, illustration, chart, score, rank, risk, streak, or recommendation component was added. | Bound in source; screenshot comparison open |
| 2. Information hierarchy | Show the copied fact and fixed sample alternative before asking for a decision, then make one complete-loop consequence dominant. | DOM order is hero, copied source evidence, fixed correction, four closed decisions, consequence, four-stage boundary, then authority ceiling. At desktop the source began at 831.9 CSS pixels and the choices at 1,149.5; at 320 CSS pixels they began at 849.3 and 1,434.8 respectively. | Bound in connected Chrome |
| 3. Core interaction | Preserve native radio behavior, make every scenario refresh-clear, and expose no arbitrary decision, network call, save, navigation, session, or evidence effect. | Four native radios retained checked state and focus together. Arrow Right moved `pending` → `accept` → `fixed_correct`; Arrow Left returned to `accept`. The result changed atomically without taking focus or scrolling to the result. Reset returned checked state and focus to `pending`. Component tests verify no fetch, storage, clipboard, history, or link effect. | Bound in tests and connected Chrome |
| 4. Responsive and access burden | Keep evidence before choice, avoid horizontal scrolling, maintain at least 44 CSS pixel controls, and require no animation. | At 320 by 900, document and body widths remained 320, the 288 CSS pixel article had no overflowing descendant, radios measured 77.4–93.9 CSS pixels high, and Reset measured 48. At 2,000 CSS pixels the surface remained centered at 1,280 wide. No current-page navigation was asserted. The loaded CSSOM included the sandbox reduced-motion rule and no animation was running; the active Chrome preference was not reduced motion. | Browser-bound for desktop, 320, keyboard, overflow, and CSS rule presence; preference emulation, forced colors, and manual AT open |
| 5. Truth and evidence | Treat acceptance as transcription confirmation only; distinguish a server-authored sample correction from learner entry; refuse rejection when Recovery loses its deadline; keep authority limits more visible than product confidence. | The initial copy says the source is invented and not proven official, complete, or suitable for a real plan. The fixed alternative is labelled server-authored and not entered by the browser user. Reject exposes no action and requires a replacement source. The footer repeats no authenticity, persistence, external effect, or product claim. The client receives only status, loop status, action title/objective, and digest. | Bound in source, contracts, tests, and browser DOM |

## Exact interaction matrix

| Closed selection | Sandbox status | Complete-loop status | Visible consequence |
| --- | --- | --- | --- |
| `pending` | `review_required` | `source_review_required` | Copied deadline stays outside Today; no action is shown |
| `accept` | `ready` | `protected_study_ready` | Existing accepted-path action is shown as the next bounded job |
| `fixed_correct` | `ready` | `protected_study_ready` | Fixed server-authored sample deadline is used; action title/objective remain unchanged |
| `reject` | `invalid` | no usable loop | Replacement source is required; no action is shown |

The browser receives these four server-precomputed presentation records. It
does not receive a raw semester request, reconciliation request, source
decision, candidate ID, decision ID, or command/effect authority.

## Exact local verification

- Full primary suite: 139 files, 1,275 tests.
- Offline evaluator suite: 2 files, 13 tests.
- Full lint and TypeScript checks: pass.
- Independent UI and security re-audits: no remaining code blocker.
- Exact clean production build:
  `forge-source-v1-9511ec5bd1ef381a98385245ee752f74941606b5`.
- Build artifact: 1,404 files,
  `sha256:159dccffaea0595a090bd48f1cbc4b816a54c5cb8fe5dbbce9c7d7b5c47579bc`.
- Public static assets: 73 files scanned,
  `sha256:6790478b210586ef2d098840602bec5b619dc37aa4d5557aa211efb77d3bed11`.
- Public directory:
  `sha256:e0096e369f47666ca5a3f962b71b6f5199a17117ac5ce4a598d1b77dc42abac9`.
- Runtime configuration:
  `sha256:35da4780b5e8b1f6393025c02b18ba8d8e153155c72a8f4f47877e813891e500`.
- A production server started with
  `FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE=forge-university-semester-sandbox.v1`
  rendered only the unavailable shell at desktop and 320 CSS pixels. It
  contained zero radios, no sandbox title/correction copy or fixture marker,
  no horizontal overflow, and no production-scoped console error.
- Development Chrome logged only the known Dark Reader extension hydration
  attribute mismatch. The mismatch named
  `data-darkreader-proxy-injected`; no application-owned console error was
  observed.

These are local engineering results. The build receipt is unsigned, the
development browser run is not an immutable runtime capture, and no deployment
or live-provider receipt follows.

## Evidence still required

Before any fidelity, accessibility, demand, learning, or production claim:

1. capture the implementation at matched desktop and 320 CSS pixel viewports
   once the connected browser can return screenshots;
2. compare the source/reference and implementation in one same-viewport input,
   then inspect hierarchy, type, spacing, borders, focus, and cropping;
3. run actual reduced-motion and forced-colors preferences;
4. complete keyboard and manual screen-reader/assistive-technology review with
   an authorized reviewer;
5. run the approved adult observation protocol before making a
   comprehension, autonomy, or demand decision;
6. keep identity, tenant isolation, durable storage, real course data,
   provider operation, participant operation, deployment, and efficacy gates
   explicitly open.

The generated concept image and earlier surface screenshots remain design
inputs only. They are not evidence for this implementation.
