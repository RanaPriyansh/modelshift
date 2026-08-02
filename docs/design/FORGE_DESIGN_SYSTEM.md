# FORGE Design System

Status: Shared implementation contract.

Product decision: amend_to_semester_desk_v2.

System name: FORGE Terrain.

Visual direction: Vivid Learning Landscapes.

Primary rule: Vivid at thresholds. Quiet during work.

Trust line: Learner acts. AI assists. Evidence decides.

## 1. Purpose and limits

This document defines the shared visual and interaction language for FORGE web
and native iOS surfaces.

This document supports the Semester Desk V2 product direction.

It does not establish a course, learner, institution, source, or production
claim.

Use the approved target design work as a direction source.

Do not describe a target atlas, a Figma board, or a local fixture as current
runtime proof.

Use the current product behavior before visual preference when the two conflict.

## 2. Brand

FORGE helps a learner turn a real question into careful work and bounded proof.

The product must feel capable, calm, curious, and inspectable.

The product must feel like a place at an entry or a return.

The product must feel like a clear workbench during active work.

### 2.1 Brand DNA

Use this sequence to judge a surface:

1. World first.
2. Interface second.
3. One landmark.
4. One action.
5. Cool field.
6. Warm signal.
7. Tactile image.
8. Exact grid.

Use a small human-scale marker in threshold art.

Use a path, door, boat, bench, house, or person as the marker.

Do not put a person, a landscape, or texture behind dense work.

### 2.2 Surface modes

| Mode | Job | Visual intensity | Use |
| --- | --- | --- | --- |
| Horizon | Start a goal or a major transition | High | Public entry, path entry, return |
| Threshold | Ask for a deliberate learner commitment | Medium-high | Onboarding, accept, submit, major completion |
| Field | Support one active operation | Low | Today, attempt, repair, proof, active course work |
| Ledger | Show a bounded source, condition, or result | Low | Sources, evidence, limits, course details |
| System Native | Use an operating-system pattern | Low | iOS navigation, settings, alerts, sheets |

Semester Desk V2 uses Field and Ledger.

Semester Desk V2 does not use a scenic work background.

Use scenery as a compact entry strip only when it marks a real transition.

## 3. Voice and product language

Write directly to the learner.

State what FORGE knows.

State what FORGE does not know.

State what the learner can do next.

Use a specific verb for every primary action.

Use Start attempt, Inspect sources, Save and exit, and Submit proof.

Do not use Continue when a more exact verb is available.

Preserve learner words in learner-owned text.

Describe AI output as a proposal or a disclosed contribution.

Describe a result with its conditions and limits.

Do not infer mastery, readiness, safety, or institutional truth from one result.

### 3.1 Required human terms

Use the following phrases for learner-facing status language.

| Phrase | Use | Required meaning |
| --- | --- | --- |
| Checked | A copied item matches the stated checked source | It does not prove university truth or source completeness |
| Needs review | A conflict, gap, expired check, blocked operation, or unclear source exists | State the item that needs review |
| Your choice | More than one safe learner option remains | FORGE has not selected the option |
| Changed since last check | A reviewed item no longer matches the last checked version | State what changed when known |
| Not yet confirmed | The system lacks a required confirmation | Do not make the item look ready |
| Ready to work on | One exact next operation can start within its stated boundary | Do not apply it to a whole term or learner |
| Come back on this date | A deliberate return is due | Show the local date and the reason |

Pair each phrase with a short reason.

Pair each phrase with one available action when an action exists.

Use a date in the learner locale.

Do not show a status phrase as a decorative pill.

### 3.2 Learner-facing terms to avoid

Do not show these implementation names to a learner:

- ready_for_inspection
- source_review_required
- learner_choice_required
- world_review_required
- projection
- fixture
- digest
- authority ceiling
- client boundary

Use the implementation names only in code, tests, and developer diagnostics.

Do not expose internal evidence jargon in a learner work surface.

### 3.3 Sentence patterns

Use these patterns:

- Checked on 14 September. This copied deadline matches the source shown here.
- Needs review. Two copied sources give different dates.
- Your choice. The available time fits the shorter estimate only.
- Changed since last check. The reviewed activity version is different.
- Not yet confirmed. FORGE cannot use this copied fact for planning.
- Ready to work on. Start the source comparison.
- Come back on 14 September. This return uses a new case.

