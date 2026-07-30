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

### Transient manual and calendar ingestion slice

This parser packet closes the synthetic derivation gap without authorizing real coursework or durable source storage.

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| `UV1-INGEST-001` | Accept only bounded, transient, caller-supplied structured manual data or calendar text; accept no URL, connector, credential, provider, database, file path, or storage handle. | Strict runtime schemas reject undeclared fields; implementation contains no network, filesystem, provider, database, browser-storage, or event call. |
| `UV1-INGEST-002` | Copy untrusted request data through an accessor-free plain-JSON boundary before schema traversal. | Accessor, non-plain prototype, sparse/extended array, excessive-depth, and malformed inputs fail closed; hostile getter tests prove no getter execution. |
| `UV1-INGEST-003` | Name the calendar implementation as a bounded RFC 5545 subset rather than claiming general ICS support. | Parser authority is exactly `rfc5545-one-shot-review-subset.v1`; ADR-012 names supported and unsupported grammar. |
| `UV1-INGEST-004` | Derive calendar facts only from caller-declared UID-to-fact mappings. | No title/category/description heuristic chooses commitment, deadline, consequence, or claim identity; exact mapping tests cover VEVENT/VTODO and property-kind mismatch. |
| `UV1-INGEST-005` | Support one-shot VEVENT commitments and VEVENT/VTODO deadlines only when date-time semantics are explicit. | UTC or explicit supported TZID succeeds; floating, all-day, invalid zone, clock-gap, malformed, cancelled, and recurring/exception inputs fail closed. Repeated local clock time chooses the RFC-defined first occurrence. |
| `UV1-INGEST-006` | Bind every result to exact source and locator provenance without retaining the source body. | Revision retains SHA-256 of the exact input and candidate retains manual field or UID/property locator; serialized result contains no calendar text, description, product identifier, or original bytes. |
| `UV1-INGEST-007` | Keep manual entry structured and shallow. | Manual facts use the existing bounded fact schema and field locator; free-form notes, source documents, and undeclared raw fields are rejected. |
| `UV1-INGEST-008` | Never derive a fact outside caller-declared connected-source coverage. | Commitment, deadline, and policy fact kinds must be present in `inspectedScopes`; mismatch invalidates the entire ingestion result. |
| `UV1-INGEST-009` | Make every successful ingestion review-only and non-authorizing. | Result status is `review_required`; authenticity, completeness, tenant/RLS, durable storage, event, execution, and recommendation authority remain unavailable or false. |
| `UV1-INGEST-010` | Bound resource use and discard partial derivations on any error. | Exact byte, physical-line, unfolded-line, component, property, candidate, object-depth, and object-node limits are tested; an error returns no revision, candidates, or digest. |
| `UV1-INGEST-011` | Produce stable, immutable output from stable input. | Same input yields the same source and ingestion digests, candidate order, issues, and deeply frozen result. |
| `UV1-INGEST-012` | Exercise the parser in the removable university source-review fixture before any live input surface. | The internal fixture derives both manual and calendar revisions through ingestion; its production-unavailable gate and public-asset leak scan remain unchanged. |

### Cross-cutting requirements retained for later phases

These remain P0 for a private alpha but are deliberately not implemented by this slice:

- server-owned adult entitlement with issue, expiry, revocation, recovery, and negative authority tests;
- owner-scoped durable storage, forced RLS, two-account isolation, backup/restore, export, correction, and deletion;
- a reviewed event-authority decision before any replay, undo, or append-only claim for university objects;
- bounded transient document parsing with byte/render cleanup and reattachment semantics;
- durable capacity-aware planning, learner-editable recovery, active study, protected checks, delayed return, and accountable human routing;
- complete-process accessibility evidence, including 320 CSS px, keyboard, screen reader, reduced motion, forced colors, browser, and low-bandwidth tests;
- provider authority, budgets, groundedness evaluation, fallback, incident controls, and positive delayed-learning evidence before live tutoring;
- pilot operations, support, adjudication, unit economics, and claim review.

### Internal Today composition research slice

This reversible slice supports direct workflow research without promoting the university wedge or replacing the learner home.

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| `UV1-TODAY-001` | Select an action only through the existing immutable learner-accepted reviewed path projector. | Course-source facts cannot select, rank, activate, or start an action; negative tests cover candidate, unreviewed, cross-goal, and bad-digest paths. |
| `UV1-TODAY-002` | Bind the term context and fixture-authored effort range to the exact owner/tenant/term/course, goal, path, revision, and projected node. | Cross-scope, cross-goal, path/revision, and node mismatches fail closed with no usable action. |
| `UV1-TODAY-003` | Keep source uncertainty visible and non-authorizing. | Candidate, conflict, duplicate, stale/unknown freshness, or incomplete connected-source coverage produces `source_review_required`; the composition exposes no learning action in that state. |
| `UV1-TODAY-004` | Compare learner-fixture available time with an explicit fixture-authored effort range without inferring capacity. | Fits, tight, and insufficient states are deterministic; tight requires learner choice and insufficient requires replanning. |
| `UV1-TODAY-005` | Make the composition side-effect free and removable. | No model, network, browser storage, database, event, session start, path activation, connector, provider, or external write exists in the projector or research UI. |
| `UV1-TODAY-006` | Keep the research surface internal and fail closed. | Production is unavailable; development requires an exact server fixture token; sample markers are absent from production public assets. |
| `UV1-TODAY-007` | Test the one-action hierarchy and uncertain/failure states before any public route decision. | The preregistered `UNIVERSITY_TODAY_UX_EXPERIMENT_LOOP.md` keeps four fixture states and regression gates fixed; component and rendered desktop/320, keyboard, reduced-motion, forced-colors, and console evidence covers ready, source-review, tight, and insufficient states. |
| `UV1-TODAY-008` | Preserve the claim ceiling. | UI and handoff say fixture-authored/learner-fixture, not live student, institutional truth, validated recommendation, accessibility conformance, learning efficacy, or production readiness. |

