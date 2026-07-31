# ADR-020: University transient recovery capacity what-if

**Status:** accepted for removable internal workflow research only

**Date:** 2026-07-31

**Decision owner:** principal product and architecture task under explicit user implementation authority

**Claim ceiling:** deterministic synthetic engineering and rendered-research candidate only; no live student, institutional truth, durable plan, recommendation, accessibility-conformance, recovery, learning, efficacy, or production authority

## Context

ADR-013 can project a recovery draft from reviewed copied deadlines, full
fixture-authored effort ranges, learner-fixture classifications, and one
learner-fixture capacity window. Its four-state research surface reveals the
right safety boundaries, but its outcome-labelled scenario picker tells the
learner what each state means before they inspect the arithmetic. It also
cannot test whether a learner understands the causal effect of a changed
capacity declaration.

ADR-013 deliberately excluded edit, save, accept, undo, and post-action state.
Durable recovery editing still requires verified adult identity, tenant
enforcement, event/current-state ownership, export and deletion, backup and
restore, conflict handling, reversal, and repeated-use evidence. Those gates
remain open.

The next reversible question is narrower:

> When the time available in a difficult week changes, can a learner compare
> that one declaration against the same reviewed copies, full effort range,
> classification, and protected buffer without mistaking the preview for a
> recommendation or saved plan?

## Decision

Add a server-internal `src/forge/university-recovery-what-if/**` projector and
an optional development-only mode on the existing internal Recovery route.

The projector:

1. accepts one raw `UniversityRecoveryRequestV1` and one integer
   `availableMinutes` value;
2. copies the complete input through a bounded, accessor-free,
   proxy-rejecting server boundary before schema traversal;
3. computes the canonical baseline Recovery projection from one detached,
   schema-parsed request without mutating the caller input;
4. rebuilds the request by replacing only
   `recoveryWindow.availableMinutes`;
5. keeps the scope, time, window endpoints, protected buffer, courses, copied
   sources, decisions, deadlines, effort ranges, dispositions,
   learning-essential declarations, dependencies, human routes, labels, and
   identifiers stable as canonical parsed fields;
6. delegates source review, lane classification, capacity arithmetic, status,
   and human-help preparation to the canonical Recovery projector;
7. binds the baseline digest, selected value, locked-field digest, canonical
   result, and a fixture-only capacity declaration with every operational
   authority false into one deterministic, deeply frozen projection;
8. fails closed without a usable comparison when input, locked fields, source
   review, or the canonical child projection is invalid.

The projector accepts no caller-supplied projection, status, lane, capacity
result, recommendation, command, or effect request.

## Fixed rendered experiment

The development fixture begins from the exact reviewed `reset-fits` Recovery
request. The protected buffer remains 30 minutes and required protected work
remains 90–120 minutes. The server precomputes three neutral,
value-labelled outcomes:

| Choice | Workable arithmetic | Canonical result |
| --- | --- | --- |
| 240 minutes available | 240 − 30 = 210 | `draft_ready` |
| 130 minutes available | 130 − 30 = 100 | `learner_choice_required` |
| 100 minutes available | 100 − 30 = 70 | `human_help_required` |

The browser receives a presentation-only fixture. It receives no raw request,
course-source candidate or decision identity, projection digest, projector,
arbitrary number input, or durable command. No option is initially selected.
The browser may only choose one of the three precomputed outcomes in React
memory or reset to no selection. Refresh clears the selection.

The option labels disclose only the available-time values, not the result.
Reviewed source evidence, the copied deadline, learner classification, full
effort range, and fixed protected buffer appear before the choices. One
selected result then shows the exact subtraction and one honest consequence:

- the full protected range fits;
- only the low estimate fits and FORGE cannot choose the trade-off; or
- even the low estimate does not fit and a question is prepared but not sent.

There is no simultaneous scenario dashboard, chart, score, progress display,
chat, plan application, or hidden recommendation.

## Source-review precedence

Source uncertainty remains the first boundary. If a base request produces
`source_review_required`, the server exposes no capacity comparison and the
rendered surface exposes no capacity controls or result. The learner is asked
to review the copied deadline before trying the fixed what-if.

## Authority ceiling

- learner and term identity remain caller-authored synthetic fixture values;
- tenant isolation and rights enforcement are not established;
- source authenticity and institutional completeness are not established;
- the selected capacity is a fixture declaration, not an inferred capacity,
  health, disability, distress, motivation, or ability claim;
- deadlines, effort, classification, learning value, protected buffer, and
  human route cannot be changed by this slice;
- no value is recommended, optimized, ranked, or labelled best;
- no choice applies a plan, reschedules, defers, compresses work, accepts a
  decision, starts a session, creates evidence, saves history, emits an event,
  sends a message, writes a calendar, calls a provider, or performs an
  external effect;
- no demand, recovery, learning, accessibility-conformance, institutional,
  production, or efficacy claim follows.

`UV1-GATE-001`, `UV1-GATE-002`, and `UV1-GATE-003` remain open.

## Route and artifact boundary

The existing internal route may enter this mode only in development with:

```text
FORGE_UNIVERSITY_RECOVERY_FIXTURE=forge-university-recovery-what-if.v1
```

The legacy exact token `forge-university-recovery.v1` retains its existing
fixture behavior. Production renders only the unavailable shell for both
tokens. What-if schemas, tokens, synthetic identities, and sample course copy
are forbidden in public static assets.

## Interaction and evaluation boundary

- native radio controls retain normal arrow-key behavior and focus;
- result updates do not move focus or scroll;
- one concise status message announces the consequence;
- reset clears the selection and focuses the first radio;
- desktop and 320 CSS px remain one evidence → choice → consequence reading
  order with no horizontal overflow;
- reduced-motion and forced-colors behavior are checked without claiming
  accessibility conformance;
- the what-if uses a new experiment baseline. Results from the older
  outcome-labelled four-state Recovery fixture cannot be pooled with it.

## Alternatives rejected

### Edit both available time and protected buffer

Rejected for the first causal experiment. Changing two declarations makes it
harder to tell whether a learner understands the protected-buffer invariant.
A later experiment may vary the buffer only after this baseline is understood.

### Edit dispositions or learning-essential status

Rejected because those are learner classifications with different semantics
and authority. Combining them with capacity would turn one comprehension test
into a general replanner.

### Accept arbitrary browser numeric input

Rejected because the first question needs three comparable synthetic
outcomes, not a client-side planning engine or request boundary.

### Save or apply the selected result

Rejected because a comparison is not an accepted plan. Durable state requires
a separate identity, data, event, rights, conflict, reversal, and operations
decision.

### Show all outcomes side by side

Rejected because it creates a scenario dashboard and encourages optimization
across states. The learner should inspect one exact choice and its arithmetic.

## Consequences and supersession

This ADR supersedes ADR-013 only for one transient, unsaved capacity preview.
It does not authorize durable Recovery editing or alter the canonical Recovery
contract.

The module, optional route mode, fixture, and tests remain removable without a
migration. A later durable recovery ADR must explicitly establish identity,
tenant and rights enforcement, storage and event ownership, accept/reject and
undo semantics, export and deletion, backup and restore, conflict recovery,
responsible-human routing, incident operation, repeated-use evidence, and a
separate shipping decision.
