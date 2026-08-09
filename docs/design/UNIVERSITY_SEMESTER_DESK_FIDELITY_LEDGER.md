# University Semester Desk fidelity ledger

**Evidence date:** 31 July 2026

**Implementation subject:** `17de8a29972111ea62fae88e55f7c430227e10ff`

**Implementation tree:** `5e21b01e57f5d9d4ff62f2e7fb36dba91ca8d828`

**Claim ceiling:** deterministic synthetic engineering and rendered-research
candidate only. This ledger is not deployment, production operation, live
student or university data, verified identity or tenancy, participant
research, assistive-technology evidence, accessibility conformance, learning,
retention, efficacy, or release acceptance.

## What this slice establishes

The removable development-only Semester Desk composes the accepted product
shape:

> all current courses shallow, one learner-chosen course deep

It preserves one exact term boundary, four canonical course summaries, and one
canonical semester-loop result per exact course. Initial render contains no
inspected course. A learner may expose one already-authored bounded explanation
and clear it again; this selects no course work, priority, recommendation,
schedule, session, provider call, evidence, message, event, persistence, or
external effect.

The implementation is governed by:

- `docs/adr/0023-university-transient-semester-desk.md`;
- `docs/program/UNIVERSITY_V1_REQUIREMENTS.md`,
  `UV1-DESK-001..014`; and
- `docs/program/UNIVERSITY_SEMESTER_DESK_UX_EXPERIMENT.md`.

## Visual fidelity evidence

| Artifact | Purpose |
| --- | --- |
| `docs/design/university-semester-desk-concept.png` | 1568 by 1003 visual target generated before final implementation refinement |
| `docs/design/university-semester-desk-implementation-browser-raw.jpg` | Untouched 1568 by 1003 connected-Chrome viewport capture |
| `docs/design/university-semester-desk-implementation-full-browser-raw.jpg` | Untouched connected-Chrome full-page capture |
| `docs/design/university-semester-desk-implementation.png` | Review derivative with only the blank 72 by 75 bottom-left margin containing the fixed Next.js development badge replaced by the sampled paper color |
| `docs/design/university-semester-desk-implementation-full.png` | Full-page derivative with the same development-badge-only replacement |
| `docs/design/university-semester-desk-comparison.png` | Target and implementation placed in one 3156 by 1003 comparison input |
| `docs/design/university-semester-desk-production-denial.jpg` | Untouched production capture with the development token present and only the unavailable shell rendered |

The target and implementation were judged together at the same viewport and
selected-course state. The implementation preserves the target's continuous
ruled term-to-course-to-job hierarchy, warm paper, near-black ink, deep cyan,
text-paired amber boundaries, editorial display type, monospace labels, and
equal course inspection affordances. It does not add dashboard cards, chat,
scores, progress rings, ranking, a global call to action, or decorative
illustration.

The clean comparison is not the raw browser record. Raw captures remain beside
it. No application rule hides the Next.js badge.

## Canonical fixture and authority evidence

- Four closed scenarios each recompute one canonical semester overview, direct
  term Recovery, and four direct canonical semester loops.
- Every course must match the overview-retained Today status and digest plus
  semester-loop status and digest.
- Every scenario must match the baseline owner, tenant, term, `asOf`, term
  label, time zone, and ordered `(courseId, courseLabel)` pairs before its
  private server envelope is stripped.
- The browser fixture contains opaque option IDs and presentation copy only.
  Serialized tests exclude raw Today/Recovery requests, World packages,
  course IDs, source/path identities, projection digests, projectors, and
  commands.
- The returned presentation graph is recursively frozen.
- The fixture gate accepts only the exact own data-property token. Inherited
  values, accessors, casing/whitespace drift, and proxies fail closed without
  invoking hostile getter or descriptor traps.
- Visible authority rows state that identity is caller-asserted and unverified;
  tenant isolation, rights enforcement, and institutional completeness are not
  established; only refresh-clear synthetic inspection is allowed; every
  consequential authority is not allowed.

## Automated verification

### Complete source suite

`pnpm test` passed after the final accessibility repairs:

- application suite: 154 files, 1,385 tests;
- evaluator suite: 2 files, 13 tests; and
- combined: 156 files, 1,398 tests.

`pnpm lint`, `pnpm typecheck`, and `git diff --check` also passed.

The Semester Desk focused suite passed 4 files and 21 tests. It covers fixture
derivation and leak boundaries, cross-scenario envelope drift, hostile gate
inputs, initial and selected UI state, clear/focus recovery, scenario reset,
one live region, semantic stage boundaries, production-public-asset scanning,
and scanner failure behavior.

