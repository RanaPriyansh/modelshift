# FORGE iOS Execution Plan

**Date:** 2026-08-02
**Worktree:** `forge-ios-foundation-20260801`
**Branch:** `agent/forge-ios-foundation-20260801`
**Starting commit:** `a542bfca7b7c86b26a41c8c3f600b784db92e797`
**Code commit:** `9e0496c`
**Current candidate state:** `VERIFIED_LOCAL_BASELINE`
**Release decision:** `NO_SHIP`

## Fixed foundation scope

The first candidate is a native SwiftUI application for adult internal testers.

The candidate supports iOS 18 or later. Distribution builds use Xcode 26 and the
iOS 26 SDK.

The candidate stays on the device. It has no account, cloud sync, analytics,
advertising, network client, or remote notification.

The candidate uses read-only fixture data. It does not create completion,
protected proof, canonical evidence, or consequential decisions.

The main navigation has three sections:

- Today
- Path
- Evidence

The candidate also contains:

- Optional onboarding
- One full-screen focus preview
- One local delayed-return reminder
- One redacted small widget
- One parameter-free App Intent
- Settings, privacy information, support information, and local deletion

## Product acceptance contract

1. A clean installation shows optional onboarding.
2. Onboarding collects one goal or one safe sample.
3. Onboarding states the device-data boundary.
4. Today shows one primary action, its reason, and its duration.
5. Today offers Change direction and Review a due return.
6. Path shows one vertical milestone sequence with explicit states.
7. Today and the active Path milestone open the focus preview.
8. Focus hides the tab bar and keeps pause, stop, source, safety, and access controls.
9. Evidence keeps limitations and untested results visible.
10. Settings shows device data, reminders, onboarding, privacy, support, and deletion.
11. Widgets, notifications, intents, routes, and settings do not change evidence.
12. Invalid external routes cause no state change.
13. Local deletion removes application state, App Group state, routes, and reminders.
14. All learner surfaces operate without a network connection.

## Current confirmed local evidence

The table records only confirmed local evidence for this update.

| Evidence | Exact result | Boundary |
| --- | --- | --- |
| Static verification | `ios/Scripts/verify.sh --static` passed. | This is static local evidence. |
| Formatting | Strict recursive `swift-format` passed. | Formatting does not prove runtime behavior. |
| `ForgeCore` | `ForgeCore` passed 17 tests in 3 suites. | This is local test evidence only. |
| Unsigned device builds | Full `CI=true ios/Scripts/verify.sh` passed unsigned arm64 Debug and Release device builds with full assets and compiled the UI test source. | These are unsigned builds. |
| Named simulator | XcodeBuildMCP `build_run_sim` passed on `FORGE-iPhone-17-Pro` with ID `51A58074-74AB-4942-84DD-E0ED2E087CD7` without warnings or errors. | This proves only the named local simulator. |
| UI tests | All 7 UI tests passed in `~/Library/Developer/XcodeBuildMCP/workspaces/codex-buildweek-dcb7dbdcf9c5/result-bundles/test_sim_2026-08-01T22-24-44-871Z_pid2419_aadc876c.xcresult`. | This result covers the named local simulator only. |
| Primary accessibility audit | The primary accessibility audit passed in that run after exact Xcode 26 false-report handling. | This does not prove accessibility conformance. |

The current local state is `VERIFIED_LOCAL_BASELINE` at code commit `9e0496c`.
The evidence proves only the named local simulator and unsigned builds.
It does not prove physical-device behavior, a signed archive, distribution, production operation, accessibility conformance, or release readiness.

## Release boundary

Keep `NO_SHIP`.

`VERIFIED_LOCAL_BASELINE` is not release authorization.

- Do not sign.
- Do not archive.
- Do not upload.
- Do not distribute.
- Do not deploy.

## Current implementation slices

### Slice A: Environment and initial build

Status: `COMPLETE`

- Prepare the local build environment.
- Run `ios/Scripts/verify.sh --static`.
- Run strict recursive `swift-format`.
- Run `CI=true ios/Scripts/verify.sh`.
- Build and launch the named local simulator.

Completion evidence:

- Static verification passed.
- Strict recursive `swift-format` passed.
- Unsigned arm64 Debug and Release device builds passed with full assets.
- The UI test source compiled.
- The named simulator build and launch passed without warnings or errors.

This completion applies only to the recorded local baseline.

### Slice B: Foundation safety

Status: `COMPLETE`

- Give the App Intent one application target owner.
- Accept only exact `forge://` routes.
- Add missing Today and Path actions.
- Add deterministic UI-test waits.
- Add an in-application privacy and support center.

Completion evidence:

- `ForgeCore` passed 17 tests in 3 suites.
- All 7 UI tests passed in the recorded result bundle.
- The primary accessibility audit passed after exact Xcode 26 false-report handling.
- XcodeBuildMCP reported no warnings or errors for the named simulator run.

This completion does not establish accessibility conformance.

### Slice C: Simulator and accessibility verification

Status: `OPEN_EVIDENCE`

- Build Debug with all assets.
- Launch the application on the named `FORGE-iPhone-17-Pro` simulator.
- Launch the application on a small iPhone.
- Launch the application on an iPad.
- Run all seven UI tests.
- Run accessibility audits for primary learner surfaces.
- Launch the exact `forge://focus` route.
- Capture small iPhone, large iPhone, and iPad frames.
- Test Dark Mode and Increased Contrast.

Recorded local evidence:

- The named `FORGE-iPhone-17-Pro` simulator run passed.
- All 7 UI tests passed in the recorded result bundle.
- The primary accessibility audit passed after exact Xcode 26 false-report handling.

The remaining simulator, appearance, route, deletion, and manual access-method gates remain open.

## Next local gates

