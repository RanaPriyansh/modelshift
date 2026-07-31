# University semester overview fidelity ledger

**Record class:** unsigned local engineering evidence

**Recorded:** 2026-07-31

**Target implementation:** `4e1b4a37facfc57c901518cb8076d5aa131efcdf`

**Target tree:** `17e75a4e2e62edbd4550d9613073dda7b026211e`

**Route:** `/internal/university-semester-overview`

**Exact development token:**
`FORGE_UNIVERSITY_SEMESTER_OVERVIEW_FIXTURE=forge-university-semester-overview.v1`

**Design basis:** the existing FORGE paper/ink/cyan/amber system, editorial
type hierarchy, mono evidence labels, native controls, bounded reading width,
visible authority ceiling, and the declared
“one-course-deep, all-current-courses-shallow” university research shape. The
generated concept image was a visual target only. The implemented route is a
removable internal research surface, not a public dashboard, course picker,
planner, recommendation system, durable semester coordinator, or live learner
record.

**Claim ceiling:** this record binds an exact local source tree, deterministic
synthetic contracts, automated checks, a clean optimized build, public-bundle
scanning, independent source/test review, and connected-Chrome observations.
It is not a signed attestation, deployment receipt, live-data validation,
identity or rights proof, accessibility conformance result, participant
finding, learning result, efficacy claim, or production operation.

## Five-point fidelity ledger

| Point | Intended behavior | Bound evidence | Disposition |
| --- | --- | --- | --- |
| 1. Product grounding | Let a university student inspect the term and every current course without turning the overview into a generic AI dashboard, ranking surface, course selector, or global task list. | The route reuses `ForgeShell`, the existing visual tokens, native radios and reset, one live region, four closed server-authored states, and the existing evidence and authority vocabulary. It exposes zero course links or course actions. | Bound in source, component tests, and connected Chrome |
| 2. Separate axes | Preserve one term Recovery axis and one canonical Today/semester-loop result per course. | The server projects the separately exposed term Recovery result and requires each direct semester-loop child to recompute the same exact full Recovery request. The UI labels `Term Recovery`, `Today`, and `Semester loop` separately. | Bound in domain tests, fixture integration tests, and rendered DOM |
| 3. Inspectability without readiness | Make a structurally inspectable aggregate weaker than feasibility, readiness, progress, or “on track.” | The only successful top status is `ready_for_inspection`. Copy and authority explicitly deny term feasibility, course selection, global action, recommendation, scheduling, session, provider, persistence, evidence, message, event, and external-effect authority. | Bound in contracts, UI tests, and connected Chrome |
| 4. Determinism without priority | Show every current course in stable order without selecting, scoring, or ranking one. | Course summaries sort only by server-side course ID under literal authority `course_id_not_priority`; IDs do not cross the client boundary. Input permutation preserves the frozen projection and digest. No capacity sum, priority, risk, readiness score, progress percentage, selected course, global action, or CTA exists. | Bound in domain and client-boundary tests |
| 5. Internal-only truth | Keep synthetic scenario inspection removable, refresh-clear, and production unavailable. | An exact development token gates the fixture. Production imports only the unavailable shell. Scanner tests cover route markers and aggregate split chunks. The clean production build rendered only the unavailable state even with the development token configured. | Bound in gate/scanner tests, build receipt, and connected-Chrome denial |

## Closed scenario matrix

| Scenario | Top result | Term Recovery | Course behavior |
| --- | --- | --- | --- |
| Mixed term | `ready_for_inspection` | `draft_ready` | Four canonical course rows preserve their distinct Today and semester-loop states |
| Source review | `ready_for_inspection` | `blocked` | Source reconciliation remains visible as a course-local boundary; no replacement advice is invented |
| Capacity choice | `ready_for_inspection` | `choice_required` | Term-owned capacity choice stays separate from course rows; no course is selected |
| World changed | `ready_for_inspection` | `draft_ready` | One canonical child reports its World-change boundary without upgrading the term or other courses |

`ready_for_inspection` means only that the closed synthetic aggregate passed
the exact structural contract. It does not mean the term, Recovery draft,
course, activity, learner, capability, schedule, or workload is ready,
feasible, complete, safe, or on track.

## Server and client boundary

The aggregate boundary:

- accepts one raw Recovery request and one to eight raw Today/World entries;
- checks the outer value for a Proxy before reflection;
- copies the complete graph through a bounded descriptor-safe detacher;
- rejects accessors, symbols, exotic prototypes, sparse or extended arrays,
  cycles, repeated aliases, pollution keys, unsafe numbers, excess depth,
  excess nodes, excess keys, and excess array length;