Do not use confidence scores, urgency labels, reward language, or praise as
status text.

## 4. Typography

Typography establishes the work mode before color or decoration.

Use Geist for web display, interface, body, and controls.

Use Geist Mono only for bounded identifiers and compact labels.

Use Libre Baskerville only for a short learner question or reflection.

Use SF Pro through native iOS text styles.

Use SF Mono only for short native identifiers.

Do not install a custom iOS font for this system.

### 4.1 Web type roles

| Role | Family | Typical use | Rules |
| --- | --- | --- | --- |
| Terrain display | Geist | Horizon and Threshold title | Use only at a meaningful entry or transition |
| Page title | Geist | Field and Ledger page title | Keep the title compact and task-led |
| Section title | Geist | One content group | Use clear hierarchy, not larger empty space |
| Item title | Geist | Course, source, action, or result | Keep it readable at 320 CSS pixels |
| Body | Geist | Instruction and explanation | Use at least 16 CSS pixels on controls and forms |
| Supporting text | Geist | Conditions, dates, and limits | Never carry the only status meaning |
| Compact label | Geist Mono | Stable identifier or category | Do not use as the main reading text |
| Reflection | Libre Baskerville | Learner question or short reflection | Do not use for navigation, forms, or dense work |

Keep learning text near 55 to 75 characters per line when the layout permits.

Do not use tiny labels to make a ledger look dense.

Do not use a display size to create an empty hero inside a work surface.

### 4.2 Native iOS type roles

| FORGE role | SwiftUI role | Use |
| --- | --- | --- |
| Screen title | .largeTitle | Screen entry and major collection |
| Section title | .title2 or .title3 | Group heading |
| Item title | .headline | Course, source, or action title |
| Learning text | .body | Task, instruction, and result |
| Supporting text | .subheadline | Condition, date, and source context |
| Control label | .callout | Button, choice, and setting |
| Identifier | .caption.monospaced() | Short bounded identifier |

Use system text styles and Dynamic Type.

Do not use a fixed text height for a learner task or recovery message.

Change a horizontal group to a vertical group at accessibility sizes.

## 5. Color roles

Use color as environment, direction, and semantic meaning.

Do not use color as the only state signal.

Use text and shape with every color state.

### 5.1 Brand color rules

| Visual role | Meaning | Use |
| --- | --- | --- |
| Warm ivory | Relief and legibility | Light canvas and calm work surface |
| Midnight blue | Quiet depth | Dark focus and evidence surface |
| Cobalt blue | Environment and disclosed AI contribution | Threshold art and AI scope |
| Forest green | Ground and checked evidence | Reviewed source or tested result |
| Signal orange | Learner commitment | One dominant action or deliberate commit |

Use cobalt, forest, orange, ivory, and midnight in a threshold scene.

Keep threshold texture inside the image asset.

Keep Field and Ledger controls clean and mostly flat.

Use orange only for a learner commitment.

Use blue only for a disclosed AI contribution or keyboard focus.

Use green only for checked evidence, reviewed sources, or tested consequences.

Do not use green to mean permanent mastery.

Do not use red to punish an error.

### 5.2 Semantic token reference

Components must consume semantic roles.

Components must not contain copied color literals.

