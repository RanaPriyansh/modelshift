# FORGE Argument & Evidence World — Implementation Packet

**Status:** principal design contract; package implementation authorized, curriculum/public release remain pending

**Decision date:** 22 July 2026

**Packet:** W5-E after W5-B, W5-D source contracts, and the shared runtime schema are accepted

## 1. North Star

A learner must be able to distinguish an item that merely shares a topic with a claim from evidence that bears on whether the claim should be believed, then repeat that distinction on one unfamiliar authored problem after interpretation, test selection, and hints have visibly left.

The result may say only that the learner met or did not meet the named classification criteria once on that transfer. It must not claim general critical thinking, media literacy, writing ability, retention, intelligence, curriculum completion, or homeschool readiness.

## 2. Why this World exists

This is the first new language/literacy World built through the same Vanishing Instrument contract as the existing science, mathematics, history, and AI-literacy Worlds. It proves architectural breadth without pretending four or five lessons constitute a complete education system.

The instructional compiler remains:

```text
learner claim
  -> exactly two plausible readings
  -> one point where they disagree
  -> one authored separating comparison
  -> learner reconstruction
  -> explicit assistance withdrawal
  -> unfamiliar cold transfer
  -> bounded evidence
```

No chat panel, AI character, generated factual passage, live search, scoring model, mastery estimate, or recommendation engine is part of this packet.

## 3. Construct and exclusions

### Construct

Given one bounded claim and a small authored set of candidate evidence items, the learner identifies which item changes the claim's credibility and names the relevant claim-to-evidence relation.

### In scope

- relevance to the exact claim;
- outcome-linked comparison versus topical detail;
- limits of a comparison, including a named confound or missing control;
- deterministic classification using authored IDs;
- a textual/table representation that is equivalent to the visual card comparison.

### Explicitly out of scope

- whether a real public claim is true;
- source authenticity, motive, bias, statistical significance, or causal identification beyond the authored fixture;
- persuasive writing quality;
- fact checking or open-web research;
- evaluation of free-form learner prose by a model;
- diagnosis, ability grouping, readiness, mastery, retention, or delayed transfer.

## 4. Package identity and release layers

The first implementation uses the shared runtime's existing truthful lifecycle: the package may be retained with `release.status: "released"` and `availability: "unavailable"`. In this contract, **package release** means only that exact checked-in bytes, runtime binding, validator, and retained digest have passed local package review. It does not mean curriculum release, public availability, planner eligibility, source publication authority, efficacy, or deployment.

This decision is required because the accepted runtime, compiler, local ledger, and retained-manifest checks admit only released built-in packages. The package must remain non-routable while unavailable. It must be absent from the public home catalog, planner topic index, pathway entitlement, and static route surface until the separately governed curriculum/public-release gate succeeds.

The following identities are reserved for that package artifact:

```text
World                 world.argument-evidence
World version         1.0.0
Content version       1.0.0
Capability            capability.language-literacy.claim-evidence-relation
Proof claim           proof.argument-evidence.independent-transfer
Validator             validator.argument-evidence-transfer.v1
Task family           task-family.argument-evidence.claim-relevance-transfer.v1
Worked task code      rooftop_garden_evidence_table
Transfer task code    bus_route_late_arrivals_table
Support policy        policy.argument-evidence.authored-support.v1
Return proof policy   policy.argument-evidence.return-proof.unavailable.v1
```

The exact validator code is converted to the shared opaque ADR-001 task ID by the accepted W5-B compiler. It must never fall back to the task-family ID. A retained package identity does not authorize a direct learner route.

Initial age/depth claim:

- `13-17` and `18-plus` only;
- `introductory` and `core` only;
- `under-13` and `advanced` remain identified gaps until separate content, access, safety, and proof reviews exist.

The secondary-writing research candidate does not justify efficacy claims for younger children or adult literacy populations.

## 5. Authored truth fixtures

All people, places, measurements, and institutions below are fictional. The package is authoritative only for the relations encoded in its own immutable authored fixture.

### Worked comparison: rooftop garden

