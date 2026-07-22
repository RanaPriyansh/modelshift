# FORGE Completion and Evidence Matrix

**Authority:** principal review task

**Purpose:** map the full FORGE objective to current evidence, missing proof, owners, and stop rules

**Implementation baseline audited:** `2e6dc1e33313ae8afc848803f6b0aa77f2cc713d`

**Audit date:** 22 July 2026

**Verdict:** the full objective is not complete

This file prevents a strong prototype, a broad plan, or a green test count from being mistaken for a production-grade lifelong or homeschool learning system. It remains current only when the principal updates it after reviewing integrated evidence on an exact SHA.

## 1. Disposition vocabulary

| Disposition | Meaning |
| --- | --- |
| `PROVEN` | Direct current-source or freshly executed evidence proves the exact bounded statement. It does not generalize beyond that statement. |
| `PARTIAL` | A real implementation/evidence slice exists, but a required condition, integration, population, mode, or proof level is absent. |
| `CONTRADICTED` | Current behavior or authoritative evidence conflicts with the requirement. |
| `MISSING` | No implementation or evidence satisfying the requirement exists on current `main`. |
| `UNVERIFIED` | An implementation or claim may exist, but current authoritative execution or external evidence is absent. |
| `IN_PROGRESS` | A bounded worker owns the next slice; nothing is accepted until principal review and integration. |

Documentation is never sufficient proof of behavior. Mocked provider/auth tests are not live provider/auth proof. A local browser ledger is not tamper-resistant independent evidence. A public URL is not a verified current release unless its source SHA and runtime state are known.

## 2. Fresh engineering evidence on the audited SHA

The principal ran these commands on clean `main` at `2e6dc1e` before the governance correction that adds this matrix:

| Command | Result | What it proves | What it does not prove |
| --- | --- | --- | --- |
| `pnpm lint` | PASS, zero warnings | Current TypeScript/application files satisfy the configured lint gate. | Runtime behavior, learning validity, security, or access. |
| `pnpm typecheck` | PASS | Current compiled TypeScript contracts are internally type-consistent. | Schema compatibility with live providers or databases. |
| `pnpm test` | PASS: 23 files, 182 application tests; 1 file, 9 evaluator-contract tests | The inspected unit/component/contract fixtures execute successfully. | Live provider, live database, production, human, retention, or efficacy behavior. |
| `pnpm eval` | PASS: 54 fixture inputs; authored probe invariant passes; clear-fixture baseline 29/38 | The offline interpretation fixture runner is valid and reports its bounded baseline honestly. | Live model quality; the live suite was not run because no key was present. |
| `pnpm build` | PASS: optimized Next.js build; 14 application/API routes listed | Current application compiles in production mode. | That the same source is deployed or production-operable. |
| `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3117 pnpm test:e2e` | NOT GREEN | A unique-port browser run loaded the application and exposed a concrete test-contract failure. | A complete browser matrix. The run must be repeated after correction. |

The browser failure is in `tests/e2e/forge-expansion.spec.ts:45`: a global `getByRole("img")` count expects one image, but the valid accessible Exit-world icon creates a second image role. The page snapshot shows the intended historical source image loaded. The test must select the named/figure-scoped source image; the product icon must not be hidden to satisfy a brittle count.

Every integrated candidate must rerun the full matrix on its final exact SHA and retain machine-readable/browser artifacts. The results above cannot be inherited silently by future commits.

## 3. Objective requirement matrix

