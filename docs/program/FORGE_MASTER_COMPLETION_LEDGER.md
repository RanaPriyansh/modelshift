# FORGE Master Completion Ledger

Updated: 2026-08-10 IST

This file is the release source of truth for the FORGE Semester Desk v2 candidate.

This candidate is not a production release. The open gates in this file remain release blockers.

## Product decision

- Direction: `amend_to_semester_desk_v2`
- Primary user: university students
- Primary job: “When my week has broken, help me rebuild from today without hiding what changed, overwhelming me, shaming me, or doing the learning for me.”
- Product form: a private and calm university operating system
- Core loop: semester truth, capacity, recovery, next action, study, proof, delayed return, and continuity
- Supporting foundations: source integrity, privacy, accessibility, security, and evidence

## Canonical Git lineage

| Item | Value | Status |
|---|---|---|
| GitHub repository | `https://github.com/RanaPriyansh/modelshift` | Confirmed |
| Canonical worktree | `/Users/Priyansh/Documents/codex-buildweek/worktrees/forge-university-foundation-20260730` | Confirmed |
| Canonical branch | `agent/forge-semester-desk-v2-release-20260802` | Pushed |
| Canonical integrated product and transfer SHA | `c8032a73140a336067e6f45894187d36aa42657f` | Local clean checkpoint; push pending in this ledger update |
| Canonical integrated product and transfer tree | `b0c287dc063c216c023524da1f779f54dd4130b7` | Confirmed |
| Web safety checkpoint | `28921bb` on the canonical branch | Pushed |
| iOS safety checkpoint | `9c8be28` on `agent/forge-ios-foundation-20260801` | Pushed |
| Research safety checkpoint | `af648e6` on `agent/forge-local-refoundation-snapshot` | Pushed |
| Draft pull request | `https://github.com/RanaPriyansh/modelshift/pull/5` | Open |
| Pull request base | `main` | Confirmed |
| Canonical worktree state | Clean at the pushed branch tip | Required before handoff |
| Production deployment | No Semester Desk v2 production deployment | Open external gate |

The canonical branch contains the public website, web application, native iOS application, design records, research, tests, and release documentation.

The safety branches preserve the exact source states before integration. Do not use them as separate release candidates.

## Product status summary

| Product area | Current state | Release state |
|---|---|---|
| Public website | Canonical Semester Desk route sources and copy exist | Candidate |
| Web application | Device-local Semester Desk loop exists | Candidate |
| Native iOS application | Native Semester Desk loop and system surfaces exist | Candidate |
| Shared design language | Editorial Terrain Recovery | Implemented |
| University research | Product rebase and community research are preserved | Integrated |
| Cloud account and sync | Outside the device-local candidate and structurally disabled | Internal implementation plus external provider gate |
| Web deployment | No current Semester Desk v2 deployment | External deployment gate |
| iOS distribution | No final signing, archive, device, or App Store evidence | External and verification gates |

## Public website

The release route policy contains these public surfaces:

- `/`
- `/how-forge-works`
- `/university`
- `/privacy`
- `/terms`
- `/support`
- `/app`
- `/api/health`

Metadata routes include the sitemap, robots file, manifest, icons, Open Graph image, and Twitter image.

The website explains the broken-semester problem, student control, active learning, privacy, and the relationship between web and iOS.

The site does not claim pricing, efficacy, university integration, user counts, or credentials that do not exist.

Current release limits:

- The final screenshots are not bound to the integrated SHA.
- Pull request `#5` passed its tests at `ab020fe`, then failed because a clean Git checkout omits an empty `public/` directory.
- Checkpoint `c8032a7` contains a tested clean-checkout repair and two ChatGPT Work transfer packages.
- A new exact-SHA GitHub check remains required after push.
- The current public alias is not proof of a Semester Desk v2 deployment.
- No ChatGPT Sites website was created or deployed in this transfer task.

## Web application

The canonical `/app` route contains the device-local Semester Desk v2 flow.

Implemented capabilities include:

1. Local profile onboarding.
2. Manual course setup.
3. Course facts, freshness, and conflict review.
4. Whole-semester review.
5. Capacity declaration.
6. Transparent recovery planning.
7. Next-action selection.
8. Protected study.
9. Practice and process recall.
10. Independent proof.
11. Delayed return.
12. Evidence and progress review.
13. Local export and reset.
14. Privacy and support information.

The browser state has bounded validation, profile separation, fail-closed storage behavior, verified reset behavior, and no enabled cloud provider.

The production browser bundle no longer includes Zod. The measured `/app` initial JavaScript fell from 903,347 bytes to 619,294 bytes.

Current release limits:

- A clean local production build passed at `c8032a7`; exact GitHub browser evidence remains open.
- Cloud account and sync need product implementation before provider configuration.
- Production persistence also needs an approved provider and credentials.
- Final browser screenshots must come from a production build without the Next.js development badge.

