# FORGE iOS 0.1 Requirements: Adult University V1

**Date:** 2026-08-02

**Product scope:** `ADULT_UNIVERSITY_V1`

**Candidate state:** `NOT_SELECTED`

**Release decision:** `NO_SHIP`

## Status and trace terms

This document defines required behavior.

This document records no passed test, simulator, device, CI, signing, or
distribution check.

- `REQUIRED` means that the fixed candidate must meet the requirement.
- `NOT_SELECTED` means that no fixed candidate SHA and clean-tree record exist.
- `NOT_RUN` means that no result exists for the fixed candidate.
- `BLOCKED_EXTERNAL` means that an external input or external evidence is
  missing.

## Fixed product scope

The product serves adult university learners only.

The product does not prove age, enrollment, affiliation, credit eligibility,
or academic standing.

### S-01 One starter mechanics course

Requirement: Expose only `course.adult-mechanics.force-motion.v1`.

Acceptance:

- The catalog has one course, one capability, and three activities.
- The capability title is `Mechanics: Force and motion`.

Trace: `UniversityStarterCourse.catalog()`.

### S-02 Immutable catalog

Requirement: Keep the catalog immutable.

Acceptance:

- Bind one catalog release, package ID, version, and SHA-256 digest.
- Do not accept a user, file, or network catalog update.

Trace: `ReleasedCatalogSnapshot.validate()`.

### S-03 Exact catalog identity

Requirement: Reject unknown and cross-course references.

Acceptance:

- Reject an unknown activity, capability, source, claim, or prerequisite ID.
- Reject a package identity that does not match the fixed catalog.

Trace: `UniversityLearningError`.

### S-04 Adult-only UI

Requirement: Show only the adult mechanics course UI.

Acceptance:

- Do not show learner-segment selection.
- Do not show free-form course creation or alternate course selection.

Trace: UI source review.

### S-05 Local-only product boundary

Requirement: Keep all learner state on the device.

Acceptance:

- Do not provide an account, cloud sync, remote notification, or academic
  export.

Trace: production source review.

## Required learning loop

The fixed catalog order is practice, proof, and delayed return.

The product must process the loop with `UniversityLearningEngine.transition`.

### L-01 Practice

Requirement: Start with the practice activity.

Acceptance:

- A practice result creates one local receipt.
- A practice result updates local progress.

Trace: practice transition.

### L-02 Proof gate

Requirement: Gate proof with demonstrated practice.

Acceptance:

- Reject proof when the practice receipt is missing.
- Reject proof when the practice result is not demonstrated.

Trace: proof prerequisite validation.

### L-03 Protected proof and return

Requirement: Protect proof and delayed return activities.

Acceptance:

- Allow only construct-preserving access assistance.
- Require AI action and retrieval mode `none`.

Trace: activity boundary validation.

### L-04 Delayed return creation

Requirement: Create a delayed return after demonstrated proof.

Acceptance:

- Set `opensAt` to the proof receipt time plus seven days.
- Set `dueAt` to `opensAt` plus 30 days.

Trace: `ReturnPolicy` validation.

### L-05 Return window

Requirement: Enforce the return window.

Acceptance:

- Reject a return before `opensAt`.
- Reject a return after `dueAt`.

Trace: delayed-return transition.

### L-06 Return completion

Requirement: Record demonstrated return completion locally.

Acceptance:

- Create one local receipt for a demonstrated return.
- Record completion time inside the return window.

Trace: `DelayedReturnRecord` validation.

Recording a local loop event does not state learner achievement or academic
standing.

## Catalog and receipt boundaries

The catalog must retain its limitation records with the package identity.

The starter mechanics source has incomplete provenance.

The product must state that the source is not source-reviewed or
university-authoritative.

Local evidence receipts are unsigned and have local scope only.

### B-01 Receipt identity

Requirement: Bind every receipt to the active catalog.

Acceptance:

