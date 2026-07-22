# FORGE Worker Thread Ledger

## Operating rule

Workers implement bounded slices in isolated worktrees. They do not edit the principal-owned files in `docs/program/`, merge to `main`, push shared branches, deploy, enable provider/cloud credentials, or mutate a live database. Each lane reuses its thread for subsequent goals.

## Active lane map

| Lane | Task | Default model | Dispatch status | Existing handoff | Next goal |
| --- | --- | --- | --- | --- | --- |
| Experience and design system | `019f8705-865e-7631-a921-ee4b5690b778` | `gpt-5.6-terra` xhigh | `IN_PROGRESS` | `e73dc9d` on old `af5f3ca` base | Create a new branch from current main; selectively port tokens/primitives; unify shell and state/access behavior |
| Trust, auth, and private evidence | `019f8705-2825-7cb2-94e1-b30d5aab1447` | `gpt-5.6-terra` xhigh | `IN_PROGRESS` | `24edb6f` on old base | Reconcile with current hardened SSR auth/event spine; stage adult sync and abuse-controlled integration only |
| Homeschool pathways and entitlement | `019f8704-dc1c-7381-b71b-c0303987251a` | `gpt-5.6-terra` xhigh | `IN_PROGRESS` | `dd6fe0e` on old base | Port pure pathway contracts to current main; connect to capability registry; no certification/UI claims |
| Release, evaluation, observability | `019f8705-4855-7522-9140-8d45cd93ae60` | `gpt-5.6-luna` high | `IN_PROGRESS` | `a98f8bb` on old base | Reconcile CI/reports/health against current main; diagnose blocked deployment; produce integration packet |
| Learning Kernel and World Factory | `client-new-thread:81cee98c-352a-4ca6-8b4e-f4901523dcf2` | `gpt-5.6-terra` xhigh | `QUEUED_WORKTREE` | none | Build conformance SDK, migrate one World, define domain plugin boundary |
| AI Lesson Intelligence | `client-new-thread:17bde2c6-51a1-4f61-8ddc-b9e98cd0f741` | `gpt-5.6-terra` xhigh | `QUEUED_WORKTREE` | current `/studio` baseline | Add reviewed-draft workflow, capability matrix, live-eval harness, budget/privacy gates |

The principal remains the architecture/integration/red-team lane and uses `ultra` only when the user explicitly returns for review or a worker requests a cross-lane decision.

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
