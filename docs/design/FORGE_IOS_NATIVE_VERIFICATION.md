# FORGE iOS Native Verification

Status: Native source passes. Simulator runtime remains unavailable.

Date: 2026-08-01.

## Source

- Project specification: `ios/FORGETerrain/project.yml`.
- Generated project: `ios/FORGETerrain/FORGETerrain.xcodeproj`.
- Minimum platform: iOS 17.
- Canonical screen identifiers: `IOS-01` through `IOS-18`.
- Structure: native `TabView` with one `NavigationStack` per tab.
- Appearances: System, Light, and Dark.
- Accessibility: Dynamic Type, system controls, labels, and 44-point actions.

## Local verification

Generate the project:

```text
xcodegen generate --spec ios/FORGETerrain/project.yml --project ios/FORGETerrain
```

Check the native source:

```text
pnpm design:ios:check
```

The check resolves the installed iOS Simulator SDK and runs a Swift type check.

## Runtime result

XcodeBuildMCP found the generated project and the `FORGETerrain` scheme.

No installed iOS Simulator runtime was available.

The runtime list contained unavailable iOS 26.5 device records.

Xcode reported:

```text
iOS 26.5 is not installed. Please download and install the platform from Xcode > Settings > Components.
```

## Remaining native gates

Install a compatible iOS Simulator runtime.

Then complete these checks:

1. Build and launch on an iPhone simulator.
2. Capture Welcome, Today, Attempt, Repair, Proof, and Settings.
3. Test Light and Dark appearances.
4. Test accessibility Dynamic Type sizes.
5. Test VoiceOver order and action labels.
6. Test Reduce Motion and Differentiate Without Color.
7. Verify focus routes hide broad tab navigation.
8. Verify each main action has a clear exit or recovery action.

This evidence does not establish App Store readiness or accessibility conformance.
