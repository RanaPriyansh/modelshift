# FORGE Student Design Language

Status: Design direction and implementation guide.

Date: 2026-08-01.

This document defines the student-facing visual language for FORGE.

This document does not prove learning efficacy, accessibility conformance, child-safety operation, or production readiness.

## 1. Direction

The design direction is **Vivid Learning Landscapes**.

FORGE presents learning as movement through a vivid landscape.

The landscape creates curiosity and emotional orientation.

The work surface remains quiet when the learner needs precision.

The system changes as the learner does meaningful work.

It does not reward time, taps, messages, or passive attention.

The design must feel:

- Calm.
- Vivid.
- Playful.
- Rigorous.
- Humane.
- Inspectable.
- Useful to a teenager or an adult.

The product must not feel like:

- A generic AI chat.
- A course dashboard.
- A game economy.
- An infinite content feed.
- An AI companion.
- A surveillance system.

The permanent trust line remains:

> Learner acts. AI assists. Evidence decides.

## 2. Design thesis

Use a cinematic environment at an important threshold.

Use a precise instrument for active learning.

Use quiet paper for protected proof.

Use bounded evidence for the result.

The visual sequence is:

```text
Landscape -> Question -> Attempt -> Instrument -> Reconstruction -> Quiet Proof -> Evidence -> Return
```

The landscape must support the learning state.

It must not hide the learning state.

## 3. Reference synthesis

The supplied references have five strong patterns.

### 3.1 Large environmental fields

The references use large fields of cobalt, green, ivory, orange, and black.

The scenes contain large areas of visual rest.

The environment is stronger than the interface chrome.

### 3.2 Small agency markers

A small person, boat, house, path, bench, or portal gives the scene meaning.

The marker usually occupies less than eight percent of the frame.

This scale makes the environment feel important.

It also gives the learner a clear point of entry.

### 3.3 Controlled text

The best references use one short headline.

They use one primary action.

They use a thin navigation bar.

They do not cover the image with interface elements.

### 3.4 Analog image texture

The references use grain, halftone, raster texture, and soft color separation.

The texture makes synthetic scenes feel material.

The texture must stay inside image assets.

It must not reduce text clarity.

### 3.5 Strong type over images

The type references use large, direct sans serif text.

Some references use a pixel face for a short label.

No reference supports a mixture of many display families on one surface.

## 4. Composition

### 4.1 Public hero

Use a full-width landscape at the public entry.

Reserve 55 to 70 percent of the scene for quiet sky or open terrain.

Keep the text block between 440 and 620 CSS pixels.

Keep the main headline between 8 and 12 words.

Use one primary action and one quiet secondary action.

Keep the navigation thin and visually secondary.

Use one small agency marker in the environment.

Do not place a generic application screenshot in the first viewport.

### 4.2 Application shell

Use the landscape at entry, transition, completion, and return.

Keep the active work surface flat and readable.

Give each learner viewport one dominant question or action.

Do not use a wall of cards.

Do not use a large empty chat canvas.

Use 24 to 32 CSS pixel desktop gutters.

Use 16 to 20 CSS pixel mobile gutters.

Keep large-screen content between 1180 and 1280 CSS pixels.

### 4.3 Surfaces

Use flat surfaces with visible boundaries.

Use a 1 CSS pixel border.

Use 6 to 12 CSS pixel corner radii.

Use elevation only when a layer must move above another layer.

Do not use decorative glass.

Do not use ambient glow.

Do not use decorative gradients in interface surfaces.

Natural light variation can remain inside an image.

## 5. Color system

Color has two jobs.

It creates the environment.

It also identifies authorship and authority.

Do not use color as the only state signal.

Add a label, number, icon, shape, or text explanation.

### 5.1 Current light implementation anchors

| Role | Current token | Value |
| --- | --- | --- |
| Canvas | `--forge-bg` | `#F4F7F1` |
| Deep canvas | `--forge-bg-deep` | `#EEF3ED` |
| Surface | `--forge-surface` | `#FBFDF8` |
| Strong surface | `--forge-surface-strong` | `#E4EBE4` |
| Line | `--forge-line` | `#CDD9D0` |
| Strong line | `--forge-line-strong` | `#98AA9E` |
| Ink | `--forge-ink` | `#102019` |
| Muted ink | `--forge-muted` | `#56645D` |
| Dim ink | `--forge-dim` | `#66746C` |
| Learner action | `--forge-amber` | `#F0643B` |
| AI contribution | `--forge-violet` | `#2F66D8` |
| Tested evidence | `--forge-cyan` | `#247A53` |
| Focus | `--forge-focus` | `#145BD7` |