| ID | Full-objective requirement | Current authoritative evidence | Disposition | Exact missing or conflicting proof | Owner / prerequisite |
| --- | --- | --- | --- | --- | --- |
| GOV-01 | One current authority for the broad FORGE mandate | `AGENTS.md`; `FORGE_PRODUCT_SPEC.md`; `docs/program/**` | `PROVEN` by this governance change | The former top-level rule named the one-World ModelShift spec as global authority. `AGENTS.md` now makes it historical and names the FORGE authority order. Future workers must use the updated base. | Principal; propagate to every lane |
| GOV-02 | Honest claim boundary | `README.md`; `docs/FORGE_DELIVERY_GATES.md`; program constitution | `PROVEN` for current copy | Current copy calls the product a C1/G1 candidate and rejects homeschool, efficacy, safety, and education-replacement claims. This proves copy discipline, not readiness. | Principal maintains |
| UX-01 | A universal question-first learner entrance | `ForgeHome.tsx`; planner schema/routes/tests; planner E2E | `PARTIAL` | Known questions route safely and unknown topics remain unverified, but the authored catalog contains only four matchable Worlds and no complete journey/path memory. | Kernel, Pathways, Experience |
| WORLD-01 | Multiple rigorous subjects, not physics only | Four `/learn/*` routes; `src/forge/worlds.ts`; domain reducers/validators | `PROVEN` for four Worlds; `PARTIAL` for the objective | Mechanics, proportional reasoning, AI/source evaluation, and primary-source reasoning are real bounded Worlds. They are not a broad foundation, complete subject map, or learn-anything system. | Kernel plus domain/content owners |
| WORLD-02 | Deep self-study across broad foundations and learner-chosen depth | Roadmap catalog and G4 plan | `MISSING` | No reviewed entitlement map, prerequisite/capability graph, W0 foundation library, deep sequences, multilingual/access variants, or broad arts/health/civic/practical coverage. | Pathways G4 after Kernel G2 |
| RUNTIME-01 | One modular World authoring/runtime contract | `src/forge/contracts.ts`, registry, validators | `PARTIAL`; Packet E `IN_PROGRESS` | Packages exist, but no common stage/action/access/support/proof/evidence runtime drives all four Worlds. Primary-source completion is not wired into the ledger. | Learning Kernel Packet E |
| RUNTIME-02 | Domain truth remains domain-specific | World reducers/validators and registry invariants | `PROVEN` in current static architecture | The deterministic validators are real and subject-owned. Runtime equivalence and server-owned invocation remain to be shown. | Packet E conformance suite |
| PROOF-01 | Help visibly leaves before unfamiliar proof | Force, AI-learning, ratio reducers/components and browser assertions; primary-source component | `PARTIAL` | Three Worlds have focused browser evidence; primary source lacks equivalent route-level negative proof. No all-World conformance test rejects hint/replay/model/action attempts in proof. | Packet E + Experience |
| PROOF-02 | Independent evidence is credible and replayable | Device ledger; proof record helpers; typed event journal | `MISSING` for independent/durable authority | Current result calculation and storage are client-controlled. No server proof nonce, frozen task/content version, validator receipt, canonical append/replay path, or visible conflict reconciliation exists. | Trust G1 + Kernel G2 |
| EVID-01 | Learner-owned bounded evidence, export, and deletion | `src/lib/forge-evidence/**`; evidence UI and tests | `PROVEN` for privacy-minimal device records; `PARTIAL` overall | Device export/delete and no-raw-text boundaries are real. Records lack complete task/content/source/validator/accommodation/reviewer/correction provenance and are mutable local storage. | Trust Packet B + Kernel Packet E |
| EVID-02 | Every World emits one canonical evidence vocabulary | Three direct `recordWorldProof` writers; optional primary-source callback; event contracts | `CONTRADICTED` | Local ledger uses `proved/not_proved`, shared contracts use `demonstrated/partial`, and event projections use `proved/not_proved/open_question`; primary-source route emits no ledger record. | Principal decision D-01; Packets B/E |
| RETURN-01 | Delayed return proof uses a fresh reviewed task | World manifest limitations; ledger date scheduling | `MISSING` | A local date can be stored, but no reviewed delayed task family, scheduler, reminder policy, returned proof session, or delayed evidence ingestion exists. | G1/G2 then research validity |
| SOURCE-01 | Published factual content is source-grounded and reviewable | World source metadata, registry validation, primary-source provenance file | `PARTIAL` | Reviewed flags/URLs are authored metadata, not durable source snapshots/hashes, rights records, named review decisions, freshness/correction workflow, or claim-locator binding. | Packets E/F; source contract D-03 |
| SOURCE-02 | Unknown questions cannot fabricate reviewed curriculum | Deterministic planner and invented-ID/source rejection tests | `PROVEN` | Unknown topics remain explicitly exploratory and cannot invent World/source IDs. There is not yet a source acquisition/review workflow to turn them into curriculum. | Packet F publication pipeline |
| AI-01 | Provider-neutral, schema-bounded draft generation | Fixed OpenAI, Anthropic, Gemini, OpenRouter adapters; strict Zod schema; mock tests | `PROVEN` for mocked transports; `PARTIAL` overall | No live credential evidence, model capability matrix, validated model override allowlist, token/time/cost quotas, rate limiter, correlation ledger, or full error taxonomy. | Lesson Intelligence Packet F |
| AI-02 | AI never self-publishes or grades proof | Studio copy/schema/API; no publication route | `PROVEN` for current non-publication boundary | Drafts cannot publish today. The reviewed state machine and named human review record do not exist, so safe publication is unavailable rather than proven. | Packet F + principal publication gate |
| AI-03 | Reviewed draft-to-World publication and withdrawal | Target architecture only | `MISSING` | No source-needed, factual, pedagogy, access, proof, approved, rejected, withdrawn workflow tied to immutable source/package versions and rollback events. | Packet F; source/runtime decisions |
| AGE-01 | Child modes fail closed across every entry route | Planner/device-profile gates; ratio query gate; manifests | `CONTRADICTED` | Primary-source direct route has no grown-up/audience gate. Ratio can default to teen when opened without the guarded query. Catalog/direct navigation bypass coverage is absent. | Trust + Experience; stop-ship |
| AGE-02 | A checkbox/local profile is never verified age or guardian authority | Device-profile copy/types; account action | `CONTRADICTED` for cloud signup | Copy labels local profiles non-authoritative, but configured cloud signup accepts a caller-controlled “18 or older” checkbox. Direct server-action invocation must fail closed for under-18/cloud ambiguity. | Trust Packet B; stop-ship |
| AUTH-01 | Adult identity and private continuity are production-operable | SSR auth helpers, cookie/key tests, staged SQL | `PARTIAL` architecture; `MISSING` operation | No configured-project signup/refresh/signout evidence, CAPTCHA/limiter, two-account RLS isolation, explicit per-item sync, export/deletion completion, recovery, or consent-revocation proof. | Trust Packet B + approved disposable project |
| DATA-01 | Durable append-only event/evidence spine is authoritative | Supabase migrations/tests; typed in-memory journal | `PARTIAL` | SQL has strong staged RLS/idempotency/append contracts, but application flows do not emit/use the journal or database. Fresh/upgrade/rollback/concurrency/backup/restore proof is absent. | Trust B after runtime E |
| DATA-02 | Identity, evidence, consent, sharing, and deletion remain separate | Program architecture; staged schemas | `PARTIAL` | Separation is designed but no end-to-end rights operation exists. Identity must not silently turn local evidence into cloud data. | Trust B; G1 gate |
| PATH-01 | Homeschool/self-study pathways preserve breadth, choice, access, relationships, protection, and portability | G4/G8 plans; Packet C | `MISSING` on `main`; Packet C `IN_PROGRESS` | No current `src/forge/pathways/**`, breadth evaluator, entitlement state, learner challenge/stop path, jurisdiction pack, records, moderation, or portability operation. | Pathways C, then G8 |
| PEOPLE-01 | Projects and helpful human relationships are operational and safeguarded | Home roadmap copy; G6 architecture | `MISSING` | No project artifact/version/contribution workflow, verified role, reporting/blocking, contact boundary, expiry, supervision, appeal, or individual defence. | G6 after G1/G5; separate minor gate |
| ACCESS-01 | One coherent accessible learner instrument | Shared shell; bespoke World systems; existing browser tests | `PARTIAL`; Packet A `IN_PROGRESS` | Shared tokens/primitives are not integrated across all routes. Existing cross-route smoke is mostly 390 px; only Studio has explicit 320 px proof. Forced colors, full keyboard journeys, primary-source reduced motion, screen-reader sessions, and nonvisual equivalence remain incomplete. | Experience Packet A + Packet E hooks |
| SAFE-01 | Security/privacy/abuse boundaries support enabled cloud/provider use | CSP nonce, SSR cookie tests, origin/body/schema limits, fixed providers | `PARTIAL` | No app limiter/CAPTCHA, configured-project/provider proof, prompt/source poisoning operating test, provider privacy decision, deletion/backup drill, incident operator, or production header/runtime verification. | Trust B, Lesson F, Release D |
| EVAL-01 | Engineering behavior is freshly verified | Section 2 commands | `PARTIAL` | Lint/typecheck/unit/eval/build are fresh. Browser is not green; live DB/provider and production matrices are unrun. | Release D + owning lanes |
| EVAL-02 | Measurement validity, delayed retention, and learning effects are known | Evaluation plans and fixture harness | `MISSING` | No preregistration, equivalent task-family validation, rubric reliability, evaluator disagreement, contamination study, representative learner/access study, delayed retention, strong-baseline comparison, or independent review. | Research G7 |
| OPS-01 | Current source/test/deployment identity is trustworthy | Git `2e6dc1e`; conflicting deployment docs; blocked candidate record | `CONTRADICTED` | Current source is not tied to one immutable READY URL, public alias, runtime switches, test artifacts, CSP/error scan, and rollback target. Historical docs name inconsistent prior READY SHAs/deployments. | Release Packet D + principal |
| OPS-02 | CI, health, observability, artifact retention, and rollback are operational | None on current `main`; old-base ops handoff only | `MISSING`; Packet D `IN_PROGRESS` | No tracked current CI workflow, release identity endpoint, deployment verifier, artifact retention, alert/incident path, or rollback rehearsal. | Release Packet D |
| DEPLOY-01 | A verified public deployment runs the integrated FORGE source | Last known public/blocked deployment records | `UNVERIFIED` | The last READY public alias is behind current source, while the current candidate was blocked. Do not call current FORGE production-deployed. | Principal after D and integration |
| CLAIM-01 | Production-grade, broad homeschool/lifelong objective is achieved | Entire matrix | `CONTRADICTED` | Multiple foundational requirements are missing or contradicted. The strongest current statement remains a C1 interactive foundation/G1 candidate with four bounded Worlds. | Full G0–G8 program |