| Semantic role | Light | Dark | Web CSS token | SwiftUI semantic role |
| --- | --- | --- | --- | --- |
| Main canvas | #F4F7F1 | #071722 | --forge-bg | ForgeTerrainColor.background |
| Deep canvas | #EEF3ED | #06131D | --forge-bg-deep | ForgeTerrainColor.backgroundDeep |
| Work surface | #FBFDF8 | #0D202B | --forge-surface | ForgeTerrainColor.surface |
| Strong surface | #E4EBE4 | #142A35 | --forge-surface-strong | ForgeTerrainColor.surfaceStrong |
| Boundary | #CDD9D0 | #29414B | --forge-line | ForgeTerrainColor.border |
| Strong boundary | #98AA9E | #44606A | --forge-line-strong | ForgeTerrainColor.borderStrong |
| Main text | #102019 | #F3F7F0 | --forge-ink | ForgeTerrainColor.text |
| Supporting text | #56645D | #A8B9B1 | --forge-muted | ForgeTerrainColor.textMuted |
| Secondary text | #66746C | #82958B | --forge-dim | ForgeTerrainColor.textDim |
| Learner commitment | #F0643B | #FF8059 | --forge-amber | ForgeTerrainColor.learnerAction |
| Strong learner state | #A93C20 | #FF9B7B | --forge-amber-deep | ForgeTerrainColor.learnerActionStrong |
| On learner commitment | Contrast-checked dark foreground | Contrast-checked dark foreground | --forge-on-learner-action | ForgeTerrainColor.onLearnerAction |
| AI contribution | #2F66D8 | #85AAFF | --forge-violet | ForgeTerrainColor.aiContribution |
| Strong AI contribution | #174EAE | #6F96EE | --forge-violet-deep | ForgeTerrainColor.aiContributionStrong |
| Checked evidence | #247A53 | #79C995 | --forge-cyan | ForgeTerrainColor.testedEvidence |
| Strong checked evidence | #185F43 | #67BD84 | --forge-cyan-deep | ForgeTerrainColor.testedEvidenceStrong |
| Keyboard focus | #145BD7 | #8FB0FF | --forge-focus | ForgeTerrainColor.focus |

The reference values support web and native parity.

Do not require equal rendered pixels between browser CSS and iOS Color assets.

Match semantic meaning, hierarchy, contrast, and state visibility.

Add the on-learner-action alias before a primary action is implemented.

The alias must pass contrast in Light and Dark appearances.

## 6. Space, shape, borders, and elevation

Use the 4-point base scale.

| Token | Value | Use |
| --- | --- | --- |
| --forge-space-1 | 4 px | Tight icon or text relationship |
| --forge-space-2 | 8 px | Compact row gap |
| --forge-space-3 | 12 px | Control interior gap |
| --forge-space-4 | 16 px | Mobile gutter and compact group |
| --forge-space-5 | 24 px | Section group |
| --forge-space-6 | 32 px | Work-surface section |
| --forge-space-7 | 48 px | Major Field separation |
| --forge-space-8 | 64 px | Horizon or Threshold separation |

Use 24 to 32 CSS pixel desktop gutters.

Use 16 to 20 CSS pixel mobile gutters.

Keep the main web canvas at 1280 CSS pixels or less.

Test every canonical web surface at 320 CSS pixels.

Use 16 point iOS compact margins.

Use 20 to 24 points between iOS sections.

### 6.1 Radius

| Token | Value | Use |
| --- | --- | --- |
| --forge-radius-sm | 6 px or pt | Inputs, compact rows, and small controls |
| --forge-radius-md | 12 px or pt | Panels, sheets, and large controls |

Use a circle only for an icon button, a real status mark, or an image crop.

Do not use large decorative pills.

Do not turn every status into a pill.

### 6.2 Borders

Use a one-pixel semantic boundary before elevation.

Use --forge-line for a quiet group boundary.

Use --forge-line-strong for a selected or important boundary.

Use a 3-pixel --forge-focus outline with a 3-pixel offset for web focus.

Keep a border only when it explains a boundary, a choice, or a state.

Do not use border grids as decoration.

### 6.3 Elevation

Field and Ledger are flat by default.

Use spacing and a boundary before a raised container.

Use a restrained elevation only for a menu, modal, sheet, or temporary action.

Tint a shadow to the active canvas.

Do not use black drop shadows on an ivory surface.

Do not use shadows to separate every course or every source.

## 7. Icons and controls

Use text first when the action can be expressed clearly in words.

Use an icon only when it shortens a familiar action or reinforces a visible
label.

Use one established icon family in the web application.

Do not mix icon families in one product surface.

Use SF Symbols for native iOS actions.

Do not use emoji, mascots, decorative robots, or custom novelty icons.

Do not use an icon as the only meaning for a destructive, course, source, or
status action.

Every icon-only control needs an accessible name and a 44 by 44 minimum target.

Use native radio, checkbox, button, input, select, and text-area controls when
they fit the operation.

Do not recreate native iOS controls as web-style compounds.

## 8. Motion and feedback

Motion must explain causality, a state change, or assistance withdrawal.

Do not use motion to create urgency or reward.

