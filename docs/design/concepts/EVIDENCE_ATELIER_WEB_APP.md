# Evidence Atelier

**Artifact type:** Alternate web application design lane  
**Status:** Design concept only  
**Date:** 2026-08-01  
**Implementation status:** Display-only local sample implemented  
**Learning status:** Not evaluated with learners

Evidence Atelier is a calm instrument for difficult learning work.

It uses a tactile atelier surface instead of a dashboard.

It makes attempts, help, proof, and evidence easy to inspect.

It rewards increased capability and clear evidence.

It does not use engagement pressure.

The local design gallery contains a coded preview at `/internal/design-lab`.

The preview changes only local component state.

It creates no learning record, evidence, storage, provider, or network effect.

## 1. Product boundary

This concept covers these web application states:

1. Today.
2. Active problem.
3. Feedback and retry.
4. Protected proof.
5. Evidence receipt.
6. Delayed return.

This concept does not change FORGE evidence rules.

It does not add a score, mastery percentage, or rank.

It does not prove preference, access, learning, retention, or efficacy.

The team must test the design with representative learners before a preference claim.

## 2. Design thesis

The interface has three visual conditions.

| Condition | Purpose | Visual form |
| --- | --- | --- |
| Threshold landscape | Orient the learner | Wide environmental field with one clear entry point |
| Instrument bench | Support active work | Precise flat surface with visible state and tools |
| Evidence archive | Record bounded results | Clear receipt with provenance and limits |

The interface becomes quieter as the learner becomes more independent.

The visual sequence is:

```text
Today
-> Attempt
-> Feedback
-> Fresh retry
-> Protected proof
-> Evidence receipt
-> Delayed return
```

Each screen has one dominant question or action.

Each screen gives the learner a clear stopping point.

## 3. Experience principles

### 3.1 Preserve learner agency

- Start with the learner's question.
- Ask for an attempt before instructional help.
- Let the learner request a smaller step.
- Let the learner pause without a penalty.
- Explain why each next action is useful.
- Keep route choices reversible.

### 3.2 Make help visible

- Show the current assistance mode near the task title.
- Record meaningful cognitive help.
- Record access support separately.
- Explain how help changes the evidence claim.
- Remove instructional help from protected proof.
- Keep required access support in protected proof.

### 3.3 Use honest motivation

- Show a specific change in the learner's work.
- Show what remains open.
- Use a fresh problem for a retry.
- Use delayed return for retention evidence.
- End the session when the learning purpose is complete.

Do not use streaks, points, badges, leaderboards, confetti, loot, or variable rewards.

Do not use late urgency, shame, or loss language.

Do not optimize screen time as a learning result.

## 4. Visual language

### 4.1 Character

Evidence Atelier combines an editorial field guide with a calibrated instrument.

The surface feels tactile, exact, and calm.

The design uses large areas of visual rest.

Small measurement marks show structure without adding noise.

The environmental art appears only at a threshold or a return.

Dense learning work uses a flat surface.

### 4.2 Signature motifs

- A datum line marks a learning state.
- An orange doorway marks a learner commitment.
- An ivory instrument marks careful comparison.
- A forest field marks reviewed evidence.
- A cobalt field marks system structure or disclosed AI work.
- A receipt edge marks an inspectable result.

Do not use a mountain summit as an achievement symbol.

Do not show evidence as a trophy.

### 4.3 Surface rules

- Use flat fields and clear boundaries.
- Use one nested enclosure for the active work plate.
- Use a second nested enclosure only for protected proof.
- Keep other information in the page flow.
- Use an eight-pixel corner radius for work surfaces.
- Use a twelve-pixel corner radius for threshold surfaces.
- Use no decorative glass.
- Use no ambient glow.
- Use no deep drop shadow.
- Use a subtle inner highlight only when it explains a physical layer.

## 5. Original concept asset

