# FORGE iOS University Test and Release Plan

**Date:** 2026-08-02
**Product scope:** ADULT_UNIVERSITY_V1
**Candidate state:** NOT_SELECTED
**Release decision:** NO_SHIP

## Scope and evidence rule

This plan defines release gates. It does not report a current test result.

All internal gates are not passed until a fixed candidate has the required
evidence.

Bind each result to one exact Git commit SHA and one exact Git tree SHA.

Do not use a local build, a static check, or a simulator run as release
evidence.

Do not use internal evidence as privacy URL, signing, export-compliance, App
Store, TestFlight, participant, accessibility-conformance, efficacy, retention,
or source-authority evidence.

The scope is the released University catalog and its local application surfaces.

## Current gate state

- **Candidate and artifact lineage**
  - State: `NOT_SELECTED`
  - Required evidence: Fixed commit SHA, tree SHA, clean-tree record,
    toolchain record, and immutable artifact record.
- **ForgeCore tests**
  - State: `NOT_RUN`
  - Required evidence: Candidate-bound SwiftPM log and result record.
- **Metadata and source-boundary tests**
  - State: `NOT_RUN`
  - Required evidence: Candidate-bound static log and Xcode result bundle.
- **Build-for-testing**
  - State: `NOT_RUN`
  - Required evidence: Candidate-bound build log, generated xctestrun file,
    and digest.
- **App unit tests**
  - State: `NOT_RUN`
  - Required evidence: Candidate-bound FORGEAppTests result bundle.
- **DEBUG UI test controls**
  - State: `NOT_RUN`
  - Required evidence: Candidate-bound source-boundary and UI results.
- **iPhone 17 Pro UI tests**
  - State: `NOT_RUN`
  - Required evidence: Candidate-bound result bundle for the recorded
    iPhone 17 Pro simulator.
- **Small iPhone UI tests**
  - State: `NOT_RUN`
  - Required evidence: Candidate-bound result bundle and layout record.
- **iPad UI tests**
  - State: `NOT_RUN`
  - Required evidence: Candidate-bound result bundle and layout record.
- **Launch appearance**
  - State: `NOT_RUN`
  - Required evidence: Cold-launch captures and device matrix record.
- **Accessibility**
  - State: `NOT_PROVED`
  - Required evidence: Automated audit, manual record, and separate
    conformance authority.
- **Privacy and local deletion**
  - State: `NOT_RUN`
  - Required evidence: Storage inspection, deletion, relaunch, and result
    bundles.
- **Protected-data recovery**
  - State: `NOT_RUN`
  - Required evidence: Unit, simulator, and device recovery records.
- **Reminder lifecycle**
  - State: `NOT_RUN`
  - Required evidence: Deterministic unit result and device result.
- **Widget**
  - State: `NOT_RUN`
  - Required evidence: Projection, route, locked-state, and device result.
- **App Intent**
  - State: `NOT_RUN`
  - Required evidence: Pending-focus handoff token, no learner, course, or
    evidence state mutation, and invalid-state result.
- **Deep links**
  - State: `NOT_RUN`
  - Required evidence: Valid-route and invalid-route result.
- **Signing**
  - State: `BLOCKED_EXTERNAL`
  - Required evidence: Authorized Apple owner, identifiers, profiles,
    signing identity, and archive record.
- **Privacy and support URLs**
  - State: `BLOCKED_EXTERNAL`
  - Required evidence: Authorized legal URLs and owner approval.
- **Export compliance**
  - State: `BLOCKED_EXTERNAL`
  - Required evidence: Authorized fixed-candidate compliance assessment,
    answer, rights record, and Apple record.
- **TestFlight authority**
  - State: `BLOCKED_EXTERNAL`
  - Required evidence: Authorized upload, distribution, support, and
    withdrawal controls.
- **App Store authority**
  - State: `BLOCKED_EXTERNAL`
  - Required evidence: Authorized metadata, screenshots, answers, review
    notes, and submission approval.
- **Participant evidence**
  - State: `BLOCKED_EXTERNAL`
  - Required evidence: Authorized participant, data, privacy, support, and
    study controls.

## Gate 0: Candidate and artifact lineage

Create one candidate record before any required command starts.

Record these exact values.

- Repository URL and branch.
- Output from git rev-parse HEAD.
- Output from git rev-parse HEAD^{tree}.
- Output from git status --porcelain=v1.
- Output from git diff --check.
- Released catalog identity, package identity, package digest, and ReturnPolicy
  identity.
