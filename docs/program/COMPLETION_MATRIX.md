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
| RUNTIME-01 | One modular World authoring/runtime contract | `src/forge/contracts.ts`; `src/forge/world-runtime/**`; registry/runtime linter; Primary Source adapter | `PARTIAL`; Packet E primary-source slice `ACCEPTED` | One shared stage/action/access/support/proof/receipt protocol now drives Primary Source Reasoning and rejects undeclared/proof-blocked actions. The other three Worlds and the durable event/evidence projector are not migrated. | Learning Kernel next migration + Trust projector |
| RUNTIME-02 | Domain truth remains domain-specific | World reducers/validators; runtime adapter projection; registry invariants | `PROVEN` for the migrated slice | The shared kernel derives evidence disposition only from the authoritative Primary Source domain validator and does not contain subject answers. Equivalence for the other three runtime migrations remains untested. | Packet E follow-up conformance |
| PROOF-01 | Help visibly leaves before unfamiliar proof | Four World reducers/components; cross-route browser assertions; Primary Source runtime proof-isolation suite | `PARTIAL`; four routed Worlds have bounded browser proof | Primary Source now rejects instructional/model/replay actions in proof while preserving typed access. A common all-World runtime conformance suite and nonvisual-equivalence proof still do not exist. | Kernel migrations + Experience AT audit |
| PROOF-02 | Independent evidence is credible and replayable | Device ledger; proof record helpers; typed event journal | `MISSING` for independent/durable authority | Current result calculation and storage are client-controlled. No server proof nonce, frozen task/content version, validator receipt, canonical append/replay path, or visible conflict reconciliation exists. | Trust G1 + Kernel G2 |
| EVID-01 | Learner-owned bounded evidence, export, and deletion | Device ledger plus bounded local runtime receipt and tests | `PROVEN` for privacy-minimal device records; `PARTIAL` overall | The Primary Source runtime receipt names task/content/validator/support/access/source status but is deliberately client-controlled, non-durable, and source-incomplete. Device records remain mutable local storage and no accepted durable projector exists. | Trust projector after Kernel |
| EVID-02 | Every World emits one canonical evidence vocabulary | Three direct `recordWorldProof` writers; Primary Source bounded local receipt; event contracts | `CONTRADICTED` | Local ledger, event projection, and new runtime disposition remain separate vocabularies, and the Primary Source route emits no durable ledger/event record. The accepted ADR-001 projector is still missing. | Trust + Kernel projector |
| RETURN-01 | Delayed return proof uses a fresh reviewed task | World manifest limitations; ledger date scheduling | `MISSING` | A local date can be stored, but no reviewed delayed task family, scheduler, reminder policy, returned proof session, or delayed evidence ingestion exists. | G1/G2 then research validity |
| SOURCE-01 | Published factual content is source-grounded and reviewable | World metadata; strict runtime bound/legacy tuples; Packet F multi-source receipt/review contracts | `PARTIAL` | Complete snapshot/locator/claim/rights/review fields are now required before a source may be called bound, but current Primary Source runtime entries honestly remain legacy/incomplete and no durable acquisition, authenticity, rights, freshness, or correction service exists. | Source service + durable review queue |
| SOURCE-02 | Unknown questions cannot fabricate reviewed curriculum | Deterministic planner and invented-ID/source rejection tests | `PROVEN` | Unknown topics remain explicitly exploratory and cannot invent World/source IDs. There is not yet a source acquisition/review workflow to turn them into curriculum. | Packet F publication pipeline |
| AI-01 | Provider-neutral, schema-bounded draft generation | Fixed OpenAI, Anthropic, Gemini, OpenRouter adapters; allowlists; budgets; strict schema; mock/eval tests | `PROVEN` for mocked transports; `PARTIAL` overall | Fixed timeout/token/cost bounds, closed errors, request correlation, and default-off redacted live evaluation exist. No authorized live-provider evidence, durable quota/rate limiter, provider privacy decision, or enabled adult connector exists. | Separately authorized provider operations |
| AI-02 | AI never self-publishes or grades proof | Locked Studio page/API; replay-validated local review record; no publication route | `PROVEN` for the current non-publication boundary | Generated output remains an editable draft; fabricated approval, publication, and grade fields fail. Reviewer identity and records are local/non-durable, so no safe publication authority exists. | Durable identity/review service + principal publication gate |
| AI-03 | Reviewed draft-to-World publication and withdrawal | Local draft/source/factual/pedagogy/access/safety/proof/approved/rejected/withdrawn machine with immutable refs | `PARTIAL`; local Packet F state machine `ACCEPTED` | Deterministic replay and complete source-receipt shape exist, but there is no durable reviewer queue, authenticated decision authority, source authenticity, World compiler/publication event, withdrawal operation, or rollback evidence. | Source/review service + publication architecture |
| AGE-01 | Child modes fail closed across every entry route | Integrated server/client World age gate; device-profile validation; planner gate; forged-query/corrupt-profile/deep-link/reload E2E on `9a4068f` | `PROVEN` for the current routed surface | Both child-capable direct World routes now require a valid local device selection; child mode additionally requires grown-up confirmation. URL audience hints never grant access. This is a fail-closed routing result, not verified age or guardian identity; every future route must pass the same conformance gate. | Packet E all-World conformance for future routes |
| AGE-02 | A checkbox/local profile is never verified age or guardian authority | Structurally disabled cloud-auth authority; account-action and environment-forgery tests on `9a4068f` | `PROVEN` for the current disabled-cloud boundary; cloud operation `MISSING` | Complete-looking Supabase environment values and adult self-attestation still produce no cloud auth authority. Any future enablement requires separately approved CAPTCHA, durable distributed abuse control, authenticated age/guardian policy, and live negative proof. | Trust follow-up only after explicit cloud authorization |
| AUTH-01 | Adult identity and private continuity are production-operable | SSR helpers; structurally disabled authority; staged SQL and fresh/legacy-upgrade fixtures | `PARTIAL` architecture; `MISSING` operation | Local migration/RLS/trigger structure is executable and legacy-safe, but no configured-project signup/refresh/signout, CAPTCHA/limiter, two-account live isolation, explicit per-item sync, export/deletion completion, recovery, or consent-revocation operation exists. | Packet E runtime, then approved disposable project |
| DATA-01 | Durable append-only event/evidence spine is authoritative | Supabase migrations/contracts; typed in-memory journal; Packet B fresh and legacy-upgrade local SQL fixtures | `PARTIAL` | Ordered fresh and legacy upgrade replay now pass locally, including retired-purpose refusal and authority revocation. Application flows still do not emit/use the journal or database; rollback, concurrency, backup/restore, and configured-project proof remain absent. | Trust B after runtime E |
| DATA-02 | Identity, evidence, consent, sharing, and deletion remain separate | Program architecture; staged schemas | `PARTIAL` | Separation is designed but no end-to-end rights operation exists. Identity must not silently turn local evidence into cloud data. | Trust B; G1 gate |
| PATH-01 | Homeschool/self-study pathways preserve breadth, choice, access, relationships, protection, and portability | Integrated `src/forge/pathways/**` contract and 57-test adversarial suite on `033bb9a`; G4/G8 plans | `PARTIAL`; Packet C contract `PROVEN` | The deterministic review contract covers breadth, choice, access, consent/assent, relationships, protection, portability, source policy, and bounded claim review. Every published capability remains `needs-evidence` until a separately reviewed durable runtime projector/receipt exists; actual curriculum packages, learner challenge/stop operations, jurisdiction packs, records, moderation, and portability workflows are absent. | Durable projector, curriculum owners, then G8 |
| PEOPLE-01 | Projects and helpful human relationships are operational and safeguarded | Home roadmap copy; G6 architecture | `MISSING` | No project artifact/version/contribution workflow, verified role, reporting/blocking, contact boundary, expiry, supervision, appeal, or individual defence. | G6 after G1/G5; separate minor gate |
| ACCESS-01 | One coherent accessible learner instrument | Shared tokens/primitives; Packet A fidelity report; Primary Source typed accommodations; production browser matrix | `PARTIAL`; Packets A/E `ACCEPTED` | Home, Studio, account, all four Worlds, evidence, and trail retain 320 px, target/input/overflow, contrast, keyboard, reduced-motion, and forced-color checks; Primary Source also records construct-preserving access. Screen-reader sessions and complete all-state nonvisual equivalence remain incomplete. | Assistive-technology audit + remaining runtime migrations |
| SAFE-01 | Security/privacy/abuse boundaries support enabled cloud/provider use | CSP nonce; SSR/cookie/origin/body/schema checks; fixed providers; locked Packet B/F cloud/provider boundaries | `PARTIAL`; cloud/provider enablement remains forbidden | Public auth and Studio provider calls fail closed before authority/body/provider access. No CAPTCHA/durable limiter, configured-project/provider proof, provider privacy decision, prompt/source-poisoning operation, deletion/backup drill, incident operator, or enabled-cloud evidence exists. | Separately authorized Trust/provider operations |
| EVAL-01 | Engineering behavior is freshly verified | Accepted A-F code-integration tree `15a7531`; final candidate tree-equivalence checks | `PARTIAL`; deterministic/local/browser gates green | The integrated tree passed lint, typecheck, 410 application tests, 13 evaluator tests, optimized build, 166/166 local release checks, and 56-pass / 20-intentional-skip / 0-fail production Chromium. Live configured database/provider checks, Safari/Firefox, screen-reader sessions, and the final public deployment tuple remain separate gates. | Principal release gate + separately authorized live checks |
| EVAL-02 | Measurement validity, delayed retention, and learning effects are known | Evaluation plans and fixture harness | `MISSING` | No preregistration, equivalent task-family validation, rubric reliability, evaluator disagreement, contamination study, representative learner/access study, delayed retention, strong-baseline comparison, or independent review. | Research G7 |
| OPS-01 | Current source/test/deployment identity is trustworthy | Packet D release identity, exact health SHA/digests, candidate decisions, local/deployment verifiers | `PARTIAL`; Packet D `ACCEPTED` | Source/test/build identity is exact and fail-closed locally. One immutable READY URL, public alias confirmation, and retained final verification/rollback target must still be bound to the final source SHA. | Principal final release tuple |
| OPS-02 | CI, health, observability, artifact retention, and rollback are operational | Tracked immutable CI, health endpoint, sanitized reports, bounded artifacts, verifier and rollback-decision contracts | `PARTIAL`; Packet D `ACCEPTED` | CI/release machinery is real, but no alert/incident operation, public artifact audit on the final SHA, or actual rollback rehearsal has been completed. | Principal deployment; later operations rehearsal |
| DEPLOY-01 | A verified public deployment runs the integrated FORGE source | Packet D verifier and principal release candidate | `UNVERIFIED` before the final release gate | The final source SHA still needs one immutable READY URL, alias confirmation, exact health/digests, rendered journey/CSP scan, retained artifact, and rollback target. | Principal final release tuple |
| CLAIM-01 | Production-grade, broad homeschool/lifelong objective is achieved | Entire matrix | `CONTRADICTED` | Multiple foundational requirements are missing or contradicted. The strongest current statement remains a C1 interactive foundation/G1 candidate with four bounded Worlds. | Full G0–G8 program |

