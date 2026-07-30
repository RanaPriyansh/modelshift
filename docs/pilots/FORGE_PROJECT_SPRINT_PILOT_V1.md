# FORGE Project Sprint pilot v1

- Status: Ready for participant and deployment authorization
- Cohort: 8–12 adult students, age 18+
- Product: FORGE Learning OS
- Module: FORGE Project Sprint
- Duration: Seven days plus a closing interview
- Data posture: Consented, pseudonymous, manually recorded, no hidden telemetry

## Decision this pilot supports

Decide whether FORGE Project Sprint gives motivated students a credible path from an intended
finish line to a first useful move, a return, protected-proof engagement, and a portable artifact
record.

This is a product-flow and trust pilot. It cannot establish educational efficacy, mastery,
retention, representative demand, authorship verification, or safety for minors.

## Preconditions

The pilot does not begin until all are true:

- a named owner approves the exact frozen product SHA and participant-facing URL;
- the URL identifies FORGE Learning OS and FORGE Project Sprint consistently;
- participants are 18+ and provide informed, revocable consent;
- recruitment channel, compensation, contact handling, and withdrawal handling are approved;
- the observer script and pseudonymous observation sheet are frozen;
- a facilitator has tested export, local deletion, corrupt-storage recovery, keyboard operation,
  reduced motion, and 320 px behavior on the exact build;
- no cloud evidence sync, hidden analytics, provider request, public artifact, or automatic sharing
  is enabled;
- the stop authority and incident contact are named.

The current repository work does not recruit participants, deploy a URL, or authorize spending.

## Cohort

Recruit 8–12 adult students who have one real, bounded project they would like to move forward in
seven days. Aim for variation in project family and prior experience, but do not collect sensitive
demographics that are not needed for the decision.

Exclude:

- anyone under 18 in v1;
- anyone who cannot freely consent;
- projects requiring dangerous materials, unverified human contact, confidential employer/client
  data, medical or legal decisions, public publication, or institutional assessment;
- participants who need accommodations the exact build cannot currently support.

Exclusion is a product-scope limit, not a judgment about the learner.

## Pilot flow

### Before Day 1

1. Explain local storage, export, deletion, proof limits, AI-use disclosure, and withdrawal.
2. Assign a pseudonymous ID `P01` through `P12`.
3. Record consent separately from the observation sheet.
4. Ask the participant to choose a real finish line that fits the low-risk project boundary.
5. Start from a clean browser profile or explicitly inspect existing local Sprint data.

### Day 1

1. Participant creates a Sprint.
2. Participant records the first daily move and the change it caused.
3. Facilitator asks the participant to explain where the record lives and what FORGE is not
   claiming.
4. Record only milestone timestamps, blocker codes, and trust-comprehension codes.

### Days 2–5

1. Participant returns on a later local-calendar day using the same Sprint.
2. Participant chooses whether to continue, pause, or withdraw.
3. Facilitator does not chase engagement or imply that missed days are failure.
4. Record observed returns and completed daily moves without copying learner text.

### Day 6

1. Participant reaches the Proof Lab only after the prior daily moves permit it.
2. Participant declares AI use or uncertainty honestly.
3. Contaminated work remains useful and visible.
4. Record the Proof Lab status; do not copy protected responses.

### Day 7 and closing interview

1. Participant completes, pauses, or stops the Sprint.
2. Participant chooses whether to copy, download, print, or decline export.
3. External sharing is optional and happens outside FORGE; never ask for a public post.
4. Run a 15–20 minute interview about usefulness, friction, proof interpretation, privacy, and
   whether the participant would use the module for another goal.
5. Offer deletion and confirm withdrawal rights again.

## Metric definitions

Report raw numerators and denominators. With 8–12 participants, percentages alone are misleading.
Missing observations remain `missing`; they are not converted to failure.

### 1. Sprint creation

**Question:** Can an eligible participant create one valid Sprint?

**Numerator:** participants with a validated Sprint record and `sprint_created_at`.

**Denominator:** consented eligible participants who start the setup flow.

**Source:** observed product state plus the pseudonymous observation sheet.

### 2. First useful move

**Question:** Does the participant move from planning into concrete work?

