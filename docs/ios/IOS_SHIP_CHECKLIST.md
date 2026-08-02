# FORGE iOS Adult University V1 Ship Checklist

- **Date:** 2026-08-02
- **Scope:** `ADULT_UNIVERSITY_V1`
- **Candidate:** `NOT_SELECTED`
- **Decision:** `NO_SHIP`

## Evidence rule

Use one completed box only with an exact candidate SHA, a clean-tree result, a
command or review record, and retained output.

A source file proves source presence only. It does not prove a build, runtime
behavior, device behavior, signing, archive validity, distribution, or
production operation.

Do not use this checklist to claim accessibility conformance, efficacy,
mastery, retention, participant validation, or distribution.

## Current source inventory

- [x] University source and domain-test files exist under
  `ios/Packages/ForgeCore/`.
- [x] App and UI test source exists under `ios/Tests/`.
- [x] XcodeGen input, generated project, verification script, and CI workflow
  exist.
- [x] Privacy-manifest and protected-state source files exist.
- [x] Reminder, widget, App Intent, deep-link, and public-URL validation
  source files exist.

These entries do not prove that the current tree is a release candidate or that
any test has run.

## Candidate and source boundaries

- [ ] Record repository, branch, exact candidate SHA, clean-tree result,
  toolchain, and deployment target.
- [ ] Record course package, catalog, activity, task-family, and return-policy
  identities.
- [ ] Review source boundaries for local-only unsigned receipts, transient
  written reasoning and values derived from written reasoning, transient
  selected-choice text, bounded data, no production AI, and no outcome claims.
- [ ] Verify that local durable learning-progress data includes selected-choice
  check results, activity progress, help use, receipt metadata, and
  delayed-return schedules.
- [ ] Record known limits and unresolved defects against the candidate SHA.

## Tests, generated project, and build

- [ ] Run the domain test suite and retain its command, log, result, and
  candidate SHA.
- [ ] Run app unit and UI tests and retain their command, result bundle, and
  candidate SHA.
- [ ] Regenerate the Xcode project from `ios/project.yml` and review the
  generated diff.
- [ ] Run the XcodeGen drift gate against the candidate tree.
- [ ] Produce an unsigned Release configuration build and retain its full
  output.
- [ ] Record all failed, skipped, retried, or environment-limited checks.

## Simulator and accessibility

- [ ] Run the full course journey on the recorded simulator device and runtime.
- [ ] Record the simulator identifier, OS version, Xcode version, command,
  screenshots, and result bundle.
- [ ] Run automated accessibility checks on each course screen.
- [ ] Complete human assistive-technology and appearance checks, including
  Dynamic Type, Reduced Motion, contrast, and Dark mode.
- [ ] Record accessibility defects, decisions, and residual risks. Do not mark
  accessibility conformance from this checklist alone.

## Privacy and local data

- [ ] Review `PrivacyInfo.xcprivacy` against the fixed binary and the
  local-data inventory.
- [ ] Verify protected-data behavior and backup-exclusion behavior on a
  physical device.
- [ ] Verify local deletion, reminder cleanup, shared-state cleanup, widget
  refresh, and cold relaunch.
- [ ] Verify that no written reasoning, value derived from written reasoning,
  or selected-choice text persists after the defined course actions.
- [ ] Verify that private state retains selected-choice check results, activity
  progress, help use, receipt metadata, and delayed-return schedules for
  durable learning progress.
- [ ] Verify that each local receipt saves the selected-choice check result and
  defined receipt metadata.
- [ ] Verify visible recovery for `private-state-v3.json` and
  `private-state-v2.json`. Verify that each file remains until an explicit
  clear-local-data action.

## System integrations

- [ ] Verify reminder permission, schedule, quiet-hours, disablement, deletion,
  and generic notification text.
- [ ] Verify that reminders do not change return dates, complete activities, or
  create records.
- [ ] Verify locked-device widget content, route validation, refresh behavior,
  and deletion behavior.
- [ ] Verify that the App Intent is parameter-free, exposes no learning data,
  and opens only its allowed route.
- [ ] Verify canonical deep links, malformed-link rejection, root routing, and
  no unintended state change.
- [ ] Verify configured public privacy and support URLs as approved HTTPS
  values. Do not attach learning data to either URL.

## Signing, archive, and external release gates

- [ ] Record the Apple Developer owner, Team ID, identifiers, App Group,
  certificates, and provisioning profiles.
- [ ] Get explicit authority for signing and archive creation.
- [ ] Create one signed archive for the fixed candidate. Record the archive
  digest, signed entitlements, validation output, and operator.
- [ ] Prepare App Store metadata, screenshots, privacy answers, rights records,
  export-compliance answer, and review notes from the fixed archive.
- [ ] Get explicit authority before a TestFlight upload. Record the build
  identity and TestFlight decision.
- [ ] Get explicit authority before an App Store submission or release action.

## Human review and final receipt

- [ ] Get recorded product, privacy, legal, accessibility, signing, and
  release-owner review for the fixed candidate.
- [ ] Record unresolved risks, stop conditions, support ownership, and the
  final decision.
- [ ] Keep the final decision at `NO_SHIP` until all required owners approve
  the fixed candidate.

```text
Candidate SHA:
Clean tree:
Toolchain and simulator:
Domain tests:
App tests:
XcodeGen drift:
Release build:
Accessibility evidence:
Privacy and protected-data evidence:
Reminder, widget, intent, and deep-link evidence:
Public URL evidence:
Signing and archive evidence:
App Store metadata evidence:
TestFlight authority and build:
Human review:
Known limits:
Residual gates:
Final decision:
```