| Motion role | Duration | Use |
| --- | --- | --- |
| Control response | 180 to 240 ms | Press, selection, or small state change |
| Surface change | 240 to 360 ms | Detail reveal, sheet, or panel transition |
| Scene change | 450 to 700 ms | Threshold art or major route transition |

Keep custom movement below 24 CSS pixels or points.

Animate transform and opacity only when possible.

Make a custom transition interruptible.

Use the same motion path for entry and exit.

Remove decorative motion when Reduce Motion is active.

Replace spatial motion with an immediate state change or short cross-fade.

Do not use confetti, reward bursts, animated grain, continuous parallax,
marquees, forced pacing, or progress celebrations.

Use an iOS haptic only after a successful learner commitment.

Do not use a haptic for navigation, hints, ordinary selection, or a score.

## 9. Accessibility

Design a state so its meaning remains after color, motion, image, or hover
effects are removed.

### 9.1 Shared requirements

- Keep every primary target at least 44 by 44 CSS pixels or points.
- Keep form text at least 16 CSS pixels on the web.
- Keep logical DOM and VoiceOver reading order.
- Show one clear keyboard focus outline.
- Preserve entered learner work after an error.
- Use a polite live region for a changed status.
- Do not place status meaning in an aria-hidden decoration.
- Test Light, Dark, System, Reduced Motion, and forced colors.
- Test keyboard-only operation and 320 CSS pixel reflow.
- Do not rely on hover for a required action.
- Do not use color, a status point, or an icon as the only status signal.

### 9.2 Web requirements

Use semantic HTML before custom ARIA.

Use native radio behavior for mutually exclusive course or scenario choices.

Keep focus with the selected option after a state change.

Return focus to the originating choice after a detail area closes.

Reveal a focused control only when it is outside the viewport.

Do not force scrolling when the focused control is already visible.

At 320 CSS pixels, stack actions and preserve each source label beside its
value.

Wrap or disclose long identifiers.

Do not allow long identifiers to cause horizontal overflow.

### 9.3 Native iOS requirements

Use system text styles and Dynamic Type.

Use native navigation, tab bar, toolbar, sheet, alert, search, and menu
patterns.

Read accessibilityReduceMotion and accessibilityReduceTransparency.

Use opaque work surfaces when Reduce Transparency is active.

Honor Differentiate Without Color.

Use VoiceOver order: title, state, task, context, input, main action,
alternative action, save or source state.

Move VoiceOver focus to an error after a failed submission.

Move VoiceOver focus to the next task title after a successful transition.

Support Voice Control names that match visible labels.

Support Switch Control with a logical traversal order.

Support right-to-left layout mirroring unless an evidence diagram has fixed
directional meaning.

## 10. Shared states

Every state needs a stable title, a short reason, the safe boundary, and one
valid next action when one exists.

| State | Visible treatment | Safe action |
| --- | --- | --- |
| Loading | Keep the title and layout stable. Use a shape-matched skeleton. | No action until the state resolves |
| Empty | Explain why nothing is present. Do not invent learner work. | Start one valid next step |
| Checked | State the source or condition that was checked. | Inspect the checked item |
| Needs review | State the conflict, gap, or blocking item. | Review, correct, or ask a person |
| Your choice | State the options and the trade-off. | Choose or keep the current plan |
| Changed since last check | State the changed item and prior check date. | Inspect the change |
| Not yet confirmed | State the missing confirmation. | Confirm, review, or return |
| Offline | Keep local work available. | Retry or continue locally |
| Partial | Name the missing content. | Continue within the stated boundary |
| Unavailable | Explain the unavailable capability. | Return to a valid surface |
| Permission denied | State the needed permission. | Open Settings or continue without it |
| Error | Preserve entered work. State what failed. | Retry without losing work |
| Retrying | Keep the local draft visible. | Cancel retry |
| Safe fallback | Remove unsupported media or effects. | Continue with text or native controls |
| Recovery | State what remains safe and what must be checked. | Restore, retry, or take the stated return path |

Do not use a spinner as the only loading state.

Do not use a celebration as a completion state.

Do not remove a learner draft after an error, retry, or failed sync.

## 11. Course status language

Keep the term boundary separate from each course boundary.

Keep Today, Recovery, and course status separate.

