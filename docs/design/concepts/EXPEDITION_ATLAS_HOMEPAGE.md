# Expedition Atlas Homepage

Status: Alternate homepage concept only.

Date: 2026-08-01.

This concept is not part of the active implementation.

It does not change a route, component, token, or production asset.

## 1. Concept

**Expedition Atlas** presents a hard question as a route through uncertain terrain.

The learner sees one decision point.

The learner does not see a score, streak, or rank.

The route represents:

```text
Question -> Attempt -> Test -> Reconstruction -> Proof -> Return
```

The learner marker remains small.

The learner owns the direction.

The environment supplies scale and curiosity.

The interface supplies clarity and authority.

## 2. Material difference

The active homepage uses a cinematic horizon, a portal, and a full-width landscape.

Expedition Atlas uses a topographic sheet and an oblique map view.

The concept uses an inset editorial plate on a strong outer field.

It does not use a horizon, portal, stairway, or photorealistic scene.

The visual hierarchy is cartographic.

The page feels like a learner-owned field guide.

## 3. Original concept asset

Concept asset:

- `public/forge/concepts/expedition-atlas-hero.png`

Asset properties:

- Dimensions: 1720 by 914 pixels.
- Format: PNG.
- Purpose: Alternate homepage concept.
- Viewpoint: Oblique top-down atlas view.
- Text inside image: None.
- People inside image: One small learner.

The left side supplies quiet copy space.

The right side contains mapped terrain and one learner marker.

The orange route contains one visible decision point.

The image is not active product evidence.

## 4. Desktop composition

Target viewport: 1440 by 900 CSS pixels.

### 4.1 Outer frame

Use a full viewport cobalt field.

Place an ivory atlas plate inside the field.

Use 32 to 48 CSS pixel outer margins.

Keep the plate below the first viewport edge.

Use a 1 CSS pixel dark border.

Use a 10 to 14 CSS pixel corner radius.

### 4.2 Plate layout

Use a 12-column grid.

Use columns 1 through 5 for copy.

Use columns 5 through 12 for the atlas image.

The image can extend behind the copy area.

The quiet image area must remain under the text.

Keep the text block below 560 CSS pixels.

### 4.3 Header

Place the header inside the atlas plate.

Use a 64 to 72 CSS pixel header height.

Use four navigation items or fewer.

Keep the brand, navigation, and theme control visually quiet.

### 4.4 Hero copy

Align the copy to the left.

Center the copy vertically in the plate.

Use one primary action.

Use one quiet secondary action.

Keep the actions outside the detailed contour area.

### 4.5 Route key

Place a compact route key along the plate bottom.

Use three short items:

1. Make an attempt.
2. Meet a test.
3. Return without help.

The route key describes the product.

It does not show completion or rank.

## 5. 320 CSS pixel composition

Do not scale the desktop plate.

Recompose the content in one column.

### 5.1 Order

Use this order:

1. Header.
2. Eyebrow.
3. Headline.
4. Body copy.
5. Primary action.
6. Secondary action.
7. Atlas crop.
8. Route key.

### 5.2 Mobile dimensions

Use 16 CSS pixel page gutters.

Use a 56 CSS pixel header.

Use a 40 to 44 CSS pixel headline.

Use a 16 to 18 CSS pixel body size.

Use 44 CSS pixel minimum targets.

Use full-width actions.

Use 12 CSS pixels between actions.

### 5.3 Image crop

Place the image after the actions.

Use a 4:5 or square crop.

Use `object-position: 68% 54%` as the first crop candidate.

Keep the learner and route fork visible.

Do not require the learner marker for meaning.

Do not place text over the mobile image.

### 5.4 Route key

Use a vertical ordered list.

Do not shrink the desktop route key.

Do not use a horizontal scroll area.

## 6. Copy sample

### Header

Brand:

> FORGE

Navigation:

- Worlds
- How it works
- Evidence
- Sign in

### Hero

Eyebrow:

> A learner-owned expedition

Headline:

> Turn one hard question into a path you can prove.

Body:

> FORGE helps you attempt, investigate, reconstruct, and test without giving away the thinking you want to learn.

Primary action:

> Plot my first path

Secondary action:

> See a learning world

Trust note:

> No streaks. No hidden rank. Your work stays yours.

