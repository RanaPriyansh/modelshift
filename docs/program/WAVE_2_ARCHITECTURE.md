# FORGE Wave 2 Architecture and Claim Boundary

**Released code/source SHA:** `6e95a33c4cd82e2b7529f3b5980766a7c13ed068`
**Projector chain:** `4dab5d9` + `f4179e9`
**Pathway chain:** `48ea3fd` + `30e1dde` + `2cf81ab`
**Release-verifier coverage:** `b5b3170`
**Public alias:** `https://modelshift.vercel.app`
**Production deployment:** `dpl_CBzgm4fAVqKy2U8MVLidiTAWTTJD`
**Immutable deployment URL:** `https://forge-learning-ffh45hv8c-ranapriyanshs-projects.vercel.app`

This is the post-release record for `6e95a33`. A later documentation-only commit is not deployed and does not alter the source, alias, deployment, immutable URL, or evidence tuple above. Nothing in this document upgrades a local receipt, in-memory event, verifier result, or availability page to durable authority.

## North star

FORGE should help a learner begin with a legitimate question, act without instructional help during protected proof, retain the conditions under which an outcome was produced, and see honest next possibilities without being pushed into a hidden path. The system must preserve uncertainty and limits rather than using completion, a model, or a page render to inflate a claim.

Wave 2 narrows that north star to three code-level contracts:

1. a deterministic, sealed, versioned runtime-attempt event path;
2. a public availability map that exposes released capability and gaps without directing a learner; and
3. release verification that can require the availability surface without deploying it.

## Accepted architecture summary

| Slice | Accepted behavior | Claim boundary |
| --- | --- | --- |
| Primary Source runtime attempt | A completed bounded local receipt can be projected from typed caller facts into a sealed ADR-001 v2 event chain. | The route does not invoke this projection. The receipt and projection are not durable, authenticated, server-authoritative, or trusted pathway evidence. |
| ADR-001 event/journal | Strict envelopes seal integrity hashes; the in-memory journal verifies order, causation, version coherence, proof/evidence binding, support/access provenance, and append-only correction shape. | It is not SQL persistence, an outbox, an authenticated append service, or a cross-device source of truth. |
| Pathways availability | A server-only projection maps released built-in capabilities and explicit entitlement-area gaps to `/pathways`. | It is not a coverage claim, curriculum, recommendation, learner state, a schedule, a prerequisite graph, a completion record, or a homeschool decision. |
| Release verifier | The checked-in verifier requires the `/pathways` marker alongside existing release-surface checks. | It performs verification only. It does not create a deployment, approve a public release, or establish educational validity. |

The code cut deliberately leaves runtime binding and persistence separate. Primary Source is the only World with the shared runtime. The other Worlds continue to own their existing behavior until their own migrations and conformance evidence are accepted.

## Non-goals and hard boundaries

Wave 2 does not establish any of the following:

- durable or authenticated evidence authority;
- SQL schema, migration, persistence, outbox, backup, restore, concurrency, or replay operation;
- application route binding from a World runtime receipt to the projector;
- cloud auth, child cloud auth, guardian identity, sync, or service-role use;
- live provider/model evaluation, managed-key enablement, cost/spend, or provider privacy approval;
- broad curriculum coverage, path graphs, recommendation, learner entitlement, attendance, accreditation, certification, or homeschool readiness;
- deployment of a later documentation-only SHA, or a new release/rollback tuple without another principal gate;
- screen-reader sessions, complete semantic/nonvisual equivalence, assistive-technology review, learner studies, learning efficacy, retention, or transfer claims.

No caller may turn missing evidence into a stronger status. No future persistence work may treat an existing device ledger, a local runtime receipt, or a Wave 2 event fixture as already trusted production data.

## Side effects and tool boundary

| Surface | Inputs and permitted effect | Forbidden or absent effect |
| --- | --- | --- |
| Runtime adapter | Local domain events, typed support/access receipt facts, and a domain validator. | No network, provider call, durable write, identity assertion, or source-authenticity assertion. |
| `projectAdr001RuntimeAttempt` | Typed caller-supplied IDs, times, policy/actor/authority, task facts, integrity facts, and a completed local receipt; seals events with SHA-256. | No ID/time fabrication, UI update, storage, network, SQL, auth, or provider call. An incoherent chain returns a typed refusal. |
| `ForgeEventJournal` | In-memory append/replay, integrity and transition checks, optional local encoding/decoding. | No database transaction, cloud sync, cross-user access, or durable authority. |
| `/pathways` availability projection | Read-only built-in package/catalog metadata on the server and explicit gap projection. | No learner input, local evidence, receipt, schedule, recommendation, completion state, or entitlement calculation. |
| Deployment verifier | Allowlisted read-only verification of candidate release surfaces, including `/pathways`; local/public verification passed 182/182 for `6e95a33`. | No deployment, mutation, credential enablement, durable authority, or educational approval. |
| Provider, Supabase, auth, or child-cloud tools | Not invoked by Wave 2. | No live provider/model evaluation, SQL persistence, cloud identity, child cloud auth, or data sync claim. |

