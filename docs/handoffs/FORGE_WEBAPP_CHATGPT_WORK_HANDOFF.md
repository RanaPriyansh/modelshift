# FORGE Semester Desk web application handoff for ChatGPT Work

Generated: 2026-08-10 IST

This document records the web application state before the ChatGPT Work transfer.

Verify all Git and release values before implementation. These values can change after this handoff.

## 1. Transfer goal

The receiving task will create one separate Semester Desk web application in ChatGPT Sites.

The application will help a university student rebuild a broken week and complete active learning.

The application will use `/` as its product route.

The public website remains a different Sites project.

## 2. Product contract

The selected direction is `amend_to_semester_desk_v2`.

The primary student job is:

> When my week has broken, help me rebuild from today without hiding what changed, overwhelming me, shaming me, or doing the learning for me.

FORGE is a private and calm university operating system.

The complete loop contains these stages:

1. Create one local Semester Desk.
2. Add courses and course facts manually.
3. Review freshness, changed facts, and conflicts.
4. Review the complete semester in the student-authored order.
5. State and confirm real available capacity.
6. Review each proposed recovery change.
7. Confirm kept, moved, reduced, or deferred work.
8. Choose one next action.
9. Complete protected practice.
10. Complete an independent check.
11. Select a future return date.
12. Complete the delayed return.
13. Review answer-free progress evidence.
14. Export or remove local data.

The product does not rank courses or select work for the student.

The product does not generate answers or claim mastery.

## 3. Repository state at transfer

| Item | State at 2026-08-10 04:39 IST |
| --- | --- |
| GitHub repository | `https://github.com/RanaPriyansh/modelshift` |
| Working branch | `agent/forge-semester-desk-v2-release-20260802` |
| Working branch SHA | `ab020fe702897f6fcc31dd69004ecdec69b37232` |
| Working tree SHA | `4f593c629513be12ad4c9616cdfb06a5a3be53a4` |
| Accepted `main` SHA at observation | `c4abe33bc5bc611a02eded4288e2a2949a2808f3` |
| Draft pull request | `https://github.com/RanaPriyansh/modelshift/pull/5` |
| Pull request state | Open and draft |
| Pull request checks | Running at handoff time |
| Semester Desk v2 production deployment | None verified |
| Accepted ChatGPT Sites web application | None verified |

Pull request `#5` contains the integrated website, web application, iOS application, research, and design records.

The accepted build source is the current `main` revision after an accepted merge.

The master ledger still names an older integrated SHA. Live Git state is the source for revision identity.

## 4. Current application state

The canonical application currently uses `/app` in the combined Next.js release.

The separate Sites application will use `/` and does not need `/app` compatibility.

The current user interface includes:

- First-desk onboarding
- Course creation
- Course facts and freshness
- Fact status changes
- Source-conflict recording and review
- Capacity draft and confirmation
- Visible recovery review
- Kept, moved, reduced, and deferred work
- Next-action selection
- Protected practice
- Independent proof
- Delayed return
- Answer-free progress history
- Exact local JSON download
- Verified local reset
- Malformed-data recovery
- Storage-unavailable recovery
- Offline status
- Keyboard skip navigation
- Focus-contained reset confirmation
- Reduced-motion and forced-colour support

The user interface has six top-level states:

- `loading`
- `onboarding`
- `ready`
- `malformed`
- `blocked`
- `storage-unavailable`

The web application has no functional server, model, university, or cloud-storage dependency.

Product code sends no student-work value to an application API.

The hosting platform can still process normal connection and request metadata.

## 5. Canonical source map

### Application entry and interface

- `app/app/page.release.tsx` provides current `/app` metadata and renders the application.
- `src/components/forge/semester-desk-v2/app/SemesterDeskV2App.tsx` contains the current interface and copy.
- `src/components/forge/semester-desk-v2/app/SemesterDeskV2App.module.css` contains the current responsive visual system.
- `app/globals.css` contains shared web tokens and base styles.
- `app/icon.svg` contains the current product icon.
- `app/manifest.ts` contains the current combined-site manifest.

### Domain and persistence

- `src/forge/semester-desk-v2/types.ts` defines state, limits, commands, and status terms.
- `src/forge/semester-desk-v2/engine.ts` validates state and controls every durable transition.
- `src/forge/semester-desk-v2/index.ts` provides the domain exports.
- `src/lib/forge-semester-desk-v2/persistence.ts` provides the browser adapter and provider interface.

