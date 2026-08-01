# FORGE iOS Native Handoff

Status: `DESIGN_HANDOFF`

Date: 2026-08-01

Implementation status: `NATIVE_REFERENCE_SOURCE_READY`

This document defines the native iOS product contract for FORGE Terrain.

A SwiftUI reference target exists at `ios/FORGETerrain/FORGETerrain.xcodeproj`.

The 18 canonical screen identifiers exist in native source.

The source passes an iOS 17 Simulator SDK type check.

A compatible iOS Simulator runtime is not installed on this machine.

It does not establish App Store readiness, accessibility conformance, or learner efficacy.

## 1. Product direction

Use this direction:

> Vivid at thresholds. Quiet during work. Precise when evidence appears.

Use this product rule:

> Learner acts. AI assists. Evidence decides.

Use this learning loop:

```text
Recall -> Attempt -> Repair -> Prove -> Return
```

The iOS application supports short entry sessions and focused learning sessions.

The interface gives the learner a clear next action and a clear stopping point.

The interface does not use points, badges, streak pressure, ranks, variable rewards, or infinite feeds.

## 2. Native structure

Build the first native application with SwiftUI.

Use one `TabView` with these four top-level sections:

1. `Today`
2. `Paths`
3. `Projects`
4. `Evidence`

Use one independent `NavigationStack` in each tab.

Preserve each tab navigation path when the learner changes tabs.

Open `Library` and `Settings and data` from an account control in the navigation bar.

Use the tab bar only for navigation.

Use a toolbar for actions that affect the current screen.

Keep the tab bar visible on normal collection and detail screens.

Hide the tab bar during Attempt, Repair, Proof, and Protected Return operations.

Each focus screen keeps these controls:

- Exit.
- Local save status.
- Source access.
- Assistance status.
- Accessibility support.
- Error recovery.

Use a native sheet for bounded supporting work.

Examples include goal clarification, source receipts, and assistance choices.

Use an alert only for an unexpected and irreversible loss.

Do not use an alert for normal navigation or expected deletion.

## 3. Proposed application modules

Use these implementation boundaries for the native target:

```text
FORGEApp
├── AppShell
│   ├── ForgeTab
│   ├── AppRouter
│   └── DeepLink
├── Features
│   ├── Entry
│   ├── Today
│   ├── Paths
│   ├── Focus
│   ├── Evidence
│   ├── Projects
│   ├── Library
│   └── Settings
├── DesignSystem
│   ├── ForgeTerrainColor
│   ├── ForgeSpacing
│   ├── ForgeMotion
│   └── Components
├── LearningContract
│   ├── LearningOperation
│   ├── AssistanceBoundary
│   ├── EvidenceBoundary
│   └── ReturnWindow
└── Persistence
    ├── DraftStore
    ├── SyncQueue
    └── RecoveryReceipt
```

Do not put route logic in reusable visual components.

Do not put evidence authority in color or presentation code.

## 4. Route model

Use typed route values.

Do not use raw path strings inside feature views.

```swift
enum ForgeTab: Hashable {
    case today
    case paths
    case projects
    case evidence
}

enum ForgeRoute: Hashable {
    case account
    case library
    case settings
    case path(id: PathID)
    case actionBrief(id: ActionID)
    case attempt(id: OperationID)
    case repair(id: OperationID)
    case proof(id: OperationID)
    case evidence(id: EvidenceID)
    case returnQueue
    case protectedReturn(id: OperationID)
    case project(id: ProjectID)
}
```

Keep the focus operation state separate from the navigation path.

Restore a saved focus operation only after a successful draft integrity check.

## 5. Screen contracts

### 5.1 Entry

| ID | Screen | Required content | Main action | Exit or recovery |
| --- | --- | --- | --- | --- |
| `IOS-01` | Welcome | Product purpose, one goal field, local draft notice | Clarify this goal | Continue a local draft |
| `IOS-02` | Clarify goal | One useful question and one editable answer | Continue | Return to goal |
| `IOS-03` | Path preview | Proposed outcome, assumptions, sources, first action | Accept path | Revise, reject, or save |

The entry flow creates a local draft before account creation.

It does not create a canonical learner record.

It does not send raw learner text as hidden telemetry.

### 5.2 Today and paths