## Canonical event state and compatibility

### Version 1 remains readable

`ForgeEvent` version 1 remains the compatibility envelope for existing local journal/event consumers. A v1 journal may replay v1 events. Wave 2 does not rewrite or silently relabel v1 payloads, device records, or prior local receipts.

### ADR-001 version 2 is additive and isolated

Version 2 is a sealed `world_run` event path for runtime attempts. It pins world/package/protocol/task/validator/source facts at start, records cognitive support separately from construct-preserving access accommodations, captures proof, and then records evidence plus completion. It retains both:

- raw validator outcome: `pass | fail | inconclusive | not_scored`; and
- canonical disposition: `demonstrated | not_demonstrated | open_question | not_evaluated | invalidated`.

The mapping is checked, not merely documented. `invalidated` and `not_evaluated` require typed validity facts; an authored uncertainty exception can support an `open_question` only for an otherwise valid failed proof with explicit uncertainty. Evidence records package/proof-authority matching, contamination reason codes, and construct-changing accommodation facts so an invalidation is auditable.

The journal rejects a mixed v1/v2 stream. It also rejects a v2 proof that changes pinned task/representation/context facts; evidence that omits or invents cognitive support; mismatched validator, source, access, proof, or task facts; demonstrated evidence after protected-operation-overlapping support; malformed correction state; and v2 world-package lifecycle events. Corrections append and supersede evidence history without rewriting the original event.

No SQL v2 schema exists. Before persistence, the v2 event shape, migration order, and an exact cross-runtime golden fixture need separate principal acceptance.

## Memory and context budget

Wave 2 preserves a deliberately small evidence context rather than creating a learner transcript reservoir.

| Budget or rule | Current boundary | Consequence |
| --- | --- | --- |
| Local journal capacity | `MAX_LOCAL_JOURNAL_EVENTS` is 10,000 in-memory events. | It is a local operational cap, not retention policy, durable history, or a cloud quota. |
| Event fields | Event references are bounded; evidence criteria, claims, and untested limits are bounded; support/source/access arrays are bounded and uniqueness-checked. | A caller cannot use the event as an unbounded transcript or arbitrary metadata sink. |
| Learner response | ADR-001 accepts a response digest or explicit uncertainty. Raw learner text is not part of the v2 event envelope. | Projection cannot supply a model with a hidden raw-answer archive. |
| Source context | Bound source fields are exact; legacy metadata is explicitly incomplete. | Missing source provenance stays incomplete; it cannot be promoted by context assembly. |
| Model/provider context | No provider is called by the runtime, projector, journal, pathway projection, or verifier. | There is no live model context budget, prompt retention policy, or model-quality claim in Wave 2. |

Any future durable service needs its own reviewed retention, consent, deletion, access-control, and context-minimization contract. It must not inherit one from these local bounds.

## Failures and fail-closed behavior

| Failure or attack | Current fail-closed behavior | Remaining gap |
| --- | --- | --- |
| Invalid or resealed envelope | Strict parsing and integrity verification reject it before journal acceptance. | There is no authenticated server append authority. |
| Inflated disposition or untyped invalidation | Schema mapping rejects it; projector refuses incoherent output. | Validity facts are caller inputs until an authorized verifier exists. |
| Omitted, invented, or protected-overlap support | Journal requires exactly all run support references and refuses demonstrated evidence after overlap. | Support facts are not yet emitted by every World. |
| Mismatched task, validator, source, access, or proof facts | Journal checks evidence/proof against the pinned start facts. | No route binds a real application attempt to this path. |
| Legacy source marked bound | Source provenance coherence rejects the false status. | Durable snapshot, rights, review, correction, and source-authenticity services do not exist. |
| Mixed versions or unusable v2 package event | Journal rejects mixed v1/v2 streams; v2 schema rejects package lifecycle events. | A reviewed additive v2 SQL migration has not been designed. |
| Incoherent correction input | Correction projection replays/verifies one completed coherent v2 chain before sealing; actor is validator or human only. | No durable reviewer identity, queue, or decision authority exists. |
| Missing pathway coverage | `/pathways` exposes an identified gap instead of selecting or generating a substitute. | No reviewed broad curriculum or path graph exists. |
| Candidate release missing identity | Staged `dpl_BLUz...` had exact health identity; promoted clone `dpl_37...` lost build-time/digests and failed release identity rather than being inferred valid. Direct production `dpl_CBzgm4fAVqKy2U8MVLidiTAWTTJD` then supplied the exact `6e95a33` tuple. | The incident proves identity failure is visible, not that rollback is operable. |