![Abstract ivory, cobalt, and forest instrument landscape with an orange doorway](../../../public/forge/concepts/evidence-atelier-instrument-landscape.png)

**Asset identifier:** `forge-evidence-atelier-instrument-landscape-v1`  
**Repository path:** `public/forge/concepts/evidence-atelier-instrument-landscape.png`  
**Source type:** OpenAI generated concept asset  
**Generation mode:** Built-in image generation  
**Generation date:** 2026-08-01  
**Dimensions:** 1672 × 941 pixels  
**SHA-256:** `7289ded3768b5d89ba289b24b99d6e8c15a6af69718e309e782033428e9520f5`  
**Review state:** Concept candidate  
**Rights state:** Not cleared for production release

Use the asset for the Today threshold and the delayed-return threshold.

Do not use the asset behind dense instructions or answer inputs.

Use an empty `alt` value when nearby text gives the complete state.

Use this text when the image carries meaning:

> An ivory measuring instrument and an orange doorway stand on a green field under a cobalt and ivory sky.

### 5.1 Generation prompt

```text
Use case: stylized-concept
Asset type: Evidence Atelier web application concept key visual and wide interface background
Primary request: Create an original, premium editorial instrument landscape for a humane learning product. It must suggest careful thinking, repair, independent proof, and a deliberate later return.
Scene/backdrop: A wide quiet field built from warm ivory paper and deep cobalt space. Sculpted forest-green terrain crosses the lower frame. One precise vermilion-orange calibration doorway and a small ivory measuring instrument stand near the lower-right third. Thin ivory datum lines and sparse registration marks suggest an atelier instrument, without numbers or letters.
Subject: The landscape and two small instrument objects. Do not include people, animals, screens, interface panels, text, symbols, logos, or branded shapes.
Style/medium: High-end Swiss editorial composition mixed with tactile archival screen print, restrained halftone, fine paper grain, and clean geometric forms. The image must feel original and materially printed, not like stock photography or generic AI concept art.
Composition/framing: 16:9 landscape. Keep generous calm negative space across the upper-left and center for interface text. Keep all important objects away from the outer 8 percent crop area. Use a low horizon and clear silhouette hierarchy.
Lighting/mood: Quiet, exact, curious, humane, and focused. Soft directional light. No spectacle and no triumphal mood.
Color palette: Warm ivory #F5F0E6, vivid cobalt #114FCF, deep cobalt #082E83, forest #17643C, signal orange #F0643B, and near-black #071722 only.
Materials/textures: Cotton paper, fine screen-print grain, subtle copperplate hatch marks, matte painted forms. Texture must stay light enough for clear interface overlays.
Constraints: No text, letters, numbers, logos, watermark, UI mockup, glassmorphism, gradients that reduce readability, badges, points, streaks, trophies, confetti, reward symbols, chat bubbles, neon, glossy 3D, mountains-as-conquest, copied brand layouts, or recognizable copyrighted characters. Keep the output useful in both light and dark interface themes.
```

The production asset set still needs mobile, dark, low-bandwidth, and reduced-detail variants.

## 6. Color system

Color shows authorship and authority.

Color never shows a state by itself.

Pair each color with a label, icon, shape, or sentence.

### 6.1 Light theme

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Canvas | `--atelier-canvas` | `#F5F0E6` | Main page |
| Work surface | `--atelier-surface` | `#FFFCF5` | Problem and receipt |
| Raised surface | `--atelier-surface-raised` | `#EEE6D8` | Drawers and inactive controls |
| Ink | `--atelier-ink` | `#102019` | Primary text |
| Muted ink | `--atelier-muted` | `#59665E` | Secondary text |
| Line | `--atelier-line` | `#CFC5B5` | Structural boundary |
| Cobalt | `--atelier-cobalt` | `#114FCF` | System structure and disclosed AI work |
| Deep cobalt | `--atelier-cobalt-deep` | `#082E83` | Strong cobalt surface |
| Forest | `--atelier-forest` | `#17643C` | Reviewed or observed evidence |
| Orange | `--atelier-orange` | `#F0643B` | Learner commitment and primary action |
| Focus | `--atelier-focus` | `#114FCF` | Focus indicator |

