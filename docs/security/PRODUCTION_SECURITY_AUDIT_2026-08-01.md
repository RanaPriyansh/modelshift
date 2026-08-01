# FORGE production security audit

**Audit date:** 1 August 2026

**Implementation source:** `ed1ac56885e953b762c18f54fb8cb8ef32d28906`

**Implementation tree:** `aeeb0bc4959bcd2d4a69a90630e1a62b7e2a49a6`

**Release status:** local implementation candidate

## Scope

The audit reviewed the public frontend, server routes, account actions,
provider boundaries, dependency graph, CI workflows, and release evidence.

The audit reviewed the current source. It did not inspect a live deployment,
GitHub environment configuration, provider account, database, or edge service.

## Review result

The frontend review found no confirmed security defect. The source has no raw
HTML sink, string execution sink, third-party script, service worker, or secret
client environment value.

The server review found no confirmed security defect. All POST routes enforce
origin, media type, body size, and runtime schema limits. Provider transports
and cloud identity remain fail closed.

The release review found six repairable control gaps. This candidate repairs
all six gaps.

## Implemented repairs

1. The Vercel token now exists only in the verifier step.
2. The verifier job requires `main` and a protected GitHub environment.
3. The expected release SHA must equal the checked-out `GITHUB_SHA`.
4. Release manifest schema `2.0` requires a complete artifact receipt.
5. Provider receipt schema `2.0` binds the clean Git tree and complete build receipt.
6. The health verifier binds the compiled source payload and response header.
7. Failure screenshots now have content digests in manifest schema `2.0`.
8. A browser failure now requires a nonempty valid evidence manifest.
9. CI now checks high advisories and all registry signatures.
10. A daily dependency workflow repeats the full graph checks.
11. CI installs dependencies without scripts before advisory verification.
12. CI runs only allowlisted dependency builds after verification.
13. An independent inline gate rejects source, index, ignored-file, and HEAD drift.
14. Node.js is pinned to `22.22.3` in CI and `.node-version`.
15. The repository requires Node.js `>=22.13.0`.
16. The repository sets an explicit 1,440-minute package release delay.
17. The locked brace-expansion versions now contain the published DoS fix.
18. CI requires the positive university-foundation browser suite.

## Exact local verification

The final verification used a clean detached worktree at the implementation
source. No prior build output existed in that worktree.

- Frozen install without dependency scripts: pass.
- High advisory gate: pass.
- Full advisory report: zero known advisories.
- Registry signatures: 576 of 576 pass.
- Allowlisted dependency rebuild: pass.
- Inline source-authority gate: pass.
- Immutable lockfile gate: pass.
- Lint: pass with zero warnings.
- TypeScript: pass.
- Application contracts: 1,582 pass across 177 files.
- Evaluator contracts: 13 pass across two files.
- Total contracts: 1,595 pass.
- Offline evaluation: 54 authored fixtures pass.
- Live model evaluation: not run.
- Optimized production build: pass.
- Generated static pages: 67.
- Public static files: 71.
- Production receipt files: 1,472.

## Production build receipt

```json
{
  "schemaVersion": "forge-production-build-receipt.v3",
  "sourceCommit": "ed1ac56885e953b762c18f54fb8cb8ef32d28906",
  "sourceTree": "aeeb0bc4959bcd2d4a69a90630e1a62b7e2a49a6",
  "sourceState": "clean",
  "buildId": "forge-source-v1-ed1ac56885e953b762c18f54fb8cb8ef32d28906",
  "artifactDigest": "sha256:12754b41b49132a774e8b5c9485cd26dca893d306bf196752f478f0d73c4a70f",
  "artifactFileCount": 1472,
  "publicAssetDigest": "sha256:e9e3cbb07f265392a4f798d6f677e4bef3f0c296159c81327875b57a3cea4911",
  "publicAssetFileCount": 71,
  "publicDirectoryDigest": "sha256:e0096e369f47666ca5a3f962b71b6f5199a17117ac5ce4a598d1b77dc42abac9",
  "publicDirectoryFileCount": 5,
  "runtimeCachePolicy": "fresh_ephemeral_next_cache_v1",
  "runtimeConfigurationDigest": "sha256:06e97d7ea5aaf83b90deef10f941678198a442a267e97f9f23a1a97603774e29",
  "runtimeConfigurationFileCount": 4
}
```

## Residual release gates

- Configure required reviewers for `forge-production-read-only`.
- Restrict the environment to `main`.
- Store the Vercel token as an environment secret.
- Confirm the token has only required read access.
- Run the required browser jobs in CI.
- Collect one live provider receipt for the exact deployed candidate.
- Verify the public alias after provider receipt collection.
- Obtain explicit push and deployment authority.

The local candidate is not a deployment. It provides no live provider,
database, identity, tutoring, participant, or learning-value evidence.

The browser suites did not run locally. Product Design requires the selected
Chrome workflow unless the user gives permission for direct Playwright use.
