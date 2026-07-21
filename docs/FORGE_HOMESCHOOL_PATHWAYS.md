# FORGE Homeschool Pathway and Entitlement Architecture

**Status:** C0 design-candidate implementation; deterministic contracts and review logic only

**Architecture ID:** `forge.homeschool-pathways@0.1.0`

**Date:** 22 July 2026

**Permitted outcome:** `evidence-complete-for-independent-review`

## 1. Outcome

This slice implements the smallest cross-age, cross-subject homeschool architecture that can enforce FORGE's existing rights and claim boundaries without becoming an LMS.

It adds:

- one strict, versioned architecture package covering six age bands;
- nine entitlement areas that remain visible in every pathway review;
- age-specific AI, source, adult-presence, guardian-consent, and learner-assent defaults;
- the five homeschool rights-and-quality tests: Capability, Autonomy, Relationships, Protection, and Portability;
- per-entitlement access plans, including no-material/no-travel alternatives and explicit construct-change disclosure;
- one pure deterministic review function with stable issue codes and only two outcomes:
  - `needs-evidence`;
  - `evidence-complete-for-independent-review`.

The implementation does not recommend a curriculum, sequence courses, schedule work, grade a learner, infer mastery, or certify a home or pathway.

## 2. Source grounding and claim boundary

The architecture is derived from the repository's governing FORGE sources, not from the historical ModelShift build contract.

| Local source | Governing sections used | Architectural consequence |
|---|---|---|
| `FORGE_PRODUCT_SPEC.md` | 4, 5, 11, 12, 14 | Six age regimes; broad entitlement; child/guardian rights; five-part homeschool test; access requirements |
| `docs/FORGE_ARCHITECTURE.md` | 5, 17, 20 | Deterministic entitlement and policy boundary; domain-specific evidence; fail-closed review; first implementation order |
| `docs/FORGE_RESEARCH_TO_SYSTEM.md` | 7, 8, 9, 11, 13 | Developmental defaults; homeschool limitations; subject-specific evidence theories; bounded present-tense claims |
| `docs/FORGE_DELIVERY_GATES.md` | 0, 1, 15.3, 16 | C0 status; no silent evidence transfer; pathway packet wording; required evaluation planes |

The source registry in `src/forge/pathways/architecture.ts` keeps the file, section, decision role, and claim boundary attached to each policy group. Architecture validation fails when a policy, entitlement, or rights test cites an unknown source ID.

This is source-grounded architecture, not a source-accuracy, child-safety, accessibility, legal-compliance, learning-efficacy, or homeschool-quality result. The local research synthesis constrains what should be tested; it does not validate this integrated slice.

## 3. Architecture summary

The slice is a deterministic policy module inside the existing FORGE modular monolith:

```text
Versioned pathway architecture
  ├── governing source registry
  ├── six age-band authority policies
  ├── nine broad entitlement definitions
  ├── ten access requirements
  ├── five rights-and-quality tests
  └── explicit anti-LMS/non-certification boundary

Caller-supplied review packet
  ├── learner-owned objective and contest/transition routes
  ├── one visible opportunity per entitlement area
  ├── one access plan per entitlement area
  ├── planned external/persistent actions and scoped grants
  └── criterion-level evidence references plus limitations

Pure review evaluator
  └── needs-evidence | evidence-complete-for-independent-review
```

Code owns completeness and permission checks. No model chooses subjects, interprets a guardian's authority, scores evidence, or broadens source access. Qualified humans still own domain standards, local legal/safeguarding judgments, relationship quality, assessment validity, and the independent pathway review.

## 4. Boundary and non-goals

### Inside this slice

- declarative age-band and entitlement policy;
- strict schemas with rejection of extra fields;
- architecture source-reference integrity;
- broad-opportunity coverage checks;
- learner pause, help, uncertainty, challenge, adviser, and transition rights;
- access-baseline and per-entitlement alternative-plan checks;
- purpose-specific consent, verified relationship, current grant, learner assent, and learner visibility checks;
- criterion-level evidence presence and limitations;
- bounded review wording.

### Outside this slice

- accounts, identity assurance, persistence, databases, event/outbox delivery, or cloud sync;
- curriculum content, lessons, course sequences, calendars, attendance, completion tracking, or dashboards;
- grades, mastery percentages, points, badges, streaks, ranks, feeds, or engagement nudges;
- AI-generated pathways, topic ranking, learner profiling, or a recommendation loop;
- open minor messaging, mentor matching, public sharing, purchases, notifications, or other external side effects;
- source ingestion, claim-level citations for learner work, domain publication, or validated assessment instruments;
- legal, privacy, accessibility, child-safety, credential, pathway-quality, or learning-effect certification.

Strict object schemas reject ungoverned state such as `courseSequence`, `points`, or `streak`. That is a contract boundary, not a claim that every future UI or integration is free of manipulative patterns.

## 5. Age-band authority policies

Age bands set safer defaults; they do not rank readiness, intelligence, or worth.