### First section after the hero

Section heading:

> Every route ends with evidence, not applause.

Section copy:

> See what you did, which help you used, and what remains untested.

## 7. Token proposal

These values are concept tokens.

They are not active implementation tokens.

### 7.1 Light treatment

| Role | Token | Value |
| --- | --- | --- |
| Outer field | `--atlas-field` | `#114FCF` |
| Atlas paper | `--atlas-paper` | `#F5ECD9` |
| Main ink | `--atlas-ink` | `#102019` |
| Muted ink | `--atlas-muted` | `#56645D` |
| Contour green | `--atlas-contour` | `#17643C` |
| Terrain green | `--atlas-terrain` | `#55A447` |
| Map water | `--atlas-water` | `#114FCF` |
| Route orange | `--atlas-route` | `#F0643B` |
| Plate line | `--atlas-line` | `#B8B29E` |
| Focus | `--atlas-focus` | `#145BD7` |

### 7.2 Dark treatment

| Role | Token | Value |
| --- | --- | --- |
| Outer field | `--atlas-field` | `#06131D` |
| Dark surface | `--atlas-surface` | `#0D202B` |
| Main ink | `--atlas-ink` | `#F3F7F0` |
| Muted ink | `--atlas-muted` | `#A8B9B1` |
| Strong line | `--atlas-line` | `#44606A` |
| Route orange | `--atlas-route` | `#FF8059` |
| Evidence green | `--atlas-evidence` | `#79C995` |
| Focus | `--atlas-focus` | `#8FB0FF` |

The generated atlas remains an ivory physical plate in both themes.

Dark mode changes the outer field and navigation surfaces.

Dark mode does not invert the asset.

Use a dark border around the ivory plate.

Keep essential dark-mode text outside the image.

Each final color pair needs a rendered contrast test.

## 8. Typography

Use Satoshi only when its product license is confirmed.

Use Geist, Inter, or the system font as the fallback.

Use a monospace family for route labels and evidence modes.

Recommended desktop scale:

- Headline: 72 to 88 CSS pixels.
- Body: 18 CSS pixels.
- Eyebrow: 12 to 14 CSS pixels.
- Navigation: 14 CSS pixels.
- Route key: 12 to 14 CSS pixels.

Recommended mobile scale:

- Headline: 40 to 44 CSS pixels.
- Body: 16 to 18 CSS pixels.
- Eyebrow: 12 CSS pixels.
- Navigation: 16 CSS pixels inside the menu.

Use one display family.

Do not use a pixel face in the main hero.

## 9. Interaction notes

### 9.1 Initial state

Show the complete atlas plate without continuous motion.

Draw the orange route once.

Stop the route at the learner marker.

Do not animate the learner.

### 9.2 Primary action

`Plot my first path` opens one inline intake step.

The intake asks:

> What do you want to understand, make, or become able to do?

The page must not open a generic chat.

The next step can ask for one deadline or constraint.

### 9.3 Route response

The route can receive one new labeled decision.

The route must not become a progress game.

Do not add completion rings, stars, points, or unlock effects.

### 9.4 Timing

- Control response: 180 to 240 milliseconds.
- Plate transition: 240 to 360 milliseconds.
- Route draw: 500 to 700 milliseconds.

Keep movement below 24 CSS pixels.

### 9.5 Reduced motion

Show the final route immediately.

Remove route drawing and plate movement.

Keep the decision state in text.

### 9.6 Keyboard order

Use this order:

1. Skip link.
2. Brand or home link.
3. Navigation.
4. Theme control.
5. Primary action.
6. Secondary action.
7. Route key.

Do not make the illustration keyboard interactive.

## 10. Ethical motivation

This concept uses curiosity, orientation, and agency.

It does not use addictive mechanics.

The route responds only to meaningful learning events.

Suitable events include:

- A committed attempt.
- A completed separating test.
- A revised explanation.
- A protected proof.
- A deliberate return.

The page must not reward:

- Time on page.
- Repeated taps.
- Message count.
- Daily return.
- Passive content completion.
- Notification opens.

The page must provide a clear stopping point.

## 11. Accessibility requirements

Treat the concept image as decorative when the route is not product data.

Use `alt=""` for a decorative implementation.

