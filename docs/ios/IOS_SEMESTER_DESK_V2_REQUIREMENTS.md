# FORGE iOS Semester Desk v2 Requirements

**Date:** 2026-08-03
**Product scope:** `SEMESTER_DESK_V2`
**Release state:** `INTERNAL_VALIDATION_IN_PROGRESS`

## Product contract

FORGE is a private, calm university Semester Desk.

The product helps a student rebuild a broken week from today. The student sees
what changed, states real capacity, reviews recovery changes, and chooses the
next action.

FORGE must not hide changed course facts. FORGE must not select work without
the student. FORGE must not do protected learning work for the student.

## Semester Desk

### SD-01 Private desk

Create one profile-bound Semester Desk on the iPhone. Keep the Semester Desk
private to the app container. Do not sync the desk with the web app.

### SD-02 Course truth

Let the student add courses and course facts. Show each fact state in clear
language. Show changed, unconfirmed, and conflicting facts for review.

### SD-03 Honest capacity

Let the student draft available minutes. Save the draft before confirmation.
Allow zero minutes as a valid capacity.

### SD-04 Recovery

Let the student prepare recovery from planned work. Show every proposed change
before confirmation. Do not change planned work until the student confirms the
recovery draft.

### SD-05 Next action

Let the student choose one eligible next action. Do not rank, hide, or select
work for the student.

## Learning loop

### LL-01 Protected study

Keep raw practice and independent-proof text private to the active study
surface. Do not save that raw text. Protect unsaved study text from an
accidental close.

### LL-02 Practice and independent proof

Record the selected result, not the raw response. Require the student to
complete practice before independent proof where the flow requires it.

### LL-03 Delayed return

Let the student select a future return date during protected study. Save the
date before the study surface closes. Show the delayed return when it opens.

### LL-04 Progress

Show answer-free local progress evidence. Do not describe the evidence as a
grade, credit, academic record, mastery result, or retention claim.

## Privacy and data safety

### PD-01 Private state

Use the current private-state schema in
`semester-desk-private-state-v1.json`. Bind the private state to one local
profile. Reject corrupt, unsupported, mismatched, oversized, or stale state.

Do not silently replace blocked state. Give the student a clear recovery path.

### PD-02 Local controls

Let the student export the validated local Semester Desk. Let the student
remove local Semester Desk data. Preserve clear failure status when a local
operation cannot complete.

### PD-03 System surfaces

Schedule only one local return reminder. Keep notification and widget content
general. Put only the minimum return projection in the shared App Group.

An App Intent, widget route, or app URL can open an allowed surface. It must
not change the Semester Desk by itself.

## Accessibility and reliability

### AR-01 Accessible operation

Support Dynamic Type, VoiceOver labels, keyboard and focus behavior, reduced
motion, contrast, and small-screen layouts.

### AR-02 Save and recovery behavior

Save a valid change before it becomes active in memory. Prevent duplicate
operations. Preserve the prior valid state after a failed save. Recover safely
after an interruption, relaunch, time change, or storage error.

### AR-03 Product language

Use clear student language. Do not show internal protocol names, storage
implementation names, or unsupported learning claims in product copy.

## Current verification record

The committed local baseline is:

| Field | Value |
| --- | --- |
| Branch | `agent/forge-ios-foundation-20260801` |
| Commit | `27d807ef6a23eb54b6e758b26de0fd7a66116855` |
| Tree | `d67792e166fe85c084987ac95a588b09492afe4e` |
| ForgeCore | 125 tests passed |
| Focused private-store checks | 30 tests passed |
| FORGEAppTests | 115 tests passed |
| Debug simulator build | passed |

The record does not prove a final release candidate. See the
[test and release plan](IOS_TEST_AND_RELEASE_PLAN.md) for open internal and
external gates.