### 6.2 Dark theme

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Canvas | `--atelier-canvas` | `#071722` | Main page |
| Work surface | `--atelier-surface` | `#0D202B` | Problem and receipt |
| Raised surface | `--atelier-surface-raised` | `#162C36` | Drawers and inactive controls |
| Ink | `--atelier-ink` | `#F5F0E6` | Primary text |
| Muted ink | `--atelier-muted` | `#B3C0B8` | Secondary text |
| Line | `--atelier-line` | `#3B5660` | Structural boundary |
| Cobalt | `--atelier-cobalt` | `#85AAFF` | System structure and disclosed AI work |
| Deep cobalt | `--atelier-cobalt-deep` | `#114FCF` | Strong cobalt surface |
| Forest | `--atelier-forest` | `#79C995` | Reviewed or observed evidence |
| Orange | `--atelier-orange` | `#FF8A62` | Learner commitment and primary action |
| Focus | `--atelier-focus` | `#A9C0FF` | Focus indicator |

Use near-black text on an orange button.

Use warm ivory text on a deep cobalt button.

Test each final pair in the rendered interface.

Do not treat these values as completed contrast evidence.

### 6.3 Theme behavior

- Offer Light, Dark, and System choices.
- Use the system choice during the first visit.
- Save the learner's explicit choice on the device.
- Do not change the theme during protected proof.
- Keep meaning equal in both themes.
- Use the same semantic role for each color.

## 7. Typography

Use `Geist Sans` for interface and display text.

Use `Instrument Serif` for one learner question or reflection.

Use `IBM Plex Mono` for modes, versions, receipts, and source labels.

These fonts need a license check before production use.

Do not use more than these three families.

| Use | Desktop | Mobile | Weight |
| --- | --- | --- | --- |
| Today title | 56–64 px | 36–40 px | 520 |
| Learner question | 40–48 px | 30–34 px | 400 |
| Screen title | 30–36 px | 26–30 px | 560 |
| Body | 17–18 px | 16–18 px | 430 |
| Control | 15–16 px | 16 px | 560 |
| Evidence label | 12–13 px | 12–13 px | 500 |

Keep learning text between 55 and 72 characters per line.

Use sentence case.

Use tracking only for short evidence labels.

Do not use small uppercase text for instructions.

## 8. Application structure

### 8.1 Atelier rail

The top rail contains four stable items:

1. FORGE home.
2. Current Journey.
3. Assistance mode.
4. Theme and access controls.

The rail does not show a score, streak, rank, or notification count.

On desktop, the rail sits inside the page width.

On mobile, the rail becomes a two-row header.

### 8.2 Work frame

Use a 12-column desktop grid.

The main work plate uses seven or eight columns.

The context rail uses three columns.

Leave one column as visual rest when space permits.

The context rail can show:

- The exact task state.
- The assistance mode.
- The source state.
- The stopping point.
- A manual or offline option.

Do not use the context rail as a feed.

### 8.3 Component set

| Component | Purpose |
| --- | --- |
| `AtelierRail` | Stable navigation, mode, theme, and access |
| `JourneyDatum` | Named journey stage without a percentage |
| `ThresholdField` | Environmental orientation at Today and Return |
| `ProblemPlate` | Active learner work |
| `SupportDrawer` | Bounded support after an attempt |
| `CalibrationNote` | Specific feedback and next test |
| `ProofLock` | Protected-proof boundary |
| `EvidenceReceipt` | Bounded result with provenance |
| `ReturnMarker` | Delayed return with a new case |
| `LocalStateSeal` | Save, offline, or recovery state |

## 9. Screen 1: Today

