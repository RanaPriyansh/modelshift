# FORGE Worker Thread Ledger

## Operating rule

Workers implement bounded slices in isolated worktrees. They do not edit the principal-owned files in `docs/program/`, merge to `main`, push shared branches, deploy, enable provider/cloud credentials, or mutate a live database. Each lane reuses its thread for subsequent goals.

**Wave 2 release boundary:** released source is `6e95a33c4cd82e2b7529f3b5980766a7c13ed068`, public alias is `https://modelshift.vercel.app`, production deployment is `dpl_CBzgm4fAVqKy2U8MVLidiTAWTTJD`, and immutable URL is `https://forge-learning-ffh45hv8c-ranapriyanshs-projects.vercel.app`. This later documentation-only amendment is not deployed and does not alter that tuple. No lane may describe the release as durable authority, live provider operation, cloud auth, broad curriculum, certification, or homeschool readiness.

## Active lane map

| Lane | Task | Default model | Dispatch status | Existing handoff | Next goal |
| --- | --- | --- | --- | --- | --- |
| Experience and design system | `019f8705-865e-7631-a921-ee4b5690b778` | `gpt-5.6-terra` xhigh | `IDLE`; Packet A `ACCEPTED_ON_MAIN` | Worker chain `e84a395` + `eb19eb4`; integrated as `60b947e` + `f7a3bc4` | Hold for cross-lane regression; resume for screen-reader/nonvisual-equivalence work only after Packet E defines the shared runtime |
| Trust, auth, and private evidence | `019f8705-2825-7cb2-94e1-b30d5aab1447` | `gpt-5.6-terra` xhigh | `IDLE`; Packet B `ACCEPTED_ON_MAIN` | Source chain `9a85524` through `2564234`; current-base integration `30bf5bc` through `9a4068f` | Hold for Packet E canonical persistence runtime and separately authorized abuse-controlled cloud-operation proof |
| Homeschool pathways and entitlement | `019f8704-dc1c-7381-b71b-c0303987251a` | `gpt-5.6-terra` xhigh | `IDLE`; Packet C contract and Wave 2 availability-only map `ACCEPTED_ON_MAIN` | Packet C integrated as `033bb9a`; availability chain `48ea3fd` → `30e1dde` → `2cf81ab` | Hold for durable trusted receipt/source service; no scheduler, recommendation, certification, compliance, curriculum-entitlement, or homeschool-readiness claims |
| Release, evaluation, observability | `019f8705-4855-7522-9140-8d45cd93ae60` | `gpt-5.6-luna` high | `IDLE`; exact public engineering release `RECORDED` for `6e95a33` | Packet D source `1db691e`; `/pathways` coverage `b5b3170`; CI `29927061567`; deployment `dpl_CBzgm4fAVqKy2U8MVLidiTAWTTJD` | Hold for separately authorized rollback rehearsal/incident-alerting work; do not promote release identity to durable authority, provider, or educational-validity claim |
| Learning Kernel and World Factory | `019f8973-ef2f-7071-89a3-d5b81781957d` | `gpt-5.6-terra` xhigh | `IDLE`; Packet E runtime and ADR-001 projector/coherence repair `ACCEPTED_ON_MAIN` | Runtime integrated as `abf34c2`; projector `4dab5d9` + `f4179e9` | Ratio runtime migration is next, then all-World conformance; local receipts/projector output are neither durable nor trusted pathway evidence |
| AI Lesson Intelligence | `019f8973-f2d9-7710-ba01-451d892f767a` | `gpt-5.6-terra` xhigh | `IDLE`; Packet F `ACCEPTED_ON_MAIN` | Replay `b07d577` → `fa634ea`; integrated as `1e95a15` → `15a7531` | Add a durable human-review queue/source service only after identity, quota, abuse, privacy, and publication authority are separately approved |

The principal remains the architecture/integration/red-team lane and uses `ultra` only when the user explicitly returns for review or a worker requests a cross-lane decision.

## Wave 2 agent and review chain

