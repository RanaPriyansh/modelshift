# FORGE Release, Evaluation, and Observability Runbook

This slice is a read-only operations boundary. It never deploys, changes an alias, enables application credentials, writes a live database, or uploads learner content. Its optional receipt collector makes only authenticated read-only Vercel API requests to the fixed provider origin and never sends the token to the app, a report, a receipt, or a log.

The [Current Public Release Record](CURRENT_RELEASE.md) is the one canonical locator for the current public tuple. Historical deployment entries in this runbook remain incident evidence only.

## Release gates

`.github/workflows/quality-gates.yml` is an immutable-source workflow with `contents: read`, pinned actions, no secrets, empty provider credentials, and explicit cloud/provider-off flags. A release candidate requires all of these gates on the same SHA:

| Gate | Evidence | Missing evidence |
| --- | --- | --- |
| locked install | `pnpm install --frozen-lockfile` | `FAIL` |
| lint/typecheck/unit | `pnpm lint`, `pnpm typecheck`, `pnpm test` | `FAIL` |
| offline regression | `pnpm eval` and sanitized evaluation report | `FAIL` |
| production build | `pnpm build`; a Vercel candidate binds provider-owned `VERCEL_GIT_COMMIT_SHA`, while app `build_time` is diagnostic only | `FAIL` |
| browser contract | built artifact via `run-production-browser-verification.ts` (`next start`, unique port, full relevant Playwright suite) | `FAIL` |
| local artifact verification | `run-local-production-verification.ts` | `FAIL` |

`NOT_EVALUATED` is never promoted to `PASS`. The offline comparator is deterministic evidence only; live model quality, learner outcomes, consent, and production readiness remain outside this slice.

Reports contain schema/version/SHA, bounded aggregate metrics, check IDs, and status. They do not contain learner explanations, response bodies, cookies, authorization headers, environment dumps, model transcripts, or secret values. CI retains only the sanitized report directory for 14 days.

## Runtime identity and privacy contract

`GET /api/health` is dynamic and uncached. Its allowlisted payload includes `app_name`, exact `release_sha`, diagnostic-only `build_time`, runtime mode, independent managed-surface flags (Lesson Studio, interpretation, planner), aggregate provider state, cloud flags, device/evidence mode, safe retained-artifact digests, and one exact `release_manifest`. It returns booleans, digests, and allowlisted enum values only; it never returns credentials or learner state. `build_time` may be caller/CI supplied and is deliberately not release provenance. Any managed surface requires its own explicit enable flag plus a nonempty server-side value. The resulting flag is configuration intent, not credential-validity or provider-success proof; disabled switches or missing/empty values report false. The production verifier still requires every managed flag to be disabled for this cost-controlled baseline.

`release_manifest` is `unbound` for local builds and for any incomplete or malformed public tuple. It becomes `bound` only for an explicit `DEPLOYED_CANDIDATE` with one exact provider Git SHA, lock digest, Vercel-owned immutable deployment ID/URL/project identity, the checked-in alias URL, and `public_asset: provider_receipt_required`. `VERCEL_GIT_COMMIT_SHA` is the sole manifest source SHA; caller `FORGE_RELEASE_SHA` cannot override it. `VERCEL_DEPLOYMENT_ID`, `VERCEL_URL`, and `VERCEL_PROJECT_ID` must be present and satisfy the checked-in FORGE project/hostname policy. Caller deployment/immutable values are contradiction checks only, and caller alias or alias-resolution values are rejected. A build-supplied `FORGE_PUBLIC_ASSET_DIGEST`, including the retired absence gate, is rejected because Vercel has not emitted the deployment-specific tree when health is built.

Remote candidate authority comes from a same-process opaque capability issued only after fixed-origin authenticated Vercel reads. The collector requires a `production` and `READY` deployment, the checked-in project and immutable-host policy, provider-owned `gitSource.type/repoId/ref/sha`, and provider-owned `gitRepo.namespace/name/path/type/defaultBranch`. The GitHub repository ID is `1308085427`; caller-settable deployment `meta` is consistency-only and never supplies source or repository identity. Provider responses stream under a hard four-megabyte actual-byte cap with TLS certificate verification enabled. The build-log event must contain exactly one canonical `Public build boundary verified across … public asset digest <sha256>.` marker. Provider deployment creation must precede that observation, and the observation must precede the verifier's alias fetch. Plain JSON, a hand-written authority label, preview/CLI-local source, project/source drift, or a self-reported digest remains `DEPLOYMENT_BLOCKED`.

The production binding path is a Vercel Git remote build/runtime with System Environment Variables exposed. A prebuilt deployment does not receive Vercel system variables during build unless a custom identity is configured; that mode is not accepted as a substitute for this platform-bound path. Without the platform variables, the health manifest remains unbound.

The current cost-controlled baseline must report:

- `runtime_mode: fallback_only` and `provider_mode: request_only_byok`;
- `cloud_accounts_enabled: false`, `cloud_auth_configured: false`;
- `device_profiles: device_only`, `learner_evidence_sync: disabled`; and
- all managed provider and managed-surface flags false.