Claim:

> The rooftop garden lowers the library's afternoon roof temperature on clear days.

| ID | Candidate item | Authored relation | Why |
| --- | --- | --- | --- |
| `roof.same-topic` | The garden contains herbs, flowers, and two benches. | `same_topic_only` | It is about the garden but gives no temperature comparison. |
| `roof.outcome-linked` | At 15:00 on six clear days, paired sensors under the planted and bare sections recorded the planted section as cooler each day. | `supports_with_limit` | It measures the named outcome in a paired comparison; it does not by itself establish every season or every roof. |
| `roof.uncontrolled-testimonial` | A visitor said the whole library felt cooler after the garden opened. | `weak_or_open` | It is not a controlled roof-temperature comparison and mixes indoor perception with the claim. |
| `roof.contradictory-pair` | On a seventh clear day, the planted sensor was warmer after its shade cover detached. | `contradicts_under_changed_condition` | It bears on the outcome, but the changed condition limits comparison. |

The separating test uses the first two items. The other two are used only after the core distinction is legible.

### Cold transfer: bus route

Claim:

> The new morning bus route reduced late arrivals at Northbridge Learning Centre during the trial.

| ID | Candidate item | Authored relation | Why |
| --- | --- | --- | --- |
| `bus.same-topic` | The trial buses were blue and displayed route maps. | `same_topic_only` | It shares the topic but does not bear on late arrivals. |
| `bus.outcome-linked` | The centre logged 31 late arrivals in the four weeks before the trial and 12 in the four trial weeks, using the same start time and attendance rule. | `supports_with_limit` | It compares the named outcome across matched windows; other changes remain possible. |
| `bus.confounded` | The trial occurred during exam month, when attendance rules also changed. | `limits_claim` | It identifies a change that could affect the outcome and limits the simple attribution. |

Required cold-transfer response:

1. choose `bus.outcome-linked` as the item that directly changes the claim's credibility;
2. choose mechanism `compares_named_outcome`;
3. choose limitation `other_changes_not_ruled_out`;
4. record confidence from 0 to 100.

Confidence is descriptive and never affects correctness.

## 6. Exactly two compiler readings

The compiler preserves the learner's own initial words locally, but the two readings are authored possibilities, not a diagnosis or probability estimate.

### Reading A — topic match

“An item counts as evidence when it is about the same subject as the claim.”

Prediction: both `roof.same-topic` and `roof.outcome-linked` count equally.

### Reading B — credibility relation

“An item counts as evidence when its result bears on what the claim says happened.”

Prediction: `roof.outcome-linked` bears on the temperature claim; `roof.same-topic` does not.

### Disagreement

“Does a detail about the garden count when it contains no temperature outcome or comparison?”

### Separating test

Hold the claim constant and compare the two cards side by side. Ask which card would make a careful reader update belief in the exact claim and why. Explain why this separates the readings before naming the rule.

The learner may accept, correct, or reject an interpretation. A correction is learner-authored local content; it is not copied into an evidence event.

## 7. Domain state machine

Display stages may use the compact labels below, but the runtime adapter must emit the canonical semantic trace.

| Display stage | Required action | Canonical runtime stage(s) |
| --- | --- | --- |
| `MYSTERY` | choose what would count as evidence and confidence | `encounter`, `commit_model` |
| `EXPLAIN` | enter or edit a mechanism explanation | no stage collapse; prepares compiler |
| `COMPILER` | accept/correct readings; name disagreement; predict test | `interpret_two_readings`, `name_disagreement`, `commit_test_prediction` |
| `TEST` | reveal both cards together and classify the relation | `run_separating_experience` |
| `SUPPORT` | optional authored support, only when consumed | `governed_support` |
| `RECONSTRUCT` | choose mechanism and state a bounded rule | `reconstruct` |
| `WITHDRAWAL` | acknowledge interpretation/test-selection/hints are leaving | `withdraw_instructional_ai` |
| `COLD_TRANSFER` | complete the bus-route task once without help | `cold_transfer` |
| `RESULT` | render the immutable bounded receipt | `bounded_result` |

