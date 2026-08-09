# ChatGPT Work prompt: Build the separate FORGE Semester Desk web application in Sites

Use this prompt in one ChatGPT Work task.

You own the separate FORGE Semester Desk web application.

Build this application in ChatGPT Sites.

Do not build the public website in this task.

Do not edit the native iOS application.

The current thread contains the complete FORGE history and Pri's design references.

Use the thread designs as visual authority.

Use `https://github.com/RanaPriyansh/modelshift` as the source repository.

Treat the current accepted `main` revision as the only build baseline.

Do not assume that the SHA in this prompt remains current.

## Product goal

Build a calm, private university Semester Desk.

The main student job is:

“When my week has broken, help me rebuild from today without hiding what changed, overwhelming me, shaming me, or doing the learning for me.”

The application must help the student understand the semester and continue active learning.

The application must preserve student control.

## Operating rules

Complete the work in this task.

Do not stop after research, planning, extraction, or a local build.

Use short checkpoints and keep the repository clean.

Do not publish the site publicly without explicit public-access authority.

A private Sites preview is permitted.

Do not use production student data.

Do not record secrets, tokens, or temporary repository credentials.

Do not invent claims, users, prices, integrations, testimonials, or certifications.

Ask at most three grouped questions when the answers are not already in the thread.

Question one covers the stable application origin and migration expectations.

Use a stable private preview and no migration as the default.

Question two covers whether export is a record or a restore mechanism.

Use export as a record only because import does not exist.

Question three covers whether the first release remains strictly device-local.

Use strict device-local parity as the default.

Do not block implementation when these safe defaults apply.

## Phase 1: Audit the accepted source

Fetch the repository and inspect current `main` before any edit.

Record the exact source SHA and tree SHA.

Check pull request `#5` only if Semester Desk v2 is absent from `main`.

Do not treat an open draft pull request as accepted source.

Read `AGENTS.md` before any change.

Read these product and design files completely:

- `docs/handoffs/FORGE_WEBAPP_CHATGPT_WORK_HANDOFF.md`
- `docs/program/FORGE_MASTER_COMPLETION_LEDGER.md`
- `docs/product/FORGE_SEMESTER_DESK_V2_NATIVE_CONTRACT.md`
- `docs/program/UNIVERSITY_FIRST_PRODUCT_REBASE.md`
- `docs/program/STUDENT_COMMUNITY_ASTRA_AI_AND_FUTURE_RESEARCH.md`
- `docs/design/PRI_TASTE_PROFILE.md`
- `docs/design/PRI_TASTE_EVIDENCE_INDEX.md`
- `docs/design/FORGE_VISUAL_DIRECTION_DECISION.md`
- `docs/design/FORGE_DESIGN_SYSTEM.md`
- `.impeccable/design.json`

Read these implementation files completely:

- `app/app/page.release.tsx`
- `app/manifest.ts`
- `app/globals.css`
- `src/components/forge/semester-desk-v2/app/SemesterDeskV2App.tsx`
- `src/components/forge/semester-desk-v2/app/SemesterDeskV2App.module.css`
- `src/forge/semester-desk-v2/types.ts`
- `src/forge/semester-desk-v2/engine.ts`
- `src/forge/semester-desk-v2/index.ts`
- `src/lib/forge-semester-desk-v2/persistence.ts`

Read these tests completely:

- `src/components/forge/semester-desk-v2/app/SemesterDeskV2App.test.tsx`
- `src/forge/semester-desk-v2/semester-desk-v2.test.ts`
- `src/lib/forge-semester-desk-v2/persistence.test.ts`
- `src/operations/semester-desk-v2-browser-contract.test.ts`
- `tests/e2e/semester-desk-v2-canonical.spec.ts`

Inspect the current Sites runtime and project instructions.

Identify the smallest self-contained application dependency closure.

Do not copy the complete monorepo route tree.

## Phase 2: Collect requirements with traceability

Create `docs/FORGE_WEBAPP_REQUIREMENTS_LEDGER.md` inside the Sites project.

Give each requirement a stable identifier.

Use these groups:

- Product
- Learning
- Data
- Privacy
- Security
- Accessibility
- Visual design
- Responsive behavior
- Performance
- Sites integration
- Release evidence

Record these fields for each requirement:

- Identifier
- Exact source
- Requirement
- Priority
- Acceptance test
- Implementation location
- Evidence
- State

