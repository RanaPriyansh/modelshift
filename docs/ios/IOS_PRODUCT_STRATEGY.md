# FORGE iOS Product Strategy

**Date:** 2026-08-02
**Product scope:** `ADULT_UNIVERSITY_V1`
**Strategy state:** `NOT_SELECTED`
**Release decision:** `NO_SHIP`

## Product direction

FORGE starts with a university-first wedge.

V1 serves adult university learners through one bounded mechanics course.

The larger learning-companion vision can support learning across subjects, settings,
and age groups.

Each new area needs its own scope, safeguards, source review, and evidence.

Do this before the area becomes a product capability.

This strategy makes no learning-result or commercial outcome claim.

## Evidence and release boundary

This strategy defines direction. It does not report an implementation result.

No fixed, clean university candidate is identified here.

No simulator, device, participant, accessibility, signing, store, or production
result is recorded here.

Do not describe this strategy as a shipped, signed, accessible, released, or production
product.

## V1 boundary

V1 contains only these parts:

- One adult mechanics starter course.
- One local course package at a time.
- Local device state.
- Local deterministic checks for defined activity transitions.
- Defined practice, proof, delayed-return, and local-receipt states.
- A local reminder, a redacted widget, and a parameter-free App Intent.
- Complete local deletion.

V1 does not include accounts, cloud sync, remote push, analytics, advertising, or
live source connections.

V1 does not include production AI.

V1 does not issue grades, credit, certificates, enrollment decisions, or academic
standing.

V1 does not create a canonical academic record.

## Student agency

The student chooses when to start, pause, stop, and return to an activity.

The student can review the local course setup and delete local data.

The student can enable or cancel a local reminder.

The course package, not the application or the student, sets delayed-return dates.

Do not use scores, streaks, ranks, badges, leaderboards, or automatic ability labels.

Do not change a protected activity because of a reminder, widget, intent, or invalid
route.

## Learning loop

Use this V1 loop:

Active recall, practice, defined proof, local receipt, delayed return, and return
action form this V1 loop.

Active recall requires the student to respond before explanatory support.

Practice lets the student work with the defined mechanics activity.

Proof before claims requires a defined proof action before a local record can advance.

The deterministic check evaluates only the defined local transition.

The deterministic check does not establish mastery, proficiency, retention, efficacy,
or academic achievement.

The course package defines `opensAt` and `dueAt` for a delayed return.

The application shows whether the return is scheduled, open, due, closed, or recorded.

Notification delivery does not complete a return.

## Local receipt boundary

Store only the minimum local receipt metadata.

The receipt can contain package identity, activity identity, check result, time,
and package limits.

Do not store raw learner responses, free text, images, audio, code, source text,
learner names, account identifiers, or device identifiers in the receipt.

Keep raw practice data in memory only.

Clear raw practice data after completion, cancellation, failure, termination,
and local deletion.

The receipt is unsigned and local only.

The receipt does not establish identity, external proof, academic evidence, credit,
grade, mastery, efficacy, or retention.

## Sources and privacy

Show the local source-provenance state and any incomplete provenance.

Do not infer source review or external status from a title, URL, file, catalog entry,
or local receipt.

Keep course-loop data on the device.

Use generic reminder text and generic locked-device widget content.

Do not place learner, course, activity, receipt, or raw practice data in a
Lock Screen message.

Keep the course loop usable when notification permission is denied.

Delete active course state, local receipts, local reminders, widget data, and intent
handoff state during complete local deletion.

## V1 information architecture

### Today

Show the course, the current activity, the exact activity state, and the next action.

Show local limits and source-provenance limits.

### Course and activity

Show one active capability, the defined prompt, active recall, and proof conditions.

Keep access support, cancellation, and local-data limits available.

### Return and receipt

Show the local receipt limits.

Show package-derived `opensAt` and `dueAt` values for a delayed return.

Do not let the student change either date.

### Settings

Show local-data status, reminder permission, complete local deletion, privacy
information, and support information.

## Future work that is not V1

Connected university sources need source identity, rights, review, release identity,
access control, failure handling, privacy review, and separate authority.

Planning needs a separate learner-agency, data, and review decision.

Tutoring needs a separate assistance policy.

It must remain outside protected proof until that policy is proved and released.

Mentoring needs role verification, consent, scope, expiry, reporting, safeguarding,
appeal, audit, and revocation controls.

Broader age groups need separate product scope, privacy policy, safeguards, accessibility
planning, and release authority.

These future areas are not V1 capabilities, release plans, or evidence claims.

## Current strategy state

The current strategy state is `NOT_SELECTED` and `NO_SHIP`.

Use the requirements, execution plan, test plan, and ship checklist for exact future
gates.
