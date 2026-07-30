# ADR-011: University Today fixture composition

**Status:** Accepted for internal, fixture-only workflow research
**Date:** 30 July 2026
**Decision owner:** Principal product and architecture task under explicit user implementation authority
**Claim ceiling:** deterministic engineering and rendered-research candidate only; no demand, learner, scheduling, live-data, accessibility, learning, institutional-authority, or production claim

## Context

ADR-010 represents private connected-course copies without turning them into institutional truth or recommendation authority. FORGE continuity already projects one next action from an immutable learner-accepted path bound to an exact reviewed World. Research for the university wedge calls for a “Today” surface that combines one sound action, capacity, and visible source uncertainty, but the observation and demand gates remain open.

A broad planner would cross those boundaries. It could silently treat copied deadlines as authoritative, infer capacity, activate a path the learner did not accept, or make the internal prototype look like a live student system.

## Decision

Add a removable `src/forge/university-today/**` composition boundary and a development-only internal research surface with these invariants:

1. The projector receives an explicit term/course scope, explicit `asOf`, learner-fixture study window, fixture-authored effort range, course-source reconciliation request, exact immutable path revision, and versioned activity states.
2. The existing continuity projector is the only action selector. Course-source facts never select, rank, activate, or start an action.
3. The effort range must bind the exact path, revision, and projected node. It is displayed as fixture-authored, not predicted.
4. Available time and energy are caller-declared fixture fields. No calendar, clock, behavior, wellbeing, or accommodation inference occurs.
5. Unreviewed, stale, partial, unknown, or conflicting source state produces `source_review_required` and withholds the learning action from the composition.
6. When the declared window is below the low effort bound, the result is `capacity_conflict`; when it is between the bounds, the result is `learner_choice_required`. The projector does not compress the task or pretend it fits.
7. Every usable result is deterministic, deeply immutable, and digest-bound. Invalid or cross-goal/scope/binding input fails closed.
8. The projector has no model, tool, connector, network, browser-storage, database, event, session-start, path-activation, or external side effect.
9. The internal route is unavailable in production and requires an exact server-owned development fixture token. Its sample identities and content are forbidden in production public assets.
10. The existing public `/app` remains unchanged until direct workflow evidence passes the predeclared product gates.

## Architecture summary

The slice is a pure composition layer, not an agent:

```text
reviewed connected-source projection ─┐
                                      ├─ university Today projector ─ rendered research state
accepted-path next-action projection ─┤
learner-fixture capacity + effort ────┘
```

The connected-source branch contributes only bounded context and uncertainty. The accepted-path branch contributes the action. Capacity contributes a feasibility comparison. No branch can mutate another.

## State and memory

There is no projector memory. Every state is supplied in one bounded request and returned in one immutable projection. The internal UI may switch among server-created sample projections in browser memory for observation, but it cannot write storage, emit events, start a study session, or call a network API.

## Context budget

- one owner/tenant/term/course scope;
- one learner-goal reference without learner words;
- at most 32 source revisions and 512 source candidates under ADR-010;
- one immutable accepted-path revision with at most 128 nodes under continuity contracts;
- at most 128 activity states;
- one study window no longer than the schema maximum and one 5–240 minute effort range.

## Failure modes and recovery

| Failure state | Result | Recovery represented |
| --- | --- | --- |
| Malformed, cross-scope, cross-goal, bad digest, or effort mismatch | `invalid` | Repair fixture input |
| Source candidate, conflict, stale/unknown freshness, or incomplete connected-source coverage | `source_review_required` | Review connected copies or ask an authorized human |
| Available time below authored low bound | `capacity_conflict` | Learner replans; FORGE does not compress |
| Available time between bounds | `learner_choice_required` | Learner decides whether to protect more time |
| Accepted path complete | `complete` | No action fabricated |
| Accepted path invalid, blocked, unaccepted, or unreviewed | `blocked` | Repair or replace the accepted path |

## Evaluation plan

- contract tests for ready, source-review, capacity-conflict, tight-window, complete, blocked, malformed, cross-goal, cross-scope, effort mismatch, determinism, immutability, hostile input, and no side effects;
- component tests for all primary states, semantic headings, accessible selection, no storage/network, and precise authority language;
- route-gate and production-public-artifact tests;
- full unit/evaluator, lint, typecheck, and production build;
- rendered development evidence at desktop and 320 CSS px plus keyboard, reduced-motion, forced-colors, and console checks;
- direct student workflow observation remains required before any public route or normative product decision.

## Rejected alternatives

### Let course deadlines select the next action

Rejected because learner-confirmed extraction does not establish source authenticity or institutional completeness, and the source boundary explicitly disallows recommendation.

### Store a semester plan now

Rejected because adult identity, tenant isolation, durable event/current-state authority, rights operations, backup, restore, and deletion are unresolved.

### Replace the learner home

Rejected because direct workflow and demand gates remain open. The internal surface is designed to test hierarchy, uncertainty, and recovery without promoting the wedge.

### Add a generative planning agent

Rejected because this decision requires no open-ended reasoning or tool use. A deterministic projector is more inspectable, testable, reversible, and faithful to the current authority ceiling.

## Reversal and supersession

The module, internal route, and fixture can be removed without data migration. A later durable university ADR must explicitly supersede this decision and establish product demand, adult authority, tenant/RLS enforcement, event/current-state ownership, live-source access, rights operations, and rollback.