Do not flatten separate axes into a risk, readiness, workload, urgency,
priority, progress, or score value.

The following code names are for implementation only.

| Implementation status | Learner-facing status | Required explanation |
| --- | --- | --- |
| ready_for_inspection | Checked | This view is available to inspect. It does not mean the term is ready. |
| source_review_required | Needs review | A copied source, date, or condition needs review before FORGE uses it. |
| recovery_required | Needs review | The available time does not fit the protected work boundary. |
| learner_choice_required | Your choice | The lower estimate fits. The learner decides whether the time is workable. |
| protected_study_ready | Ready to work on | Name the exact protected study that can start. |
| world_review_required | Changed since last check | The reviewed learning activity no longer matches the accepted version. |
| path_complete | This action is complete | Do not say the course or learner is complete. |
| path_blocked | Needs review | State why the accepted action cannot continue. |
| draft_ready | Ready to work on | Name the available draft. Do not claim a feasible term. |
| human_help_required | Needs review | Prepare a clear question for a responsible person. Do not send it automatically. |

Show Checked only when a stated comparison occurred.

Show Ready to work on only when one exact bounded operation can start.

Do not use Ready to work on for a whole degree, term, learner, or schedule.

Show course order as order, not as priority.

Show the learner selection as inspection, not recommendation.

## 12. Confidence and freshness language

Do not show a confidence percentage for a learner, course, source, or claim.

Do not use a confidence score to rank, route, or reassure the learner.

Show the conditions that affect confidence instead.

### 12.1 Confidence statements

| Condition | Learner-facing language |
| --- | --- |
| One source copy matches | Checked. This copied item matches the source shown here. |
| Several checked copies agree | Checked against the listed copies. |
| Copies conflict | Needs review. The listed copies do not agree. |
| Coverage is incomplete | Not yet confirmed. Some course information is missing. |
| A policy or source has no stated basis | Not yet confirmed. FORGE cannot use this for planning. |
| AI supplied wording or comparison | AI helped with this comparison. Review the source before you rely on it. |

Do not turn a checked copied fact into institutional truth.

Do not turn a fluent AI answer into a confirmed source.

### 12.2 Freshness statements

| Condition | Learner-facing language | Required context |
| --- | --- | --- |
| Within the stated review window | Checked on [date] | Source name and local date |
| Review date is due | Come back on this date | Local date and reason |
| Item changed after a check | Changed since last check | Changed item and prior check date |
| Date is unknown | Not yet confirmed | Missing date or source condition |
| Item is too old for its stated window | Needs review | Last checked date and next safe action |

Never say current when the freshness window is unknown.

Never hide a stale, partial, duplicate, or conflicting copied fact.

## 13. Web behavior

### 13.1 Surface behavior

Use a compact threshold strip for entry when an application surface needs one.

Move the learner into a quiet Field surface after the threshold.

Show one dominant action in one viewport.

Keep alternate actions visible but secondary.

Use a flat ruled hierarchy for Semester Desk V2.

Show all current courses shallow.

Allow the learner to inspect one course deeply.

Do not create a course dashboard, planner, recommendation list, or global
task list.

Do not create a progress ring, heat map, score, rank, or productivity chart.

### 13.2 Responsive behavior

Use one reading column below 760 CSS pixels.

Put context after the dominant conflict or course detail on small screens.

Stack action controls below 760 CSS pixels.

Keep selection controls at least 44 CSS pixels high.

Repeat source labels when a comparison changes from columns to rows.

Keep a term and its selected course visually separate at every width.

Use progressive disclosure for long sequences and secondary conditions.

Do not use a wide persistent navigation bar on a compact work screen.

### 13.3 Web token use

Use the semantic CSS properties inside a FORGE shell.

~~~css
.forge-semester-desk {
  background: var(--forge-bg);
  color: var(--forge-ink);
}

.forge-course-row {
  border-block-end: 1px solid var(--forge-line);
  background: transparent;
}

.forge-course-row[data-state="checked"] {
  color: var(--forge-cyan-deep);
}

.forge-course-row[data-state="needs-review"] {
  border-inline-start: 3px solid var(--forge-line-strong);
}

.forge-course-row[data-state="your-choice"] {
  border-inline-start: 3px solid var(--forge-amber-deep);
}