| ID | Screen | Required content | Main action | Exit or recovery |
| --- | --- | --- | --- | --- |
| `IOS-04` | Today | One next action, one due return, useful alternatives | Open action brief | Open return or another path |
| `IOS-05` | Path collection | Active, saved, and completed paths | Open a path | Search or open account |
| `IOS-06` | Path detail | Outcome, current milestone, next valid action, source state | Start next action | Save or inspect a source |
| `IOS-07` | Action brief | Operation, time estimate, assistance boundary, evidence status | Start attempt | Save for later |

Today does not rank activities.

Today does not add work to extend a session.

### 5.3 Focus operations

| ID | Screen | Required content | Main action | Exit or recovery |
| --- | --- | --- | --- | --- |
| `IOS-08` | Attempt | Operation, reviewed source, learner response, save state | Commit attempt | Save and exit |
| `IOS-09` | Repair | Specific gap, smallest useful scaffold, AI disclosure | Revise answer | Return to source |
| `IOS-10` | Proof | Fresh case, protected boundary, learner response | Submit proof | Save and exit |
| `IOS-14` | Protected return | Return window, fresh case, result limit, support state | Submit return | Not now |

Focus operations remove broad navigation.

Focus operations keep a visible exit.

Instructional help is not available during Proof or Protected Return.

Access support remains available during every operation.

### 5.4 Evidence, projects, and account routes

| ID | Screen | Required content | Main action | Exit or recovery |
| --- | --- | --- | --- | --- |
| `IOS-11` | Evidence collection | Bounded records, state, date, source receipt | Open record | Filter or search |
| `IOS-12` | Evidence detail | Claim, scope, provenance, limitations, supersession | Inspect source | Return to collection |
| `IOS-13` | Return queue | Due date, availability, expected effort | Open due return | Remind me later |
| `IOS-15` | Project collection | Current stage, next action, saved work | Open project | Search or filter |
| `IOS-16` | Project workspace | Brief, current stage, artifacts, review boundary | Continue stage | Save and exit |
| `IOS-17` | Library | Reviewed sources, topics, provenance state | Open source | Search or filter |
| `IOS-18` | Settings and data | Theme, access, haptics, local data, consent | Save change | Export or delete data |

Evidence detail shows what a record does not establish.

Settings gives a reversible control for haptics.

Data deletion uses a confirmation only when recovery is not possible.

## 6. Main flows

### 6.1 First use

```text
IOS-01 Welcome
  -> IOS-02 Clarify goal
  -> IOS-03 Path preview
  -> IOS-04 Today
```

Allow the learner to revise or reject the path preview.

Do not force account creation before the local preview.

### 6.2 Learning operation

```text
IOS-04 Today
  -> IOS-07 Action brief
  -> IOS-08 Attempt
  -> IOS-09 Repair, when required
  -> IOS-10 Proof
  -> IOS-12 Evidence detail, when a bounded record exists
```

The operation can return from Repair to Attempt.

The learner can save and exit before a final submission.

### 6.3 Delayed return

```text
IOS-13 Return queue
  -> IOS-14 Protected return
  -> IOS-12 Evidence detail
```

Do not show prior answers or instructional content during the protected return.

Show the result as one bounded retention observation.

### 6.4 Project work

```text
IOS-15 Project collection
  -> IOS-16 Project workspace
  -> IOS-07 Action brief
  -> Focus operation
```

Project progress is a stage state.

It is not a reward meter.

## 7. Component policy

### 7.1 Use native components

Use native Apple components for:

- `TabView`.
- `NavigationStack`.
- Navigation bars.
- Toolbars.
- `Button`.
- `TextField`.
- `TextEditor`.
- `Toggle`.
- `Searchable`.
- Sheets.
- Alerts.
- Menus.
- Progress indicators.

Do not recreate these components with custom drawing.

### 7.2 Create FORGE compound components

Create these semantic components:

| Component | Job | Minimum content |
| --- | --- | --- |
| `TerrainHeader` | Mark a threshold | Scene crop, title, short context |
| `NextActionCard` | Present one useful action | State, action, time, reason |
| `EvidenceBoundaryView` | Bound a claim | Scope, limitation, authority |
| `SourceReceiptView` | Show provenance | Source, review state, timestamp |
| `ReturnRow` | Present delayed work | Due state, effort, availability |
| `PathMilestoneRow` | Show path position | Milestone, state, next action |
| `AssistanceDisclosureView` | Show AI scope | Contribution, exclusion, control |
| `DraftStatusView` | Show local persistence | Saved, saving, recovery state |

Each compound component uses text and shape with semantic color.

Each compound component supports Light and Dark appearances.

## 8. Visual system

