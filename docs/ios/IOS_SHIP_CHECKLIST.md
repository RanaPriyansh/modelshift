# FORGE iOS Ship Checklist

- **Date:** 2026-08-01
- **Current decision:** `NO_SHIP`
- **Current candidate state:** `FOUNDATION_CANDIDATE`
- **Highest recorded evidence level:** `CORE_TESTED`
- **Native implementation base:** `edbce3ea59783b4bea9140b406372b6cb85cc92b`
- **Distribution candidate commit:** `NOT_SELECTED`
- **Strategy web source:** `cd84e20f6f78d68a430666c185b00efa99c49a87`

## Purpose

Use this checklist for one fixed FORGE iOS candidate.

Complete the gates in order. Stop the release when one required item does not pass.

Submission, TestFlight distribution, and App Store release are external actions. Get explicit release authority before each action.

## Status terms

- `PASS`: Current evidence meets the gate for the fixed candidate.
- `PARTIAL`: Some local evidence exists, but the gate does not pass.
- `BLOCKED`: A required input or result does not exist.
- `NOT_RUN`: No current evidence exists.
- `NOT_APPLICABLE`: The release owner approved a written reason.

## Current evidence boundary

No pushed distribution candidate identifies the current native source.

The current records state that ten `ForgeCore` tests passed. They also state that Swift format checks passed.

The current records state that property lists, entitlements, privacy data, and asset JSON passed local validation.

The current records state that unsigned arm64 source compilation passed. The build excluded `Assets.xcassets` after the asset compiler failed.

No installed simulator runtime was available for the recorded build. No complete asset build exists in the current evidence.

No signed archive, physical-device result, manual accessibility result, TestFlight build, or App Store package exists.

The evidence above comes from `IOS_TEST_AND_RELEASE_PLAN.md`. This checklist change does not replay the full verification.

## Gate 0: Candidate identity

**Current status:** `BLOCKED`

- [ ] Select one source commit.
- [ ] Confirm that the commit includes all required iOS files.
- [ ] Confirm that the worktree is clean.
- [ ] Push the commit to the approved remote.
- [ ] Record the commit SHA in the release receipt.
- [ ] Record the repository URL and branch.
- [ ] Record `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`.
- [ ] Confirm that the build number is unique in App Store Connect.
- [ ] Record the exact web or API contract version.
- [ ] Record all approved differences from the web source.

Pass this gate only when one clean, pushed commit identifies all release inputs.

## Gate 1: Build

**Current status:** `BLOCKED`

Current local evidence supports only the recorded `CORE_TESTED` level. It does not support `COMPILED_LOCAL`.

- [ ] Record the Xcode, Swift, macOS, and iOS SDK versions.
- [ ] Use the Xcode version that Apple accepts on the submission date.
- [ ] Generate the project with the approved XcodeGen version.
- [ ] Confirm that generated project files have no unexpected change.
- [ ] Run `swift-format lint --strict` for all Swift source and test files.
- [ ] Run all `ForgeCore` tests.
- [ ] Run `FORGE_REQUIRE_ASSET_BUILD=1 ios/Scripts/verify.sh`.
- [ ] Confirm that the verification does not use the asset fallback.
- [ ] Build Debug for the application and widget.
- [ ] Build Release for the application and widget.
- [ ] Build the App Intent metadata.
- [ ] Confirm that application-owned warnings equal zero.
- [ ] Run the `iOS quality` workflow on the fixed commit.
- [ ] Create one Release archive for `generic/platform=iOS`.
- [ ] Record the archive SHA-256 digest.
- [ ] Record the application and extension bundle versions from the archive.
- [ ] Confirm that the archive contains the application icon and privacy data.

Pass this gate only when the full asset build, Release build, archive, and continuous integration pass.

## Gate 2: Signing and capabilities

**Current status:** `BLOCKED`

The project declares these identifiers:

- Application: `com.forgelearning.app`
- Widget: `com.forgelearning.app.widgets`
- App Group: `group.com.forgelearning.shared`

The repository does not verify ownership of these identifiers. It does not declare an approved Apple Developer Team.

- [ ] Confirm the legal Apple Developer account owner.
- [ ] Record the Apple Developer Team identifier.
- [ ] Register the application identifier.
- [ ] Register the widget identifier.
- [ ] Register the App Group identifier.
- [ ] Link both targets to the same App Group.
- [ ] Create approved distribution profiles for both targets.
- [ ] Sign the Release archive with the approved distribution identity.
- [ ] Inspect the signed application entitlements.
- [ ] Inspect the signed widget entitlements.
- [ ] Confirm that signed entitlements match the approved capability list.
- [ ] Confirm that the archive contains valid provisioning profiles.
- [ ] Validate the archive with the current App Store validation tool.
- [ ] Record the validation result and time.

