# FORGE Homeschool Pathway Packet C

## Architecture summary

`src/forge/pathways/` is a deterministic, in-process review contract. It projects only released current World manifests into a capability catalog, then evaluates a supplied review packet against broad entitlement, learner-agency, access, consent/assent, relationships, protection, portability, foundations, coercion, anti-gamification, source, and evidence boundaries.

The evaluator has two outputs only: `needs-evidence` and `evidence-complete-for-independent-review`. The latter says the packet names the required evidence and limitations for an independent reviewer. It does not make a conclusion about learning effects, safety, legal compliance, pathway quality, recognition, or the sufficiency of an offline setting.

## Boundary and non-goals

- S0 pure logic only: no database, identity, registry server, scheduler, model, network, UI, or event write.
- The catalog is a read-only projection of `BUILT_IN_WORLD_PACKS`; it does not turn the four released Worlds into a comprehensive program.
- Device age mode, device guardian-present preference, consent grant IDs, and relationship declarations are not treated as verified authority. They are review evidence to be independently checked.
- Current event vocabulary is referenced exactly through `FORGE_EVENT_TYPES`; the packet emits no event and adds no event type.
- The packet contains no jurisdiction, accreditation, attendance, credential, or suitability conclusion.
- The contract rejects points, badges, streaks, leaderboards, comparative rank, completion races, engagement quotas, pause penalties, and guilt/urgency nudges.

## Grounding

The three required packet source references point to existing FORGE documents:

- `docs/FORGE_DELIVERY_GATES.md`, section 15.3: five independent-review tests and bounded claims.
- `docs/FORGE_RESEARCH_TO_SYSTEM.md`, section 8: evidence needed for capability, autonomy, relationships, protection, and portability, plus what software cannot establish.
- `docs/FORGE_DESIGN_SYSTEM.md`, "Learning shell": quiet completion and no mastery percentages, XP, streaks, leaderboards, comparative rank, or engagement rewards.

The entitlement areas are a breadth ledger, not claims that equivalent packages currently exist. An `identified-gap` item keeps an unavailable area visible with a limitation reference rather than inventing a capability or silently dropping the entitlement.

## Tool and state boundary

| Component | Side-effect class | Responsibility |
| --- | --- | --- |
| `catalog.ts` | S0 read-only projection | Maps released World manifests to current capability IDs, learner modes, tiers, sources, and existing event types. |
| `review.ts` | S0 deterministic evaluation | Returns issue records and one of the two bounded statuses. |
| Caller | outside Packet C | Obtains human review, verifies authority/relationships, chooses any operational consent process, and persists/export evidence. |

No state or memory is retained by Packet C. Callers provide packets and may provide a catalog fixture in tests; the evaluator mutates neither.

## Failure modes and evaluation plan

The fixture suite asserts a complete-for-review packet across all three current learner modes and deterministic `needs-evidence` cases for breadth, agency, access, consent/assent, relationships, protection, portability, foundations, coercion, hidden gamification, invalid evidence claims, child open-web access, invented capability IDs, unsupported sources, and extra LMS state.

The contract deliberately stops at inspectable packet completeness. A follow-on owner would need separate operational evidence for human review quality, offline relationships, safeguarding, disability support, portability execution, and any lawful local requirements.

## First review questions

1. Which independent reviewers may assess a packet, under what declared scope?
2. Which additional released Worlds can make currently identified entitlement gaps available without falsely transferring evidence across domains?
3. What separately governed consent and authority service, if any, may create operational grants without treating local profile settings as verification?