- Include course, capability, activity, task-family, and catalog release IDs.
- Include package and limitation identities.

Trace: `LocalEvidenceReceipt`.

### B-02 Written reasoning and selected-choice boundary

Requirement: Keep written reasoning, values derived from written reasoning, and
selected-choice text transient.

FORGE saves selected-choice check results, activity progress, help use, receipt
metadata, and delayed-return schedules locally. FORGE needs this data for
durable learning progress.

Acceptance:

- Do not save written reasoning, values derived from written reasoning, or
  selected-choice text in a receipt.
- Save the selected-choice check result and receipt metadata in a local receipt.
- Save activity progress, help use, and delayed-return schedules locally.

Trace: receipt schema review.

### B-03 Assistance boundary

Requirement: Preserve only allowed assistance facts.

Acceptance:

- Link only assistance IDs allowed by the activity boundary.

Trace: assistance validation.

### B-04 Source boundary

Requirement: State local scope and incomplete source provenance.

Acceptance:

- Show the catalog limitation with its local receipt context.

Trace: catalog limitation rendering.

### B-05 Outcome boundary

Requirement: Do not state outcome authority.

Acceptance:

- Do not state efficacy, mastery, retention, credential, grade, or credit.
- Do not state university authority from a catalog or local receipt.

Trace: copy review.

## Local state and system handoff

The private state file must use schema version 4.

The private v4 envelope contains `LocalLearnerState`, course-start state, and
reminder preference.

The private v4 envelope must remain outside the App Group.

### D-01 Private v4 envelope

Requirement: Store learner state in the private v4 envelope.

Acceptance:

- Accept only schema version `4`.
- Put a detected `private-state-v3.json` or `private-state-v2.json` file in
  visible recovery.
- Preserve each detected v3 or v2 file until an explicit clear-local-data
  action.
- Fail closed for unsupported, corrupt, or oversized data.

Trace: `PrivateStateStore` and envelope schema decoder.

### D-02 Transient written reasoning and derived values

Requirement: Keep written reasoning and each value derived from written
reasoning transient.

Acceptance:

- Do not write written reasoning or a value derived from written reasoning to
  private state or shared state.
- Do not write either item to a notification, widget, intent, log, or export.
- Do not write selected-choice text to private state or shared state.
- Do not include selected-choice text in a notification, widget, or intent.

Trace: storage boundary review.

### D-03 Typed App Group projection

Requirement: Use one typed App Group projection.

Acceptance:

- Include only lifecycle, `opensAt`, `dueAt`, `generatedAt`, and `validUntil`.

Trace: `ForgeReturnProjection`.

### D-04 Redacted App Group projection

Requirement: Redact the App Group projection.

Acceptance:

- Do not include learner data, course data, receipt data, identifiers, written
  reasoning, selected-choice text, a selected-choice check result, or a value
  derived from written reasoning.

Trace: projection schema review.

### D-05 Projection failure boundary

Requirement: Fail closed on projection corruption.

Acceptance:

- Clear unknown, missing, invalid, or oversized projection values.
- Report the projection failure to the application.

Trace: `ForgeSharedStateStore`.

### D-06 Local deletion

Requirement: Delete managed local state after confirmation.

Acceptance:

- Clear the private envelope, App Group projection, pending-focus handoff token,
  and reminder.

Trace: local deletion flow.

## Reminder, widget, and intent requirements

The product can schedule one local return reminder only after explicit adult
action.

The reminder opening time is `opensAt`.

The reminder must not schedule before `opensAt`.

### I-01 Reminder time

Requirement: Schedule only an eligible delayed return.

Acceptance:

- Set the reminder date to `opensAt`.
- Do not change `opensAt` or `dueAt`.

Trace: `ReturnReminderPolicy`.

### I-02 Reminder failure boundary

Requirement: Keep the loop usable after reminder denial or failure.

Acceptance:

- Permission denial, scheduling failure, and cancellation failure do not change
  learner state.