## Evaluation and release gates

The projector chain has focused schema/journal/projector regressions, including resealed outcome inflation, support omission, source/access/task mismatch, correction coherence, and v1 compatibility. The pathway chain has availability-boundary and reduced-motion checks. `b5b3170` adds the pathway marker to the release-verifier contract. The following production engineering record applies only to `6e95a33`.

| Gate | Result | What remains outside the result |
| --- | --- | --- |
| CI | `29927061567` PASS | It does not prove learning validity, durable authority, or provider/database operation. |
| Unit/evaluator | 431 application + 13 evaluator tests PASS | Live model evaluation was NOT RUN. |
| Verifier | Local/public 182/182 PASS | It verifies the release tuple, not evidence authority. |
| Optimized browser | Local/public 61 pass / 21 intentional skips / 0 fail | It is not an assistive-technology session or efficacy study. |
| Error scan | Runtime errors and exact-deployment 5xx scan empty | Empty scans do not prove rollback operability. |

### Promotion and rollback incident

`dpl_BLUz...` staged with exact health identity. The promoted clone `dpl_37...` lost build-time/digests and failed release identity. Hobby refused rollback to the prior known-good deployment because only one-step history was available. Direct production deployment `dpl_CBzgm4fAVqKy2U8MVLidiTAWTTJD` replaced the failed clone with the exact tuple recorded above.

Rollback deployments `dpl_DcKE...` at `cd418b8` and `dpl_HPts...` at `79053` remain READY. The rollback rehearsal is `NOT_EVALUATED` because the CLI target attempt failed. READY artifacts do not establish rollback operability.

Before any production statement for a later SHA, the principal must require all applicable gates on that exact SHA:

1. lint, typecheck, unit/contract tests, configured evaluator tests, optimized build, and rendered browser checks;
2. an immutable READY deployment and public alias bound to exact source/tested SHA, health identity/digests, retained artifacts, and rollback target;
3. fresh verifier evidence for every required route, CSP/runtime error checks, and only separately authorized database/provider checks;
4. v2 additive SQL migration plus exact golden fixture, transactional/concurrency and recovery proof, before treating an event as durable;
5. authenticated adult-only and child-safety decisions, abuse controls, privacy/retention decisions, and live negative tests before enabling cloud identity or sync;
6. live provider/model evaluation, spend/privacy approval, and redacted incident ownership before enabling a provider;
7. assistive-technology review and representative learner/access research before usability, access completeness, learning, retention, or efficacy claims.

## Worker ownership and dependency order

| Order | Owner | First bounded issue | Stop rule |
| --- | --- | --- | --- |
| 1 | Learning Kernel | Migrate Ratio to the accepted runtime after the projector. | Do not bind the projector to a route or change evidence authority. |
| 2 | Learning Kernel + Experience | Migrate the remaining Worlds and establish all-World proof/access/evidence conformance. | Do not call a partial migration universal access or evidence coverage. |
| 3 | Trust + Kernel | Design additive v2 SQL schema, migration/replay rules, and a cross-runtime golden fixture before persistence. | No database write or authority claim until principal accepts the architecture and negative-path proof. |
| 4 | Source/review service | Build durable source snapshot, locator, claim, rights, correction, and named-review service. | No publication or source-authenticity claim from legacy/incomplete metadata. |
| 5 | Curriculum + Pathways | Build reviewed broad curriculum packages and capability/path graphs. | No recommendation, entitlement, schedule, certification, or homeschool claim from the availability map. |
| 6 | Experience + access reviewers | Run assistive-technology review and complete semantic/nonvisual equivalence evidence. | Do not generalize reduced-motion coverage into full accessibility readiness. |

Cloud identity, child cloud auth, live provider operation, certification, and named-jurisdiction homeschool work are separate authorization tracks after these dependencies. See [COMPLETION_MATRIX.md](COMPLETION_MATRIX.md) for the requirement-level status and [THREAD_LEDGER.md](THREAD_LEDGER.md) for the retained lane chain.
