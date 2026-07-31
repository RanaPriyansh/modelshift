# ADR-022: University transient semester overview

**Status:** accepted for removable internal workflow research only

**Date:** 2026-07-31

**Decision owner:** principal product and architecture task under explicit user
implementation authority

**Claim ceiling:** deterministic synthetic engineering and rendered-research
candidate only; no live student, institutional truth, identity, persistence,
recommendation, accessibility-conformance, learning, efficacy, or production
authority

## Context

The university product test is deliberately asymmetric:

> one course deep, all current courses shallow

ADR-015 composes copied sources, Today, Recovery, and Protected Study for one
exact course. ADR-013 already projects Recovery across one caller-declared
synthetic term containing up to eight courses. Neither contract answers whether
an adult student can inspect the bounded state of every current course without
mistaking source order, course order, capacity, or one available activity for a
global priority.

Putting several independently authored one-course fixtures beside one another
would imply a shared term that their inputs do not establish. Reimplementing
the semester-loop precedence for a multi-course view would create a second
authority. Summing course-local Today windows would also double-count
learner-declared capacity and create a false feasibility claim.

Live course data, authenticated adult identity, tenant enforcement, durable
continuity, event ownership, rights operations, provider operation, and public
route replacement remain unauthorized. `UV1-GATE-001`, `UV1-GATE-002`, and
`UV1-GATE-003` remain open.

## Decision

Add a removable `src/forge/university-semester-overview/**` projector and
development-only `/internal/university-semester-overview` research surface.

The projector accepts only:

1. one raw term-wide `UniversityRecoveryRequestV1`; and
2. one to eight strict entries containing a raw `UniversityTodayRequestV1` and
   supplied World package.

Before child parsing or traversal, the server boundary copies one bounded
plain-JSON graph and rejects proxies, accessors, symbols, exotic prototypes,
sparse or extended arrays, cycles, repeated object aliases, pollution keys,
unsafe numbers, and excessive aggregate depth, nodes, keys, or array length.
This is an in-memory server boundary, not a request-body boundary. Any future
request exposure still requires a serialized byte ceiling before JSON parsing.

The projector then:

- parses and projects one separately exposed term Recovery axis;
- derives course identity only from validated Today scopes;
- requires one exact owner, tenant, term, `asOf`, term label, and time zone;
- requires exact set and label equality between Recovery courses and overview
  courses;
- requires the matching Recovery and Today course to use canonically identical
  source-reconciliation input;
- invokes the canonical semester-loop projector once per course with the exact
  same full Recovery request and supplied World package, allowing each child
  to perform its required canonical Recovery recomputation;
- treats any invalid child as an invalid overview;
- preserves the direct child Today and semester-loop statuses and digests
  instead of reimplementing their precedence;
- sorts the returned course summaries by course ID under the explicit order
  basis `course_id_not_priority`; and
- returns only `invalid` or `ready_for_inspection` at the top level.

`ready_for_inspection` means that the synthetic envelope is structurally
inspectable. It does not mean that the semester, recovery plan, any course,
activity, learner, or capability is ready.

## Separate term and course axes

The term-wide Recovery status and per-course semester-loop status remain
separate:

```text
one exact raw term envelope
  -> project one separately exposed term Recovery axis
  -> for every validated course, in course-ID order
       -> direct canonical semester-loop projection, including its own
          Recovery recomputation over the exact full request
       -> preserve Today status
       -> preserve semester-loop status
  -> ready_for_inspection
```

The overview may show that term Recovery is blocked while preserving the exact
Today status returned inside each canonical course projection. It may not
convert those axes into one risk, readiness, workload, urgency, progress, or
priority value.

The course status vocabulary remains the existing semester-loop vocabulary:

- `source_review_required`;
- `recovery_required`;
- `learner_choice_required`;
- `protected_study_ready`;
- `world_review_required`;
- `path_complete`; and
- `path_blocked`.

The term Recovery status remains:

- `source_review_required`;
- `draft_ready`;
- `learner_choice_required`; or
- `human_help_required`.

No flattened whole-semester job is created.

## Capacity and order boundary