.forge-course-row[data-state="changed"] {
  border-inline-start: 3px solid var(--forge-line-strong);
}

.forge-primary-action {
  background: var(--forge-amber);
  color: var(--forge-on-learner-action);
}

.forge-control:focus-visible {
  outline: 3px solid var(--forge-focus);
  outline-offset: 3px;
}
~~~

Use a text label with each state style.

Use a noncolor border or icon difference with each state style.

Do not hard-code the sample colors in individual components.

## 14. Native iOS behavior

Use native iOS structure before a FORGE compound.

Use a NavigationStack for hierarchical movement.

Use a tab bar for primary destinations only.

Use a sheet for bounded supporting work.

Use an alert for a destructive or irreversible action.

Use a toolbar for compact screen actions.

Use a native List or Form when the content is a system setting or collection.

Use a quiet custom Field only when the learner needs one focused operation.

Use Terrain art only for onboarding, Today thresholds, return, and a major
completion.

Keep attempt, repair, proof, source, and evidence screens mostly typographic.

Do not copy web panels into native iOS.

### 14.1 Native semantic roles

| FORGE role | SwiftUI semantic role | Native treatment |
| --- | --- | --- |
| Canvas | ForgeTerrainColor.background | Page background or safe area fill |
| Work surface | ForgeTerrainColor.surface | Custom bounded work group |
| Boundary | ForgeTerrainColor.border | Divider or group boundary |
| Learner commitment | ForgeTerrainColor.learnerAction | Primary commit action only |
| On learner commitment | ForgeTerrainColor.onLearnerAction | Contrast-safe primary-action text |
| AI contribution | ForgeTerrainColor.aiContribution | Visible AI scope disclosure |
| Checked evidence | ForgeTerrainColor.testedEvidence | Checked source or tested result |
| Keyboard and assistive focus | ForgeTerrainColor.focus | Focused custom control only |

Use semantic Color assets, not direct RGB values in view code.

Use system colors for standard navigation chrome when they provide the correct
native behavior.

### 14.2 SwiftUI role mapping

~~~swift
enum ForgeStatusRole {
    case checked
    case needsReview
    case learnerChoice
    case changed
    case unconfirmed
    case readyToWorkOn
    case returnDate
}

extension ForgeStatusRole {
    var color: Color {
        switch self {
        case .checked:
            return ForgeTerrainColor.testedEvidence
        case .needsReview, .changed:
            return ForgeTerrainColor.text
        case .learnerChoice, .readyToWorkOn:
            return ForgeTerrainColor.learnerAction
        case .unconfirmed, .returnDate:
            return ForgeTerrainColor.textMuted
        }
    }
}
~~~

Pair each color with visible text and a shape or system symbol.

Keep the visible phrase separate from the code enum name.

Do not map a status color to an achievement state.

## 15. Prohibited patterns

Do not use generic AI gradients.

Do not use glass everywhere.

Do not use a chat-first layout.

Do not use huge empty heroes inside active work.

Do not use card soup.

Do not use tiny labels.

Do not use excessive pills.

Do not use dashboards for Semester Desk V2.

Do not use mascots.

Do not use internal evidence jargon in learner-facing text.

Do not use generic student stock photography.

Do not use literal robot imagery.

Do not use points, badges, streaks, leaderboards, ranks, or mastery
percentages.

Do not use infinite feeds, notification pressure, fake urgency, or variable
rewards.

Do not use scenic art behind a dense work surface.

Do not use decorative charts, progress rings, or colored dots that have no
semantic state.

## 16. Review checklist

Check these items before a surface enters design review:

- The surface uses the correct Horizon, Threshold, Field, Ledger, or System
  Native mode.
- The learner can identify one dominant action.
- The learner can identify what FORGE checked and what remains unknown.
- The learner can identify an AI contribution when one exists.
- The learner can identify the next safe recovery action.
- The design does not turn course order into priority.
- The design uses human status phrases.
- The design does not expose internal evidence jargon.
- The design remains understandable without color and motion.
- The web surface works at 320 CSS pixels.
- The iOS surface supports Dynamic Type and VoiceOver.
- The design preserves entered learner work after error or retry.
- The design does not use a prohibited pattern.
