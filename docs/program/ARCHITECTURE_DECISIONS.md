# FORGE Principal Architecture Decisions

**Status:** accepted architecture; implementation remains unintegrated until reviewed

**Decision date:** 22 July 2026

**Authority:** principal architecture task under `AGENTS.md` and `ARCHITECTURE.md`

These decisions resolve the cross-lane conflicts found in the completion audit. Workers implement compatible slices; they do not create competing vocabularies or silently reinterpret current records. Existing version-1 records remain readable and immutable. Contract changes use additive schemas, explicit mappings, replay fixtures, and migrations.

## ADR-001 — Canonical evidence, validation, support, and access semantics

### Decision

FORGE separates four facts that current types partially collapse:

1. **Validator outcome:** what an authorized validator observed about one response.
2. **Evidence disposition:** what that observation permits the system to record about one scoped attempt.
3. **Cognitive support:** instructional help consumed before proof.
4. **Access accommodation:** a construct-preserving way to perceive or operate the task.

The canonical version-2 values are:

```ts
type ValidatorOutcome = "pass" | "fail" | "inconclusive" | "not_scored";

type EvidenceDisposition =
  | "demonstrated"
  | "not_demonstrated"
  | "open_question"
  | "not_evaluated"
  | "invalidated";

type SupportTier =
  | "none"
  | "attention"
  | "cue"
  | "representation"
  | "example"
  | "repair"
  | "solution";

type SupportSource = "authored" | "model" | "human";
```

Every evidence record also names:

- World/package/content/policy versions and integrity hash;
- capability, proof claim, task, task-family, representation, and context IDs;
- proof authority: `honour_based | server_enforced | human_observed`;
- validator ID/version and its raw bounded `ValidatorOutcome`;
- criteria-level results rather than a generic partial score;
- cognitive support event IDs consumed before proof;
- access accommodation IDs used during proof;
- source snapshot IDs/digests;
- response digest where appropriate, not raw learner text;
- explicit uncertainty, contamination, correction/supersession, and remains-untested fields;
- the exact bounded learner-facing claim.

`demonstrated` always means “the named criteria were met once under the recorded conditions.” UI copy must include that scope. It never means mastery, retention, intelligence, broad transfer, certification, or permanent capability.

### Validator-to-evidence derivation

| Validator outcome | Default evidence disposition | Required exception handling |
| --- | --- | --- |
| `pass` | `demonstrated` | `invalidated` if proof integrity, version, authority, or contamination fails |
| `fail` | `not_demonstrated` | May be `open_question` only when the learner explicitly submits uncertainty and the authored claim treats that as the truthful result |
| `inconclusive` | `open_question` | Never upgrade from model confidence or a UI score |
| `not_scored` | `not_evaluated` | Requires later authorized human/deterministic review to change through a superseding event |

An invalid or contaminated attempt remains a learning attempt but cannot become independent evidence. Corrections append a new event; they never rewrite the original.

### Runtime compiler binding amendment

The bounded local receipt and its ADR-001 compiler use a closed, canonical input surface. The compiler does not infer authority from an adapter-supplied receipt:

- the receipt carries the retained `package_integrity_hash` and `runtime_binding_digest`; compilation succeeds only when each receipt value, released content-manifest value, and fresh digest of the current package/binding are identical;
- the compiler re-runs the released validator and requires exact canonical equality for validator ID/version, validation code, outcome, and ordered criteria/evidence before deriving disposition;
- each runtime binding names one exact released proof task code. The exact validator identity and task code are committed into a stable opaque task ID; outcome/result code never changes task identity, and a display task-family ID is never substituted for an invalid or lossy task code;
- each runtime binding owns a closed support-action policy catalog. The compiler derives or validates action, stage, source, tier, policy, provider/model permission, and fallback permission from that catalog rather than trusting receipt fields;
- `solution` support or any out-of-policy, protected-phase, answer-exposing, or model provenance mismatch invalidates independent evidence; unsupported support facts fail closed;
- deterministic event identity derives only from these canonical, receipt-bound facts. Two transient inputs with the same canonical validation result may compile identically; inputs with different canonical results cannot share an accepted chain.

