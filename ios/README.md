# FORGE iOS: Semester Desk v2

FORGE is a private Semester Desk for university students.

The app helps a student see course facts, state available time, recover a
broken week, select one next action, study actively, and return later.

The app does not give answers for protected study. It does not save raw
practice or independent-proof text. Web and iPhone data do not sync.

## Current local baseline

| Field | Value |
| --- | --- |
| Branch | `agent/forge-ios-foundation-20260801` |
| Committed baseline | `27d807ef6a23eb54b6e758b26de0fd7a66116855` |
| Source tree | `d67792e166fe85c084987ac95a588b09492afe4e` |
| ForgeCore tests | 125 passed |
| Focused private-store tests | 30 passed |
| FORGEAppTests | 115 passed |
| Debug simulator build | passed |

This is local development evidence. It is not signing, archive, device,
TestFlight, App Store, or production evidence.

## Product behavior

- Create one private Semester Desk on this iPhone.
- Add courses and course facts. Mark facts for review when they change or conflict.
- State real capacity before recovery.
- Review each recovery change before confirmation.
- Select the next action yourself.
- Complete protected practice, independent proof, and a delayed return.
- Review answer-free progress evidence.
- Export or remove local Semester Desk data from Settings.

FORGE stores the current private Semester Desk in the app container. The
private record uses `semester-desk-private-state-v1.json`.

FORGE keeps the widget and reminder data minimal. The widget does not read the
full private Semester Desk. A system route can open an allowed app surface. It
cannot change Semester Desk data by itself.

## Run local checks

Run ForgeCore tests from the repository root:

```sh
swift test --disable-sandbox --package-path ios/Packages/ForgeCore
```

Run the local verification script from the repository root:

```sh
ios/Scripts/verify.sh
```

Run XcodeGen after an intentional source-membership change:

```sh
cd ios
xcodegen generate
```

Read [the Semester Desk v2 requirements](../docs/ios/IOS_SEMESTER_DESK_V2_REQUIREMENTS.md)
and [the test and release plan](../docs/ios/IOS_TEST_AND_RELEASE_PLAN.md)
before a release action.

## Open internal gates

- The 13-test final UI gate.
- Small-device and iPad checks.
- Release and device builds.
- An unsigned archive check.
- Final screenshots.
- A final clean-candidate test and build rerun.

## External gates

- Apple signing identity and provisioning profiles.
- A physical-device check.
- Approved privacy and support URLs.
- App Store metadata, review material, and submission authority.

Do not submit, upload, or release this app from the current local baseline.