### 5.2 Current dark implementation anchors

| Role | Current token | Value |
| --- | --- | --- |
| Canvas | `--forge-bg` | `#071722` |
| Deep canvas | `--forge-bg-deep` | `#06131D` |
| Surface | `--forge-surface` | `#0D202B` |
| Strong surface | `--forge-surface-strong` | `#142A35` |
| Line | `--forge-line` | `#29414B` |
| Strong line | `--forge-line-strong` | `#44606A` |
| Ink | `--forge-ink` | `#F3F7F0` |
| Muted ink | `--forge-muted` | `#A8B9B1` |
| Dim ink | `--forge-dim` | `#82958B` |
| Learner action | `--forge-amber` | `#FF8059` |
| AI contribution | `--forge-violet` | `#85AAFF` |
| Tested evidence | `--forge-cyan` | `#79C995` |
| Focus | `--forge-focus` | `#8FB0FF` |

### 5.3 Environmental palette

Use these values for illustration direction and controlled scene accents.

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

These scene colors are candidate values.

Each final text and control pair needs a rendered contrast test.

### 5.4 Semantic roles

Use orange for learner commitment and a primary public action.

Use cobalt for a disclosed AI contribution.

Use green for tested consequence or reviewed evidence.

Use warm orange for accountable human review.

Use quiet paper for protected proof.

Do not use green to mean universal mastery.

Do not use red as a punishment for a learner error.

### 5.5 Theme behavior

Provide light, dark, and system theme choices.

Keep the learner choice until the learner changes it.

Do not change the theme during protected proof.

Use separate light and dark image crops.

Do not apply a simple inversion filter to a scene.

Set `color-scheme` so native controls match the selected theme.

## 6. Typography

### 6.1 Families

Use a modern sans serif family for public display and interface text.

Satoshi is the preferred reference if its license permits product use.

Use Geist, Inter, or the system font as a safe fallback.

Use an editorial serif only for a learner question or a reflection moment.

Use a monospace family for evidence, source, mode, and version labels.

Use PP NeueBit only for a short chapter number or World label.

Do not use a pixel face for paragraphs, forms, or instructions.

Do not use more than two main families plus one monospace family.

### 6.2 Scale

| Use | Desktop | Mobile |
| --- | --- | --- |
| Public display | 72 to 104 px | 40 to 52 px |
| Application title | 44 to 64 px | 32 to 40 px |
| Section title | 28 to 40 px | 24 to 32 px |
| Body | 16 to 18 px | 16 to 18 px |
| Critical label | 14 px minimum | 14 px minimum |
| Secondary label | 12 px minimum | 12 px minimum |

Use a short line length for learning text.

Keep body lines between 55 and 75 characters where possible.

Do not use very small navigation text.

### 6.3 Copy

Use short questions and explicit verbs.

Preserve the learner's words.

Describe interpretations as uncertain possibilities.

Name the assistance mode.

State why the next action is useful.

State what the action can and cannot prove.

Never say `mastered` from one response.

## 7. Imagery

### 7.1 Core style

Use surreal pastoral scenes with editorial composition.

Use rich cobalt, deep green, warm orange, and quiet ivory.

Use analog grain or halftone texture.

Use one small agency marker.

Keep the scene simple enough for a clear crop.

### 7.2 Narrative motifs

Use these motifs:

- A path that appears after reconstruction.
- A portal that opens after a committed choice.
- A distant peak that represents a difficult capability.
- A boat that marks deliberate progress.
- A small house that marks a stable return point.
- A stairway that marks support withdrawal.
- A bench that marks a planned pause.
- A field that changes after evidence arrives.

Do not show achievement as domination of a mountain.

Show progress as increased range, clarity, and independence.

### 7.3 Subject expression

Express each subject through a coherent environment.

Do not use generic stock photographs of students.

Do not use visual stereotypes for a subject or learner group.

Examples:

- Physics can use terrain, force lines, and moving objects.
- History can use layered documents, landscapes, and trace marks.
- Mathematics can use fields, paths, and exact geometric structures.
- Writing can use rooms, margins, drafts, and changing light.
- Computing can use architecture, signals, and visible state.

