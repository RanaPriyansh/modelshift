# FORGE iOS Semester Desk v2 Test and Release Plan

**Date:** 2026-08-03
**Product scope:** `SEMESTER_DESK_V2`
**Release state:** `INTERNAL_VALIDATION_IN_PROGRESS`

## Fixed local baseline

| Field | Value |
| --- | --- |
| Branch | `agent/forge-ios-foundation-20260801` |
| Committed baseline | `27d807ef6a23eb54b6e758b26de0fd7a66116855` |
| Source tree | `d67792e166fe85c084987ac95a588b09492afe4e` |

This baseline is a committed source record. It is not the final clean release
candidate. Bind every final result to one clean candidate commit and tree.

## Current local evidence

| Gate | State | Evidence boundary |
| --- | --- | --- |
| ForgeCore | `PASS` | 125 tests passed. |
| Private-state focus | `PASS` | 30 focused private-store tests passed. |
| Application unit tests | `PASS` | 115 FORGEAppTests passed. |
| Debug simulator build | `PASS` | Simulator Debug build passed. |

These results do not prove an archive, a physical-device result, signing,
distribution, App Store readiness, or production operation.

## Open internal gates

Complete these gates on one final clean candidate. Retain the command, log,
result bundle where applicable, simulator or device identity, and screenshots.

- Run the 13-test final UI gate on the recorded simulator.
- Run the small-device layout and interaction check.
- Run the iPad layout and interaction check.
- Run Release and device builds.
- Run the unsigned archive readiness check.
- Capture final product screenshots.
- Rerun the complete test and build set from the final clean candidate.

The final rerun must include ForgeCore, private-state, app-unit, UI,
accessibility, metadata, source-boundary, and system-surface checks.

## Required final review

Review the final candidate for these areas:

- Private-state recovery and local deletion.
- Protected-study draft loss and interruption behavior.
- Reminder permission, scheduling, cancellation, and denial.
- Widget, App Intent, and route behavior.
- Dynamic Type, VoiceOver, contrast, reduced motion, and focus behavior.
- Small-screen, iPad, offline, cold-relaunch, background, and time-change behavior.
- Privacy manifest, export, and public-link configuration.

Do not mark accessibility conformance from automated checks alone.

## External gates

These gates need an authorized owner or an external system.

- Apple Developer signing identity, Team ID, certificates, identifiers, App
  Group configuration, and provisioning profiles.
- Physical-device installation and behavior checks.
- Approved HTTPS privacy-policy URL.
- Approved HTTPS support URL.
- App Store metadata, screenshots, privacy answers, export-compliance record,
  review notes, and submission authority.
- TestFlight upload and distribution authority, if requested later.

No signed archive, TestFlight upload, App Store submission, or release is
authorized by this document.

## Candidate procedure

1. Create one clean candidate commit.
2. Record the commit SHA, tree SHA, branch, toolchain, and target devices.
3. Run each internal gate without changing the candidate source.
4. Retain the result bundles, logs, screenshots, and review records.
5. Stop on a failed critical gate.
6. Get each required external approval before a signing or store action.

The release decision stays `NO_SHIP` until every internal gate passes and the
required external owner approves the release.