Run these gates in order on the verified local baseline.

1. Run the simulator matrix on a small iPhone.
2. Run the simulator matrix on an iPad.
3. Test Dark Mode.
4. Test Increased Contrast.
5. Launch the exact `forge://focus` route.
6. Test deletion after a cold relaunch.
7. Run application-level storage and recovery tests.
8. Verify reminder launch reconciliation.
9. Measure memory and performance.
10. Record result bundles, screenshots, and residual risks.

Stop local progression when a gate fails.

## Remaining evidence and external inputs

Keep each item open until the required evidence or input exists.

| Item | State | Required evidence or input |
| --- | --- | --- |
| Small iPhone | `OPEN_EVIDENCE` | Recorded simulator result at 320 CSS px and supported sizes |
| iPad | `OPEN_EVIDENCE` | Recorded simulator result |
| Dark Mode | `OPEN_EVIDENCE` | Recorded appearance result |
| Increased Contrast | `OPEN_EVIDENCE` | Recorded contrast result |
| Exact `forge://focus` launch | `OPEN_EVIDENCE` | Recorded launch from the exact route |
| Cold-relaunch deletion | `OPEN_EVIDENCE` | Deletion result after process termination and relaunch |
| Application storage and recovery | `OPEN_EVIDENCE` | Application-level storage, corruption, and recovery results |
| Reminder launch reconciliation | `OPEN_EVIDENCE` | Launch reconciliation result for reminder state |
| Memory and performance | `OPEN_EVIDENCE` | Recorded memory, energy, launch, hang, and performance results |
| Accessibility conformance | `OPEN_EVIDENCE` | Manual access-method results and the broader accessibility matrix |
| Physical device | `BLOCKED_OWNER_INPUT` | Authorized signed-device notification, widget, intent, lifecycle, privacy, and performance results |
| Signed archive | `BLOCKED_OWNER_INPUT` | Signed Release archive, validation result, and archive digest |
| Signing | `BLOCKED_OWNER_INPUT` | Team, identifiers, signing method, and authorized operator |
| Identifiers | `BLOCKED_OWNER_INPUT` | Approved application, widget, and App Group identifiers |
| TestFlight | `BLOCKED_OWNER_INPUT` | Signed candidate, tester group, and explicit distribution authority |
| App Store | `BLOCKED_OWNER_INPUT` | App Store metadata, review records, and explicit submission authority |
| Policy URLs | `BLOCKED_OWNER_INPUT` | Approved privacy-policy URL and maintained support URL |
| Owner approvals | `BLOCKED_OWNER_INPUT` | Product, technical, privacy/support, and Apple distribution approvals |
| Upload | `BLOCKED_OWNER_INPUT` | Explicit upload authority for the fixed signed candidate |
| Distribution | `BLOCKED_OWNER_INPUT` | Explicit distribution authority for the approved tester group |

### Slice D: Candidate hardening

Status: `PENDING`

- Separate private application state from the redacted App Group state.
- Replace silent storage failure with an explicit recovery state.
- Prevent custom goals from inheriting unrelated fixture records.
- Reconcile reminders during launch.
- Verify deletion after cold relaunch.
- Add application-level tests for storage, routing, and notification adapters.

Completion evidence:

- Typed storage contract
- Corruption and relaunch tests
- App Group payload privacy test
- Notification reconciliation tests

### Slice E: Distribution

Status: `BLOCKED_OWNER_INPUT`

- Register application, widget, and App Group identifiers.
- Configure the approved Apple Developer Team and signing method.
- Create and validate one signed archive.
- Prepare one adult-only internal TestFlight group.
- Upload only after explicit candidate-bound authority.

Completion evidence:

- Team and identifier records
- Certificate and profile records
- Signed archive digest
- Apple validation result
- TestFlight processed-build record
- Explicit upload and distribution authority

## Required owner decisions

These decisions remain external to local evidence.

### Product

- Approve the adult-only foundation scope.
- Approve the bundled fixture, sources, rights, reviewer, version, and limitations.
- Decide whether release 0.1 stays read-only.
- Approve evidence terms before any local observation feature enters scope.
- Define return delay, expiry, overdue, interruption, and recovery rules.

### Technical

- Approve the private storage file-protection class.
- Approve backup, restore, corruption, and schema-mismatch behavior.
- Approve an HTTPS universal-link host or keep only the custom scheme.
- Set launch, memory, energy, crash, and hang limits.

### Privacy and support

- Provide the published privacy-policy URL.
- Provide the maintained support URL.
- Approve retention, deletion, backup, diagnostics, logging, and feedback behavior.
- Approve final App Privacy answers for the fixed binary.

### Apple distribution

- Provide the legal Apple Developer organization and Team identifier.
- Confirm registered bundle and App Group identifiers.
- Select automatic or manual signing.
- Name the authorized signing operator.
- Provide App Store Connect fields, age rating, screenshots, review notes, and contacts.
- Name the approved internal tester group and roster owner.

## No-ship gates

Keep `NO_SHIP` until these gates pass:

- One clean, pushed candidate SHA identifies the release binary.
- The full simulator matrix passes on the required devices and appearances.
- The exact `forge://focus` launch passes.
- Cold-relaunch deletion and application storage recovery pass.
- Reminder launch reconciliation passes.
- Memory and performance results meet the approved limits.
- The required accessibility matrix and manual access-method results pass.
- Physical-device notification, widget, intent, lifecycle, privacy, and performance tests pass.
- The final privacy policy and App Privacy answers match the binary.
- Apple identifiers, signing, entitlements, and archive validation pass.
- A signed archive passes Apple validation.
- App Store records match the fixed binary.
- The release owner gives explicit upload and distribution authority.
- Required owner approvals are recorded.
