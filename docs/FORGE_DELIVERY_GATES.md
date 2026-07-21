# FORGE Delivery Gates and Honest Claim Protocol

**Status:** Governing delivery contract; current implementation is a C1 interactive foundation and G1 candidate only  
**Version:** 0.1  
**Date:** 22 July 2026  
**Applies to:** Every FORGE world, learner band, domain, institution, and public claim

## 0. Current status and exact honest claim boundary

**Current gate posture: G1 candidate — partial interactive foundation; no G1 PASS packet or production release recorded.**

As of 22 July 2026:

- the four FORGE governing documents exist, and the two local research reports have been translated into product and architecture decisions;
- four authored learning Worlds are interactive: force and motion, proportional reasoning, learning with AI, and primary-source reasoning;
- a strict same-origin planner API deterministically resolves registered topics to authored World/source IDs, keeps unknown topics in an explicitly unverified source-planning state, and fails closed at its age, guardian, source, safety, schema, and request boundaries;
- a privacy-minimal browser evidence ledger can retain bounded World outcomes, assistance provenance, return dates, learner exports, learner-selected educator exports, and deletions without retaining identity, raw chat, learner explanations, confidence, personality inference, or mastery scores;
- Supabase/PostgreSQL migrations and SQL contract tests exist for the learning data model and typed event spine and have been exercised in a disposable database, but they are staged only: no live Supabase project, cloud evidence sync, or production privacy operation is connected;
- a privacy-minimal device profile and optional cloud-auth adapter exist, but cloud identity is not provisioned on the public deployment and grants no guardian, sharing, evidence, or verified-age authority;
- a provider-neutral Lesson Studio compiles strict unverified drafts through fixed OpenAI, Anthropic, Gemini, and OpenRouter adapters; provider calls are not live-credential verified and drafts cannot publish or grade proof;
- these slices support a C1 interactive-foundation claim, but G1 remains a candidate because the complete gate packet, end-to-end durable replay/idempotency evidence, independent review, and formal PASS decision have not been recorded;
- no identity/guardian operation, people network, comprehensive source service, complete curriculum, homeschool pathway, or rights workflow has passed a FORGE gate;
- no representative usability, child-safety, privacy-operation, accessibility, source-accuracy, assessment-validity, delayed-retention, efficacy, workload, equity, or scale result exists for broad FORGE;
- the historical ModelShift code and artifacts remain a narrow prior prototype and one FORGE World; they cannot be promoted into evidence for the broader system.

The strongest currently permitted claim is:

> **FORGE is a C1 interactive foundation and G1 candidate. Four authored learning Worlds demonstrate bounded planner-to-World, proof-after-help, browser-local evidence, and an unverified AI lesson-draft compiler. The broader curriculum, trust core, homeschool use, educational effects, child-safety operation, live provider behavior, and production identity/persistence remain unproven.**

No word such as *works*, *safe for children*, *validated*, *effective*, *personalized*, *mastery*, *credential*, *school replacement*, *homeschool solution*, or *production-ready* may be used without the specific scope and gate evidence defined below.

## 1. Gate doctrine

1. **A later gate never repairs missing evidence from an earlier gate.** A successful pilot cannot excuse a consent bypass or inaccessible core task.
2. **Gates are scoped tuples:** `(world version, domain, capability, learner band, language/access mode, assistance mode, deployment context)`.
3. **Evidence does not transfer silently.** Adult results do not authorize minor release; mechanics does not authorize history; English text does not authorize multilingual speech; direct-to-family use does not authorize school deployment.
4. **A demo proves interaction, not learning.** Completion, delight, model intelligence, and immediate correctness do not establish capability.
5. **Assessment validity precedes efficacy.** A product cannot prove transfer with a weak or contaminated transfer measure.
6. **Strong baselines are mandatory.** FORGE must eventually beat or justify itself against an excellent authored/teacher-guided condition, not only no support or a weak chatbot.
7. **Negative evidence changes the product.** Stop, remove AI, narrow the domain/population/claim, or abandon the mechanism after the specified redesign limit.
8. **Child rights and zero-tolerance incidents are not averaged against learning gain.** Material privacy exposure, unsafe adult contact, corrupt evidence, or scientifically harmful content can stop a release.
9. **Accessibility is in the construct definition.** A feature cannot pass for the general population while required access modes remain untested.
10. **Implementation burden is an outcome.** Hidden teacher, guardian, mentor, author, reviewer, or learner labour can fail a gate.
11. **Every gate produces a signed decision packet.** “We tested it” without fixtures, versions, counts, failures, and owner sign-off is not evidence.
12. **Claims expire.** Material model, policy, source, content, validator, population, or deployment changes require revalidation proportional to risk.