- requires exact owner, tenant, term, `asOf`, term label, time zone, course set,
  course label, and source-reconciliation request binding;
- delegates each course to the canonical semester-loop projector and
  invalidates the whole overview if any child is invalid;
- sorts only by course ID, then deep-freezes the deterministic projection.

The browser receives four deeply frozen presentation records containing
bounded labels, statuses, and explanations. It does not receive raw requests,
course IDs, World packages, source revisions, candidates, decisions, learning
path identity, child projections or digests, projectors, commands, or effect
authority.

Visible authority states that identity is caller-asserted synthetic input and
that tenant, rights, and institutional authority are not established. Every
consequential capability is false.

## Requirement-to-evidence traceability

Test aliases:

- `D`:
  `src/forge/university-semester-overview/university-semester-overview.test.ts`
- `F`:
  `src/components/forge/university/UniversitySemesterOverviewFixture.test.ts`
- `C`:
  `src/components/forge/university/UniversitySemesterOverviewWorkspace.test.tsx`
- `G`:
  `src/components/forge/university/UniversitySemesterOverviewGate.test.ts`
- `A`:
  `src/components/forge/university/university-semester-overview-public-artifact-boundary.test.ts`
- `E`: `tests/e2e/university-semester-overview.spec.ts`
- `P`: `tests/e2e/university-semester-overview-production.spec.ts`

| Requirement | Exact implementation and automated evidence | Current disposition and open gate |
| --- | --- | --- |
| `UV1-OVERVIEW-001..002` | Strict raw aggregate input and one bounded outer detacher; hostile outer/nested Proxy, revoked Proxy, accessor, symbol, prototype, alias, cycle, pollution, sparse/extended array, unsafe-number, and budget tests in `D`. | Mechanically met for the in-process fixture. A future remote request boundary still needs serialized-byte and pre-materialization controls. |
| `UV1-OVERVIEW-003..005` | Exact term envelope, course-set/label/source binding, one separately exposed Recovery axis, and exact canonical child parity in `D` and `F`. | Met for the closed synthetic graph. Authenticated learner/course/session continuity and durable source authority remain absent. |
| `UV1-OVERVIEW-006..009` | Separate top, term, Today, and semester-loop states; `ready_for_inspection` copy; no aggregate capacity or ranking; permutation-stable course-ID ordering in `D`, `F`, and `C`. | Structurally met. Participant comprehension, scan accuracy, and order calibration remain open. |
| `UV1-OVERVIEW-010..011` | Presentation-only fixture excludes raw IDs, requests, Worlds, sources, path identity, child digests, commands, and all consequential authority in `F` and `C`. | Closed client projection only. Identity, tenancy, rights, persistence, correction/export/deletion, and incident operations remain open. |
| `UV1-OVERVIEW-012` | Exact descriptor-safe development gate, production-only unavailable import path, overview-specific marker scans, aggregate split-chunk scan, and incomplete-set negative control in `G` and `A`. | Exact clean build and local production denial pass. No deployment or provider-bound provenance follows. |
| `UV1-OVERVIEW-013` | Fixed four-state UX protocol, native controls, one polite live region, reset continuity, no course links/actions, explicit authority, and desktop/exact-320 checks in `C` and connected Chrome; `E` and `P` define browser regressions. | Connected-Chrome desktop and exact-320 evidence is bound. Playwright, real reduced-motion/forced-colors, zoom, manual assistive technology, and participant evidence were not executed. |

## Exact local verification

Target implementation checks:

- full primary Vitest: **150 files, 1,364 tests passed**;
- offline evaluator Vitest: **2 files, 13 tests passed**;
- total automated tests: **1,377 passed**;
- focused semester-overview Vitest: **5 files, 28 tests passed**;
- full ESLint with zero warnings: passed;
- TypeScript: passed;
- `git diff --check`: passed;
- independent contract review: approved after all five findings were repaired;
- independent security review: approved after storage-baseline, authority, and
  client-minimization findings were repaired;
- independent UI review: approved after semantic term labelling, canonical
  fixture coverage, and interaction-regression findings were repaired.

The production-mode E2E specifications were defined but not run. The user's
selected browser was connected Chrome, so no standalone Playwright runner or
separate browser surface was used.

## Exact clean optimized build