`return_or_apply` is not in the emitted bounded receipt. Return proof remains disabled until a separately reviewed scheduler and new task exist.

Transition rules:

- every stage rejects out-of-order events without mutating semantic state;
- reset creates a new local attempt and no prior receipt is reused;
- worked-test retries are allowed before proof and are recorded only as local learning state;
- transfer submission is single-shot; a second submission is rejected;
- support, model action, experiment replay, interpretation changes, and answer-changing actions are blocked once withdrawal begins;
- access accommodations remain available in proof;
- raw explanation text and compiler corrections remain local and never enter the bounded receipt or ADR-001 events.

## 8. Deterministic validator

Input is a strict object with no extra keys:

```ts
{
  taskId: "bus_route_late_arrivals_table";
  evidenceItemId: "bus.same-topic" | "bus.outcome-linked" | "bus.confounded";
  mechanismId: "same_subject" | "compares_named_outcome" | "personal_reaction";
  limitationId: "none" | "other_changes_not_ruled_out" | "colour_not_measured";
}
```

Pass requires the exact three authored IDs listed in section 5. Partial combinations return `passed: false`; they may expose criterion-level codes but never a fractional capability claim.

Canonical ordered evidence codes:

```text
task:bus_route_late_arrivals_table
criterion:evidence_item:pass|fail
criterion:mechanism:pass|fail
criterion:limitation:pass|fail
```

The validator returns only bounded IDs/codes, booleans, and counts. It does not return learner prose, feedback prose, probabilities, inferred traits, or model output. Invalid shape returns the canonical invalid-input result and cannot create evidence.

## 9. Support and access policy

### Cognitive support catalog

Exactly three catalog actions are instructional support, because the shared runtime binds one fixed tier to each unique action ID:

```text
action.argument-evidence.support.attention
action.argument-evidence.support.cue
action.argument-evidence.support.representation
```

It permits authored support only, before proof, under `policy.argument-evidence.authored-support.v1`:

| Level | Tier | Action ID | Prompt function |
| --- | --- | --- | --- |
| 1 | `attention` | `action.argument-evidence.support.attention` | “Which card contains the outcome named in the claim?” |
| 2 | `cue` | `action.argument-evidence.support.cue` | point to claim, outcome, and comparison columns |
| 3 | `representation` | `action.argument-evidence.support.representation` | render the same two cards as a claim/evidence/relation table |

Each row is authored-only, `governed_support`, `maxUses: 1`, and `answerExposing: false` under the same policy. The runtime may collapse repeated governed-support semantic trace stages while retaining each exact support fact. No example answer, repair that reveals the selection, solution, human support, provider/model call, fallback model payload, or post-withdrawal support is permitted by this package binding. If a later release permits model interpretation, it needs a distinct action/policy version and cannot inherit authority from this authored catalog.

### Access accommodations

At minimum the runtime binding declares:

- keyboard operation through native controls;
- text/table alternative containing every visual relation;
- reduced motion with no loss of sequence or evidence;
- persistent zoom/reflow support at 320 CSS px;
- forced-colors-visible boundaries, focus, selection, and status;
- announcements for stage title, validation error, withdrawal, and result status.

Access facts remain separate from cognitive support. The equivalent table is available during proof and does not change the construct.

## 10. UI contract

The World inherits FORGE's production direction:

- physical/authored evidence cards own the opening;
- only the compiler scene branches into two readings;
- only the comparison scene exposes dense relation instrumentation;
- the proof scene removes instructional tools but not access;
- the result uses the quiet paper-like evidence surface;
- amber marks learner-authored language; cyan marks the selected separating comparison;
- no gradients, glass, dashboards, badges, streaks, chat, avatars, autoplay, or celebratory correctness.

One dominant question is allowed per viewport. Every button uses an explicit verb such as “Commit this prediction,” “Compare the cards,” “Reconstruct the rule,” or “Begin unaided transfer.”

Motion is limited to card alignment and connector drawing that communicates the comparison. Reduced motion replaces both with immediate state plus the same textual relation.