### 9.1 Purpose

Today answers one question:

> What is the most useful honest action now?

### 9.2 Desktop composition

Use a wide threshold field across the top third.

Place the learner's next action in the quiet upper-left area.

Keep the orange doorway visible at the lower-right.

Below the field, show one current Journey and one due return.

Show recent evidence only after the primary action.

### 9.3 Required information

- The current question.
- One recommended action.
- The reason for the action.
- The expected time.
- The assistance mode.
- The source status.
- The local save state.
- The clear stopping point.

Example:

```text
TODAY

Test your ratio model in a new case
This check removes the diagram support.
About 12 minutes · Closed after start · Saved on this device

[Continue]
```

### 9.4 Secondary actions

- Continue another open Journey.
- Start with a new question.
- Review an evidence receipt.
- Plan a later return.
- Export local work.

Hide secondary actions in a compact drawer.

Do not show a wall of course cards.

### 9.5 Empty state

```text
No Journey is open.
Start with a question that matters to you.

[Start a question]
```

The empty state must not imply failure.

### 9.6 Nothing-due state

```text
No return is due today.
Your next review opens on 8 August.

[Choose another useful action]
```

Do not use a countdown that creates pressure.

## 10. Screen 2: Active problem

### 10.1 Purpose

The learner performs one difficult operation.

The interface supports thought without taking over the operation.

### 10.2 Composition

Remove the large landscape.

Use one central `ProblemPlate`.

Place the exact task above the input.

Place the source, mode, and save labels in the context rail.

Use a single orange primary action.

Example:

```text
ATTEMPT · HINTS AFTER COMMITMENT

How must the recipe change for eight people?

Explain the relationship before you calculate.

[Learner work area]

[Commit my attempt]
```

### 10.3 Support sequence

The learner commits an attempt before cognitive help.

After commitment, the support drawer can offer:

1. Restate the task.
2. Mark the point of disagreement.
3. Show one representation.
4. Show one worked example with different values.
5. Give a full explanation.

Each support level states its effect on current evidence.

The learner can always request a full explanation.

The system must then mark the current attempt as assisted.

### 10.4 Active states

| State | Surface response |
| --- | --- |
| Draft saved | Show `Saved on this device` |
| Saving | Show `Saving…` without blocking input |
| Offline | Show `Offline. Your draft stays on this device.` |
| Input incomplete | Name the missing part near the field |
| Source unavailable | Keep the task only if reviewed fallback remains valid |
| Task invalid | Stop submission and keep the draft |

### 10.5 Stopping behavior

Use `Save and stop` as a visible secondary action.

Do not hide stop behind a menu.

The action must preserve the draft when device storage permits.

## 11. Screen 3: Feedback and retry

### 11.1 Purpose

Feedback must help the learner change a specific model or procedure.

Feedback must not become generic praise.

### 11.2 Calibration note

Use three fixed sections:

1. What held.
2. What changed.
3. What to test next.

Example:

```text
CALIBRATION NOTE

What held
You kept the number of people and the amount linked.

What changed
You added four portions only once.

What to test next
Scale each ingredient by the same factor.
```

Use forest only for an observed result.

Use orange for the learner's next commitment.

Do not use red for a wrong answer.

### 11.3 Fresh retry

The retry uses a fresh case.

It tests the same target operation.

It must not repeat the original answer pattern.

Show assistance from the prior attempt.

Do not remove access support.

Example:

```text
Try a fresh case
This case uses the same relationship with different values.

[Start the fresh case]
```

### 11.4 Retry failure

If a second retry shows the same issue, offer targeted instruction.

Do not continue an endless item loop.

Use this message:

```text
This model still needs one careful example.
Review the example now, or save this point for later.
```

## 12. Screen 4: Protected proof

### 12.1 Purpose

Protected proof checks an operation after instructional help leaves.

It does not create a permanent mastery label.

### 12.2 Entry boundary

