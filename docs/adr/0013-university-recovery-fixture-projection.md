# ADR-013: University recovery fixture projection

**Status:** Accepted for internal, fixture-only workflow research
**Date:** 31 July 2026
**Decision owner:** Principal product and architecture task under explicit user implementation authority
**Claim ceiling:** deterministic engineering and rendered-research candidate only; no demand, learner, scheduling, live-data, accessibility, recovery, institutional-authority, or production claim

## Context

ADR-010 can reconcile private connected-course copies without turning them into university truth. ADR-011 can show one action from an existing learner-accepted path when source context and learner-fixture capacity permit. Neither contract helps a student re-enter when several commitments have slipped or current capacity has changed.

The accepted research describes recovery as a separate atomic job: ask what changed, recalculate from current capacity, separate required/negotiable/deferrable/no-longer-useful work, surface high-consequence conflicts, prepare human-help requests, preserve learning essentials, and avoid a demoralizing backlog debt counter.

A general planner is not yet justified. Identity, tenancy, persistence, course authority, human routes, direct student demand, and repeated-use evidence remain open. A broad implementation could turn stale copied deadlines into recommendations, infer sensitive circumstances, silently compress learning, or present fixture classifications as an autonomous schedule.

## Decision

Add a removable `src/forge/university-recovery/**` projection boundary and a development-only internal research surface with these invariants:

1. The request starts with an explicit learner-fixture change code, one exact term scope, explicit `asOf`, a recovery window, learner-declared available minutes, and a learner-declared protected buffer.
2. At most eight shallow course projections may participate. Every projection must match the exact owner, tenant, term, course, and `asOf`.
3. Every work item binds one exact deadline candidate in its declared course. A usable lane requires a learner-confirmed or learner-corrected deadline outside conflict and duplicate groups.
4. Source candidate, stale/unknown freshness, partial/unknown coverage, duplicate, or conflict state withholds the entire recovery draft. Uncertain high-consequence facts are review work, not lower-scored planning input.
5. Required, negotiable, deferrable, and no-longer-useful are learner-fixture declarations. Learning-essential is also learner-declared. The projector cannot relabel, defer, drop, or move an item automatically.
6. Required work forms the protected lane and its full fixture-authored effort range is compared with workable minutes after subtracting the protected buffer.
7. Negotiable or learning-essential non-required work remains in a decide/ask lane. Deferrable or learner-declared no-longer-useful work stays outside the recovery window.
8. Display order is copied deadline then item ID. It is explicitly not a priority, risk, mastery, employability, intelligence, or ability score.
9. Tight protected capacity or an open decide/ask item requires learner choice. Insufficient protected capacity or an overdue non-routine item requires human help.
10. Human help is one bounded question prepared from the copied deadline and declared capacity. It is never sent, copied, routed, or saved by this slice.
11. No backlog-debt counter, streak, progress bar, guilt message, diagnosis, wellbeing inference, or engagement optimization exists.
12. Input is copied through an accessor-free bounded plain-JSON boundary before schema traversal. Dependency cycles, malformed input, scope/time mismatch, and missing source references fail closed.
13. Every usable projection is deterministic, deeply immutable, and digest-bound. The projector has no model, connector, network, browser storage, database, event, calendar, session, message, or external side effect.
14. The internal route is unavailable in production and requires an exact server-owned development fixture token. Sample identities and content are forbidden in public production assets.

## User need and conceptual model

The primary job story is:

> When my week has broken and I can no longer do everything I expected, help me rebuild from today using current capacity and visible course facts, so I can protect essential learning and ask for decisions without feeling that every missed item is permanent debt.

The slice recognizes four transient objects:

- **Recovery Draft:** one disposable view of the current request; it is not saved or returned to.
- **Reviewed Course Fact:** a learner-confirmed or learner-corrected connected-source copy; it is not institutionally complete or authentic.
- **Declared Capacity:** available minutes and protected buffer entered for one bounded window; it is not predicted.
- **Recovery Item:** one deadline-bound item with learner-declared disposition, learning value, effort range, dependencies, and optional human route.

The model deliberately does not create a persistent plan, capacity profile, health record, risk profile, human case, message, or backlog history.

## Interaction flow

```text
Recovery workbench
- choose fixed research state -> same workbench, new immutable fixture projection
- review source copies -> internal source-review fixture
[ what changed, fit summary, three lanes, source boundary, authority ceiling ]

Prepared human question
- inspect question -> remains on same page
[ related item, copied deadline, capacity mismatch, learner-declared route, not-sent state ]

Source review required
- review source copies -> internal source-review fixture
[ no capacity result and no recovery lanes ]
```

There is no save, send, accept, edit, undo, or post-action state in this slice because those operations require durable adult identity, storage, event, rights, and responsible-human authority. Their absence is visible rather than simulated.

## State table

| Condition | Projection | Recovery represented |
| --- | --- | --- |
| Malformed/accessor/proxy, scope/time mismatch, missing deadline, dependency cycle | `invalid` | Repair fixture input |
| Any course-source projection still needs review | `source_review_required` | Review connected copies; show no lanes |
| Required high estimate fits and no open decide/ask item exists | `draft_ready` | Inspect a transparent reset |
| Required low fits but high does not, or decide/ask work exists | `learner_choice_required` | Learner revises declarations or protects more time |
| Required low does not fit, or consequential/unknown work is overdue | `human_help_required` | Inspect a prepared, unsent question |

## Context and resource budget

- accessor-free plain JSON only;
- maximum depth 12 and 4,096 copied JSON nodes;
- at most eight courses and 32 recovery items;
- at most 16 unique dependency references per item;
- one exact reviewed deadline per recovery item;
- one recovery window with at most 10,080 declared available minutes and 1,440 buffer minutes;
- one deterministic digest per usable projection.

## Evaluation plan

- contract tests for fit, tight range, negotiable essential work, insufficient capacity, overdue consequential work, source conflict/staleness, cross-course/time scope, missing deadline, dependency cycle, determinism, immutability, hostile input, and no side effects;
- component tests for all four research states, lane semantics, copy, native controls, source-review routing, no send control, no storage/network, and banned dash characters;
- exact route-gate and production-public-artifact tests;
- lint, typecheck, full application/evaluator tests, and production build;
- rendered desktop and 320 CSS px checks, keyboard state switching, reduced motion, forced colors, console review, and production route denial;
- approved adult observation under the fixed UX experiment loop before any public route or product claim.

## Rejected alternatives

### Auto-reschedule every item

Rejected because source authority, real capacity, edit/undo history, and durable plan state are unresolved. Silent movement also contradicts learner control.

### Rank the backlog with one score

Rejected because consequence, deadline, learning value, source uncertainty, and capacity are not interchangeable scalar inputs. High-consequence uncertainty blocks instead of receiving a lower weight.

### Infer why the student fell behind

Rejected because behavior, coursework, health, disability, work, care, and wellbeing data are not authorized. The slice accepts only a bounded learner-fixture change code and retains no narrative.

### Send an extension request

Rejected because the current program has no verified identity, responsible-human directory, live source link, delivery receipt, approval, withdrawal, or reversal authority.

### Store a recovery history

Rejected because the current legal event runtime does not admit university recovery aggregates and a backlog history could become surveillance or shame. A future durable design must justify what history serves the learner and how it is exported, corrected, and deleted.

## Reversal and supersession

The module, internal route, fixtures, and tests can be removed without migration. A later durable recovery ADR must explicitly supersede this decision and establish demand, adult authority, tenant/RLS enforcement, event/current-state ownership, edit/accept/reject/undo, responsible-human routing, source links, rights operations, accessibility evidence, and rollback.