## 4. Goal-gate status

These are the dependency goals from `MASTER_PLAN.md`, not release marketing milestones.

| Goal | Current status | Evidence needed to exit |
| --- | --- | --- |
| G0 Program control and truth | `PARTIAL` | Authority drift is corrected here; worker dispositions, one current release tuple, and reviewed integration ledger remain. |
| G1 Trust core and durable replay | `PARTIAL` | Canonical evidence mapping, app event emission, configured adult-only auth/RLS/privacy operations, abuse controls, concurrency/replay/backup/rollback proof. |
| G2 Learning Kernel and World factory | `IN_PROGRESS` | One shared runtime/manifest conformance system, Primary Source migration, all-World proof/access/evidence equivalence. |
| G3 AI lesson intelligence/publication | `IN_PROGRESS` once queued worktree starts | Capability/budget/error contracts, review states, source bindings, offline/live-gated eval harness, no publication authority leak. |
| G4 Foundations and learner frontier | `IN_PROGRESS` for pure pathway contract; otherwise `MISSING` | Reviewed breadth/choice/access/protection/portability evaluator plus actual curriculum packages and deep paths. |
| G5 Unified learner experience/access | `IN_PROGRESS` | Integrated design system and complete 320 px/keyboard/reduced-motion/forced-colors/nonvisual proof. |
| G6 Projects, people, contribution | `MISSING` | G1/G5 prerequisites, project provenance, verified roles, consent, reporting, expiry, appeals, safeguarding. |
| G7 Measurement validity/research | `MISSING` | Construct/task-family validity, reliability, contamination, transfer/retention, representative access, preregistered strong-baseline studies. |
| G8 Homeschool/institution operations | `MISSING` | All prerequisites plus named jurisdiction, records/rights, accommodations, complaints, workload, continuity, legal/safeguarding/access review, portability acceptance. |