## 2. Claim ladder

| Level | Name | Minimum evidence | Permitted wording | Forbidden leap |
|---:|---|---|---|---|
| C0 | Design hypothesis | Governing product, architecture, traceability, and gates reviewed | “proposed,” “designed to,” “research-grounded architecture,” “hypothesis” | “works,” “safe,” “validated,” “improves learning” |
| C1 | Interactive prototype | One end-to-end vertical slice, synthetic/authored fixtures, deterministic tests, rendered review | “interactive prototype demonstrates the intended flow” | “usable by children,” “reliable,” “teaches” |
| C2 | Engineering-verified slice | Required functional, permission, fallback, observability, privacy-operation, and incident-disable tests pass in scope | “engineering-verified for [exact slice/environment]” | “production-ready,” “secure,” “compliant,” “effective” |
| C3 | Usability/access feasibility | Representative users complete the flow; target access modes, burden, comprehension, and recovery meet preregistered thresholds | “participants could use [scope] under [conditions]” | “accessible to everyone,” “improves capability” |
| C4 | Measurement-valid research prototype | Task families, rubrics, transfer distance, reliability, evaluator error, contamination controls, and protocol pass | “can measure [construct] with [reported reliability/limits] in this study” | “learner mastered,” “portable credential” |
| C5 | Feasibility learning signal | Small predeclared study shows interpretable immediate/delayed signal, acceptable attrition/burden/safety; not powered for efficacy | “feasibility study observed [result]” | “FORGE is effective” or population generalization |
| C6 | Comparative pilot signal | Randomized/credible comparison versus strong baselines, delayed unseen outcomes, ITT, uncertainty, subgroups, versions, attrition | “pilot estimated [effect/interval] for [population/domain/version]” | “proven,” “works across subjects,” causal claim beyond design |
| C7 | Replicated efficacy | Confirmatory power, independent or arm's-length replication, preregistration, external tasks, multiple sites, retained effects, no unresolved harm | “replicated improvement in [specific outcome/population/domain]” | “replaces education,” universal learner or institutional claim |
| C8 | Institutional/pathway validity | Multi-cohort operations, workload/cost, safeguarding, external moderation, transition/portability, regulatory and equity evidence | “validated for [specific institutional/pathway use] under [jurisdiction/conditions]” | universal credential, school/homeschool superiority, guaranteed outcomes |

Every public statement includes version, domain, population, comparator, outcome, delay, and material limitation near the claim. A result card may use ordinary language, but its inspectable evidence must still name conditions.

## 3. Gate packet format

Each gate decision is an immutable packet containing:

```text
Gate ID and date
Scope tuple and release/content/model/source/policy versions
Named owner and independent reviewers
Claim sought and exact proposed wording
Prerequisites and unresolved deviations
Test/eval protocol and preregistration hash where applicable
Fixtures, participant flow, sample, inclusion/exclusion, and denominators
Results with counts, uncertainty, subgroup/access-mode views, and attrition
Technical, epistemic, safety, privacy, equity, accessibility, workload, and cost evidence
Incidents, appeals, corrections, fallbacks, and known negative results
Comparison/baseline and contamination analysis
Decision: PASS | CONDITIONAL | FAIL | STOP
Conditions, expiry/revalidation triggers, and allowed claim text
Sign-offs and dissent
```

`CONDITIONAL` permits only internal continuation with written conditions; it does not permit the next public claim level. A missing reviewer is a missing gate, not an implied approval.

## 4. Delivery phases at a glance