### 7.4 Texture rules

Keep texture inside the image asset.

Keep interface texture between zero and three percent opacity.

Do not animate grain.

Do not place small text on textured imagery.

Use a solid text plate when the image is complex.

### 7.5 Cohesion rule

Use one controlled art system for a product area.

Do not mix glossy 3D, copperplate engraving, CRT noise, and painterly scenery on one surface.

An individual World can use a distinct medium.

The World must still use the shared color, type, and authority rules.

## 8. Motion

Motion must explain causality, state change, or support withdrawal.

### 8.1 Timing

| Motion | Duration |
| --- | --- |
| Control feedback | 180 to 240 ms |
| Surface transition | 240 to 360 ms |
| Scene transition | 450 to 700 ms |

Keep interface movement below 24 CSS pixels.

Draw a progress path once when a stage becomes available.

Change the environment only after meaningful learner work.

Examples:

- A path becomes visible.
- A portal opens.
- A cloud layer clears.
- A distant object becomes sharp.
- A light moves to the next return point.

### 8.2 Prohibited motion

Do not use:

- Confetti.
- Slot effects.
- Reward bursts.
- Constant pulsing.
- Animated noise.
- Forced pacing.
- Autoplay.
- Continuous parallax.

### 8.3 Reduced motion

Reduced-motion mode removes parallax and decorative transitions.

It preserves state through text, numbers, and static diagrams.

It never removes required evidence.

## 9. Ethical learning loop

FORGE uses motivation without manipulation.

The learner must feel progress because capability changes.

The learner must not feel pressure to remain in the product.

The governing loop is:

```text
Attempt
-> Diagnose
-> Give the smallest useful scaffold
-> Revise
-> Withdraw instructional help
-> Run an unfamiliar check
-> State bounded evidence
-> Schedule a deliberate return or application
```

### 9.1 Healthy motivation signals

Use:

- Immediate causal feedback.
- A short honest start.
- A visible recovery path.
- A meaningful assistance choice.
- A clear reason for the next action.
- Evidence of independent work.
- A visible stopping point.
- A prepared question for a teacher.
- A later return with a new case.

### 9.2 Completion

Completion must become quiet.

The product must show what changed.

It must show what remains open.

It must give the learner permission to stop.

The product should become quieter as the learner becomes more capable.

### 9.3 Research basis

Use retrieval before restudy when prerequisite knowledge exists.

Use spacing that matches the required retention period.

Mix related problem types after initial instruction.

Give feedback that identifies a specific learning gap.

Use problem-first work only when the learner has sufficient prerequisite knowledge.

Give meaningful choices that support autonomy and competence.

Primary evidence sources:

- Retrieval practice: <https://doi.org/10.1111/j.1467-9280.2006.01693.x>
- Interleaved quizzes: <https://pubmed.ncbi.nlm.nih.gov/35436145/>
- Spacing: <https://pubmed.ncbi.nlm.nih.gov/19076480/>
- Interleaving: <https://pubmed.ncbi.nlm.nih.gov/34772951/>
- Productive failure: <https://journals.sagepub.com/doi/10.3102/00346543211019105>
- Autonomy and competence: <https://selfdeterminationtheory.org/wp-content/uploads/2024/06/2024_WangWangEtAl_MetaEdu.pdf>
- Feedback: <https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/feedback>
- Responsible child-centered design: <https://www.unicef.org/innocenti/projects/responsible-innovation-technology-children>

These studies do not prove that this implementation improves learning.

The product needs delayed retention, transfer, safety, and representative-learner evidence.

## 10. Rejected manipulation

FORGE must not use:

- Universal streaks.
- Experience points.
- Badges.
- Leaderboards.
- Comparative rank.
- Loot.
- Punitive streak loss.
- Infinite feeds.
- Variable rewards.
- Notification pressure.
- Emotional attachment.
- Fake urgency.
- Fake scarcity.
- Confetti.
- Universal mastery percentages.
- Unsupported confidence scores.
- Claims about grade improvement.
- Claims about learning speed without suitable evidence.

Do not optimize session time, message count, or notification opens as learning outcomes.

Do not present a generated answer as learner capability.

Do not make help feel shameful.

Do not withdraw accessibility support during proof.