Mark each item as `required`, `excluded`, `external`, or `open`.

Do not convert an old experiment into a current requirement.

Do not convert research evidence into product proof.

Use this authority order when sources conflict:

1. This prompt and the current user instruction
2. Current accepted `main` behavior and focused tests
3. The current product contract
4. The visual direction and Pri's taste evidence
5. Current bounded research
6. Historical experiments for context only

Record each conflict and its resolution.

Ask Pri only about a decision that changes privacy, public claims, or irreversible release behavior.

Continue with the safe parity decision for all routine implementation choices.

## Phase 3: Run one bounded current research pass

Limit this pass to 60 minutes and 20 useful sources.

Do not repeat the broad market or Astra AI research already in the repository.

Create `docs/FORGE_WEBAPP_CURRENT_RESEARCH.md`.

Use this research brief as one bounded mission:

FORGE Semester Desk is a device-local university web application that helps a student recover a broken week and complete active learning. Research the current implementation constraints as of 2026-08-10 to answer one question: what must the separate ChatGPT Sites application preserve or change for a safe, accessible, and credible parity release? Find: (1) current official Sites, vinext, Next.js, and Cloudflare limits for routing, environment values, manifests, headers, caching, and deployment; (2) browser-storage origin rules, quotas, private-mode failures, export limits, and safe local-only disclosures; (3) current WCAG 2.2 guidance for forms, dialogs, errors, focus, reflow, reduced motion, and forced colours; (4) primary learning-science support for retrieval practice and delayed return without efficacy overclaims; and (5) student language about broken weeks, overwhelm, privacy, planner burden, and AI shortcut concerns. Use official documentation, standards, and papers first. Treat Reddit, X, student forums, and product reviews as weak signals only. Use short natural-language searches that students use. Record each weak signal with its date, URL, context, and limitations. Separate confirmed facts, inference, and unresolved uncertainty. Corroborate each important claim when independent sources exist. List gaps, contradictions, and single-source claims. Run one final gap search before completion. For each finding, give the source link, claim, confidence, and why it changes a requirement. Output all results in the single markdown file named above.

Update the requirements ledger only when research changes an implementation requirement.

Do not add a feature because one forum comment requests it.

## Phase 4: Create the separate Sites application

Create one independent Sites project for the web application.

Use the Sites starter and supported runtime.

Place the complete Semester Desk at `/`.

Do not keep an `/app` compatibility route.

Keep the public website in its separate Sites project.

Keep both projects free of cross-project source imports.

Use standard route files in the Sites project.

Do not copy the monorepo `.release.tsx` routing mechanism.

Add real loading, error, unavailable, recovery, and not-found states.

Remove all starter content and unused starter dependencies.

Use a root manifest with these values:

- `start_url: "/"`
- `scope: "/"`
- `display: "standalone"`
- FORGE name, icon, theme, and description

Keep the complete application excluded from indexing.

Use page metadata and an effective `X-Robots-Tag: noindex, nofollow` response where supported.

Use `FORGE_WEBSITE_URL` for the absolute public website origin.

Validate `FORGE_WEBSITE_URL` before use.

Require HTTPS outside local development.

Use the public website URL for the FORGE wordmark and policy links.

Do not hard-code a temporary Sites URL.

Show an honest unavailable state if the website URL is invalid.

The public website will use `FORGE_APP_URL` for this application URL.

## Phase 5: Preserve the complete product loop

Preserve local profile onboarding.

Preserve manual course creation.

Preserve fact source labels, freshness, and status.

Preserve conflict recording and review.

Preserve the student-authored course and work order.

Preserve capacity as a draft until confirmation.

Use hours and minutes in the interface.

Preserve every recovery choice before confirmation.

Preserve kept, moved, reduced, and deferred outcomes.

Do not choose work for the student.

Preserve next-action selection.

Preserve protected practice.

Preserve independent proof.

Preserve future delayed-return scheduling.

Block a delayed return before its due time.

Preserve answer-free progress evidence.

Preserve exact JSON export.

Preserve confirmed local reset.

Preserve offline local operation after the application loads.

Preserve entered form state after a failed save.

Report success only after the save succeeds.

## Phase 6: Preserve the data boundary

Keep the parity release browser-local.

Keep D1 disabled.

Keep R2 disabled.

Do not add ChatGPT authentication.

Do not add Supabase or another data provider.

Do not add cloud sync or backup.

Do not send student work to an application API.