| Phase | Gate | Product focus | Default audience | Highest possible claim |
|---|---|---|---|---|
| A | G0 | Constitution, traceability, architecture, claim protocol | internal reviewers | C0 |
| B | G1 | Deterministic vertical slice and event spine | team/synthetic users | C1 |
| C | G2 | Trust core: identity, consent, evidence, rights, model/source boundaries | staff/adult test accounts | C2 for trust slice |
| D | G3 | W0/W1 foundation + guided model world | adult first, then separately gated minor band | C3; C4 only after measurement gate |
| E | G4 | W2 source-grounded inquiry | adult first; curated minor sub-scope later | C3/C4 in exact scope |
| F | G5 | W3 project studio and contribution provenance | adult/older learner pilot | C3/C4 in exact scope |
| G | G6 | W5 independent evidence and assessment validation | research participants | C4/C5 |
| H | G7 | Minor/guardian/privacy/safeguarding operational release | one named age band/jurisdiction/context | C2/C3 safety-operability wording only |
| I | G8 | W4 people and practice network | adults first; minors only after separate gate | C3 for bounded operations |
| J | G9 | Comparative learning pilot | preregistered study population | C6 |
| K | G10 | Replication, cross-domain and institutional/pathway expansion | exact validated population/context | C7/C8 only as earned |

Dependencies are strict even if teams work in parallel. A W4 minor pilot cannot begin because its UI is ready; it depends on G2, G7, and its own G8 controls. An efficacy study cannot begin before G6 validates the outcome measures.

For the first minor cohort, G3 and G7 use a two-step, non-circular protocol: (1) G3 content, engineering, adult/synthetic usability, and authored-fallback evidence pass without child participation; (2) G7 operational controls pass drills and independent review, authorizing only a small supervised research cohort; (3) minor-specific G3 usability and G7 comprehension/rights evidence are collected in that cohort; (4) both packets must pass before any ordinary minor release. Source, project, or people layers follow the same pattern and add their own gates.

## 5. Gate G0 — Governing baseline

### Objective

Establish an internally coherent contract before implementation fans out.

### Required evidence

- all four governing documents exist and cross-reference one authority model;
- historical `AGENTS.md` and `FINAL_PRODUCT_SPEC.md` are unchanged and labeled as ModelShift v1 artifacts;
- product constitution covers foundations, inquiry, projects, people, evidence, child/guardian rights, privacy, accessibility, homeschool quality, source/AI boundaries, and exact non-goals;
- architecture covers logical services, schemas, world tiers, state/event diagrams, tool side effects, context budget, observability, replay, failure modes, and first issues;
- research matrix maps systemic failures to mechanisms, measures, guardrails, and limitations;
- claim ladder includes current exact wording, stop rules, and no unearned production/efficacy claim;
- product, learning, domain, accessibility, privacy/security, child-safety, and research reviewers record approval or dissent.

### Exit

**PASS:** C0 wording only.  
**FAIL:** conflicting rights/authority, missing claim boundary, or architecture that lets models control permissions/evidence.

## 6. Gate G1 — Deterministic vertical slice

### Objective

Demonstrate one complete capability loop without relying on generative intelligence.

### Required slice

- one W0 repair or W1 model world;
- explicit capability, protected operation, assistance mode, and world version;
- committed attempt before consequence;
- deterministic/inspectable world or validator;
- authored support ladder and reconstruction;
- new-context Closed task;
- evidence statement that accurately reports assistance and uncertainty;
- common event envelope, idempotency, local recovery, version pinning, and trace replay;
- rendered review at target desktop/mobile sizes and at least keyboard/reduced-motion paths.

### Automated acceptance

- 100% required deterministic invariants pass;
- 100% invalid/forbidden state transitions fail closed;
- event replay produces the same deterministic state projection;
- duplicate submissions/queue deliveries do not duplicate evidence;
- the complete slice succeeds with all model and external-source services disabled;
- no raw learner text or secret appears in ordinary logs;
- package disable/supersession preserves historical provenance.

### Exit

**PASS:** C1 “interactive prototype demonstrates the intended flow.”  
**STOP/REDESIGN:** random clicking can complete the protected capability, the consequence is model-generated, or the first meaningful discrepancy cannot be understood in moderated tests.

## 7. Gate G2 — Trust core

### Objective

Verify the architectural rights and authority spine before persistent child data or external people contact.

### Required scope

- pseudonymous learner and separated identity planes;
- relationship-scoped guardian/organization roles with expiry/revocation;
- consent and assent versions, purpose and retention scopes, and learner-visible access;
- data-class inventory, encryption, secrets, least privilege, and environment isolation;
- evidence correction/supersession, contradiction, uncertainty, and appeal;
- export and deletion, including object storage, projections, queues, analytics, and backup-restoration procedure;
- source-content-as-data isolation and claim-level citation validation;
- model gateway schemas, redaction, call reasons, timeout, budget, authored fallback, and provider/version ledger;
- external side-effect preview, idempotency, durable receipt, and no blind retry;
- incident roles and tested disable switches.

