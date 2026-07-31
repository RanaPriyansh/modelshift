# ADR-023: University transient semester desk

**Status:** accepted as the final removable synthetic product-shape slice

**Date:** 2026-07-31

**Decision owner:** principal product and architecture task under explicit user
implementation authority

**Claim ceiling:** deterministic synthetic engineering and rendered-research
candidate only; no live student, institutional truth, identity, persistence,
selection, recommendation, accessibility-conformance, learning, efficacy, or
production authority

## Context

The university product test is deliberately asymmetric:

> one course deep, all current courses shallow

ADR-022 exposes the all-current-courses shallow inspection while preserving one
term Recovery boundary and one canonical semester-loop result per course.
ADR-015 inspects one exact course deeply. Rendering those fixtures on separate
routes does not establish that a learner can move from term scan to one chosen
inspection without reading row order, status color, or an available protected
study boundary as a recommendation.

The missing research question is therefore interactional, not another learning
or planning authority:

> Can an adult student scan one synthetic term, explicitly choose one course to
> inspect more closely, and clear that inspection without believing FORGE
> selected, prioritized, started, saved, or changed anything?

Live course data, authenticated adult identity, tenant enforcement, durable
continuity, event ownership, rights operations, provider operation, and public
route replacement remain unauthorized. `UV1-GATE-001`, `UV1-GATE-002`, and
`UV1-GATE-003` remain open.

## Decision

Add a removable, development-only
`/internal/university-semester-desk` research surface. Its server-authored
fixture combines:

1. one bounded semester-overview presentation for the complete synthetic term;
2. the existing exact per-course semester-loop presentation state; and
3. presentation-only journey, current-job, evidence-boundary, and announcement
   copy for each exact course.

The browser receives four closed scenarios. It receives no raw Today or
Recovery request, World package, source revision/candidate/decision, path
identity, child projection or digest, receipt, projector, command, or global
action.

The fixed scenarios remain:

1. **Mixed term:** the four courses preserve distinct ready,
   learner-choice, recovery, and path-complete boundaries;
2. **Term source review:** one copied-source conflict stops term Recovery;
3. **Capacity choice:** term Recovery requires learner choice without applying
   a trade-off; and
4. **World changed:** one exact World binding requires review without
   substitution.

The fixture is transient, deterministic, deeply frozen, presentation-only, and
server-authored. It does not accept a browser-authored course, scenario,
projection, status, priority, or command.

## Learner-directed inspection

The initial desk state has **no course selected**. No ready, first, colored, or
otherwise available course may be preselected, visually promoted, or marked
current.

Each course exposes one native radio labelled as an inspection choice. Choosing
it means only:

> show the already server-authored bounded explanation for this exact
> synthetic course in this refresh-clear view

It does not mean select for study, set priority, accept a recommendation,
activate an action, start a session, or change a path. Course order remains
course-ID order and never becomes a ranking.

After an explicit inspection choice, the desk may reveal:

- the exact course label;
- the existing five-part Sources, Today, Recovery, Protected Study, and Return
  journey boundary;
- the exact current bounded job;
- why that job follows from the already projected synthetic state; and
- what no evidence, completion, course-state, or learner-state claim follows.

The detail area exposes no start, save, submit, schedule, message, provider,
route-transfer, or evidence control. A clear control removes only the
in-memory inspection choice and returns focus to the previously chosen course
radio. Changing scenario clears any course inspection before rendering the new
closed scenario.

Scenario and course changes share exactly one polite live region. Native radio
focus and checked state remain the primary control semantics; the live region
does not duplicate the complete visible surface.

## State and effect boundary

Scenario and course choices exist only in component memory:

- initial navigation and refresh select the mixed scenario but no course;
- scenario changes clear the inspected course;
- clear removes the inspected course;
- local storage, session storage, cookies, URL, history, clipboard, database,
  event journal, evidence ledger, and external systems do not change; and
- no fetch, provider, model, retrieval, message, schedule, or navigation is
  initiated by an inspection choice.

No selection event is defined. Whether a future live learner-owned course
inspection is ephemeral UI state, durable preference, or legal event remains
an unresolved architecture decision. This slice may not answer it by
inventing storage or an event type.

## Authority ceiling