The local receipt remains honour-based and non-durable. These bindings prevent accidental semantic promotion inside the local compiler; they do not turn a client-controlled run into server-enforced proof.

### Version-2 persistence authority amendment

The first adult-owned PostgreSQL appender persists only the current compiler-produced learner event chain. An authenticated adult owner does not thereby become a validator, reviewer, policy actor, or system actor:

- the direct appender accepts `actor.type = learner` only and retains the authenticated adult as the separate row owner;
- it rejects `world_run.corrected` and every `validator`, `human`, `policy`, or `system` actor until a separately reviewed server-owned authority path binds an authenticated actor, decision scope, target event, and policy version;
- TypeScript retains correction shape and replay semantics, but schema availability is not durable correction authority;
- `runtime_binding_digest` is present in the v2 run start and evidence payload, retained in the aggregate head, and required to equal across the chain;
- one global event-ID claim/lock boundary spans version-1 and version-2 histories. Different aggregate or idempotency keys cannot race the same event UUID into both journals;
- the outbox event document and event identity are immutable. Delivery state may change only through a narrow operation that cannot rewrite the copied event.

These are persistence admission rules, not a claim that the current local receipt is server-enforced evidence. Public persistence remains disabled until the wider configured-project, concurrency, backup/restore, deletion/export, abuse-control, and recovery gates pass.

### Cognitive support and access

- `SupportTier` describes instructional intensity. `solution` is recordable during learning but always contaminates the current proof task.
- `SupportSource` describes who/what supplied support. Model metadata additionally records provider/model/action/policy versions without learner text.
- Accessibility is not a support tier or penalty. `AccessAccommodation` is a separate typed record with accommodation kind, representation/modality, construct-preservation decision, policy version, and user control.
- Any cognitive-support event after protected proof opens, any protected-operation overlap greater than zero, answer-changing, answer exposure, experiment replay, or unauthorized model/tool call invalidates independent status.
- A construct-changing accommodation does not become cognitive shame; it routes to an alternative valid task/claim or records `not_evaluated` for the original construct.

### Version-1 mappings

| Existing value | Canonical projection |
| --- | --- |
| event/device `proved` | `demonstrated` |
| event/device `not_proved` | `not_demonstrated`, unless explicit uncertainty maps to `open_question` |
| event/device `open_question` | `open_question` |
| shared `demonstrated` | `demonstrated` |
| shared `not-demonstrated` | `not_demonstrated` |
| shared `partial` | `not_demonstrated` plus criteria-level detail; never a fractional capability claim |
| shared `unscored` | `not_evaluated` |
| SQL `pass` | validator `pass`, then derive evidence disposition |
| SQL `fail` | validator `fail`, then derive evidence disposition |
| SQL `inconclusive` | validator `inconclusive`, then derive evidence disposition |
| SQL `not_scored` | validator `not_scored`, then derive evidence disposition |
| DB `wait` | no consumed cognitive support; an offer/refusal event may remain factual |
| DB `attention/cue/representation/example/repair` | same canonical tier |
| contract `attention-cue` | `cue` |
| contract `contrast` | `cue` or `representation`, determined by authored content metadata |
| contract `explanation` | `example` or `repair`, determined by authored content metadata |
| contract `solution` | `solution` |
| source `ai` or event `model` | `model` |
| `model_interpretation` | model-sourced support with its bounded action; it is not itself an intensity tier |
| source/kind `accessibility` | separate `AccessAccommodation`; never cognitive support |

Version-1 event rows and device exports remain immutable. New code may read them only through a named compatibility projector. It must not write mixed v1/v2 payloads or silently strengthen a legacy result. The additive event/database migration and the World runtime must share golden replay fixtures before persistence is integrated.