Use a full-width `ProofLock` before the task opens.

The boundary states:

- The exact operation the learner must perform.
- The instructional help that becomes unavailable.
- The access support that remains available.
- The allowed submission count.
- The result that this task can support.
- The result that this task cannot prove.

Example:

```text
PROTECTED PROOF

You will solve one unfamiliar ratio case.
Hints and worked examples will be unavailable.
Text size, read-aloud, keyboard, and contrast controls remain available.
You can submit once.
This result can support one bounded evidence statement.
It cannot prove permanent mastery.

[Begin proof]
```

### 12.3 Proof surface

Use quiet ivory in the light theme.

Use a quiet charcoal instrument in the dark theme.

Remove the support drawer from the document structure.

Do not disable access controls.

Do not show decorative motion.

Do not show the previous answer.

Do not show a timer unless the capability requires time.

### 12.4 Exit and contamination

The learner can leave before submission.

Leaving does not create evidence.

If instructional help appears, mark the proof as contaminated.

Keep the attempt as learning work.

Schedule a fresh case for later.

Use this message:

```text
This attempt stays in your work.
It cannot support independent evidence because instructional help appeared.
A fresh proof can open later.
```

## 13. Screen 5: Evidence receipt

### 13.1 Purpose

The receipt states what the system observed.

It also states what remains unknown.

### 13.2 Receipt fields

| Field | Example |
| --- | --- |
| Capability | Scale a recipe with proportional reasoning |
| Task | Unfamiliar recipe case |
| Date | 1 August 2026 |
| Mode | Closed |
| Cognitive help | None during proof |
| Access support | Keyboard and larger text |
| Observation | Correct factor applied to each ingredient |
| Open condition | Multi-step unit conversion not tested |
| Validator | Ratio World validator v2.1 |
| Content | Ratio World v1.3 |
| Storage | Saved on this device |
| Return | New context after seven days |

### 13.3 Receipt language

Use an evidence statement, not a score.

Example:

```text
EVIDENCE RECEIPT

You applied one scale factor to a new recipe case.
You completed the proof in Closed mode.
No cognitive help was available during the proof.
Multi-step unit conversion was not tested.

State: Observed
Return: New case after seven days
```

Allowed states are:

- Observed.
- Current.
- Due for review.
- Contradicted.
- Superseded.
- Archived.
- Not evaluated.

Do not use `Mastered`.

### 13.4 Receipt actions

- Inspect the attempt.
- Inspect assistance history.
- Inspect source and validator versions.
- Correct or challenge the receipt.
- Export the receipt.
- Plan the return.
- Stop for today.

Place `Stop for today` beside the next action.

Do not force the learner into another task.

## 14. Screen 6: Delayed return

### 14.1 Purpose

The delayed return checks retention and transfer.

It is not a streak event.

### 14.2 Threshold

Use a quiet crop of the concept asset.

Shift the orange doorway closer to the center.

Show the prior receipt date and the new context.

Do not show the prior answer.

Example:

```text
RETURN

Test the same relationship in a graph.
Your earlier proof used a recipe on 1 August.
This new case checks whether the idea travels.

About 8 minutes · Closed after start

[Begin return]
[Plan another time]
```

### 14.3 Late return

Use neutral language when the learner returns late.

```text
This return is still useful.
The longer interval changes what the result can show.
```

Do not restore a lost streak.

Do not use an overdue warning color.

### 14.4 Return result

Join the result to the earlier receipt.

State whether the new case supports, qualifies, or contradicts the prior statement.

Keep both attempts visible.

Do not replace negative evidence with a positive summary.

## 15. Empty, loading, and error states

Each state keeps the learner's work and gives one safe next action.

