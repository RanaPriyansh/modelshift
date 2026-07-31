# ADR-021: University transient post-attempt repair preview

**Status:** accepted for removable internal workflow research only

**Date:** 2026-07-31

**Decision owner:** principal product and architecture task under explicit user implementation authority

**Claim ceiling:** exact synthetic runtime and authored-repair engineering
behavior plus a rendered-research candidate only; no live student, diagnosis,
mastery, grade, capability, durable evidence, learning, accessibility
conformance, efficacy, or production authority

## Context

The university-first slices can now:

- reconcile a learner-connected source copy without treating it as university
  truth;
- surface one accepted-path action that fits a learner-fixture time window;
- inspect a recovery boundary without applying a plan;
- explain the support-withdrawal and proof contract of an exact reviewed
  World; and
- compose those jobs inside one transient semester envelope.

The current learning journey still stops at the result. The exact
source-corroboration World records a bounded local attempt and honestly says
whether two authored transfer checks held, but its result can only start a
fresh attempt. It does not turn a specific miss into one actionable revision.
The generic continuity layer advances completed activities without making an
outcome-sensitive repair decision.

That gap matters because generic praise, grades, answer reveal, and “study
more” copy do not tell a learner what to revise. FORGE's governing
research-to-system traceability instead calls for an error class, one next
cognitive move, a bounded support ladder, and a new proof after help is
withdrawn. The system must also let a learner reject or challenge a proposed
interpretation rather than treating one deterministic result as a diagnosis.

The next reversible question is:

> After one exact unaided attempt leaves one authored check open, can a
> learner understand the result and the one authored repair operation without
> mistaking it for an answer, diagnosis, recommendation, or proof?

## Decision

Add a server-only `src/forge/university-post-attempt-repair/**` projector and a
separate development-only internal route.

The first projector is intentionally narrow. It supports only the current
released source-corroboration World and one exact fixed internal authored
partial-result mapping with no independent or domain-review provenance. It:

1. receives the raw Today request, the exact in-process canonical
   `SOURCE_CORROBORATION_WORLD` object, and the exact runtime receipt object;
2. inspects only own data descriptors on the outer request and rejects
   accessors, symbols, extra fields, proxies, arrays, and exotic prototypes
   before any ordinary property read;
3. requires the exact process-local, deeply frozen receipt object emitted and
   privately attested by the canonical public World runtime;
4. only after receipt attestation, captures a bounded detached Today snapshot
   whose trusted Node intrinsic rejects every nested Proxy before reflective
   traversal, then recomputes the existing protected-study projection from
   that snapshot and the exact World package;
5. binds the receipt to the exact World ID/version/content version, protocol,
   proof claim, task family, task code, validator ID/output version, retained
   runtime digest, retained package integrity hash, and protected-study World
   identity; this does not attest Today, course, learner, path, or session
   continuity;
6. selects repair copy only from that immutable fixed internal authored mapping
   over the exact validator code, outcome, disposition, and ordered criteria;
7. exposes one error class, one cognitive operation, one completion condition,
   one non-answer-exposing authored prompt boundary, and one fresh-proof
   boundary;
8. returns `not_applicable` for the exact pass result;
9. returns `repair_mapping_missing` for an attested fail that has no exact
   authored mapping rather than inventing generic advice; and
10. fails closed without a usable result for missing, forged, reconstructed,
    malformed, accessor-backed, mismatched, or otherwise unexpected input.

The first authored mapping is:

| Binding | Exact value |
| --- | --- |
| World | `world.source-corroboration` `1.0.1` |
| Validator | `validator.source-corroboration-transfer.v1` output `1.0.0` |
| Result | `transfer.partial` / `fail` / `not_demonstrated` |
| Ordered criteria | `choice:bounded-measures`, `open-question:color-choice` |
| Error class | `unresolved_condition` |
| Cognitive operation | Name the missing comparison |
| Completion | One named non-comparable condition plus one bounded “we still cannot tell” clause |

The criteria are matching authority only. Raw answer IDs, attempt IDs,
timestamps, learner prose, and validator input are not returned to the
browser.

## Why the exact receipt object is required

The released local runtime receipt is structurally parseable but not
tamper-resistant after serialization. The public runtime privately attests
only the exact frozen object it emitted in the current process. A reconstructed
JSON receipt can reproduce visible fields but cannot acquire that attestation.

This slice therefore does not create a general receipt API and does not accept
a client-supplied receipt. Any future request boundary would need a different
trusted event/evidence authority rather than weakening this process-local
guard.

## Repair is not proof

The next move begins an explicitly supported repair state:

- the prompt may direct attention to a comparison boundary or representation;
- it may not complete the sentence, name the correct choice, expose an
  answer, or re-score the old attempt;
- the learner may inspect or ignore it;
- no repair output is accepted, saved, scored, or converted into evidence;
- a later independent proof must be a fresh task/attempt with instructional
  help structurally absent; and
- the previous receipt is never upgraded, replaced, or smoothed over.

The preview cannot start that repair or proof. It shows the contract only.