## ADR-002 — Review workflow and published World lifecycle are separate

### Decision

An authoring/review workflow is not a release aggregate.

Canonical review states:

```text
draft
  -> source_needed
  -> factual_review
  -> pedagogy_review
  -> access_review
  -> safety_review
  -> proof_review
  -> approved | rejected | withdrawn
```

Reviews may return to an earlier state with a new version and reason. `approved` means a named immutable package snapshot passed the required reviews. It does not make the package visible to learners.

Canonical published-release states:

```text
published -> disabled | retired | superseded
```

- `published` requires an approved package snapshot, exact source snapshots, validator/access/policy versions, bundle digest, named publisher, and rollback target.
- `disabled` is an incident/safety/rights stop. The same release is not silently re-enabled; remediation produces a reviewed release event/version.
- `retired` ends availability without a replacement.
- `superseded` points to a separately published successor.
- Draft/review database rows are authoring projections and never appear in the public registry.

Current mappings:

| Existing state | Canonical meaning |
| --- | --- |
| pack `released` | release `published` |
| pack `suspended` | release `disabled` |
| pack `draft` | review `draft`, not a release |
| SQL release `draft/review` | authoring projection only |
| SQL release `published/disabled/retired` | corresponding release state |
| event `world_package.published/disabled/superseded` | corresponding release event |
| source `withdrawn` | withdrawn review/source version; published Worlds referencing it must be disabled or superseded through separate events |

Add `retired` only through an additive event schema/migration. Do not repurpose `disabled` or `superseded`.

## ADR-003 — Canonical source identity and review binding

### Decision

A URL and a Boolean `reviewed` flag are metadata, not publication authority. Every factual World release binds an immutable source tuple:

```ts
interface SourceBinding {
  sourcePackageId: string;
  sourcePackageVersion: string;
  sourceItemId: string;
  sourceSnapshotDigest: `sha256:${string}`;
  locatorIds: string[];
  claimIds: string[];
  rightsRecordId: string;
  reviewDecisionIds: string[];
}
```

Identity rules:

- Package IDs are stable semantic identifiers; package versions are immutable and independently hashed.
- Item IDs identify the continuing source; the snapshot digest identifies exact content inspected. URL, retrieval time, archive/object path, publisher, version label, license, and jurisdiction are metadata on that snapshot.
- Claim IDs and locator IDs bind a reviewed claim/paraphrase/quotation to the exact snapshot.
- Rights records name allowed use, limitations, expiry/review trigger, and reviewer.
- Review decisions name reviewer identity/role, scope, decision, timestamp, policy version, conflicts/dissent, and supersession.
- A Studio `sourceNeed` is an unresolved requirement. It becomes a `SourceBinding` only after source acquisition, rights, claim/locator, and human review succeed.
- A source correction/withdrawal never mutates a published binding. It disables or supersedes affected releases and preserves audit history.

World manifests may keep human-readable source metadata as a projection, but registry publication ultimately validates the exact bindings above.

## ADR-004 — The World runtime extends the existing pack and owns common effects

### Decision

There is one World identity and one package registry. Packet E extends `LearningWorldPack`; it must not introduce parallel World/package/proof/evidence IDs.

The stable semantic stages are:

```text
encounter
commit_model
interpret_two_readings
name_disagreement
commit_test_prediction
run_separating_experience
governed_support
reconstruct
withdraw_instructional_ai
cold_transfer
bounded_result
return_or_apply
```

A domain may visually rename or combine display frames, but its event trace and conformance adapter preserve these boundaries. Exactly two plausible readings are used in the compiler scene. W0/foundation packages may use an explicitly reviewed protocol variant later; they do not silently weaken proof semantics.

Each pack adds a versioned runtime binding to:

- domain reducer and allowed actions;
- authored fixtures and separating-experience controller;
- domain validator and task-family IDs;
- support policy/content references;
- proof-open lock and contamination rules;
- event mapper using ADR-001;
- access/accommodation alternatives and focus/motion hooks;
- source bindings using ADR-003;
- device projection adapter derived from canonical events.