Use `docs/design/tokens/forge-terrain.ios.json` as the color handoff.

Use system background colors for structural chrome when possible.

Use FORGE semantic colors for product authority.

| Meaning | Light | Dark | Swift identifier |
| --- | --- | --- | --- |
| Main canvas | `#F4F7F1` | `#071722` | `ForgeTerrainColor.background` |
| Work surface | `#FBFDF8` | `#0D202B` | `ForgeTerrainColor.surface` |
| Main text | `#102019` | `#F3F7F0` | `ForgeTerrainColor.text` |
| Learner commitment | `#F0643B` | `#FF8059` | `ForgeTerrainColor.learnerAction` |
| AI contribution | `#2F66D8` | `#85AAFF` | `ForgeTerrainColor.aiContribution` |
| Tested evidence | `#247A53` | `#79C995` | `ForgeTerrainColor.testedEvidence` |

Do not use green to mean permanent mastery.

Do not use red to punish an error.

Use surreal terrain only at thresholds and in short header crops.

Remove decorative imagery from dense work screens.

Use native safe areas.

Use 16 points for compact margins.

Use 20 to 24 points between sections.

Use 44 by 44 points as the minimum interaction target.

## 9. Typography

Use native SF Pro text styles.

Use SF Mono only for short technical identifiers.

Do not install a custom font in the first native release.

| FORGE role | SwiftUI text style |
| --- | --- |
| Screen title | `.largeTitle` |
| Section title | `.title2` or `.title3` |
| Main learning text | `.body` |
| Supporting text | `.subheadline` |
| Control label | `.callout` |
| Evidence identifier | `.caption.monospaced()` |

Do not limit Dynamic Type for core learning content.

Allow text to wrap.

Avoid fixed-height text containers.

Change horizontal groups to vertical groups at accessibility sizes.

Keep each control label complete after text enlargement.

## 10. Accessibility contract

### 10.1 Dynamic Type

Support every system content size.

Test the normal Large size and all accessibility sizes.

Prefer system text styles and `@ScaledMetric`.

Do not shrink important text to fit.

Do not truncate the operation, evidence scope, or error recovery action.

### 10.2 VoiceOver

Use this reading order on normal screens:

1. Screen title.
2. Current state.
3. Main task or question.
4. Required context.
5. Main input.
6. Main action.
7. Alternative action.
8. Save and source status.

Use native controls to obtain default labels and values.

Add a custom label only when the visible label is not sufficient.

Use `accessibilitySortPriority` only inside a grouped compound component.

Move VoiceOver focus to new error feedback after a failed submission.

Move VoiceOver focus to the next operation title after a successful transition.

Do not combine a complete learning paragraph into one action element.

### 10.3 Motion and transparency

Read `accessibilityReduceMotion`.

Replace spatial transitions with a short cross-fade when Reduce Motion is active.

Remove terrain parallax, scale overshoot, and large slides.

Keep state changes and progress labels visible.

Read `accessibilityReduceTransparency`.

Use an opaque surface when Reduce Transparency is active.

### 10.4 Color, input, and orientation

Honor Differentiate Without Color.

Add a label and shape to every authority state.

Support Voice Control names that match visible control labels.

Support Switch Control with a logical traversal order.

Support portrait and landscape unless a documented operation requires portrait.

Support right-to-left layout mirroring.

Do not mirror directional evidence diagrams when their meaning must remain fixed.

## 11. Motion and haptics

Use system navigation motion.

Use critically damped motion for custom surface changes.

Keep a custom surface change between 240 and 360 milliseconds.

Keep custom movement below 24 points.

Make each custom transition interruptible.

Use the same path for entry and exit.

### 11.1 One-haptic policy

Use one system success haptic after a learner commitment saves successfully.

Classify only these actions as learner commitments:

- Commit Attempt.
- Submit Proof.
- Submit Protected Return.

Do not play the haptic before the durable local save or accepted submission.

Do not play a haptic for navigation, hints, source opening, or ordinary selection.

Do not play a haptic for a score or reward.

Provide a Settings control that disables FORGE haptics.

Keep visual and VoiceOver completion feedback when haptics are disabled.

## 12. Local-first draft contract

Create a local draft before a network request.

Persist a draft after a meaningful mutation.

Flush pending draft data when the scene becomes inactive.

Store these fields:

```text
draftID
operationID
operationKind
learnerText
assistanceState
sourceReceiptIDs
createdAt
updatedAt
localRevision
syncState
integrityHash
```

