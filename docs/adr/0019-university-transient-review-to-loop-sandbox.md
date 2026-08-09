# ADR-019: University transient review-to-loop sandbox

**Status:** accepted for removable internal workflow research only

**Date:** 2026-07-31

**Decision owner:** principal product and architecture task under explicit user implementation authority

**Claim ceiling:** deterministic synthetic engineering and rendered-research candidate only; no live student, institutional truth, persistence, recommendation, accessibility-conformance, learning, efficacy, or production authority

## Context

ADR-010 lets a learner inspect a copied course fact without treating that copy
as institutional truth. ADR-011 projects Today from reviewed copied context and
an already accepted learning path. ADR-015 composes Today, Recovery, and
Protected Study from one exact raw semester envelope.

Those contracts are currently observable only as separate fixed states. A
learner can accept, correct, or reject a copied fact in the source-review
fixture, but that decision stops at the review surface. The semester-loop
fixture separately displays a pre-authored result. Visual proximity or a link
between those surfaces would imply continuity that the raw requests do not
establish.

Real course data, durable identity, tenant isolation, persistence, event
authority, participant operation, and public replacement remain unauthorized.
The next reversible question is therefore narrower: can a student understand
how one explicit source decision changes the exact bounded next-job envelope?

## Decision

Add a server-internal `src/forge/university-semester-sandbox/**` projector and
an optional development-only mode on the existing internal semester-loop route.

The sandbox:

1. accepts one raw `UniversitySemesterLoopRequestV1` and strict
   `CourseSourceDecisionV1` values; it accepts no status, child projection,
   readiness flag, effect request, or durable command;
2. copies the complete request through a bounded, accessor-free, proxy-rejecting
   server boundary before schema traversal;
3. verifies that Today and the matching Recovery course begin with the same
   exact canonical course-source reconciliation request;
4. replaces only the decision array and installs the same rebuilt source
   request in both raw children;
5. delegates every source, Today, Recovery, World, path, and terminal decision
   to the existing canonical projectors;
6. maps their result to a small sandbox status and keeps every identity,
   source, institution, recommendation, session, persistence, evidence,
   message, event, and external-effect authority false;
7. returns a deterministic, deeply frozen, digest-bound projection for usable
   states and an unsigned invalid refusal otherwise.

The rendered development harness exposes only four closed, server-authored
choices:

- `pending`: no decision, so source review remains required;
- `accept`: the exact retained fixture decision
  `course-source-decision.sample-today-deadline-accept` at
  `2026-08-25T08:00:00.000Z`;
- `fixed_correct`: one literal same-kind deadline correction with no browser
  clock or locale derivation;
- `reject`: an explicit source-replacement-required refusal.

The server precomputes the four projections from the exact raw envelope. The
client receives no projector, arbitrary decision object, request body, or
institutional data. Its only operation is choosing which closed synthetic
result to inspect in React memory. Refresh resets the choice.

## Reject semantics

The retained Recovery contract requires an effective reviewed deadline.
Rejecting the sole deadline candidate correctly leaves no effective deadline.
Course-source reconciliation alone can describe that copy as reviewed with
zero context facts, but the complete semester envelope cannot produce a valid
Recovery child.

The sandbox therefore treats reject as an explicit invalid refusal. It must
never be relabeled `ready`, and the interface must say that a current
replacement source is required. This exposes a real cross-contract boundary
instead of repairing it silently.

## Route and artifact boundary

The existing internal route may enter this mode only in development with:

```text
FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE=forge-university-semester-sandbox.v1
```

The legacy seven-state fixture and the frozen research-candidate mode retain
their existing exact tokens and behavior. Production renders the unavailable
shell for every token. Sandbox markers and fixture copy are scanned out of
public and server build artifacts.
The shared route shell disables automatic prefetch. The sandbox copy states
that it makes no automatic network request.

## Authority ceiling

- identity and tenant scope remain caller-authored synthetic fixture values;
- copied facts remain learner-connected copies, not institutional truth or a
  complete course record;
- accepting a copy confirms transcription only;
- correcting a copy has only student-entered correction authority;
- the accepted path remains the sole action selector;
- the World remains a validated supplied package snapshot, not live registry
  or deployment authority;
- no choice saves a source, changes a path, starts a session, creates evidence,
  sends a message, emits an event, calls a provider, or performs an external
  effect;
- no observation, demand, learning, recovery, accessibility-conformance,
  institutional, production, or efficacy claim follows.

`UV1-GATE-001`, `UV1-GATE-002`, and `UV1-GATE-003` remain open.

## Alternatives rejected

### Pass full decisions from the browser

Rejected because the research question needs four closed synthetic outcomes,
not a request-controlled authority surface. Literal server-authored choices
also keep time, offset, scope, and candidate identity deterministic.

### Recompute through a server action

Rejected because it would introduce a network and request-body boundary that
this fixture does not need. Server-precomputed projections exercise the
canonical contracts while keeping the rendered interaction refresh-clear and
effect-free.

### Use the stale conflict fixture

Rejected for this transition test. That fixture has partial coverage and stale
calendar data, so decisions alone correctly cannot make it ready. It remains
valuable for the separate uncertainty-review study.

### Treat rejection as a ready Today result

Rejected because the complete loop's exact Recovery child has no effective
deadline. Promoting the isolated Today status would hide a known envelope
failure.

### Persist a local semester workspace now

Rejected until real-data authority, learner-owned workspace identity, unified
export/deletion, transaction and conflict semantics, and the durable event
choice are separately accepted.

## Consequences

The internal prototype can now test the first coherent course-source transition:
inspect one copied fact, make one explicit learner choice, and see the exact
bounded next-job consequence.

It remains a precomputed synthetic research instrument. Direct workflow
evidence must determine whether to keep, repair, narrow, or reject the flow
before any local real-course workspace, public route, cloud identity,
persistence, provider, or generative tutor is considered.
