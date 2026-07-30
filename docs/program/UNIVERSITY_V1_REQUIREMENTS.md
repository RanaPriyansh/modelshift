# FORGE university-first requirements

**Status:** implementation input for a side-effect-free foundation only
**Accepted code baseline:** `c4abe33bc5bc611a02eded4288e2a2949a2808f3`
**Working branch:** `agent/forge-university-foundation-20260730`
**Audience:** adults in a future private university research cohort
**Claim ceiling:** fixture-only engineering behavior; no demand, live-data, institutional-authority, learning, accessibility, production, or efficacy claim

## Product decision being tested

FORGE is testing a one-course-deep, all-current-courses-shallow semester loop. The first atomic job is:

> When critical course information is spread across systems, help me see what a connected source says, what remains unknown, and where sources conflict so I can choose the next sound action without mistaking a copy or parser result for university truth.

The two other atomic jobs—recovery after falling behind and protected concept learning—remain separate demand tests. This slice must not silently make course-source reconciliation the final acquisition promise.

## Evidence status

| Input | Status | Consequence |
| --- | --- | --- |
| Student-community and competitor research | Observed across a broad but English-language, forum-heavy corpus | Supports candidate needs and failure tests; does not establish prevalence |
| Current FORGE architecture and code | Directly inspected | Existing source authority is global/reviewed and the legal event runtime admits only World aggregates |
| FORGE target cohort behavior | Not yet observed by this program | Demand, setup tolerance, switching, and repeated use remain open |
| Live private coursework and institutional access | Not authorized | Use synthetic fixtures only |

## Prioritized requirements

### Gate requirements

| ID | Requirement | Acceptance evidence | Current state |
| --- | --- | --- | --- |
| `UV1-GATE-001` | Run the approved Phase −1 observation and substitution protocol before treating the wedge as validated. | Five to ten approved observations and matched substitutes with an explicit accept, narrow, repair, or reject decision. | Open |
| `UV1-GATE-002` | Pass the preregistered Phase 1 demand gate before a normative university product rebase. | Locked denominators, comparator, attrition, thresholds, adjudication, and 4–6 week concierge results. | Open |
| `UV1-GATE-003` | Do not ingest real student, accommodation, wellbeing, or coursework data without approved research, data-management, incident, and withdrawal authority. | Independent protocol approval and named accountable operators. | Open |
| `UV1-BASE-001` | Every implementation packet uses an isolated worktree from one exact accepted SHA. | Clean worktree and recorded base/branch. | Met for this slice |

### First source-foundation slice

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| `UV1-SRC-001` | Represent only learner-connected manual or ICS source revisions; accept no URL, connector, provider, file bytes, or institutional credential. | Strict schemas reject undeclared/raw fields and all code is side-effect free. |
| `UV1-SRC-002` | Scope every revision, candidate, and decision to one owner, tenant, academic term, and course without implying verified identity or RLS. | Cross-owner, cross-tenant, cross-term, and cross-course references fail closed; output labels scope as fixture-caller-asserted and tenant isolation as not established. |
| `UV1-SRC-003` | Keep private learner copies separate from globally published `source_packages`, `source_items`, and `source_claims`. | No reuse of global published-source tables or publication identities; an optional global link remains an unverified reference only. |
| `UV1-SRC-004` | Preserve revision digest, input kind, observation time, coverage window, inspected scopes, retention class, visibility, and exact locator. | Parsed immutable revision exposes each field and retains no source bytes. |
| `UV1-SRC-005` | Separate extraction match, source authenticity, institutional completeness, and freshness. | Learner acceptance can confirm transcription only; authenticity and institutional completeness remain `not_established`. |
| `UV1-SRC-006` | Preserve candidate, accepted, corrected, and rejected states. | One explicit learner decision projects each candidate; correction retains original and corrected facts. |
| `UV1-SRC-007` | Detect exact duplicates and deterministic conflicts without fuzzy inference, silent merging, or overwrite. | Same claim key plus same canonical fact produces a duplicate group; differing canonical facts produce an unresolved conflict. |
| `UV1-SRC-008` | Never convert connected-source coverage into “all requirements confirmed.” | Combined coverage is `unknown`, `partial`, or `connected_sources_reviewed`; institutional completeness is always `not_established`. |
| `UV1-SRC-009` | Compute freshness from declared observation/review windows as of an explicit time. | Future observations fail; expired windows are stale; absent windows remain unknown. |
| `UV1-SRC-010` | Treat any copied assessment-assistance policy as non-authorizing. | Effective mode remains `restricted_assessment` until separately authorized course/institution/human authority exists. |
| `UV1-SRC-011` | Adapt reviewed candidate state into existing goal/path continuity without activating a path or recommendation. | Goal context reuses the existing learner-goal schema version, ID, and storage class; carries only accepted/corrected non-conflicting facts; and fixes `executionAllowed` and `recommendationAllowed` to `false`. |
| `UV1-SRC-012` | Produce deterministic, immutable output with bounded arrays and stable ordering. | Same semantic input produces the same digest and projection; outputs are deeply frozen. |
| `UV1-SRC-013` | Fail closed when structural or semantic validation fails. | Malformed, missing-reference, duplicate-ID, mixed-scope, future-time, and decision-conflict tests return no usable context. |

### Cross-cutting requirements retained for later phases

These remain P0 for a private alpha but are deliberately not implemented by this slice:

- server-owned adult entitlement with issue, expiry, revocation, recovery, and negative authority tests;
- owner-scoped durable storage, forced RLS, two-account isolation, backup/restore, export, correction, and deletion;
- a reviewed event-authority decision before any replay, undo, or append-only claim for university objects;
- bounded transient document parsing with byte/render cleanup and reattachment semantics;
- capacity-aware planning, recovery, active study, protected checks, delayed return, and human routing;
- complete-process accessibility evidence, including 320 CSS px, keyboard, screen reader, reduced motion, forced colors, browser, and low-bandwidth tests;
- provider authority, budgets, groundedness evaluation, fallback, incident controls, and positive delayed-learning evidence before live tutoring;
- pilot operations, support, adjudication, unit economics, and claim review.

## First slice acceptance

The slice is ready for review only when:

1. no public route, database migration, provider, account, external connector, or production setting changes;
2. the new ADR states its authority ceiling and the unresolved durable-event choice;
3. focused normal, invalid, duplicate, conflict, correction, freshness, policy, immutability, and determinism tests pass;
4. lint, typecheck, the full unit/evaluator suite, and production build pass on the exact worktree;
5. the handoff explicitly reports `UV1-GATE-001..003` as open.

## Next implementation decision

After direct workflow evidence, choose one:

- continue the source foundation with a manual/ICS parser and reviewed goal adapter;
- narrow to recovery and one-next-action;
- narrow to guarded learning and protected checking;
- repair the combined loop;
- stop the university wedge.

Durable storage, live course data, UI route replacement, and generative tutoring are not the next automatic step.