## 11. Source authority boundary

The fictional task fixture is a checked-in authored snapshot. It needs an ADR-007 candidate binding with:

- immutable bytes, byte length, media type, digest, and authored-fixture locator;
- claims that bind each authored relation to exact fixture fields;
- rights permitting curriculum authoring and bounded learner display;
- separate acquisition, rights, factual/epistemic, pedagogy, accessibility, age/safety, and proof-design review candidates;
- correction/withdrawal replay behavior.

The IES/What Works Clearinghouse practice guide *Teaching Secondary Students to Write Effectively* is a pedagogy/construct research candidate only. Before it can be bound, FORGE needs an exact reviewed snapshot, locators, claims, rights record, population limitation, and scoped human decisions. Its presence cannot create publication authority or extend the World to populations it did not study.

If that external source is not accepted, the package may remain a local, unavailable authored-fixture artifact; the implementation must not invent a reviewed binding. Its initial runtime provenance is explicitly incomplete and cannot satisfy the curriculum graph's new-publication gate. A later bound source tuple requires the real immutable source package, locators, rights, all seven scoped review decisions, correction/withdrawal replay, and separate publication authority.

The canonical content bytes live only at `public/worlds/argument-evidence/authored-fixture.json`. Domain code parses and projects those bytes; it must not maintain a second hand-copied truth fixture. Exact byte length and digest are tested.

## 12. File ownership for the implementation task

Expected new files:

```text
src/worlds/argument-evidence/
  content.ts
  index.ts
  reducer.ts
  types.ts
  validator.ts
  argument-evidence.test.ts

src/components/worlds/argument-evidence/
  ArgumentEvidenceWorld.tsx
  ArgumentEvidenceWorld.module.css
  ArgumentEvidenceWorld.test.tsx
  index.ts

src/forge/world-runtime/
  argument-evidence-binding.ts
  argument-evidence.ts
  argument-evidence.test.ts

app/learn/argument-evidence/page.tsx
public/worlds/argument-evidence/
  authored-fixture.json
  PROVENANCE.md
```

Expected narrow edits after review:

- built-in World registry/pack export;
- canonical deterministic validator registry;
- learner route and planner catalog;
- retained content manifest and runtime-binding digest;
- all-World conformance and browser fixture lists.

The implementation task does not edit SQL, auth, provider routes, public feature flags, or deployment configuration.

## 13. Acceptance matrix

### Domain and validator

- every valid/invalid state transition;
- all evidence-item × mechanism × limitation combinations;
- exact ordered validator criteria;
- unknown ID, extra key, missing key, wrong task, and malformed input rejection;
- one-shot transfer and reset semantics;
- no raw prose in receipt/event serialization.

### Runtime and trust

- shared conformance trace;
- exact runtime-binding and retained-manifest digest;
- exact support catalog enforcement;
- support before proof recorded once; forged/model/solution/post-proof support rejected or invalidated;
- access duplicate is a truthful no-op;
- receipt compiles and replays through ADR-001 v2;
- altered validator result, criteria order, task code, source tuple, runtime digest, or support fact fails closed.

### Browser and accessibility

- complete desktop and 320 CSS px keyboard journeys;
- focus never moves behind hidden stages;
- stage/error/withdrawal/result announcements;
- reduced-motion, forced-colors, 200% zoom, and text/table alternative;
- no horizontal page overflow or clipped controls;
- proof retains access and removes every instructional action;
- reset starts a new clean attempt;
- console error and failed-request audit.

### Content and release

- independent content, proof, safety, and access review;
- exact source candidate status and rights-use checks;
- full app/evaluator/unit suites, lint, typecheck, production build, and browser suite;
- public route stays unavailable until the exact candidate passes registry and release review;
- no deployment or alias mutation belongs to the World implementation task.

## 14. Definition of done

This packet is implemented only when the unfamiliar transfer works without instructional assistance, its deterministic result is compiled from exact released semantics, and every visible claim remains narrower than the evidence. A polished route, a passing happy-path test, or a schema-valid pack is not enough.