## 11. Homepage specification

The first viewport introduces the world and one useful action.

### 11.1 Required content

- A full-width landscape.
- One short product promise.
- One primary action.
- One quiet secondary action.
- A thin navigation bar.
- One small agency marker.
- A visible light and dark theme control.

Suitable primary actions include:

- `Start with one course`
- `Start with one hard problem`
- `Tell FORGE what you want to become able to do`

The next section shows the product sequence:

```text
Plan -> Attempt -> Repair -> Test -> Return
```

The next section can show real interface evidence.

It must name the exact implemented scope.

### 11.2 Prohibited content

Do not use:

- A generic AI product headline.
- A wall of feature cards.
- Unsupported user counts.
- Unsupported outcome claims.
- A chat composer as the main public action.
- A product screenshot inside the first hero.

## 12. Web application specification

The application home must answer one question:

> What is the most useful honest action now?

### 12.1 Required home content

- One next action.
- The reason for that action.
- The expected time.
- The assistance mode.
- The source status.
- A manual alternative.
- A stopping point.

Use a narrow landscape strip to show the current Journey state.

Keep the active work surface flat and functional.

### 12.2 Learning modes

Give these modes distinct visual states:

- Plan.
- Attempt.
- Investigate.
- Reconstruct.
- Test.
- Return.

Keep source rights, assistance labels, and authority labels visible.

Use a scene transition only when the learning mode changes.

Do not use environmental motion during dense work.

### 12.3 Quick action sheet

Use a bounded action sheet for:

- Scan a problem.
- Add a document.
- Start an attempt.
- Ask a reviewed question.
- Practice.
- Prepare for a test.

The action sheet must not become the product information architecture.

### 12.4 Proof surface

Protected proof uses quiet paper or a quiet dark instrument.

Instructional help is structurally absent.

Accessibility support remains available.

The surface must state:

- What the learner must do.
- Which help is unavailable.
- Which access support remains.
- How many submissions are allowed.
- What the result can establish.

## 13. iOS application specification

Use native SwiftUI structure.

Use `NavigationStack`, native tabs, and native sheets.

Use an edge-to-edge landscape at entry.

Use a bottom sheet for scan, upload, ask, and practice actions.

### 13.1 Interaction

- Keep one primary action on each screen.
- Use 44 point minimum targets.
- Support Dynamic Type.
- Define a clear VoiceOver order.
- Support Reduce Motion.
- Preserve keyboard operation where applicable.
- Preserve local drafts without a network connection.
- Preserve stop and resume states.

### 13.2 Haptics

Use a haptic only for a meaningful commitment.

Suitable events include:

- A prediction commit.
- A protected test start.
- A saved local draft.
- A proof submission.

Do not use repeated reward haptics.

### 13.3 Mobile onboarding

Keep required onboarding between four and six steps.

1. Select one current course or problem.
2. Add the deadline or desired outcome.
3. Import a source and review its rights.
4. Select an assistance mode.
5. Complete a short honest attempt.
6. Review the next action.

Ask for age only when a policy requires it.

Move optional interests after the first useful learning action.

Do not create a public profile during onboarding.

## 14. Astra findings

The Astra review contains 58 ordered screenshots and one written product report.

The review used a synthetic adult university profile.

It did not purchase a plan, join a classroom, upload a file, or grant device permission.

### 14.1 Adopt

Adopt these patterns:

- Outcome-led entry.
- One question on each onboarding screen.
- A visible progress indicator.
- Exact-task entry.
- Photo and document entry.
- A diagnostic question before teaching.
- Suggested response choices.
- A visible exam or deadline plan.
- Separate tutoring and protected assessment.
- Interactive simulations.
- A clear human support route.

### 14.2 Adapt

Adapt these patterns:

- Reduce the 18-step onboarding sequence.
- Move optional profile questions after the first useful action.
- Add source-rights review before upload.
- Keep assistance modes explicit and reversible.
- Replace answer-first defaults with attempt-first learning.
- Add protected checks and delayed return.
- Increase text contrast and control names.
- Separate adult and minor policy flows.
- Connect tools to a current Journey.
- Replace chat memory with durable learner-owned artifacts.

### 14.3 Reject

Reject these patterns:

