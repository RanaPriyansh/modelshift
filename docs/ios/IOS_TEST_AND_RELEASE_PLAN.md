# FORGE iOS Test and Release Plan

**Date:** 2026-08-01
**Candidate state:** `FOUNDATION_CANDIDATE`

## Evidence levels

Use these evidence levels:

1. `CORE_TESTED`
2. `COMPILED_LOCAL`
3. `SIMULATOR_VERIFIED`
4. `DEVICE_VERIFIED`
5. `INTERNAL_TESTFLIGHT`
6. `BOUNDED_EXTERNAL_TESTFLIGHT`
7. `APP_STORE_SUBMITTED`
8. `APP_STORE_RELEASED`

Do not use a later state before all earlier gates pass.

## Gate 1: Core tests

Run Swift package tests on every change.

Cover these contracts:

- Onboarding validation
- Child and grown-up policy
- Deep-link routing
- Reminder quiet time
- Reminder denial
- Shared snapshot coding
- One-time intent handoff
- Data deletion

Pass condition:

- All tests pass.
- Swift strict concurrency produces no error.
- No network call exists in `ForgeCore`.

## Gate 2: Local compilation

Generate the Xcode project from `ios/project.yml`.

Build the application and widget with code signing disabled.

Build Debug and Release configurations.

Pass condition:

- The application compiles with Xcode 26.6.
- The widget compiles.
- The App Intent compiles.
- The privacy manifest is valid.
- The build has no application-owned warning.

## Gate 3: Simulator verification

Test these systems:

- iOS 18
- iOS 26

Test these device classes:

- Small iPhone
- Large iPhone
- iPad

Test these interface conditions:

- Portrait
- Landscape where supported
- Dark appearance
- Increased contrast
- Reduced Motion
- Bold Text
- Dynamic Type at 200 percent
- 320-point layout preview

Test these journeys:

1. Start with a goal.
2. Start with the safe sample.
3. Enter child mode without a grown-up.
4. Enter child mode with a grown-up.
5. Open Today.
6. Open Path.
7. Open Evidence.
8. Open focus from the application.
9. Open focus from the widget.
10. Open focus from the App Shortcut.
11. Enable a return reminder.
12. Deny reminder permission.
13. Disable reminders.
14. Delete local state.

Pass condition:

- No journey crashes.
- Every control has a clear accessible name.
- No screen clips or scrolls horizontally.
- Focus order remains logical.
- The tab history remains independent.

## Gate 4: Accessibility verification

Run Accessibility Inspector on every screen.

Run `performAccessibilityAudit` in UI tests.

Manually test:

- VoiceOver
- Voice Control
- Switch Control
- Full Keyboard Access
- Reduced Motion
- Increased Contrast
- Dynamic Type

Automated results do not prove complete accessibility.

Pass condition:

- Every common task works with each required access method.
- Information does not depend on color alone.
- Protected proof keeps access support.

See [Apple accessibility audit guidance](https://developer.apple.com/documentation/accessibility/performing-accessibility-audits-for-your-app).

## Gate 5: Privacy and safety verification

Verify these negative conditions:

- No notification contains learner content.
- No widget shows learner content while locked.
- No Siri response contains learner content.
- No analytics SDK exists.
- No advertising SDK exists.
- No remote push registration occurs.
- No minor data leaves the device.
- No intent changes evidence.
- No fixture becomes a production claim.

Test notification permission states:

- Not determined
- Denied
- Authorized
- Provisional

Test data operations:

- Export
- Single record delete
- Complete local delete
- Widget snapshot removal
- Pending intent removal
- Reminder cancellation

## Gate 6: API integration

Do not begin this gate until the web source and native API contracts are frozen.

Test:

- Valid adult session
- Expired session
- Revoked entitlement
- Offline start
- Offline queue recovery
- Duplicate event
- Conflicting update
- Deleted record
- Changed World version
- Invalid opaque identifier
- Server timeout
- Partial response
- Malformed response

Fail closed for every invalid authority state.

## Gate 7: Device verification

Use physical devices for:

- Notification timing
- Widget privacy redaction
- App Shortcut handoff
- Background termination
- Data Protection
- Keychain
- Low-memory recovery
- Offline recovery
- Rotation
- Large text

Run an energy and memory review.

Pass condition:

- No sensitive Lock Screen data appears.
- State remains correct after process termination.
- Reminder cancellation is reliable.
- Widget state matches the application state.

## Gate 8: Internal TestFlight

Use adult internal testers first.

Provide:

- Fixed candidate build
- Exact source commit
- Exact API environment
- Test account
- Known limitation list
- Incident owner
- Rollback plan

Do not include a minor account mode in the first TestFlight.

## Gate 9: Bounded external TestFlight

Start only after separate participant and data authority exists.

Use adults only.

Measure:

- Onboarding completion
- Correct next-action understanding
- Path authority understanding
- Evidence limitation understanding
- Notification trust
- Widget privacy understanding
- Accessibility barriers
- Operator time
- Incident count

Do not convert these results into an efficacy claim.

## Gate 10: App Store submission

Require:

- Frozen and pushed source commit
- Signed archive
- Complete App Store metadata
- Privacy policy
- Privacy manifest
- App Privacy answers
- Application icon
- Screenshots
- Review account
- Review notes
- Working backend
- Account deletion when applicable
- Tested rollback

Submission is an external action. Perform submission only with explicit release authority.

## Current residual gates

- Current web production identity is not complete.
- Native planner and sync APIs do not exist.
- No iOS simulator is currently available in the active tool session.
- The asset compiler cannot complete without an installed simulator runtime.
- Signing and App Group identifiers are not verified.
- No physical-device test exists.
- No manual assistive-technology test exists.
- No TestFlight test exists.
- No App Store review package exists.

## Current local evidence

The current foundation has this evidence:

- `swift-format lint --strict`: passed for all Swift source and test files.
- `ForgeCore`: ten tests passed in one suite.
- Property lists, entitlements, privacy manifest, and asset JSON: passed validation.
- Application icon: 1024 by 1024 pixels and opaque.
- Application, widget, and App Intent source: compiled in Debug and Release for unsigned arm64 iOS.
- Four UI test journeys: compiled for an unsigned arm64 iOS XCTest runner.
- App Intent metadata extraction: passed.
- The complete local verification script: passed with its documented asset fallback.

The source build excluded `Assets.xcassets` after the asset compiler reported no installed simulator runtime.
The UI journeys and accessibility audit did not run because no simulator runtime exists.

Do not classify this evidence as `SIMULATOR_VERIFIED`, `DEVICE_VERIFIED`, or App Store ready.
