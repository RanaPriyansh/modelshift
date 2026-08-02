# FORGE iOS Adult University V1 Execution Plan

- **Date:** 2026-08-02
- **Product scope:** `ADULT_UNIVERSITY_V1`
- **Candidate state:** `NOT_SELECTED`
- **Release decision:** `NO_SHIP`

## Evidence boundary

This document records the current source inventory only.

The working tree is modified.

No exact candidate SHA or clean-tree record exists.

Source presence does not prove compilation or execution.

Source presence does not prove simulator, device, signing, or release behavior.

Do not reuse prior iOS evidence for this candidate.

Do not treat a local receipt as an academic record, credit, grade, mastery,
proficiency, efficacy, or retention result.

Keep `NO_SHIP` until a fixed candidate has current evidence.

## Implemented source work

The sections below identify source that exists in the current working tree.

Each section has the state `SOURCE_PRESENT_NOT_VERIFIED`.

### Course domain

The ForgeCore course domain is in this directory:

`ios/Packages/ForgeCore/Sources/ForgeCore/`

- `UniversityStarterCourse.swift`
- `UniversityLearningModels.swift`
- `UniversityLearningEngine.swift`

These files define one local adult mechanics course package.

They define local learner state, receipts, and delayed returns.

The engine validates catalog IDs, state, dates, and submissions before a change.

FORGE keeps written reasoning and values derived from written reasoning in
memory while an activity is open and during submission. FORGE does not save
them.

FORGE uses selected-choice text to check an activity. FORGE does not save
selected-choice text.

FORGE saves selected-choice check results, activity progress, help use, receipt
metadata, and delayed-return schedules locally. FORGE needs this data for
durable learning progress.

### Experience state

`UniversityExperienceProjection.swift` derives the learner-facing state.

It derives the active activity, capability progress, return rows, and evidence
rows.

It validates catalog and learner state before it creates a projection.

### Reminder policy

`ReminderPolicy.swift` contains the pure reminder selection and time rule.

It has no notification API dependency.

It selects one eligible scheduled return and derives one local reminder time.

### Private state

`ios/Sources/App/Services/PrivateStateStore.swift` stores the v4 envelope.

The envelope contains learner state, course-start state, and reminder
preference.

The source uses protected Application Support storage.

### App coordination

`ios/Sources/App/AppModel.swift` coordinates local state and system handoff.

`ios/Sources/App/AppRootView.swift` sends URLs and scene phases to `AppModel`.

`AppComposition` creates the catalog, engine, stores, notification adapter, and
widget reloader.

### Notification adapter

`ios/Sources/App/Services/NotificationCoordinator.swift` manages one generic
local notification.

It separates explicit authorization requests from routine reconciliation.

### Shared state

`SharedStateStore.swift` is in this directory:

`ios/Packages/ForgeCore/Sources/ForgeCore/`

It stores a typed, redacted return projection and one permitted pending-focus
handoff token.

### Widget

`WidgetProjectionPolicy.swift` is in the ForgeCore source directory.

`ios/Sources/Widgets/ContinueLearningWidget.swift` renders the widget.

The widget reads only the shared projection.

### Intent and route

`ios/Sources/SystemIntegration/ContinueLearningIntent.swift` defines the
parameter-free App Intent.

`DeepLinks.swift` in ForgeCore defines the exact custom URL parser.

The App Intent can write only the pending-focus handoff token.

The App Intent cannot modify learner state, course state, evidence state, a
receipt, or a delayed return.

### Project definition

`ios/project.yml` defines `FORGE`, `FORGEWidgets`, `FORGEAppTests`, and
`FORGEUITests`.

It also defines the shared `FORGE` scheme and App Group entitlements.

## State transition order

The engine validates the catalog, state, date, and submission before it changes
local learner state.

The source uses this order when the learner starts the local course.

1. `AppModel` makes a private v4 envelope with `isCourseStarted` set to true.
2. `PrivateStateStore` saves the envelope.
3. `AppModel` applies the saved envelope to memory.
4. `AppModel` refreshes the experience projection.
5. `AppModel` writes or clears the redacted shared projection.