### Security/privacy acceptance

- threat model covers guardian impersonation, organization overreach, prompt injection, source poisoning, artifact malware, evidence forgery, insider access, and item theft;
- 100% authorization fixtures for excluded guardian/institution fields deny access;
- consent revocation prevents future collection/share immediately in test;
- export contains all in-scope learner-readable data and provenance from fixtures;
- deletion verification finds no live in-scope records after the documented window; stated exceptions remain visible;
- restored backup cannot reintroduce deleted data into active service;
- a model/source cannot directly mutate evidence, permissions, contacts, or external shares;
- P0/P1 privacy, authorization, or evidence-integrity findings: zero open.

### Exit

**PASS:** C2 only for the tested trust slice/environment. It is not a legal compliance or production-security claim.  
**STOP:** any hidden guardian surveillance path, model-controlled permission, unverifiable evidence mutation, or deletion design that cannot include backups/derived stores.

## 8. Gate G3 — W0/W1 foundation and model-world feasibility

### Objective

Establish that representative learners can use a foundation/guided world, understand the assistance contract, and reach an honestly measured Closed task.

### Prerequisites

G1 and relevant G2 modules pass. Adult/synthetic evidence is collected first. Minor participation follows the joint G3/G7 supervised-cohort protocol in Section 4; neither gate alone authorizes ordinary minor release.

### Content acceptance

- capability and transfer claim written before the world interaction;
- domain expert signs the kernel, assumptions, examples, probes, hints, rubric, and task families;
- at least three equivalent/linked transfer forms exist with exposure exclusions;
- accessibility reviewer signs keyboard, screen-reader, non-drag, reduced-motion, contrast, and text/tabular alternatives;
- authored fallback is instructionally coherent, not merely error copy;
- AI output, if enabled, is enum/schema bounded and cannot access protected answers.

### Feasibility study

- moderated think-aloud and unmoderated completion include target prior-knowledge range and access modes;
- denominator includes all starters and reports support use, fallback, exits, and bypass attempts;
- at least 70% of eligible starters reach the Closed transfer surface in the first scoped usability round;
- fewer than 15% identify answer withholding as the primary reason for stopping;
- at least 90% in comprehension checks correctly identify what AI did, what they did, and what the evidence card does **not** prove;
- no material scientific/content error or inaccessible required operation remains;
- p95 local world action <50 ms and policy transition <200 ms in supported test devices, or the gate packet records a narrower supported device claim;
- model failure path completion is statistically and practically comparable in task access, with no dead end.

The numeric thresholds are product feasibility gates adopted from the research blueprint, not evidence of efficacy.

### Exit

**PASS:** C3 usability wording for the exact world/population/access modes.  
**NARROW:** publish only the authored route if model diagnosis does not improve next-move accuracy or introduces unacceptable errors.  
**STOP:** users reach transfer through interface cues rather than the target capability, or any subgroup/access mode is structurally blocked.

## 9. Gate G4 — W2 source-grounded inquiry

### Objective

Demonstrate a bounded research workflow in which sources, claims, uncertainty, and learner ownership remain inspectable.

### Required controls

- declared question, scope, audience, source eligibility, risk/age band, tool budget, and stop condition;
- separate pedagogical and epistemic retrieval routes;
- immutable source record with origin, date, license, snapshot/hash where permitted, jurisdiction/population, and quality notes;
- claim-level locators and relations (`supports`, `contradicts`, `qualifies`, `contextualizes`, `insufficient`);
- citation rendering distinguishes quotation, paraphrase, extraction, and system inference;
- external text cannot alter prompt/policy, invoke tools, or authorize side effects;
- unsupported and unavailable states render honestly;
- learner must select, reject, revise, or defend AI-proposed questions and synthesis.

### Evaluation acceptance

- curated fixture set includes primary/secondary sources, outdated sources, retractions/corrections, disagreement, missing evidence, prompt injection, poisoned metadata, inaccessible URLs, and licensing limits;
- 100% rendered citations resolve to the intended stored source/locator in fixtures;
- zero fabricated source IDs/locators accepted by validators;
- claim-citation entailment and source-quality judgments meet a preregistered target set only after human-labeled evaluation; exact results are reported rather than hidden behind “high accuracy”;
- injection fixtures cause zero external write/contact/policy mutation;
- users can identify sourced fact versus model/system inference in at least 90% of comprehension probes;
- minor release uses only the approved corpus/source class for that band; open web is a separate gate scope.

