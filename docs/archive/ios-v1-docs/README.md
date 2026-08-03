# FORGE iOS Adult University V1

This folder contains the local iOS companion for adult university V1.

Use the checked-in Xcode project and the `FORGE` scheme.

## V1 scope

V1 supports one adult mechanics starter course.

V1 uses local deterministic checks for defined course and activity transitions.

V1 uses private v4 storage for course state on the device.

FORGE keeps written reasoning and values derived from written reasoning in
memory while an activity is open and during submission. FORGE does not save
them.

FORGE uses selected-choice text to check an activity. FORGE does not save
selected-choice text.

FORGE saves selected-choice check results, activity progress, help use, receipt
metadata, and delayed-return schedules locally. FORGE needs this data for
durable learning progress.

FORGE shows visible recovery when it finds `private-state-v3.json` or
`private-state-v2.json`. FORGE preserves each file until an explicit
clear-local-data action.

The App Group stores a typed v3 shared return projection. It contains only the
return lifecycle and time boundaries.

V1 supports delayed returns with package-derived `opensAt` and `dueAt` values.

The learner can enable or cancel a local reminder for an available delayed return.

The widget uses the typed shared projection and generic locked-device content.

The parameter-free App Intent can write only one pending-focus handoff token.

The handoff token is not learner state, course state, or evidence state.

The App Intent cannot modify learner state, course state, evidence state, a
receipt, or a delayed return.

The application consumes the token only after it checks eligibility.

V1 has no production AI and no network client.

V1 does not create a canonical academic record or establish academic status.

## Release record

The iOS candidate state is `NOT_SELECTED`.

The iOS release decision is `NO_SHIP`.

Read the [iOS NOT_SELECTED / NO_SHIP record](../docs/ios/IOS_TEST_AND_RELEASE_PLAN.md).

## Requirements

- Use Xcode 26.6.
- Use the `iphoneos` SDK 26 or later.
- Use Swift 6.2 or later for `ForgeCore`.
- Use XcodeGen 2.45.4 for project regeneration.

The app targets iOS 18. The project also builds the `FORGEWidgets` extension.

## Open the project

Open `ios/FORGE.xcodeproj` in Xcode. Select the `FORGE` scheme.

## Run local verification

Run this command from the repository root:

```sh
ios/Scripts/verify.sh
```

The command checks required project files, shell syntax, iOS-scope whitespace,
Apple metadata, asset catalog JSON, ForgeCore, the checked-in project, and
unsigned source targets.

The command uses an isolated temporary directory.

When no iOS Simulator runtime exists, the command can use source-only builds
without asset compilation.

Static checks still validate required icon files.

Set `FORGE_REQUIRE_ASSET_BUILD=1` to reject the source-only fallback.

The script accepts only `0` or `1` for this setting.

## Run simulator verification

Set `FORGE_REQUIRE_SIMULATOR_TESTS=1` to run app and UI tests on the
`iPhone 17 Pro` simulator with iOS 26.5:

```sh
FORGE_REQUIRE_SIMULATOR_TESTS=1 ios/Scripts/verify.sh
```

Set `FORGE_RESULT_BUNDLE_PATH` to an absolute, unused path to keep a local
simulator result bundle.

The parent directory must exist and be writable.

```sh
FORGE_REQUIRE_SIMULATOR_TESTS=1 \
FORGE_RESULT_BUNDLE_PATH="$PWD/FORGE-simulator-tests.xcresult" \
ios/Scripts/verify.sh
```

## Run the metadata gate

Set `FORGE_PRIVACY_POLICY_URL` and `FORGE_SUPPORT_URL` to approved HTTPS URLs.

The command does not approve or authorize these URLs.

Then run:

```sh
FORGE_REQUIRE_STORE_METADATA=1 ios/Scripts/verify.sh --static
```

Run static verification when storage or the Apple toolchain is unavailable:

```sh
ios/Scripts/verify.sh --static
```

Static verification does not compile code.

## Regenerate the Xcode project

Run XcodeGen after a source membership change.

Run it after an intentional `ios/project.yml` change.

```sh
cd ios
xcodegen generate
```

Review all generated project changes before you keep them.

## External gates

The following gates remain external and unresolved:

- Privacy-policy and support URLs.
- Apple signing.
- Export compliance.
- TestFlight authority.
- App Store authority.

Participant evidence remains a separate gate.

Local, simulator, metadata, and XcodeGen commands do not close these gates.
