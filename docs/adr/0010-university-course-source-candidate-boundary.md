# ADR-010: University course-source candidate boundary

**Status:** Accepted for a fixture-only, side-effect-free foundation
**Date:** 30 July 2026
**Decision owner:** Principal product and architecture task under explicit user implementation authority
**Claim ceiling:** engineering contract only; no normative university rebase, live data, durable replay, institutional truth, demand, or production authority

## Context

The university-first proposal identifies course-source reconciliation as one candidate atomic job. The current FORGE source contracts and SQL tables govern globally reviewed, publishable curriculum sources. They do not provide a learner-owned tenant boundary for a private syllabus, manual deadline, or calendar export. The accepted event journal currently admits only `world_run` and `world_package` aggregate families.

Reusing either boundary unchanged would create false authority:

- learner copies could be mistaken for reviewed global curriculum;
- learner confirmation of a transcription could be mistaken for source authenticity;
- connected-source coverage could be mistaken for complete institutional coverage;
- university records could appear replayable or auditable through an event spine that does not legally admit them.

The demand and participant-authority gates remain open. The implementation therefore needs a reversible contract that can exercise the authority distinctions with synthetic fixtures and cannot perform side effects.

## Decision

Add a separate `src/forge/course-sources/**` candidate boundary with these rules:

1. It accepts only strict, bounded manual or ICS-derived metadata. It accepts no URL, source bytes, external connector, credential, provider request, or database handle.
2. Every record is scoped to an owner, tenant, academic term, and course.
3. Source revisions retain a digest, observation time, connected coverage, freshness window, private visibility, retention class, and exact manual-field or ICS-component locator.
4. Candidate facts are limited to shallow course commitments, deadlines, and assessment-assistance policy claims.
5. Learner decisions may accept an extraction match, correct it, or reject it. None establish institutional authenticity or completeness.
6. Duplicate detection is exact and deterministic. Conflicting active facts remain visible and unresolved; they are never silently ranked or overwritten.
7. A copied policy never authorizes content assistance. Its effective mode remains `restricted_assessment`.
8. A goal-context adapter may expose accepted or corrected, non-conflicting facts to existing learner goal/path continuity. The adapter cannot activate a path, recommendation, external write, or evidence claim.
9. All results are deeply immutable and carry a stable digest over canonical data.
10. This module does not emit FORGE events and makes no persistence, replay, undo, RLS, cross-device, or audit claim.

## Authority and vocabulary

The boundary uses the conceptual authority class `learner_connected_source_copy`. It keeps these dimensions separate:

- extraction state;
- source authenticity;
- connected-source coverage;
- institutional completeness;
- freshness;
- conflict state;
- learner decision.

The fixed ceilings are:

- identity scope: `caller_asserted_fixture_only`;
- tenant isolation and rights enforcement: `not_established`;
- source authenticity: `not_established`;
- institutional completeness: `not_established`;
- publication authority: `not_established`;
- durable storage authority: `not_established`;
- institutional policy authorization: `not_established`;
- execution and recommendation authority: `false`.

An optional future link to a global reviewed source must be a controlled, separately validated reference. This slice does not create that link.

## Consequences

- The prototype can test source review and conflict semantics without putting private material in global source tables.
- Manual and ICS adapters can be added later without changing the authority ceiling.
- The module cannot yet support a real student account, cross-device continuity, background sync, or a trusted weekly plan.
- Product surfaces must not imply that this module is live or complete.
- The long-term event choice remains open: versioned university aggregate families or owner-scoped current-state tables with narrower replay/undo/audit claims.

## Rejected alternatives

### Reuse global source tables for private course material

Rejected because the existing tables model reviewed/published curriculum, lack the required learner tenant boundary, and would blur publication with private provenance.

### Extend the legal event spine now

Rejected for this slice because demand, durable identity, writer authority, projectors, migration, replay compatibility, RLS, and rollback are unresolved.

### Build a planner or tutor first

Rejected because a plan or explanation grounded in unreviewed, stale, incomplete, or conflicting course facts would automate uncertainty before representing it.

### Store raw source text for convenience

Rejected. The first contract needs only a digest, bounded derived fact, and exact locator. Original bytes require a separately approved transient or encrypted-object workflow.

## Acceptance conditions

- requirements `UV1-SRC-001..013` are represented in code and focused tests;
- no production-enabled route, migration, provider, connector, auth, or
  deployment change;
- malformed and semantically mixed-scope records fail closed;
- learner confirmation cannot alter fixed authority ceilings;
- policy candidates cannot relax restricted assessment;
- conflicts remain unresolved in the goal adapter;
- full repository verification passes on the exact isolated baseline.

## Reversal and supersession

The module can be removed without migrating product data because it has no persistence or public route. A later durable ADR must explicitly supersede this decision and choose the university event/current-state model, tenant/RLS rules, rights operations, and migration/rollback strategy.