Pass this gate only when Apple validates the signed archive and all capabilities.

## Gate 3: Privacy and learner safety

**Current status:** `PARTIAL`

`PrivacyInfo.xcprivacy` declares no tracking. It declares the `UserDefaults` required-reason API with reason `1C8F.1`.

The source marks widget content as privacy-sensitive. The current source also uses generic local notification text.

These source checks do not prove device privacy. App Privacy answers and a privacy policy do not exist in current evidence.

- [ ] Inventory all collected, stored, shared, and linked data.
- [ ] Inventory every required-reason API in the application and dependencies.
- [ ] Confirm each required-reason code against current Apple requirements.
- [ ] Confirm that `PrivacyInfo.xcprivacy` matches the final binary.
- [ ] Confirm that the final binary contains no analytics SDK.
- [ ] Confirm that the final binary contains no advertising SDK.
- [ ] Confirm that the application performs no remote push registration.
- [ ] Confirm that minor data cannot leave the device.
- [ ] Test notification states on a physical device.
- [ ] Test widget redaction while the device is locked.
- [ ] Test Siri output for learner-data disclosure.
- [ ] Test complete local deletion after process termination.
- [ ] Confirm that deletion removes the widget snapshot.
- [ ] Confirm that deletion removes pending intent data.
- [ ] Confirm that deletion cancels all reminders.
- [ ] Publish the approved privacy policy.
- [ ] Add an in-application link to the privacy policy.
- [ ] Complete App Privacy answers from the final binary inventory.
- [ ] Review the App Privacy answers with the privacy owner.
- [ ] Record the privacy owner approval.

Pass this gate only when the final binary, device tests, policy, and App Privacy answers agree.

## Gate 4: Accessibility

**Current status:** `BLOCKED`

The source contains accessibility labels and hints. No accessibility audit or manual assistive-technology result exists.

The Xcode project does not contain a UI test target. No `performAccessibilityAudit` result exists.

- [ ] Test all screens on the minimum supported iOS version.
- [ ] Test all screens on the current target iOS version.
- [ ] Test a small iPhone, a large iPhone, and an iPad.
- [ ] Test the 320-point layout.
- [ ] Test portrait orientation.
- [ ] Test each supported landscape orientation.
- [ ] Test Dark Appearance.
- [ ] Test Increased Contrast.
- [ ] Test Reduced Motion.
- [ ] Test Bold Text.
- [ ] Test Dynamic Type at 200 percent.
- [ ] Run Accessibility Inspector on every screen.
- [ ] Run `performAccessibilityAudit` for every main journey.
- [ ] Complete all main journeys with VoiceOver.
- [ ] Complete all main journeys with Voice Control.
- [ ] Complete all main journeys with Switch Control.
- [ ] Complete all main journeys with Full Keyboard Access.
- [ ] Confirm that information does not depend on color.
- [ ] Confirm that information does not depend on motion.
- [ ] Confirm that protected proof keeps access support.
- [ ] Fix every critical or high-severity accessibility defect.
- [ ] Record accepted lower-severity defects and owners.
- [ ] Record the manual test devices, testers, dates, and results.

Automated checks do not prove complete accessibility.

Pass this gate only when automated and manual results pass for the fixed candidate.

## Gate 5: Internal TestFlight

**Current status:** `BLOCKED`

No signed archive or TestFlight build exists. No TestFlight tester result exists.

- [ ] Pass Gates 0 through 4.
- [ ] Get explicit authority for the upload.
- [ ] Upload only the signed fixed candidate.
- [ ] Confirm that TestFlight shows the expected commit and build number.
- [ ] Confirm the export-compliance answer.
- [ ] Use adult internal testers only.
- [ ] Give testers the known limitation list.
- [ ] Give testers the privacy and incident instructions.
- [ ] Record the incident owner and contact method.
- [ ] Test onboarding, Today, Path, Evidence, focus, reminders, widget, intent, and deletion.
- [ ] Test installation, update, termination, relaunch, and offline use.
- [ ] Record crashes, hangs, data loss, privacy events, and accessibility barriers.
- [ ] Resolve all critical and high-severity defects.
- [ ] Record the internal TestFlight decision.

Pass this gate only when the fixed build passes all internal journeys without a release-blocking defect.

## Gate 6: Bounded external TestFlight

