# FORGE iOS

This folder contains the local FORGE iOS foundation.

The checked-in Xcode project is the normal entry point. Use the `FORGE` scheme.

## Requirements

- Use Xcode 26 or later.
- Use Swift 6.2 or later for `ForgeCore`.
- Use XcodeGen 2.45.4 only when you intentionally regenerate the project.

## Open the project

Open `ios/FORGE.xcodeproj` in Xcode. Select the `FORGE` scheme.

The app targets iOS 18. The project also builds the `FORGEWidgets` extension.

## Verify the foundation

Run this command from the repository root:

```sh
ios/Scripts/verify.sh
```

The script performs these checks:

- It validates the required project files.
- It validates the property lists, entitlements, privacy manifest, and asset catalogs.
- It runs the `ForgeCore` package tests.
- It reads the checked-in project and scheme.
- It builds Debug and Release versions of the unsigned arm64 app and widget.
- It compiles the unsigned arm64 UI test source.

The script uses an isolated temporary directory. It does not boot a simulator.

The script retries source compilation without the asset catalog when no simulator runtime exists.
Static checks still validate the required icon files.
Run the full asset build before distribution.
Continuous integration requires the full asset build.

The `FORGE` scheme includes UI journeys and an accessibility audit.
Run these tests on an installed iOS simulator runtime before distribution.

Run only the static checks when storage or the Apple toolchain is unavailable:

```sh
ios/Scripts/verify.sh --static
```

The static mode does not compile code. The default mode remains the required local and CI verification.

## Regenerate the Xcode project

Regenerate the project only after an intentional `ios/project.yml` change:

```sh
cd ios
xcodegen generate
```

Review all generated project changes before you keep them.

## Current boundary

The foundation uses device-local state. It does not prove account sync, live provider access, or production notification delivery.

The foundation does not prove App Store readiness or pilot readiness. Complete device, accessibility, privacy, and release checks before shipping.
