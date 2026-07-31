# FORGE iOS 0.1 Requirements

**Date:** 2026-08-01
**Product state:** `FOUNDATION_CANDIDATE`
**Release decision:** `NO_SHIP`
**Native implementation base:** `850df36a1f99e0f9401cba3f9688124b62f4c27f`
**Web source:** `cd84e20f6f78d68a430666c185b00efa99c49a87`

## Release purpose

Release a focused native FORGE companion to adult internal TestFlight testers.

Keep the first release device-local. Do not create accounts, canonical evidence, cloud sync, or remote notifications.

Do not include minor testers. A later minor release requires separate product, legal, privacy, and participant authority.

## Status terms

- `BUILT_LOCAL`: The current source contains the requirement.
- `TESTED_LOCAL`: Current local evidence verifies the requirement.
- `BLOCKED`: A required input or system does not exist.
- `NOT_RUN`: The required verification has not run.
- `OUT_OF_SCOPE`: The first release excludes the requirement.

## Product requirements

| ID | Requirement | Acceptance condition | Status |
| --- | --- | --- | --- |
| P-01 | Optional onboarding | A learner can close onboarding without losing application access. | `BUILT_LOCAL` |
| P-02 | Goal entry | A learner can enter one goal or select the safe sample. | `TESTED_LOCAL` |
| P-03 | Policy input | The application asks for learner mode only because the mode changes policy. | `BUILT_LOCAL` |
| P-04 | Data boundary | Onboarding states that the goal remains on the device. | `BUILT_LOCAL` |
| P-05 | Today | Today shows one next action, its reason, and its duration. | `BUILT_LOCAL` |
| P-06 | Path | Path shows a reviewed vertical milestone sequence and explicit states. | `BUILT_LOCAL` |
| P-07 | Evidence | Evidence shows limitations and does not upgrade a record. | `BUILT_LOCAL` |
| P-08 | Focus | Focus keeps pause, stop, source, safety, and access information available. | `BUILT_LOCAL` |
| P-09 | Settings | Settings exposes reminder state, privacy state, onboarding, and local deletion. | `BUILT_LOCAL` |
| P-10 | Local deletion | One confirmed action removes local learning data, reminder state, and pending routes. | `TESTED_LOCAL` |
| P-11 | Offline operation | All first-release learning surfaces work without a network connection. | `BUILT_LOCAL` |
| P-12 | Read-only fixture boundary | The first release does not create completion, proof, or evidence. | `BUILT_LOCAL` |

## System integration requirements

| ID | Requirement | Acceptance condition | Status |
| --- | --- | --- | --- |
| S-01 | Local reminder | The application can schedule one passive delayed-return reminder. | `BUILT_LOCAL` |
| S-02 | Reminder privacy | The Lock Screen message contains no learner, goal, path, or evidence data. | `TESTED_LOCAL` |
| S-03 | Reminder denial | All application functions remain available after permission denial. | `TESTED_LOCAL` |
| S-04 | Child reminder policy | A grown-up must manage reminders in child mode. | `TESTED_LOCAL` |
| S-05 | Small widget | One nonconfigurable small widget opens the focus route. | `BUILT_LOCAL` |
| S-06 | Widget privacy | The widget marks its content as privacy-sensitive. | `BUILT_LOCAL` |
| S-07 | App Intent | One parameter-free intent opens the focus route without returning learner data. | `BUILT_LOCAL` |
| S-08 | App Group | The application and widget use one shared App Group. | `BUILT_LOCAL` |
| S-09 | App Group ownership | Apple registers and assigns the approved App Group to both identifiers. | `BLOCKED` |
| S-10 | Deep links | Valid FORGE routes open the correct section or focus screen. | `TESTED_LOCAL` |

## Quality requirements

| ID | Requirement | Acceptance condition | Status |
| --- | --- | --- | --- |
| Q-01 | Minimum system | The application supports iOS 18 or later. | `BUILT_LOCAL` |
| Q-02 | Current SDK | The distribution archive uses the iOS 26 SDK or later. | `BLOCKED` |
| Q-03 | Swift safety | Swift 6 strict concurrency reports no application error. | `TESTED_LOCAL` |
| Q-04 | Core tests | All `ForgeCore` tests pass for the fixed candidate. | `TESTED_LOCAL` |
| Q-05 | Full asset build | Debug and Release builds include the application icon and all assets. | `BLOCKED` |
| Q-06 | UI journeys | UI tests pass onboarding, tabs, focus, deletion, and accessibility audit. | `NOT_RUN` |
| Q-06A | UI test compilation | Four UI journeys compile for an unsigned arm64 iOS XCTest runner. | `TESTED_LOCAL` |
| Q-07 | Small layout | Each primary screen works at 320 points without horizontal clipping. | `NOT_RUN` |
| Q-08 | Dynamic Type | Each primary journey works at 200 percent Dynamic Type. | `NOT_RUN` |
| Q-09 | Access methods | VoiceOver, Voice Control, Switch Control, and Full Keyboard Access complete each journey. | `NOT_RUN` |
| Q-10 | Appearance | Dark appearance, increased contrast, Bold Text, and Reduced Motion keep content usable. | `NOT_RUN` |
| Q-11 | Physical device | A signed build passes notification, widget, intent, termination, rotation, and low-memory checks. | `BLOCKED` |
| Q-12 | Performance | A device trace shows no release-blocking launch, hang, energy, or memory issue. | `NOT_RUN` |