## 4. Goal-gate status

These are the dependency goals from `MASTER_PLAN.md`, not release marketing milestones.

| Goal | Current status | Evidence needed to exit |
| --- | --- | --- |
| G0 Program control and truth | `PARTIAL`; A-F dispositions and integration ledger complete | One current public release tuple plus future worker/release amendments must preserve the same evidence discipline. |
| G1 Trust core and durable replay | `PARTIAL`; Packet B fail-closed staging boundary accepted | Canonical evidence mapping, Packet E app event emission/projector, configured adult-only auth/RLS/privacy operations, real abuse controls, concurrency, replay, backup, restore, and rollback proof. |
| G2 Learning Kernel and World factory | `PARTIAL`; one-World Packet E slice accepted | Migrate the remaining three Worlds, accept one durable ADR-001 event/evidence projector, and prove all-World proof/access/evidence equivalence. |
| G3 AI lesson intelligence/publication | `PARTIAL`; structurally locked Packet F slice accepted | Durable authenticated review/source services, authorized quota/abuse/privacy controls, reviewed compiler/publication/withdrawal events, and separately approved live-provider evidence. |
| G4 Foundations and learner frontier | `PARTIAL`; pure pathway contract accepted | A separately reviewed durable runtime projector/receipt, reviewed curriculum packages, prerequisite/capability graphs, and actual broad/deep learner paths. |
| G5 Unified learner experience/access | `PARTIAL`; Packet A plus Primary Source runtime access accepted | Screen-reader sessions, complete semantic alternatives, all-state nonvisual equivalence, and the remaining runtime migrations. |
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
3. Keep accepted D-01 through D-05 invariants enforced before any persistence, runtime, or lesson-publication follow-up.
4. Keep managed provider keys and live paid generation disabled until Packet F plus authenticated budgets/abuse controls pass.
5. Do not publish generated curriculum until durable source, rights, factual, pedagogy, access, safety, and proof reviews are linked to an immutable package.
6. Keep the complete browser matrix green and add the still-missing screen-reader and all-state nonvisual-equivalence evidence.
7. Even with Packet D integrated, call no public URL the current FORGE release until the exact final tuple passes the principal gate.
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