### Exit

**PASS:** C3/C4 wording only for the evaluated inquiry construct.  
**STOP:** citations are decorative, source content can steer tools, or the system collapses contested evidence into a single confident answer.

## 10. Gate G5 — W3 Project Studio

### Objective

Show that a project can preserve foundations, authorship, process, critique, and individual accountability.

### Required project contract

- knowledge/capability prerequisites and gaps;
- authentic problem, stakeholder/audience, constraints, standard, risk class, and completion definition;
- individual and group responsibilities;
- declared assistance mode per milestone;
- source and reused-material rules;
- contribution/provenance ledger for learner, peer, mentor, AI, and reused work;
- milestone plan, tests/critique, revision, and final individual defence;
- accessible, no-material/no-travel alternative for any common-entitlement requirement;
- no mandatory public posting, home imagery, precise location, or private contact.

### Acceptance

- version history and contribution attribution survive offline edits, imports, and AI-assisted revisions in fixtures;
- AI contribution is visible in the final export and cannot be relabeled as learner-only;
- project completion alone does not emit an independent capability claim;
- every participant completes an individual knowledge/transfer/defence check where the project is used as learning evidence;
- reviewers measure parent/teacher/mentor preparation and review time, not only learner completion;
- a blinded audit can reconstruct major decisions, sources, tests, and revisions for at least 90% of sampled project components;
- subgroup analysis checks whether resources, adult production, device access, or language drive artifact quality.

### Exit

**PASS:** “Project Studio preserved declared provenance and individual checks in [scope].”  
**STOP/REDESIGN:** polished artifacts systematically exceed independent explanations, adult/AI substitution cannot be distinguished, or required participation depends on unequal private resources.

## 11. Gate G6 — W5 measurement validity

### Objective

Validate the measurement instrument before claiming that FORGE changes capability.

### Required Phase 0 work

- at least three equivalent item/task families per target capability where feasible;
- independent domain-expert content-validity review;
- cognitive interviews with approximately 20 target learners before scoring claims;
- approximately 80–150 responses for difficulty/discrimination estimation where feasible, with reasons documented when a smaller qualitative design is appropriate;
- blind double-scoring of open work and reported agreement/error, including language and accessibility samples;
- evidence that transfer changes surface/representation without silently testing a different construct;
- contamination/exposure registry, family exclusions, source/model/content versions, and secure delivery rules;
- rubric, criterion, appeal, uncertainty, correction, and assessor/moderator contracts;
- baseline expectation from a validated design, not raw pre/post storytelling.

### Acceptance

- reliability/validity thresholds are preregistered per construct and reported with uncertainty; no universal number is imposed across task types;
- evaluator false-positive/false-negative rates and subgroup gaps are within predeclared tolerances or the evaluator is removed from consequential use;
- model disagreement never becomes automatic failure;
- accessibility conditions and construct changes are explicit;
- external or arm's-length reviewers can reproduce scoring from the frozen packet;
- assessment owner cannot silently edit tasks or mastery definitions after outcomes arrive.

### Exit

**PASS:** C4 for the exact construct and instrument.  
**REMOVE AUTOMATION:** if open scoring has unacceptable language/demographic/access error, use objective tasks, clarification, and human review.  
**STOP:** weak transfer validity, item leakage, or company-owned task tuning makes the outcome uninterpretable.

## 12. Gate G7 — Minor, guardian, privacy, and safeguarding operations

### Objective

Authorize one exact minor-facing scope only after rights work in practice.

### Prerequisites

G2 passes; the relevant world/source/project content and adult/synthetic portions pass; jurisdiction and age band are named. A small supervised research cohort may then collect the minor-specific G3/G7 evidence described in Section 4. Ordinary minor release requires both completed packets.

### Required operational evidence

- qualified jurisdiction-specific legal/privacy review, with open questions and non-legal product claims recorded;
- age-band policy and age/relationship assurance proportionate to risk;
- plain-language guardian consent and age-appropriate learner explanation/assent;
- learner-visible guardian/teacher views and access history;
- protected private fields and no guardian impersonation;
- quiet hours, notification controls, session stop, full-explanation, optional media/mission/contact refusal;
- no ads, sale, behavioural targeting, model training on identifiable content without separate opt-in, or unnecessary location/face/emotion data;
- tested crisis/abuse, unsafe request, harmful content, misinformation, privacy request, and scientific-incident flows;
- trained human incident/safeguarding owner, escalation coverage, response targets, complaints, and disable authority;
- independent child-rights, accessibility, privacy/security, and safeguarding review.

