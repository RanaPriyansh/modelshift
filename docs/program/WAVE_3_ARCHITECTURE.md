# FORGE Wave 3 Ratio Runtime and Release Record

- **Released code/source SHA:** `98687eaac20f956698000467cd01ea1da9b7fd6e`
- **Shared runtime hardening:** `8508eb8` + `285158e`
- **Release-identity hardening:** `7ebfd87` + `e86f16c`
- **Local evidence correction:** `193c7cc`
- **Ratio migration:** `a293ac3` + `8ac0e18` + `98687ea`
- **CI:** `29932913141` PASS
- **Public alias:** `https://modelshift.vercel.app`
- **Production deployment:** `dpl_pLpQmuCP43Mc3tNt1nErf8MRH2v2`
- **Immutable deployment URL:** `https://forge-learning-a3jw66bda-ranapriyanshs-projects.vercel.app`
- **Release state:** `DEPLOYED_CANDIDATE`

This is the post-release record for the exact code SHA above. This documentation-only amendment is not deployed and cannot change the deployed source, runtime identity, evidence authority, or release state.

## North star and bounded result

FORGE's shared World runtime should make the learning protocol enforceable without making subject truth generic. A learner must commit a model, see two plausible readings, predict the separating test, run the authored experience, reconstruct, lose instructional assistance, and attempt an unfamiliar transfer before receiving a bounded result.

Wave 3 migrates Proportional Reasoning (Ratio) to that runtime. Primary Source Reasoning and Ratio are now the two migrated Worlds. Force and Motion and AI & Learning retain their existing domain implementations and are not represented as shared-runtime conformant.

The accepted Ratio result is deliberately narrow:

- the learner's initial taste prediction and later separating-test prediction are distinct recorded commitments;
- the component dispatches domain events through the shared runtime rather than calling the reducer as an evidence authority;
- an exact map answer is demonstrated only when the explanation also contains a relationship-bearing signal (`scale_factor` or `same_relationship`);
- a bare calculation, the number `32`, or a lucky exact choice is not demonstrated and cannot become a `proved` device record;
- instructional support, model actions, and experiment replay are blocked after proof opens while construct-preserving typed access remains available;
- the runtime emits one bounded local receipt per completed attempt, with no raw learner explanation, and resets cleanly for a new attempt;
- new local Ratio evidence uses the canonical capability ID while the evidence ledger still reads the legacy v1 ID without rewriting it;
- delayed return proof remains unavailable because no reviewed delayed task family or scheduler is published.

This does not establish a universal runtime, durable evidence, broad curriculum, mastery, retention, learning efficacy, or homeschool readiness.

## Accepted architecture summary

| Boundary | Accepted behavior | Claim limit |
| --- | --- | --- |
| Shared runtime trace | Runtime owns the required ordered core trace and rejects skipped, reordered, or bulk-fabricated semantic stages. | Two of four Worlds are migrated; trace conformance is not all-World coverage. |
| Ratio domain truth | Existing exact arithmetic, reducer, task, and validator remain authoritative. The adapter projects only canonical stage, support, proof, and receipt facts. | The runtime does not know proportional answers or infer subject mastery. |
| Independent evidence criterion | Exact answer plus a relationship-bearing mechanism is required for `pass`, `demonstrated`, and legacy `proved`. | One immediate transfer does not prove retention, broad transfer, or mastery. |
| Proof lock | Cognitive support, model action, and replay are structurally blocked during proof; typed construct-preserving access is allowed and recorded. | Browser/access checks are not a manual assistive-technology or construct-validity study. |
| Runtime receipt | One local, honour-based, non-persisted receipt records package/protocol/task/validator/support/access/source status and remains-untested limits. | It is not durable, authenticated, tamper-resistant, server-authoritative, or pathway evidence. |
| Source provenance | The historical OpenStax reference remains `legacy_metadata_only` and the receipt remains source-incomplete. | No source snapshot, locator, claim, rights, or named-review authority is fabricated. |
| Return proof | The runtime manifest, domain state, UI, and legacy writer expose no operational delayed-return action. Shared evidence schedules only explicit valid intervals. | The authored content's future return description is not a scheduler or retention result. |
| Release identity | Runtime-enabled packages require the exact canonical runtime-binding SHA-256 in the retained package manifest; legacy packages may not invent one. | A digest proves exact retained bytes, not pedagogy, source quality, or learning validity. |