- Xcode, Swift, macOS, iOS SDK, simulator runtime, and device UDID values.
- Start time, end time, operator, and exact command for each gate.

The candidate tree must be clean before and after every required command.

The git status --porcelain=v1 output must be empty.

Fail the candidate gate if the commit SHA, tree SHA, catalog identity, package
identity, package digest, or ReturnPolicy identity changes.

Create one absolute artifact root outside the worktree.

Use this path form.

    <absolute-artifact-root>/<commit-SHA>/<tree-SHA>/

Create a manifest in that artifact root before the first command.

Update the manifest after every command.

The manifest must include the values in this gate and the result path for every
command.

Use one new absolute result-bundle path for each Xcode test action.

Use this path form.

    <artifact-root>/results/<gate-name>-<device-UDID>.xcresult

Do not overwrite, move, merge, or reuse a result bundle.

Archive each completed result bundle without changing its contents.

Record the SHA-256 digest of the archive, the original absolute path, the
archive path, and the xcresult summary output.

Record the SHA-256 digest of each SwiftPM, static-check, build-for-testing, and
Xcode command log.

The before and after candidate identity must match the manifest.

Fail every affected gate when a source change occurs after its build or result
bundle.

## Gate 1: ForgeCore tests

Run ForgeCore tests from the fixed candidate.

Use an isolated scratch path under the candidate artifact root.

Run this command from the repository root.

    swift test --disable-sandbox \
      --package-path ios/Packages/ForgeCore \
      --scratch-path <artifact-root>/swiftpm

Record the complete command output, exit status, test count, failure count,
skip count, retry count, duration, and log digest.

Require tests for these areas.

- Released catalog, package, source-binding, limitation, and identifier
  validation.
- Byte limits, duplicate identifiers, missing references, cross-course
  references, malformed dates, and malformed state rejection.
- Exact catalog-to-state binding and active activity validation.
- Practice, proof, delayed-return, and return-completion transitions.
- Required proof prerequisites and blocked invalid assistance.
- Local evidence identity, selected-choice check result, receipt metadata, and
  local scope.
- Local activity progress, help use, and delayed-return schedule for durable
  learning progress.
- Absence of written reasoning, a value derived from written reasoning, and
  selected-choice text.
- ReturnPolicy open and due calculations from explicit proof time.
- Time regression rejection and explicit calendar behavior.
- Delayed-return status before opening, when open, when due, when expired, and
  after completion.
- Reminder eligibility, quiet-hour adjustment, time-zone behavior, and no date
  mutation.
- Widget projection states and validated deep-link destinations.
- State projection ordering, unstarted activities, and completion-evidence
  binding.

Use fixed Date values and a fixed Gregorian UTC calendar for deterministic
tests.

Do not read system time in a test that checks time, a delayed return, a
reminder, or a widget projection.

The ForgeCore result does not prove application launch, system notification
delivery, widget rendering, App Intent handoff, or release readiness.

## Gate 2: Metadata and source-boundary tests

Run the static check before the Xcode test action.

Run this command from the repository root.

    ios/Scripts/verify.sh --static

Record the complete output, exit status, duration, and log digest.

Run FORGEAppTests in a separate candidate-bound Xcode result bundle.

Require the result bundle to contain passing MetadataContractTests and
ReleaseSourceBoundaryTests results.

MetadataContractTests must verify these items.

- Application and widget bundle identifiers.
- Application URL scheme and exact URL-scheme owner.
- Education category and encryption declaration.
- Shared App Group values.
- Privacy manifest tracking declaration and required-reason categories.
- App icon manifest and launch-screen asset declarations.
- Version and build settings for the application and widget.
- Public-link configuration syntax.
- Checked-in Swift source membership in the Xcode project.

ReleaseSourceBoundaryTests must verify these items.

- Each UI test control is inside a DEBUG-only source boundary.
- The reset control is the presence switch `-FORGEUITestingReset`.
- The corrupt-state control is the presence switch
  `-FORGEUITestingCorruptPrivateState`.
- The deterministic-clock control is the valued switch
  `-FORGEUITestingClockStart <unix-time>`.
- Release source cannot use any UI test control.
- The application, widget, and University source set contain only the defined
  University product surface.
- The project retains each required application, widget, and test source file.

The public-link syntax check does not prove that a policy URL is authorized,
live, legally suitable, or ready for distribution.

## Gate 3: Build-for-testing

Run build-for-testing before app unit tests or UI tests.

Use the checked-in FORGE.xcodeproj project and FORGE scheme.

