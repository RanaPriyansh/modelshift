# FORGE Visual System Fidelity Ledger

Status: production slice acceptance record

Reference: <https://forge-design-lab.priyansh-rana.chatgpt.site/>

Reference capture: Chromium at 1440 x 900 and 390 x 844 on 2026-07-22

Implementation surface: the committed FORGE shell and home route; active Learning World behavior and truth contracts remain unchanged

## Scope contract

The reference supplies the visual and interaction language. The existing education app remains authoritative for product copy,
planner fields, reviewed World inventory, safety boundaries, and evidence behavior. This slice therefore adopts the reference's
system rather than cloning its prototype fixtures or replacing working product controls.

## Production tokens and primitives

- Quiet paper `#f7f4ed`, paper surface `#fffdf8`, ink `#111714`, and instrument black `#080d12`.
- Evidence teal `#287f82`, AI violet `#7458bb`, learner amber `#e8b94e`, and explicit text labels so color is never the only signal.
- A shared spacing scale from 4 to 64 CSS pixels, 6/12 CSS pixel radii, 44 CSS pixel target floor, and 16 CSS pixel input floor.
- Reusable `ForgeKicker`, `ForgeStatus`, `ForgeTrustLine`, and `ForgeSectionHeading` React primitives.
- A dedicated system stylesheet layered over feature-specific World CSS so the shell can evolve without re-skinning deterministic instruments.

## Fidelity map

| Comparison point | Reference evidence | Rendered implementation | Disposition |
| --- | --- | --- | --- |
| Palette and surface rhythm | Warm paper shell alternates with near-black question/protocol instruments | Shell uses the sampled paper/ink values; planner and learning contract use instrument black | **Preserved** |
| First viewport composition | Large question-led statement beside a dark, bounded input instrument | Existing product question remains dominant beside the complete working planner | **Preserved with product controls retained** |
| Brand and global navigation | Linear diamond mark, quiet wordmark, compact navigation, persistent mobile rail | Mark is a code-native accessible decorative SVG; nav targets are at least 44 px and the mobile rail is fixed | **Preserved** |
| Typography | Tight modern sans for institutional display and interface labels | Shell display is modern system sans with disciplined weight/tracking; monospace remains for evidence/provenance | **Preserved** |
| Learning World catalog | Bordered cards, evidence status, generous internal whitespace, open desktop grid | Six honest catalog entries render as 3/2/1-column cards with named status and teal/quiet rails | **Preserved and expanded to real inventory** |
| Flat container model | Borders and rails carry hierarchy; no glass, gradients, or ambient effects | Cards, planner, continuity rail, and protocol band use flat color and one-pixel boundaries | **Preserved** |
| Responsive behavior | Single-column mobile composition, fixed global rail, no scaled-down desktop canvas | At 320 px, planner choices, catalog, continuity, foundations, and projects recompose to one column with zero horizontal overflow | **Preserved and verified narrower than reference** |
| Keyboard and focus | Component lab requires keyboard, named states, and 44 px targets | Skip link moves focus to `main`; native textarea/radio controls are keyboard-operable; visible focus uses a 3 px evidence-teal outline | **Preserved and verified** |
| Reduced motion and contrast | Decorative transitions disappear while evidence remains; access is not withdrawn | Reduced-motion mode leaves no duration above 1 ms; `prefers-contrast` and forced-colors layers strengthen system boundaries | **Preserved and extended** |
| Active Learning Worlds | Reference describes darker, progressively assembled instruments | World frame keeps the existing dark deterministic visual/runtime contract; this slice changes no correctness or proof behavior | **Intentionally isolated** |

## Above-the-fold copy diff

The reference copy (`Follow a question. Build a capability.`) is not copied into the product. The education app retains its
governing first question (`What do you want to understand?`), supporting sentence, full planner labels, and CTA. No new product
claim, badge, metric, or proof language was introduced. This is an intentional product-fidelity decision, not an unreviewed visual deviation.

## Verification evidence

- Browser identity, meaningful DOM, clean fresh-tab console, and screenshots checked at 1440 x 900 and 320 x 800.
- Browser keyboard path checked: first Tab focuses `Skip to main content`; Enter focuses `#forge-main`.
- Automated 320 px checks cover horizontal overflow, six-card reflow, mobile navigation, 44 px targets, and 16 px form text.
- Automated keyboard check types a learner question and changes the native age-mode radio state.
- Automated reduced-motion check finds no authored animation or transition duration above 1 ms and confirms the learning contract remains visible.

## Intentional deviations and residual risk

- The app keeps six catalog entries and the full typed planner instead of the reference fixture's four cards and example-question chips.
- System fonts replace any unavailable prototype font files; no reference asset is hotlinked.
- Chromium is the rendered browser under test. Safari/Firefox and external screen-reader sessions were not run in this slice.

Final result: passed.
