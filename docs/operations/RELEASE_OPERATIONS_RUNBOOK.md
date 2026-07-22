# FORGE Release, Evaluation, and Observability Runbook

This slice is a read-only operations boundary. It never deploys, changes an alias, enables credentials, calls a paid provider, writes a live database, or uploads learner content.

## Release gates

`.github/workflows/quality-gates.yml` is an immutable-source workflow with `contents: read`, pinned actions, no secrets, empty provider credentials, and explicit cloud/provider-off flags. A release candidate requires all of these gates on the same SHA:

| Gate | Evidence | Missing evidence |
| --- | --- | --- |
| locked install | `pnpm install --frozen-lockfile` | `FAIL` |
| lint/typecheck/unit | `pnpm lint`, `pnpm typecheck`, `pnpm test` | `FAIL` |
| offline regression | `pnpm eval` and sanitized evaluation report | `FAIL` |
| production build | `pnpm build` with `FORGE_RELEASE_SHA` and `FORGE_BUILD_TIME` | `FAIL` |
| browser contract | built artifact via `run-production-browser-verification.ts` (`next start`, unique port, full relevant Playwright suite) | `FAIL` |
| local artifact verification | `run-local-production-verification.ts` | `FAIL` |

`NOT_EVALUATED` is never promoted to `PASS`. The offline comparator is deterministic evidence only; live model quality, learner outcomes, consent, and production readiness remain outside this slice.

Reports contain schema/version/SHA, bounded aggregate metrics, check IDs, and status. They do not contain learner explanations, response bodies, cookies, authorization headers, environment dumps, model transcripts, or secret values. CI retains only the sanitized report directory for 14 days.

## Runtime identity and privacy contract

`GET /api/health` is dynamic and uncached. Its allowlisted payload includes `app_name`, exact `release_sha`, `build_time`, runtime mode, independent managed-surface flags (Lesson Studio, interpretation, planner), aggregate provider state, cloud flags, device/evidence mode, and safe retained-artifact digests. It returns booleans, digests, and allowlisted enum values only; it never returns credentials or learner state. Any managed surface requires its own explicit enable flag plus a nonempty server-side value. The resulting flag is configuration intent, not credential-validity or provider-success proof; disabled switches or missing/empty values report false. The production verifier still requires every managed flag to be disabled for this cost-controlled baseline.

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

The only candidate states are `BUILT_LOCAL`, `PUSHED`, `DEPLOYMENT_BLOCKED`, `DEPLOYED_CANDIDATE`, `PRODUCTION_VERIFIED`, and `ROLLED_BACK`. The worker verifier defaults local runs to `BUILT_LOCAL`, remote origins without immutable deployment metadata to `DEPLOYMENT_BLOCKED`, and remote origins with supplied immutable metadata to `DEPLOYED_CANDIDATE`; it rejects terminal-state/live-proof inputs and never upgrades a candidate to `PRODUCTION_VERIFIED` or changes an alias.

Terminal validation is a principal-owned contract, not a caller assertion: it requires canonical HTTPS origin-only immutable deployment and alias URLs, a canonical timestamp and decision, the exact typed and secret-free health projection, all critical checks passing, and separately supplied authority whose deployment, alias resolution, production-verification artifact, live-evaluation artifact, rollback rehearsal artifact, SHA, and decision all exactly match the tuple and retained artifact list. Every tuple and authority object is an exact-key schema: unknown fields, including secret-like keys, fail closed. The decision has a typed outcome: `not_authorized`, `promote`, or `rollback`; the name is bounded descriptive metadata and is never parsed for authority. Every nonterminal state requires `not_authorized`; `PRODUCTION_VERIFIED` requires matching tuple and authority outcomes of `promote`; `ROLLED_BACK` requires matching `rollback`; workers default to `not_authorized` and reject caller-provided outcome input. `ROLLED_BACK` additionally requires the alias resolution to identify the rollback deployment itself. Missing, malformed, mismatched, self-asserted, or terminal-worker input fails closed.

CI derives the build timestamp from the exact commit timestamp and injects lockfile, content-manifest, evaluator-baseline, and database-state metadata before `next build`. These digests are retained-artifact metadata, not additional ADR-006 tuple fields. The checked-in `scripts/ops/deployment-target-policy.ts` is the only workflow target authority; dispatch callers select a target ID and cannot redefine its URL or host. DNS is checked for each bounded request, private/link-local/metadata destinations (including IPv4-mapped IPv6) are rejected, the validated public address is pinned in the HTTP lookup transport while preserving hostname/SNI/TLS, DNS rebinding fails closed, and redirects are never followed. Browser failure collection runs under `always()`: only bounded synthetic PNG screenshots selected into a fresh, exclusive staging directory physically contained in `test-results` and a fresh, exclusive manifest output may be retained. Each candidate is opened once with `O_NOFOLLOW`; its regular-file metadata, PNG signature, and copied bytes all come from that same descriptor before an exclusive destination is written, so a pathname swap cannot retain outside bytes. Existing stage/output paths fail closed and are never cleared or overwritten; traces, videos, response bodies, server dumps, secrets, and learner content are excluded. Browser runner server logs use a bounded rolling, redacted tail.

The offline gate reports `PRE_RELEASE_QUALITY_PASS` or `PRE_RELEASE_QUALITY_FAIL`. `release_closure_status` remains `NOT_EVALUATED` until an approved credentialed live evaluation supplies a passing, retained artifact; missing or failed live evidence cannot become `PRODUCTION_VERIFIED`. The live gate is intentionally documented but not executed by this lane and must not spend credits implicitly.

Request-only BYOK remains a per-request boundary. A managed provider or cloud-auth change requires a separately reviewed contract and an updated verifier allowlist.

## Read-only deployment verification

The verifier accepts only an absolute HTTPS origin whose hostname is supplied explicitly with `--allowed-host`, plus a full 40-character expected SHA. `--allow-localhost` is required for local HTTP. It issues bounded same-origin `GET` requests with redirects disabled to `/api/health`, all four Worlds, `/studio`, `/login`, `/account`, and same-origin versioned Next.js scripts. It checks exact SHA, source/runtime identity, disabled cloud/provider state, restrictive `script-src`/`script-src-elem`, same-origin `connect-src` and `form-action`, security headers, route markers, and client secret-pattern absence. It never submits forms or calls model/API write paths.

The script scan is a hard initial-HTML contract: it unions the distinct allowed `/_next/static/` script URLs referenced by those nine pages, requires a nonempty set of at most 32, then fetches and scans every admitted asset. Wave 4 measured 25 distinct initial assets; the seven-slot reserve is deliberate bounded headroom, not an unbounded bypass. Hydration-only chunks are outside this read-only initial-HTML check. Increasing the budget requires a new observed-count measurement, boundary-test update, and release-operations review.

Example (read-only; do not run against an unapproved origin):

```bash
pnpm exec tsx scripts/ops/deployment-verifier.ts \
  --target-id forge_learning_os_project \
  --expected-sha <40-character-git-sha> \
  --expected-lockfile-digest <sha256> \
  --expected-content-manifest-digest <sha256> \
  --expected-evaluator-baseline-digest <sha256> \
  --expected-database-migration-identity not_configured \
  --output-dir test-results/release-ops
```

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