## Privacy and safety requirements

| ID | Requirement | Acceptance condition | Status |
| --- | --- | --- | --- |
| D-01 | Data minimization | The application requests only notification permission. | `BUILT_LOCAL` |
| D-02 | No tracking | The application contains no analytics, advertising, or tracking SDK. | `BUILT_LOCAL` |
| D-03 | Privacy manifest | The application and widget contain valid privacy manifests. | `TESTED_LOCAL` |
| D-04 | Privacy policy | App Store metadata and the application link to one approved privacy policy. | `BLOCKED` |
| D-05 | App Privacy answers | App Store Connect answers match the fixed binary and service behavior. | `BLOCKED` |
| D-06 | Minor data | The adult internal release does not collect or transmit minor data. | `BUILT_LOCAL` |
| D-07 | Account deletion | If account creation enters scope, deletion is available inside the application. | `OUT_OF_SCOPE` |
| D-08 | Third-party AI | Any later third-party AI data transfer has clear disclosure and explicit permission. | `OUT_OF_SCOPE` |
| D-09 | No evidence mutation | Notifications, widgets, intents, and settings cannot change evidence. | `BUILT_LOCAL` |

Apple requires an accessible privacy-policy link in App Store metadata and inside the application.
Apple also requires in-application account deletion when account creation exists.

See the current [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

## Signing and distribution requirements

| ID | Requirement | Acceptance condition | Status |
| --- | --- | --- | --- |
| R-01 | Developer organization | The release owner identifies the legal Apple Developer organization. | `BLOCKED` |
| R-02 | Team identifier | The repository records the approved Apple Developer Team identifier. | `BLOCKED` |
| R-03 | Bundle identifiers | Apple registers the application and widget identifiers. | `BLOCKED` |
| R-04 | Provisioning | Distribution profiles include the application, widget, and App Group entitlements. | `BLOCKED` |
| R-05 | Candidate identity | One clean pushed commit identifies every distribution input. | `BLOCKED` |
| R-06 | Version identity | App Store Connect accepts version `0.1.0` and one unique build number. | `BLOCKED` |
| R-07 | Signed archive | Xcode creates, validates, and exports one signed Release archive. | `BLOCKED` |
| R-08 | Internal TestFlight | One fixed adult-only build reaches the approved internal group. | `BLOCKED` |
| R-09 | TestFlight receipt | The release record identifies the commit, build, tester group, environment, and known limits. | `BLOCKED` |
| R-10 | Rollback | The release owner can expire the TestFlight build and disable its service environment. | `NOT_RUN` |

Apple requires registered application identifiers in TestFlight provisioning profiles.
Apple permits up to 100 internal App Store Connect testers.

See the current [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).

Apple requires an Account Holder or Admin to register an App Group.

See [Register an App Group](https://developer.apple.com/help/account/identifiers/register-an-app-group/).

## Store requirements

| ID | Requirement | Acceptance condition | Status |
| --- | --- | --- | --- |
| M-01 | Product name | The release owner approves the store name and subtitle. | `BLOCKED` |
| M-02 | Category and rating | The release owner approves Education category, age rating, and audience. | `BLOCKED` |
| M-03 | Description | Store text states the device-local and read-only first-release boundary. | `BLOCKED` |
| M-04 | Support URL | One maintained support URL exists. | `BLOCKED` |
| M-05 | Privacy URL | One approved public privacy-policy URL exists. | `BLOCKED` |
| M-06 | Screenshots | Approved screenshots show real screens and fictional sample data. | `BLOCKED` |
| M-07 | Review access | Review notes describe the fixture boundary and require no account. | `BLOCKED` |
| M-08 | Contact | App Review has current release-owner contact information. | `BLOCKED` |
| M-09 | Export compliance | The release owner confirms the encryption answer for the fixed binary. | `BLOCKED` |
| M-10 | Rights | The release owner confirms rights for the FORGE name, icon, text, and screenshots. | `BLOCKED` |

Apple accepts one to ten screenshots for each required display class.

See [App Store screenshot guidance](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/).

## Required owner inputs

Provide these inputs before signing work:

1. Apple Developer organization name and Team identifier.
2. App Store Connect role for the release operator.
3. Approved application, widget, and App Group identifiers.
4. Approved product name, subtitle, category, audience, and age rating.
5. Public privacy-policy URL and support URL.
6. Internal adult tester group and TestFlight authority.
7. Intellectual-property owner for the icon and store content.
8. Approved distribution and rollback owners.

## First internal TestFlight definition

The first internal build is ready only when these conditions pass:

1. One clean pushed commit identifies the binary.
2. The full asset build passes without fallback.
3. All core and UI tests pass on an installed simulator runtime.
4. Manual accessibility tests pass on a physical device.
5. The signed archive passes App Store validation.
6. Privacy and store records match the fixed binary.
7. The approved adult-only internal group receives the build.
8. The release record contains the exact build and rollback evidence.

The current machine has no installed simulator runtime. The machine has approximately 15 GB of available storage.

Do not install a large runtime until the release owner confirms the storage action.