### Acceptance

- 100% forbidden guardian/organization access fixtures denied;
- 100% consent withdrawal, visibility, correction, export, and deletion journeys complete in end-to-end tests;
- zero open P0/P1 safety, privacy, adult-contact, evidence-corruption, or scientific-content defects;
- no model output can create contact, share, expand memory, or override age policy;
- learner comprehension testing shows at least 90% understand who can see what and how to stop/report/correct;
- guardian comprehension testing shows at least 90% understand excluded views and the evidence limits;
- target accessibility modes and no-camera/no-voice path complete;
- incident drill records detection, disable, communication, correction, and evidence preservation.

### Exit

**PASS:** minor release for the exact band/jurisdiction/world scope; wording is “operational controls passed the specified gate,” not “safe for all children” or “legally compliant everywhere.”  
**STOP:** the product requires raw surveillance data, covert guardian access, an unstaffed escalation promise, or open adult-minor communication.

## 13. Gate G8 — W4 People & Practice Network

### Objective

Verify a bounded human workflow before presenting people as a product layer.

### Adult-first requirements

- role definition, identity/qualification verification, code of conduct, compensation/availability model, scope, evidence packet, scheduling, block/report, complaints, and quality review;
- no AI impersonation and no hidden automated messages attributed to a human;
- access expires at engagement closure;
- cancellations, no-shows, appeals, and reviewer conflicts have accountable operations.

### Additional minor requirements

- G7 passes for the exact age/jurisdiction;
- guardian authority and learner assent are valid for each engagement class;
- no open DMs, public profiles, popularity ranking, unscheduled contact, off-platform solicitation, or private file access;
- supervised/recorded-as-policy channels balance safeguarding and privacy, with a disclosed retention rule;
- mentor/peer/assessor roles are separated; a mentor cannot silently become a high-stakes assessor;
- learners can leave, block, report, or request a different human without academic retaliation;
- trained safeguarding operations and audit sampling are live during every minor interaction window.

### Acceptance

- verification bypass, grooming/boundary, data-exfiltration, off-platform contact, impersonation, report suppression, and guardian-conflict scenarios are red-teamed;
- zero severe bypasses remain open;
- 100% access expires/revokes correctly in fixtures;
- all sampled evidence packets contain only consented fields;
- response and block/report targets are met in drills;
- match usefulness, cancellation, human preparation, learner burden, complaints, access equity, and compensation sustainability are reported;
- adult-only evidence cannot be used to authorize minors.

### Exit

**PASS:** C3 bounded operational wording for the evaluated role/context.  
**STOP:** safety depends on “community goodwill,” unmoderated external channels, hidden volunteer labour, or unverifiable adult identity.

## 14. Gate G9 — Comparative learning pilot

### Objective

Estimate whether the integrated Capability Journey improves delayed independent capability beyond strong alternatives.

### Prerequisites

G3 and G6 pass; G4/G5/G8 pass only if those mechanisms are part of the study; G7 passes for minors.

### Default pilot design

- population: approximately 120–200 learners in the exact target band/domain, across at least two sites or contexts where feasible;
- conditions:
  1. FORGE journey;
  2. ordinary frontier chatbot with ordinary safety rules and the same objective/time;
  3. strong expert-authored explanation/guided practice, including a trusted simulation/worksheet where appropriate;
  4. conventional self-study resources with the same time window;
- assignment within site and baseline band, with analyst blinding for open scoring;
- baseline, two 15–20 active-minute learning sessions, immediate transfer, seven-day unseen Closed assessment, and 30-day retention if feasible;
- primary outcome: preregistered seven-day unseen unaided transfer score;
- secondary outcomes: retention, explanation, representation, source judgment, question quality, Assistance Load/AUTG, calibration, productive activity, experience, attrition/bypass, workload/cost, subgroup error/outcomes, incidents;
- intention-to-treat primary analysis with attrition sensitivity, effect sizes/intervals, protocol deviations, versions, and all denominators.

The sample is a feasibility/moderate-to-large-signal pilot, not definitive small-effect proof. Power analysis uses validated outcome variance, clustering, attrition, and the predeclared minimum important effect.

### Continue criteria