The source uses this order when the learner submits an activity.

1. `AppModel` captures one current time and validates activity eligibility.
2. `UniversityLearningEngine.transition` validates the local submission.
3. The engine creates a receipt only for the defined local result.
4. Demonstrated proof creates the delayed return from the package rule.
5. The fixed package sets `opensAt` seven days after demonstrated proof.
6. The fixed package sets `dueAt` thirty days after `opensAt`.
7. `AppModel` saves the private candidate envelope.
8. `AppModel` applies the saved envelope to memory.
9. `AppModel` refreshes the experience projection.
10. `AppModel` writes or clears the shared projection.
11. `AppModel` starts reminder reconciliation.

The engine does not let a route, widget, intent, reminder, or notification
create a receipt.

`AppRootView` sends an initial and later scene-phase value to `AppModel`.

For an active scene, `AppModel` refreshes the experience and shared projection.

It then consumes a pending-focus handoff token and reconciles reminders.

For a background scene, `AppModel` writes the current private envelope.

## Private and shared storage

`PrivateStateStore` writes `private-state-v4.json` in the app Application
Support directory.

Private stage files use the `.private-state-v4.json.stage-` prefix.

When FORGE finds `private-state-v3.json` or `private-state-v2.json`, it shows
visible recovery and preserves the file until an explicit clear-local-data
action.

The private write path has a 1 MiB byte limit.

The source uses a stage file, file synchronization, atomic rename, and
read-back validation for one private-file replacement.

The source also checks protected-data availability and rejects unsafe paths.

`ForgeSharedStateStore` writes two separate v3 files in the App Group directory.

The return projection contains only these values:

- `lifecycle`
- `opensAt`
- `dueAt`
- `generatedAt`
- `validUntil`

The pending-focus handoff token file contains only the `focus` destination
token.

The shared store uses an exclusive lock, bounded reads, stage files, file
synchronization, atomic rename, and read-back validation for each file.

The private and shared stores do not form one distributed transaction.

For course start and activity submission, the source saves private state before
it writes the shared projection.

If private persistence fails, `AppModel` does not apply the candidate state.

If shared persistence fails, `AppModel` reports a local integration error after
private state can already exist.

The local-data reset source disables the managed reminder and clears shared
state before it clears private state.

That cleanup sequence is not an end-to-end deletion verification result.

## Reminder reconciliation

`ReturnReminderPolicy` selects the earliest eligible scheduled return.

It breaks equal opening times by return ID.

The policy uses the opening time only.

An opening from 21:00 through 08:59 local time moves to 09:00 local time.

The policy rejects invalid, past, nonfinite, and post-due reminder times.

The notification text is generic.

It contains no learner, course, activity, receipt, or return identifier.

It contains no selected-choice text, selected-choice check result, written
reasoning, or value derived from written reasoning.

`NotificationCoordinator.requestAndSchedule` is for an explicit learner enable
action.

It removes managed notifications, requests alert authorization, and adds one
passive notification without sound.

`NotificationCoordinator.reconcile` does not request authorization.

It removes the managed notification in these conditions:

- The preference is off.
- No eligible scheduled return exists.
- The reminder time is invalid.
- Authorization does not permit scheduling.

The coordinator serializes operations.

It checks that its managed pending and delivered identifiers are gone after
removal.

`AppModel` starts reconciliation after a saved activity transition, a successful
retry load, and an active scene.

`AppModel` also starts the explicit enable flow when the learner turns the
setting on.

The source schedules a notification before it saves the resulting reminder
preference.

iOS controls notification delivery. This document records no delivery result.

## Widget projection

`AppModel` builds the shared return projection after successful local load,
course start, activity submission, and active-scene refresh.

It clears the projection when no current return exists or when the return is
expired or completed.

It asks `WidgetCenter` to reload timelines after a shared projection update or
clear.

The widget reads only `ForgeSharedStateStore`.

`WidgetProjectionPolicy` maps unavailable, absent, corrupt, scheduled, open,
due, expired, and stale inputs to generic content.

