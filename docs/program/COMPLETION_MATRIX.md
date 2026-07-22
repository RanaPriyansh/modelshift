# FORGE Completion and Evidence Matrix

**Authority:** principal review task

**Purpose:** map the full FORGE objective to current evidence, missing proof, owners, and stop rules

**Accepted Wave 2 code cut:** `b5b3170094ecaac5292c7fd23a8b47d86ccc1a9d`

**Public production source:** `cd418b8a5bc9784fb5e4add3a2286d011fdbdae0` remains the last identified public-production source. Wave 2 is accepted code on `main`, not a deployed release, and this documentation amendment does not create a deployment tuple.

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

## 2. Engineering evidence and code-cut boundary

The earlier principal matrix below remains historical evidence for its named SHA only. It is not silently inherited by the Wave 2 code cut. The accepted Wave 2 chain is `4dab5d9` + `f4179e9` for the ADR-001 projector/coherence repair, `48ea3fd` + `30e1dde` + `2cf81ab` for the availability-only pathway surface, and `b5b3170` for release-verifier coverage of `/pathways`. The code cut has no durable/authenticated authority, SQL persistence, application runtime binding, live provider/model evaluation, broad curriculum, recommendation, homeschool-readiness, certification, child-cloud-auth, or public-deployment proof.

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
| RUNTIME-01 | One modular World authoring/runtime contract | `src/forge/contracts.ts`; `src/forge/world-runtime/**`; Primary Source adapter; ADR-001 projector chain `4dab5d9` + `f4179e9` | `PARTIAL`; one-World runtime and additive projector are accepted code | Primary Source still owns the only runtime binding. The projector accepts a completed local receipt as typed input but is not called by the application route and does not persist or authenticate it. Ratio runtime migration is next; Force and Motion and AI & Learning still require migration and all-World proof/access/evidence conformance. | Learning Kernel: Ratio migration, then all-World conformance |
| RUNTIME-02 | Domain truth remains domain-specific | World reducers/validators; runtime adapter projection; ADR-001 raw-outcome/disposition separation | `PROVEN` for the migrated slice | Primary Source owns the raw validator outcome. ADR-001 preserves it and applies only typed validity/uncertainty mapping without subject answers or a generic mastery score. Equivalence for the other three runtime migrations remains untested. | Packet E follow-up conformance |
| PROOF-01 | Help visibly leaves before unfamiliar proof | Four World reducers/components; cross-route browser assertions; Primary Source runtime proof-isolation suite | `PARTIAL`; four routed Worlds have bounded browser proof | Primary Source now rejects instructional/model/replay actions in proof while preserving typed access. A common all-World runtime conformance suite and nonvisual-equivalence proof still do not exist. | Kernel migrations + Experience AT audit |
| PROOF-02 | Independent evidence is credible and replayable | Device ledger; proof record helpers; additive v2 in-memory journal/projector | `MISSING` for independent/durable authority | ADR-001 can seal/replay typed local events with frozen caller-supplied task/content/validator facts, but it has no server proof nonce, route binding, authenticated append, durable storage, or visible conflict reconciliation. Current result calculation and storage remain client-controlled. | Trust G1 + Kernel G2 |
| EVID-01 | Learner-owned bounded evidence, export, and deletion | Device ledger plus bounded local runtime receipt and tests | `PROVEN` for privacy-minimal device records; `PARTIAL` overall | The Primary Source runtime receipt names task/content/validator/support/access/source status but is deliberately client-controlled, non-durable, and source-incomplete. Device records remain mutable local storage and no accepted durable projector exists. | Trust projector after Kernel |
| EVID-02 | Every World emits one canonical evidence vocabulary | Additive sealed v2 `ForgeEvent`, in-memory journal, fixed Primary Source fixture, and projector chain `4dab5d9` + `f4179e9` | `PARTIAL`; canonical code path accepted, not application authority | ADR-001 defines versioned v2 runtime-attempt events, canonical dispositions, separated cognitive/access facts, integrity validity reasons, append-only corrections, and strict v1/v2 non-mixing. It is deterministic/in-memory only: no route invokes it, no World emits it, no SQL row or authenticated identity exists, and v1 local/device writers remain. It cannot be called durable, trusted, or every-World evidence. | Bind after Ratio/all-World runtime conformance; design v2 additive SQL/golden fixture before persistence |
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
| PATH-01 | Homeschool/self-study pathways preserve breadth, choice, access, relationships, protection, and portability | Packet C deterministic contract; Wave 2 server-only availability projection/surface `48ea3fd` + `30e1dde` + `2cf81ab`; `/pathways` verifier coverage on `b5b3170` | `PARTIAL`; honest availability surface accepted | The public map names four released capability mappings and explicit entitlement-area gaps without learner input, evidence, schedule, recommendation, completion, or homeschool decision. It does not create curriculum packages, a path graph, learner choice operation, jurisdiction pack, record, moderation, portability workflow, entitlement, attendance, accreditation, or homeschool readiness. Every capability remains `needs-evidence` for independent review. | Durable projector; durable source service; reviewed curriculum and broad path graphs |
| PEOPLE-01 | Projects and helpful human relationships are operational and safeguarded | Home roadmap copy; G6 architecture | `MISSING` | No project artifact/version/contribution workflow, verified role, reporting/blocking, contact boundary, expiry, supervision, appeal, or individual defence. | G6 after G1/G5; separate minor gate |
| ACCESS-01 | One coherent accessible learner instrument | Shared tokens/primitives; Primary Source typed accommodations; Wave 2 `/pathways` reduced-motion check `2cf81ab` | `PARTIAL`; bounded checks only | The availability map joins the reduced-motion scan and keeps an availability-only, keyboard-linkable route. Primary Source records construct-preserving access facts in a local receipt/projector input. Screen-reader sessions, complete all-state semantic/nonvisual equivalence, real assistive-technology review, and conformance across runtime migrations remain incomplete. | Assistive-technology review + all-World runtime conformance |
| SAFE-01 | Security/privacy/abuse boundaries support enabled cloud/provider use | CSP nonce; SSR/cookie/origin/body/schema checks; fixed providers; locked Packet B/F cloud/provider boundaries | `PARTIAL`; cloud/provider enablement remains forbidden | Public auth and Studio provider calls fail closed before authority/body/provider access. No CAPTCHA/durable limiter, configured-project/provider proof, provider privacy decision, prompt/source-poisoning operation, deletion/backup drill, incident operator, or enabled-cloud evidence exists. | Separately authorized Trust/provider operations |
| EVAL-01 | Engineering behavior is freshly verified | Historical A-F evidence; accepted Wave 2 focused projector/pathway/release-verifier changes ending at `b5b3170` | `PARTIAL`; no Wave 2 release verdict | The Wave 2 commits add focused adversarial projector tests, pathway availability/reduced-motion checks, and a release-verifier `/pathways` marker. This matrix amendment does not assert a fresh complete release matrix on `b5b3170`; live configured database/provider checks, Safari/Firefox, screen-reader sessions, learning-validity studies, and final public deployment remain separate gates. | Principal fresh release/evaluation gate when authorized |
| EVAL-02 | Measurement validity, delayed retention, and learning effects are known | Evaluation plans and fixture harness | `MISSING` | No preregistration, equivalent task-family validation, rubric reliability, evaluator disagreement, contamination study, representative learner/access study, delayed retention, strong-baseline comparison, or independent review. | Research G7 |
| OPS-01 | Current source/test/deployment identity is trustworthy | Packet D release identity; Wave 2 `/pathways` verifier allowlist on `b5b3170` | `PARTIAL`; code identity is not deployed identity | The verifier now requires a pathway availability marker alongside the four Worlds, Studio, device profile, CSP nonce, disabled-cloud state, and release SHA. `b5b3170` is the accepted code cut; public production remains `cd418b8` until a principal binds a new immutable READY URL, alias, health/digests, retained artifact, and rollback target. | Principal final release tuple |
| OPS-02 | CI, health, observability, artifact retention, and rollback are operational | Packet D machinery plus `b5b3170` verifier coverage | `PARTIAL`; no production operation | The new route is represented in the verifier contract, but no alert/incident operation, public artifact audit on `b5b3170`, configured database operation, or actual rollback rehearsal has been completed. | Principal deployment; later operations rehearsal |
| DEPLOY-01 | A verified public deployment runs the integrated FORGE source | Historical public source `cd418b8`; Wave 2 code cut `b5b3170`; Packet D verifier | `UNVERIFIED` for Wave 2 | No immutable READY deployment, alias confirmation, exact `/api/health` SHA/digests, rendered journey/CSP/error scan, retained artifact, or rollback target has been bound to `b5b3170`. Do not describe Wave 2 as public production. | Principal final release tuple |
| CLAIM-01 | Production-grade, broad homeschool/lifelong objective is achieved | Entire matrix | `CONTRADICTED` | Multiple foundational requirements are missing or contradicted. The strongest current statement remains a C1 interactive foundation/G1 candidate with four bounded Worlds. | Full G0–G8 program |