## Synthetic context is not receipt continuity

The server pairs the protected-study fixture and receipt inside one synthetic
rendering harness, but the current receipt does not cryptographically or
durably bind learner, term, course, activity, accepted path, or session
identity. The projection therefore declares `receiptContextBinding:
not_established`, and the UI labels those fields as server-paired synthetic
context. They are orientation for this fixture, not evidence that an exact
learner journey continued across systems.

## Fixed rendered experiment

The server executes the canonical source-corroboration runtime to create four
closed synthetic scenarios:

1. **One check open:** the one exact mapped partial result;
2. **Two checks open:** an exact attested fail with no fixed authored repair
   mapping;
3. **Both checks held:** an exact attested pass, so immediate repair is not
   applicable;
4. **Receipt unavailable:** no attested receipt, so the projector fails closed.

The browser receives presentation-only projections. It receives no raw Today
request, World package, attempt ID, recorded time, receipt, criteria IDs,
runtime or package digest, validator input, projector, repair selector, or
command.

The default scenario is the one mapped result. The evidence rail precedes the
repair move. The count `1 of 2 authored checks` is an exact result count, not a
progress or mastery meter. No scenario changes any path, activity, session,
record, schedule, or evidence.

## Authority ceiling

- the course and learner context remain synthetic fixture declarations;
- the receipt is honour-based, local, process-attested, non-persisted, and
  non-durable;
- the repair mapping is a fixed internal authored research policy with no
  independent or domain-review provenance, not a learner diagnosis or
  personalized recommendation;
- no model, retrieval system, free-form evidence string, score heuristic, or
  learner profile selects the repair;
- learner ability, motivation, disability, distress, personality, knowledge,
  mastery, retention, and future performance are not inferred;
- no answer is generated or revealed;
- no activity is assigned, path is advanced, session/retry is started, proof
  is opened, result is rescored, evidence is upgraded, state is persisted,
  event is emitted, message is prepared or sent, return is scheduled, or
  external effect occurs;
- no demand, comprehension, accessibility-conformance, institutional,
  production, learning, or efficacy claim follows.

`UV1-GATE-001`, `UV1-GATE-002`, and `UV1-GATE-003` remain open.

## Route and artifact boundary

The route is available only in development with the exact server-owned token:

```text
FORGE_UNIVERSITY_POST_ATTEMPT_REPAIR_FIXTURE=forge-university-post-attempt-repair.v1
```

Production imports and renders only a generic unavailable shell. The token,
schema names, repair policy identity, repair-specific compound criteria,
authored sample/policy content, and complete development-surface lexical set
are forbidden in public static assets. Bare World and validator identifiers
already shipped by the released public World remain public; the scanner does
not pretend that this slice can make those existing identifiers secret.

## Interaction and visual decision

The surface follows the existing FORGE author shell and Vanishing Instrument
design system. It uses the generated concept
`docs/design/university-post-attempt-repair-concept.png` as a design input,
not as implementation evidence.

- native radios switch among the four closed scenarios;
- the boundary strip appears before the result;
- deterministic evidence is cyan and learner repair work is amber, with
  equivalent text labels;
- the repair move is the dominant section rather than one tile in a
  dashboard;
- the response frame contains empty labelled slots, never a completed answer;
- `details` may explain why the mapping exists without exposing criteria IDs;
- reset restores the first scenario and its native focus;
- desktop and 320 CSS px use intentional horizontal/vertical evidence
  compositions with no overflow;
- reduced motion removes decorative transitions;
- forced colors preserves selected/focus/result boundaries.

## Alternatives rejected

### Generate repair prose with a model

Rejected. Model fluency is not diagnostic authority, and free-form generated
advice can leak the answer, overstate certainty, or invent an unsupported
misconception.

### Branch from score alone

Rejected. A score does not identify the cognitive operation and can collapse
different errors into one opaque number.

### Parse a serialized receipt

Rejected. Structural validity is not process-local authenticity. Reconstructed
receipts cannot select an authority-bearing repair.

### Add repair to the live university protected-study flow

Rejected for this slice. Protected Study is preview-only and cannot start or
receive a live attempt. State handoff would exceed the current session and
data authority.

### Cover every failure immediately

Rejected. One exact fixed internal authored mapping tests whether the grammar
is legible. It has no independent or domain-review provenance. Unknown failures
must remain visibly unmapped until a domain owner authors and reviews a
distinct repair.

### Automatically start repair or a retry

Rejected. A repair preview is a proposal. The learner owns whether to continue,
and a fresh protected proof needs a separate session boundary.

## Consequences and supersession

This ADR extends ADR-014 only with a post-attempt research grammar. It does not
change Protected Study's preview-only authority or the source-corroboration
World package/runtime.

The module, route, fixture, mapping, and tests remain removable without a
migration. Any live connection must separately establish authenticated adult
session authority, trusted receipt/event persistence, data rights, exact
World and path continuity, learner choice, challenge/correction, repair
content review, fresh-proof task families, deletion/export, incident and
appeal operations, participant evidence, and a new release decision.
