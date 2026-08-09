# Ready-to-paste prompt: Build the FORGE public website in ChatGPT Sites

You are the product, design, research, engineering, and release owner for one bounded task.

Build the separate FORGE public website in ChatGPT Sites.

Do not build the Semester Desk web application in this task.

Do not deploy the website for public access.

Continue until the private website candidate meets every internally solvable gate below.

## Mission

Create a clear, calm, distinctive public website for FORGE Semester Desk v2.

The website must help a university student understand the product before opening the separate application.

The website must use Pri's in-thread design references and taste decisions as its visual authority.

The website must use real semantic components. It must not use a generated screen as an interface.

## Product decision

The selected direction is `amend_to_semester_desk_v2`.

The primary student job is:

> When my week has broken, help me rebuild from today without hiding what changed, overwhelming me, shaming me, or doing the learning for me.

FORGE is a private and calm university operating system.

It helps a student:

1. Understand the actual semester state.
2. See changed or conflicting information.
3. State real available capacity.
4. Recover when plans fail.
5. Choose the next honest action.
6. Perform active learning.
7. Check understanding independently.
8. Return later to check retention.
9. Continue without losing context.

FORGE is not a chatbot wrapper, LMS, homework generator, or generic productivity dashboard.

## Source repository

Use this repository:

`https://github.com/RanaPriyansh/modelshift`

Audit the current accepted `main` branch before you edit anything.

The former integration branch was `agent/forge-semester-desk-v2-release-20260802`.

Pull request `#5` was the transfer candidate.

Do not assume that branch or pull request is still current.

Record the exact accepted source SHA before implementation.

Read this handoff first:

`docs/handoffs/FORGE_PUBLIC_WEBSITE_CHATGPT_WORK_HANDOFF.md`

Then read these source files:

- `docs/product/FORGE_SEMESTER_DESK_V2_NATIVE_CONTRACT.md`
- `docs/program/FORGE_MASTER_COMPLETION_LEDGER.md`
- `docs/program/UNIVERSITY_FIRST_PRODUCT_REBASE.md`
- `docs/program/STUDENT_COMMUNITY_ASTRA_AI_AND_FUTURE_RESEARCH.md`
- `docs/design/PRI_TASTE_PROFILE.md`
- `docs/design/PRI_TASTE_EVIDENCE_INDEX.md`
- `docs/design/FORGE_VISUAL_DIRECTION_DECISION.md`
- `docs/design/FORGE_DESIGN_SYSTEM.md`
- `.impeccable/design.json`
- `src/components/forge/semester-desk-v2/public/SemesterDeskV2PublicHome.tsx`
- `src/components/forge/semester-desk-v2/public/product/PublicProductPage.tsx`
- `src/components/forge/semester-desk-v2/public/policy/PolicyPage.tsx`
- Their matching CSS modules and tests
- The six matching `app/**/page.release.tsx` files
- `app/layout.release.tsx`
- `app/robots.ts`
- `app/sitemap.ts`
- `app/manifest.ts`

Treat each handoff claim as context to verify against the accepted source.

## Scope boundary

Create one new Sites project for the public website.

Keep the public website and web application in separate Sites projects.

The public website must not contain application state, onboarding, study flows, persistence, or private student data.

The public website must not own an `/app` route.

Link to the separate application through an absolute environment-backed URL.

Use `FORGE_APP_URL` as the application URL setting.

Validate this URL before rendering it as an action.

Accept only an absolute `https:` URL in a deployed environment.

Show an honest unavailable state when the value is absent or invalid.

Preserve approved application query parameters, such as `?section=settings`.

Do not hard-code a temporary deployment URL.

## At most three grouped questions

Ask no more than these three grouped questions when the thread and repository do not resolve them:

1. Which private access setting and Sites slug should the project use?
2. Has legal approved the terms, and does a real monitored support channel exist?
3. What are the final app, domain, and analytics destinations?

Use these safe defaults when Pri does not answer:

- Private owner-only access
- Search indexing disabled
- Draft terms with legal review required
- Self-service support only
- No analytics
- No cookies added by product code
- No App Store action
- `FORGE_APP_URL` unset with an honest unavailable state