Course-local Today windows may overlap or reuse the same learner-fixture
minutes. The overview therefore:

- never sums course-local capacity;
- never calls multiple inspectable courses collectively feasible;
- never ranks, highlights, or preselects a course;
- never emits a global next action or global call to action;
- never interprets course-ID order as urgency, workload, or recommendation;
  and
- leaves term-wide capacity semantics exclusively with the canonical Recovery
  projection.

## Fixed rendered experiment

The server authors four closed synthetic scenarios:

1. **Mixed term:** four courses preserve distinct ready, learner-choice,
   recovery, and path-complete boundaries while term Recovery remains a draft;
2. **Term source review:** one copied-source conflict stops term Recovery and
   remains visibly distinct from each course's Today status;
3. **Capacity choice:** the exact term Recovery child requires learner choice
   without selecting a course or changing course states; and
4. **World changed:** one exact World binding changes while no substitute
   activity is selected.

The browser receives presentation-only summaries. It receives no raw Today or
Recovery request, World package, source revision/candidate/decision, path
identity, child projection, child digest, projector, command, or global action.
Scenario selection changes only a refresh-clear React view.

The visual target is
`docs/design/university-semester-overview-concept.png`. It extends the existing
Vanishing Instrument system with one continuous ruled course ledger rather
than a dashboard card grid.

## Authority ceiling

- the course set, owner, tenant, term, time, capacity, effort, source, path,
  World, and learner declarations remain synthetic fixture inputs;
- the fixture input is caller asserted, but that provenance does not establish
  identity scope; identity scope, tenant isolation, and rights enforcement are
  all unverified or not established;
- copied source facts are not institutional truth or a complete university
  record;
- course-ID order is not a ranking or recommendation;
- the term Recovery state is not a feasibility guarantee;
- no course is selected, assigned, activated, scheduled, or started;
- no source decision, capacity choice, recovery trade-off, World review, path
  mutation, session, result, repair, return, evidence, message, event,
  persistence, provider call, or external effect occurs; and
- no demand, accessibility-conformance, institutional, learning, retention,
  efficacy, deployment, or production claim follows.

## Route and artifact boundary

The route is available only in development with the exact server-owned token:

```text
FORGE_UNIVERSITY_SEMESTER_OVERVIEW_FIXTURE=forge-university-semester-overview.v1
```

Production imports and renders only a generic unavailable shell. The token,
schema identities, fixture markers, scenario copy, and complete
development-surface lexical set are forbidden in public static assets.

## Alternatives rejected

### Extend ADR-015 in place

Rejected. ADR-015 owns one exact course and one bounded next-job composition.
The all-course inspection has a different input cardinality, research question,
and no-global-action boundary.

### Recompute course states independently

Rejected. The overview delegates each course to the canonical semester-loop
projector and preserves its result. A parallel status precedence would create
another authority and could hide term Recovery constraints.

### Build a priority dashboard

Rejected. Scores, urgency ordering, top-priority labels, progress percentages,
and algorithmic recommendations collapse separate source, capacity, path, and
World authorities.

### Aggregate Today capacity

Rejected. Several course-local windows may describe the same learner time.
Summing them would double count capacity and imply term feasibility.

### Add live course upload, LMS sync, or durable semester memory

Rejected until adult entitlement, real-data approval, owner-scoped storage,
tenant isolation, transaction and conflict semantics, export/deletion,
incident response, backup/restore, and a new release decision exist.

### Connect the post-attempt receipt to this overview

Rejected. ADR-021's process-local receipt does not bind course, learner, path,
or session continuity. Visual adjacency cannot create that authority.

## Consequences and supersession

The research surface can test whether an adult student understands an
all-current-courses shallow inspection without reading it as a ranked
dashboard or executable plan. It cannot validate demand or justify replacing
the learner home.

A live semester workspace must separately supersede this ADR and establish
adult identity, complete course-set authority, owner-scoped storage, tenant
isolation, edit/undo and conflict semantics, legal event ownership, trusted
source and institution boundaries, learner choice, responsible-human routing,
session and evidence continuity, rights operations, accessibility evidence,
incident operations, rollback, and a separate release decision.