- The generic chat-first home.
- A large empty chat canvas.
- The feature catalog as primary navigation.
- A glowing `Learn Faster` action.
- Reward counters.
- Solver mode as the default.
- Unsupported speed and confidence claims.
- Conflicting social-proof counts.
- Public discovery of likely minor profiles.
- Placeholder personal analytics.
- A paywall before useful learning value.
- Uncited tutoring answers.

## 15. Asset provenance

The supplied references are inspiration evidence.

They are not automatically approved production assets.

Do not ship a supplied image until rights permit that use.

### 15.1 Required asset record

Every production image needs:

- A stable asset identifier.
- The source type.
- The exact source path or source URL.
- The creator or provider.
- The license and permitted uses.
- The creation date.
- The model and version for generated work.
- The complete generation prompt.
- The seed or reproducibility data when available.
- The human reviewer and review date.
- The modifications and crop history.
- Light, dark, desktop, and mobile variants.
- Alternative text.
- The allowed product surfaces.
- The withdrawal or replacement state.

### 15.2 Generated asset rules

Generated work must not copy a reference brand, logo, layout, or distinctive protected character.

Generated work must not contain false text or false interface evidence.

Remove unintended faces, marks, and watermarks.

Record the prompt and provider response.

Review each final crop for text clarity and subject meaning.

### 15.3 Asset set

Each main scene needs:

- A 16:9 desktop version.
- A 4:5 mobile version.
- A wide application strip.
- A light-theme variant.
- A dark-theme variant.
- A reduced-detail variant for low-bandwidth use.
- A text-safe crop map.

### 15.4 Current candidate asset

Asset identifier: `forge-landscape-learning-threshold-cobalt-v1`.

Repository path: `public/forge/landscapes/learning-threshold-cobalt.png`.

Source type: OpenAI generated candidate image.

Generation date: 2026-08-01.

Generation mode: `stylized-concept`.

Output size: 1672 by 941 pixels.

Source output:

`/Users/Priyansh/.codex/generated_images/019fb99e-6ef9-7643-ad46-b654fb991790/exec-dade40d9-cc9d-4ff6-ac80-96f9263dc2ea.png`

Prompt direction used for this candidate:

> Create a premium editorial miniature landscape for the FORGE learning product. Use a wide 16:9 composition. Show a vivid cobalt sky, emerald hills, a blue lake, and one small orange stairway with a doorway. Include one small student as an agency marker. Use restrained halftone and film grain. Keep quiet sky on the left for interface text. The mood is calm, curious, playful, rigorous, and humane. Use strong cobalt, forest green, signal orange, and warm ivory. Do not add text, logos, badges, points, streaks, confetti, reward symbols, interface chrome, watermarks, stock-photo realism, or a copied brand composition.

Current review state: candidate implementation asset.

Current rights state: not cleared for production release.

Current variants: desktop 16:9 only.

Required next variants: mobile, application strip, light, dark, and reduced-detail crops.

Allowed current surfaces: local public hero, local World mosaic, and local application threshold.

## 16. Reference image inventory

### 16.1 Surreal landscapes and agency markers

- `/Users/Priyansh/Downloads/IMG_1394.JPG`
- `/Users/Priyansh/Downloads/IMG_1395.JPG`
- `/Users/Priyansh/Downloads/IMG_1396.JPG`
- `/Users/Priyansh/Downloads/IMG_1397.JPG`

These references define the vivid alpine palette and the small agency marker.

### 16.2 Vero landing-page studies

- `/Users/Priyansh/Downloads/IMG_1398.JPG`
- `/Users/Priyansh/Downloads/IMG_1399.JPG`
- `/Users/Priyansh/Downloads/IMG_1400.JPG`
- `/Users/Priyansh/Downloads/IMG_1401.JPG`
- `/Users/Priyansh/Downloads/IMG_1402.JPG`

These references define the large negative space, thin navigation, short copy, and orange action.

They are layout inspiration only.

Do not copy the Vero brand or composition directly.

### 16.3 Scenic website studies

- `/Users/Priyansh/Downloads/IMG_1136.JPG`
- `/Users/Priyansh/Downloads/IMG_1137.JPG`
- `/Users/Priyansh/Downloads/IMG_1138.JPG`
- `/Users/Priyansh/Downloads/IMG_1139.JPG`
- `/Users/Priyansh/Downloads/IMG_1140.JPG`
- `/Users/Priyansh/Downloads/IMG_1141.JPG`

