# FORGE Semester Desk v2 deployment

This document describes the current production path for the FORGE web release.

It does not authorize a deployment, alias change, Vercel account change, secret change, or release decision.

## Current state

The Semester Desk v2 candidate is not deployed.

The public alias at `https://modelshift.vercel.app` still serves the retired product. The alias and repository retain legacy infrastructure names. Those names do not define the current product.

The [Current Public Release Record](operations/CURRENT_RELEASE.md) is the canonical deployed-state record. A local build, documentation update, Git push, or Vercel preview does not change that record.

## Production artifact

The production build is a Next.js server artifact. Vercel is the checked-in deployment target.

The release contains these canonical routes:

- `/`
- `/app`
- `/how-forge-works`
- `/university`
- `/privacy`
- `/terms`
- `/support`
- `/api/health`

Metadata routes and required `/_next/` assets are also allowed. All other application routes return `404` in the release artifact.

The browser application keeps student data in local browser storage. The deployment does not require a database, online identity, university connection, model provider, or cloud-sync service.

## Checked-in Vercel target

The source of truth is `src/operations/deployment-target-policy.ts`.

| Item | Required value |
| --- | --- |
| Target ID | `forge_learning_os_project` |
| Public alias | `https://modelshift.vercel.app` |
| Vercel project | `forge-learning-os` |
| Vercel project ID | `prj_SnTYtzLicYKYlHvXCNwq9J7ehQZB` |
| Vercel team ID | `team_lr0E9GlEDc3XYJP7xrx8po2W` |
| GitHub repository | `RanaPriyansh/modelshift` |
| GitHub repository ID | `1308085427` |
| Release branch | `main` |
| Immutable host rule | `forge-learning-*-ranapriyanshs-projects.vercel.app` |

Do not change these values through a command argument. A target change requires a reviewed source change.

## Local release gate

Use one clean commit for all release evidence.

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
FORGE_EXPECTED_RELEASE_SHA=<full-40-character-clean-git-sha> pnpm test:e2e:prod
```

The CI workflow also runs a retained ModelShift interpretation regression. That check is repository history. It does not validate Semester Desk behavior or efficacy.

CI also verifies the locked dependency source, dependency advisories, dependency signatures, browser receipts, production identity, release budgets, and the local deployment report.

Do not use a dirty checkout for release evidence. The build source identity becomes `unverified` when tracked or untracked source changes exist.

## Application configuration

No application variable is required for local use.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_FORGE_SITE_ORIGIN` | No | Canonical HTTPS origin for metadata, robots, and sitemap output. |
| `FORGE_SITE_ORIGIN` | No | Server-only alternative to the public site-origin setting. |
| `FORGE_PUBLIC_INDEXING` | No | Set to `true` only for an approved non-Vercel public origin. |

On Vercel production, `VERCEL_URL` supplies the origin fallback. `VERCEL_ENV=production` enables indexing. These are platform variables.

## Release evidence variables

The build and `/api/health` use these values for release evidence:

| Variable | Owner | Rule |
| --- | --- | --- |
| `FORGE_RELEASE_CANDIDATE_STATE` | Release configuration | Use only `DEPLOYED_CANDIDATE` for the exact production candidate. |
| `FORGE_LOCKFILE_DIGEST` | CI or release process | Use the exact lowercase SHA-256 digest from the immutable lockfile gate. |
| `FORGE_CONTENT_MANIFEST_DIGEST` | CI or release process | Use the exact SHA-256 digest of `scripts/ops/content-package-manifest.json`. |
| `FORGE_EVALUATOR_BASELINE_DIGEST` | CI or release process | Use the exact SHA-256 digest of `scripts/ops/evaluation-baseline.json`. |
| `FORGE_DATABASE_MIGRATION_IDENTITY` | Release configuration | Use `not_configured` for this local-only release. |
| `FORGE_BUILD_TIME` | Release process | Optional ISO timestamp. It is diagnostic only. |

Local verification can use `FORGE_RELEASE_SHA` as a diagnostic source value. A deployed candidate must not use it as source authority.