## Non-goals and hard boundaries

Wave 3 does not provide or authorize:

- a route binding from runtime receipt to the ADR-001 projector;
- a v2 SQL schema, outbox, authenticated append service, synchronization, backup, restore, concurrency, or migration authority;
- cloud identity, child cloud identity, verified guardian relationships, evidence sync, service-role use, or data sharing;
- live provider/model evaluation, a managed provider key, model grading, AI publication, or model-written proof;
- a reviewed delayed task family, return scheduler, retention result, recommendation, prerequisite graph, entitlement, attendance, accreditation, or certification;
- complete source snapshots, rights records, claim locators, correction operation, or named human review authority for Ratio;
- Force and Motion or AI & Learning runtime migration, or an all-World conformance result;
- manual screen-reader, switch, voice-control, magnification, Safari, or Firefox evidence;
- representative learner research, construct validation, delayed retention, efficacy, safety, jurisdictional homeschool operation, or education-replacement readiness.

The public product may say that Ratio and Primary Source have bounded shared-runtime attempts. It may not say every World has canonical durable evidence or that FORGE can currently replace a school or homeschool program.

## Runtime, tools, and side effects

| Surface | Accepted input/effect | Forbidden or absent effect |
| --- | --- | --- |
| `dispatchWorldRuntimeCommand` | Typed domain, access, model, and replay command wrappers; deterministic local state transition and policy decision. | No network, provider, database, identity, publication, or source-authenticity effect. |
| Ratio adapter | Maps accepted reducer transitions to semantic stages, authored support tiers, proof, validator projection, source status, and remains-untested facts. | Cannot bypass trace order, fabricate an access command, relabel support, or choose a proportional answer. |
| Ratio component | Holds ephemeral form state, dispatches through the runtime, moves focus, announces stages, and emits compatibility callbacks. | Does not persist a runtime receipt, invoke the projector, schedule return proof, or expose support in proof. |
| Device evidence compatibility writer | Writes one local v1 record using the canonical capability ID and the same relationship criterion. | No return schedule without explicit intervals; no cloud write; no upgrade of existing legacy records. |
| Retained package manifest | Pins package route/version and exact runtime-binding digest for runtime-enabled packages. | Cannot add unknown packages, omit built-ins, accept stale digests, or attach a runtime digest to a legacy package. |
| Vercel release | Serves the exact frozen SHA with fallback-only runtime, request-only BYOK, cloud accounts disabled, and retained digests. | No provider credential was enabled, no database was configured, and no learner data was migrated. |

## State, memory, and context budget

Ratio has three intentionally separate state classes:

1. **Ephemeral learner form state:** current radio choices, explanation drafts, confidence, and UI representation choice live in the component for one browser attempt.
2. **Deterministic domain/runtime state:** accepted reducer state, semantic trace, cognitive support events, access events, proof lock, proof, and at most one receipt live in memory for the mounted attempt.
3. **Compatibility device evidence:** the existing browser-local v1 ledger may receive one bounded projection after completion; it remains learner-controlled local storage.

The runtime receipt contains no raw learner response and sets `responseDigest: null`. It records bounded IDs, outcome criteria, support/access facts, source status, and explicit limitations. Its authority is `honour_based`, persistence is `not_persisted`, and `isDurable` is false.

No model context is assembled and no provider receives learner text in this Wave. No transcript reservoir, cross-attempt learner model, hidden mastery score, or return schedule is created. Any future persistence or model-context work requires separate retention, consent, deletion, minimization, abuse, and authority review.

## Failures and fail-closed behavior

| Failure or attack | Accepted behavior | Remaining gap |
| --- | --- | --- |
| Skipped/reordered/fabricated trace | Runtime returns `runtime_trace_invalid` and preserves the original session. | Only migrated adapters receive this enforcement. |
| Domain event classified as model/replay/access | Runtime prevents reducer access; construct-preserving access must use the typed access command. | No all-World malicious-adapter suite yet. |
| Support missing or attached to the wrong action | Runtime returns `runtime_support_mismatch`; support touching protected proof is blocked and recorded as a rejected kind. | Support provenance remains local and authored for Ratio. |
| Lucky exact choice or bare arithmetic | Validator outcome is `fail`; evidence is `not_demonstrated`; legacy projection is `not_proved`. | Task-family validity and explanation-rubric reliability are unstudied. |
| Malformed transfer payload | Projection is `not_scored` / `not_evaluated`; no pass can be emitted. | There is no later authorized human review service. |
| Disabled return-proof action | Runtime and reducer reject or omit it; UI states that no reviewed scheduler exists. | Delayed retention is untested. |
| Missing/stale package or runtime digest | Retained release validation fails. | Content-signing and external publication authority do not exist. |
| Legacy source described as bound | Runtime linter/source coherence fails; emitted receipt remains incomplete. | Durable source acquisition/review remains absent. |
| Browser proof replay/help attempt | Proof UI omits instructional controls and runtime rejects protected command kinds. | Manual AT and adversarial learner studies remain unrun. |