**Current status:** `BLOCKED`

This gate needs separate participant and data authority. Internal TestFlight authority does not authorize this gate.

- [ ] Pass Gate 5.
- [ ] Get explicit external TestFlight authority.
- [ ] Approve the adult-only participant group.
- [ ] Approve the participant information and consent process.
- [ ] Approve the collected data and retention period.
- [ ] Approve the support, incident, withdrawal, and deletion processes.
- [ ] Freeze the build and known limitation list.
- [ ] Record all tester access additions and removals.
- [ ] Record product understanding and accessibility barriers.
- [ ] Keep negative and uncertain results.
- [ ] Do not make an efficacy claim from TestFlight results.
- [ ] Record the external TestFlight decision.

Do not include a minor account mode in the first TestFlight.

## Gate 7: Rollback

**Current status:** `BLOCKED`

No candidate-specific rollback plan or rollback test exists.

The first release has no remote service or remote capability control. A server control cannot stop a faulty local application.

- [ ] Name the release owner and incident owner.
- [ ] Define the stop conditions for privacy, safety, data loss, crashes, and accessibility.
- [ ] Record the last approved build and source commit.
- [ ] Record the current App Store Connect stop control.
- [ ] Record the current TestFlight access-removal control.
- [ ] Define the user communication process.
- [ ] Define the support and incident-record process.
- [ ] Test local data after an update from the last approved build.
- [ ] Test local data after installation of the candidate.
- [ ] Test complete local deletion before and after rollback.
- [ ] Confirm that rollback does not convert fixture data into evidence.
- [ ] Confirm that rollback does not expose learner data.
- [ ] Run one rollback exercise with the release operator.
- [ ] Record the exercise time, result, defects, and owner.
- [ ] Approve the final rollback plan.

For a first App Store release, rollback can only stop or limit distribution. It cannot restore a previous App Store build.

Pass this gate only when the operator completes the candidate-specific rollback exercise.

## Gate 8: App Store package

**Current status:** `BLOCKED`

The application icon exists. No complete App Store review package exists.

- [ ] Pass Gates 0 through 7.
- [ ] Confirm the final application name, subtitle, description, and keywords.
- [ ] Confirm the education category and age rating.
- [ ] Provide the support URL.
- [ ] Provide the privacy policy URL.
- [ ] Provide current screenshots for each required device class.
- [ ] Confirm that screenshots match the fixed build.
- [ ] Complete App Privacy answers.
- [ ] Complete export-compliance answers.
- [ ] Complete content-rights answers.
- [ ] Add complete App Review notes.
- [ ] Provide a review account only when the application needs an account.
- [ ] Explain the device-local sample path in App Review notes.
- [ ] Confirm in-application account deletion when account creation exists.
- [ ] Mark account deletion as `NOT_APPLICABLE` only when no account creation exists.
- [ ] Confirm that all required services are available during review.
- [ ] Mark backend service checks as `NOT_APPLICABLE` only when the build has no network client.
- [ ] Confirm that the signed archive matches the approved archive digest.
- [ ] Get legal, privacy, accessibility, product, and release approvals.
- [ ] Get explicit authority for App Store submission.
- [ ] Record the submission identifier and time.

Pass this gate only when App Store validation accepts the package and all owners approve submission.

## Gate 9: Release

**Current status:** `BLOCKED`

- [ ] Confirm that Apple approved the exact submitted build.
- [ ] Review all gates for changes after submission.
- [ ] Get explicit authority for release.
- [ ] Select the approved release method.
- [ ] Monitor crashes, privacy events, accessibility barriers, and support events.
- [ ] Apply the rollback plan when a stop condition occurs.
- [ ] Record the final release decision and time.

Do not classify the application as `APP_STORE_RELEASED` before the exact build is available to intended users.

## Release receipt

Complete this receipt without secrets or personal learner data.

```text
Repository:
Branch:
Candidate commit:
Tree clean:
Web or API contract:
Marketing version:
Build number:
Xcode version:
Swift version:
iOS SDK:
Application bundle identifier:
Widget bundle identifier:
App Group identifier:
Apple Developer Team:
CI result URL:
Archive SHA-256:
App Store validation result:
Privacy approval:
Accessibility approval:
Internal TestFlight build:
External TestFlight authority:
Rollback exercise:
App Store submission:
Release authority:
Final evidence level:
Final decision:
Known limitations:
Residual gates:
```

## Current decision

Keep the decision at `NO_SHIP`.

The next valid action is to select and push one clean candidate commit.
Then run the full asset build and Release archive checks.