| State | Required message | Primary recovery |
| --- | --- | --- |
| No Journey | `No Journey is open.` | Start a question |
| Nothing due | `No return is due today.` | Choose another action |
| Loading | `Preparing your saved work…` | Wait or use offline copy |
| Offline | `The network is unavailable. Your local work remains available.` | Continue locally |
| Save failed | `FORGE could not save this change.` | Copy work or try again |
| Storage full | `This device cannot save more work.` | Export before continuing |
| Source unavailable | `This source is unavailable.` | Use a reviewed alternative |
| Source expired | `This source needs review.` | Stop the factual step |
| Task invalid | `This task cannot accept a proof result.` | Keep work and report issue |
| Permission denied | `This action is not available in this mode.` | Return to the safe action |
| Proof contaminated | `This attempt cannot support independent evidence.` | Schedule a fresh proof |
| Proof expired | `This proof version is no longer current.` | Open the current version |
| Evidence missing | `No evidence receipt exists for this attempt.` | Inspect the attempt |
| Evidence contradicted | `A later result disagrees with this receipt.` | Compare both results |
| Unexpected error | `FORGE stopped this action safely.` | Keep work and try again |

Do not replace a specific error with `Something went wrong`.

Do not clear an input after a failed action.

Use a live status region for save and network messages.

Use an assertive alert only when the current action cannot continue.

## 16. Responsive behavior

### 16.1 Desktop

- Use a maximum page width of 1240 CSS pixels.
- Use 32 CSS pixel page gutters.
- Keep the main work plate below 760 CSS pixels.
- Keep the context rail between 240 and 300 CSS pixels.
- Keep threshold copy below 560 CSS pixels.

### 16.2 Tablet

- Move the context rail below the work plate.
- Keep source and mode labels above the primary action.
- Keep the threshold field at a 3:1 ratio.
- Do not use overlapping controls.

### 16.3 Mobile and 320 CSS pixels

- Use one column.
- Use 16 CSS pixel side gutters.
- Use no fixed viewport height.
- Use `min-height: 100dvh` only where a full screen is necessary.
- Keep all controls at least 44 by 44 CSS pixels.
- Keep primary actions full width.
- Keep secondary actions in normal page flow.
- Convert receipt tables to labeled definition lists.
- Wrap mode and source labels to separate lines.
- Place the context section after the task.
- Use no horizontal scroll.
- Keep the stop action visible without covering content.

The desktop asset is a concept candidate.

At 320 CSS pixels, use a reduced crop or a solid field.

Do not depend on the doorway position for required meaning.

## 17. Keyboard behavior

The focus order is:

```text
Skip link
-> Atelier rail
-> Task state
-> Problem
-> Learner input
-> Access controls
-> Support controls
-> Primary action
-> Stop action
```

- Use a visible two-pixel focus ring.
- Add at least a two-pixel focus offset.
- Do not remove focus after an asynchronous update.
- Return focus to the control that opened a drawer.
- Let `Escape` close a drawer without deleting work.
- Do not submit a multiline answer with `Enter`.
- Use roving focus for tab sets.
- Give repeated controls unique accessible names.
- Provide a form alternative for each drag or canvas operation.
- Move focus to the proof title after proof entry.
- Move focus to the evidence title after proof submission.

## 18. Reduced motion

Motion explains a state change.

It does not create a reward.

| Motion | Standard mode | Reduced-motion mode |
| --- | --- | --- |
| Control response | 180–220 ms | Immediate state change |
| Drawer | 260–340 ms | No translation |
| Threshold change | 450–600 ms | Short cross-fade or cut |
| Datum line | Draw once | Show complete line |
| Proof entry | Surface settles | Direct surface change |

Use only `transform` and `opacity` for optional motion.

Use `cubic-bezier(0.32, 0.72, 0, 1)` for surface motion.

Do not animate grain, focus, evidence text, or proof controls.

Do not use parallax during active work.

Do not remove required state information in reduced-motion mode.

## 19. Access and readability