## ChatGPT Work transfer packages

The repository contains two separate transfer packages. No Sites implementation is accepted from this task.

| Product | State handoff | Ready-to-paste prompt |
|---|---|---|
| Public website | `docs/handoffs/FORGE_PUBLIC_WEBSITE_CHATGPT_WORK_HANDOFF.md` | `docs/prompts/FORGE_PUBLIC_WEBSITE_CHATGPT_WORK_PROMPT.md` |
| Semester Desk web application | `docs/handoffs/FORGE_WEBAPP_CHATGPT_WORK_HANDOFF.md` | `docs/prompts/FORGE_WEBAPP_CHATGPT_WORK_PROMPT.md` |

The prompts require separate private Sites projects, live `main` verification, requirements traceability, bounded research, rendered QA, and revision-bound evidence.

The web application transfer stays device-local. It does not add authentication, D1, R2, cloud sync, or a cross-origin import path.

The public website transfer stays private until legal, support, domain, indexing, and public-access decisions are complete.

## Native iOS application

The canonical branch contains the exact iOS source checkpoint from `9c8be28`.

Implemented capabilities include:

- Onboarding and local profile separation
- Today, Semester, Recovery, Study, Progress, and Settings
- Private local state and schema handling
- Draft protection and interrupted-operation recovery
- Local reset and deletion verification
- Reminders and notification reconciliation
- Widgets
- Deep links
- App Intents
- Export, privacy, and support surfaces
- Dynamic Type and accessibility repairs
- Small-device and AXXXL layout repairs

Current verification evidence:

| Check | Result | Evidence boundary |
|---|---|---|
| ForgeCore package | 129 passed | iOS source checkpoint before integration |
| App tests | 128 passed during the repair pass | iOS source checkpoint before integration |
| Signed build-for-testing | Passed | iOS source checkpoint before integration |
| Focused onboarding UI test | Passed | Current iOS source checkpoint |
| Focused semester UI test | Failed | The iOS QuickPath tutorial covers the fact form |

The focused UI run has one passing test and one failing test. Do not describe the UI suite as green.

Current release limits:

- Repair or reliably handle the QuickPath system tutorial in UI automation.
- Run the complete UI matrix on the integrated SHA.
- Run small and modern iPhone checks and the iPad check.
- Run manual VoiceOver, Dynamic Type, reduced-motion, offline, notification-denial, widget, deep-link, and App Intent checks.
- Run final debug, release, unsigned-device, and archive-readiness gates.
- Capture SHA-bound simulator screenshots.

## Cross-platform feature matrix

| Capability | Web | iOS | Parity state |
|---|---|---|---|
| Local onboarding | Implemented | Implemented | Aligned |
| Manual course setup | Implemented | Implemented | Aligned |
| Course facts and conflicts | Implemented | Implemented | Aligned |
| Semester view | Implemented | Implemented | Aligned |
| Capacity | Implemented | Implemented | Aligned |
| Recovery | Implemented | Implemented | Aligned |
| Next action | Implemented | Implemented | Aligned |
| Protected study | Implemented | Implemented | Aligned |
| Practice and proof | Implemented | Implemented | Aligned |
| Delayed return | Implemented | Implemented | Aligned in product model |
| Evidence and progress | Implemented | Implemented | Aligned |
| Export and reset | Implemented | Implemented | Platform-specific implementation |
| Reminders | Return date only. The web app sends no reminder. | Native notifications | Platform-specific implementation |
| Widget, deep link, App Intent | Not applicable | Implemented | iOS-only |
| Production account and sync | Structurally disabled | Structurally disabled | Internal implementation plus external provider gate |

## Taste and design evidence

| Artifact | Path | Status |
|---|---|---|
| Taste profile | `docs/design/PRI_TASTE_PROFILE.md` | Present |
| Taste evidence index | `docs/design/PRI_TASTE_EVIDENCE_INDEX.md` | Present |
| Shared design system | `docs/design/FORGE_DESIGN_SYSTEM.md` | Present |
| Visual direction decision | `docs/design/FORGE_VISUAL_DIRECTION_DECISION.md` | Present |
| Persistent design rules | `.impeccable/design.json` | Present |

The selected direction is `Editorial Terrain Recovery`.

The system uses a quiet work surface, vivid threshold moments, editorial hierarchy, restrained depth, and direct student language.

Generated design images are references. The shipped website and iOS application use semantic components.

The four comparison boards remain local-only. The visual direction document links to absolute local paths outside Git.

## Research evidence

| Artifact | Path | Status |
|---|---|---|
| University product rebase | `docs/program/UNIVERSITY_FIRST_PRODUCT_REBASE.md` | Integrated |
| Student community, Astra AI, and future research | `docs/program/STUDENT_COMMUNITY_ASTRA_AI_AND_FUTURE_RESEARCH.md` | Integrated |
| University second-brain research receipt | `.codex/research/forge-university-second-brain-2026-8ad330c7.json` | Integrated |
| Student forum and Astra AI research receipt | `.codex/research/forge-student-forums-astra-ai-future-2026-a8e9bd25.json` | Integrated |
| AI model architecture research receipt | `.codex/research/forge-ai-model-architecture-open-model-and-organ-19b90aee.json` | Integrated |