### Product and design authority

- `docs/program/FORGE_MASTER_COMPLETION_LEDGER.md`
- `docs/product/FORGE_SEMESTER_DESK_V2_NATIVE_CONTRACT.md`
- `docs/program/UNIVERSITY_FIRST_PRODUCT_REBASE.md`
- `docs/program/STUDENT_COMMUNITY_ASTRA_AI_AND_FUTURE_RESEARCH.md`
- `docs/design/PRI_TASTE_PROFILE.md`
- `docs/design/PRI_TASTE_EVIDENCE_INDEX.md`
- `docs/design/FORGE_VISUAL_DIRECTION_DECISION.md`
- `docs/design/FORGE_DESIGN_SYSTEM.md`
- `.impeccable/design.json`

### Current tests and release checks

- `src/components/forge/semester-desk-v2/app/SemesterDeskV2App.test.tsx` contains 36 interface tests.
- `src/forge/semester-desk-v2/semester-desk-v2.test.ts` contains 23 engine tests.
- `src/lib/forge-semester-desk-v2/persistence.test.ts` contains 14 persistence tests.
- `src/operations/semester-desk-v2-browser-contract.test.ts` contains three browser-contract tests.
- `tests/e2e/semester-desk-v2-canonical.spec.ts` contains the canonical end-to-end application journey.
- `scripts/ops/verify-semester-desk-v2-release-artifact.ts` checks the release route boundary.
- `scripts/ops/verify-semester-desk-v2-release-budgets.ts` checks current web budgets.
- `next.config.ts` selects `.release.ts` and `.release.tsx` routes in the combined project.

The older university workspaces and historical ModelShift routes are not current product authority.

## 6. State and persistence boundary

The pure engine owns state creation, validation, transition, order, and answer-free progress projection.

The browser adapter has four operations:

- `read`
- `save`
- `exportRaw`
- `reset`

The storage keys are:

```text
forge.semester-desk-v2.v1.active-profile
forge.semester-desk-v2.v1.profile.<encoded-profile-id>
```

The raw stored state limit is `1_048_576` UTF-8 bytes.

The adapter validates identifiers, structure, schema, links, bounds, and profile ownership.

The adapter rejects malformed data without replacing it.

The adapter rejects accessors, sparse arrays, repeated references, invalid prototypes, and oversized input.

Reset removes only the selected profile and verifies that storage removed the value.

Export returns the exact stored JSON, including malformed JSON that needs user review.

The active profile also appears in this URL fragment:

```text
#forge-profile=<profile-id>
```

The fragment does not go to the server.

Direct fragments cannot silently open a different saved profile.

The application serializes writes and blocks a second change during an active save.

The interface reports success only after the durable save succeeds.

## 7. Answer-free learning boundary

Practice notes remain in component memory.

Independent proof responses remain in component memory.

Delayed-return explanations remain in component memory.

These values disappear after navigation or reload.

The persisted state contains outcomes and times only.

Product code does not send student work to an application API.

The product does not let FORGE answer the learning task.

## 8. Origin-bound data risk

Browser `localStorage` belongs to one origin.

A new ChatGPT Sites origin cannot read data from an older Vercel, local, or preview origin.

The current application can export JSON.

The current application cannot import JSON.

Therefore, an existing local desk cannot move automatically to the new Sites origin.

The parity release has no migration path.

The product must not claim automatic migration, restored history, or cross-origin continuity.

An import feature would be a separate product and security change.

That change would need strict schema validation, size limits, consent, conflict behavior, and destructive-action review.

## 9. Visual authority

The selected direction is `Editorial Terrain Recovery`.

The primary rule is `Vivid at thresholds. Quiet during work.`

Use a flat semester ledger for the main desk.

Use a transparent change review for recovery.

Use a quiet focused surface for active study.

The visual system uses warm ivory, forest, cobalt, midnight, and limited learner orange.

Use orange only for a deliberate student commitment.

Use spacing and dividers before containers.

Use 6-pixel and 12-pixel radii.

Keep controls at least 44 pixels high.

Keep form text at least 16 pixels.

Do not use generic gradients, glass effects, card grids, dashboards, mascots, scores, streaks, or progress rings.

Do not use scenic art behind course review, study, proof, progress, or settings.

The current thread contains Pri's design references and accepted visual decisions.

The local visual source folders are outside Git and can be unavailable in ChatGPT Work.