| Order | Agent or review role | Exact code / review chain | Status | Boundary retained |
| --- | --- | --- | --- | --- |
| 1 | Learning Kernel implementation agent | `4dab5d9` | `ACCEPTED_ON_MAIN` as an additive v2 projector path | Pure/in-memory projection only; no route binding, persistence, identity, network, or UI change. |
| 2 | Independent adversarial review and corrective implementation | principal rejection followed by `f4179e9` | `ACCEPTED_ON_MAIN` after coherence repair | Sealed events still require journal-level coherence; no result is durable/authenticated authority. |
| 3 | Pathways implementation and boundary reviews | `48ea3fd` → `30e1dde` → `2cf81ab` | `ACCEPTED_ON_MAIN` | `/pathways` is an availability map with visible gaps, not a learner path, schedule, recommendation, entitlement, or homeschool operation. |
| 4 | Release-verifier integration and principal release gate | `b5b3170` verifier coverage; released `6e95a33`; CI `29927061567`; `dpl_CBzgm4fAVqKy2U8MVLidiTAWTTJD` | `PUBLIC_ENGINEERING_RELEASE_RECORDED` for exact source | Local/public verifier 182/182, local/public browser 61 pass / 21 intentional skips / 0 fail, and empty runtime/5xx scans prove the recorded engineering tuple only. |
| 5 | Promotion incident review | staged `dpl_BLUz...`; failed promote clone `dpl_37...`; direct production `dpl_CBzgm4fAVqKy2U8MVLidiTAWTTJD` | `RECORDED`; identity failure did not promote | The clone lost build-time/digests and failed release identity. Hobby refused rollback because of one-step history; no rollback-operability claim follows. |
| 6 | Principal post-release documentation reconciliation | `docs/program` amendment after `6e95a33` | `DOCUMENTATION_ONLY` | Records the exact release and incident; this commit is not deployed and does not upgrade authority, provider, curriculum, child-cloud, or homeschool claims. |

The dependency order is fixed for the next implementation cycle: Ratio runtime migration after the projector; all-World runtime conformance; additive v2 SQL and golden fixture review before any persistence; durable source service; broader reviewed curriculum/path graphs; then assistive-technology review. Cloud identity, provider enablement, certification, and homeschool operation remain outside this chain.

## Packet A — Experience and design system

**North Star:** one calm, question-led instrument from intake to bounded evidence at 320 px through desktop.

Owned paths for the next slice:

- `app/forge-system.css` or an explicitly approved replacement;
- reusable presentation primitives under `src/components/forge/`;
- focused visual/accessibility tests;
- a worker-owned fidelity report outside `docs/program/`.

Required work:

1. start a new branch from current `origin/main`; do not rebase/cherry-pick the old commit wholesale;
2. compare the old seven-file slice to current Studio/auth/primary-source changes;
3. port only non-conflicting tokens and primitives;
4. unify typography/paper/instrument surfaces without changing World logic;
5. cover unique accessible names, roving tabs where present, 44 px targets, 16 px mobile inputs, focus, forced colors, contrast, and reduced motion;
6. test home, Studio, login/account, all four Worlds, evidence, and trail.

Stop gate: one clean commit; no route behavior regression; exact visual/browser evidence; a conflict/disposition list for anything intentionally not ported.

Principal disposition on 2026-07-22: **accepted and integrated**. The first handoff was held until rendered contrast, forced-colors, 44 px link targets, the quiet-status contrast defect, and the fidelity-report ownership/404 wording were corrected in an additive commit. Two read-only reviews accepted the resulting chain. On integrated code SHA `f7a3bc4`, lint, typecheck, 182 application tests, 9 evaluator tests, optimized build, and the production-mode Chromium matrix passed; browser result was 45 passed, 19 intentional cross-project skips, 0 failed. This closes Packet A's bounded presentation/access slice, not screen-reader testing, complete nonvisual representation equivalence, or the broader FORGE objective.

## Packet B — Trust, auth, and private evidence

**North Star:** adult continuity and private sync can be enabled without granting false age/guardian authority or weakening learner data ownership.

Owned paths:

- `src/lib/forge-auth/**`, future private-sync module, focused account/actions/routes;
- additive Supabase migration/tests for private evidence and consent;
- auth/privacy E2E and worker documentation.

Required work:

1. branch from current main and audit `24edb6f` against the new nonce CSP, cookie headers, key rejection, typed event spine, and device profiles;
2. choose compatible environment naming; no `NEXT_PUBLIC_*` secret and no service role;
3. preserve adult-entry self-attestation as non-authoritative;
4. add CAPTCHA/application limiter integration boundary before any configured-cloud release;
5. make sync explicit per record/batch, idempotent, size bounded, schema validated, RLS owner-only, and separately deletable;
6. test two-account isolation, token refresh, signout, duplicate sync, partial failure, local/cloud deletion, consent revocation, and under-18 refusal in a disposable project or emulator.

Stop gate: staging/code packet only unless the user separately approves a Supabase organization, displayed cost, and live test project.

Principal disposition on 2026-07-22: **accepted and integrated as a fail-closed staging boundary**. The handoff was held until URL audience hints could not bypass a valid device profile, corrupt or absent profiles failed closed, direct child-capable World routes required the local selection/grown-up gate, browser-controlled age or adult self-attestation could not create cloud authority, profile/age mutation privileges were revoked, and an actual legacy migration path preserved immutable retired consent history. A database trigger now rejects new `private_evidence_persistence` consent even for the local `service_role`/BYPASSRLS path; both authenticated and elevated refusals were executed against disposable PostgreSQL databases. Two read-only reviews accepted the final source and current-base integration chains. On integrated code SHA `9a4068f`, lint, typecheck, 249 application tests, 9 evaluator tests, optimized build, fresh and legacy-upgrade SQL fixtures, and the complete production Chromium matrix passed; browser result was 55 passed, 19 intentional cross-project skips, 0 failed. Cloud auth, private-evidence sync, and live account continuity remain structurally disabled—not production-operable.