- Meet WCAG contrast requirements in rendered use.
- Keep text readable at 200 percent zoom.
- Keep the layout usable at 400 percent browser zoom.
- Support forced-colors mode.
- Preserve text when images do not load.
- Keep labels outside textured image areas.
- Use semantic headings and landmarks.
- Use native buttons, inputs, and disclosure controls.
- Keep access support separate from cognitive help.
- Give each image correct alternative text.
- Provide a text or table alternative for visual problem content.
- Do not require color, motion, sound, speech, or fine motor control.

These requirements need rendered tests.

This document is not access conformance evidence.

## 20. Content voice

Use direct, calm language.

State one action in each instruction.

Describe an error as information.

Do not describe the learner as good, bad, smart, slow, gifted, or weak.

Do not use false certainty.

Preferred terms:

| Avoid | Use |
| --- | --- |
| `You failed` | `This case shows one open part.` |
| `Amazing!` | `Your second attempt changed the scale factor.` |
| `Mastered` | `Observed in this task and mode.` |
| `Do not lose your streak` | `Return when this new case is useful.` |
| `AI tutor` | `AI contribution` or named support |
| `Progress 82%` | `Current stage: Reconstruct` |
| `Wrong` | `This result does not match the stated relationship.` |

## 21. State and authority visibility

Keep these labels visible at the point of action:

- Learner action.
- AI contribution.
- Reviewed source.
- Candidate source.
- Assistance mode.
- Access support.
- Protected operation.
- Local save state.
- Validator identity.
- Evidence limitation.

Do not hide these labels in a settings page.

Do not use a color alone for any authority label.

## 22. Analytics and data limits

Do not add hidden engagement analytics.

Do not record raw learner text for design analytics.

Do not infer emotion, ability, personality, or learning style.

Do not use notification opens as a success result.

Use task completion only for product reliability checks.

Use delayed performance and transfer only in an approved evaluation.

## 23. Implementation sequence

1. Add semantic Evidence Atelier tokens.
2. Build `AtelierRail` and `JourneyDatum`.
3. Build the Today threshold.
4. Build `ProblemPlate` and `SupportDrawer`.
5. Build `CalibrationNote` and the fresh retry.
6. Build the structural `ProofLock`.
7. Build `EvidenceReceipt`.
8. Build the delayed-return threshold.
9. Add every empty and error state.
10. Add light, dark, and system themes.
11. Test desktop and 320 CSS pixel layouts.
12. Test keyboard and focus continuity.
13. Test reduced motion and forced colors.
14. Test offline draft recovery.
15. Test proof without instructional help.
16. Review the design with representative learners.

## 24. Acceptance checks

The concept is ready for implementation review only when:

- One dominant action is clear on each screen.
- Today does not become a dashboard.
- Active work does not become a chat surface.
- Feedback identifies a specific change.
- Retry uses a fresh case.
- Protected proof contains no instructional-help path.
- Access support remains available during proof.
- Evidence states the task, mode, help, version, and limits.
- Delayed return uses a new context.
- The learner can stop without a penalty.
- Light and dark modes preserve the same meaning.
- The interface works at 320 CSS pixels.
- Keyboard focus remains visible and continuous.
- Reduced motion preserves every state.
- Forced colors preserve required distinctions.
- Empty and error states preserve learner work.
- No streak, point, badge, rank, feed, or mastery percentage appears.
- No local concept result becomes a learning or production claim.

## 25. Open review questions

1. Do learners understand `Evidence receipt` without instruction?
2. Does the atelier language feel careful or institutional?
3. Does the orange doorway show agency without reward pressure?
4. Does the support drawer make help easy to request?
5. Can learners explain the proof boundary in their own words?
6. Can learners find the stop action during difficult work?
7. Does the dark theme remain calm during long reading?
8. Does the 320 CSS pixel layout keep the main question clear?
9. Do screen-reader users understand authority and evidence labels?
10. Does a delayed return feel useful without pressure?

These questions require representative learner and access review.