Use protected local storage for sensitive draft content.

Do not place learner text in analytics events, logs, crash breadcrumbs, or notification content.

Do not silently convert a local draft into canonical evidence.

Require a successful server receipt before the interface shows a canonical evidence state.

Keep the local copy until the receipt and local deletion both succeed.

Show these draft states:

- Saving locally.
- Saved on this device.
- Offline.
- Sync available.
- Sync in progress.
- Sync failed.
- Recovery required.
- Submitted with receipt.

## 13. Shared state behavior

| State | Screen behavior | Required action |
| --- | --- | --- |
| Loading | Keep title and structure stable | None |
| Empty | Explain why the collection is empty | Present one valid next action |
| Offline | Keep local work available | Retry or continue locally |
| Stale | Show the last valid data time | Refresh |
| Partial | Identify missing content | Continue within the valid boundary |
| Unavailable | Explain the unavailable capability | Return |
| Permission denied | Explain the required permission | Open Settings or continue without it |
| Expired | Explain the closed window | Return to queue |
| Withdrawn | Identify withdrawn evidence | Inspect the replacement or scope |
| Superseded | Link the newer record | Open the current record |
| Malformed | Protect the learner from unsafe content | Return and report |
| Error | Preserve entered work | Retry |
| Retrying | Keep the local draft visible | Cancel retry |
| Safe fallback | Remove unsupported media or effects | Continue with text |

Color is never the only state signal.

An error never removes the learner draft.

## 14. Design identifiers

Use stable identifiers in design, code, and tests.

| Item | Identifier pattern | Example |
| --- | --- | --- |
| Screen | `ios.<screen-id>` | `ios.IOS-08` |
| Main action | `ios.<screen-id>.primary` | `ios.IOS-08.primary` |
| Alternative action | `ios.<screen-id>.secondary` | `ios.IOS-08.secondary` |
| Draft state | `draft.<state>` | `draft.saved-local` |
| Evidence state | `evidence.<state>` | `evidence.superseded` |
| Assistance state | `assist.<state>` | `assist.disclosed` |

Do not use localized visible text as the test identifier.

## 15. Simulator acceptance matrix

The native implementation is not complete until these checks pass.

### 15.1 Devices and layout

- Test the smallest supported iPhone.
- Test one current standard iPhone.
- Test one current large iPhone.
- Test portrait and landscape.
- Test Light and Dark appearances.
- Test every Dynamic Type accessibility size.
- Test a long translated string.
- Test a right-to-left locale.

### 15.2 Assistive technology

- Complete the first-use flow with VoiceOver.
- Complete Attempt with VoiceOver.
- Complete Repair with VoiceOver.
- Complete Proof with VoiceOver.
- Complete Protected Return with VoiceOver.
- Complete one flow with Switch Control.
- Complete one flow with Voice Control.
- Verify Reduce Motion.
- Verify Reduce Transparency.
- Verify Differentiate Without Color.

### 15.3 Recovery

- Start a draft without a network connection.
- Terminate the application during editing.
- Restore the exact local draft.
- Retry a failed submission without duplicate evidence.
- Restore after a device restart.
- Reject a malformed server response.
- Preserve the local draft after every failure.

### 15.4 Evidence

Record:

- Xcode version.
- Deployment target.
- Simulator device and operating system.
- Source commit.
- Test result.
- Screenshot or recording path.
- Remaining failure.

Do not report accessibility conformance from automated checks alone.

## 16. Figma and implementation parity

The Figma source must contain six representative iOS frames:

- `IOS-01` Welcome.
- `IOS-04` Today.
- `IOS-08` Attempt.
- `IOS-09` Repair.
- `IOS-10` Protected Proof.
- `IOS-14` Delayed Return.

Each frame must identify the intended native control.

The current Figma frames use FORGE compound representations and implementation notes.

The Figma evidence does not prove Apple library instances.

The SwiftUI reference uses native controls.

Each frame must include a Light or Dark appearance label.

Each frame must show the main action and exit route.

The six frames define the shared visual grammar.

The eighteen screen contracts define the complete first-wave scope.

## 17. Source references

Use these Apple references during implementation:

- [Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios)
- [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [SwiftUI accessibility modifiers](https://developer.apple.com/documentation/SwiftUI/View-Accessibility)
- [SwiftUI environment values](https://developer.apple.com/documentation/swiftui/environmentvalues)
- [Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)
- [Persistent storage](https://developer.apple.com/documentation/swiftui/persistent-storage)