## Packet C — Homeschool pathways and entitlement

**North Star:** broad foundations and learner-chosen depth coexist without grade-level lockstep, hidden recommendation scores, or certification fiction.

Owned paths:

- `src/forge/pathways/**`;
- pathway contract/tests and a worker-owned architecture note;
- minimal registry integration only after contract review.

Required work:

1. port the pure module from `dd6fe0e` onto current main;
2. reconcile capability IDs, age modes, evidence tiers, source policies, and event vocabulary;
3. produce deterministic issues for breadth, choice, access, consent/assent, relationships, protection, and portability;
4. add fixtures for child-with-grown-up, teen, adult, disability/access alternatives, missing foundation, coercive sequence, hidden gamification, and invalid evidence claims;
5. return only `needs-evidence` or `evidence-complete-for-independent-review`.

Stop gate: no UI scheduler, jurisdictional compliance claim, accreditation, attendance record, or “homeschool ready” wording.

Principal disposition on 2026-07-22: **accepted and integrated**. The handoff was held through three red-team rounds until production evaluation could not promote fixture-injected evidence, the published catalog remained `needs-evidence` without a Packet E trusted receipt, under-18 open-web actions failed closed, positive homeschool/mastery/retention/transfer claims could not hide behind denial prefixes, and honest bounded limitation lists remained expressible. A read-only reviewer accepted the final whole-statement grammar after a 14-case adversarial matrix. On integrated code SHA `033bb9a`, lint, typecheck, 57 focused pathway tests, 239 application tests, 9 evaluator tests, and the optimized build passed. This accepts a pure deterministic review contract only; no curriculum entitlement, jurisdictional operation, attendance record, accreditation, or homeschool-readiness claim is established.

## Packet D — Release, evaluation, and observability

**North Star:** every public URL identifies its exact source and can be rolled back without confusing engineering health with educational validity.

Owned paths:

- `.github/workflows/**`, release verification scripts, health endpoint;
- `docs/operations/**`, generated/sanitized report paths;
- focused tests for release identity and verifier allowlists.

Required work:

1. branch from current main and disposition `a98f8bb` file by file;
2. diagnose `dpl_GwTK18jVR2NmEb4VKa3KGhf6hLzi` BLOCKED using build/deployment evidence;
3. verify local Git author configuration and Vercel membership rules without rewriting shared history;
4. produce a candidate endpoint/report containing app name, source SHA, build time, runtime mode, cloud/provider flags without secrets;
5. add immutable CI for lint/typecheck/unit/eval/build/E2E and artifact retention;
6. add production verifier checks for four Worlds, Studio, device profile, CSP nonce, no-cloud state, and release SHA;
7. never deploy from the worker.

Stop gate: exact diagnosis, exact remediation, one clean commit, no deployment capability in CI without a separate approval environment.

Principal disposition on 2026-07-22: **accepted and integrated**. The stale worker ancestry was not merged. Packet D was replayed linearly onto the exact accepted A/B/C base and held through independent red-team review until state/outcome authority, artifact selection, non-overwrite/symlink/path safety, exact schemas, SSRF/rebinding/redirect defenses, and a 1,260-case malformed-input matrix passed. On replay SHA `1c5dd3a`, 373 application tests, 9 evaluator tests, lint, typecheck, optimized build, 165 local verifier checks, and 55 production Chromium checks passed; 19 project-scoped duplicates were intentionally skipped. This accepts the release machinery, not a provider-quality, database-operation, educational-validity, or public-deployment claim.

Post-release record: source `6e95a33c4cd82e2b7529f3b5980766a7c13ed068` is public at `https://modelshift.vercel.app` through production deployment `dpl_CBzgm4fAVqKy2U8MVLidiTAWTTJD` and immutable URL `https://forge-learning-ffh45hv8c-ranapriyanshs-projects.vercel.app`. CI run `29927061567` passed; local/public verifier was 182/182; local/public optimized browser was 61 pass / 21 intentional skips / 0 fail; 431 application and 13 evaluator tests passed; live model was NOT RUN; runtime-error and exact-deployment 5xx scans were empty. The staged `dpl_BLUz...` had exact health, but promoted clone `dpl_37...` lost build-time/digests and failed release identity. Hobby refused rollback to the prior known-good deployment because only one-step history was available. Direct production replaced it. Rollback artifacts `dpl_DcKE...` (`cd418b8`) and `dpl_HPts...` (`79053`) are READY, but the CLI target attempt failed, so rollback rehearsal is `NOT_EVALUATED`. This is an exact engineering-release record, not a claim of rollback operability, durable authority, live provider quality, cloud auth, broad curriculum, accessibility-session completion, efficacy, homeschool readiness, or certification.