## Evaluation and release evidence

| Gate | Result on released SHA | Boundary |
| --- | --- | --- |
| Independent implementation review | Protocol/evidence reviewer and access/browser reviewer both `ACCEPT` after one stale planner/E2E contract rejection was corrected. | Review is engineering evidence, not educational validity. |
| Unit/evaluator | 465 application + 13 evaluator-contract tests PASS. | Live provider/model evaluation was NOT RUN. |
| Lint/typecheck/build | PASS; optimized Next.js build produced all expected routes. | Does not prove external service operation. |
| Local verifier | 182/182 PASS with exact SHA/digests. | Local identity is not public deployment evidence. |
| Local optimized browser | 61 pass / 21 intentional project skips / 0 fail. | Skips are named; manual AT is not covered. |
| Ratio deep access review | Full keyboard journey; compiler/table/proof/evidence at 320 CSS px; reduced motion; forced colors; stage focus/announcement; proof isolation; reset all PASS. | Multi-mounted instance automation and manual screen-reader sessions were not run. |
| CI | GitHub Actions run `29932913141` PASS on exact SHA. | CI is not rollback, provider, database, or learning proof. |
| Public verifier | Final bound run 182/182 PASS as `DEPLOYED_CANDIDATE`. | Terminal `PRODUCTION_VERIFIED` is unavailable without live-evaluation and rollback-rehearsal authority. |
| Public browser | Passing exit with 60 pass, 21 intentional skips, and one mobile API-request timeout that passed retry; focused repeat produced two direct passes and one first-attempt timeout that passed retry. | The timeout is retained as an operational flake; it is not reported as a clean 61/61 unique pass. |
| Runtime/HTTP logs | Deployment error-level log scan and 5xx scan were empty after the public journeys. | Empty scans do not prove monitoring/drain or rollback operation. |

The first unbound public verifier run matched the application SHA and passed its route/security checks but correctly stayed blocked because immutable deployment metadata and retained artifact IDs were not supplied. A later metadata-only run encountered transient route/asset timeouts after the heavy browser matrix; direct route probes returned 200 in 0.27–0.39 seconds and the final identical bound verifier retry passed 182/182. These incidents remain evidence of operational variability, not reasons to inflate the release state.

## Dependency-ordered implementation issues

1. Migrate Force and Motion and AI & Learning to the accepted runtime with reducer equivalence, proof/access/evidence conformance, malicious-adapter tests, and exact retained binding digests.
2. Establish an all-World conformance suite before any universal runtime or canonical-evidence claim.
3. Design the additive ADR-001 v2 SQL schema and exact cross-runtime golden fixture; prove fresh/upgrade/repair, concurrency, idempotency, and recovery before any route writes.
4. Build the durable source snapshot/locator/claim/rights/review/correction service; keep legacy sources incomplete until that authority exists.
5. Build reviewed curriculum packages and capability/prerequisite graphs before paths, schedules, entitlement, or homeschool claims.
6. Run manual assistive-technology and complete nonvisual-equivalence review, including Safari/Firefox, before broad accessibility claims.
7. Separately authorize any live provider, adult cloud identity, child/guardian operation, or persistence test; none is implied by this Wave.
8. Investigate the first-request public Playwright timeout and run an authorized rollback rehearsal/observability exercise before seeking a terminal release state.

## Honest release statement

Wave 3 is a public, exact-SHA `DEPLOYED_CANDIDATE` that adds a second real shared-runtime World and strengthens the common runtime/release boundary. It is not a production-grade homeschool system, a replacement for education, a complete learn-anything curriculum, a durable evidence service, or a validated AI tutor. Those remain program goals with explicit unmet dependencies.