Do not claim that the hosting platform collects no connection or request metadata.

Keep the persistence interface provider-neutral.

Preserve these storage keys exactly:

```text
forge.semester-desk-v2.v1.active-profile
forge.semester-desk-v2.v1.profile.<encoded-profile-id>
```

Preserve the `1_048_576` UTF-8 byte state limit.

Preserve identifier, string, array, depth, and structure limits.

Preserve profile ownership checks.

Preserve fail-closed reads and writes.

Do not repair, replace, or discard malformed storage automatically.

Keep malformed bytes available for exact export before reset.

Preserve reset verification.

Preserve the active profile fragment or document one equally safe replacement.

Do not let a copied fragment open another local profile silently.

Serialize storage operations.

Block duplicate actions while one save is active.

Keep practice notes in process memory only.

Keep independent proof responses in process memory only.

Keep delayed-return explanations in process memory only.

Do not persist these three answer fields.

Do not include raw answers in progress evidence or export.

## Phase 7: Disclose the origin boundary

State that browser data belongs to this site and browser.

State that a new Sites origin cannot read data from an older origin.

State that the current product has export but no import.

Do not claim automatic migration or restored history.

Do not build an import feature in this parity task.

Record this limitation in settings and release evidence.

## Phase 8: Apply Pri's visual direction

Use `Editorial Terrain Recovery`.

Use the thread designs and repository taste files as visual authority.

Use `Vivid at thresholds. Quiet during work.` as the main rule.

Use a flat editorial ledger for the semester.

Use a clear change review for recovery.

Use a quiet work surface for study and proof.

Use warm ivory, forest, cobalt, midnight, and limited learner orange.

Use orange only for a deliberate student commitment.

Use spacing and dividers before cards.

Use restrained 6-pixel and 12-pixel radii.

Use one clear visual hierarchy.

Keep controls at least 44 pixels high.

Keep form text at least 16 pixels.

Use semantic HTML and native controls where possible.

Keep scenic art out of course review, study, proof, progress, and settings.

Do not use generic AI gradients, glass effects, card grids, or chatbot layouts.

Do not use mascots, robots, scores, streaks, ranks, percentages, or progress rings.

Do not ship a generated screenshot as the interface.

Use generated art only when it has a real semantic and accessible role.

## Phase 9: Keep the product language honest

Use these course states:

- `Checked`
- `Needs review`
- `Changed since last check`
- `Not yet confirmed`

Use these action states:

- `Your choice`
- `Ready to work on`
- `Come back on this date`

Do not expose internal protocol, fixture, receipt, authority, or digest terms.

Do not claim mastery, efficacy, university truth, reminders, accounts, backup, or sync.

State that the web application sends no reminder.

State that web and iPhone data do not sync.

## Phase 10: Test observable behavior

Port all 73 focused interface, engine, and persistence tests.

Adapt the canonical browser journey to the separate `/` route.

Remove the public-route loop from the web-application browser suite.

Add focused tests for the separate-site URL contract.

Add focused tests for the root manifest and `noindex` behavior.

Test normal, empty, loading, error, recovery, and offline states.

Test storage denial, malformed JSON, oversized JSON, and profile mismatch.

Test hostile object input where the runtime permits it.

Test exact export and verified reset.

Test that raw practice, proof, and return text never enters storage.

Test reload, back, forward, hash navigation, and direct fragments.

Test duplicate-action blocking during an active save.

Test delayed-return time boundaries.

Test one complete student journey from onboarding through retained return.

Test this journey at these viewport widths:

- `1440`
- `1280`
- `430`
- `390`
- `320`

Check horizontal overflow and clipped content at each width.

Use keyboard-only navigation for the complete critical journey.

Check headings, landmarks, names, descriptions, errors, and live regions.

Check reset-dialog focus containment and focus return.

Check screen-reader semantics with the strongest available tool.

Check reduced-motion behavior.

Check forced-colour behavior.

Check visible focus and contrast.

Check offline use after the first load.

Check that product code makes no student-data API request.

Do not treat normal document or asset requests as student-data API traffic.

Check console errors, page errors, hydration errors, and broken links.

## Phase 11: Verify security and performance

Use the current supported Sites header mechanism.

Verify effective deployed headers, not configuration text only.

Include an equivalent protection for these controls where supported:

- Content type sniffing
- Frame embedding
- Referrer data
- Browser permissions
- HTTPS transport
- Cross-origin isolation boundaries
- Search indexing