Use Debug configuration, an explicit simulator destination, and code signing
disabled.

Use an absolute derived-data path under the candidate artifact root.

Run this command for each simulator runtime that the gate uses.

    xcodebuild \
      -project ios/FORGE.xcodeproj \
      -scheme FORGE \
      -configuration Debug \
      -sdk iphonesimulator \
      -destination "platform=iOS Simulator,id=<device-UDID>" \
      -derivedDataPath <artifact-root>/derived-data/<device-UDID> \
      CODE_SIGNING_ALLOWED=NO \
      COMPILER_INDEX_STORE_ENABLE=NO \
      build-for-testing

Run a full unsigned asset build without an asset fallback.

Run this command from the repository root.

    FORGE_REQUIRE_ASSET_BUILD=1 ios/Scripts/verify.sh

Record the build-for-testing log, full asset-build log, generated xctestrun
path, xctestrun SHA-256 digest, app bundle path, test bundle paths, and
toolchain values.

Require the generated test plan to contain FORGEAppTests and FORGEUITests.

Fail this gate when the xctestrun file or its built products do not match the
candidate manifest.

An unsigned build is not signing or archive evidence.

## Gate 4: App unit tests

Run FORGEAppTests from the build-for-testing output.

Use the recorded xctestrun file and the recorded iPhone 17 Pro UDID.

Use one new result bundle path.

Use this command form.

    xcodebuild test-without-building \
      -xctestrun <generated-xctestrun-path> \
      -destination "platform=iOS Simulator,id=<iPhone-17-Pro-UDID>" \
      -only-testing:FORGEAppTests \
      -parallel-testing-enabled NO \
      -maximum-parallel-testing-workers 1 \
      -resultBundlePath \
      <artifact-root>/results/app-units-<iPhone-17-Pro-UDID>.xcresult

Record the exact expanded command and all result-bundle lineage values from
Gate 0.

Require results for AppModelTests, AppLifecyclePolicyTests,
NotificationCoordinatorTests, PrivateStateStoreTests, MetadataContractTests,
and ReleaseSourceBoundaryTests.

Require tests for these behaviors.

- Active, inactive, and background lifecycle actions.
- Local state load, save, update, reset, and cold relaunch.
- Recovery after a private-state load, save, reset, detected v3 file, or
  detected v2 file.
- Failure isolation and retry without duplicate background work.
- Protected-data unavailability without data deletion.
- Retry after protected data becomes available.
- Corrupt private state, oversized state, unsafe state path, and write
  verification failure.
- Local reminder request, reconciliation, disable, completion, deletion, quiet
  hours, time zones, and daylight-saving transitions.
- Notification content with no course, activity, evidence, learner,
  selected-choice text, selected-choice check result, written reasoning, or a
  value derived from written reasoning.
- Shared state reset, pending-focus handoff token reset, and widget reload
  request after local deletion.

Use injected time and injected notification services in app unit tests.

Do not use elapsed wall time as a test oracle.

## Gate 5: DEBUG UI test controls

The UI test harness must provide these exact launch controls.

- `-FORGEUITestingReset` is a presence switch.
- `-FORGEUITestingCorruptPrivateState` is a presence switch.
- `-FORGEUITestingClockStart <unix-time>` is a valued switch.

The clock-start switch must occur at most once.

The clock-start switch must accept one finite Unix time.

The test clock must start at the supplied Unix time.

It must advance one second for each `now()` call.

The deterministic-clock control must affect the application model, University
projection, reminder calculation, and widget projection.

The deterministic-clock control must not change device system time.

The reset switch must clear local private state and shared App Group state.

It must clear all pending and delivered local notifications.

The reset control must run before each independent UI test journey.

The corrupt-state control must run after a reset and before application load.

The corrupt-state switch must write invalid private state before the application
model loads.

The corrupt-state control must lead to the local recovery surface.

All three controls must compile only under DEBUG.

The Release build must not recognize or use any UI test control.

Fail this gate when a control is absent, accepts an invalid value, changes
unrelated device data, or exists in Release source.

## Gate 6: iPhone 17 Pro simulator UI tests

Use iPhone 17 Pro with the iOS 26.5 simulator runtime for the primary UI gate.

Record the simulator name, runtime, OS version, UDID, Xcode version, and boot
state.

Use the recorded UDID as the destination.

Run FORGEUITests from the candidate-bound build-for-testing output.

Use a new result bundle path.