| Receipt field | Exact local value |
| --- | --- |
| Source commit | `4e1b4a37facfc57c901518cb8076d5aa131efcdf` |
| Source tree | `17e75a4e2e62edbd4550d9613073dda7b026211e` |
| Source state | `clean` |
| Build ID | `forge-source-v1-4e1b4a37facfc57c901518cb8076d5aa131efcdf` |
| Artifact files | `1,430` |
| Artifact digest | `sha256:7bc62880842be1b0570118c8a2d2b076e28d331ed59b01531cc1dcf0cef6b980` |
| Public static assets scanned | `73` |
| Public asset digest | `sha256:bfe00c24b2e565e62616915a24e3e5d04aad2398db7cc5dcb68f969e078562b1` |
| Public directory | `5` files, `sha256:e0096e369f47666ca5a3f962b71b6f5199a17117ac5ce4a598d1b77dc42abac9` |
| Runtime configuration | `4` files, `sha256:3df34ab6c70b513a475294670ed1da32b3ba0c4ea2d605d77101dc185cf52d9a` |
| Runtime cache policy | `fresh_ephemeral_next_cache_v1` |

These are unsigned local receipts. They do not establish pushed-source
identity, provider-bound provenance, immutable deployment, rollback
readiness, monitoring, or production operation.

## Connected Chrome observations

The target implementation was served with its exact development token in the
user-selected connected Chrome.

- the desktop DOM exposed four native radios, one polite status region, four
  course rows, zero links inside the overview article, and one Reset button;
- Arrow Right preserved checked-state/focus parity across source-review,
  capacity-choice, and World-changed states;
- each scenario changed the status text while keeping the term and course axes
  separate;
- Reset restored the mixed-term state and focused first radio;
- selection and reset preserved storage as empty objects, and refresh restored
  the server default;
- the browser received no raw `courseId` or SHA-256 marker;
- `Term Recovery`, identity status, tenant/rights/institutional status, and all
  denied consequential capabilities were visible;
- at an exact **320 × 900 CSS pixel** viewport, document overflow was zero,
  all four radio rows were 44 CSS pixels high, the term labels remained
  semantic, and the truth footer stayed reachable;
- viewport control was returned to the normal desktop size after the mobile
  check;
- the generated concept and implementation were emitted together for visual
  comparison; the implementation preserved the visual target while using the
  canonical product statuses and fuller authority footer.

The final offscreen-reset implementation explicitly focuses with
`preventScroll`, then uses an instant nearest scroll to keep the focused radio
visible. Unit tests bind that exact branch and the E2E specification defines
the viewport assertion. Connected Chrome confirmed ordinary reset
focus/visibility after the repair, but its wrapper could not exercise the true
offscreen branch without auto-scrolling first. That exact browser branch
remains unexecuted.

Development Chrome reported one hydration mismatch naming the installed Dark
Reader attribute `data-darkreader-proxy-injected`. This is browser-extension
interference before React hydration. It prevents a clean-console claim, though
the DOM, interaction, storage, and layout observations remained available.

The exact clean production build was started locally with the development
token still configured. Connected Chrome rendered only:

`Semester overview is unavailable.`

The main region contained one explicit alert, zero radios, zero buttons, zero
links, none of the development hero/course/Term Recovery copy, and a generic
server-owned-fixture explanation. The log buffer contained no entry scoped to
the production server origin. Older development-origin Dark Reader and HMR
entries remained in the same tab buffer and are excluded from production
console evidence.

This is local production-mode denial evidence, not deployment or live
production evidence.

## Evidence still required

Before any accessibility, demand, learning, live-product, or production claim:

1. run actual reduced-motion and forced-colors preferences, browser zoom, and
   manual screen-reader/assistive-technology review with an authorized
   reviewer;
2. execute the approved adult observation protocol before making scan
   accuracy, comprehension, autonomy, emotional-safety, substitution, or
   demand conclusions;
3. establish authenticated adult identity, tenant and institutional rights,
   exact learner/session/course/term continuity, retention,
   correction/export/deletion, incident, and appeal operations;
4. replace synthetic source, path, World, Today, and Recovery inputs only
   behind explicit live-data and provider authority, deletion and export
   controls, and bounded failure/retry behavior;
5. validate cross-route continuity without making the overview a competing
   planner or hidden prioritization surface;
6. run the defined browser specifications in an authorized browser lane and
   retain exact reset, reduced-motion, forced-colors, and production-denial
   evidence;
7. require pushed-source identity, provider-bound immutable build, deployment
   verification, monitoring, rollback authority, and release approval before
   changing the production claim.

The concept image and local browser observations remain design inputs and
engineering evidence only. They are not participant, accessibility, learning,
or production evidence.