Do not ask more questions during implementation unless an irreversible action needs approval.

## Phase 1: Audit and requirements

Audit the current `main` tree before creating the Sites project.

Record these values:

- Accepted repository SHA
- Current website source paths
- Current public claims
- Current application behavior that affects website truth
- Existing route and metadata behavior
- Existing tests and known failures
- Existing design tokens and visual evidence
- Current privacy, legal, and support limits

Create `docs/work/PUBLIC_WEBSITE_REQUIREMENTS_LEDGER.md` in the Sites source project.

Give each requirement a stable identifier.

Use these fields:

- Identifier
- Requirement
- Source path or thread decision
- Priority
- Rationale
- Planned implementation
- Verification method
- Status
- Evidence path

Collect requirements from these sources:

1. The latest user instructions in this thread.
2. The repository product contract.
3. Actual Semester Desk behavior.
4. Pri's design and taste evidence.
5. Current privacy and policy text.
6. Current Sites platform limits.
7. The bounded research pass below.

Create `docs/work/PUBLIC_WEBSITE_DECISION_LOG.md`.

Record each conflict, selected choice, rejected choice, and reason.

Use this precedence when sources conflict:

1. Latest explicit product decision
2. Verified application behavior for factual claims
3. Accessibility, privacy, security, and legal limits
4. Pri's repeated taste evidence
5. Current repository copy
6. External weak signals

Do not ask Pri about a point that the repository or thread already resolves.

Do not block private implementation on the final domain, application URL, or public approval.

Keep unresolved values in environment settings and the decision log.

## Phase 2: One bounded current research pass

Complete one current validation pass before final copy and information architecture.

Limit this pass to 75 minutes and 24 source records.

Use at least eight primary or official sources.

Use no more than eight forum or social records.

Use no more than four competitor product pages.

Use the remaining records for current platform or technical guidance.

Prioritise these primary sources:

- Official ChatGPT Sites guidance available in the task
- W3C WCAG 2.2 and ARIA guidance
- OWASP guidance for browser security headers
- Official Google Search documentation
- Official browser documentation for local storage behavior
- Official product pages for any competitor feature claim

Use forum and social content only as weak product-language evidence.

Search for natural student phrases, not long strategy queries.

Use queries similar to these examples:

- `behind in all my classes`
- `college week fell apart`
- `missed assignments overwhelmed`
- `syllabus deadline changed`
- `study planner unrealistic`
- `AI study app gives answers`
- `college planner privacy`
- `catch up university work`

Review Reddit, Product Hunt, X, student forums, and public university communities when accessible.

Do not use private groups, hidden content, or personal account data.

Do not treat a comment, vote count, or review as representative evidence.

Do not quote usernames in product documents.

Use short paraphrases. Keep each original link and access date.

Record contrary evidence and sample limits.

Create `docs/work/PUBLIC_WEBSITE_RESEARCH_LEDGER.md`.

Use these fields:

- URL
- Page title
- Publisher or community
- Access date
- Source type
- Search phrase
- Observation
- Evidence strength
- Sample limit
- Product implication
- Copy implication
- Contradiction

Do not add statistics or claims to the website unless a current authoritative source supports them.

The research pass must refine clarity. It must not reopen the selected product direction.

Do not repeat the broad Astra AI or university-market research already present in the repository.

## Phase 3: Information architecture and content

Build exactly these six product routes:

1. `/`
2. `/how-forge-works`
3. `/university`
4. `/privacy`
5. `/terms`
6. `/support`

Also build accessible error and not-found surfaces.

Create robots, sitemap, manifest, icon, Open Graph, and social metadata surfaces.

Use `FORGE_SITE_ORIGIN` or the Sites-approved equivalent for absolute metadata URLs.

Keep the entire private candidate out of search indexes.

Keep `/terms` out of search indexes until legal approval exists.

### Home

Explain the broken-week problem in the first screen.

Use `Rebuild from today` as the central promise unless evidence supports a clearer form.

Show a compact, clearly illustrative semester state.

Explain capacity, transparent recovery, active study, proof, and delayed return.

Use one primary action to open the separate Semester Desk.

### How FORGE works

Explain this sequence:

1. See course facts and conflicts.
2. State real capacity.
3. Review every recovery change.
4. Choose one next action.
5. Complete protected practice.
6. Complete independent proof.
7. Select a delayed return date.
8. Return and check retention.

State that FORGE does not complete the learning task.

### University

Explain the university-first boundary.

State that the course site and instructor remain the sources of record.

State that FORGE has no current university connection.

Explain manual course facts, visible conflicts, capacity, and recovery.

Do not imply an institutional partnership.

### Privacy

Describe only verified application behavior.

Explain browser-local Semester Desk data, export, reset, shared-device risk, and possible browser-data loss.

State that raw practice notes and independent answers are not saved to browser storage.

State that web and iPhone data do not sync.

Do not claim a certification or independent security audit.

### Terms

Keep the current terms as a draft.

State that students remain responsible for course rules, choices, and submitted work.

State that legal review is required before public publication.

Do not convert product copy into a legal warranty.

### Support

Provide self-service help only.

Cover browser profile access, storage availability, export, reset, return dates, and page failure.

State that the web application sends no reminder.

Do not create an email address, form, chat, or ticket channel.

Do not collect course files, account details, or support requests.

## Phase 4: Visual system and implementation

Use Pri's in-thread designs and taste references as the visual authority.

Use the selected direction: `Editorial Terrain Recovery`.

Use the rule: `Vivid at thresholds. Quiet during work.`

Use warm ivory, forest, cobalt, and limited learner orange.

Use learner orange only for a deliberate student action.

Use cobalt for navigation, focus, and disclosed system assistance.

Use green only for checked or reviewed states.

Pair every color state with text or shape.

Use editorial hierarchy, precise alignment, moderate density, and restrained borders.

Use cards only for one complete decision or bounded example.

Avoid these patterns:

- Generic purple-blue AI gradients
- Excessive glass effects
- Chatbot-first layouts
- Card groups without clear purpose
- Mascots
- Fake dashboards
- Scores, streaks, and progress rings
- Tiny labels
- Decorative motion during reading
- Internal engineering vocabulary

Use real semantic HTML and real responsive components.

Do not place invisible controls over a generated image.

Do not copy one inspiration image literally.

Use project assets only when their provenance and role are clear.

If the final web application does not exist, omit application screenshots.

Do not use a mock screen as product proof.

After the application exists, capture screenshots from its exact accepted source revision.

Use fixture data only. Do not use real student data.

Remove development badges and browser chrome from final product captures.

Compress each image and provide useful alternative text.

## Phase 5: Cross-site integration

Render application actions from the validated `FORGE_APP_URL` value.

Test the root application action.

Test the settings action with `?section=settings`.

Test keyboard activation and focus return.

Test link behavior from every public route.

Do not open a new tab unless there is a clear user need.

Do not add authentication, account, sync, or payment entry points.

## Phase 6: Verification

Test the exact source revision that will be deployed.

Test these viewport widths:

- `1440 px`
- `1280 px`
- `430 px`
- `390 px`
- `320 px`

Verify these responsive requirements:

- No horizontal overflow
- No clipped text or controls
- No hidden primary action
- Readable line lengths
- Useful mobile navigation
- Correct image sizing
- Correct safe spacing at `320 px`

Verify WCAG 2.2 Level AA behavior where applicable.

Test these accessibility requirements:

- Keyboard-only navigation
- Visible focus
- Skip link
- Semantic landmarks
- One clear page heading
- Correct heading order
- Accessible names
- Form-free support flow
- Minimum `44 px` primary action targets
- Text and control contrast
- Reduced motion
- Forced colors
- Screen-reader reading order

Test these SEO requirements:

- Unique titles and descriptions
- Correct canonical URLs
- Correct private robots behavior
- Correct sitemap origin
- Correct social preview metadata
- Valid manifest
- No unsupported structured data
- No fake review or rating data

Test these performance requirements:

- Production build succeeds
- Largest content renders without avoidable delay
- Layout shift remains below `0.1` in the tested path
- No blocking decorative animation
- Initial uncompressed JavaScript remains below `1,000,000` bytes
- Initial CSS remains below `36,000` bytes
- All deployable public images remain below `500,000` bytes total
- Actual measured values are recorded