## ADR-006 release identity and candidate states

Every generated deployment report carries the exact ADR-006 tuple, with missing fields represented explicitly rather than inferred:

```text
source SHA
tested SHA and retained artifact IDs
immutable deployment ID and URL
public alias and alias-resolution timestamp
build/runtime mode
cloud/provider feature flags without secrets
database project and migration identity, or explicit not configured
critical browser/CSP/console/network verification packet
rollback deployment/SHA and rehearsal result
named release decision and time
```

The only candidate states are `BUILT_LOCAL`, `PUSHED`, `DEPLOYMENT_BLOCKED`, `DEPLOYED_CANDIDATE`, `PRODUCTION_VERIFIED`, and `ROLLED_BACK`. The worker verifier defaults local runs to `BUILT_LOCAL`. A remote result is `DEPLOYMENT_BLOCKED` unless the bound health manifest, retained verifier inputs, and checked-in target policy all match; it never accepts caller-supplied deployment/alias identity. It rejects terminal-state/live-proof inputs and never upgrades a candidate to `PRODUCTION_VERIFIED` or changes an alias.

Terminal validation is a principal-owned contract, not a caller assertion: it requires canonical HTTPS origin-only immutable deployment and alias URLs, a canonical timestamp and decision, the exact typed and secret-free health projection, all critical checks passing, and separately supplied authority whose deployment, alias resolution, production-verification artifact, live-evaluation artifact, rollback rehearsal artifact, SHA, and decision all exactly match the tuple and retained artifact list. Every tuple and authority object is an exact-key schema: unknown fields, including secret-like keys, fail closed. The decision has a typed outcome: `not_authorized`, `promote`, or `rollback`; the name is bounded descriptive metadata and is never parsed for authority. Every nonterminal state requires `not_authorized`; `PRODUCTION_VERIFIED` requires matching tuple and authority outcomes of `promote`; `ROLLED_BACK` requires matching `rollback`; workers default to `not_authorized` and reject caller-provided outcome input. `ROLLED_BACK` additionally requires the alias resolution to identify the rollback deployment itself. Missing, malformed, mismatched, self-asserted, or terminal-worker input fails closed.

CI injects lockfile, content-manifest, evaluator-baseline, and database-state metadata before local verification. A local `.next/static` digest remains a build diagnostic only; it is never injected into health or treated as a prediction of Vercel output. The checked-in `scripts/ops/deployment-target-policy.ts` is the only workflow target authority; dispatch callers select a target ID and cannot redefine its URL or host. DNS is checked for each bounded request, private/link-local/metadata destinations (including IPv4-mapped IPv6) are rejected, the validated public address is pinned in the HTTP lookup transport while preserving hostname/SNI/TLS, DNS rebinding fails closed, and redirects are never followed. Browser failure collection runs under `always()`: only bounded synthetic PNG screenshots selected into a fresh, exclusive staging directory physically contained in `test-results` and a fresh, exclusive manifest output may be retained. Each candidate is opened once with `O_NOFOLLOW`; its regular-file metadata, PNG signature, and copied bytes all come from that same descriptor before an exclusive destination is written, so a pathname swap cannot retain outside bytes. Existing stage/output paths fail closed and are never cleared or overwritten; traces, videos, response bodies, server dumps, secrets, and learner content are excluded. Browser runner server logs use a bounded rolling, redacted tail.

The offline gate reports `PRE_RELEASE_QUALITY_PASS` or `PRE_RELEASE_QUALITY_FAIL`. `release_closure_status` remains `NOT_EVALUATED` until an approved credentialed live evaluation supplies a passing, retained artifact; missing or failed live evidence cannot become `PRODUCTION_VERIFIED`. The live gate is intentionally documented but not executed by this lane and must not spend credits implicitly.

Request-only BYOK remains a per-request boundary. A managed provider or cloud-auth change requires a separately reviewed contract and an updated verifier allowlist.

## Read-only deployment verification

The verifier accepts a checked-in `--target-id` for remote inspection (or explicit `--allow-localhost` for a local artifact only), a full 40-character expected SHA, and—only for a remote candidate—an exact production Vercel deployment ID plus the name of an environment variable holding an API token. It collects bounded deployment metadata and build events from `api.vercel.com`, issues an opaque process-local receipt capability, and then performs bounded same-origin `GET` requests with redirects disabled to `/api/health`, all four Worlds, `/paths/source-corroboration`, `/pathways`, `/studio`, `/login`, `/account`, and same-origin versioned Next.js scripts. It checks exact SHA, the checked-in alias, immutable/project identity, the authenticated provider tuple, source/repository policy, provider event ordering, security headers, route markers, and client secret-pattern absence. It never submits forms or calls model/API write paths, and it does not claim byte-for-byte proof of every remote edge asset.

The observed Vercel events response is an array of envelopes whose log identity is nested at `event.payload.{deploymentId,id,date,text,info}`, with `event.created` on the envelope. A nested canonical marker must use its own `payload.date` and bind `payload.deploymentId` to the normalized deployment ID. The parser rejects duplicate markers within one text or across events, cross-deployment IDs, missing nested timestamps, and any event that mixes nested marker fields with top-level `text`, `id`, `deploymentId`, or `date`. A separately retained top-level legacy shape is accepted only with its own explicit deployment ID and creation timestamp. This parsing never turns saved JSON into the process-local receipt capability.

