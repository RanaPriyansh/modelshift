# FORGE Dependency-Ordered Master Plan

This is a goal graph, not a feature backlog. Each goal ends in an evidence-backed exit gate. Later work cannot retroactively repair an earlier trust failure.

## Goal graph

```text
G0 Program control and truth
 ├─> G1 Trust core and durable event replay
 │    ├─> G2 Learning kernel and World factory
 │    │    ├─> G3 AI lesson intelligence and publication workflow
 │    │    └─> G4 Foundations and learner-frontier pathways
 │    └─> G5 Unified learner experience and access system
 ├─> G6 Projects, people, and real-world contribution (after G1/G5 safety)
 ├─> G7 Measurement validity and learning research (after G2/G4)
 └─> G8 Homeschool/institution operations and portability (after G1/G4/G6/G7)
```

## G0 — Program control and current-state truth

**North Star:** every worker acts on the same architecture, baseline, ownership, and claim boundary.

Deliverables:

- canonical program documents in this directory;
- thread ledger with models, worktrees, owned paths, dependencies, and handoff state;
- current source/deployment identity endpoint and release record;
- conflict-aware dispositions for the four existing worker commits;
- principal review queue with accepted/rejected/deferred evidence.

Exit gate:

- every active thread starts from or explicitly rebases onto the named main SHA;
- no two active threads own the same mutable paths without a declared sequence;
- source SHA, tested SHA, deployed SHA, migration state, and live provider state are distinguishable;
- blocked deployment `dpl_GwTK…` is diagnosed without changing the production alias until a verified candidate exists.

## G1 — Trust core and durable event replay

**North Star:** identity, consent, assistance, proof, evidence, sharing, and deletion are authoritative, replayable, private, and recoverable.

Work:

1. finalize event envelope, aggregate boundaries, append/idempotency rules, outbox semantics, and correction events;
2. connect one adult-only vertical slice to a disposable then approved Supabase project;
3. prove signup/signin/refresh/signout, explicit evidence sync, RLS isolation, export, item deletion, account deletion, consent/grant expiry, and recovery;
4. add CAPTCHA/application limiter and deployment configuration checks before enabling cloud auth;
5. keep minors device-only until a separate G1-minor packet passes.

Exit gate:

- concurrency, duplicate, out-of-order, replay, partial-failure, backup/restore, and migration rollback tests pass;
- no service-role secret reaches a client or model;
- two test accounts cannot observe or mutate one another's records;
- every visible durable record derives from the journal or names itself a local/prototype view;
- privacy operations produce auditable completion/failure states.

## G2 — Learning kernel and World factory

**North Star:** a domain author can build a rigorous Vanishing Instrument World without reimplementing trust, proof, access, or evidence semantics.

Work:

- define the stable `WorldPackage` authoring SDK and runtime adapter;
- extract shared stage semantics, support authorization, proof lock, evidence emission, and access alternatives;
- keep subject reasoning in domain plugins: experimental, mathematical, source/historical, linguistic, systems, spatial/design, practical/performance;
- create conformance fixtures and a World package linter;
- migrate the four current Worlds without behavior regression;
- build one new non-STEM World through the factory as the acceptance case.

Exit gate:

- all current Worlds pass the same conformance suite plus their domain validators;
- exactly two readings are understandable within ten seconds in compiler scenes;
- deterministic state is the single source for all synchronized representations;
- proof controls are structurally absent across every World;
- 320 px, keyboard, screen-reader semantics, reduced motion, forced colors, and nonvisual evidence alternatives pass.

## G3 — AI lesson intelligence and publication workflow

**North Star:** the best available model can help produce unusually clear, testable explanations across subjects while remaining a replaceable proposal layer.

Work:

1. productionize OpenAI, Anthropic, Gemini, and OpenRouter adapters with capability discovery and stable model policy;
2. separate generation, critique, source planning, revision, and publication review;
3. add structured evaluation corpora across ages/domains for factuality, explanation quality, separating-test quality, leakage, transfer validity, safety, citation binding, latency, and cost;
4. add adult/guardian budget, quota, provider disclosure, key deletion, and managed-key abuse controls;
5. create a draft review queue that records source/rights/access/proof reviewer decisions without letting the model self-approve;
6. allow published World creation only after all review gates produce a versioned package.

Exit gate:

- live credentialed suites pass separately for each supported provider/model pair;
- malformed/refusal/timeout/rate-limit/cost-cap paths fail safely;
- key and learner text are absent from logs, URLs, caches, analytics, and returned errors;
- no generated citation is trusted without stable source binding;
- reviewers can reproduce, amend, reject, unpublish, and roll back a package.

## G4 — Foundations and learner-frontier pathways

**North Star:** every learner retains broad foundations while pursuing questions as deeply and differently as they choose.

Work:

