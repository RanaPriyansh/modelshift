# FORGE Wave 4 All-World Runtime Plan

- **Principal baseline:** `e6254648089dfb98d92c3fdf8439ec9047a03f72`
- **Public baseline:** `98687eaac20f956698000467cd01ea1da9b7fd6e`
- **Public release state:** `DEPLOYED_CANDIDATE`
- **Wave status:** `IMPLEMENTATION_IN_PROGRESS`
- **Scope:** Force and Motion migration, AI & Learning canonical-flow repair and migration, all-World conformance, exact candidate verification

This is an implementation plan, not release evidence. It does not change the public deployment or upgrade any product, curriculum, evidence, source, accessibility, or homeschool claim.

## North star

Every released Learning World should execute the same learner-protective protocol while leaving subject truth with its authored domain implementation:

> encounter -> committed model -> two plausible readings -> disagreement -> test prediction -> separating experience -> reconstruction -> instructional withdrawal -> unfamiliar cold transfer -> bounded result

At the end of Wave 4, all four current Worlds should dispatch accepted domain transitions through the shared fail-closed runtime. That is an engineering conformance result for four authored Worlds. It is not proof that the runtime works for every subject, that the curriculum is broad, that a learner has mastered anything, or that FORGE is ready to operate as a school.

## Principal decisions

1. **One runtime, four domain authorities.** `src/forge/world-runtime/runtime.ts` owns ordered protocol trace, action blocking, support/access recording, phase changes, and bounded receipt creation. Each `src/worlds/**` reducer and deterministic validator remains the only subject-specific state and scoring authority.
2. **Components do not create evidence authority.** Migrated components dispatch through `dispatchWorldRuntimeCommand`. A compatibility device-ledger write may occur exactly once only after the runtime emits a receipt, and its outcome may not exceed the receipt disposition.
3. **Proof is a structural phase.** Instructional support, model action, and experience replay are absent from proof UI and rejected by the runtime. Keyboard operation, text alternatives, and reduced-motion behavior remain available and are recorded separately from cognitive help.
4. **Receipts remain weak by construction.** Every Wave 4 receipt is `honour_based`, `not_persisted`, `isDurable: false`, has `responseDigest: null`, and contains no raw learner explanation. It is not routed to the ADR-001 projector or Supabase.
5. **Legacy source metadata stays incomplete.** Existing OpenStax, PNAS, and arXiv manifest metadata is not an ADR-003 source snapshot. Wave 4 bindings use `legacy_metadata_only`; no digest, locator, claim, rights, or named-review authority is invented.
6. **No delayed-return fiction.** Both migrated Worlds keep return proof disabled because no reviewed delayed task family and scheduler are published. UI or record copy may describe delayed retention as untested; it may not describe a scheduled return.
7. **Versioning is additive.** Each migrated World manifest advances from `1.0.0` to `1.0.1`; authored content remains `1.0.0`. Retained manifests must bind the exact canonical runtime-binding SHA-256 before release.
8. **AI is interpretation, never verdict.** Force may use the existing optional `/api/interpret` call only before proof and only within the public feature boundary. The accepted result enters the deterministic runtime as recorded support. AI & Learning uses no live model and remains authored/deterministic.

## Force and Motion contract

### Owned implementation surface

- `src/forge/world-runtime/force-and-motion-binding.ts`
- `src/forge/world-runtime/force-and-motion.ts`
- focused tests under `src/forge/world-runtime/`
- minimum exports and pack attachment in `src/forge/world-runtime/index.ts` and `src/forge/worlds.ts`
- `src/components/experience/ModelShiftExperience.tsx`
- minimum existing Force reducer/component/browser test corrections
- retained release manifest and digest only after accepted integration

### Event projection

| Domain event | Runtime classification | Semantic stages | Notes |
| --- | --- | --- | --- |
| `COMMIT_PREDICTION` | learner operation | none | The initial prediction remains part of encounter; it is not the mechanism model. |
| `COMMIT_EXPLANATION` | learner operation | `commit_model` | Learner language remains domain state, not receipt content. |
| accepted `RESOLVE_INTERPRETATION` or `INTERPRETATION_FAILED` | instructional support | `interpret_two_readings`, `name_disagreement` | Source is `model` for a real model result and `authored` for deterministic fallback; both are assistance before proof. Exactly two uncertain readings must be displayed. The direct failure event must install the same authored neutral fallback instead of leaving a dead trace. |
| `COMMIT_PROBE_PREDICTION` | learner operation | `commit_test_prediction` | This is distinct from the opening prediction. |
| `RUN_EXPERIMENT` | learner operation | `run_separating_experience` | Motion, numbers, graphs, forces, and alternatives retain one deterministic state. |
| `REPLAY_EXPERIMENT` | experience replay | none | Available only while learning; runtime proof lock rejects it. |
| `REQUEST_SUPPORT` | learner operation | none | Request alone is not consumed help. |
| `CONSUME_SUPPORT` | instructional support | `governed_support` | Record the actual authored tier only after consumption. |
| `OBSERVE_EXPERIMENT`, `SUBMIT_REFLECTION` | learner operation | none | Domain progress, not fabricated core stages. |
| `SUBMIT_RECONSTRUCTION` | learner operation | `reconstruct` | Required before withdrawal. |
| `CONTINUE_TO_COLD_TRANSFER` | learner operation | `withdraw_instructional_ai`, `cold_transfer` | One display transition may cross these two adjacent stages. |
| `SUBMIT_TRANSFER` | learner operation | `bounded_result` | Receipt emitted only after the complete trace. |
| reset | reset | fresh `encounter` session | Clears receipt and exactly-once guard. |