The World package and runtime binding are integrity-bearing release artifacts. Both digests are retained in the content package manifest and copied into each bounded receipt. Runtime support references are a closed per-action policy catalog, not a single descriptive policy label. Assistance events retain bounded provider/model/fallback metadata when applicable. Any change to validator identity, task mapping, support permissions, proof lock, source binding, or access semantics changes the digest and requires the receipt/compiler version contract to move with it.

The runtime owns common state sequencing, policy decisions, authorized side effects, event append, proof lock, and evidence projection. Domain plugins own truth, correct answers, task construction, representations, and validators. UI components render runtime/domain state; they do not write evidence directly.

Primary Source Reasoning remains the first migration because it stresses source identity, non-STEM truth, and a currently missing evidence route. The first Packet E slice does not migrate the other three Worlds, change public semantics, or connect durable cloud writes.

## ADR-005 — Age, guardian, identity, and authoring-mode enforcement

### Decision

FORGE distinguishes four inputs:

1. **Device age preference:** learner-selected local UX mode; not identity or verified age.
2. **Grown-up-present confirmation:** local co-use acknowledgement for authored, device-only activity; not legal guardian authority or consent.
3. **Authenticated age/relationship authority:** future server-owned evidence with policy, expiry, recovery, and appeal.
4. **Target-audience metadata:** the age band an adult author selects for a lesson draft; not the author's or learner's identity.

Enforcement rules:

- Anonymous/public operation defaults to the most protective policy: no persistence, sharing, people contact, managed provider call, open web, or unrestricted retrieval.
- Choosing teen/adult content may change representation/depth but cannot authorize an S2–S4 side effect.
- A World whose manifest requires `guardianManaged` must place every catalog, direct-route, reload, and deep-link entry behind the same local grown-up-present gate for under-13 mode. Query parameters are hints, never authority.
- Route, API, server action, and database policy each validate their own boundary; passing UI does not grant backend authority.
- Local grown-up confirmation can authorize only S0/S1 authored device activity. It cannot authorize cloud identity/evidence, external model/source calls with learner data, sharing, contact, or institutional records.
- Public production cloud signup remains disabled while age assurance/guardian relationship/consent/recovery/safeguarding operation is absent. An `18 or older` checkbox may be used only in a controlled adult-only test environment and must be described as self-attestation, never as proof that under-18 access is impossible.
- Disposable integration tests use named adult test accounts only. They do not enable ordinary public signup.
- Lesson Studio is an adult authoring/draft surface. Its `ageMode` describes the proposed lesson audience. It must not accept child learner data, and managed credentials remain disabled until authenticated author, quota, abuse, privacy, and review controls pass.
- Under-18 cloud identity, evidence sync, open-web retrieval, managed provider calls, and all interpersonal features remain separately gated and off by default.

Direct action/API tests must cover missing/forged device preference, catalog bypass, deep links, query manipulation, reload, and calling server actions without the UI.

## ADR-006 — Release identity and production truth

### Decision

A release is identified only by this frozen tuple:

```text
source SHA
tested SHA and retained artifact IDs
immutable deployment ID and URL
public alias and alias-resolution timestamp
build/runtime mode
cloud/provider feature flags without secrets
database project and migration identity, or explicit not configured
critical browser/CSP/console/network verification packet
rollback deployment/SHA and rehearsal result
named release decision and time
```

Source, tested, and deployed SHA must be equal unless a documented reproducible build-metadata commit is the only difference. A branch, dashboard label, public URL, old evaluation report, or successful build cannot fill a missing tuple field.

Candidate states:

```text
BUILT_LOCAL
PUSHED
DEPLOYMENT_BLOCKED
DEPLOYED_CANDIDATE
PRODUCTION_VERIFIED
ROLLED_BACK
```

