---
name: FORGE Learning OS
description: A calm source-aware thinking instrument for learner-owned work and bounded evidence
colors:
  paper: "#f7f4ed"
  surface: "#fffdf8"
  surface-strong: "#ece8df"
  ink: "#111714"
  muted: "#5e635f"
  dim: "#6d726b"
  line: "#d4cfc5"
  line-strong: "#aaa59b"
  evidence-cyan: "#185e62"
  evidence-cyan-soft: "#287f82"
  learner-amber: "#7b561a"
  learner-amber-soft: "#e8b94e"
  ai-violet: "#7458bb"
  human-rust: "#a84f27"
typography:
  micro:
    fontFamily: "SFMono-Regular, Consolas, Liberation Mono, monospace"
    fontSize: "0.625rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "SFMono-Regular, Consolas, Liberation Mono, monospace"
    fontSize: "0.6875rem"
    fontWeight: 750
    lineHeight: 1.3
    letterSpacing: "0.1em"
  caption:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  operating:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  intro:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  quote:
    fontFamily: "Georgia, Cambria, Times New Roman, serif"
    fontSize: "1.1875rem"
    fontWeight: 500
    lineHeight: 1.45
  fact:
    fontFamily: "Georgia, Cambria, Times New Roman, serif"
    fontSize: "clamp(1.3125rem, 2.5vw, 1.875rem)"
    fontWeight: 500
    lineHeight: 1.2
  section:
    fontFamily: "Georgia, Cambria, Times New Roman, serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.02
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(2.625rem, 6.2vw, 4.875rem)"
    fontWeight: 760
    lineHeight: 0.95
    letterSpacing: "-0.055em"
  metric:
    fontFamily: "Georgia, Cambria, Times New Roman, serif"
    fontSize: "3rem"
    fontWeight: 500
    lineHeight: 0.9
rounded:
  control: "6px"
  surface: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
    height: "52px"
  status:
    backgroundColor: "transparent"
    textColor: "{colors.evidence-cyan}"
    typography: "{typography.label}"
    rounded: "0"
---

# Design System: FORGE Learning OS

## Overview

**Creative North Star: "The Evidence Workbench"**

FORGE is a calm working surface where questions, sources, learner actions, and evidence can be inspected without decoration impersonating certainty. It combines the plain legibility of a public-service form with the focused quiet of a well-made task instrument. The interface should feel dependable during an overloaded week and precise during protected learning.

The product is light by default because students use it beside documents, course pages, and notes over long sessions. Dark, high-attention instruments can appear inside a bounded learning operation, but the shell remains one coherent paper-and-ink world.

**Key Characteristics:**

- one dominant question or action per viewport
- source and authority states in plain language
- hairlines and spacing before elevated cards
- cyan for evidence, amber for learner action or caution, violet only for AI contribution
- purposeful motion only for state change and focus continuity

## Colors

The palette is cool paper, near-black ink, and three semantic accents whose meaning does not drift.

### Primary

- **Evidence cyan** (`#185e62`): links, focus, reviewed-source state, and evidence-bearing actions

### Secondary

- **Learner amber** (`#7b561a`): learner choice, caution, incomplete review, and support that still requires action
- **AI violet** (`#7458bb`): AI proposal or contribution only, never generic decoration
- **Human rust** (`#a84f27`): accountable human action, escalation, or unresolved consequential conflict

### Neutral

- **Paper** (`#f7f4ed`): page ground
- **Surface** (`#fffdf8`): bounded work surface
- **Surface strong** (`#ece8df`): quiet grouping and unavailable state
- **Ink** (`#111714`): primary text and primary controls
- **Muted** (`#5e635f`): supporting explanation
- **Line** (`#d4cfc5`) and **line strong** (`#aaa59b`): structure without card inflation

### Named Rules

**The Authority Color Rule.** Accent color communicates who or what owns a state. It is never a decorative category label.

## Typography

**Display Font:** incumbent Inter/system sans stack

**Body Font:** incumbent Inter/system sans stack

**Label/Mono Font:** SFMono-Regular/Consolas stack

**Character:** The sans stack keeps operating text neutral and fast to scan. Monospace is reserved for compact source, version, position, and state metadata.

