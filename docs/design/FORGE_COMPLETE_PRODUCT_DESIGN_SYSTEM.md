# FORGE Terrain

Status: Cross-platform design system specification.

Date: 2026-08-01.

Source revision: `684f5a898fa2ece3a1e4a61c1a51f0716b535400`.

Figma source:

- File: `FORGE Product Design System - Public, Web, iOS`
- Key: `BxrzaLocs29c53U1xLyfdc`
- URL: <https://www.figma.com/design/BxrzaLocs29c53U1xLyfdc>

This document defines one design system for the public site, web application, focus mode, and iOS application.

This document does not prove learner preference, learning efficacy, accessibility conformance, child safety, or production readiness.

## 1. System decision

The system name is **FORGE Terrain**.

The visual direction is **Vivid Learning Landscapes**.

The system has four surface modes:

1. **Horizon** introduces a goal or a major transition.
2. **Field** supports active work.
3. **Ledger** shows sources, evidence, and limits.
4. **Threshold** supports a deliberate commitment.

These names organize design work.

Learner-facing copy uses direct product terms.

The permanent trust line is:

> Learner acts. AI assists. Evidence decides.

## 2. Taste model

The supplied references establish these design preferences:

- Saturated cobalt sky.
- Deep alpine and forest green.
- Signal orange.
- Warm ivory.
- Midnight blue.
- Large environmental fields.
- Small people, paths, boats, houses, doors, and benches.
- Short sans serif headlines.
- Thin navigation.
- One primary action.
- Analog grain and halftone texture.
- Strong negative space.
- Calm scenes with one point of agency.

The product must feel vivid, calm, playful, rigorous, humane, and inspectable.

The product must not feel like a generic AI product.

The product must not use a card wall, chat-first home, game economy, or infinite feed.

## 3. Product design principles

### 3.1 One meaningful action

Each learner viewport has one dominant action.

The interface states why the action is useful.

The interface also states its expected time and evidence boundary.

### 3.2 Landscape at thresholds

Use a landscape at public entry, path choice, return, and important transitions.

Do not place a complex work surface over a landscape.

Move active work onto a quiet Field surface.

### 3.3 Effort before assistance

Show a useful attempt before instructional help.

Make each assistance mode visible.

Withdraw instructional help during protected proof.

Keep accessibility support available.

### 3.4 Progress through capability

Show completed operations, repaired errors, independent proof, and delayed return.

Do not use points, badges, streaks, ranks, or universal mastery percentages.

### 3.5 Bounded evidence

Name what a result supports.

Name what remains untested.

Keep source, task, content, policy, and assistance conditions inspectable.

### 3.6 Quiet completion

Show what changed.

Show what remains open.

Give the learner permission to stop.

## 4. Cross-platform surface model

| Surface | Primary job | Visual mode | Density |
| --- | --- | --- | --- |
| Public site | Explain and start | Horizon | Low |
| Onboarding | Clarify and preview | Threshold | Low |
| Web application | Select the next action | Field | Medium |
| Focus mode | Perform one operation | Field | Focused |
| Evidence detail | Inspect a bounded claim | Ledger | Medium |
| iOS Today | Start or resume one action | Field with a small Horizon strip | Medium |
| iOS focus | Attempt, repair, prove, or return | Field | Focused |

The web and iOS products share semantics.

They do not share all components.

The iOS application uses native Apple structure and behavior.

## 5. Color system

### 5.1 Semantic colors

| Figma variable | CSS token | Light | Dark | Meaning |
| --- | --- | --- | --- | --- |
| `color/bg/default` | `--forge-bg` | `#F4F7F1` | `#071722` | Main canvas |
| `color/bg/deep` | `--forge-bg-deep` | `#EEF3ED` | `#06131D` | Deep canvas |
| `color/surface/default` | `--forge-surface` | `#FBFDF8` | `#0D202B` | Work surface |
| `color/surface/strong` | `--forge-surface-strong` | `#E4EBE4` | `#142A35` | Emphasis surface |
| `color/border/default` | `--forge-line` | `#CDD9D0` | `#29414B` | Boundary |
| `color/border/strong` | `--forge-line-strong` | `#98AA9E` | `#44606A` | Strong boundary |
| `color/text/default` | `--forge-ink` | `#102019` | `#F3F7F0` | Main text |
| `color/text/muted` | `--forge-muted` | `#56645D` | `#A8B9B1` | Supporting text |
| `color/text/dim` | `--forge-dim` | `#68766E` | `#82958B` | Secondary metadata |
| `color/action/learner` | `--forge-amber` | `#F0643B` | `#FF8059` | Learner commitment |
| `color/action/learner-strong` | `--forge-amber-deep` | `#A93C20` | `#FF9B7B` | Strong learner state |
| `color/contribution/ai` | `--forge-violet` | `#2F66D8` | `#85AAFF` | Disclosed AI contribution |
| `color/contribution/ai-strong` | `--forge-violet-deep` | `#174EAE` | `#6F96EE` | Strong AI state |
| `color/evidence/tested` | `--forge-cyan` | `#2C8A61` | `#79C995` | Tested consequence |
| `color/evidence/tested-strong` | `--forge-cyan-deep` | `#185F43` | `#67BD84` | Strong tested state |
| `color/focus` | `--forge-focus` | `#145BD7` | `#8FB0FF` | Keyboard focus |

