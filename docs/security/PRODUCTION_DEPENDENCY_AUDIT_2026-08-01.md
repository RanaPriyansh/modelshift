# Production dependency advisory audit

**Local date:** 1 August 2026

**Audit time:** `2026-07-31T22:47:51Z`

**Audited source:** `943078700d49af236b26df111e0ba3a40414edaa`

**Lockfile SHA-256:**
`f43d90dd2c7592b5202f0dc49425ba8cc315abeabf4c48bdf59beefdd12aae48`

**Runtime:** Node.js `v22.22.3`

**Audit tool:** pnpm `11.9.0`

**Registry:** `https://registry.npmjs.org/`

## Command

```text
pnpm audit --prod --json
```

## Sanitized raw result

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
    "dependencies": 31,
    "devDependencies": 0,
    "optionalDependencies": 95,
    "totalDependencies": 126
  }
}
```

The command returned exit code zero. The registry reported no known advisory
for the resolved production dependency graph at the recorded time.

## Claim boundary

This result is a time-bound registry advisory query. It is not a source review,
malware scan, supply-chain proof, runtime penetration test, or provider audit.

The audit does not verify the deployment image, operating system, edge
configuration, secrets, database, identity provider, or live model provider.

Run the audit again for any lockfile change and before release promotion.
