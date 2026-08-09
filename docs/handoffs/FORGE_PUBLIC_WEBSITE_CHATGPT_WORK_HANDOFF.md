# FORGE public website handoff for ChatGPT Work

Generated: 2026-08-10 IST

This document records the public website state before the ChatGPT Work transfer.

Verify all Git and release values before implementation. These values can change after this handoff.

## 1. Transfer goal

The receiving task will create one separate public website in ChatGPT Sites.

The website will explain FORGE Semester Desk v2 to university students.

The website will send students to a separate Semester Desk web application.

The public website will not contain private Semester Desk state or application logic.

## 2. Product contract

The selected product direction is `amend_to_semester_desk_v2`.

The primary student job is:

> When my week has broken, help me rebuild from today without hiding what changed, overwhelming me, shaming me, or doing the learning for me.

FORGE is a private and calm university operating system.

The public story has these parts:

- Understand the actual semester state.
- See changed or conflicting course information.
- State real available capacity.
- Review all recovery changes before confirmation.
- Choose the next honest action.
- Complete active practice.
- Check understanding independently.
- Return later to check retention.
- Continue without losing context.

Source integrity, privacy, accessibility, and security support the experience.

These foundations must not dominate the public story.

## 3. Repository state at transfer

| Item | State at 2026-08-10 IST |
| --- | --- |
| GitHub repository | `https://github.com/RanaPriyansh/modelshift` |
| Working branch | `agent/forge-semester-desk-v2-release-20260802` |
| Working branch SHA | `ab020fe702897f6fcc31dd69004ecdec69b37232` |
| Working tree SHA | `4f593c629513be12ad4c9616cdfb06a5a3be53a4` |
| Draft pull request | `https://github.com/RanaPriyansh/modelshift/pull/5` |
| Pull request base | `main` |
| Pull request state | Open and draft |
| GitHub checks | Running at handoff time |
| Semester Desk v2 production deployment | None verified |
| Accepted ChatGPT Sites website | None verified |

The pull request contains the integrated public website, web application, native iOS application, research, and design records.

Use the accepted `main` commit as the build source after the pull request merge.

Do not treat this handoff SHA as the final release SHA without a new Git check.

## 4. Existing public implementation

The canonical branch contains a working public website candidate.

The candidate is a source and content reference. It is not a deployed Sites website.

### Route sources

- `app/page.release.tsx` contains home metadata and the home entry.
- `app/how-forge-works/page.release.tsx` contains the product-story route metadata.
- `app/university/page.release.tsx` contains the university route metadata.
- `app/privacy/page.release.tsx` contains the current privacy route metadata.
- `app/terms/page.release.tsx` contains draft terms metadata and `noindex` rules.
- `app/support/page.release.tsx` contains self-service support metadata.
- `app/layout.release.tsx` contains shared metadata and indexing controls.
- `app/robots.ts` contains environment-sensitive search rules.
- `app/sitemap.ts` contains the canonical public sitemap.
- `app/manifest.ts` contains the existing web manifest.

### Public components

- `src/components/forge/semester-desk-v2/public/SemesterDeskV2PublicHome.tsx` contains the current home story.
- `src/components/forge/semester-desk-v2/public/SemesterDeskV2PublicHome.module.css` contains the home visual implementation.
- `src/components/forge/semester-desk-v2/public/product/PublicProductPage.tsx` contains the two product pages.
- `src/components/forge/semester-desk-v2/public/product/PublicProductPage.module.css` contains their visual implementation.
- `src/components/forge/semester-desk-v2/public/policy/PolicyPage.tsx` contains privacy, draft terms, and support content.
- `src/components/forge/semester-desk-v2/public/policy/PolicyPage.module.css` contains their visual implementation.

### Existing public tests

- `src/components/forge/semester-desk-v2/public/SemesterDeskV2PublicHome.test.tsx`
- `src/components/forge/semester-desk-v2/public/product/PublicProductPage.test.tsx`
- `src/components/forge/semester-desk-v2/public/policy/PolicyPage.test.tsx`
- `src/components/forge/semester-desk-v2/public/policy/PublicReleaseSurfaces.test.tsx`
- `scripts/ops/verify-semester-desk-v2-release-artifact.ts`
- `scripts/ops/verify-semester-desk-v2-release-budgets.ts`
- `scripts/ops/verify-public-build-boundary.ts`

The monorepo uses `pageExtensions` to select `.release` route files.

That build method also excludes many retired routes.

The separate Sites project does not need this monorepo build method.

## 5. Separate website route contract

The separate public website has exactly six product routes.

| Route | Purpose |
| --- | --- |
| `/` | Explain the broken-week problem and the Semester Desk promise. |
| `/how-forge-works` | Explain semester truth, recovery, study, proof, and delayed return. |
| `/university` | Explain the university-first product boundary and current limits. |
| `/privacy` | Explain current device-local data behavior and student controls. |
| `/terms` | Show draft terms only after legal review permits publication. |
| `/support` | Give accurate self-service help for the current product. |

Accessible error and not-found surfaces are also required.

Robots, sitemap, manifest, icon, and social metadata are required technical surfaces.

The separate public website does not own an `/app` route.

All application actions must use an absolute URL from `FORGE_APP_URL`.