## 5. Accepted principal decisions required by cross-lane integration

The normative resolutions for D-01 through D-06 are in `ARCHITECTURE_DECISIONS.md`. The summaries below remain an audit index; they are no longer open choices for workers.

### D-01 — Canonical evidence outcome and assistance mapping

Unify, without losing provenance:

- device ledger: `proved | not_proved`;
- shared contract: `demonstrated | partial`;
- event projection: `proved | not_proved | open_question`;
- assistance labels including `ai`, `model`, and `model_interpretation`.

The canonical journal vocabulary must represent uncertainty, contamination, accommodation, cognitive assistance, and corrections. UI/device/cloud projections may map from it; they may not invent stronger outcomes.

### D-02 — Content and World lifecycle mapping

Reconcile:

- pack lifecycle `draft | released | suspended`;
- SQL lifecycle `draft | review | published | disabled | retired`;
- event lifecycle `published | disabled | superseded`;
- lesson review lifecycle from draft through reviewed/withdrawn.

Human approval does not itself publish a World. Publication is a separate reviewed event with exact package/source/policy versions and rollback target.

### D-03 — Canonical source identity

World manifests, source packages/items/claims, Studio source needs, rights records, review decisions, and event replay must share stable source/version/checksum/reviewer identifiers. A URL plus `reviewed: true` is not sufficient publication provenance.

