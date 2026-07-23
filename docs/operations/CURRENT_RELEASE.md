# FORGE Current Public Release Record

**Canonical current-state locator:** this is the only normative current public-release record. Historical Wave 2–4 records remain evidence for their named source only.

## Recorded tuple

| Field | Recorded value | Verification boundary |
| --- | --- | --- |
| Candidate state | `DEPLOYMENT_BLOCKED` | The app is public and operational, but the release identity cannot pass the retained-asset gate. Never `PRODUCTION_VERIFIED` or a readiness claim. |
| Deployed source | `35a1d2c5bd28c7b794b26414c6bdfe8f18097027` | Vercel metadata and public `/api/health` identify this exact SHA. |
| Public alias | `https://modelshift.vercel.app` | Public target only; alias resolution is not a terminal decision. |
| Immutable deployment | `dpl_Er7rVecXt3iga56P4uPDoLnWt9V4` | `https://forge-learning-7a63ywsp5-ranapriyanshs-projects.vercel.app` |
| Build time | `2026-07-23T16:27:07.977Z` | Platform build record; health exposes the same canonical instant. |
| Lock digest | `12f19d4483c15fec5463c7114ddb496b61bcd850f5822fbb49bd3d2d93f3323b` | Public health matches the checked-in dependency lock. |
| Content-manifest digest | `5f0124bd6ffc1365880279318cc8161e251eaa27da1181e29a928b9e5af74836` | Public health matches the checked-in content package manifest. |
| Evaluator-baseline digest | `9bb3f7e7cfd7a3dac351a06757f8b0b5f704024a39dc0f7fa4cd951e1c317b35` | Public health matches the checked-in evaluator baseline. |
| Database migration identity | `not_configured` | The public candidate has no configured database authority. |
| Manifest public-asset digest | `b1f8d95f0d31ce1e365f56e1c189d0a4aea138ddff7491dd6d20accd956119c7` | Precomputed local build input; it does not match the platform-emitted tree. |
| Platform-emitted public-asset digest | `aad49329533835e0ae319c56990f01afff52ebd35f98b130b44f2e56c1dcc3b1` | Observed from the retained Vercel remote-build output for this exact deployment. |
| Release-manifest binding | `BLOCKED_ASSET_RECEIPT` | Public verification passed 206 checks and failed four identity checks because the artifact self-report and provider-emitted asset digest differ. |
| Rollback rehearsal | `NOT_EVALUATED` | No alias change or rehearsal was performed by this repair lane. |

This record is evidence about the named deployed source only. The commit that adds or changes this document is local review material; it is not deployed merely by existing in Git.

## What this candidate does and does not establish

The source contains four authored bounded Worlds, the fixture-only adult presentation route at `/paths/source-corroboration`, frontend route/accessibility repairs, and a deterministic non-routed adult-pilot controller kernel. Engineering checks can establish only the exact software behavior they exercised.

It does **not** establish a minor operational release, verified guardian service, adult entitlement service, broad curriculum, homeschool operation/readiness, learning efficacy, retention, certification, durable evidence, live provider operation, manual assistive-technology coverage, or terminal production readiness.

## Current deployment-blocking finding

The integrated manifest assumed that a `.next/static` digest computed before deployment could be retained as the expected digest for the Vercel remote build. Production disproved that assumption:

- the exact-source deployment above asserted the local digest `b1f8d95f...` but emitted `aad493295...`;
- a second, non-promoted production-target build of the same source asserted `aad493295...` and emitted `83e1de1a3...`.

The emitted asset tree is therefore deployment-specific in this environment. Repeating a deployment with the previous output bound as the next expected input does not create reproducible proof. The public verifier correctly returned `DEPLOYMENT_BLOCKED` with 206 passes and four failures: `health.release_manifest.public_asset_authority`, `health.release_manifest.binding`, `release_identity.contract`, and `release_identity.state_bound`.

The app remains public because its same-origin route, header, CSP, source-SHA, digest, secret-scan, and browser checks passed; that operational evidence must not be promoted into a verified-release claim.

## Required binding for a later candidate

