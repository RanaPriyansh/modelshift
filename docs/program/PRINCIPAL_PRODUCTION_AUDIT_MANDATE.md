# FORGE Independent Principal Production Audit Mandate

**Status:** Request-only terminal audit; read-only; no implementation or release authority

**Requested model:** GPT-5.6 SOL, ultra reasoning

**Existing Codex task:** `019f8e78-550b-7150-82d5-2acb958dab37` — `FORGE Real-World Principal Production Audit`

**Trigger:** the current planning/research amendment is frozen in one exact commit and all local structural checks pass

## 1. Purpose

Run one independent, adversarial, whole-system review of FORGE as a real-world product, not a hackathon demo. Steelman the architecture and product thesis first, then red-team what is implemented, what is only planned, and what remains missing. Produce recommendations and acceptance tests; do not implement, deploy, push, enable providers, alter data, create a review loop, or promote request-only evidence.

## 2. Immutable audit input

The task must record:

- repository path and exact full commit SHA;
- dirty/untracked state, if any;
- current deployed tuple separately from local source;
- governing authority order: `AGENTS.md`, `FORGE_PRODUCT_SPEC.md`, `docs/FORGE_ARCHITECTURE.md`, `docs/program/**`, ADRs, delivery gates, completion matrix;
- current claims and explicit non-claims;
- which artifacts are current implementation, accepted bounded evidence, proposed architecture, fixture/mock evidence, or request-only work.

If the target SHA or authority set is ambiguous, stop and report one blocker rather than auditing a moving tree.

## 3. Review lenses

Use the best applicable installed/internal skills and primary professional methods. At minimum inspect the available equivalents of:

- system architecture and multi-agent boundaries;
- security threat modeling, secure engineering, and cyber audit;
- Next.js/React frontend engineering and performance;
- Supabase/PostgreSQL, authentication, tenancy, RLS, migrations, backup/restore, and data lifecycle;
- product-design and accessibility audit;
- browser/E2E verification;
- agentic evaluation, RAG/memory, tool/MCP, provider, and AI safety boundaries.

Ground the audit in primary or governing methods where relevant: NIST AI RMF/SSDF, OWASP ASVS and LLM/GenAI risks, STRIDE/LINDDUN-style threat analysis, WCAG 2.2 and manual assistive-technology practice, SRE launch/error-budget/incident/rollback disciplines, supply-chain/protected-change controls, official Next.js/React/Supabase/PostgreSQL/provider guidance, and rigorous learning/measurement methodology. The task may inspect public Git repositories or official docs read-only to compare patterns, but it must not install unreviewed code or treat corporate convention as product evidence.

## 4. Required audit domains

1. North Star, user wedge, product coherence, and claim honesty.
2. Learning architecture across domains, exactly-two interpretation compiler, practical projects, protected proof, delayed return, and evidence validity.
3. Capability-map, curriculum/source/resource/review/publication authority and lifecycle.
4. Backend boundaries, event schemas/replay, persistence, migrations, concurrency, idempotency, queues, cache, deletion, backup/restore, and rollback.
5. Identity, adult entitlement, minors, guardian/educator sharing, RLS/tenant isolation, recovery, appeal, and audit.
6. External URLs/media/YouTube, provider metadata retention, tracking/ads, rights, accessibility, drift, incident hold, and provider failure.
7. LLM/provider abstraction, BYOK/managed secrets, prompt injection, tool isolation, data minimization, budgets, evaluation, fallback, and kill switches.
8. Frontend/runtime architecture, deterministic state, failure recovery, mobile/320px, keyboard, reduced motion, forced colors, zoom/reflow, screen reader, caption/audio-description, and cross-browser behavior.
9. UI/UX fidelity to the FORGE design constitution and avoidance of LMS/dashboard/chat/reward anti-patterns.
10. Observability, privacy-safe logs, metrics, SLOs, incident response, dependency/supply-chain security, CI/CD, exact release identity, and disaster recovery.
11. Content/reviewer/educator operating model, workload, economics, abuse capacity, correction SLA, and organizational feasibility.
12. Research design, construct validity, comparative baselines, subgroup/adverse effects, ethics, retention, and prohibited homeschool/efficacy/accreditation claims.

## 5. Adversarial cases that must be attempted conceptually or through safe read-only tests

- minor or anonymous user reaches an adult/provider/embed path by query, profile, deep link, direct API, stale tab, or cache;
- learner/model/local event forges reviewed, published, assigned, shared, or independently proved state;
- provider metadata expires/deletes but survives in cache, outbox, logs, analytics, backup, export, or old deployment;
- malicious title/description/source/URL causes prompt injection, XSS, SSRF, redirect abuse, file/HTML execution, credential/tool use, or log poisoning;
- provider popularity, engagement, sponsorship, or model preference changes resource ordering;
- proof help returns through back/reload/direct endpoint/cache/replay/postMessage or stale state;
- educator crosses scope, self-approves, overwrites learner choice, or sees another account/tenant;
- rollback resurrects withdrawn/unsafe content, revoked grants, incident holds, or deleted provider data;
- current four Worlds regress under new contracts;
- browser evidence accidentally targets a different worktree/server/commit.

## 6. Deliverable

Return one finite report with:

1. executive disposition: `NOT ACCEPTABLE`, `ACCEPTABLE FOR NAMED SCOPED PURPOSE`, or `ACCEPTABLE FOR NAMED RELEASE GATE`;
2. strongest steelman of FORGE and the most defensible near-term wedge;
3. P0–P3 findings, each with exact file/line or runtime evidence, affected invariant, concrete failure/abuse path, recommendation, and deterministic acceptance test;
4. architecture/data-flow and authority inconsistencies;
5. frontend/backend/UI/accessibility/security/operations/research findings kept distinct;
6. missing tests and evidence, including negative, concurrency, migration, browser, manual-AT, configured-service, rollback, and human-study evidence;
7. build / buy / partner / defer recommendations and dependency order;
8. a prioritized 30/90/365-day remediation plan with owners and stop gates;
9. exact claims that remain allowed and forbidden;
10. a completion ledger separating current, accepted-bounded, partial, blocked, missing, request-only, and contradicted work.

Do not create an iterative “review the review” loop. Finish the one-pass report, state uncertainties, and hand control back to the principal task.
