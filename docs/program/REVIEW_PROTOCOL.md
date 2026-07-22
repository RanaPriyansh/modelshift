# Principal Review and Integration Protocol

## 1. Principal duty

The principal is an architecture authority and skeptical integrator, not a permanent implementation worker. It wakes for:

- cross-lane contract or ownership decisions;
- a `READY_FOR_PRINCIPAL_REVIEW` or `NEEDS_DECISION` handoff;
- integration of a bounded worker commit;
- red-team review of security, proof, source, age, accessibility, or claims;
- candidate release and rollback decisions;
- user-requested program status.

It does not continuously poll completed threads, repeat unchanged verification, or use Ultra for mechanical changes.

## 2. Review sequence

Every worker handoff passes these gates in order:

1. **Identity:** exact base, branch, commit, worktree, clean status, and no untracked artifacts.
2. **Scope:** changed paths match ownership; deviations are explicit and justified.
3. **Contract:** inputs, outputs, IDs, versions, failure states, and side effects align with `ARCHITECTURE.md`.
4. **Truth:** deterministic/source/model/human authorities are not blurred.
5. **Proof:** instructional AI/support/replay/answer-changing are absent from protected transfer.
6. **Age and rights:** child, guardian, adult, consent, sharing, and deletion boundaries fail closed.
7. **Security/privacy:** secrets, logs, cache, SSR cookies, origin/body limits, RLS, idempotency, abuse, and rollback are addressed in scope.
8. **Accessibility:** keyboard, focus, semantics, noncolor/nonmotion alternatives, 320 px, and proof-mode access are preserved.
9. **Evaluation:** tests target normal, refusal, timeout, malformed, conflict, duplicate, partial-failure, and rollback paths proportional to risk.
10. **Claims:** evidence supports only the proposed wording; missing live or human evidence is named.

A failure at an earlier gate stops integration. A large green test count cannot overrule a specific negative regression.

## 3. Integration method

1. Refresh `origin/main` and confirm the principal checkout is clean.
2. Inspect the worker diff against both its base and current main.
3. For old-base commits, never blind cherry-pick. Create a temporary integration branch or ask the worker for a current-base follow-up commit.
4. Resolve shared contracts before UI/adapter code.
5. Run owned tests, then typecheck/lint, unit/eval, build, and proportional browser coverage.
6. Independently inspect at least one rendered path when UI or behavior changes.
7. Record accepted, rejected, and deferred parts; do not silently omit worker work.
8. Merge one lane at a time and update the thread ledger/status in the same review batch.
9. Push only the reviewed main state. Production deployment is a separate gate.

## 4. Red-team questions

### Learning and evidence

- Can the learner pass by copying a hint, replaying the answer, or exploiting representation cues?
- Does one immediate response become mastery, retention, intelligence, or a permanent label?
- Are accessibility supports misclassified as cognitive help, or vice versa?
- Does the validator actually measure the intended construct in an unfamiliar case?

### AI and sources

- Can a model invent an ID, source, citation, correct answer, review decision, or publication state?
- Does provider failure block the authored path or expose key/learner text?
- Are retrieved claims bound to a stable reviewed source and version?
- Can prompt text escape its data boundary or manipulate the tool/provider endpoint?

### Children and relationships

- Is an editable local or user-metadata field being treated as verified age, consent, or guardian authority?
- Can an unverified adult contact a minor, or can a sharing grant outlive consent?
- What happens during report, block, expiry, relationship dispute, or account recovery?

### Data and operations

- Can retries duplicate assistance, evidence, grants, deletion, or provider cost?
- Can stale read models disagree with the journal without a visible reconciliation state?
- Are cache headers, cookies, CSP, rate limits, body bounds, RLS, backups, and rollback tested in the actual deployment mode?
- Does the public URL expose the exact source SHA and runtime feature state?

### Product and claims

- Does the screen feel like a chatbot, LMS dashboard, reward loop, or opaque recommendation engine?
- Does copy distinguish working, planned, staged, unverified, and tested behavior?
- Is homeschool/school-replacement language outrunning jurisdictional, safeguarding, curriculum, access, and efficacy evidence?

## 5. Status vocabulary

| Status | Meaning |
| --- | --- |
| `PLANNED` | principal-owned packet exists; no implementation evidence |
| `IN_PROGRESS` | worker is active on an isolated bounded goal |
| `READY_FOR_PRINCIPAL_REVIEW` | clean handoff commit and complete evidence packet exist |
| `NEEDS_DECISION` | cross-lane authority or product choice is required before safe progress |
| `CHANGES_REQUESTED` | principal found a specific gate failure; worker retains ownership |
| `ACCEPTED_NOT_INTEGRATED` | technically accepted but waiting on dependency/order |
| `INTEGRATED_LOCAL` | merged and locally verified on principal main |
| `PUSHED` | exact integrated commit exists on origin/main |
| `DEPLOYMENT_BLOCKED` | candidate did not reach READY; production alias unchanged |
| `DEPLOYED_CANDIDATE` | immutable deployment exists but production verification is incomplete |
| `PRODUCTION_VERIFIED` | alias, SHA, runtime, browser, errors, and rollback evidence pass |
| `REJECTED` | approach or slice is not accepted; reasons recorded |

## 6. Cost controls

- Workers stop after one handoff and wait for a targeted follow-up.
- Principal uses compact task snapshots, not full transcript reads, unless auditing evidence.
- Mechanical fixes return to the owning Terra/Luna lane.
- Principal does not write code while an owner can make the change safely.
- Full browser suites run at integration/release boundaries; focused suites run during iteration.
- Live provider tests use predeclared fixtures, budgets, and stop limits; no exploratory paid loops.
- A blocked external dependency becomes an explicit decision, not repeated expensive retries.

## 7. Production gate

Production requires one frozen, pushed, tested SHA; a READY immutable deployment; alias confirmation; release identity; desktop/mobile/320 checks; critical user journeys; CSP and runtime error scan; feature-flag/env verification without secret disclosure; and a known rollback target. A BLOCKED deployment is evidence of a failed gate, not partial success.