- integrate the nine-area entitlement and age-band authority contracts from the existing homeschool-pathways lane;
- represent dependencies as capabilities and evidence requirements, not grade levels or lockstep courses;
- distinguish required foundation, chosen frontier, project/application, relationship, and return-proof obligations;
- create pathway explainability: why this step, what can be skipped, what evidence is missing, who controls the decision;
- author an initial balanced package spanning language/literacy, mathematics, science, history/source reasoning, computing/AI, arts/design, practical life, civic/media, and health/movement with explicit limits;
- support disability/access alternatives without lowering the intended construct silently.

Exit gate:

- every learner band receives meaningful breadth, choice, access, relationship, protection, and portability checks;
- no pathway uses engagement scores, hidden ranking, streaks, badges, or opaque recommendation weights;
- a learner/guardian can challenge, change, export, or stop a pathway;
- coverage claims trace to reviewed packages rather than generated lesson counts.

## G5 — Unified learner experience and access system

**North Star:** FORGE feels like one calm thinking instrument from first question through later proof, not a collection of demos or dashboards.

Work:

- adopt the production design-system slice selectively against current main;
- unify paper/ink/cyan/amber/violet tokens, typography, focus, component states, and route shell;
- implement question-first intake, Learning Contract, path map, catalog, active World, trail, evidence, Studio, account, return proof, and trust/explanation surfaces;
- make child-with-grown-up, teen, and adult modes explicit without pretending mode is verified identity;
- add loading/empty/error/offline/corrupt/permission/expired/contaminated states;
- produce 320 px through large-desktop browser and assistive-technology evidence.

Exit gate:

- one dominant question per learner viewport;
- no persistent AI character/chat rail or dashboard-first opening;
- repeated controls have unique accessible names and tabs use roving focus;
- a fresh user can state what AI did, what left during proof, what was demonstrated, and what remains untested;
- all production routes have no unexpected console errors, CSP violations, overflow, broken focus, or hidden required meaning.

## G6 — Projects, people, and contribution

**North Star:** learners apply capability to meaningful work with safe human relationships and attributable contributions.

Prerequisites: G1 adult trust core and G5 access shell. Minor interpersonal release additionally requires its own safeguarding gate.

Work:

- project briefs, constraints, milestones, artifact versions, roles, contributions, feedback, reflection, and evidence links;
- verified/expiring human roles, report/block, contact boundaries, conflicts, supervision, and appeals;
- contribution attribution that does not reduce teamwork to individual surveillance;
- offline/manual evidence and reviewer disagreement paths.

Exit gate:

- no open minor DM or unverified mentor access;
- every external side effect has consent, scope, expiry, audit, and rollback/revocation behavior;
- project evidence distinguishes assisted production, contribution, independent capability, and external judgment.

## G7 — Measurement validity and learning research

**North Star:** FORGE knows what it can measure before claiming what it teaches.

Work:

- define constructs and task families per domain;
- measure rubric reliability, evaluator disagreement, task difficulty, representation/access effects, contamination, near/far transfer, and delayed retention;
- compare against strong authored and human-guided baselines;
- preregister feasibility and comparative studies; report attrition, workload, cost, subgroups, incidents, and negative findings;
- keep research data separate from product operations and minimize learner data.

Exit gate:

- one scoped domain/population/version reaches measurement-valid research status before efficacy language;
- independent or arm's-length reviewers can reproduce the analysis;
- no mastery, intelligence, permanent profile, or broad school-replacement claim is derived from immediate single tasks.

## G8 — Homeschool and institutional operations

**North Star:** a family or institution can rely on FORGE only where rights, quality, safeguarding, workload, legal context, and pathway portability have been operationally proven.

Work:

- jurisdiction-specific calendars, records, required subjects, attendance/participation definitions, accommodations, reporting, moderation, complaints, and transitions;
- guardian/educator workflows with least privilege and explicit learner rights;
- external standards mapping that does not collapse the learner frontier;
- service availability, offline continuity, incident response, source correction, staff/reviewer workload, cost and equity analysis;
- portability/export and appeal mechanisms accepted by named external partners.

Exit gate:

- a named jurisdiction, learner band, context, version, and operating organization pass G1-G7 prerequisites;
- legal/child-safety/accessibility authorities sign their own scoped decisions;
- FORGE may then claim only the exact validated pathway/operational scope, never universal education replacement.

## Immediate execution wave

The next worker wave is deliberately smaller than the full vision:

1. reconcile existing design, ops, auth, and pathway commits against `846158a` without blind cherry-picks;
2. build the World Factory contract and migrate one current World;
3. harden Lesson Studio into a reviewed-draft pipeline with provider live-eval harnesses but no production key activation;
4. land CI/release identity and diagnose the blocked Vercel candidate;
5. principal reviews all six packets together for event, proof, age, source, access, and claim conflicts;
6. integrate only independently green, non-overlapping slices, then cut a new candidate.