### Evidence boundary

The existing authored transfer validator determines whether the selected post-thrust behavior is correct. The current validator does not validate causal explanation quality, so Wave 4 must not describe a correct choice as proof of a mechanism-level explanation. A valid correct choice can project `pass`; a valid wrong choice projects `fail`; malformed input projects `not_scored`. Criteria must separately state the authored choice result and whether an explanation or explicit uncertainty was submitted.

The bounded result must retain at least these untested questions:

- delayed retention;
- transfer beyond the one authored task;
- reliability across repeated attempts;
- causal explanation quality beyond the validator's signals;
- representative learner and accessibility validity.

The compatibility device ledger adds the backward-compatible `authored_representation` assistance kind so the deterministic compiler fallback is not silently omitted or mislabeled as a hint. Existing record kinds remain readable.

## AI & Learning contract

### Owned implementation surface

- `src/worlds/ai-learning/types.ts`, `content.ts`, `reducer.ts`, `validator.ts`, exports, and focused tests
- `src/components/worlds/ai-learning/EvidenceLearningWorld.tsx`, module CSS, and focused tests
- `src/forge/world-runtime/source-corroboration-binding.ts`
- `src/forge/world-runtime/source-corroboration.ts`
- minimum shared exports and pack attachment
- minimum existing browser test corrections
- retained release manifest and digest only after accepted integration

### Required domain repair

The current encounter-to-evidence transition reveals the evidence before the learner predicts the separating test and does not visibly withdraw assistance. It cannot be adapted honestly by relabeling its existing screens. Wave 4 adds:

1. a `compiler` display state after encounter;
2. `ACCEPT_TWO_READINGS`, which presents exactly the two authored plausible readings as uncertain possibilities and names where they disagree;
3. a learner-authored `testPredictionId` committed by `COMMIT_TEST_PREDICTION` before evidence appears;
4. a `withdrawal` display state after reconstruction;
5. `ACKNOWLEDGE_WITHDRAWAL`, which names removed instructional operations and preserved access before opening transfer;
6. a reset action for a fresh, isolated attempt.

The existing post-evidence difference and reading checks remain analysis of the separating evidence. Corrective text that directs the learner to the answer is cognitive support and must either be made an explicit learner-requested, typed support event or replaced with neutral validation copy. Silent unrecorded tutoring is not allowed.

### Event projection

| Domain event | Runtime classification | Semantic stages | Notes |
| --- | --- | --- | --- |
| `COMMIT_ENCOUNTER` | learner operation | `commit_model` | The raw reason remains domain/local display state only. |
| `ACCEPT_TWO_READINGS` | learner operation | `interpret_two_readings`, `name_disagreement` | Authored compiler; no probabilities or diagnoses. |
| `COMMIT_TEST_PREDICTION` | learner operation | `commit_test_prediction` | Evidence remains hidden until accepted. |
| `REVIEW_EVIDENCE` | learner operation | none | Marks source cards reviewed. |
| `CONTINUE_FROM_EVIDENCE` | learner operation | `run_separating_experience` | Requires both exact authored source cards reviewed. |
| difference/reading operations | learner operation | none | Domain-owned evidence analysis. |
| explicit consumed retry support, if retained | instructional support | `governed_support` | Must be requested, visible, pre-proof, and source/tier recorded. |
| `COMMIT_BOUNDED_CLAIM` | learner operation | `reconstruct` | Enters withdrawal, not transfer directly. |
| `ACKNOWLEDGE_WITHDRAWAL` | learner operation | `withdraw_instructional_ai`, `cold_transfer` | Proof opens only here. |
| `SUBMIT_TRANSFER` | learner operation | `bounded_result` | Exactly one authored submission. |
| reset | reset | fresh `encounter` session | Clears receipt and exactly-once guard. |

### Evidence boundary

The existing deterministic transfer scorer evaluates exactly two authored decisions: the bounded claim and the unresolved question. Two correct decisions project `pass`; one or zero project `fail`; malformed input projects `not_scored`. The result may say the bounded-reading pattern held once on this immediate task. It may not claim general source literacy, truth-detection ability, retention, efficacy, or mastery.

The two current research sources must appear in the runtime receipt as incomplete legacy metadata. The receipt and result must preserve at least these untested questions:

- delayed retention and repeat reliability;
- other subjects, populations, delivery roles, models, and tool designs;
- causal isolation across study differences;
- open-web source quality and adversarial misinformation;
- representative learner and accessibility validity.