## Packet E — Learning Kernel and World Factory

**North Star:** new subjects plug into one trusted learning protocol while preserving domain-specific truth.

Owned paths:

- new `src/forge/world-runtime/**` and conformance tests;
- thin adapters in one selected World;
- no global styling/auth/data changes.

Required work:

1. extract interfaces from the four current Worlds rather than designing an abstract curriculum framework first;
2. define stable stages, actions, side effects, support events, proof conditions, evidence emission, focus/motion/access hooks, and validator contract;
3. define domain plugin interfaces without forcing physics concepts onto source or mathematical reasoning;
4. build a package linter and exhaustive invalid-manifest fixtures;
5. migrate Primary Source Reasoning first because it stresses non-STEM semantics and authentic sources;
6. prove behavior equivalence with reducer, component, and browser tests.

Stop gate: no second source of truth, no model-graded proof, no generic mastery score, and no edits to the other three Worlds in the first slice.

Principal disposition on 2026-07-22: **accepted and integrated as a one-World runtime slice**. Independent review confirmed strict bound-versus-legacy source provenance, domain-owned validator projection, preserved rejected reducer state, real disagreement/test-prediction trace, typed construct-preserving accommodations, declared runtime actions, strict-CSP operation, and an explicitly local/non-durable receipt. Primary Source Reasoning and its retained content/runtime identity are `1.0.1`; protocol, validator, source, and proof-lock changes alter the retained runtime-binding digest while release health continues to use the exact manifest-file SHA-256. Exact replay HEAD `1cde10d` passed 400 tests, lint, typecheck, build, 166 local release checks, and production Chromium/320 px/keyboard/reduced-motion/text-alternative checks. Packet C remains `needs-evidence`: this local receipt is not a trusted or persisted evidence record, and the other three Worlds are not yet migrated to the shared runtime.

## Packet F — AI Lesson Intelligence

**North Star:** models compete on explanation and lesson-design quality while deterministic policy and human review own truth, publication, and proof.

Owned paths:

- `src/lib/lesson-studio/**`, Studio API/UI extensions, provider eval fixtures;
- new review-workflow module that remains local/staged;
- no published World mutation in the first slice.

Required work:

1. verify current structured-output contracts and default model IDs against official provider docs;
2. add provider capability metadata, model override validation, time/token/cost budgets, rate-limit/refusal classification, and request correlation without learner text logging;
3. split generation from critique/source-plan/revision; no model self-approval;
4. define review states: draft, source-needed, factual-review, pedagogy-review, access-review, proof-review, approved-package, rejected, withdrawn;
5. create cross-domain/age golden fixtures and metrics for two-reading quality, disagreement clarity, separating-test validity, source need completeness, answer leakage, cold-transfer validity, safety, latency, and cost;
6. keep live suites credential-gated, redacted, and provider-specific.

Stop gate: mocked/deterministic test coverage plus a live-eval harness; no managed key enablement, live cost, or publication without separate authority.

Principal disposition on 2026-07-22: **accepted and integrated as a structurally locked draft/review slice**. The handoff was held through two independent review rounds until the mandatory safety stage, scoped reviewer roles, exact immutable refs, complete multi-source ADR-003 receipt, closed/redacted live-eval outcomes, OpenAI refusal/incomplete parsing, adult server-authority-before-body boundary, and retired managed-key surface all passed. A final forged-state repro then required every persisted review projection to equal deterministic replay from its immutable draft seed and ordered decisions; shortened, reordered, fabricated-final, source-ref, publication, grade, and supersession attempts fail closed. Exact replay HEAD `fa634ea` passed 392 application tests, 13 evaluator tests, lint, typecheck, build, and local rendered Studio checks. No live provider call, credential, spend, durable review, source attestation, publication, proof grade, or public connector enablement is claimed.

## Handoff format required from every lane

```text
STATUS: READY_FOR_PRINCIPAL_REVIEW | NEEDS_DECISION | BLOCKED
BASE SHA / BRANCH / HANDOFF SHA / WORKTREE
GOAL AND NORTH STAR
FILES CHANGED AND OWNERSHIP DEVIATIONS
BEHAVIOR DELIVERED
CONTRACTS ADDED OR CHANGED
TESTS: exact commands, counts, skips, environment
SECURITY / PRIVACY / ACCESS / CLAIM REVIEW
CONFLICTS WITH CURRENT MAIN OR OTHER LANES
EXTERNAL ACTIONS: must be none unless separately authorized
DECISIONS NEEDED
KNOWN RISKS AND ROLLBACK
NEXT BOUNDED GOAL
```