The script scan is a hard initial-HTML contract: it unions the distinct allowed `/_next/static/` script URLs referenced by those ten pages, requires a nonempty set of at most 32, then fetches and scans every admitted asset. The public-asset digest is over the complete emitted `.next/static` tree; the read-only network scan is deliberately limited to initial HTML assets. Hydration-only chunks are outside the network scan. Increasing the budget requires a new observed-count measurement, boundary-test update, and release-operations review.

Example (read-only; do not run against an unapproved origin):

```bash
pnpm exec tsx scripts/ops/deployment-verifier.ts \
  --target-id forge_learning_os_project \
  --expected-sha <40-character-git-sha> \
  --vercel-deployment-id <exact-production-ready-vercel-deployment-id> \
  --vercel-token-env VERCEL_RECEIPT_TOKEN \
  --expected-lockfile-digest <sha256> \
  --expected-content-manifest-digest <sha256> \
  --expected-evaluator-baseline-digest <sha256> \
  --expected-database-migration-identity not_configured \
  --output-dir test-results/release-ops
```

## Current CLI-source deployment diagnosis (read-only, 2026-07-23)

Exact source `04eab4263658725d7a228c67682c40fc469757b1` is operational at the public alias through production deployment `dpl_ET6nUWvjeVMEdacWJgCbxVsCT1qn`. The remote build emitted the canonical 42-asset marker and digest `02aef5b03c6a2fa016e202b23d1541ad712a295b17e15805d093efa239d2790b`. Public health binds the exact source and expected disabled posture, and production browser checks passed 5/5 plus the default pilot denial.

The complete verifier remains `DEPLOYMENT_BLOCKED` at 207 pass / 8 fail because the authenticated deployment record reports CLI source with `gitSource: null` and `gitRepo: null`. The failures are limited to the provider receipt schema/authority/tuple/time/asset checks and their dependent manifest/state bindings. Vercel Git connection and documented Git-source API creation both failed while GitHub exposed the requested public repository and exact `main` SHA. Do not repeat CLI uploads: an authorized owner must install or authorize the Vercel GitHub App for `RanaPriyansh/modelshift`, connect project `forge-learning-os`, and create a fresh production deployment from `main`.

## Blocked deployment diagnosis (read-only, 2026-07-22)

The connected Vercel read-only surface returned the following exact evidence:

| Item | Evidence |
| --- | --- |
| team | `ranapriyansh's projects`, slug `ranapriyanshs-projects`, id `team_lr0E9GlEDc3XYJP7xrx8po2W` |
| project | `forge-learning-os`, id `prj_SnTYtzLicYKYlHvXCNwq9J7ehQZB`, accountId equal to the team id, framework `nextjs` |
| blocked candidate | `dpl_GwTK18jVR2NmEb4VKa3KGhf6hLzi`, state `BLOCKED`, target `production`, created `2026-07-22T00:01:35.548Z` |
| Vercel creator | username `ranapriyansh`, email `priyanshrana18@gmail.com` |
| commit author in blocked metadata | name `Priyansh Rana`, email `Priyansh@Parimals-Mac.local` |
| blocked source | repository `RanaPriyansh/modelshift`, ref `main`, SHA `846158a492039b14381eae3c2fbb1f309d049ea5` |
| last READY rollback candidate | `dpl_ErMoTVT44TokPMQEyuo1BiPUgQQq`, SHA `af5f3ca54580fbaf5cf6498f97cc3d7dcca104cf`, `isRollbackCandidate: true` |
| build-log evidence | Vercel read-only build-log query returned `No build log events found.` |

The connected list-teams/project responses prove the project is under the named team and expose the creator identity, but do not expose a member roster or role. That missing role evidence is recorded as `NOT_EVALUATED`, not inferred. Remediation is an authorized owner check that `ranapriyansh` is an active member of the team/project with production deployment permission and that the GitHub commit author identity is linked to that account. The local lane is configured as `Priyansh Rana <priyanshrana18@gmail.com>`, so future authorized history should use that verified identity; adding or changing membership is outside this slice.

## Incident and rollback boundary

Hold promotion for a SHA mismatch, missing nonce/header, route failure, client secret indicator, or any deterministic gate failure. Preserve only the sanitized report and check IDs. There is no automatic rollback here. An authorized operator may later select a READY deployment whose exact SHA has a complete passing report, follow the provider's reviewed alias procedure, and re-run this verifier; those external actions are not performed by this lane.

`pnpm install --frozen-lockfile` and the public HTML/asset secret scan are hard gates in the local/CI path. Audit collection itself can contact the package registry, so this lane does not run it implicitly or classify invented output. An authorized security run must retain its sanitized raw audit output, separate production/runtime findings from development-only findings, record tool/version/time/source SHA, and leave the release candidate blocked for any unresolved production finding at the accepted policy threshold.
