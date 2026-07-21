# ModelShift Design Fidelity Ledger

## Reference

The implementation-grade concept is `docs/design/modelshift-concept.png`, generated during the build through OpenAI ImageGen under Codex direction. It establishes a visual and interaction grammar, not a pixel-exact three-column application layout.

Core visual meanings:

- **violet:** learner interpretation, uncertainty, and committed evidence;
- **teal:** deterministic experiment, validated boundaries, and proof mode;
- **warm gold:** velocity traces, selected evidence, and consequential learner action;
- **dark navy:** focused learning world rather than a dashboard or chat surface.

## Fidelity map

| Concept element | Implementation | Status and rationale |
| --- | --- | --- |
| Three-act sequence: Mystery → Deciding Experiment → Cold Transfer | `ModelShiftExperience.tsx` stage rail and sequential screens | **Preserved, expanded.** Seven visible steps make learner commitments and reconstruction explicit while keeping the same three-act arc. |
| Direct opening on “The engine is off. What happens next?” | `PredictionStage`, `MysteryWorld.tsx` | **Preserved.** There is no marketing page, LMS dashboard, or chat introduction. |
| Frozen craft, cutoff marker, force/velocity distinction | `MysteryWorld.tsx` | **Preserved.** Repository-authored SVG/CSS replaces the concept illustration; force and velocity retain distinct visual encoding and text labels. |
| Four prediction rows plus confidence and commitment | `PredictionStage` | **Preserved.** Native radio controls and a labelled range input add semantics and keyboard access. |
| Learner phrase becomes evidence | `InterpretationStage` blockquote | **Preserved.** Only a verbatim validated span is shown for model output; fallback uses cautious authored handling. |
| Two provisional models, not a definitive diagnosis | hypothesis cards and “provisional reading” copy | **Preserved.** The UI may show up to two selected cards and explicitly warns that interpretation can be wrong. |
| Evidence → models → selected experiment compilation | `.compiler-flow` | **Preserved.** Responsive CSS turns the horizontal concept into a vertical sequence on narrow screens without changing causality. |
| Teal deterministic experiment frame | `ExperimentStage`, `ExperimentWorld.tsx` | **Preserved.** The section identifies the tested-code boundary and consumes precomputed physics samples. |
| Friction control and two-track contrast | `friction_contrast` / `neutral_core_probe` rendering | **Preserved with governance.** The control locks after the run so the observation corresponds to committed parameters. |
| Force and velocity graphs beneath the world | `LineGraph.tsx` within `ExperimentWorld.tsx` | **Preserved.** Graphs use analytical sample data and include accessible descriptions. |
| Attention question after a committed attempt | probe prediction plus authored Level-1 support | **Adapted.** Probe prediction occurs before the run; conceptual support appears only after an attempt and code authorization. |
| Distinct adaptive experiments | four authored probe IDs and renderer branches | **Expanded.** The implementation supports friction contrast, brief/continuous push, zero-force starting-velocity contrast, and neutral baseline rather than only the hero friction view. |
| Dedicated reconstruction step | `ReconstructionStage` causal chain | **Added from governing spec.** The static concept compresses this act; the product requires the learner to articulate net force → acceleration → velocity before proof. |
| Quieter proof surface with “AI assistance is now off” | `ProofStage`, `.app-shell--proof`, `.proof-lock` | **Preserved.** Help, replay, and interpretation surfaces are structurally absent rather than merely disabled. |
| Force-time prompt and velocity-time choices | `ForceTimeGraph`, `TransferGraphChoice` | **Preserved.** The graph problem is a new representation with authored options. |
| Explanation plus “Submit once” | `ProofStage` | **Preserved.** Native controls and reducer policy enforce one submission; “I don't know” remains valid. |
| Evidence preview beneath proof | `ResultStage` after submission | **Intentionally moved.** Evidence is not previewed before submission, avoiding scoring cues; the final card appears only after the locked attempt. |
| Before / Test / Support / Alone / Later | `deriveEvidenceCard` and `ResultStage` | **Preserved.** `Later` is always “not tested yet,” and no mastery score appears. |
| Dense desktop triptych | sequential responsive application | **Intentionally changed.** One stage at a time reduces cognitive load, preserves readable graphs, and fits 390×844 without shrinking the entire experience. |
| Decorative spacecraft artwork | repository-authored abstract craft/world SVG | **Simplified.** Visual clarity and original assets took precedence over decorative fidelity. |

## Interaction decisions not visible in the static concept

- A typed reducer owns stage transitions and rejects skipped gates.
- The interpretation has loading, failure, and neutral fallback states.
- “I genuinely don't know” is supported without penalty.
- Authored support is requested, authorized, consumed, and counted separately.
- The friction renderer consumes deterministic precomputed trajectories.
- The page includes a skip link, stage announcement, semantic fieldsets, focus styles, reduced-motion CSS, and text alternatives.
- The result explains the narrow meaning of the evidence and rejects broad mastery claims.

## Explicit visual cuts

The implementation does not include a separate marketing hero, sidebar, dashboard, chat bubbles, badges, celebratory confetti, custom logo illustration, stock photography, external icon library, share card, or second visual skin. Those elements do not strengthen the initial-model → experiment → independent-proof sequence.

## Deterministic deviations from the concept image

The generated concept image is a visual reference, not a source of physics truth. Its illustrative `12 m/s` cutoff and decorative graph geometry were intentionally superseded. The implemented mystery derives its displayed `3 m/s` cutoff and `0 N` post-cutoff force from the tested scenario contract; the transfer prompt and answer traces derive their `4 N`, `1 s`, `5 s`, and velocity paths from the analytical engine. Experiment craft endpoints and graph axes likewise derive from sampled trajectories rather than fixed CSS positions or hand-drawn values.

## Final fidelity verification

A side-by-side inspection of `docs/design/modelshift-concept.png` and the public release at `https://modelshift.vercel.app` was completed on 2026-07-22. The visual grammar, hierarchy, three-act arc, provisional interpretation language, graph readability, deterministic-world emphasis, and quiet proof surface are preserved; the exact illustrative physics values are intentionally corrected as described above. Local and public Playwright pass the full fallback journey at 1440×900 and 390×844, plus desktop keyboard-only completion, adaptive fixture, timeout, reload reset, reduced motion, proof-lock, overflow, and console checks. No console warning or error was observed in the final public landing-page inspection.