Keep all product meaning in semantic text.

If the route becomes product data, provide an ordered text alternative.

Do not embed essential labels inside the bitmap.

Keep the learner marker non-essential.

Provide:

- A visible skip link.
- Visible focus.
- 44 CSS pixel targets.
- 16 CSS pixel inputs.
- Keyboard operation.
- Reduced-motion behavior.
- Forced-colors behavior.
- A 320 CSS pixel composition.
- Text alternatives for route state.

The grain must not sit behind small text.

The mobile layout must not depend on hover.

Theme changes must not move focus.

## 12. Accessibility limits

This document is a static design concept.

It does not prove keyboard operation.

It does not prove screen-reader operation.

It does not prove forced-colors support.

It does not prove reduced-motion support.

It does not include a rendered contrast report.

The image crop needs a 320 CSS pixel browser check.

The concept needs representative learner review.

Do not claim WCAG conformance from this file.

## 13. Asset provenance

Generation method:

- Built-in image-generation tool.
- New image generation.
- Model identifier was not exposed by the tool response.

Generated source:

- `/Users/Priyansh/.codex/generated_images/019fb99f-dc99-7330-862b-6f0f9d2a0c21/call_daTaL6qCRK32FDeXdtg5qtDI.png`

Workspace copy:

- `public/forge/concepts/expedition-atlas-hero.png`
- SHA-256: `6d670e3e397b6a1fd36ffab041df9ffc03d83a2103665e6712b743e091d2adfc`
- File size: 3,549,480 bytes.

Style references:

- `/Users/Priyansh/Downloads/IMG_1403.JPG`
- `/Users/Priyansh/Downloads/IMG_1394.JPG`
- `/Users/Priyansh/Downloads/IMG_1404.JPG`
- `/Users/Priyansh/Downloads/IMG_1405.JPG`

The references supplied mood, color, material, and composition principles.

The prompt prohibited copied layouts, objects, brands, and identifiable compositions.

The reference images are not included in the workspace.

The generated asset needs a final rights review before production use.

### 13.1 Final prompt

```text
Use case: stylized-concept
Asset type: original landing-page hero concept asset for a learning product, named Expedition Atlas
Input images: Image 1 is a reference for an inset ivory plate on a cobalt field and strong negative space. Image 2 is a reference for the cobalt and alpine-green palette. Image 3 is a reference for bold orange geometry. Image 4 is a reference for editorial grain and raster texture. Use these only as general mood and material references. Do not reproduce their layouts, objects, brands, or identifiable compositions.
Primary request: create an original editorial topographic atlas scene that suggests a learner planning a difficult journey through knowledge
Scene/backdrop: a warm ivory atlas sheet with an oblique top-down cartographic terrain model, not a horizon landscape; alpine-green contour masses and deep cobalt water or map field; one clear orange route crossing the terrain
Subject: exactly one tiny learner in an orange jacket standing at one decision point on the route; no other people, houses, boats, portals, stairs, flags, or characters
Style/medium: refined screenprint and risograph editorial illustration, matte paper, subtle halftone and analog grain, precise contour lines, modern cartographic abstraction
Composition/framing: wide panoramic hero plate; approximately 45 percent quiet ivory negative space on the left for web copy; mapped terrain occupies the right and lower area; the learner remains visible in both a wide desktop crop and a narrow mobile crop; balanced but intentionally asymmetrical
Lighting/mood: calm, optimistic, intelligent, exploratory, not triumphant
Color palette: vivid cobalt blue, alpine green, signal orange, warm ivory, very small amounts of near-black
Materials/textures: printed paper, fine stipple, restrained offset registration, crisp route line
Constraints: original composition; one agency marker only; no interface; no text; no numbers; no labels; no logo; no watermark; no gradients; no glossy 3D; no glass; no photorealistic landscape; no achievement trophy; no game reward imagery; preserve large usable negative space
```

## 14. Production conditions

Do not connect this concept to an active route without principal review.

Create optimized AVIF or WebP derivatives before production use.

Keep the PNG as the concept source.

Test the exact desktop and mobile crops.

Test light, dark, and system themes.

Test keyboard, focus, reduced motion, and forced colors.

Record the final asset digest and rights decision.

Keep the active homepage unchanged until this lane is selected.