The widget uses `.privacySensitive()`.

Only open and due presentation states use `forge://focus`.

All other presentation states use `forge://today`.

The policy refreshes at the next relevant time boundary or within six hours.

The widget source does not change learner state.

The shared projection contains no selected-choice text, selected-choice check
result, written reasoning, receipt metadata, or help-use data.

## Intent and deep-link handling

`ForgeDeepLink` accepts only these exact URLs.

- `forge://today`
- `forge://path`
- `forge://evidence`
- `forge://returns`
- `forge://focus`
- `forge://settings`

The parser rejects URL paths, query values, and all other URL forms.

`AppRootView` sends accepted URLs to `AppModel.route`.

`AppModel` rejects a route during local recovery or local-data reset.

The `today`, `path`, `evidence`, and `settings` destinations change navigation
only.

The `returns` destination selects Today. It does not open an activity directly.

The `focus` destination calls `presentActivity`.

`AppModel` still requires a started course and an eligible current activity.

For a delayed return, only the open and due states are eligible for activity
presentation.

`ContinueLearningIntent` has no parameters.

The App Intent writes the permitted pending-focus handoff token to the shared
store.

When the app becomes active, `AppModel` consumes and removes that token before
it requests activity presentation.

The handoff token is not learner state, course state, or evidence state.

The App Intent cannot modify learner state, course state, evidence state, a
receipt, or a delayed return.

The App Intent does not bypass eligibility.

## DEBUG-only UI test controls

`PrivateStateStore.seedCorruptStateForUITesting()` exists inside `#if DEBUG`.

`FORGEApp.swift` handles these launch controls inside `#if DEBUG`:

- `-FORGEUITestingReset`
- `-FORGEUITestingCorruptPrivateState`
- `-FORGEUITestingClockStart <unix-time>`

The reset control clears private state, shared state, and local notifications.

The corrupt-state control writes invalid private state through the DEBUG helper.

The clock control injects a monotonic test clock into `AppComposition`.

The app-test source expects these controls and their DEBUG boundary.

Do not add test launch controls to a Release path.

Do not record a DEBUG test-control result until a fixed candidate runs the
relevant tests.

## XcodeGen workflow

`ios/project.yml` is the project definition.

Run XcodeGen only after an intended source-membership or `project.yml` change.

```sh
cd ios
xcodegen generate
```

Review the generated `FORGE.xcodeproj` and shared-scheme diff before you keep
it.

Do not treat project generation as a build, test, signing, or release result.

Use `ios/Scripts/verify.sh --static` for file, property-list, JSON, shell, and
whitespace checks.

Static verification does not compile source.

Use this command for a candidate build without the source-only asset fallback.

```sh
FORGE_REQUIRE_ASSET_BUILD=1 ios/Scripts/verify.sh
```

Use an unused absolute result-bundle path for the configured simulator action.

```sh
FORGE_REQUIRE_SIMULATOR_TESTS=1 \
FORGE_RESULT_BUNDLE_PATH="$PWD/FORGE-simulator-tests.xcresult" \
ios/Scripts/verify.sh
```

The configured simulator command is not evidence until its result bundle is
retained for a fixed candidate.

## Verification and release separation

### Source inventory

State: `RECORDED_SOURCE_ONLY`.

Required next evidence: a fixed candidate SHA and a clean-tree record.

### Local execution

The following gates are `UNVERIFIED`.

- ForgeCore tests
- App and extension build
- App-test and UI-test compilation
- Simulator tests
- Reminder, widget, intent, route, and deletion behavior
- Physical-device behavior
- Accessibility conformance

Bind each result to the fixed candidate.

Keep the exact command, simulator runtime, result bundle, and candidate
identity.

### External release

The following gates are `BLOCKED_EXTERNAL` and unresolved.

- Privacy and support URLs
- Apple team, identifiers, and signing
- Export compliance
- Archive creation and validation
- TestFlight authority
- App Store authority

Require explicit authority and Apple records for the fixed archive.

No source inventory or local result closes these external gates.

Keep `NO_SHIP` until all required local and external gates have current
evidence.