Research supports the product direction. It does not prove product efficacy or production readiness.

## Test and build evidence

Verified before the integrated product commit:

- At web checkpoint `28921bb`, 73 product and persistence tests passed.
- At web checkpoint `28921bb`, 53 deployment-verifier tests passed.
- At web checkpoint `28921bb`, lint, typecheck, and diff checks passed.
- The production Next.js build passed in the web repair lane before `28921bb`.
- The release artifact and release budget checks passed in the web repair lane before `28921bb`.
- At iOS checkpoint `9c8be28`, the ForgeCore suite passed 129 tests.
- At iOS checkpoint `9c8be28`, the app suite passed 128 tests during the repair pass.
- At iOS checkpoint `9c8be28`, signed build-for-testing passed.

Verified after the dependency repair:

- `pnpm install --frozen-lockfile --ignore-scripts` passed.
- `pnpm audit --audit-level low` passed with no known vulnerability.
- The dependency repair also updated `postcss` to 8.5.26.
- `pnpm audit signatures` verified 576 packages.
- Web lint and typecheck passed.
- The web test gate passed 1,838 tests in 191 files after the clean-checkout regression coverage was added.
- The evaluation test gate passed 13 tests in two files.
- A clean committed production build passed at `c8032a7` with 14 release routes and two framework routes.
- The build excluded 73 retired route modules and passed the release budgets.
- The production build receipt recorded tree `b0c287dc063c216c023524da1f779f54dd4130b7` and artifact digest `sha256:e2a5f1479653c1a81fa9d22039382ad2c48919ba2b08e5a6614f64a06ec00352`.
- These local results still require GitHub verification on the final pushed SHA.

Evidence limits:

- The full exact-SHA web and iOS GitHub gates remain open.
- The `ab020fe` web run reached the production build after all tests passed.
- That run exposed the absent-empty-directory defect before browser verification.
- Checkpoint `c8032a7` repairs that defect, but GitHub has not tested it yet.
- The `ab020fe` iOS GitHub runs were still in progress when this ledger was updated.
- The focused iOS UI run remains one pass and one failure in retained local evidence.

## Open issues

### P0

No P0 was found in this bounded review. Full exact-SHA testing remains open.

### P1

1. Require a green `deterministic-quality` check for the final pushed handoff checkpoint.
2. Repair the iOS QuickPath UI automation blocker.
3. Run the full exact-SHA web release gate.
4. Run the full exact-SHA iOS build and test gate.
5. Capture production-build web screenshots and SHA-bound iOS screenshots.
6. Complete the final accessibility and cross-platform review.
7. Require a job-backed iOS GitHub workflow run on the final pushed revision.

### P2

1. Keep the retired ModelShift evaluator labelled as legacy or remove it from current release gates.
2. Review legal text before public publication.
3. Measure final web and native performance on the release candidate.

## Deployment and signing status

| Gate | Current state | Required external input |
|---|---|---|
| GitHub source | Pushed | None |
| Pull request | Draft pull request `#5` is open | Review and merge authority |
| Web production deployment | Not completed | Choose and authorize the final host after the separate ChatGPT Work builds are reviewed |
| ChatGPT Sites website | Not created by this task | Run the public website transfer prompt in ChatGPT Work |
| ChatGPT Sites web application | Not created by this task | Run the web-application transfer prompt in ChatGPT Work |
| Web cloud persistence | Not configured | Approved provider project and credentials |
| iOS signing | Not completed | Apple Developer Team, certificates, `com.forgelearning.app`, `com.forgelearning.app.widgets`, App Group `group.com.forgelearning.shared`, and provisioning profiles |
| App Store submission | Not completed | App Store Connect access, metadata, privacy declarations, public support and privacy URLs, and submission authority |
| Physical device verification | Not completed | Supported device and signing authority |

Do not use production student data until privacy, provider, deletion, backup, and access controls pass production verification.

## Accepted and rejected work

Accepted work:

- The web checkpoint at `28921bb`.
- The reviewed iOS checkpoint at `9c8be28`.
- The university research checkpoint at `af648e6`.
- The integrated product and ChatGPT Work transfer checkpoint at `c8032a7`.

Rejected or excluded work:

- Historical ModelShift public routes as active Semester Desk release routes.
- Generated Next.js development state.
- Evidence-only changes as product proof.
- Unreviewed parallel branch changes.
- Old university-v1 documents as current iOS release authority.

## Next internally executable action

Push the ledger update, require clean exact-SHA web and iOS gates, and merge pull request `#5` only after those gates pass.