## 10. Product language

Use these course terms:

- `Checked`
- `Needs review`
- `Changed since last check`
- `Not yet confirmed`

Use these action terms:

- `Your choice`
- `Ready to work on`
- `Come back on this date`

Do not expose authority, fixture, protocol, receipt, digest, projection, or claim-boundary terms.

Use hours and minutes for capacity.

Do not use scores, percentages, ranks, or streaks.

## 11. Separate-site contract

The separate web application owns only the Semester Desk experience.

The application root is `/`.

The application settings entry can use `/?section=settings`.

The root manifest uses `start_url: "/"` and `scope: "/"`.

The complete application remains `noindex` until release approval changes this rule.

The environment name for the public website origin is `FORGE_WEBSITE_URL`.

`FORGE_WEBSITE_URL` contains an absolute public website URL.

The FORGE wordmark uses that URL instead of the application root.

The application contains no website route, legal page, or product-marketing route.

The public website uses `FORGE_APP_URL` for its link to this application.

## 12. Current excluded scope

The parity release contains no:

- ChatGPT authentication
- Online account
- D1 database
- R2 storage
- Cloud sync
- Cross-device backup
- Supabase dependency
- OpenAI model dependency
- LMS or university connection
- Automatic course import
- Calendar integration
- Web reminder delivery
- Student-work analytics
- Billing
- Social feature
- Teacher, parent, or administrator surface

Adding any item above changes the product or privacy contract.

## 13. Key decisions and reasons

- Device-local parity comes first because cloud identity changes data ownership and deletion duties.
- The web application remains separate because private study state does not belong in the public website.
- The application uses `/` because it has its own Sites origin.
- The domain engine remains the transition authority because it already enforces the learning and profile rules.
- The persistence interface remains provider-neutral because the interface does not depend on browser storage.
- Malformed data remains unchanged because silent repair can destroy student work.
- Raw answers remain transient because outcomes, not answer text, support the current learning record.
- The full recovery review remains visible because the student controls every change.
- Search indexing remains disabled because this is a private work surface.

## 14. Known traps and dead ends

- The current route file uses `/app`. The separate application root is `/`.
- The current manifest starts at `/app`. That value is wrong for the separate application.
- The current wordmark links to `/`. That link would loop inside the separate application.
- The combined repository contains many retired routes. Copying the full route tree can publish them.
- The current layout contains Vercel-specific identity and nonce behavior. It is not a Sites template.
- Existing Supabase, OpenAI, evaluation, and API code is outside the parity dependency closure.
- The main interface file is large. An early refactor can change behavior before parity passes.
- Two tabs can show stale state because the current app has no cross-tab storage reconciliation.
- A private Sites URL does not prove public release readiness.
- A local build does not prove the deployed source revision.
- A generated interface image is not application implementation or product evidence.
- Forum and social posts are weak signals. They do not prove representative student demand.

## 15. Verification state

The canonical branch contains 73 focused interface, engine, and persistence tests.

The canonical browser journey covers onboarding through delayed return, export, reset, and responsive layouts.

The 73 focused tests and TypeScript checks passed at `ab020fe702897f6fcc31dd69004ecdec69b37232`.

The GitHub web job passed compilation, route checks, unit tests, evaluation, and the local browser contract.

The job then failed because an empty `public/` directory does not exist in a fresh Git checkout.

The release budget verifier currently treats that missing empty directory as an error.

This failure is a release-script defect. It is not a Semester Desk behavior failure.

The GitHub production browser step did not run after that failure.

The GitHub iOS check was still running at handoff time.

No separate Sites web application has exact-source build evidence.

No separate Sites web application has deployed accessibility, performance, header, or security evidence.

No accepted production URL exists.

## 16. Open transfer state

- Accepted `main` source for the Sites task: not yet verified after PR `#5`.
- Separate Sites project: not created in this handoff.
- Application extraction to `/`: not started in the accepted repository.
- `FORGE_WEBSITE_URL` configuration: not set.
- Root manifest conversion: not started.
- Sites-focused tests: not created.
- Responsive screenshots: not captured for a Sites revision.
- Private preview: not created in this handoff.
- Public access: not approved.
- Cross-origin data migration: not implemented.
- Legal, domain, and production-data authority: external decisions.
- Fresh-checkout `public/` budget verification repair: open on the combined release branch.

The application can reach a private parity candidate without cloud, account, legal, or migration changes.
