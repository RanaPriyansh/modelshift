# FORGE Phase 2 Implementation Queue

## Status

- Planning base: `c6196ec9aa0651a20c765adb72af29d09459d894`
- Design source: `FORGE Terrain`
- Editable design source: Paper
- Token source: DTCG JSON
- Deployment authority: none

This queue starts after the Paper foundation board is usable.

## Work queue

| Order | Surface | Task | Evidence gate |
| --- | --- | --- | --- |
| 1 | Shared | Record the Phase 2 base and canonical surface manifest. | Record source revisions and all canonical routes. |
| 2 | Shared | Apply Terrain tokens, themes, and production typography. | `pnpm design:tokens:check` passes. Remove conflicting legacy fonts. |
| 3 | Shared | Implement semantic state and component contracts. | Tests cover all 15 shared states. Do not use color as the only signal. |
| 4 | Main site | Implement the public shell and Horizon layout. | Keyboard use works at 320 CSS pixels in Light and Dark. |
| 5 | Web app | Implement the application shell and focus shell. | Navigation uses Today, Paths, Projects, Evidence, and Account. |
| 6 | iOS | Create the native application source and shell. | A simulator build passes with four native tabs. |
| 7 | Main site | Implement `/` and `/start`. | The learner approves, revises, rejects, or saves the proposed path. |
| 8 | Main site | Implement `/paths` and `/paths/[slug]`. | Each path shows review state, effort, proof, return, and limits. |
| 9 | Web app | Implement Today and goal management. | Today shows one action, reason, time, support, source state, and stop option. |
| 10 | Web app | Implement path detail and the action brief. | Drafts remain after recoverable storage or network failures. |
| 11 | Web app | Implement Attempt, Repair, and Proof. | Protected proof has no instructional-help action. Save and exit remains available. |
| 12 | Web app | Implement the return queue and protected return. | Tests cover upcoming, due, expired, submitted, and invalid states. |
| 13 | iOS | Implement Welcome, Clarify, Preview, Today, Paths, and Action brief. | Dynamic Type and manual VoiceOver order checks pass. |
| 14 | iOS | Implement Attempt, Repair, Proof, and Protected return. | Reduce Motion preserves state. A haptic follows only a learner commitment. |
| 15 | All | Implement trust and evidence surfaces. | Show claims, conditions, support, reviewers, versions, limits, and corrections. |
| 16 | Web and iOS | Implement project collections and workspaces. | Keep sources, AI use, artifacts, and provenance visible. |
| 17 | Main site | Implement method, coverage, resources, and pricing pages. | Show exact availability and age-policy states. Record image provenance. |
| 18 | Web and iOS | Implement sign-in, library, settings, sync, and data controls. | Test local continuity, failures, recovery, withdrawal, sync, and deletion. |

## Phase exit gates

Run these checks:

1. `pnpm design:tokens:check`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`
6. `pnpm test:e2e`

Capture all canonical web routes at desktop and 320 CSS pixels.

Test keyboard focus, Forced Colors, Reduce Motion, Light, and Dark.

Test all native iOS screens in a simulator.

Record Dynamic Type, VoiceOver order, Reduce Motion, 44-point targets, and offline restoration.

Do not add compatibility redirects.

Complete destination parity first.

Then remove legacy routes and legacy internal links.

Do not use local evidence as production proof.

Do not use local evidence as accessibility-conformance proof.

Do not use local evidence as child-safety or learning-efficacy proof.