A blocked candidate does not change the public alias. Only the principal, with user deployment authority, may promote a candidate after Packet D and the complete integration verification gate pass.

## ADR-007 — Source authority is content-addressed, scoped, and independently reviewed

### Decision

FORGE source authority is an append-only relationship between an exact source snapshot, the claims and locators inspected within it, the permitted use of those materials, and scoped human review decisions. A URL, download success, provider citation, model summary, schema-valid object, checksum, or generic `reviewed` label cannot create source authority by itself.

The stable object model is:

```text
SourcePackage
  -> SourceItem
    -> SourceSnapshot (immutable bytes + digest)
      -> SourceLocator (exact region in the snapshot)
        -> SourceClaim (bounded statement supported, contradicted, or left open)
  -> RightsRecord
  -> SourceReviewDecision[]
  -> Correction / Withdrawal[]
```

Identity and lifecycle rules:

- Existing `source.*` IDs remain the continuing source-item identities used by World manifests. W5-D must not replace them with a parallel namespace.
- `source-package.*` identifies a continuing reviewed package. Semantic package versions are immutable; an exact package digest covers every item snapshot, locator, claim, rights record, review decision, correction, and policy reference in canonical order.
- A snapshot is identified by `sha256:<64 lowercase hex>`. Its metadata records media type, byte length, acquisition mode, observed timestamp, publisher/version label when available, canonical locator, and an internal object reference. Raw source bytes do not enter the learning-event journal.
- Acquisition modes are closed and policy-owned. The first slice permits checked-in authored fixtures and principal-supplied reviewed snapshots only. It provides no crawler, arbitrary URL fetch, open-web retrieval, or model-selected source transport.
- A locator names an exact page, section, paragraph, timestamp, table cell, image region, or authored-fixture field. It cannot point outside its snapshot.
- A claim records the bounded statement and its relation to named locators. Claim text is curriculum content, not learner data, but remains size-bounded and versioned.
- Rights review records allowed product uses, attribution requirements, jurisdiction/territory when relevant, expiry or review trigger, and limitations. Unknown rights cannot be coerced into permission.
- Review scopes are separate: acquisition/authenticity, rights, factual/epistemic, pedagogy, accessibility, age/safety, and proof design. A reviewer decision grants only its named scope. No decision may approve its own authored evidence, silently assume another scope, or claim accountable human authority for an AI worker.
- A package is `review-candidate` until every policy-required scope is represented by an accepted, non-expired decision from an authorized human identity. Code and AI agents may assemble or lint candidates, but cannot produce the human-authority condition.
- Correction, expiry, rights change, or withdrawal appends a new lifecycle fact. Historical snapshots and decisions remain immutable. Affected World releases become `review-required`, disabled, or superseded through separate package lifecycle authority; the source service never mutates a released binding in place.
- Source text is always untrusted data. Prompt assembly must delimit it, exclude tool/policy instructions from it, and prevent it from selecting tools, URLs, credentials, publication state, or evidence outcomes.

Interoperability mappings remain explicit and optional rather than inflating the internal contract:

- snapshot, acquisition, transformation, and reviewer responsibility may export as W3C PROV-O Entity/Activity/Agent relationships;
- locator kinds align where practical with W3C Web Annotation selectors such as fragment, text quote/position, data position, SVG region, and time state, but always target the immutable FORGE snapshot rather than mutable remote bytes;
- a rights record may carry an SPDX license expression when that vocabulary applies, alongside product-use limitations that an SPDX identifier alone cannot express;
- a validated C2PA Content Credential may be recorded as one provenance observation for supported media. It establishes a cryptographic content/history claim within that trust model; it does not establish factual truth, pedagogical quality, rights clearance, or FORGE publication authority.