- FORGE exceeds the strong authored baseline by the predeclared practically meaningful margin on seven-day transfer, with uncertainty compatible with a confirmatory study;
- AUTG is materially smaller than ordinary chatbot use;
- at least 65% of starters reach Closed transfer without coercive design;
- no material scientific, privacy, safety, accessibility, or evidence-integrity issue;
- no subgroup harm pattern remains without a plausible, bounded correction;
- any question/project/people benefit does not require foundational or transfer loss;
- authoring, human, guardian/teacher, model, and infrastructure costs remain within predeclared feasibility bounds.

### Falsification/stop criteria

After **one targeted redesign**, narrow or abandon the mechanism when:

1. seven-day performance is indistinguishable from or worse than the strong authored baseline at comparable time;
2. in-session gains coexist with an AUTG like ordinary chat;
3. answer withholding creates high abandonment without greater learning;
4. performance is simulation/interface-specific;
5. fixed authored support matches model-mediated diagnosis;
6. benefits exist only among selected high-attaining/motivated completers;
7. assistance does not fade or attempt-before-help willingness worsens;
8. evaluator error, privacy, safety, or accessibility cost is unacceptable;
9. content/human operations exceed sustainable predeclared time/cost;
10. item contamination or attrition makes the result uninterpretable.

### Exit

**PASS:** C6 wording with effect, interval, population, domain, comparator, delay, versions, attrition, and limits.  
**NARROW:** remove AI if fixed policy matches it; remove reality/people components if burden outweighs incremental value.  
**FAIL:** satisfaction or beating conventional self-study alone cannot rescue the gate.

## 15. Gate G10 — Replication, domain expansion, and institutional/pathway use

### 15.1 Replicated efficacy

Requires:

- confirmatory sample/power and preregistration;
- arm's-length or independent evaluation;
- multiple sites and at least one deployment beyond the founding team's facilitation;
- external or independently selected task families;
- retained effect and acceptable equity/safety/workload/cost;
- full version and negative-result disclosure;
- replication across at least three capability families before a domain-wide statement.

Only then is C7 available for the exact domain/population/outcome.

### 15.2 Cross-domain expansion

Each new domain returns to G0/G1 for its domain representation and evidence theory, then passes relevant content, source, project, measurement, and pilot gates. Shared platform verification may be reused only when versions and risk are unchanged.

Forbidden inference:

```text
mechanics efficacy → STEM efficacy → general learning efficacy
```

Each arrow requires new evidence.

### 15.3 Homeschool/microschool rights-and-quality use

A pathway claim requires all five tests—Capability, Autonomy, Relationships, Protection, and Portability—with local independent reviewers. Minimum evidence includes:

- broad entitlement and yearly external foundation benchmarks;
- learner-led review and external adviser;
- stable peer/specialist/arts/sport/community plan;
- safeguarding, disability, emergency, complaints, and privacy operations;
- moderated portfolio, oral/practical defence, and transition/re-entry pathway;
- adult workload, learner wellbeing/voice, subgroup access, and legal review.

FORGE may say “evidence packet complete for independent review.” It may not self-certify a home as safe, a pathway as legally sufficient, or homeschooling as superior.

### 15.4 Institutional/pathway validity

C8 additionally requires multi-cohort evidence for:

- learning and transition outcomes;
- workload, staffing, total cost, fidelity, and incident operations;
- external moderation and predictive/transition validity;
- complaints/appeals and rights performance;
- selection, non-completion, and subgroup distribution;
- credential recognition or credit transfer by named external bodies;
- sunset/review terms and independent audit.

One partnership, employer endorsement, school contract, or regulator conversation is not pathway validation.

## 16. Evaluation suites by plane