| Band | Relationship and AI boundary | Source boundary | Additional deterministic requirement |
|---|---|---|---|
| 3–6 | Adult-facing shared activity; no independent AI | None | Responsible adult present; planned persistence/external action requires scoped authority and assent |
| 7–9 | Guardian-managed with learner assent; authored worlds with AI behind the interface | Curated only | Every planned persistent/external action requires a current visible grant |
| 10–12 | Learner-owned with bounded guardian authority; bounded AI | Curated only | Guardian consent cannot broaden access to the open web |
| 13–15 | Learner-owned inquiry and creation; guardrailed tools | Risk-gated | Purpose-scoped consent/assent for persistence, sharing, contact, retention, purchases, research, and notifications |
| 16–17 | Wider disclosed tools; stronger learner control | Risk-gated | Minor safeguards remain; guardian action cannot erase contest, correction, or future options |
| 18+ | Learner is primary authority | Learner-governed | Guardian grants are rejected as inapplicable |

The current policy conservatively requires consent and assent for every modeled persistent or external action for minors. Jurisdiction-specific relaxation is not inferred by the software; it requires a separately versioned policy and review.

## 6. Broad subject entitlement

Every review packet must keep one age-appropriate opportunity visible in each area. A learner may choose it, accept it as shared entitlement, request an alternative, or defer it to a named future review. The evaluator does not force an activity or treat deferral as failure.

| Entitlement area | Examples, not a curriculum | Primary evidence boundary |
|---|---|---|
| Communication and literacy | Language, reading, writing, rhetoric | Identified texts, performances, revision, external samples, qualified review |
| Mathematics and numeracy | Number, geometry, data, modelling | Deterministic/symbolic checks plus explanation, varied application, external sampling |
| Science and environment | Physical, life, earth/environmental science | Declared models, sources, observation, assumptions, domain review |
| Humanities and civic understanding | History, geography, civics, philosophy | Source criticism, chronology, competing interpretations, argument |
| Health and safeguarding | Health, safety, relationships, help-seeking | Reviewed sources and qualified human routes; no automated diagnosis or safety certification |
| Computing and AI literacy | Systems, programming, data, AI verification | Sandboxed execution, tests, traces, sources, review, defence |
| Arts and culture | Art, music, drama, dance, literature | Process, craft, performance, context, critique, revision |
| Physical development | Movement, sport, outdoor activity | Safe observation and qualified supervision; attendance is not competence |
| Practical life and making | Craft, design, food, care, finance, tools | Process, observation, tests, external standards, supervised review |

These are opportunity and evidence-theory contracts. No subject package, standard, benchmark, reviewer, or learning result is supplied by this slice.

## 7. Learner agency, guardian boundaries, and access

### Learner agency

A review cannot be complete unless it records the learner's position and preserves the ability to:

- pause without penalty;
- request help;
- say “I do not know”;
- contest evidence through a named path;
- see guardian actions and views;
- reach an external adviser or independent review path;
- retain at least one visible transition or re-entry option.

The learner's objective may be learner-authored, learner-adopted, or genuinely shared. None of those labels permits a guardian or system to suppress broad entitlement in secret.

### Guardian consent boundary

For a planned minor-facing persistent or external action, the evaluator requires a grant that is:

- tied to the exact purpose;
- backed by a verified relationship reference;
- in `granted` state and current at review time;
- accompanied by learner assent;
- visible to the learner;
- limited to summary scopes allowed by the architecture.

The schema has no scope for raw chat, private notebooks, every mistake, click history, emotion inference, personality labels, peer messages, or comparative rank. A grant cannot override an age policy, so open-web access remains prohibited for ages 3–12 even when a guardian attempts to consent.

### Accessibility

The packet must document all ten baseline access requirements and one access plan for each entitlement. Every plan includes a no-material/no-travel alternative and declares whether it changes the assessed construct. Accessibility support is recorded separately from cognitive assistance, and a complete no-camera/no-voice route is required.

This validates packet completeness only. Actual keyboard, switch, screen-reader, contrast, motion, language, bandwidth, printable, material, travel, and construct-equivalence behavior still needs rendered and representative-user evaluation.

## 8. Tool list and side-effect classes

| Function | Job | Side-effect class | Authority |
|---|---|---|---|
| `validateHomeschoolPathwayArchitecture` | Validate schema, complete age/subject/test coverage, grounding, and fixed authority invariants | S0 pure/local | Governing package only |
| `evaluatePathwayReviewPacket` | Compare one supplied packet with the versioned architecture and return issues plus bounded wording | S0 pure/local | No identity or external authority inferred |

The module exposes no filesystem, database, network, messaging, model, people-contact, sharing, notification, or payment tool. Future S2/S3/S4 actions must live behind the existing FORGE policy gateway, durable receipts, correction paths, explicit authorization, and no-blind-retry rules.

## 9. State and memory design

- **Architecture state:** immutable, versioned, reviewed source IDs, age policies, entitlement definitions, criteria, access requirements, and claim boundary.
- **Review state:** a caller-supplied snapshot with a review timestamp, references, declared actions, grants, and limitations.
- **Output state:** deterministic issues and a bounded claim template. There is no hidden score or learner rank.
- **Persistent state:** not implemented. The module does not retain identity, raw learner language, private notes, artifacts, or evidence bodies.
- **Future persistence boundary:** references should resolve to append-only/correctable evidence and consent events; a relationship row alone must never authorize a read or action.

