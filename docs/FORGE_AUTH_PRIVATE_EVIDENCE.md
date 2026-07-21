# FORGE Adult Auth and Private Evidence Contract

Status: implemented and locally testable; not deployed or connected to a live Supabase project.

This slice adds optional Supabase SSR authentication and learner-owned private evidence sync for self-attested adults 18 and over. Anonymous learning and the browser ledger remain the default. Under-18 profiles are device-only and cannot use this table or be converted through the adult activation RPC.

## Environment contract

Set exactly these public values in local and hosting environments:

```dotenv
NEXT_PUBLIC_SITE_URL=https://your-forge-origin.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

- `NEXT_PUBLIC_SITE_URL` is the canonical origin used in email redirect URLs. HTTPS is required outside `localhost`/`127.0.0.1`.
- `NEXT_PUBLIC_SUPABASE_URL` is the project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the current publishable client key. RLS and grants remain mandatory because this value is public.
- There is intentionally no `SUPABASE_SERVICE_ROLE_KEY` contract. Do not add a service-role/secret key to client code, a `NEXT_PUBLIC_*` variable, logs, or build output.

The existing OpenAI environment variables remain independent and optional.

## Supabase project contract

1. Apply `supabase/migrations/202607220001_forge_learning_os.sql` followed by `supabase/migrations/20260722000200_forge_adult_private_evidence.sql`.
2. In Data API settings, expose only the `forge` schema needed by this application. Never expose `forge_private`.
3. Configure Auth Site URL to the exact `NEXT_PUBLIC_SITE_URL` origin.
4. Add `${NEXT_PUBLIC_SITE_URL}/auth/callback` to the Auth redirect allowlist.
5. Configure a production email provider for magic links, require confirmed email, keep anonymous sign-ins disabled, and configure Auth rate limits/CAPTCHA appropriate to the threat model.
6. Use separate Supabase projects and keys per environment. Do not reuse production learner data in development or tests.

The May 2026 Supabase Data API change means new projects may require explicit table/function exposure in addition to SQL grants. The migration supplies least-privilege grants and forced RLS; project Data API settings still determine whether the `forge` schema is reachable.

## Runtime behavior

- `proxy.ts` refreshes SSR cookies with `auth.getClaims()`; server authorization uses `auth.getUser()` and the database profile, never `getSession()` or editable `user_metadata`.
- The magic-link flow creates only a Supabase Auth identity. A second explicit activation confirms adult status and private-persistence intent before the learning-plane profile is created.
- Activation appends a distinct `private_evidence_persistence` grant to the consent ledger; it does not reuse general learning-service consent.
- Evidence never uploads automatically. The adult chooses **Sync this device now** on `/evidence`.
- The API accepts at most 100 strict entries and 256 KiB per request, requires a same-origin mutation, derives ownership from the authenticated user, and performs idempotent inserts.
- The synced table is owner-only under forced RLS. It grants `SELECT`, `INSERT`, and `DELETE`, but no `UPDATE`. It is a learner-controlled private copy, not `forge.evidence_events` canonical assessed evidence.
- Prior bounded assistance remains visible, but independent, return, and project proof are rejected unless assistance access was removed during the protected proof attempt.
- Cloud deletion does not remove the device ledger, and local deletion does not silently remove cloud data. Each boundary requires an explicit learner action.

## Verification

With a disposable local Supabase stack:

```bash
supabase db reset
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/forge_schema_contract.sql
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/forge_auth_private_evidence_contract.sql
```

In a Docker-less Homebrew PostgreSQL environment, apply `supabase/tests/local_auth_stub.sql` only to a disposable database before the two migrations. That stub is never a production migration.

Application verification:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

## Deliberate boundaries

- Adult status is self-attested, not age verification. This slice is not authorization for minor cloud accounts or a child-safety/compliance claim.
- Auth email delivery, CAPTCHA/rate limits, recovery, MFA policy, monitoring, backup deletion replay, and live privacy-operation evidence depend on the configured Supabase/hosting environment and must pass the applicable G2 gate before a production-security claim.
- No deployment is part of this handoff.