**Numerator:** participants whose first day passes the product's daily completion validation and
persists after reload.

Operationally, Day 1 must contain the required work note and change record and have a non-null
`completedAt`. The observer records only the timestamp, not the learner text.

**Denominator:** participants who created a Sprint.

### 3. Day 2 return

**Question:** Does the participant voluntarily return to the same Sprint?

**Numerator:** participants who reopen the same Sprint in a distinct session on a later local
calendar date.

Record Day 2 move completion separately. Same-session clicking through to Day 2 is not a return.

**Denominator:** participants who created a Sprint.

**Source:** manual observation or a participant-confirmed session check. The current product has no
hidden visit log.

### 4. Day 6 Proof Lab reach

**Question:** Does the participant progress far enough to encounter the protected-proof boundary?

**Numerator:** participants for whom Day 6 becomes the active Sprint day and the Proof Lab is
opened.

Record `not_started`, `self_declared`, and `contaminated` separately. Reaching the Proof Lab is not
proof success.

**Denominator:** participants who created a Sprint.

### 5. Export/share completion

**Question:** Can the participant take a bounded project record with them?

**Export numerator:** participants who intentionally complete Copy Markdown, Download Markdown,
or Print/Save PDF.

**Share numerator:** participants who voluntarily share an exported record with a recipient they
choose outside FORGE.

**Denominators:** export uses participants who reached the proof page; share uses participants who
completed an export.

External sharing is optional. Declining to share is never counted as product failure.

## Diagnostic metrics

Use these only to explain the five requested measures:

- setup abandonment stage;
- Day 2 move completion;
- time from Sprint creation to first useful move;
- proof status: `not_started`, `self_declared`, or `contaminated`;
- export mode;
- participant trust-comprehension code;
- repeated blocker code;
- voluntary intent to use the module for another goal.

Do not collect time-on-page, click volume, streaks, rankings, raw learner text, evidence URLs,
precise location, contacts, IP-derived identity, or unrelated browsing.

## Guardrails and stop rules

Stop the affected session immediately for:

- unexpected data loss or unrecoverable corruption;
- learner text or evidence leaving the browser without an explicit export action;
- an independent-proof claim appearing for contaminated or incomplete work;
- accidental public sharing;
- a safety, safeguarding, privacy, or consent incident;
- inability to withdraw or delete local data;
- facilitator pressure, distress, or participant request to stop.

Pause the pilot for review if:

- the same blocking defect affects three participants;
- more than one participant cannot explain the local-storage or proof boundary after the
  facilitator's standard explanation;
- the exact build changes;
- the observation definitions change;
- a critical accessibility path fails.

## Analysis and decision rules

The pilot is diagnostic, not statistically powered.

Report:

- exact cohort size, withdrawals, missing records, and analyzed denominator;
- raw funnel counts for all five requested measures;
- median time to first useful move only if at least five timestamps are present;
- blocker counts by closed code;
- proof-status counts without treating contamination as failure or clean proof as verified;
- export and optional share counts separately;
- short thematic findings from consented interviews without identifiable quotations.

Do not set a product-success threshold before baseline evidence exists. Use the results to choose
one of:

- retain the flow and test a second cohort;
- repair a specific activation, return, proof, export, trust, or access defect;
- narrow the target user or project family;
- stop the wedge because the trust or usefulness hypothesis failed.

## Closed observation codes

`blocker_code`:

- `none`
- `setup-unclear`
- `scope-too-broad`
- `local-storage-unclear`
- `daily-move-unclear`
- `return-friction`
- `proof-boundary-unclear`
- `proof-contaminated`
- `export-friction`
- `accessibility-blocker`
- `technical-defect`
- `withdrew`
- `other-reviewed`

`trust_comprehension`:

- `understands-local-and-bounded`
- `understands-after-explanation`
- `does-not-understand`
- `not-observed`

Free-text learner content does not belong in the observation sheet.

## Required external inputs

To actually run the pilot, the owner must still provide or approve:

- participant/recruitment source;
- consent and contact process;
- compensation and spending limit, if any;
- exact pilot dates and timezone;
- exact frozen URL or an approved supervised local-session plan;
- named facilitator, observer, incident owner, and stop authority.
