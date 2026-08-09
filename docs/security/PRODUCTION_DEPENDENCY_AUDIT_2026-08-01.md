# Production dependency advisory audit

**Local date:** 1 August 2026

**Audit time:** `2026-08-01T03:43:00Z`

**Audited source:** `ed1ac56885e953b762c18f54fb8cb8ef32d28906`

**Audited tree:** `aeeb0bc4959bcd2d4a69a90630e1a62b7e2a49a6`

**Lockfile SHA-256:**
`5a8f1a8cab7571bd7b3db942420a9e49cb7a3ebe67103cf9a9907dd2d600db7d`

**Runtime:** Node.js `v22.22.3`

**Audit tool:** pnpm `11.9.0`

**Registry:** `https://registry.npmjs.org/`

## Commands

```text
pnpm install --frozen-lockfile --ignore-scripts
pnpm audit --audit-level high
pnpm audit --json
pnpm audit signatures
pnpm rebuild esbuild sharp unrs-resolver
```

The install boundary then verified these conditions:

- `HEAD` matched the immutable source.
- All tracked files matched the immutable source.
- No untracked file existed.
- No ignored path existed outside `node_modules/**`.
- No Git index flag hid a workspace change.
- The lockfile matched its preinstall digest.

## Sanitized advisory result

```json
{
  "advisories": {},
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 0,
      "high": 0,
      "critical": 0
    },
    "dependencies": 73,
    "devDependencies": 450,
    "optionalDependencies": 136,
    "totalDependencies": 576
  }
}
```

All 576 installed packages had valid registry signatures. Both audit commands
returned exit code zero.

The locked graph now resolves `brace-expansion` to `1.1.17` and `5.0.8`.
These versions contain the fix for `GHSA-mh99-v99m-4gvg`.

## Continuous gates

The quality workflow checks the full locked graph on each required run. It
verifies registry signatures before it runs the three allowlisted dependency
builds.

The dependency workflow repeats the advisory and signature checks each day.
It installs the graph without dependency scripts.

The deployment verifier installs without scripts. It checks advisories and
signatures before it rebuilds only `esbuild`.

## Claim boundary

This result is a time-bound registry advisory query. It is not a malware scan,
runtime penetration test, or provider audit.

Registry signatures establish registry package provenance. They do not prove
that package behavior is safe.

The audit does not verify the deployment image, operating system, edge
configuration, secrets, database, identity provider, or live model provider.

Run the audit again for any lockfile change and before release promotion.
