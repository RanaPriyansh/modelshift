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
| browser contract | `pnpm test:e2e` | `FAIL` |
| local artifact verification | `run-local-production-verification.ts` | `FAIL` |

`NOT_EVALUATED` is never promoted to `PASS`. The offline comparator is deterministic evidence only; live model quality, learner outcomes, consent, and production readiness remain outside this slice.

Reports contain schema/version/SHA, bounded aggregate metrics, check IDs, and status. They do not contain learner explanations, response bodies, cookies, authorization headers, environment dumps, model transcripts, or secret values. CI retains only the sanitized report directory for 14 days.

## Runtime identity and privacy contract

`GET /api/health` is dynamic and uncached. Its allowlisted payload includes `app_name`, exact `release_sha`, `build_time`, `runtime_mode`, cloud flags, device/evidence mode, and managed-provider flags. It returns booleans and allowlisted enum values only; it never returns credentials or learner state.

The current cost-controlled baseline must report:

- `runtime_mode: fallback_only` and `provider_mode: request_only_byok`;
- `cloud_accounts_enabled: false`, `cloud_auth_configured: false`;
- `device_profiles: device_only`, `learner_evidence_sync: disabled`; and
- all managed provider flags false.

Request-only BYOK remains a per-request boundary. A managed provider or cloud-auth change requires a separately reviewed contract and an updated verifier allowlist.

## Read-only deployment verification

The verifier accepts only an absolute HTTPS origin whose hostname is supplied explicitly with `--allowed-host`, plus a full 40-character expected SHA. `--allow-localhost` is required for local HTTP. It issues bounded same-origin `GET` requests with redirects disabled to `/api/health`, all four Worlds, `/studio`, `/login`, `/account`, and same-origin versioned Next.js scripts. It checks exact SHA, source/runtime identity, disabled cloud/provider state, CSP nonce continuity, security headers, route markers, and client secret-pattern absence. It never submits forms or calls model/API write paths.

Example (read-only; do not run against an unapproved origin):

```bash
pnpm exec tsx scripts/ops/deployment-verifier.ts \
  --base-url https://<approved-origin> \
  --allowed-host <approved-host> \
  --expected-sha <40-character-git-sha> \
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