| Plane | Required fixtures/evidence | Release blocker examples |
|---|---|---|
| Domain correctness | invariants, units, laws, assumptions, source review, edge cases, accessible-representation equivalence | wrong consequence; visual/text mismatch; unsupported causal kernel |
| State and policy | property/transition tests, answer access, modes, attempt gate, pause/stop, expiry, offline conflicts | forbidden help in Closed mode; skipped attempt; proof authority forged offline |
| AI/model | schema, evidence spans, uncertainty, injection, leakage, provider change, timeout/refusal, cost, authored fallback | raw output rendered; model expands permission; no fallback |
| Sources | canonical record, locator, license, citation entailment, disagreement, stale/retracted source, injection | fabricated citation; source text invokes tool; contested claim flattened |
| Evidence | projection/replay, contradiction, corrections, assessor provenance, contamination, appeal | one score hides conditions; evidence mutated/deleted silently; known exposure ignored |
| Accessibility | keyboard/switch, screen reader, non-drag, contrast, reduced motion, caption/transcript, language, low bandwidth, no-media path | required operation inaccessible; accommodation counted as dependency |
| Privacy/rights | inventory, access, consent/assent, guardian views, export/delete/correct, backup, research split | covert surveillance; undeletable derivative; ads/training without authority |
| Child safety | age policy, harmful content, crisis/abuse, unsafe mission, emotional dependency, notification, reporting | persona secrecy/guilt; hazardous instruction; no staffed escalation |
| People | verification, scope, consent, access expiry, report/block, off-platform contact, conflicts, compensation | open minor DM; unverified adult; report suppression |
| Project/authorship | contribution ledger, version history, AI/parent/peer substitution, tests, viva | artifact credited as individual capability without defence |
| Research | preregistration, randomization, outcome validity, blinding, ITT, attrition, subgroup, versions, incident reporting | outcome switched; weak control; missing denominator hidden |
| Operations/economics | latency, availability, queue, disable, author/reviewer/teacher/guardian/mentor time, model cost | workload unsustainable; no incident owner; platform fails without model |

## 17. Zero-tolerance and rate-based metrics

### Zero-tolerance operational blockers

- material privacy exposure or unauthorized external sharing;
- unverified or unauthorized adult-minor contact;
- generated harmful physical instruction escaping policy in the scoped release;
- known scientifically false deterministic world presented as correct;
- evidence forgery, silent mutation, lost correction, or invalid proof mode;
- model/source output controlling consent, permission, contact, or irreversible side effect;
- advertising identifier or sale/behavioural targeting of learner data;
- unresolved P0/P1 safety, privacy, authorization, or evidence-integrity defect.

“Zero tolerance” means no known defect is accepted for release; it is not a claim that real-world risk is mathematically zero.

### Rate-based measures

Latency, schema failure, citation correctness, evaluator agreement, completion, attrition, diagnostic error, fallback, complaints, workload, cost, and learning outcomes use predeclared thresholds with confidence intervals. Teams must publish numerator, denominator, sample, and version rather than “99% accurate” alone.

## 18. Revalidation triggers

Re-run affected gates when:

- a model/provider/version materially changes behaviour;
- a world kernel, rubric, transfer family, entitlement, protected operation, or assistance policy changes;
- a source is corrected/retracted or source eligibility changes;
- a new learner band, language, accessibility mode, jurisdiction, organization type, or deployment context is added;
- data purpose, retention, third party, guardian visibility, or research use changes;
- a new human role, contact channel, physical mission class, public share, payment, or credential use appears;
- an incident reveals the threat model or assessment was incomplete;
- outcome drift, subgroup harm, or task contamination crosses the predeclared alert;
- a claim's review/expiry date arrives.

Cosmetic copy and layout changes may use risk-based regression rather than full repetition, but the gate packet must record why scope is unaffected.

## 19. Claim examples

### Honest at C0

> FORGE is designed to connect foundations, source-grounded inquiry, projects, human critique, and independent evidence. Whether that integrated design improves learning remains to be tested.

### Honest at C3

> In a usability study of 24 English-speaking learners aged 13–15 using mechanics world v1.3, 19 reached the Closed transfer screen; this establishes flow feasibility, not learning efficacy.

### Honest at C6

> In a preregistered pilot of 168 learners aged 13–15 across two sites, mechanics world v2.0 produced the reported seven-day transfer estimate relative to the named authored baseline; the result is limited by the stated interval, attrition, task families, and one domain.

### Dishonest at any early gate

- “FORGE proves mastery.”
- “The safest AI school for every child.”
- “Replaces broken education.”
- “Personalized to how your child learns.”
- “A verified lifelong capability passport.”
- “Research shows FORGE works.”
- “ModelShift validated the FORGE architecture.”
- “Homeschool confidently with FORGE.”

The honest alternative names the mechanism and the unproven boundary.

## 20. Final delivery rule

FORGE may become broad only by accumulating narrow, versioned, independently inspectable evidence. Scope in the vision is not scope in the claim. The product is ready for the next phase only when it can show not just that the AI performed impressively, but that the learner's rights held, the system's boundaries held, the evidence means what it says, and the resulting capability survives the system's absence.
