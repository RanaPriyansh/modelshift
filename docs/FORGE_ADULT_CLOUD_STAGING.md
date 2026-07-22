# FORGE adult cloud staging

This packet deliberately leaves private evidence persistence disabled. Existing device-ledger v1 records and exports remain browser-local, readable, and unchanged.

Public cloud signup is disabled. A browser-provided adult checkbox cannot create an account. The sign-in action accepts only an existing, active server-owned adult profile, and signs every other session back out. Under-18 cloud identity, private evidence, sharing, contact, open-web retrieval, and managed provider use remain disabled.

Cloud configuration remains invalid unless all of the following server-only values are present:

```text
FORGE_CLOUD_ACCOUNTS_ENABLED=true
FORGE_SUPABASE_URL=https://<project>.supabase.co
FORGE_SUPABASE_PUBLISHABLE_KEY=<publishable key only>
FORGE_CLOUD_AUTH_ABUSE_CONTROLS=reviewed
FORGE_CLOUD_AUTH_LIVE_INTEGRATION=two_account_isolation_verified
```

Never place any value above in `NEXT_PUBLIC_*`; do not provide a secret or service-role key. `reviewed` is allowed only after provider-side CAPTCHA/rate-limit controls and deployment abuse controls are operating. `two_account_isolation_verified` is allowed only after a real disposable-project, named-adult two-account test. This repository has no such live evidence.

Private evidence persistence is deferred by ADR-001 and ADR-004. Packet E must first provide the additive v2 canonical event projector, immutable v1 compatibility reader, and golden replay fixtures. Packet B must consume that projector; it must not directly upload current UI/device records, rewrite v1 history, or introduce a parallel evidence payload schema.
