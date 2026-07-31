# ADR-015: University semester-loop fixture composition

**Status:** accepted for removable internal research only

**Date:** 2026-07-31

## Context

The university research packets now model three bounded student jobs:

1. Today selects one action only from an existing learner-accepted reviewed
   path, reviewed copied course context, and learner-fixture capacity.
2. Recovery rebuilds from explicit learner-fixture capacity and one exact
   reviewed copied deadline without ranking a backlog or sending a message.
3. Protected study verifies the accepted action against one exact released
   World package and explains its learning-integrity boundary before preview.

Each packet is safer and easier to inspect separately, but that separation does
not answer whether a student can understand how the jobs fit together across
one coherent term. Reusing the existing recovery fixture would not answer that
question either: it has a different `asOf`, deadline, and set of courses from
the Today fixture. Placing those projections beside one another would create a
false continuity story.

Durable orchestration is not authorized. Adult identity, tenant enforcement,
course authority, persistence, event ownership, learner decisions, session
state, evidence, and production operation all remain open.

## Decision

Add a removable `src/forge/university-semester-loop/**` projector and
development-only `/internal/university-semester-loop` research surface.

The composition:

- accepts raw Today and Recovery requests plus one complete World package
  rather than trusting supplied child projections;
- copies the complete request through a bounded, accessor-free plain-JSON
  boundary before validation;
- recomputes every child through its current projector;
- requires one exact synthetic adult owner, tenant, term, course, `asOf`, and
  time zone across all child requests;
- requires Recovery to reuse Today's exact reconciliation request and its one
  reviewed deadline rather than introducing a similar-looking source copy;
- constructs and recomputes Protected Study from the same raw Today request
  and exact World package;
- uses a transparent fail-closed state order rather than a score, model, or
  inferred priority;
- returns only a transient navigation explanation and the bounded child
  projections needed by the internal surface;
- creates no source review, capacity decision, recovery edit, World review,
  path state transition, session, evidence, event, persistence, recommendation,
  answer, policy interpretation, or external effect.

The internal harness fixes seven scenarios:

1. ready for the protected-study brief;
2. copied source review required;
3. declared capacity no longer fits and recovery is required;
4. a tight window requires learner choice;
5. the supplied World binding changed and needs review;
6. the accepted path action is already complete;
7. the accepted path action is blocked.

The route is available only when `NODE_ENV` is `development` and the exact
server-owned token
`FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE=forge-university-semester-loop.v1` is
present. Production always renders the unavailable shell, even if the token is
configured.

The production build scans public and server artifacts for fixture identities
and complete development-surface sets. Route and gate names remain forbidden
in public client assets, but the server route manifest may contain them.
The route shell and visible bounded-job link disable automatic prefetch.
User-initiated internal navigation is the only permitted network effect.

## State composition

```text
raw same-envelope child requests
  -> recompute Today
  -> recompute Recovery
  -> recompute Protected Study
  -> verify exact cross-child identity, scope, time, source, and World bindings
  -> source_review_required
     | recovery_required
     | learner_choice_required
     | world_review_required
     | path_complete
     | path_blocked
     | protected_study_ready
```

The exact ordering is contract-owned and covered by tests. The diagram is a
reading aid, not authority to bypass child projectors or strengthen their
outputs.

## Authority ceiling

The output is a `fixture_only_university_semester_loop`.

- every identity, term, capacity, effort, deadline, and learner disposition is
  caller-authored synthetic fixture data;
- copied course facts remain learner-connected copies, not institutional truth
  or a complete course record;
- the World is a supplied validated package snapshot, not live registry or
  deployment authority;
- the composition explains which bounded child job applies; it does not choose
  a course, recommend work, modify a path, or establish learner intent;
- all output is transient and non-durable;
- no source data, decision, session, proof, evidence, receipt, message, event,
  or state transition is saved;
- no learning, recovery, demand, accessibility-conformance, institutional,
  production, or efficacy claim is created.

`UV1-GATE-001`, `UV1-GATE-002`, and `UV1-GATE-003` remain open.

## Alternatives rejected

### Put the existing fixtures on one page

Rejected because independently authored fixtures do not share an exact
timeline, deadline, or source revision. Visual adjacency would imply
continuity that the data does not establish.

### Persist a semester coordinator

Rejected because the legal event runtime does not admit a university semester
aggregate and owner-scoped identity, tenant isolation, rights operations,
backup, restore, and rollback are unresolved.

### Let the composition repair child states

Rejected because source review, recovery choices, World review, and path state
belong to distinct objects and authorities. The composition may identify the
next bounded job but cannot perform it.

### Collapse the loop into an AI recommendation

Rejected because copied-source uncertainty, declared capacity, accepted-path
authority, and World-package integrity are lexicographic safety boundaries, not
features in a common score. A model answer cannot replace those checks.

### Start the reviewed World from the ready state

Rejected because the fixture has no learner-owned device continuity or durable
session authority. The ready state may point to the protected-study research
brief only; it does not start or transfer a session.

## Consequences

The packet can test whether one coherent semester-loop explanation helps an
adult student distinguish Today, recovery, source review, World review, and
path terminal states. It cannot validate demand or justify replacing the
learner home.

A later durable semester coordinator must explicitly supersede this ADR and
establish adult entitlement, owner-scoped persistence, tenant isolation, edit
and undo semantics, event authority, source and institution boundaries,
responsible-human routing, session continuity, evidence ownership, rights
operations, accessibility evidence, operations, and rollback.
