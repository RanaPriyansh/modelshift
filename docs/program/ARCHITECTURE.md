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
| Capability-map compiler | target `src/forge/capability-map*`, `src/lib/forge-paths/**` | adult intent contract, reviewed graph projection, candidate/gap state, learner-edit patches | curriculum publication, hidden ranking, proof upgrade |
| Resource catalog/orchestrator | target `src/forge/resources/**` | candidate/review separation, observation identity, deterministic eligibility, lifecycle, pedagogical role | source truth, engagement feed, automatic review |
| External resource adapters | target `src/lib/resource-providers/**` | sanitized capability discovery and official provider metadata under explicit authority | raw learner text, media/transcript scraping, learner-visible assignment |
| Representation registry | target `src/forge/representations/**` | observation/simulation/diagram/analogy authority, assumptions, controls, reviewed alternatives with construct status | generated media as empirical evidence |
| Practice/project compiler | target `src/forge/projects/**`, `src/forge/practice/**` | authentic task, materials/safety, artifact provenance, critique, defence, proof binding | autonomous high-stakes grading |
| Educator review port | target `src/forge/educator/**` | named approval/replacement/annotation, workload evidence, learner-visible decisions | covert surveillance, raw chat, silent evidence upgrade |
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

Target semantic event families:

- journey and World-run lifecycle;
- learner commitment and reconstruction;
- assistance offered, authorized, consumed, or refused;
- proof opened, contaminated, submitted, validated, or invalidated;
- source/content publication, withdrawal, and correction;
- access/consent/grant creation, expiry, revocation, and deletion;
- export, sharing, review, appeal, and privacy operations;
- provider draft requested, rejected, returned, reviewed, or discarded;
- learning intent created, clarified, map proposed, learner-edited, validated, reviewed, assigned, expired, withdrawn, or superseded;
- external resource observed, reviewed, rejected, assigned, refreshed, changed, expired, incident-held, withdrawn, or replaced;
- representation and project package reviewed, assigned, revised, invalidated, or retired;
- educator review requested, decided, contested, replaced, or expired.

These bullets are semantic requirements, not a declaration that every event is currently legal. The accepted journal currently admits only its reviewed `world_run` and `world_package` aggregate families. New Wave 6 names remain fixture-only until W6-0 accepts additive aggregate schemas, event/envelope versions, transition/projector authority, old/new replay compatibility, migration, unknown-event rejection, writer/tenant rules, and rollback. The current typed spine and staged SQL migration exist, but UI-wide durable replay is not complete. Until it is, visible cloud counters or timelines must not claim canonical status.

## 5. AI and provider boundary

Provider adapters are server-side allowlisted transports. BYOK credentials are request-scoped, never written to browser storage, never returned, and never accepted through arbitrary URLs. Managed credentials are off by default and require provider disclosure, cost/rate controls, and release approval.

Model output classes:

| Class | Allowed use | Required gate |
| --- | --- | --- |
| Interpretation proposal | map learner words to authored uncertain readings | strict schema, verbatim support, compatibility/leakage validation, fallback |
| Routing/rephrase proposal | neutral rephrase after deterministic route freezes IDs | exact ID echo, no new source/content claims |
| Capability-map proposal | propose capabilities, concepts, prerequisites, representations, projects, or gaps over a bounded reviewed graph neighborhood | strict schema, immutable ID echo, candidate labeling, deterministic graph validation, human review before assignment |
| Resource candidate proposal | propose search terms or candidate mappings for a capability | sanitized capability query, official provider adapter, no assignment or review authority |
| Representation proposal | draft a diagram, analogy, description, or source-bound visual plan | candidate state, authority label, domain/source/access review before publication |
| Lesson draft | propose phenomenon, two readings, test, explanation, transfer, source needs | strict shared schema, unverified label, human review before publication |
| Source synthesis | compare reviewed source records | retrieved/versioned inputs, citation binding, claim-evidence review |
| Support proposal | direct attention within a code-authorized support level | answer-leakage validation, assistance event, never during protected proof |

Models never own physics/math truth, source verification, content publication, proof correctness, evidence upgrade, child access policy, identity, sharing, or sanctions.

The proposed Wave 6 path sits before the World runtime:

```text
adult intent
  -> existing forge-planner policy gateway
  -> authored or model map proposal
  -> deterministic capability-map validation
  -> learner edit
  -> named scoped map/resource/project review
  -> separate publisher authority
  -> deterministic eligible route
  -> existing World and evidence protocol
```

Unknown-topic proposals remain candidate maps with explicit gaps. They cannot synthesize reviewed curriculum identities, become assignable, or imply that a valid course exists.

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
| S1E external read with disclosure | server-entitled adult click-to-load reviewed media; later sanctioned metadata discovery | explicit learner action plus current server-issued purpose-bound entitlement, resource eligibility, provider policy, minimization, timeout, and fallback |
| S2 private durable | cloud identity, private sync, consent/grant | explicit authenticated action + RLS + audit |
| S3 interpersonal | invite, mentor/educator access, feedback request | verified role + consent + expiry + safeguarding |
| S4 institutional/public | publish curriculum, issue claim/credential, expose data, deploy migration | named reviewer/owner approval and rollback evidence |

Workers may implement S0/S1 behavior inside assigned paths. They may stage S2-S4 code and tests, but may not activate external side effects without principal and user authority.

`S1E` does not inherit from ordinary local rendering. It crosses a third-party trust boundary and can expose a network identifier, provider metadata, tracking, advertising, region, quota, and changing content. An `adult` profile field, checkbox, device mode, or self-attestation cannot grant it. It therefore remains disabled until the adult authentication/tenancy/abuse configured-project gate, server-issued pilot entitlement, connector-specific review, and release gate pass.

## 9. Failure posture

- Model unavailable or invalid: deterministic authored fallback or explicit unavailable draft; journey never blocks silently.
- Source missing or stale: stop the factual/publication claim; do not fill gaps from model memory.
- Proof contaminated: retain the learning attempt but withhold independent-evidence status; schedule a fresh case.
- Event conflict or replay mismatch: fail closed, preserve original journal, surface reconciliation state.
- Auth uncertainty: no identity-derived privilege; device mode remains usable.
- Consent/grant uncertainty: deny sharing/contact/sync and surface recovery steps.
- Content incident: unpublish the affected version, preserve audit/provenance, provide correction/appeal path.
- Unknown intent/topic: return a bounded clarification or explicit candidate/gap map; never fabricate reviewed coverage.
- External resource changed, missing, stale, blocked, inaccessible, or unsafe: hold eligibility and route to a reviewed alternative with explicit construct status; never count playback as completion or evidence.
- External provider unavailable or terms change: disable the connector without breaking internal reviewed routes.
- Review capacity or content/safety error budget exhausted: freeze new assignment/publication rather than weaken review.
- Deployment failure: keep last known-good alias and record exact candidate/commit/error.

## 10. Accepted cross-lane decisions

The canonical evidence/support mapping, content/release lifecycle, source identity, World runtime extension, age/guardian enforcement, and release identity tuple are resolved in [Principal Architecture Decisions](ARCHITECTURE_DECISIONS.md). Workers must implement against those decisions or stop with `NEEDS_DECISION`; they must not create compatibility by silently weakening them.

## 11. Architecture change rule

A worker may extend an existing contract inside its lane. Any change to cross-lane IDs, event envelope, proof semantics, evidence claim, age policy, data ownership, provider key handling, publication state, or side-effect authority requires a short architecture decision proposal to the principal before implementation. Silence is not approval.
