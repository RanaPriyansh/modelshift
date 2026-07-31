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

### SEC-UV1-002: Environment-specific secret files were not ignored

**Severity:** Low

**Status:** Fixed in this candidate

**Location before the fix:** `.gitignore:14-17` at commit `a2ce47b`.

**Evidence before the fix:**

```gitignore
.env
.env.local
.env.*.local
```

`git check-ignore --no-index` did not ignore `.env.production`,
`.env.development`, `.env.test`, or `.env.preview`.

**Impact:** A developer could stage an environment-specific file that contains
provider, identity, or database secrets.

**Fix:** `.gitignore` now ignores `.env*` and explicitly keeps only
`.env.example` visible. A Git-backed regression test covers common deployment
modes and a nested environment file.

**Mitigation:** No secret-bearing environment file was tracked at the audit
base. `.env.example` contains empty or non-secret example values.

**False-positive notes:** An environment-specific file might contain only
public data. FORGE still treats the complete file as sensitive by default.

### SEC-UV1-003: Provider response bodies had no byte limit

**Severity:** Low while provider authority is disabled

**Status:** Fixed in this candidate

**Location before the fix:** `src/lib/lesson-studio/providers.server.ts:99-106`
at commit `edd49c6`.

**Evidence before the fix:**

```ts
async function readProviderJson(response: Response): Promise<unknown> {
  if (!response.ok) throw errorForHttpStatus(response.status);
  try {
    return await response.json();
  } catch {
    throw new LessonStudioError("malformed_provider_output");
  }
}
```

**Impact:** A compromised or incorrect provider could return an unbounded body.
An enabled server could use excessive memory before strict schema validation.

**Fix:** Provider fetch adapters now reject declared or streamed responses over
256 KiB. They also reject missing bodies and invalid UTF-8 before JSON parsing.

**Mitigation:** Provider authority remains structurally disabled. Transport
also has a fixed timeout and fixed output-token budget.

**False-positive notes:** The OpenAI SDK adapter does not use this fetch-body
reader. It retains its SDK output-token limit and strict structured-output
validation.

### SEC-UV1-004: Credential attempt buckets had no count limit

**Severity:** Low while cloud identity is disabled

**Status:** Fixed in this candidate

**Location before the fix:**
`src/lib/forge-auth/abuse-controls.server.ts:17-39` at commit `1d0bdea`.

**Evidence before the fix:** The process-local limiter stored one SHA-256 map
entry for each normalized email. Expired entries were removed only when the
same email returned. Unique addresses could therefore increase the map without
a fixed ceiling.

**Impact:** A future enabled sign-in action could use increasing server memory
when it receives many unique addresses. Unsalted address hashes also increase
the value of an in-memory disclosure.

**Fix:** The limiter now has a fixed 10,000-bucket ceiling, rejects new buckets
at capacity, and prunes expired buckets at the earliest known expiry. It uses a
random per-process HMAC key and rejects invalid clocks, limits, and identifiers.

**Mitigation:** Cloud identity remains structurally disabled. The limiter is
still only a process-local secondary control. Provider-side CAPTCHA and durable
distributed abuse controls remain release gates.

**False-positive notes:** The current public sign-in page contains no
credential form. This finding concerns a future authorized activation.

### SEC-UV1-005: Project sprint records had no raw byte limit

**Severity:** Low

**Status:** Fixed in this candidate

**Location before the fix:** `src/lib/forge-sprint/model.ts:558-619` and
`src/lib/forge-sprint/storage.ts:15-39` at commit `5ae2850`.

**Evidence before the fix:** The browser-local project sprint reader passed the
complete stored string to `JSON.parse`. The writer serialized and stored the
complete object without an explicit byte ceiling.

**Impact:** An oversized or corrupted browser value could increase parse time
and memory use. A large outgoing record could also consume the shared browser
storage quota and cause unrelated local continuity writes to fail.

**Fix:** Sprint reads and writes now enforce a five MiB UTF-8 ceiling with the
existing allocation-minimizing byte checker. Oversized reads remain untouched
for explicit learner recovery or deletion. Oversized writes fail before
storage mutation.

**Mitigation:** Sprint schemas already bound record counts, arrays, and field
lengths. Browser storage remains device-local and learner-controlled.

**False-positive notes:** Browsers usually enforce their own origin quota.
FORGE now has an explicit product boundary that does not depend on that quota.

## Verification

The candidate checks passed:

- 173 application test files with 1,520 tests;
- two evaluator test files with 13 tests;
- 1,533 tests in total;
- ESLint with zero warnings;
- TypeScript typecheck; and
- whitespace and patch validation.

The production dependency audit at
`docs/security/PRODUCTION_DEPENDENCY_AUDIT_2026-08-01.md` reported no known
advisory for the exact resolved production dependency graph.

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
- dependency and operating-system review against the release environment; and
- incident response, rollback, and external security review.
