# FORGE Homeschool Pathway Packet C

## Architecture summary

`src/forge/pathways/` is a deterministic, in-process review contract. It internally binds to a deep-frozen projection of released current World manifests, with an explicit reviewed entitlement-area mapping and exact source policy for each supported learner age mode. It then evaluates a supplied review packet against broad entitlement, learner-agency, access, consent/assent, relationships, protection, portability, foundations, coercion, anti-gamification, source, and evidence boundaries.

The evaluator has two outputs only: `needs-evidence` and `evidence-complete-for-independent-review`. The latter says the packet names the required evidence and limitations for an independent reviewer. It does not make a conclusion about learning effects, safety, legal compliance, pathway quality, recognition, or the sufficiency of an offline setting.

## Boundary and non-goals

- S0 pure logic only: no database, identity, registry server, scheduler, model, network, UI, or event write.
- The catalog is a read-only projection of `BUILT_IN_WORLD_PACKS`; it does not turn the four released Worlds into a comprehensive program.
- Production evaluation has no caller-supplied catalog or event resolver. A packet's opaque event reference is only a declaration, never a trusted receipt.
- A capability can appear only in its named reviewed entitlement area. Reuse is rejected unless a future catalog record explicitly names more than one area.
- Device age mode, device guardian-present preference, consent grant IDs, and relationship declarations are not treated as verified authority. They are review evidence to be independently checked.
- Current event vocabulary is referenced exactly through `FORGE_EVENT_TYPES`; claim kinds accept only semantically compatible lifecycle/attempt or bounded-result event types. The packet emits no event and adds no event type.
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
| `catalog.ts` | S0 read-only projection | Deep-freezes released World manifests projected to current capability IDs, reviewed entitlement areas, age-specific source policies, tiers, sources, and existing event types. |
| `review.ts` | S0 deterministic evaluation | Uses that internal catalog, requires a future trusted runtime receipt for every published capability, and returns one of the two bounded statuses. |
| Caller | outside Packet C | Obtains human review, verifies authority/relationships, chooses any operational consent process, and persists/export evidence. |

No state or memory is retained by Packet C. Production callers provide only packets; internal tests may parse catalog fixtures without exposing catalog injection through the public evaluator. The evaluator mutates neither.

## Failure modes and evaluation plan

The fixture suite asserts that published-capability packets remain `needs-evidence` without a trusted Packet-E runtime receipt, while a gap-only packet can be complete for independent review without self-asserted event evidence. It covers production catalog substitution, deep-freeze mutation attempts, under-18 open-web assertions, nonexistent/mismatched/cross-capability event declarations, entitlement substitution, duplicate capability reuse, per-age source-policy substitution, cloned duplicate objects, claim/event mismatch, agency, access, consent/assent, relationships, protection, portability, foundations, coercion, hidden gamification, invalid evidence claims, invented capability IDs, unsupported sources, and extra LMS state.

The contract deliberately stops at inspectable packet completeness. Packet E must supply the trusted canonical event receipt/resolver before published capabilities can become evidence-complete. A follow-on owner also needs separate operational evidence for human review quality, offline relationships, safeguarding, disability support, portability execution, and any lawful local requirements.

## First review questions

1. Which independent reviewers may assess a packet, under what declared scope?
2. Which additional released Worlds can make currently identified entitlement gaps available without falsely transferring evidence across domains?
3. What separately governed consent and authority service, if any, may create operational grants without treating local profile settings as verification?