Run Lighthouse or the strongest available equivalent on the private deployment.

Target at least `90` for Performance and `95` for Accessibility, Best Practices, and SEO.

Do not hide a failed score. Record the cause and repair it when possible.

Test these security requirements:

- HTTPS deployment
- No secrets in source or client output
- Safe validation of `FORGE_APP_URL`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- A restrictive `Permissions-Policy`
- Clickjacking protection
- A Sites-compatible Content Security Policy
- No mixed content
- No unsafe inline script added by product code
- No unneeded third-party analytics or trackers
- No product cookies without an approved need

Record any host-managed header limit. Do not claim a header that the deployed response does not contain.

Run route tests and browser smoke tests.

Check all links.

Check the deployed console for errors and hydration failures.

Check the network log for failed product requests.

Test all normal, unavailable-app, error, and not-found states.

## Phase 7: Private Sites release

Create one Sites project for this public website.

Keep its access private or owner-only.

Do not enable public access.

Commit the complete source and evidence.

Push the exact tested commit to the Sites source repository.

Deploy that exact commit privately.

Verify that the deployed revision matches the tested revision.

Create `docs/work/PUBLIC_WEBSITE_RELEASE_EVIDENCE.md`.

Record these items:

- Canonical modelshift source SHA
- Sites source repository
- Sites source SHA
- Private deployment URL
- Access state
- Environment variable names and state
- Route results
- Test commands and counts
- Browser and viewport matrix
- Accessibility results
- Lighthouse or equivalent results
- Bundle and image sizes
- Security-header response evidence
- Cross-site link results
- Console and network results
- Known limitations
- Exact external gates

Do not record tokens, credentials, or secret values.

Create `docs/handoffs/FORGE_PUBLIC_WEBSITE_SITES_RELEASE_HANDOFF.md` in the Sites source repository.

Make this handoff factual and revision-bound.

Use these release states in the requirements ledger and final handoff:

- `SOURCE READY` means source, tests, and local evidence pass.
- `PRIVATE SITES PREVIEW READY` means the exact source revision passes on a private Sites deployment.
- `PUBLIC RELEASE READY` means legal, support, domain, indexing, and public-access approvals also pass.

Do not use `PUBLIC RELEASE READY` while any approval remains open.

## Required acceptance gates

The task is complete only when all these statements are true:

- The accepted modelshift source SHA is recorded.
- The requirements ledger is complete and traceable.
- The bounded research ledger is complete.
- The decision log resolves all implementation conflicts.
- One separate public Sites project exists.
- Exactly six public product routes work.
- The website contains no Semester Desk application state.
- All application actions use the validated absolute environment URL.
- The unavailable-app state is clear and safe.
- Public claims match verified application behavior.
- No pricing, efficacy, integration, user-count, or testimonial claim is invented.
- The terms remain marked for legal review.
- Support remains self-service.
- Pri's design authority is visible in the result.
- The interface uses semantic components.
- No generated application screen appears as product proof.
- All required widths pass.
- Keyboard and accessibility checks pass.
- SEO and private-indexing checks pass.
- Performance gates pass or have a precise external platform limit.
- Security checks pass or have a precise host-managed limit.
- Cross-site links pass.
- Production build and tests pass.
- The exact tested commit is pushed.
- The exact pushed commit is deployed privately.
- Release evidence and the final handoff exist.
- No known P0 or P1 issue remains.

## Excluded scope

Do not implement these items:

- Semester Desk web-application features
- Native iOS features
- Authentication
- Cloud persistence
- Cross-device sync
- University integrations
- Payments or pricing
- Analytics or advertising trackers
- A monitored support system
- Legal approval
- A public production deployment
- Real student data

## Completion response

Do not return only a plan.

Complete the private website candidate and its evidence.

Then report:

- Private Sites URL
- Accepted modelshift SHA
- Sites source SHA
- Six-route result
- Requirements and research artifacts
- Test counts
- Responsive result
- Accessibility result
- Performance result
- Security result
- Cross-site link result
- Design decision result
- Exact remaining external gates

Do not ask what to do next.

Do not make the site public.
