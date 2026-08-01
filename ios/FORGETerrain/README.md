# FORGE Terrain native reference

This directory contains the native SwiftUI reference for the FORGE Terrain design system.

The application targets iOS 17 and later.

It provides a deterministic reference for the 18 screen identifiers and selected states in
`docs/design/FORGE_IOS_NATIVE_HANDOFF.md`.

Generate the Xcode project:

```bash
cd ios/FORGETerrain
xcodegen generate
```

The source uses native `TabView`, `NavigationStack`, Dynamic Type, system controls,
semantic accessibility labels, and system light and dark appearances.

This reference uses deterministic sample content. It does not connect to a learner account,
create canonical evidence, or send learner text.