### D-04 — World runtime extension rule

Packet E must extend existing `LearningWorldPack`/registry identities rather than create parallel package, proof, or evidence authorities. Domain validators remain authoritative for subject truth; runtime owns only common protocol and authorized effects.

### D-05 — Age and guardian enforcement

Device preferences remain UX inputs. Every route/API/action independently enforces the permitted age mode. Under-18 cloud identity and all sharing/contact remain disabled until server-owned relationship, consent/assent, recovery, jurisdiction, and safeguarding gates pass.

### D-06 — Release identity tuple

Every candidate records exactly:

```text
source SHA
tested SHA and retained artifacts
immutable deployment ID/URL
public alias and alias-resolution time
build/runtime mode
enabled cloud/provider flags without secrets
database migration identity
browser/CSP/error verification
rollback target and rehearsal evidence
```

No field may be inferred from a branch name, dashboard label, or previous deployment.

## 6. Ordered stop-ships

1. Close `AGE-01` and `AGE-02` before enabling any cloud identity or presenting child routes as guarded.
2. Do not call browser-local outcomes independently verified evidence until `PROOF-02`, `EVID-02`, and `DATA-01` pass.
3. Resolve D-01 through D-05 before merging persistence, runtime, or lesson-publication slices.
4. Keep managed provider keys and live paid generation disabled until Packet F plus authenticated budgets/abuse controls pass.
5. Do not publish generated curriculum until durable source, rights, factual, pedagogy, access, safety, and proof reviews are linked to an immutable package.
6. Rerun a complete green browser matrix after the image-locator correction; add missing 320 px, forced-colors, keyboard, reduced-motion, and nonvisual coverage.
7. Resolve D-06 and integrate Packet D before calling any public URL the current FORGE production release.
8. Do not claim homeschool readiness before actual G1–G8 prerequisites, a named jurisdiction/learner band/context, and independent legal/safeguarding/access decisions.
9. Do not claim learning, retention, efficacy, or broad transfer before G7 measurement-valid and comparative evidence exists.

## 7. Current worker acceptance focus

| Packet | Principal will reject the handoff if… |
| --- | --- |
| A — Experience | It hides valid semantics to satisfy a brittle test; lacks all-route state evidence; or calls 390 px proof “320 px.” |
| B — Trust/auth | It trusts the adult checkbox, creates a fourth evidence vocabulary, auto-syncs local evidence, exposes service role, or promotes mock/RLS text to live proof. |
| C — Pathways | It produces schedules/compliance claims instead of a pure deterministic review contract, or turns missing evidence into entitlement completion. |
| D — Release | It cannot identify the blocked deployment cause and exact current tuple, introduces unapproved deploy capability, or reports engineering tests as educational validity. |
| E — Kernel | It creates parallel World/package/evidence truth, imports subject answers into the kernel, or migrates UI without proof/access/evidence equivalence. |
| F — Lesson Intelligence | It accepts arbitrary model/endpoint authority, self-approves, logs learner text/keys, spends live credits, grades proof, or treats source needs as verified sources. |

## 8. Completion rule

The durable objective is complete only when every requirement in Section 3 is `PROVEN` at the exact required scope, every G0–G8 gate has its signed evidence packet, no stop-ship remains, and one frozen integrated SHA passes local, provider/database where authorized, rendered-access, production, rollback, and human-validity gates. Until then, FORGE remains an actively built learning-system architecture with bounded working Worlds—not a production-grade homeschool or education replacement.