- owner, tenant, term, course set, time, capacity, source, path, World, and
  learner declarations remain synthetic fixture inputs;
- fixture provenance does not establish identity, tenancy, institutional
  completeness, rights, or course-set authority;
- copied source facts are not LMS or university truth;
- course order is not priority;
- inspection choice is learner-directed view state, not a FORGE course
  selection or recommendation;
- `ready_for_inspection` does not mean semester, course, activity, learner, or
  capability readiness;
- no course is assigned, activated, scheduled, started, completed, or graded;
- no source decision, capacity choice, recovery trade-off, World review, path
  mutation, session, result, repair, return, evidence, message, event,
  persistence, provider call, or external effect occurs; and
- no demand, accessibility-conformance, institutional, learning, retention,
  efficacy, deployment, or production claim follows.

The rendered fixture keeps these authority facts visible rather than relying
on route location or nearby disclaimer copy:

| Field | Exact fixture value |
| --- | --- |
| Projection class | `Fixture-only semester inspection desk` |
| Order basis | `Course ID, not priority` |
| Identity | `Caller-asserted synthetic input; not verified` |
| Tenant isolation | `Not established` |
| Rights enforcement | `Not established` |
| Institutional completeness | `Not established` |
| Inspection selection | `Allowed only for explicit refresh-clear synthetic inspection` |
| Course-work selection, priority, recommendation, term feasibility, scheduling, session, persistence, provider call, evidence, message, event, and external effect | `Not allowed` |

## Route and public-artifact boundary

Development requires the exact server-owned token:

```text
FORGE_UNIVERSITY_SEMESTER_DESK_FIXTURE=forge-university-semester-desk.v1
```

Production imports and renders only a generic unavailable shell. The token,
fixture schema identity, and complete development-surface lexical set are
forbidden in public static assets. A production process must remain
unavailable even if the development token is present.

The visual basis is
`docs/design/university-semester-desk-concept.png`. The implementation keeps
its continuous ruled term-to-course hierarchy, editorial type, warm paper,
near-black ink, deep cyan, and text-paired amber boundaries. The concept's
illustrated selected course is not the initial interaction state; the
implemented and tested initial state has no course selected.

## Final synthetic-slice rule

This is the final planned synthetic product-shape slice before direct
university workflow research. Passing its unit, rendered, build, and
public-boundary checks does not authorize another synthetic feature, a public
route, real data, persistence, or a pilot.

The next program action must be one of:

1. run the separately approved Phase -1 direct observation and matched
   substitution protocol;
2. repair or narrow one preregistered defect observed in that research, while
   retaining the same claim and authority ceiling; or
3. stop or reject the university wedge.

If participant/data authority is still absent, the correct next state is
blocked research or a program decision—not additional speculative product
surface construction. A new synthetic surface requires a principal amendment
that names a genuinely unanswered research question, explains why the existing
artifacts cannot answer it, and preserves `UV1-GATE-001..003`.

## Alternatives rejected

### Preselect the first or ready course

Rejected. Preselection would make course-ID order or availability look like a
recommendation before learner choice.

### Navigate to the existing one-course route

Rejected for this experiment. Route adjacency would lose the visible term
boundary and could imply cross-route continuity that no state contract
establishes.

### Add a global next action

Rejected. Separate course and term authorities do not establish one ranked
whole-semester action.

### Save the inspected course

Rejected. Durable preference, event ownership, synchronization, conflict,
export/deletion, and identity semantics are unresolved.

### Continue with more synthetic product slices

Rejected by the final-slice rule. The principal uncertainty is now direct
student comprehension and substitution value, not whether another candidate
surface can be coded.

## Consequences and supersession

The desk can test term scan, explicit inspection choice, course detail
comprehension, order calibration, learner control, and clear-state recovery in
one transient surface. It cannot validate demand, learning, accessibility
conformance, persistence, or replacement of the learner home.

A live semester desk must separately supersede this ADR and establish adult
identity, complete course-set authority, owner-scoped storage, tenant
isolation, edit/undo and conflict semantics, legal event ownership, trusted
source and institution boundaries, responsible-human routing,
session/evidence continuity, rights operations, accessibility evidence,
incident operations, backup/restore, rollback, and a separate release
decision.
