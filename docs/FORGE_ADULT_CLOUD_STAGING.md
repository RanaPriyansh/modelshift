# FORGE adult cloud staging

This packet deliberately leaves private evidence persistence disabled. Existing device-ledger v1 records and exports remain browser-local, readable, and unchanged.

Public cloud signup and sign-in are structurally disabled. A browser-provided adult checkbox cannot create an account, and no environment value can turn cloud access on. Under-18 cloud identity, private evidence, sharing, contact, open-web retrieval, and managed provider use remain disabled.

There is no cloud-auth environment contract in this packet. Do not configure Supabase credentials for this release. Before a separately authorized integration can replace the structural stop, it must consume a real CAPTCHA or equivalent provider challenge and use a durable, distributed application limiter; a process-local map is only a secondary backstop and never release evidence.

When that integration is authorized, its browser-exposed configuration may contain only a Supabase publishable key—never a secret or service-role key—and it must add real, disposable-project verification before release.

Private evidence persistence is deferred by ADR-001 and ADR-004. Packet E must first provide the additive v2 canonical event projector, immutable v1 compatibility reader, and golden replay fixtures. Packet B must consume that projector; it must not directly upload current UI/device records, rewrite v1 history, or introduce a parallel evidence payload schema.
