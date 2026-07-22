# FORGE Architecture Baseline

## 1. Architectural thesis

FORGE remains a modular Next.js monolith around a typed, append-only learning/evidence spine until measured scale, jurisdictional isolation, or independent deployment needs justify a split. Premature services would distribute policy before the trust model is stable.

The architecture separates five forms of authority:

1. **Authored authority:** versioned World packages, sources, rubrics, validators, and policies.
2. **Learner authority:** questions, commitments, work, support requests, data rights, and chosen sharing.
3. **Deterministic authority:** state transitions, permissions, proof locks, scoring, evidence derivation, idempotency, and expiry.
4. **Model proposal:** interpretation, draft assembly, comparison, rephrasing, and attention direction behind strict schemas.
5. **Human review authority:** publication, source acceptance, safeguarding decisions, external assessment, appeals, and institutional claims.

No layer may impersonate another.

## 2. Target module map

| Boundary | Current/target paths | Owns | Must not own |
| --- | --- | --- | --- |
| Product shell | `app/**`, `src/components/forge/**` | navigation, intake, access surfaces, rendering, disclosure | evidence truth, validator answers, provider secrets |
| Learning kernel | `src/forge/**` | IDs, manifests, capabilities, policies, typed events, registry invariants | subject-specific correctness |
| World runtimes | `src/worlds/**`, `src/components/worlds/**` | authored domain state, separating tests, support ladder, transfer validator | global identity, generic ranking, open-ended model authority |
| Path compiler | `src/lib/forge-planner/**` | deterministic routing, Learning Contract, safe unknown-topic plan | generated course publication |
| Lesson intelligence | `src/lib/lesson-studio/**`, `app/api/forge/lesson-draft/**` | provider adapters, strict draft schema, transient BYOK, review requirements | live learner proof, factual verification, publishing |
| Evidence | `src/lib/forge-evidence/**`, `src/forge/event*` | append/replay, provenance, local export/delete, bounded states | mastery percentages, identity profiles, raw chat |
| Identity and rights | `src/lib/forge-auth/**`, `src/lib/forge-profile/**`, `app/login`, `app/account` | session validity, minimal device mode, future consent/rights entry points | verified-age inference, guardian authority from metadata |
| Durable data | `supabase/**` | RLS, append-only records, consent/grants, outbox, privacy operations | client service-role authority, silent evidence sync |
| Evaluation/release | `tests/**`, `evals/**`, `docs/operations/**` | regression gates, identity, observability, rollback evidence | product claims from build health |

## 3. Canonical learning state

Every World uses a domain-specific reducer but must implement the same semantic protocol:

```text
ENCOUNTER
  -> COMMIT_MODEL
  -> INTERPRET_TWO_READINGS
  -> NAME_DISAGREEMENT
  -> COMMIT_TEST_PREDICTION
  -> RUN_SEPARATING_EXPERIENCE
  -> GOVERNED_SUPPORT (zero or more bounded events)
  -> RECONSTRUCT
  -> WITHDRAW_INSTRUCTIONAL_AI
  -> COLD_TRANSFER (single protected submission)
  -> BOUNDED_RESULT
  -> RETURN_OR_APPLY
```

Worlds may rename the visual stages but may not erase the semantic boundaries. Domain code owns correct answers and validator logic. Proof mode rejects hints, solution-generating AI, experiment replay, answer-changing, and repeated submission. Access accommodations remain available and are recorded separately from cognitive assistance.

## 4. Event and evidence spine

The event journal is the canonical history for future durable operation. Every event has a stable ID, aggregate ID/version, actor class, occurred/recorded timestamps, policy/content versions, idempotency key where relevant, and a validated payload. Derived read models are disposable; evidence claims are not.

Required event families:

- journey and World-run lifecycle;
- learner commitment and reconstruction;
- assistance offered, authorized, consumed, or refused;
- proof opened, contaminated, submitted, validated, or invalidated;
- source/content publication, withdrawal, and correction;
- access/consent/grant creation, expiry, revocation, and deletion;
- export, sharing, review, appeal, and privacy operations;
- provider draft requested, rejected, returned, reviewed, or discarded.

The current typed spine and staged SQL migration exist, but UI-wide durable replay is not complete. Until it is, visible cloud counters or timelines must not claim canonical status.