Use this command form.

    xcodebuild test-without-building \
      -xctestrun <generated-xctestrun-path> \
      -destination "platform=iOS Simulator,id=<iPhone-17-Pro-UDID>" \
      -only-testing:FORGEUITests \
      -parallel-testing-enabled NO \
      -maximum-parallel-testing-workers 1 \
      -resultBundlePath \
      <artifact-root>/results/ui-iphone-17-pro-<iPhone-17-Pro-UDID>.xcresult

Every independent journey must start with `-FORGEUITestingReset`.

Every time-sensitive journey must include
`-FORGEUITestingClockStart <unix-time>`.

Run a separate corrupt-state journey with `-FORGEUITestingCorruptPrivateState`.

Require these UI journeys.

1. Cold launch and the approved University course start surface.
2. Local practice with an incorrect result and a demonstrated result.
3. Proof prerequisites and delayed-return creation.
4. Scheduled, open, due, expired, and completed delayed-return states at fixed
   clock values.
5. Evidence display with local-only boundaries, stored receipt metadata, and no
   written reasoning, value derived from written reasoning, or selected-choice
   text.
6. Reminder preference changes without a change to opensAt or dueAt.
7. Termination and relaunch with retained local state.
8. Full local deletion, termination, and relaunch with no retained local state.
9. Corrupt private state, recovery display, retry, and confirmed
   clear-local-data action.
10. Valid deep-link routing and invalid deep-link rejection.

Fail this gate when a UI journey changes course state without a valid local
action.

Fail this gate when a result bundle has a failure, an unexpected skip, a retry,
a missing test, or a candidate-lineage mismatch.

## Gate 7: Small iPhone and iPad simulator UI tests

Run the UI journey on one small iPhone simulator and one iPad simulator.

Use the declared minimum supported iOS version on the small iPhone.

Use the current target iOS version on the iPad.

Record each device type, runtime, OS version, UDID, orientation, dynamic-type
setting, and result-bundle path.

Run an independent build-for-testing action when the runtime requires different
built products.

Run FORGEUITests with the DEBUG reset and deterministic-clock controls on each
device.

Use a separate result bundle for the small iPhone and a separate result bundle
for the iPad.

Verify these surfaces in portrait and the supported landscape configuration.

- Cold launch.
- Course start and Today.
- Activity selection, response entry, result, and close action.
- Delayed-return status and exact dates.
- Evidence.
- Settings, reminder control, privacy support, and local deletion.
- Local data recovery.

Record screenshots for each required surface and device configuration.

Treat screenshots as visual records only.

## Gate 8: Launch appearance and accessibility

Test launch appearance on iPhone 17 Pro, the small iPhone, and the iPad.

Test bright appearance and dark appearance.

Cold launch from a terminated application.

Verify the configured LaunchBackground color and LaunchMark image on each
device class.

Verify that the launch screen does not show a blank surface, stale application
content, clipped mark, incorrect safe-area layout, or an unowned default image.

Record a capture with the candidate and device record.

Run the automated accessibility audit on each University screen and the local
recovery screen.

Require element detection, hit-region, sufficient-description, text-clipping,
and trait audit results.

Run the UI journey with the largest supported Dynamic Type category.

Run the UI journey with Reduced Motion and dark appearance enabled.

Perform manual checks for VoiceOver, Voice Control, Switch Control, Full
Keyboard Access, Dynamic Type, Bold Text, and Increased Contrast.

Record tester, device, system version, procedure, observed result, defect
identifier, and resolution for each manual check.

These checks do not prove accessibility conformance without the required
evaluation and approval evidence.

## Gate 9: Privacy, deletion, and protected-data recovery

Use a unique known written-reasoning string in the privacy test.

Inspect private state, App Group state, widget data, the pending-focus handoff
token, reminder content, logs, and result attachments.

Verify that the known written-reasoning string and a value derived from written
reasoning are not retained.

Verify that local state records do not retain selected-choice text.

Verify that private state retains selected-choice check results, activity
progress, help use, receipt metadata, and delayed-return schedules for durable
learning progress.

Verify that each local receipt stores the selected-choice check result and
defined receipt metadata.

Verify that the widget and reminder contain no course, activity, evidence,
learner, selected-choice text, selected-choice check result, written reasoning,
or value derived from written reasoning.

Run full local deletion after state, local evidence, a delayed return, a
reminder, a widget projection, and pending-focus handoff token state exist.

Terminate and relaunch the application after deletion.

Verify that no local state, local evidence, reminder, widget projection, or
pending-focus handoff token returns.

Test protected-data unavailability with the injected unit-test availability
control.