Do not set these retired or caller-owned identity variables:

- `FORGE_PUBLIC_ASSET_DIGEST`
- `FORGE_PUBLIC_ASSET_DIGEST_STATUS`
- `FORGE_PUBLIC_ASSET_DIGEST_GATE`
- `FORGE_RELEASE_ALIAS_URL`
- `FORGE_RELEASE_ALIAS_RESOLVED_AT`
- `FORGE_RELEASE_DEPLOYMENT_ID`
- `FORGE_RELEASE_IMMUTABLE_URL`

Any one of these values can make the public manifest fail closed.

## Required Vercel system variables

Vercel must inject these values from the production Git deployment:

- `VERCEL=1`
- `VERCEL_ENV=production`
- `VERCEL_GIT_COMMIT_SHA`
- `VERCEL_DEPLOYMENT_ID`
- `VERCEL_URL`
- `VERCEL_PROJECT_ID`

Expose Vercel System Environment Variables to the build and runtime. Do not copy these values into `.env.local` or maintain them as user-defined project variables.

The release manifest binds only when all platform values match the checked-in project, repository, branch, source SHA, and immutable-host policy.

## Exact external Vercel gates

Complete these external actions before production verification:

1. Install or authorize the Vercel GitHub App for `RanaPriyansh/modelshift`.
2. Connect that repository to Vercel project `forge-learning-os`.
3. Configure `main` as the production branch.
4. Expose Vercel System Environment Variables.
5. Add the release evidence variables for the exact candidate.
6. Create a new production deployment from Git source.
7. Record its full Git SHA, `dpl_...` deployment ID, and immutable URL.
8. Put a read-only `VERCEL_RECEIPT_TOKEN` in the protected GitHub environment `forge-production-read-only`.
9. Require the approved reviewers for that GitHub environment.
10. Run the read-only deployment verification workflow from the same `main` SHA.

Do not use `vercel --prod` or another CLI upload. A CLI-source deployment has no provider-owned Git source and repository tuple. The verifier must reject it.

## Read-only production verification

The workflow `.github/workflows/deployment-verification.yml` requires:

- target ID `forge_learning_os_project`;
- the exact checked-out 40-character `main` SHA; and
- the exact READY production Vercel deployment ID.

The workflow supplies `VERCEL_RECEIPT_TOKEN` only to the read-only verifier process.

The equivalent repository command is:

```bash
pnpm exec tsx scripts/ops/deployment-verifier.ts \
  --target-id forge_learning_os_project \
  --expected-sha <full-40-character-main-sha> \
  --vercel-deployment-id <exact-ready-production-deployment-id> \
  --vercel-token-env VERCEL_RECEIPT_TOKEN \
  --expected-lockfile-digest <lowercase-sha256> \
  --expected-content-manifest-digest <lowercase-sha256> \
  --expected-evaluator-baseline-digest <lowercase-sha256> \
  --expected-database-migration-identity not_configured \
  --output-dir test-results/release-ops
```

The verifier performs bounded, read-only Vercel API requests. It checks the provider-owned Git tuple, deployment state, build marker, release manifest, canonical routes, headers, CSP, initial scripts, and client secret patterns.

A saved JSON receipt cannot replace the same-process Vercel receipt. A green route check cannot replace provider Git provenance.

## Promotion and rollback boundary

The verifier does not deploy, promote, change an alias, or roll back.

Before an authorized alias decision, retain:

- the exact candidate SHA and immutable deployment;
- a complete passing verifier report;
- the prior READY rollback deployment and its exact SHA;
- a named release decision and time; and
- a reviewed rollback procedure.

After any authorized alias change, run the same read-only verifier again against the alias. Keep the candidate blocked when any identity, route, header, digest, secret-scan, or provider-receipt check fails.

## Other public-launch gates

Vercel deployment does not close these gates:

- legal approval for the draft terms and privacy text;
- approval of a monitored support channel, if one is required;
- final release authority;
- rollback authority; and
- any future credential, account, database, or student-data operation.

Do not add those services or claims to this release without a separate product and security decision.