### Hierarchy

- **Display** (760, `2.625rem` to `4.875rem`, `0.95`): the dominant task or question
- **Section** (500, `1.875rem` to `3rem`, `1.02`): major review sections
- **Fact** (500, `1.3125rem` to `1.875rem`, `1.2`): copied facts that require inspection
- **Body / Intro** (400, `1rem` / `1.0625rem`): explanations with a target measure below 75 characters
- **Operating / Small / Caption** (`0.9375rem`, `0.8125rem`, `0.75rem`): controls and supporting state
- **Label / Micro** (`0.6875rem`, `0.625rem`): sparingly used source, authority, and contract metadata

### Named Rules

**The Plain Control Rule.** Buttons and errors use sentence case and name the exact action or recovery.

## Layout

The shell uses a centered maximum width near 1,350px with 32px desktop gutters and 20px mobile gutters. Product work is normally one primary column plus one narrow context column at wide widths. The context column collapses below the primary action on small screens.

Spacing follows the existing 4, 8, 12, 16, 24, 32, 48, and 64px scale. More space appears above a new idea than between the idea and its supporting copy. Dense metadata remains grouped near the fact it qualifies.

At 320 CSS px, every surface becomes one column, interactive targets remain at least 44px, form text remains at least 16px, and no authority meaning depends on side-by-side comparison alone.

## Elevation & Depth

The FORGE shell is flat by default. Depth comes from tonal surfaces, bounded rules, and spatial grouping. Shadows are reserved for an actual overlay or an elevated learning instrument, not routine course facts or list rows.

### Named Rules

**The Flat-by-Default Rule.** A border or tonal shift may establish a surface. Routine containers do not add a second elevation signal.

## Shapes

Controls use a 6px radius and bounded surfaces use a 12px radius. Long review rows and evidence ledgers may remain square when their continuity matters more than containment. Pills are limited to truly compact controls; status text is not styled to resemble a button.

## Components

### Buttons

- **Shape:** compact control radius (`6px`) and minimum 44px target
- **Primary:** ink background, paper text, one dominant action per work surface
- **Hover / Focus:** small color shift or one-pixel tactile movement; 3px cyan focus outline with offset
- **Secondary:** transparent or paper surface with a line-strong border

### Status

- **Style:** small semantic diamond plus sentence-case state text
- **State:** unresolved items remain visually stronger than completed or rejected items
- **Behavior:** status is never presented as a clickable chip

### Cards / Containers

- **Corner Style:** 12px only when containment is meaningful
- **Background:** paper or surface
- **Shadow Strategy:** flat by default
- **Border:** one hairline or one tonal shift, not both plus shadow
- **Internal Padding:** 16px mobile, 24px to 32px desktop

### Inputs / Fields

- **Style:** label above field, paper or transparent background, line-strong boundary
- **Focus:** explicit cyan outline or border shift
- **Error / Disabled:** explain what failed and the next recovery; disabled state never hides why

### Navigation

Desktop navigation remains a single calm line inside the existing shell. Mobile navigation stays fixed to the product’s accepted route set and exposes an icon plus visible text. Local feature work does not silently rename or reorder primary navigation.

### Source Review Ledger

Each candidate shows the copied fact, source label, observation time, freshness, inspected coverage, and learner decision. Accept, correct, and reject actions change extraction state only. Conflicts retain both source claims and route to an explicit learner or accountable-human decision.

## Do's and Don'ts

### Do:

- **Do** show coverage, freshness, and authority where the student makes a decision.
- **Do** preserve unknown, stale, conflicting, rejected, unavailable, and not-tested states.
- **Do** make the next recovery action obvious without fabricating certainty.
- **Do** use progressive disclosure for exact source locators and contract detail.

### Don't:

- **Don't** open on a card-grid dashboard, chatbot, grade forecast, or mastery percentage.
- **Don't** use streaks, badges, decorative status dots, or engagement pressure.
- **Don't** turn learner confirmation into institutional truth.
- **Don't** use violet, gradients, or glow as generic “AI” decoration.
- **Don't** let motion, color, or side-by-side layout carry required meaning alone.