The current public deployment cannot satisfy the corrected asset-proof boundary because it predates the accepted provider-receipt contract. A later candidate must preserve fail-closed source/platform checks and supply this complete tuple:

- `FORGE_RELEASE_CANDIDATE_STATE=DEPLOYED_CANDIDATE`
- platform-owned exact `VERCEL_GIT_COMMIT_SHA`; caller `FORGE_RELEASE_SHA` is ignored for a bound candidate
- `FORGE_BUILD_TIME`, if present, is diagnostic metadata only
- exact `FORGE_LOCKFILE_DIGEST`
- no claim that a locally precomputed `.next/static` digest is the platform-emitted digest
- platform-owned `VERCEL_DEPLOYMENT_ID`, `VERCEL_URL`, and `VERCEL_PROJECT_ID` matching the checked-in FORGE project/immutable-host policy; `FORGE_RELEASE_DEPLOYMENT_ID` or `FORGE_RELEASE_IMMUTABLE_URL` cannot override them
- the checked-in public alias only; no caller-provided alias-resolution timestamp or alias override is accepted in the deployment artifact
- a same-process authenticated provider receipt bound to the exact production deployment ID, project ID, provider Git source/repository identity, source SHA, immutable URL, provider creation/log timestamps, and platform-emitted public-asset digest

Any malformed field, missing platform field, project/source-SHA drift, caller alias receipt, preview target, CLI/local source, or receipt/deployment mismatch must remain blocked. The accepted verifier requires the manifest alias to match its checked-in target, the immutable URL and project ID to pass policy, the provider-owned GitHub repository ID/ref/SHA and repository fields to match, the production deployment creation/log/alias timestamps to be ordered, and the exact emitted digest marker to come from the authenticated provider event stream. Plain receipt JSON cannot recreate the process-local capability and cannot promote a candidate.

The production binding path remains a Vercel remote build/runtime with System Environment Variables exposed, because it needs the platform-owned deployment ID, URL, project ID, and commit SHA. The current deployment was initiated by the Vercel CLI and built remotely; a local prebuilt deployment does not receive those system variables at build time unless it has separately configured custom identity. This repository does not treat caller `FORGE_*` identity as an equivalent fallback. The verifier produces the post-deploy `alias_verified_at` receipt only after fetching the alias; a separate post-build provider observation must produce the asset receipt. Neither the deployment artifact nor this documentation can manufacture either fact.

## Rollback rehearsal and decision procedure — not executed

This is a runnable decision checklist, not permission to change Vercel. It requires a separately authorized operator and never treats a documentation record as rollback evidence.

1. Freeze a signed/retained decision packet naming the current bound candidate, a prior READY rollback deployment ID, its immutable URL, exact source SHA, expected alias, and the independent approver. If any value is absent, stop as `NOT_EVALUATED`.
2. Run the read-only verifier against the current alias with its exact SHA, retained source digests, exact production Vercel deployment ID, and a Vercel API token named through `--vercel-token-env`. The verifier creates the receipt capability in-process; saved receipt JSON cannot replace it. It must pass the complete bound health-manifest, all canonical routes, CSP, initial-asset secret scan, and candidate identity checks. The currently recorded legacy CLI candidate cannot pass this Git-source gate.
3. Collect the proposed rollback deployment's provider metadata/receipt separately and compare its READY ID/URL/SHA/project tuple with the decision packet. The alias verifier remains pinned to the checked-in public target. Do not continue on a human label, alias history, saved receipt JSON, or SHA-only health.
4. The authorized operator records `proceed` or `hold`. `hold` is mandatory for any SHA, manifest, route, secret-scan, digest, readiness, or authority mismatch. This lane does not execute the provider alias action.
5. Only after a separately authorized provider alias change, re-run step 2 against the alias using the rollback tuple. Record the before/after alias resolution, verifier reports, decision time, and any failure. A failed post-change verifier requires the incident procedure; it never becomes `ROLLED_BACK` by assertion.

No automatic rollback, deploy, DNS change, Vercel mutation, or provider/model call is part of this procedure.