### 5.2 Environmental colors

| Role | Candidate value |
| --- | --- |
| Vivid cobalt | `#114FCF` |
| Deep cobalt | `#082E83` |
| Alpine green | `#17643C` |
| Grass green | `#55A447` |
| Signal orange | `#F0643B` |
| Peach sand | `#F2AD80` |
| Warm ivory | `#F4F7F1` |
| Midnight | `#071722` |

Environmental colors belong inside images and large scene fields.

Do not use them as untested interface colors.

### 5.3 Authority rules

Use orange for a learner commitment.

Use blue for a disclosed AI contribution.

Use green for tested evidence or reviewed source state.

Use text and shape with every authority color.

Do not use green to mean permanent mastery.

Do not use red to punish an error.

## 6. Typography

### 6.1 Web

Use Geist for public display, interface headings, body text, and controls.

Use Geist Mono for evidence labels, source identifiers, versions, and modes.

Use Libre Baskerville only for a short learner question or reflection.

Do not use the serif family for navigation, forms, instructions, or dense work.

### 6.2 iOS

Use SF Pro through native text styles.

Use Dynamic Type.

Use SF Mono only for short technical identifiers.

Do not install a custom font in the first iOS release.

### 6.3 Text styles

| Style | Web size | iOS mapping |
| --- | --- | --- |
| `Display/Hero` | 72 to 104 px | Large Title with a controlled custom scale |
| `Display/Page` | 44 to 64 px | Large Title |
| `Heading/Section` | 28 to 40 px | Title |
| `Heading/Item` | 20 to 24 px | Title 3 |
| `Body/Large` | 18 px | Body |
| `Body/Default` | 16 px | Body |
| `Body/Small` | 14 px | Subheadline |
| `Label/Default` | 14 px | Callout |
| `Label/Mono` | 12 px | Caption |

Body text must remain at least 16 CSS pixels on forms.

Keep learning text between 55 and 75 characters per line.

## 7. Space, shape, and layout

### 7.1 Space

Use the existing 4 px base scale.

| Token | Value |
| --- | --- |
| `space/1` | 4 px |
| `space/2` | 8 px |
| `space/3` | 12 px |
| `space/4` | 16 px |
| `space/5` | 24 px |
| `space/6` | 32 px |
| `space/7` | 48 px |
| `space/8` | 64 px |

### 7.2 Shape

Use 6 px for controls and compact rows.

Use 12 px for panels and large controls.

Use a circle only for an icon button, status point, or image crop.

Do not use large decorative pills.

### 7.3 Web layout

Use 24 to 32 CSS pixel desktop gutters.

Use 16 to 20 CSS pixel mobile gutters.

Keep the main canvas between 1180 and 1280 CSS pixels.

Test all canonical surfaces at 320 CSS pixels.

### 7.4 iOS layout

Use native safe areas.

Use 16 point compact margins.

Use 20 to 24 point section spacing.

Use a 44 point minimum target.

## 8. Imagery

Use surreal pastoral scenes with editorial composition.

Use one small agency marker.

Reserve 55 to 70 percent of a hero for quiet sky or terrain.

Keep grain and halftone inside the image asset.

Use a solid text plate when a crop becomes complex.

Create these variants for each main scene:

- Desktop 16:9.
- Mobile 4:5.
- Wide application strip.
- Light theme.
- Dark theme.
- Reduced-detail fallback.
- Text-safe crop map.

Do not copy a source brand, logo, or distinctive composition.

Do not use stock photographs of students.

## 9. Motion and haptics

Motion explains causality, state change, or assistance withdrawal.

| Motion | Duration |
| --- | --- |
| Control response | 180 to 240 ms |
| Surface change | 240 to 360 ms |
| Scene change | 450 to 700 ms |

Keep interface movement below 24 CSS pixels.

Remove decorative motion when Reduce Motion is active.

Use an iOS haptic only for a meaningful commitment.