Normative external references for these mappings are [W3C PROV-O](https://www.w3.org/TR/prov-o/), the [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/), [SPDX 3.0.1 Licensing](https://spdx.github.io/spdx-spec/v3.0.1/model/Licensing/Licensing/), and the current [C2PA specification index](https://spec.c2pa.org/). FORGE stores the exact mapping/spec version with any exported or validated record.

The first W5-D implementation is a pure contract/replay boundary. It may prove canonical identity, deterministic state, dependency invalidation, and fail-closed review completeness. It may not claim live acquisition, external authenticity, durable storage, accountable human review, or publication operation.

## ADR-008 — Curriculum breadth is an explicit capability graph, not a recommendation score

### Decision

FORGE represents curriculum as a versioned directed acyclic graph of the existing `capability.*` identities. World packages implement capabilities; the curriculum graph does not create a second source of capability truth or decide subject correctness.

Each capability node declares:

```text
capability ID + exact version
construct and learner-facing purpose
nine-area entitlement membership
prerequisite capability IDs
reviewed alternatives and equivalence limits
supported age/depth/access modes
required World/source/policy identities
evidence requirements and explicit untested claims
position: foundation | chosen-frontier | project-application | relationship | return-proof
availability: released | review-candidate | identified-gap
```

Graph rules:

- The nine entitlement areas remain exactly those in Packet C: language/literacy, mathematics, science, history/source reasoning, computing/AI, arts/design, practical life, civic/media, and health/movement.
- Grade levels, seat time, engagement, streaks, comparative rank, inferred ability, model confidence, or hidden weights do not create prerequisite edges.
- An edge means a reviewed capability dependency. It must name why the dependency exists, the evidence required to satisfy it, and any reviewed alternative. Missing, self-referential, cyclic, cross-version-ambiguous, or inaccessible edges fail closed.
- `released` is derived only from an exact released and available World package whose capability, validator, runtime, source, safety, and policy identities match. A graph author cannot mark a node released directly.
- `review-candidate` is visible as proposed coverage only. `identified-gap` is visible absence. Neither may be routed as a lesson, counted as coverage, or used to produce a readiness/completion claim.
- The graph may explain deterministic options: why a capability is relevant, which prerequisite is missing, what alternative exists, what evidence would be required, and who controls the next choice. It may not select a path through opaque model output or optimize engagement.
- Learner/guardian choices are separate append-only state. They may choose, defer, pause, contest, request an alternative, or stop without penalty. These choices do not rewrite the graph or create evidence.
- Construct-changing access alternatives are disclosed and produce a different evidence condition; construct-preserving alternatives remain first-class routes rather than exceptions.
- A complete nine-area map proves only that every area is represented as released, candidate, or gap. It does not prove sufficient curriculum, a balanced education, homeschool readiness, accreditation, jurisdiction compliance, retention, efficacy, or learner fit.

The first W5-D graph is a public-truth and authoring contract, not a learner schedule or recommendation service. Individualized path state, delayed return, jurisdiction packs, people relationships, attendance, portability, and institutional reporting remain later gates.

## Implementation order and worker ownership

1. Packet E proposes the additive runtime binding and ADR-001 event projector against existing pack IDs.
2. Packet B consumes the accepted projector for adult-only persistence; it does not sync existing UI/device records directly or invent schemas.
3. Packet F implements ADR-002/ADR-003 review/source contracts without publishing.
4. Packet A preserves these semantics while unifying presentation/access.
5. Packet C consumes stable capability/package IDs and returns review evidence only.
6. Packet D implements ADR-006 release evidence without deployment authority.
7. W5-A closes immutable dependency identity before another code release.
8. W5-B and W5-C establish compiler/SQL parity while public persistence remains disabled.
9. W5-D implements ADR-007 and ADR-008 as pure source/curriculum contracts before any acquisition, recommendation, or publication surface.
10. W5-E may enter the released registry only after the runtime, source, curriculum, content/proof, and access gates independently pass.
11. The principal reviews cross-lane diffs, resolves exact schema ownership, and integrates one lane at a time.

No current worker may rewrite version-1 event/database history, enable cloud/provider credentials, publish a generated package, or call architecture acceptance from its own handoff.