## 5. AI and provider boundary

Provider adapters are server-side allowlisted transports. BYOK credentials are request-scoped, never written to browser storage, never returned, and never accepted through arbitrary URLs. Managed credentials are off by default and require provider disclosure, cost/rate controls, and release approval.

Model output classes:

| Class | Allowed use | Required gate |
| --- | --- | --- |
| Interpretation proposal | map learner words to authored uncertain readings | strict schema, verbatim support, compatibility/leakage validation, fallback |
| Routing/rephrase proposal | neutral rephrase after deterministic route freezes IDs | exact ID echo, no new source/content claims |
| Lesson draft | propose phenomenon, two readings, test, explanation, transfer, source needs | strict shared schema, unverified label, human review before publication |
| Source synthesis | compare reviewed source records | retrieved/versioned inputs, citation binding, claim-evidence review |
| Support proposal | direct attention within a code-authorized support level | answer-leakage validation, assistance event, never during protected proof |

Models never own physics/math truth, source verification, content publication, proof correctness, evidence upgrade, child access policy, identity, sharing, or sanctions.

## 6. Curriculum publication pipeline

The system may generate drafts at arbitrary breadth, but only reviewed packages enter the catalog:

```text
question/draft
  -> source plan
  -> source acquisition + rights record
  -> factual/epistemic review
  -> explanation and misconception review
  -> separating-test/validator implementation
  -> accessibility alternatives
  -> age/safety review
  -> proof contamination review
  -> versioned package + rollback target
  -> registry publication
```

Every published World declares domain grammar, capability, age/access modes, evidence tier, reviewed sources, deterministic validator, allowed AI actions, proof conditions, limitations, return interval, and owner/reviewer/version history.

## 7. Identity, minors, and sharing

- Device age mode and guardian-present flags are UX preferences, not verified age or consent evidence.
- Under-18 cloud identity remains disabled until a server-owned guardian relationship, consent/assent record, recovery/appeal path, jurisdictional policy, and safeguarding operation pass review.
- Adult cloud access may be enabled only after abuse controls and a live configured-project integration test.
- Identity does not automatically make local evidence cloud data.
- Evidence sync is explicit, item-scoped, reversible where law/policy permits, and separated from sharing.
- Sharing grants name subject, grantee, scope, purpose, expiry, revocation, and audit events; there is no public-by-default evidence.
- No unverified adult-minor messaging or mentor marketplace enters the release path.

## 8. Side-effect classes

| Class | Example | Default authority |
| --- | --- | --- |
| S0 pure | validate, plan, derive, render | automatic after schema/policy checks |
| S1 local reversible | local profile, local evidence append/delete, draft discard | learner action |
| S2 private durable | cloud identity, private sync, consent/grant | explicit authenticated action + RLS + audit |
| S3 interpersonal | invite, mentor/educator access, feedback request | verified role + consent + expiry + safeguarding |
| S4 institutional/public | publish curriculum, issue claim/credential, expose data, deploy migration | named reviewer/owner approval and rollback evidence |

Workers may implement S0/S1 behavior inside assigned paths. They may stage S2-S4 code and tests, but may not activate external side effects without principal and user authority.

## 9. Failure posture

- Model unavailable or invalid: deterministic authored fallback or explicit unavailable draft; journey never blocks silently.
- Source missing or stale: stop the factual/publication claim; do not fill gaps from model memory.
- Proof contaminated: retain the learning attempt but withhold independent-evidence status; schedule a fresh case.
- Event conflict or replay mismatch: fail closed, preserve original journal, surface reconciliation state.
- Auth uncertainty: no identity-derived privilege; device mode remains usable.
- Consent/grant uncertainty: deny sharing/contact/sync and surface recovery steps.
- Content incident: unpublish the affected version, preserve audit/provenance, provide correction/appeal path.
- Deployment failure: keep last known-good alias and record exact candidate/commit/error.

## 10. Architecture change rule

A worker may extend an existing contract inside its lane. Any change to cross-lane IDs, event envelope, proof semantics, evidence claim, age policy, data ownership, provider key handling, publication state, or side-effect authority requires a short architecture decision proposal to the principal before implementation. Silence is not approval.