The website must show an honest unavailable state when `FORGE_APP_URL` is absent or invalid.

The app link must preserve approved application query parameters, such as `?section=settings`.

## 6. Content truth

The website can make these statements:

- FORGE helps a student make a difficult semester state visible.
- FORGE keeps each proposed recovery change visible before confirmation.
- The student states available capacity.
- The student selects the next action.
- Protected study keeps the learning action with the student.
- Independent proof checks understanding without instructional help.
- A delayed return checks retention after time has passed.
- The current web application uses browser-local data.
- The web and iPhone applications do not currently sync.
- The current web application does not send reminders.
- FORGE does not connect to a university system.

The website must not invent these statements:

- Product efficacy
- User counts
- Revenue
- Pricing
- University approval or integration
- Online accounts
- Cloud backup
- Cross-device sync
- Reminder delivery
- Live course imports
- Monitored customer support
- Testimonials
- Security or compliance certifications

Use direct student terms:

- `Checked`
- `Needs review`
- `Your choice`
- `Changed since last check`
- `Not yet confirmed`
- `Ready to work on`
- `Come back on this date`

Do not expose internal protocol, authority, fixture, receipt, or evidence vocabulary.

## 7. Privacy, legal, and support state

The current web application stores a random local profile identifier and Semester Desk data in browser storage.

The current web application does not save raw practice notes or independent answers to browser storage.

Browser data can be unavailable or removed.

The privacy page must state these limits in direct language.

The terms content is a product-use draft.

Legal review is required before public publication.

The terms route must remain private and `noindex` until legal approval exists.

The current support model is self-service only.

The website has no monitored email, chat, form, or ticket channel.

Do not create a contact method or collect support content.

## 8. Visual authority

The selected direction is `Editorial Terrain Recovery`.

The primary rule is `Vivid at thresholds. Quiet during work.`

Use these repository sources:

- `docs/design/PRI_TASTE_PROFILE.md`
- `docs/design/PRI_TASTE_EVIDENCE_INDEX.md`
- `docs/design/FORGE_VISUAL_DIRECTION_DECISION.md`
- `docs/design/FORGE_DESIGN_SYSTEM.md`
- `.impeccable/design.json`

The current thread also contains Pri's design references and accepted visual decisions.

Use those thread references as visual authority when ChatGPT Work can access them.

The visual system uses warm ivory, forest, cobalt, and limited learner orange.

Use editorial hierarchy, restrained depth, precise borders, and moderate density.

Use terrain art only at a meaningful threshold.

Avoid card groups as the default layout.

Avoid generic AI gradients, glass effects, mascots, dashboards, and chatbot-first composition.

Generated design boards are references only.

Do not present a generated application image as product evidence.

Use real application screenshots only after the separate web application exists and passes final verification.

## 9. Product and research sources

These files contain the current product and research context:

- `docs/product/FORGE_SEMESTER_DESK_V2_NATIVE_CONTRACT.md`
- `docs/program/FORGE_MASTER_COMPLETION_LEDGER.md`
- `docs/program/UNIVERSITY_FIRST_PRODUCT_REBASE.md`
- `docs/program/STUDENT_COMMUNITY_ASTRA_AI_AND_FUTURE_RESEARCH.md`
- `.codex/research/forge-university-second-brain-2026-8ad330c7.json`
- `.codex/research/forge-student-forums-astra-ai-future-2026-a8e9bd25.json`

The research supports the product direction.

The research does not prove efficacy, market demand, or production readiness.

The receiving task needs one bounded current validation pass.

It does not need another open-ended market study.

## 10. Architecture decisions

The public website and Semester Desk web application are separate Sites projects.

The public website contains no private study state.

The web application owns browser-local student data and all interactive learning flows.

`FORGE_APP_URL` is the only required website-to-application link source.

A separate site-origin value can support canonical metadata and social URLs.

Use the environment name selected by the Sites implementation.

Do not hard-code a temporary Sites URL in source.

Keep the deployment private until Pri approves public access and legal text.

## 11. Known traps

- The current monorepo links application actions to the internal `/app` route.
- Those links must become absolute environment-backed links in the separate website.
- The current manifest uses `/app` as its start URL.
- The separate public website manifest must use `/`.
- The monorepo contains retired routes and internal experiments.
- Do not copy those routes into the public Sites project.
- The current terms copy is not legal approval.
- The current support page is not a monitored support service.
- A private Sites URL is not public-release approval.
- A generated screen is not a real application screenshot.
- A local build does not verify the deployed source revision.
- Forum comments are weak signals and cannot establish representative student demand.

## 12. Verification state

The canonical branch contains focused public component tests.

The larger web test gate passed locally before the current receipt repair.

GitHub checks for `ab020fe702897f6fcc31dd69004ecdec69b37232` were running at handoff time.

No separate Sites website has exact-source build evidence.

No separate Sites website has responsive, accessibility, SEO, performance, or security evidence.

No final web-application screenshots are bound to an accepted app revision.

No public deployment is approved.

## 13. External decisions and gates

The following decisions remain outside the website implementation:

- Final public domain
- Public access approval
- Legal approval for the terms and policy copy
- A monitored support channel, if Pri later creates one
- The final separate web-application URL

The website can reach a private release-candidate state without these decisions.

The website cannot reach a public-release state without the required approvals.