Use a restrictive Content Security Policy when Sites supports it safely.

Do not weaken the application to satisfy a header test.

Record every platform-controlled header that Sites cannot set.

Run dependency and secret scans.

Confirm that no credentials enter client assets.

Confirm that no source map publishes private source unexpectedly.

Run a production build.

Measure the production route at `390` pixels.

Record JavaScript, CSS, image, and total transfer sizes.

Record Lighthouse or equivalent performance evidence.

Target a mobile performance score of at least 90.

Target `LCP <= 2.5 s`, `CLS <= 0.1`, and `TBT <= 200 ms` in the recorded lab run.

Explain any unavailable field metric.

Do not claim field Core Web Vitals from a lab test.

## Phase 12: Use an iterative rendered review

Render every major application state.

Capture screenshots at `1440`, `1280`, `430`, `390`, and `320` pixels.

Compare each screenshot with Pri's taste evidence.

Score hierarchy, clarity, calm, density, type, spacing, interaction, accessibility, and mobile fit.

Repair the highest-impact discrepancy.

Render and test the repaired state again.

Keep a change only when the score or observed experience improves.

Repeat until no material internal defect remains.

## Phase 13: Commit, push, and leave exact evidence

Create `docs/FORGE_WEBAPP_RELEASE_EVIDENCE.md` in the Sites project.

Record these items:

- Accepted source repository and source SHA
- Sites project source repository
- Sites source commit SHA
- Exact build command and result
- Exact test commands and counts
- Lint and typecheck results
- Browser journey result
- Accessibility checks
- Responsive screenshot paths
- Performance measurements
- Effective security headers
- Dependency and secret-scan results
- Environment variable names without secret values
- Private preview URL and access state
- Known limitations
- External gates

Bind all evidence to one exact clean commit.

Commit and push the complete Sites source.

Keep the final Git state clean.

Create a private preview from the exact pushed commit when Sites permits it.

Do not make the site public without explicit authority.

## Required acceptance gates

Do not call the task complete until all applicable gates pass.

- The current accepted `main` revision was audited before editing.
- The requirements ledger contains complete source-to-test traceability.
- The bounded research file contains source links and confidence labels.
- One independent Sites project owns only the web application.
- The Semester Desk opens at `/`.
- The root manifest starts at `/`.
- The application remains `noindex`.
- `FORGE_WEBSITE_URL` controls the public website link.
- All 73 focused parity tests pass.
- The adapted end-to-end journey passes.
- Profile isolation fails closed.
- The 1 MiB state limit remains enforced.
- Malformed local data remains unchanged.
- Exact export and verified reset work.
- Raw answer text never enters storage or network traffic.
- The complete recovery and learning loop works.
- The origin-bound data limitation is visible and documented.
- The interface passes at `1440`, `1280`, `430`, `390`, and `320` pixels.
- Keyboard and screen-reader semantics pass.
- Reduced motion and forced colours pass.
- The production build has no console or hydration error.
- Effective security headers were verified.
- Performance evidence meets the targets or records a real blocker.
- The exact source was committed and pushed.
- The private preview uses the same source revision.
- The release evidence names each remaining external gate exactly.

## Excluded scope

Do not add these items in this task:

- Public website routes
- iOS changes
- Authentication
- D1 or R2
- Cloud persistence
- Cloud sync
- Cross-origin import
- University or LMS integration
- Calendar integration
- Web reminder delivery
- AI answer generation
- AI tutoring
- Billing
- Analytics that collect student work
- Social features
- Teacher, parent, or administrator dashboards
- Historical ModelShift routes
- Historical university experiment workspaces

## Completion contract

Finish every internally solvable item in this prompt.

Resolve all P0 and P1 defects.

Resolve every P2 defect that affects trust, privacy, learning, accessibility, or release quality.

Do not hide a failed gate behind a summary.

Do not classify an internal repair as an external gate.

Name the exact provider, permission, credential, or approval for each real external gate.

Report accepted and rejected changes.

Report the final clean commit SHA.

Report the private preview URL when one exists.

End with the evidence file and requirement ledger paths.

Use these three completion states in the final report:

- `SOURCE READY` means the clean pushed source passes all source gates.
- `PRIVATE SITES PREVIEW READY` means the private preview matches the pushed source.
- `PUBLIC RELEASE READY` requires explicit public access, stable origin, policy, and legal approval.

Do not combine these three states into one claim.