### Internal falling-behind recovery research slice

This reversible slice tests recovery as a distinct student job. It does not create a durable semester plan or promote the university wedge.

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| `UV1-RECOVERY-001` | Begin from an explicit learner-fixture change and current capacity window rather than inferring distress, health, disability, motivation, or ability. | Request accepts only bounded change codes, exact time, learner-declared available minutes, and learner-declared buffer; no notes, diagnosis, profile, or behavior inference exists. |
| `UV1-RECOVERY-002` | Reconcile shallow current-course context across at most eight courses without weakening course scope. | Every course projection must match the same exact owner, tenant, term, and `asOf`, plus its declared course ID; cross-scope and cross-time input fails closed. |
| `UV1-RECOVERY-003` | Bind every recovery item to one exact reviewed deadline copy. | Missing, wrong-kind, candidate, rejected, duplicate-group, or conflict-group deadline references produce no usable recovery draft. |
| `UV1-RECOVERY-004` | Preserve learner control over required, negotiable, deferrable, and no-longer-useful classifications. | Lanes derive only from explicit learner-fixture dispositions and learning-essential declarations; FORGE cannot automatically defer, drop, or relabel an item. |
| `UV1-RECOVERY-005` | Protect a learner-declared buffer and preserve authored effort ranges. | Capacity compares protected required-work low/high totals against available minutes minus buffer; it never shortens an item or changes a deadline. |
| `UV1-RECOVERY-006` | Use a transparent lexicographic boundary rather than an incomparable hidden score. | Source uncertainty blocks first; feasibility and overdue consequential conflicts follow; lane display order is reviewed deadline then item ID and is labeled as non-priority. |
| `UV1-RECOVERY-007` | Keep negotiable or learning-essential trade-offs visible for learner choice. | Tight capacity or any decide/ask lane produces `learner_choice_required`; learning-essential work cannot be marked no longer useful and is not silently moved outside the window. |
| `UV1-RECOVERY-008` | Surface overdue consequential work and insufficient protected capacity as human-help conditions. | The projection returns `human_help_required`, names the exact related item, and prepares one bounded question using copied deadline and capacity facts. |
| `UV1-RECOVERY-009` | Prepare, but never send, a responsible-human question. | Draft state is `prepared_not_sent`; route is learner-declared or `not_declared`; no clipboard, message, email, calendar, link resolution, or external action exists. |
| `UV1-RECOVERY-010` | Do not create a backlog debt counter, student ranking, risk score, ability score, streak, or guilt loop. | Contract exposes explicit `backlogDebtAllowed: false`, contains no numeric priority/ability/debt field, and UI tests preserve plain recovery language. |
| `UV1-RECOVERY-011` | Make the recovery projector bounded, accessor-safe, deterministic, immutable, and side-effect free. | Plain-JSON depth/node, course/item/dependency bounds; hostile getter/proxy, cycle, determinism, immutability, fetch, and storage tests pass. |
| `UV1-RECOVERY-012` | Keep the research surface internal and removable. | Production is unavailable; development requires the exact server token; fixture identities/content are scanned out of public assets; no public navigation, persistence, provider, or schema migration changes. |
| `UV1-RECOVERY-013` | Test comprehension under fixed uncertainty states before changing the learner home. | `UNIVERSITY_RECOVERY_UX_EXPERIMENT_LOOP.md` fixes reset-fits, choice-needed, human-help, and source-review states plus desktop, 320 CSS px, keyboard, reduced-motion, forced-colors, console, and production-boundary checks. |
| `UV1-RECOVERY-014` | Preserve the claim ceiling. | UI and handoff say synthetic, learner fixture, copied deadline, and not established; no demand, live student, institutional truth, recovery efficacy, accessibility conformance, or production claim. |

## First slice acceptance

The slice is ready for review only when:

1. no public route, database migration, provider, account, external connector, or production setting changes;
2. the new ADR states its authority ceiling and the unresolved durable-event choice;
3. focused normal, invalid, duplicate, conflict, correction, freshness, policy, immutability, and determinism tests pass;
4. lint, typecheck, the full unit/evaluator suite, and production build pass on the exact worktree;
5. the handoff explicitly reports `UV1-GATE-001..003` as open.

## Next implementation decision

After direct workflow evidence, choose one:

- evaluate the implemented transient manual/ICS subset in the internal review workflow, then choose whether to add a local file-selection surface;
- evaluate recovery and one-next-action as separate jobs and as one loop;
- narrow to guarded learning and protected checking;
- repair the combined loop;
- stop the university wedge.

Durable storage, live course data, UI route replacement, and generative tutoring are not the next automatic step.