These references show scenic product entry, pale surfaces, and product evidence after the hero.

### 16.4 Engraving, architecture, raster, and material studies

- `/Users/Priyansh/Downloads/IMG_1403.JPG`
- `/Users/Priyansh/Downloads/IMG_1404.JPG`
- `/Users/Priyansh/Downloads/IMG_1405.JPG`
- `/Users/Priyansh/Downloads/IMG_1406.JPG`
- `/Users/Priyansh/Downloads/IMG_1407.JPG`

These references show controlled texture and alternate World media.

Do not combine all these media on one surface.

### 16.5 Typography and play

- `/Users/Priyansh/Downloads/IMG_1408.JPG`
- `/Users/Priyansh/Downloads/IMG_1409.JPG`
- `/Users/Priyansh/Downloads/IMG_1410.JPG`
- `/Users/Priyansh/Downloads/IMG_1411.JPG`
- `/Users/Priyansh/Downloads/IMG_1412.JPG`

These references support large sans serif display text and limited pixel accents.

The final image supports a playful attitude.

It does not authorize use of the quoted frame.

## 17. Astra evidence inventory

Primary capture report:

- `/Users/Priyansh/.codex/visualizations/2026/07/31/019fb80b-a3c5-70d0-82c4-d22befa889ae/astra-ai-research/ASTRA_AI_PRODUCT_RESEARCH.md`

Extended FORGE research synthesis:

- `/Users/Priyansh/Documents/codex-buildweek/education/docs/program/STUDENT_COMMUNITY_ASTRA_AI_AND_FUTURE_RESEARCH.md`

Capture folder:

- `/Users/Priyansh/.codex/visualizations/2026/07/31/019fb80b-a3c5-70d0-82c4-d22befa889ae/astra-ai-research/`

Important captures:

- `01-role-select.png`
- `03-onboarding-intent.png`
- `06-frustration-story.png`
- `18-study-profile-ready.png`
- `19-app-home-new-chat.png`
- `20-start-menu.png`
- `22-exam-prep-demo.png`
- `25-tutor-diagnostic-response.png`
- `26-tutor-guided-explanation.png`
- `30-feature-catalog.png`
- `31-personal-study-path-detail.png`
- `32-returning-home-dashboard.png`
- `34-learning-apps-catalog.png`
- `35-graphing-learning-app.png`
- `37-study-calendar.png`
- `40-exam-prep-home.png`
- `48-classrooms-home.png`
- `50-classroom-public-profile-setup.png`
- `55-usage-limits.png`

## 18. Review gates

A surface is not ready until all applicable gates pass.

1. One dominant action is clear.
2. The learner can identify the assistance mode.
3. The learner can identify the source state.
4. The learner can identify what remains untested.
5. Text remains clear without the scene.
6. Meaning remains clear without color.
7. Meaning remains clear without motion.
8. Keyboard operation works.
9. The surface works at 320 CSS pixels.
10. Focus remains visible and continuous.
11. Reduced motion preserves all state.
12. Forced colors preserve all required meaning.
13. Light and dark themes remain usable.
14. Image rights and provenance are recorded.
15. Generated imagery has human review.
16. Proof contains no instructional-help path.
17. The result does not make an unsupported learning claim.

## 19. Evidence limits

This design language uses static reference images and local product records.

The reference review did not establish image licenses.

The candidate environmental colors do not have complete contrast evidence.

The Astra review was an exploratory authenticated walkthrough.

It was not a formal accessibility audit.

The current evidence does not prove keyboard, screen-reader, mobile, or reduced-motion behavior in Astra.

The FORGE design direction does not prove that learners prefer this style.

It does not prove that the style improves learning or retention.

Representative learners must review the product before a broad preference claim.

Accessibility specialists must review the product before a conformance claim.

## 20. Implementation order

1. Preserve the current semantic token roles.
2. Add one coherent landscape asset set.
3. Apply the public hero composition.
4. Apply light, dark, and system theme behavior.
5. Create the one-action application home.
6. Add scene strips at major learning transitions.
7. Keep active World work surfaces precise.
8. Validate mobile and 320 CSS pixel layouts.
9. Validate keyboard, focus, reduced motion, and forced colors.
10. Record every final asset and its rights.

Stop implementation when a visual treatment hides authority, access, source, or evidence state.
