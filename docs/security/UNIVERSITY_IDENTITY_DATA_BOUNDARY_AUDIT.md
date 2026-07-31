# University identity and student-data boundary security audit

**Date:** 1 August 2026

**Scope:** Next.js and React identity, provider-authority, university
account-context, browser storage, request validation, security headers, and
production-denial boundaries.

**Base:** `58e88b995bd224c78139196b234316d67b3cb00b`

## Executive summary

The audit found no active cloud identity, university persistence, or managed
provider path. The current server authority remains structurally disabled.

The audit found one low-severity data-minimization defect. The university
account-context adapter accepted an email field although correlation required
only the account ID. This candidate removes contact data from correlation-only
identity projections and rejects identity records that contain it.

This audit does not establish production security. Live edge headers, a
configured identity provider, a configured database, RLS isolation, backup
deletion, rate limits, CAPTCHA, and incident operations remain unverified.

## Audit coverage

The review inspected:

- all four request handlers under `app/api`;
- the account Server Actions and session-cookie configuration;
- the root proxy, CSP, and global response headers;
- provider authorization and one-use transport grants;
- university student-context and account-context input boundaries;
- browser-local device, continuity, checkpoint, and evidence storage;
- client HTML, navigation, cross-window, and dynamic-code sinks;
- server input validation, caching, outbound requests, logs, and secrets; and
- the current cloud, persistence, provider, age, and research authority gates.

## Critical findings

No critical finding was identified in this bounded code audit.

## High findings

No high finding was identified in this bounded code audit.

## Low findings

### SEC-UV1-001: Correlation-only identity accepted contact data

**Severity:** Low

**Status:** Fixed in this candidate

**Location before the fix:** `src/lib/university-account-context/adapter.server.ts`
at base `58e88b9`, imports and identity schema near lines 14 and 41-45.

**Evidence before the fix:**

```ts
import { readForgeCloudIdentity } from "@/src/lib/forge-auth/session.server";

const forgeCloudIdentitySchema = z.strictObject({
  id: z.string().uuid(),
  email: z.string().email().max(254).nullable(),
  accountKind: z.literal("cloud_identity"),
});
```

**Impact:** A future enabled account boundary could pass contact data into code
that needs only pseudonymous correlation. This increases accidental disclosure
and logging risk without adding authority.

**Fix:** `src/lib/forge-auth/session.server.ts:13-25` now defines a minimal
identity subject projection. Account-context and provider-authority consumers
use that projection. `src/lib/university-account-context/adapter.server.ts:41-44`
now rejects email and all unknown identity fields.

**Mitigation:** Cloud identity and provider authority remain structurally
disabled. The account binding key also remains unavailable.

**False-positive notes:** The account page still needs a separately scoped,
masked email projection. This finding applies only to correlation-only server
consumers.

## Verification

The candidate checks passed:

- 172 application test files with 1,514 tests;
- two evaluator test files with 13 tests;
- 1,527 tests in total;
- ESLint with zero warnings;
- TypeScript typecheck; and
- whitespace and patch validation.

The exact clean production build and commit receipt belong to the final
candidate handoff. This report does not claim them.

## Residual gates

The following items remain outside this candidate:

- configured adult identity and recovery operation;
- CAPTCHA and durable distributed abuse controls;
- configured database identity and two-account RLS isolation;
- retention, export, correction, deletion, and backup reconciliation;
- provider consent, quota, input binding, and live transport evidence;
- live security-header and edge configuration verification;
- dependency advisory review against the release environment; and
- incident response, rollback, and external security review.