Verify that load, save, and clear operations do not read, replace, or delete
private state while protected data is unavailable.

Use a physical device to test the locked protected-data path.

Verify that the application shows recovery without automatic data deletion.

Unlock the device and use Retry.

Verify that the original valid state loads after protected data becomes
available.

Use the DEBUG corrupt-state control for a separate corrupt-data test.

Verify that corrupt data shows the recovery surface and offers only the defined
recovery actions.

Verify that protected-data recovery and corrupt-data recovery remain separate.

Put `private-state-v3.json` and `private-state-v2.json` in the private-state
directory in separate test runs.

Verify that each file starts visible recovery and remains present until an
explicit clear-local-data action.

## Gate 10: Reminder lifecycle

Use fixed UTC time and fixed time-zone data in unit tests.

Use a physical device for notification permission and delivery behavior.

Test not-determined, denied, authorized, and disabled permission states when
the supported iOS version provides them.

Test reminder enable, disable, app background, process termination, cold
relaunch, return completion, and full local deletion.

Verify that one managed reminder is scheduled for the eligible delayed return.

Verify quiet-hour adjustment and daylight-saving behavior in the deterministic
unit result.

Verify that a reminder has generic title and body text.

Verify that reminder enable and disable do not change opensAt or dueAt.

Cancelling a reminder must remove only the managed local notification request.

Cancelling a reminder must not cancel a delayed return.

Verify that reminder delivery does not create local evidence, complete a
delayed return, or advance course state.

Verify that no managed reminder remains after disable, completion, or deletion.

## Gate 11: Widget, App Intent, and deep links

Test widget projection with fixed clock values for unavailable store, no data,
corrupt data, scheduled, open, due, expired, and stale states.

Test the widget on a physical device while the device is locked.

Verify that locked widget content is redacted.

Verify that the widget opens only forge://today or forge://focus.

Verify that the route agrees with the fixed-clock projection state.

Verify that an invalid widget route does not change local state.

Test ContinueLearningIntent with no input parameters.

Verify that the App Intent writes only the permitted pending-focus handoff
token.

Verify before and after values for learner state, course state, evidence state,
receipts, and delayed returns.

Verify that the App Intent cannot modify any of those values.

Verify that application consumption of the handoff opens an eligible activity
only.

Verify that an unavailable, corrupt, expired, or invalid state does not
advance course state.

Verify that the intent returns no learner, course, activity, evidence, written
reasoning, or selected-choice text.

Test these valid deep links.

- forge://today
- forge://path
- forge://evidence
- forge://returns
- forge://focus
- forge://settings

Test unknown hosts, extra paths, query values, fragments, malformed URLs, and
unavailable-state routes.

Verify that each invalid deep link leaves local state unchanged.

## Gate 12: External release controls

Keep all controls in this gate external and not passed.

Signing requires an authorized Apple owner, Team ID, application identifier,
widget identifier, App Group, provisioning profiles, signing identity, and
archive authority.

Privacy and support URLs require authorized legal content, ownership,
availability, and approval.

Export compliance requires an authorized fixed-archive assessment, answer,
rights record, and Apple record.

TestFlight authority requires explicit upload, distribution, support, incident,
withdrawal, and deletion authority.

App Store authority requires authorized copy, screenshots, App Privacy answers,
review notes, rights review, and submission authority.

Participant evidence requires explicit participant, data, privacy, support,
withdrawal, deletion, and study authority.

Do not perform a signing action, archive, upload, distribution, participant
activity, or App Store submission from this plan.

Do not mark privacy and support URLs, signing, export compliance, TestFlight
authority, App Store authority, or participant evidence as passed from local
or CI evidence.

## Result record

Use one result record for each gate.

    Candidate commit SHA:
    Candidate tree SHA:
    Catalog identity:
    Package identity and digest:
    ReturnPolicy identity:
    Pre-run clean-tree result:
    Post-run clean-tree result:
    Gate:
    Exact command or manual procedure:
    Toolchain:
    Simulator or device type, OS, runtime, and UDID:
    Derived-data path:
    Generated xctestrun path and SHA-256 digest:
    Result-bundle original absolute path:
    Result-bundle archive path and SHA-256 digest:
    Command-log path and SHA-256 digest:
    xcresult summary path:
    Test count:
    Failure count:
    Skip count:
    Retry count:
    Warning count:
    Start time:
    End time:
    Observed result:
    Known limitation:
    Operator:
    Owner:

Keep the release decision at NO_SHIP until every applicable internal gate has
candidate-bound evidence and every external control has authorized evidence.
