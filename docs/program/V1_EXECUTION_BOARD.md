# FORGE Real-Product V1 Execution Board

**Authority:** principal implementation thread

**Opened:** 2026-07-23

**North Star:** a learner can turn a real question into a source-governed, practical learning path; act with bounded assistance; and produce independent, narrowly stated evidence after that assistance leaves.
**Release posture:** build the smallest honest adult-first product that advances this North Star. Never convert a missing provider, reviewer, identity, database, or study into a simulated production claim.

This board replaces hackathon, judging, demo-video, submission, and deadline work as the active execution surface. Historical Build Week files remain evidence only.

## Status vocabulary

- `VERIFIED COMPLETE` — present in the exact named source and covered by proportionate evidence.
- `ACTIVELY IMPLEMENTING` — current principal-thread work; not a completion claim.
- `EXTERNALLY BLOCKED` — implementation cannot truthfully close the gate without named outside authority or configuration.

## Product slices

| Slice | Current state | V1 exit evidence |
| --- | --- | --- |
| Product constitution and claim boundary | `VERIFIED COMPLETE` | Product spec, delivery gates, and program control room preserve learner agency, bounded claims, under-18 restrictions, and AI-as-assistance. |
| Four public Learning Worlds | `VERIFIED COMPLETE` | Force and Motion, Proportional Reasoning, AI and Learning, and Primary Source Reasoning each use authored deterministic state and a one-shot assistance-free transfer boundary. |
| Universal learner intake | `VERIFIED COMPLETE` | The home intake captures the learner’s question, age mode, current position, desired practical outcome, available time, depth, representation preferences, and constraints without creating a learner profile. Strict schema, safety, default, duplicate, route, build, and rendered-browser gates pass for the current candidate. |
| Learner-controlled map activation | `VERIFIED COMPLETE` | Grounded and exploratory maps preserve exact learner wording and support explicit accept, revision-request, and reject decisions. A grounded route activates only after acceptance and only from an exact registry-owned World/activity binding; an exploratory map never becomes a course. Unit and rendered browser checks cover acceptance, revision, rejection, and 320 px operation. |
| Honest primary product shell | `VERIFIED COMPLETE` | Canonical public, start, app, focus, and author surfaces are separated. The primary catalog contains only four working Worlds; legacy Studio, login, evidence, pathway, and onboarding routes resolve to exact canonical destinations, while `/author` fails closed. Unbuilt subjects have no false runnable paths. |
| Governed resource lifecycle | `VERIFIED COMPLETE` | Reviewed resource contracts bind source, rights, representation, access, and review metadata; the public product exposes reviewed sources and labels fixture-only material. |
| Practical work and critique | `VERIFIED COMPLETE` within fixture boundary | Project, artifact, revision, critique, defence, and provenance contracts are implemented and tested. The public fixture path does not claim live reviewer authority or learner status. |
| Assistance withdrawal and bounded proof | `VERIFIED COMPLETE` | Working Worlds announce withdrawal, remove instructional help while retaining access, lock the first transfer attempt, and state what remains untested. |
| Device-local continuity and evidence control | `VERIFIED COMPLETE` | No-account browser-local evidence supports bounded records, export selection, and deletion. Exact World version, route, source, activity-protocol, and activity-kind bindings are enforced across all four public Worlds in unit contracts and across ModelShift plus standard reviewed activities in the disposable-database contract; the Force continuity journey has rendered-browser coverage. |
| Adult cloud account and durable sync | `EXTERNALLY BLOCKED` | Requires a separately authorized cloud-auth implementation, reviewed production identity, database migration authority, and retention/deletion operations. The current code is structurally disabled and cannot be enabled by environment variables; device-only behavior is the product boundary. |
| Managed or bring-your-own model operation | `EXTERNALLY BLOCKED` | Provider adapters and replay validation exist, but public model requests remain denied until adult server-owned authority, secrets, budgets, audit, and receipt gates are configured. |
| Externally reviewed adult practical pilot | `EXTERNALLY BLOCKED` | Requires a recruited 18+ cohort, named reviewer/entitlement operation, approved fixture, incident authority, and delayed-return operation. `/pilot` must remain unavailable by default. |
| Provider-authenticated production release | `EXTERNALLY BLOCKED` | Vercel must own a connected GitHub repository/ref/SHA tuple and emit the bound provider receipt. The current CLI deployment cannot satisfy that provenance gate. |

## Current candidate verification

- TypeScript: pass.
- Zero-warning lint: pass.
- Application contracts: 936 pass across 101 files.
- Evaluator contracts: 13 pass across 2 files.
- Fresh disposable-database replay plus the continuity V1 SQL contract: pass; the database and temporary roles were removed after verification.
- Targeted rendered continuity browser contract: 14 pass across desktop and mobile, including the exact Force/ModelShift grounded activation, device-local checkpoint restore, delayed return, under-18 data minimization, 320 CSS px reflow, and keyboard operation. Four-World protocol mapping is covered by unit contracts; standard reviewed-activity persistence is covered by the disposable-database contract.
- Optimized build: pass; 53 public static assets scanned with no private-pilot marker, secret-pattern leak, or stale internal package marker. Public asset digest for the final evidence build: `6f692bb4615bf23b2ab18b5b245eb4c64264980f2ad09d0af7599191c62733ae`.
- Production dependency audit: pass; `pnpm audit --audit-level high` reported no known vulnerabilities.

Only the current reruns above are candidate evidence; earlier broad browser and dependency-audit results are not inherited. These engineering gates do not promote production and are not a learner study, manual assistive-technology audit, provider credential test, cloud identity test, efficacy result, or release-provenance receipt.

## Current implementation order

1. Retire demo/submission work from active product language.
2. Complete universal intake and map decision semantics.
3. Audit the adult shell so every primary route is useful, truthful, and keyboard-operable.
4. Run focused security and contract tests, then the complete unit/evaluator/build suites.
5. Verify the home path plus at least three complete Worlds at desktop, 320 CSS px, keyboard-only, and reduced motion.
6. Push the exact green source. Promote a new public candidate only if the provider-owned release verifier passes; otherwise record the immutable blocker and leave production unpromoted.

## Explicit non-goals for this release

- no demo video, narration script, judging path, Devpost package, or hackathon submission work;
- no simulated cloud account, guardian consent, reviewer entitlement, provider key, or database authority;
- no universal curriculum, homeschool-readiness, mastery, efficacy, retention, accreditation, or child-safety claim;
- no persistent chat companion, AI persona, engagement streak, badge, point, rank, or hidden learner score;
- no public pilot fixture or protected reviewer material without server-side entitlement.

## Stop conditions

Stop release promotion—not implementation—if any of these is true:

- the full build or required tests fail;
- learner input can activate an unreviewed World, source, or claim;
- proof mode can receive instructional assistance;
- private fixtures, secrets, or service credentials appear in public assets;
- the public health tuple does not bind the exact candidate source and retained digests;
- provider-owned repository, ref, SHA, deployment, and asset-receipt identity cannot be established.