Do not use confetti, reward bursts, animated grain, continuous parallax, or forced pacing.

## 10. Component architecture

### 10.1 Shared semantic components

- Status label.
- Evidence boundary.
- Source receipt.
- Assistance disclosure.
- Next action.
- Path step.
- Return row.
- Empty state.
- Offline state.
- Error state.
- Destructive confirmation.

### 10.2 Web components

- Public header.
- Application shell.
- Focus header.
- Primary button.
- Secondary button.
- Text action.
- Icon button.
- Text input.
- Text area.
- Select control.
- Choice row.
- Theme control.
- Goal intake.
- Path preview.
- Evidence record.
- Source row.
- Project brief.

### 10.3 iOS components

Use the Apple iOS library for:

- Tab bar.
- Navigation bar.
- Toolbar.
- Button.
- Sheet.
- Alert.
- Search.
- Text field.
- Toggle.

Create FORGE compound components for:

- Terrain header.
- Next action.
- Evidence boundary.
- Source receipt.
- Return row.
- Path milestone.

Do not recreate native controls as custom web components.

## 11. Ethical motivation

The core loop is:

```text
Recall -> Attempt -> Repair -> Prove -> Return
```

Use these motivation signals:

- Immediate causal feedback.
- A short honest start.
- A visible recovery route.
- A meaningful assistance choice.
- A clear reason for the next action.
- Evidence of independent work.
- A visible stopping point.
- A prepared question for a person.
- A later return with a new case.

Do not use:

- Points.
- Badges.
- Streaks.
- Leaderboards.
- Comparative rank.
- Loot.
- Variable rewards.
- Infinite feeds.
- Fake urgency.
- Notification pressure.
- Emotional attachment.
- Universal mastery percentages.

## 12. Product language

Use explicit verbs.

Use `Start attempt`, `Inspect sources`, `Save and exit`, and `Submit proof`.

Do not use `Continue` when a more exact verb is available.

Preserve the learner's original words.

Describe AI output as a proposal or contribution.

Describe evidence with its conditions and limits.

Never state `mastered` from one response.

## 13. Theme behavior

Provide Light, Dark, and System choices.

Keep the learner choice until the learner changes it.

Do not change the theme during protected proof.

Use separate image crops for light and dark themes.

Set the native color scheme for web controls.

Use Apple semantic colors for iOS structure.

Apply the FORGE accent only where the semantic role is correct.

## 14. Figma architecture

Create these pages:

1. `00 Cover`
2. `01 Foundations`
3. `02 Web Components`
4. `03 Public Site`
5. `04 Web Application`
6. `05 Focus Mode`
7. `06 iOS Components`
8. `07 iOS Application`
9. `08 States and Accessibility`
10. `09 Archive`

Create these variable collections:

- `FORGE / Primitive`
- `FORGE / Semantic`

The Semantic collection has Light and Dark modes.

Create text styles, color styles, and minimal effect styles.

Use Apple iOS library components for native iOS controls.

Use Simple Design System components only as temporary construction aids.

Final web components must use FORGE variables and names.

## 15. Acceptance

A surface is ready for design review when:

1. One dominant action is clear.
2. The assistance mode is visible.
3. The source state is visible.
4. The untested state is visible.
5. Meaning remains without color.
6. Meaning remains without motion.
7. Keyboard operation is possible.
8. Focus is visible.
9. The surface works at 320 CSS pixels.
10. Reduce Motion preserves state.
11. Forced Colors preserves meaning.
12. Light and Dark themes remain usable.
13. Image provenance is recorded.
14. Protected proof has no instructional-help action.
15. The result makes no unsupported learning claim.

## 16. Research inputs

The design uses these research inputs:

- Retrieval practice: <https://pubmed.ncbi.nlm.nih.gov/21252317/>
- Distributed practice: <https://pubmed.ncbi.nlm.nih.gov/16719566/>
- Productive failure: <https://journals.sagepub.com/doi/10.3102/00346543211019105>
- Self-determination interventions: <https://selfdeterminationtheory.org/wp-content/uploads/2024/06/2024_WangWangEtAl_MetaEdu.pdf>
- Child-centered digital design: <https://www.unicef.org/innocenti/projects/responsible-innovation-technology-children>
- RITEC Design Toolbox: <https://www.unicef.org/childrightsandbusiness/workstreams/responsible-technology/online-gaming/ritec-design-toolbox>
- Apple Human Interface Guidelines: <https://developer.apple.com/design/human-interface-guidelines/>
- Apple Liquid Glass guidance: <https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass>

These inputs guide the design.

They do not prove that the implementation improves learning.

