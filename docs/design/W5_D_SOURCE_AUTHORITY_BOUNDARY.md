# W5-D source authority boundary

This slice is a deterministic, local contract and replay boundary for ADR-003 and ADR-007. It accepts only content-addressed snapshots supplied as checked-in authored fixtures or principal-supplied reviewed snapshots. It has no URL field, fetcher, crawler, provider call, database write, registry mutation, publication mutation, or learner-data field.

`source.*` remains the source-item identity already used by World manifests. A continuing review package is `source-package.*` plus an immutable semantic version and canonical digest. Snapshot bytes are opaque data, are size-bounded, and are hashed before any locator is accepted. They do not enter the learning-event journal and are never interpreted as instructions.

The replay result can only be `review-candidate-complete` or `review-candidate-incomplete`. Even a complete candidate explicitly establishes none of source authenticity, durable storage, accountable-human identity, rights clearance, or publication authority. Caller-supplied reviewer IDs are checked against a local policy shape only; no identity/authentication claim is made.

Corrections, rights-expiry observations, and withdrawals are appended through a chained replay log. They invalidate only supplied review-candidate dependencies; this module cannot disable, supersede, publish, or rewrite a World release. The replay head rejects shortened or reordered histories, and an event cannot rewrite a snapshot in place.

Any package or replay authority failure also yields the explicit dependent-candidate invalidation reason `source-authority-invalid`; an incomplete aggregate status is never the only signal to a dependent candidate.

Locators bind an exact immutable snapshot. Byte positions, UTF-8 text positions/quotes, and JSON fixture paths are verified locally. Fragment, SVG-region, and time-state selectors are rejected as locally unverifiable in this first slice rather than being promoted to a complete review candidate. PROV-O, Web Annotation, SPDX, and C2PA mappings are optional versioned metadata; C2PA is recorded only as unverified metadata and cannot assert truth, rights clearance, or publication authority.