Because this slice has no persistence, it cannot demonstrate revocation propagation, deletion, export, backup deletion, access logs, event replay, or evidence immutability.

## 10. Context budget plan

The current evaluator makes no model call, so its model-context budget is zero.

If a later bounded model is used to phrase an already-authorized learner-facing explanation, the provisional maximum packet should contain only:

- 15% policy and output schema;
- 20% current age-band and entitlement contract;
- 25% selected structured evidence references and limitations;
- 25% reviewed source excerpts with locators;
- 10% output reserve;
- 5% safety margin.

It must exclude identity fields, unrelated subjects, guardian raw notes, private notebooks, safety cases, and full historical chat. A model may phrase or summarize; it may not decide coverage, consent, evidence sufficiency, independent-review status, or a pathway claim.

## 11. Failure modes

| Failure | Deterministic control in this slice | Residual truth |
|---|---|---|
| Interest-led planning silently narrows future options | All nine entitlement areas require visible opportunity records | Presence does not prove quality, time, uptake, or competence |
| Learner choice becomes parental/platform control | Position, pause, help, uncertainty, contest, adviser, visibility, and transition checks | Software cannot detect all offline coercion |
| Guardian protection becomes surveillance | Allowed summary scopes only; grants are purpose-scoped, current, assented, and learner-visible | Jurisdiction and actual account enforcement are outside this slice |
| Consent is treated as permission to broaden age policy | Open web is denied for 3–12 regardless of grant | Curated-source safety and quality are still untested |
| Accessibility is mislabeled as help | Separate access requirements and cognitive-assistance flag | Actual construct equivalence needs human/accessibility review |
| Attendance or artifact polish becomes capability | Criterion evidence remains domain-specific and limited; no learner score is produced | Assessment validity and authorship still need independent evidence |
| A completed checklist becomes homeschool certification | Output wording is fixed to review readiness and all certification flags are false | Humans can still overstate exports outside the module |
| FORGE mechanics evidence is generalized to every subject | Each entitlement states a distinct evidence theory and software limit | The subject packages and validation studies do not yet exist |

## 12. Evaluation plan

### Implemented automated checks

- strict schema and extra-field rejection;
- exact six-band, nine-area, five-test, ten-access-requirement, and anti-LMS coverage;
- source-reference integrity;
- early-childhood/adult authority invariants;
- complete review fixtures for every age band;
- entitlement and access-plan absence;
- learner deferral with a future review date;
- learner agency rights;
- access/cognitive-help separation;
- missing, revoked, expired, unverified, unassented, or hidden grants;
- open-web denial for younger bands even with consent;
- adult guardian-grant rejection;
- unavailable rights evidence and bounded outcome wording.

### Required before a product or pathway claim

1. Independent product, domain, accessibility, privacy/security, child-rights, safeguarding, homeschool, and research review of the architecture.
2. Jurisdiction-specific policy versions and legally reviewed consent/assent language.
3. Real identity, relationship, evidence, export, correction, revocation, deletion, backup, access-log, and incident-disable tests.
4. Subject-package review against the ten domain-expansion questions in `docs/FORGE_RESEARCH_TO_SYSTEM.md`.
5. Rendered accessibility and low-resource equivalence testing with representative learners and adult supporters.
6. External benchmarks, moderated samples, oral/practical defence, transition recognition, and assessment-validity work.
7. Workload, equity, relationship quality, complaints, safety, and learner-voice evidence.
8. A signed G10 pathway packet before any C8 institutional/pathway wording.

## 13. First implementation issues

1. Freeze the entitlement-area names and decide whether local jurisdiction overlays may add opportunities without removing the common floor.
2. Add an append-only event envelope for review, consent, correction, revocation, and packet supersession before persistence.
3. Define purpose-specific grant scopes and expiry rules in the trust core, not in a UI boolean.
4. Commission domain owners to build one reviewed entitlement package at a time; do not turn the descriptive catalog into generated curriculum.
5. Create accessibility review fixtures and rendered alternatives for the first real pathway opportunity before expanding catalog depth.
6. Define human reviewer roles, independence, conflicts, appeal, compensation, and evidence-packet access.
7. Validate external foundation samples and portability transitions with named institutions; an export format alone is not recognition.
8. Red-team guardian overreach, ideological narrowing, fake relationships, stale grants, evidence fabrication, and checklist gaming.
9. Keep all external actions disabled until G2/G7 requirements pass for the exact band and jurisdiction.
10. Revisit model involvement only after deterministic review and authored explanation prove insufficient.

## 14. Verification commands

```bash
pnpm exec vitest run src/forge/pathways/pathways.test.ts
pnpm typecheck
pnpm exec eslint src/forge/pathways --max-warnings=0
```

The full repository suites remain required before handoff because this module imports the existing FORGE identifier contract and lives in the shared TypeScript build.