Trace: reminder coordinator.

### I-03 Redacted reminder text

Requirement: Use redacted reminder text.

Acceptance:

- Do not show learner, course, activity, receipt, selected-choice text,
  selected-choice check result, written reasoning, or values derived from
  written reasoning on the Lock Screen.

Trace: notification content review.

### I-04 Reminder cleanup

Requirement: Clear obsolete reminders.

Acceptance:

- Completion, deletion, disabled preference, and no eligible return remove the
  managed reminder.

Trace: reminder cleanup.

### I-05 Widget and App Intent limit

Requirement: Limit widget and App Intent behavior.

Acceptance:

- The widget reads the typed projection only.
- The App Intent can write only one pending-focus handoff token.
- The App Intent cannot modify learner state, course state, evidence state, a
  receipt, or a delayed return.
- The application opens a validated local destination only after it checks
  eligibility.

Trace: system integration review.

### I-06 External mutation boundary

Requirement: Prevent external mutation.

Acceptance:

- Except for the permitted pending-focus handoff token, a widget, App Intent,
  notification, or invalid URL cannot create or modify learner state, course
  state, evidence state, a receipt, or a delayed return.

Trace: route boundary review.

## Network and AI boundary

The product has no production AI service.

The product has no learning-data network client.

### N-01 Production AI

Requirement: Do not call a production model.

Acceptance:

- Do not make a production model request or remote inference request.
- Do not use AI for a consequential action.

Trace: production source review.

### N-02 Learning-data network

Requirement: Do not use a learning-data network client.

Acceptance:

- Do not send learner state, receipt data, source data, selected-choice text,
  written reasoning, or values derived from written reasoning off the device.

Trace: production source review.

### N-03 Academic decision boundary

Requirement: Do not make a consequential academic decision.

Acceptance:

- Do not enroll, grade, award credit, waive a prerequisite, or notify a third
  party.

Trace: product boundary review.

## External gates

The following gates remain unresolved.

They require external authority or external evidence.

They are not implementation results.

### G-01 Privacy and support URLs

State: `BLOCKED_EXTERNAL`.

Required external input: Approved and maintained HTTPS privacy-policy and
support URLs.

### G-02 Signing

State: `BLOCKED_EXTERNAL`.

Required external input: Apple team, identifiers, App Group assignment,
profiles, and authorized signing operator.

### G-03 Export compliance

State: `BLOCKED_EXTERNAL`.

Required external input: Authorized fixed-archive export-compliance decision,
rights record, and Apple answer.

### G-04 TestFlight authority

State: `BLOCKED_EXTERNAL`.

Required external input: Approved tester group, signed archive, upload,
distribution, support, withdrawal, and deletion authority.

### G-05 App Store authority

State: `BLOCKED_EXTERNAL`.

Required external input: Approved metadata, category, rating, images, review
notes, contact, rights record, and submission authority.

### G-06 Participant evidence

State: `BLOCKED_EXTERNAL`.

Required external input: Approved protocol, adult participant authority, and
collected participant evidence.

## Verification state

Every requirement above remains `REQUIRED` until a fixed clean candidate
provides its own evidence.

- Unit checks: `NOT_RUN`.
- Simulator checks: `NOT_RUN`.
- Device checks: `NOT_RUN`.
- UI checks: `NOT_RUN`.
- CI checks: `NOT_RUN`.
- Accessibility conformance: `NOT_RUN`.
- Privacy and support URLs: `BLOCKED_EXTERNAL`.
- Signing: `BLOCKED_EXTERNAL`.
- Export compliance: `BLOCKED_EXTERNAL`.
- TestFlight authority: `BLOCKED_EXTERNAL`.
- App Store authority: `BLOCKED_EXTERNAL`.

Keep the release decision at `NO_SHIP`.

Do not describe this document as evidence of an implemented, tested, signed,
distributed, accessible, or production product.