## State, memory, provider, and side-effect boundaries

| State or tool | Allowed in Wave 4 | Explicitly absent |
| --- | --- | --- |
| Component form state | Current draft choices, prose, confidence, display toggles | Cross-session learner model, hidden score, transcript archive |
| Domain/runtime session | Accepted reducer state, trace, support/access events, proof lock, one receipt | Server authority, synchronization, tamper resistance |
| Device compatibility ledger | One bounded local projection per completed attempt | Automatic cloud sync, raw prose, delayed schedule |
| Force `/api/interpret` | Optional pre-proof interpretation under existing feature flag and fallback | Correctness, proof grading, publication, proof-phase invocation |
| AI & Learning source cards | Fixed authored briefs and links | Live retrieval, open-web browsing, model-generated evidence |
| Supabase and auth | No new Wave 4 operation | Evidence writes, account requirement, child cloud identity |

Provider errors, malformed interpretation, timeout, refusal, or disabled configuration must leave Force useful through the deterministic authored fallback. They must not skip the compiler or widen model authority. AI & Learning has no provider dependency.

## All-World conformance gate

One shared conformance matrix must run against Primary Source, Ratio, Force, and AI & Learning. The gate must verify the behavior itself, not only the presence of a runtime field.

Required positive cases:

- exact ordered core trace from `encounter` through `bounded_result`;
- subject reducer remains authoritative;
- proof receipt emitted once with exact pack/content/protocol/task/validator IDs;
- `pass`, `fail`, and malformed `not_scored` projections stay disposition-bounded;
- reset creates a new encounter session and no stale receipt;
- construct-preserving access remains usable in proof;
- source status and remains-untested fields are explicit.

Required negative cases:

- skipped, reordered, duplicate, or more-than-two fabricated core stages;
- a learner-shaped domain event classified as model, replay, access, or return proof reaching the reducer;
- support event/classification mismatch;
- support crossing into proof or result;
- model/replay commands in proof;
- unknown runtime actions or accommodations;
- adapter proof before complete trace;
- forged pass/disposition, stale pack version, stale runtime digest, or source `bound` claim without the full source tuple;
- receipt containing raw learner prose;
- component direct reducer or direct score-to-ledger bypass;
- duplicated compatibility record after rerender;
- hidden answer or retry assistance during transfer.

## Accessibility and experience gate

For both migrated Worlds, run the complete critical journey at desktop and 320 CSS px with keyboard-only operation. Verify focus moves to the new stage heading/main target, stage changes are announced, radio groups have instance-safe names and visible focus, dense evidence/experiment alternatives do not overflow, proof retains access controls, and result content is readable without color or motion. Reduced motion and forced colors must preserve evidence and operation.

Manual screen-reader, voice control, switch control, magnification, Safari, Firefox, and representative learner sessions remain `NOT_RUN` until executed. Automated semantics are not a substitute for those sessions.

## Integration order

1. Freeze this plan and collect the independent baseline red-team matrix.
2. Review and integrate Force first because it requires a thin adapter and smaller domain change.
3. Rebase/replay AI & Learning onto the accepted Force main so shared exports, pack edits, retained manifests, and digests are computed once against current code.
4. Add or update one all-World conformance suite after both adapters exist.
5. Run focused unit/component/browser review on each World, then the full application/evaluator/lint/typecheck/build/local-verifier/optimized-browser matrix.
6. Freeze one candidate SHA and require independent protocol/evidence and accessibility/browser acceptance.
7. Push only the exact accepted SHA, wait for exact-SHA CI, deploy directly with explicit safe feature-state values, and bind public verification to the immutable deployment identity.
8. Record operational variability, logs, live-provider status, rollback status, manual-AT status, and all skips. Do not upgrade past `DEPLOYED_CANDIDATE` without the separate terminal gates.

## Stop-ship conditions

Wave 4 must not release if any of the following is true:

- either World can reach a result without the complete canonical trace;
- a component bypasses the runtime for accepted state or evidence outcome;
- instructional support/model/replay can execute in proof;
- accessibility is removed with instructional help;
- a receipt or log contains raw learner prose or a provider key;
- a wrong, partial, malformed, or uncertain result can become `demonstrated`/`proved`;
- a legacy source is represented as bound authority;
- a delayed return is scheduled or implied without an implementation;
- retained package/version/runtime digest does not match exact source;
- any specific negative regression remains, even if broad suites are green;
- the deployed SHA, immutable deployment, retained artifacts, feature flags, and verified public URL do not form one exact identity tuple.

## Definition of Wave 4 done

Wave 4 is done only when both remaining Worlds are independently accepted, all four authored Worlds pass the shared conformance matrix, the exact integrated candidate passes full local and CI gates, the public immutable deployment passes bound verification, and the control room records every claim limit and unrun gate.

Even then, the honest result is: **four current authored Worlds execute one bounded shared runtime.** It is not: universal curriculum, durable evidence, validated learning efficacy, homeschool readiness, or education replacement.