### Production build

`pnpm build` ran from a clean implementation commit:

```text
source commit
17de8a29972111ea62fae88e55f7c430227e10ff

source tree
5e21b01e57f5d9d4ff62f2e7fb36dba91ca8d828

generated routes
64

public static assets scanned
74

public asset digest
e86e3b44f7ba7526dc321acf954cdd9a3cca3745d3d07e11eca51ceda515ca83

build file count
1446

build artifact digest
sha256:27d1758856bda74a46751b8d6037fe87f5ca7af741eceb9bf812ab26f8d4d714
```

The integrated public-boundary scanner found no exact fixture token, schema
identity, opaque server-only option marker, or complete Semester Desk surface
lexical set in public static assets.

## Connected Chrome evidence

Chrome was used for rendered QA; no standalone Playwright browser run was used.

### Desktop development surface, 1568 by 1003

- one page H1 and exactly one polite status region;
- four scenario radios with Mixed term selected;
- four course radios with none selected initially;
- zero links inside the student article and no global action;
- zero horizontal overflow;
- all four course choices revealed the exact expected current job;
- scenario change cleared the inspected course;
- native scenario and course arrow-key behavior preserved focus and checked
  state;
- clear removed the chapter, restored focus to the previous course input, and
  revealed it only when it was outside the viewport; and
- refresh restored Mixed term with no inspected course.

### Exact 320 by 900 development surface

- body and document scroll widths equalled the 320 CSS pixel client width;
- no mobile navigation or horizontal overflow appeared;
- all four scenario labels and all four course controls met the 44 CSS pixel
  minimum target;
- after the final review repair, all 16 visible row labels had non-zero
  geometry; the sampled labels were static block boxes 214 CSS pixels wide and
  14 CSS pixels high;
- “Today” and “Semester loop” remained visibly paired with every course value;
- the five-stage static sequence exposed one labelled region and zero
  navigation landmarks;
- course selection and clear retained checked/focus semantics; and
- clear returned the chosen course input to the viewport.

### Exact production denial

The exact production build was started on an isolated local port with
`FORGE_UNIVERSITY_SEMESTER_DESK_FIXTURE=forge-university-semester-desk.v1`
deliberately present.

Inside `main`, connected Chrome observed:

- one H1 named “Semester desk is unavailable.”;
- zero radios, buttons, or links;
- zero development hero, course-order marker, or CS102 course label;
- zero horizontal overflow; and
- the explicit no-exposure statement.

This is local production-build denial evidence, not deployment or production
operation.

## Independent review record

Three independent read-only reviews were run after integration:

1. fixture/contracts/security: approved after exact cross-scenario envelope
   parity and negative drift coverage were added;
2. UI/accessibility/visual: approved after responsive row labels were restored
   and the inert stage sequence stopped claiming a navigation landmark; and
3. route/scanner/docs/E2E: no remaining finding after the generated
   `next-env.d.ts` development import was restored to the tracked production
   route-type import.

## Residual gates and non-claims

- The connected Chrome capability did not expose reduced-motion or
  forced-colors emulation. CSS and E2E assertions exist, but neither mode was
  rendered in this evidence run.
- No manual screen-reader, switch-control, zoom/reflow beyond the stated
  viewport checks, or assistive-technology pass was performed.
- The user's Dark Reader extension injected attributes before hydration during
  development and produced the known React mismatch warning. The raw captures
  preserve the resulting development badge. No clean-console claim is made.
- The interaction-request, browser-storage, forced-colors, and reduced-motion
  Playwright specifications were source-reviewed but not executed because the
  selected browser for this design run was connected Chrome.
- No participant was contacted or observed. No demand, comprehension,
  substitution value, emotional-safety, or learning claim exists.
- No real course, LMS, university, learner account, provider, model, retrieval,
  database, telemetry, session, evidence, message, or external integration was
  used.
- No push, deployment, promotion, public route replacement, or release action
  was performed.

## Next authorized program action

This is the final planned synthetic product-shape slice. Its successful local
engineering evidence does not close `UV1-GATE-001..003`.

The next program action is one of:

1. separately approve and run the preregistered Phase -1 direct observation
   and matched-substitution protocol;
2. repair or narrow one defect grounded in that approved evidence; or
3. stop or reject the university wedge.

Absent participant/data authority means blocked research or a principal
program decision. It is not authority to add another speculative student
surface, durable persistence, live institutional data, or tutoring behavior.