## 4. Goal-gate status

These are the dependency goals from `MASTER_PLAN.md`, not release marketing milestones.

| Goal | Current status | Evidence needed to exit |
| --- | --- | --- |
| G0 Program control and truth | `PARTIAL`; A-F dispositions and integration ledger complete | One current public release tuple plus future worker/release amendments must preserve the same evidence discipline. |
| G1 Trust core and durable replay | `PARTIAL`; ADR-001 v2 projector/in-memory replay accepted code | No durable/authenticated authority, application event emission, additive SQL v2 schema/golden fixture, configured adult-only auth/RLS/privacy operation, concurrency, backup, restore, or rollback proof. |
| G2 Learning Kernel and World factory | `PARTIAL`; one-World Packet E slice plus ADR-001 projector accepted code | Migrate Ratio next, then Force and Motion and AI & Learning; bind no route before all-World proof/access/evidence conformance; prepare persistence only after additive v2 SQL/golden-fixture review. |
| G3 AI lesson intelligence/publication | `PARTIAL`; structurally locked Packet F slice accepted | Durable authenticated review/source services, authorized quota/abuse/privacy controls, reviewed compiler/publication/withdrawal events, and separately approved live-provider evidence. |
| G4 Foundations and learner frontier | `PARTIAL`; pure pathway contract plus availability-only public map accepted | Durable reviewed runtime receipt, durable source service, curriculum packages, prerequisite/capability graphs, and actual broad/deep learner paths. |
| G5 Unified learner experience/access | `PARTIAL`; Packet A, Primary Source typed access, and Wave 2 pathway reduced-motion coverage accepted | Screen-reader sessions, complete semantic alternatives, all-state nonvisual equivalence, real assistive-technology review, and the remaining runtime migrations. |
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
