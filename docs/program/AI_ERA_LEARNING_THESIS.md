# FORGE in the AI Era — Strategy, Scenarios, and Practical Learning Thesis

**Status:** Principal strategy draft; not implementation or release authority

**Date:** 23 July 2026

**Research cutoff:** 23 July 2026

**Owner:** FORGE principal architecture and product review

**Scope:** The long-range product thesis, robust strategic commitments, first credible wedge, and research agenda

**Companion records:** [`FOUNDER_IDEA_LOG.md`](./FOUNDER_IDEA_LOG.md), [`WAVE_6_PLAN.md`](./WAVE_6_PLAN.md), and [`ADR-009`](../adr/0009-practical-multimodal-learning-paths.md)

## 1. Decision in one paragraph

FORGE will not attempt to own every lesson or generate a synthetic course whenever someone asks a question. It will become a provider-neutral capability-building system: translate a learner's intent into an editable map of capabilities and prerequisites; route each node to reviewed explanations, demonstrations, videos, simulations, practice, projects, people, and proof; generate only bounded missing material; and establish what the learner can still explain, solve, make, or transfer after support is removed. External resources, including YouTube, are replaceable inputs under a review and lifecycle contract—not curricular truth, a recommendation feed, or evidence that learning occurred.

## 2. North Star

> A person can begin with a legitimate question, see and edit the terrain between curiosity and capability, learn through words, representations, action, and people, then independently explain, solve, create, or perform in an unfamiliar real situation—and return later with the capability intact.

The product is successful when it increases:

1. **Capability:** the learner can do something meaningful under stated conditions.
2. **Agency:** the learner can understand, contest, and alter the route.
3. **Transfer:** the learner can use the capability in a new situation.
4. **Creation:** the learner can make, investigate, repair, explain, design, perform, or serve.
5. **Human freedom:** the learner needs less dependence on opaque institutions, platforms, or AI to pursue future questions.

The product is not successful merely because it generates fluent material, recommends an engaging video, raises assisted task scores, increases time on platform, or produces a polished artifact.

## 3. The corrected internet-to-AI analogy

The founder's analogy is strategically useful:

- the internet reduced the cost of copying, publishing, communicating, and discovering information;
- AI reduces the cost of drafting explanations, translating, generating examples, adapting representations, producing feedback, and performing bounded cognitive tasks;
- a learner no longer needs a complete pre-authored catalog before receiving a useful starting route.

Taken literally, however, “AI commoditizes intelligence” hides the product's hardest responsibilities. Intelligence is not one commodity. Judgment, values, accountability, social understanding, source authority, tacit and embodied expertise, motivation, relationships, and the ability to act without assistance remain scarce. Generative systems also create new verification and provenance costs that ordinary distribution did not.

The governing thesis is therefore:

> **The internet made distribution abundant. AI is making provisional cognitive assistance abundant. FORGE must organize the scarce complements into durable human capability.**

This wording matters. It prevents the product from equating output with expertise and makes the role of teachers, mentors, reviewers, projects, sources, and independent proof structural rather than optional.

## 4. What current evidence permits us to say

### 4.1 Work and the economy

- Generative AI exposure is broad, but the International Labour Organization's 2025 global index says task transformation is currently more defensible than wholesale occupation replacement: roughly one in four workers is in an occupation with some exposure, while 3.3% of global employment is in its highest-exposure category. [ILO Working Paper 140](https://www.ilo.org/publications/generative-ai-and-jobs-refined-global-index-occupational-exposure)
- Bounded workplace deployments can improve productivity, especially for less experienced workers, but macroeconomic estimates vary sharply because adoption, task coverage, complementary investment, and institutional response are unresolved. A primary customer-support study found larger gains among novice and lower-skilled workers in that setting; it does not establish an economy-wide effect. [Generative AI at Work](https://www.nber.org/papers/w31161), [OECD productivity scenarios](https://www.oecd.org/en/publications/macroeconomic-productivity-gains-from-artificial-intelligence-in-g7-economies_a5319ab5-en.html)
- Frontier agents are completing longer software-oriented tasks, but METR explicitly cautions that its tasks are narrower, cleaner, and easier to score than much real work. The results must not be generalized into a date for autonomous teaching, science, care, or an economy-wide replacement event. [METR task-horizon methodology](https://metr.org/time-horizons/)
- The expertise pipeline is an explicit hypothesis, not a settled forecast. Evidence about junior hiring is contested; if beginner tasks disappear before people build judgment, institutions may automate part of the apprenticeship that creates future experts. FORGE will track junior-task composition, hiring, training, and mobility rather than infer this outcome from model benchmarks. [Stanford AI Index 2026 — Economy](https://hai.stanford.edu/ai-index/2026-ai-index-report/economy)

### 4.2 Learning

- AI-assisted performance is not necessarily learning. OECD's 2026 synthesis distinguishes improved submitted work from independent learning and reports stronger promise for systems with explicit pedagogical control. [OECD Digital Education Outlook 2026](https://www.oecd.org/en/publications/2026/01/oecd-digital-education-outlook-2026_940e0dd8.html)
- A 2025 controlled study found that unrestricted generative AI could improve practice performance while harming later unaided learning; this does not prove a universal effect, but it makes support withdrawal and cold transfer mandatory evaluation conditions. [PNAS](https://doi.org/10.1073/pnas.2422633122)
- Tightly scaffolded student-facing AI tutoring can improve outcomes in bounded contexts, but current studies do not establish universal, durable, independent, cross-domain efficacy. A Harvard physics study reported strong immediate gains in one course with a carefully designed tutor and pre-authored materials. [Scientific Reports](https://www.nature.com/articles/s41598-025-97652-6)
- Teacher/tutor copilots are a different intervention. The Tutor CoPilot randomized trial reported a four-percentage-point increase in lesson-topic mastery during live K–12 mathematics tutoring, with larger effects for lower-rated tutors, while also reporting grade-appropriateness problems; it did not establish delayed transfer. [Tutor CoPilot](https://eric.ed.gov/?id=ED661562)
- Human–AI combinations are not automatically superior. A preregistered meta-analysis found that human–AI systems often underperformed the better of the human or AI alone, with task type materially changing results. [Nature Human Behaviour](https://www.nature.com/articles/s41562-024-02024-1)
- The IES practice guide supports spacing, retrieval, worked examples followed by problem solving, combined graphics and verbal descriptions, connections between abstract and concrete representations, and deep explanatory questions. These are design ingredients, not a universal recipe. [What Works Clearinghouse](https://ies.ed.gov/ncee/wwc/PracticeGuide/1)
- The Education Endowment Foundation warns that many cognitive-science findings are context- and domain-sensitive in classrooms and that mixed or null results must remain visible. [EEF research agenda](https://educationendowmentfoundation.org.uk/projects-and-evaluation/research-agenda-themes-priority-areas/research-agenda-theme-cognitive-science)

### 4.3 Access and power

- Falling model costs do not remove device, network, language, disability, compute, or institutional inequality. ITU estimated that 2.2 billion people remained offline in 2025 and that only 23% of people in low-income countries were online. [ITU Facts and Figures 2025](https://www.itu.int/itu-d/reports/statistics/facts-figures-2025/)
- The World Bank identifies connectivity, compute, context/data, and competency as separate foundations for inclusive AI adoption. A low token price cannot substitute for the other three. [Digital Progress and Trends Report 2025](https://www.worldbank.org/en/publication/dptr2025-ai-foundations/report)
- UNESCO's teacher competency framework centers human agency and positions AI as a complement to teachers, not a substitute for professional and relational responsibility. [UNESCO AI Competency Framework for Teachers](https://www.unesco.org/en/articles/ai-competency-framework-teachers)

### 4.4 Confidence boundary

The evidence supports building and evaluating a governed learning system. It does **not** support claiming that:

- generic AI is already a best teacher;
- generated lessons are safe or effective curriculum by default;
- one successful task establishes mastery;
- video consumption proves understanding;
- a provider benchmark establishes real-world reliability;
- FORGE can yet replace school, fulfil a legal homeschool programme, accredit learning, or safely serve every age and domain.

## 5. Scenario set: 5, 10, 15, and 20 years

These are stress tests, not forecasts. Confidence decreases rapidly after five years. Different regions and institutions may inhabit different scenarios at the same time.

| Scenario | 2031 — 5 years | 2036 — 10 years | 2041 — 15 years | 2046 — 20 years |
| --- | --- | --- | --- | --- |
| **Measured Copilot Commons** | Specialized assistants become ordinary, while people still scope, verify, motivate, teach, and govern. Teacher copilots spread faster than autonomous schools. | Cognitive jobs are recomposed more often than erased. Education mixes adaptive practice with teachers, peers, laboratories, projects, and communities. | Capability and project evidence gain weight beside credentials. Teachers operate increasingly as diagnosticians, coaches, critics, and community anchors. | Cheap assistance becomes utility-like; trusted human institutions remain responsible for development, safeguarding, and certification. |
| **Automation Mirage / Trust Winter** | Generic assistants become ubiquitous without sound learning design. Assisted output rises while unaided capability and assessment validity become disputed. | Productivity disappoints relative to hype. Verification, attention, deep expertise, and authentic human work become premium goods. | Expertise pipelines thin in some fields. A two-tier system emerges between assisted output and independently verified capability. | AI remains useful but fragmented by distrust, liability, and provider churn. Systems that can prove learning outperform systems that merely generate. |
| **Concentrated Acceleration** | Frontier agents improve quickly, but reliable access is controlled by a few firms and wealthy institutions. | Premium organizations automate task bundles while public systems depend on opaque or inferior providers. | Regions without compute, local-language data, and institutional capacity become consumers rather than shapers of intelligence infrastructure. | Cognitive infrastructure becomes geopolitically fragmented; portability, sovereignty, public options, and switching rights become central. |
| **Capability Commons** | Reliable multimodal systems become broadly affordable while open standards, public options, regulation, and educational evidence improve. | Dynamic maps, simulations, translation, tutoring, and project support become everyday learning infrastructure. | Routine cognitive production is heavily automated; learning emphasizes judgment, collaboration, creativity, care, physical action, and civic agency. | Lifelong capability infrastructure helps people repeatedly acquire, prove, and renew skills; freedom still depends on ownership and human governance. |

The OECD's 2030 trajectory work also spans stagnation through very rapid capability progress and does not justify a single confident point forecast. [OECD, Exploring Possible AI Trajectories Through 2030](https://www.oecd.org/en/publications/exploring-possible-ai-trajectories-through-2030_cb41117a-en.html)

## 6. Commitments robust across all scenarios

FORGE commits now to:

1. **Protected learner action.** The learner attempts the target operation before AI performs it, except where access or safety requires another route.
2. **Proof after withdrawal.** Learning claims derive from independent transfer and, when material, delayed return.
3. **Provider neutrality.** Capability maps, source records, resource records, evidence, and exports do not depend on one model or media platform.
4. **AI proposals, governed truth.** Models may decompose, draft, translate, compare, and adapt. Reviewed sources, deterministic validators, domain rules, physical consequences, and accountable people authorize truth and publication.
5. **Practical application.** Every substantial pathway connects knowledge to investigation, construction, repair, design, performance, explanation, or service.
6. **Human roles.** Teachers, guardians, mentors, assessors, peers, and safeguarding staff remain named authorities with inspectable boundaries.
7. **Accessible alternatives.** Video, diagrams, simulations, and interactive tools have reviewed textual, tabular, keyboard, low-motion, and low-bandwidth alternatives; any change to the assessed construct is explicit and uses a different evidence condition.
8. **Learner control.** Learners can edit routes, inspect why a resource or prerequisite appears, choose depth and representation, contest records, and export or delete their data.
9. **No surveillance business model.** No ads, attention feed, emotional profiling, raw-chat archive, hidden ranking, or sale of learner data.
10. **Honest uncertainty.** Candidate, reviewed, available, unavailable, contradicted, expired, withdrawn, and untested states remain distinct.

## 7. The product-defining workflow

```text
Learner intent
    ↓
Intent clarification and constraints
    ↓
Editable capability map
    ├── concepts and prerequisites
    ├── meaningful actions
    ├── representations and misconceptions
    ├── resources and people
    ├── practice and projects
    └── independent and delayed proof
    ↓
Reviewed route compiled for age, access, language, time, depth, and evidence
    ↓
Learner's starting model or plan
    ↓
Exactly two uncertain plausible readings → point of disagreement
    ↓
Domain-appropriate separating experience
    ↓
Reconstruct → practise → apply/make → critique → revise
    ↓
AI and instructional support withdraw
    ↓
Unfamiliar transfer → bounded evidence → return schedule or next frontier
```

### 7.1 Intent is broader than a search query

The intake MUST let the learner state:

- what they want to understand, do, make, repair, decide, or become capable of;
- why it matters and any real outcome they are heading toward;
- current experience without requiring a diagnostic label;
- desired depth, available time, language, device, bandwidth, materials, access needs, and whether a trusted adult or teacher is involved;
- whether they prefer to begin with a demonstration, text, example, activity, overview, or diagnostic attempt.

These are reversible route preferences. FORGE MUST NOT infer a fixed “learning style.”

Raw learner prose and private circumstances remain learner-owned and local/private by default. A learner previews the deterministic sanitized summary before any separately authorized model or external discovery call; closed access/material tokens are preferred over disclosing health, disability, family, or financial detail.

### 7.2 The editable map is a contract, not a generated syllabus

The map shows:

- the goal in the learner's words;
- target capabilities phrased as meaningful actions;
- core concepts and prerequisite edges;
- what is required, optional, unknown, unavailable, or under review;
- alternative routes and the consequence of skipping a prerequisite;
- the project or application that gives the pathway practical purpose;
- the evidence required before a claim can be made;
- an estimate range with assumptions, never false precision;
- provenance for every AI-proposed node and every reviewed change.

The learner can reorder optional material, select depth, reject an interpretation, choose a different project, and request a human review. Required safety or entitlement nodes may not be silently removed.

### 7.3 Resources are selected by pedagogical role

A route may contain:

- a concise orienting explanation;
- a worked example;
- a physical demonstration or observation;
- a reviewed video;
- a deterministic simulation or interactive model;
- a primary source or data set;
- retrieval and varied practice;
- a discussion, peer activity, teacher mini-lesson, or mentor critique;
- a practical project with artifacts and milestones;
- an independent transfer and delayed return.

No modality is the default proof of learning. A video can orient or demonstrate; it cannot establish capability merely because it was played to completion.

## 8. External resource and YouTube strategy

### 8.1 Governed connector, not curriculum oracle

FORGE cannot and should not pre-author every useful explanation. It can federate resources while preserving responsibility. Every external item moves through explicit states:

```text
discovered → candidate → reviewed → eligible → assigned
          ↘ rejected       ↘ expired / withdrawn / superseded
```

An AI-generated search result is a candidate. It becomes eligible only after the required source, rights, safety, accessibility, pedagogical, and lifecycle checks pass for a named audience and use.

Catalog maturity is visible:

- **R0 — Candidate:** discovered by a model, search, learner, educator, or creator; quarantined and never described as recommended.
- **R1 — Reviewed external resource:** identity, factual fit, provenance, audience, accessibility, tracking, rights, commercial influence, availability, and limits reviewed for a named use.
- **R2 — Anchored learning object:** an R1 resource paired with a FORGE active checkpoint, misconception notes, practice, reviewed alternative with construct status, and fallback.
- **R3 — Published reviewed and assignable World or pathway:** a versioned capability graph, reviewed sources/resources, project, protected proof, validator or named-human rubric, return interval, publisher authority, and owner history. “Published/assignable” is an operational state, not an efficacy or mastery claim.

The initial P1a pilot exposes only the reviewed catalog. A separately accepted P1b adult-exploration study may later let an entitled adult opt into a clearly separate R0 surface. R0 is never a reviewed pathway, source authority, proof surface, assignment, evidence input, or minor-facing result.

Among eligible resources, selection is deterministic and inspectable: capability and pedagogical-role fit, access constraints, construct preservation, freshness, provider diversity, stable tie-breaks, bounded learner choice, visible “why this resource” reason codes, and reviewed fallbacks. Search rank, views, likes, watch time, predicted engagement, sponsorship, paid placement, and model preference are prohibited ordering inputs.

### 8.2 Required resource record

Every external resource record MUST carry:

- provider, external identifier, canonical URL, creator or publisher, title, language, duration, and observed date;
- content type, pedagogical role, capability-node bindings, prerequisite assumptions, and expected active checkpoint;
- source and factual-claim links where the resource is used to teach external facts;
- license or usage basis, embed eligibility, attribution requirement, and any download restriction;
- captions, transcript availability and provenance, audio description, keyboard operation, visual dependence, and a reviewed alternative labeled `construct-preserving` or `construct-changing`;
- age/risk classification, advertising or sponsorship notes, tracking surface, region availability, sensitive-topic review, and made-for-kids status where provided;
- reviewer identities and decisions, review date, next review or expiry, replacement, withdrawal, and incident state;
- provider metadata version or ETag where available, plus a time-bounded observation-record digest and a separate review-signal digest that do not pretend the platform URL is an immutable content hash.

Epistemic authority and pedagogical fit are separate decisions. A clear explainer may still be an ineligible source for a contested factual claim.

### 8.3 YouTube-specific controls

YouTube is useful because it already contains demonstrations, lectures, craft practice, field footage, and explanations across languages and domains. It also introduces ads, tracking, provider-controlled related-video surfaces, region changes, creator edits, copyright constraints, age restrictions, and content drift.

FORGE therefore MUST:

- use the official API and player contracts; never scrape transcripts, download audiovisual media, or cache content outside explicit authorization;
- refresh or delete stored non-authorized API data within the platform's required 30-day window;
- treat a video ID as a locator, not immutable content identity, because creators can trim videos while preserving the URL, views, and comments;
- provide no FORGE-owned feed, comments, autoplay, engagement ranking, or overlays; do not claim that provider-controlled related-video or advertising surfaces can be removed;
- use an explicit click-to-load embed and privacy-enhanced mode when embedding is eligible;
- explain that privacy-enhanced mode reduces some personalization but does not remove all data sharing or guarantee an ad-free experience;
- record caption availability without assuming public caption-download rights;
- re-review on material metadata change, reported drift, expiry, or incident;
- always offer a reviewed alternative and disclose whether it preserves the same assessed construct; only a construct-preserving alternative supports the same capability claim;
- use curated, adult-reviewed allowlists for minors; never expose open web/video search directly to children;
- prefer internal, licensed, or guardian/educator-curated resources for younger children until child-directed client, legal, safety, and operations reviews explicitly authorize more;
- avoid sending raw sensitive learner text to the provider; resolve discovery against a sanitized capability query.
- keep FORGE checkpoints adjacent to and outside the official player; never gate provider playback, cover controls, suppress branding/links/ads, or style around policy requirements.

These controls follow YouTube's current [Developer Policies](https://developers.google.com/youtube/terms/developer-policies), [player parameters](https://developers.google.com/youtube/player_parameters), [policy guide](https://developers.google.com/youtube/terms/developer-policies-guide), [embedded-player privacy guidance](https://support.google.com/youtube/answer/171780), [advertising guidance](https://support.google.com/youtube/answer/132596), and [video API contract](https://developers.google.com/youtube/v3/docs/videos). Platform terms may change; the connector must fail closed when required policy metadata or refresh operations are unavailable.

### 8.4 Active-video contract

An eligible video card MUST state what the learner should notice and what action follows. At least one of these occurs before, during, or immediately after viewing:

- commit a prediction;
- sketch or label a mechanism;
- pause and explain a change;
- compare the video with a source, model, or physical observation;
- reproduce a procedure under safe conditions;
- answer an explanatory question;
- solve a varied case;
- identify a limitation, edit, or possible misconception.

Watch time, percentage completed, likes, and replay count MUST NOT become capability evidence.

## 9. Visual Understanding Layer

The visual layer exists to make relationships inspectable, not to decorate explanations.

Representation priority:

1. reviewed real-world observation or demonstration;
2. deterministic domain model or simulation;
3. reviewed diagram, timeline, map, animation, or manipulable;
4. source-bound generated draft reviewed by a qualified owner;
5. clearly labeled illustrative analogy that is not presented as literal evidence.

Every visual artifact declares:

- the concept and learner action it supports;
- whether it is observation, measurement, simulation, diagram, reconstruction, or analogy;
- variables, units, assumptions, omitted factors, and source/version where applicable;
- synchronized text/table or tactile/physical alternative;
- color-independent meaning, alt description, captions, keyboard operation, pause/step/reset, and reduced-motion behavior;
- reviewer, review date, and failure or uncertainty notes.

Generated video or imagery MUST NOT be treated as evidence of how a scientific, historical, medical, or social event actually occurred. For consequential domains it remains a staged draft until expert, source, rights, safety, and accessibility review.

## 10. Practice, projects, and exams

### 10.1 Practice

Practice should move from worked examples and guided variation toward independent, mixed, and delayed use. The system records the conditions and support used, not a decontextualized “mastery” score.

### 10.2 Practical projects

Every substantial pathway SHOULD culminate in an authentic mode of production appropriate to the domain:

- **build** a device, model, program, proof, or artifact;
- **investigate** a question with observations, data, and source reasoning;
- **repair** or improve a real system;
- **design** within stated users, constraints, and consequences;
- **explain or teach** with audience questions and correction;
- **perform** a technique or practice safely;
- **serve or contribute** under real community or professional standards.

The project record includes required capabilities, materials and no-cost alternatives, risk assessment, milestones, decisions, sources, AI contributions, failures, feedback, revisions, artifact provenance, and individual defence. Group output never substitutes for individual evidence.

### 10.3 Exams and proof

FORGE can provide quizzes, oral defence, practical demonstrations, source audits, unseen cases, and project critiques. It MUST distinguish:

- practice feedback;
- formative diagnosis;
- an independently observed performance;
- a delayed retention check;
- an externally moderated or regulated assessment.

Until an independent validity and governance programme exists, FORGE MUST NOT call its own exam an accredited credential, legal equivalence, admissions judgment, or broad mastery certification.

## 11. Teacher, TA, family, and homeschool direction

### 11.1 Educator Copilot / TA Mode

The first educator product should reduce preparation and coordination burden without hiding verification work. It may help an educator:

- translate a learner goal into a draft capability map;
- inspect prerequisite and misconception hypotheses;
- approve, replace, or annotate resources;
- adapt representation, language, timing, grouping, and materials;
- plan a demonstration, practical activity, or project;
- see attempts, support conditions, and open gaps without surveillance;
- prepare a mini-lesson, conference, critique, or return check;
- export a bounded evidence packet.

The product must measure **net teacher time**, including review, correction, setup, training, and incident handling—not only generation time.

### 11.2 Human authority remains explicit

AI does not silently become teacher, guardian, assessor, counselor, or safeguarding lead. A teacher or mentor can contest an AI proposal, but cannot silently upgrade evidence. A guardian can protect a child, but cannot use FORGE for covert surveillance or erase the child's rights.

### 11.3 Homeschool-capable is a separately gated North Star

FORGE may eventually coordinate a broad, lawful, humane learning pathway outside conventional school. That requires more than lessons:

- jurisdiction-specific entitlement and attendance mapping;
- verified guardianship and child-rights controls;
- breadth and progression review;
- regular human relationships, peer community, and safeguarding;
- disability and language support;
- practical resources and safe facilities;
- independent assessment, moderation, appeals, and transitions;
- pathways into further study, work, and public credentials;
- delayed-retention, wellbeing, equity, family-workload, and adverse-event evidence.

None of those conditions is implied by a successful learning route or product demo. “Could support homeschooling later” remains distinct from “is a homeschool solution now.”

## 12. Age and autonomy rollout

| Stage | Eligible audience | External discovery | Human relationship | Claim ceiling |
| --- | --- | --- | --- | --- |
| **P0 internal research** | Adult staff and named reviewers | Fixture and manually supplied resources only | Named research team | Engineering and review-process evidence only |
| **P1a reviewed adult self-learning pilot** | Closed, server-entitled, externally recruited 18+ cohort | Reviewed catalog only; fixture discovery first and live connector separately gated | Optional same-device co-review or learner export | Bounded route, usability, transfer, retention, and incident findings |
| **P1b adult exploration study** | Separately entitled and consented 18+ cohort after P1a | Clearly quarantined R0 candidates may be user-enabled; never assignments, sources, or evidence | No implied educator/reviewer approval | Candidate-comprehension, safety, review-cost, and incident findings only |
| **P2 educator / 16+ pilot** | Verified educators and upper-secondary learners under approved policy | Reviewed allowlist only for minors | Named teacher/guardian authority | Population- and duration-bounded learning and workload findings |
| **P3 younger supervised pilots** | Narrow age/domain cohorts with independent review | Closed curated catalog; no open web | Present or accountable verified adult | Only study-specific claims after safety, rights, and access gates |
| **P4 pathway / homeschool research** | Jurisdiction-specific, independently governed cohorts | Policy- and curriculum-reviewed | Full human and safeguarding operations | No equivalence or replacement claim without external authorization and longitudinal evidence |

The initial product wedge is P1a: adult-first, reviewed-only, and optionally educator-assisted through local co-review/export. This is not because children matter less; it is because open-ended external discovery, remote sharing, and autonomous AI introduce rights and operational responsibilities the current product has not earned authority to exercise.

## 13. First credible product wedge

### 13.1 Who

- adults learning a practical topic for work, creation, civic life, or personal capability;
- educators or tutors preparing and adapting a route for a learner;
- later, 16–17-year-olds inside an approved reviewed catalog and named adult authority.

### 13.2 What

An **Intent-to-Capability Map pilot** over a small set of reviewed domains:

1. ask what the person wants to understand, do, or make;
2. compile a transparent editable map;
3. route nodes to existing FORGE Worlds, reviewed external resources, practice, and one practical project;
4. require active checkpoints around video and generated explanations;
5. withdraw AI for a new-case proof;
6. schedule a return;
7. expose sources, assistance, gaps, and what remains untested.

For an unknown topic, the system returns an exploratory map with explicit unreviewed gaps and candidates. It MUST NOT imply that a validated course now exists.

### 13.3 Initial domain selection

Choose domains that:

- lead to an observable artifact or decision;
- permit safe adult practice with common or no-cost materials;
- have credible open sources and reviewed videos;
- support deterministic or human-reviewable proof;
- exercise more than one representation;
- do not begin with medical, legal, mental-health, high-stakes financial, dangerous physical, or regulated certification claims.

### 13.4 Portfolio hypothesis after the first vertical slice

After one reviewed vertical slice proves the publication/withdrawal machinery, the strongest first breadth test is six complete adult pathways across three materially different domain grammars, subject to domain-owner review:

| Grammar | Candidate pathway A | Candidate pathway B | Why it matters |
| --- | --- | --- | --- |
| Quantitative and scientific reasoning | Model and test a changing real-world system | Use proportional reasoning to plan, compare, and verify | Exercises deterministic models, diagrams, measurements, demonstrations, and exact validation |
| Source, writing, argument, and civic reasoning | Verify a disputed public claim | Build and defend an evidence-backed explanation | Exercises primary/secondary sources, ambiguity, disagreement, provenance, writing, and human rubric review |
| Computing, data, and AI making | Build and test a small automation | Design and audit an AI-assisted workflow | Exercises practical artifacts, debugging, evaluation, provider boundaries, and independent explanation |

Each pathway must include at least two reviewed representation routes with explicit construct-preserving/changing status, a practical artifact, source/resource review, protected transfer, and delayed return. Six complete pathways are preferable to hundreds of generated outlines because they reveal whether the operating model survives different evidence grammars.

## 14. Content and review operating model

FORGE operates a content supply chain, not a one-time library.

### 14.1 Roles

- **Domain owner:** defines capabilities, evidence, misconceptions, and consequential claim boundaries.
- **Source reviewer:** checks source identity, claim eligibility, currency, and disagreement.
- **Learning designer:** checks sequence, active learner operations, support, and transfer.
- **Accessibility reviewer:** checks equivalent operation and representation.
- **Safety/rights reviewer:** checks age, physical, privacy, cultural, and platform risks.
- **Resource curator:** checks fit, metadata, lifecycle, and replacement.
- **Publisher:** confirms all required signatures and owns rollback.
- **Incident owner:** freezes, investigates, corrects, notifies, and closes.

High-risk or child-facing publication requires at least two independent qualified approvals across the relevant domain and safety/access boundary. One model or one generalist reviewer cannot approve its own draft.

This supply chain adapts established operational patterns by analogy without treating them as learning evidence: immutable reviewed revisions, separation of author and publisher, specialist and whole-product review, accessibility audits, correction/appeal, third-party maturity labels, launch checklists, third-party risk ownership, and reliability error budgets. OpenStax's [faculty-contributor and peer-review process](https://help.openstax.org/s/article/Do-OpenStax-textbooks-favor-any-particular-schools-of-thought-or-specific-teaching-approaches), [errata](https://help.openstax.org/s/article/Errata-correction-process), and [accessibility](https://help.openstax.org/s/article/Do-OpenStax-materials-meet-ADA-guidelines) practices; Open edX's [exercises and tools](https://docs.openedx.org/en/latest/educators/concepts/exercise_tools/about_problems_exercises_tools.html); SLSA's protected-change review; NIST's AI risk controls; and Google SRE's launch/error-budget practices are useful analogies for accountable operation—not proof that FORGE teaches effectively.

### 14.2 Two-speed catalog

- **Candidate catalog:** broad, replaceable, clearly unverified, not child-assignable, not used as source authority.
- **Reviewed catalog:** bounded to a named audience, capability, role, date, and review state; eligible only while freshness, rights, accessibility, and safety obligations remain satisfied.

### 14.3 Stop rules

Publication or assignment freezes when:

- source, rights, review, or age metadata is missing;
- a provider item is withdrawn, region-blocked, or materially edited; embed delivery also freezes when embedding is unavailable, while a separately reviewed HTTPS link-out may remain eligible;
- a safety or epistemic incident reaches its stop threshold;
- the required reviewed alternative or its construct-status/access review is absent;
- a model or connector upgrade fails its pinned evaluation suite;
- the content/safety service-level error budget is spent;
- reviewer capacity is below the minimum needed to investigate and recover.

Provisional service objectives for the first reviewed catalog are:

- every assigned resource has an owner, maturity tier, review date, expiry, use/rights basis, and fallback;
- every external-provider failure leaves the route usable;
- every expired resource automatically loses assignment eligibility;
- every correction identifies affected maps, routes, and proof packages;
- a severe content or safety item can be placed on global incident hold within one hour while preserving the audit trail;
- no unreviewed external resource reaches a minor;
- every pilot proof record says `proof_authority: honour_based` and claims only in-product support withdrawal; no protected proof has enabled FORGE hints, solution-generating AI, replay, resubmission, or model-only authoritative grading.

These values are initial operating policies to test and revise, not demonstrated SLO performance.

## 15. Economics and sustainability

The system must make the real costs visible:

```text
cost per completed capability journey =
  model and retrieval cost
  + resource licensing/API cost
  + domain/source/learning/access/safety review
  + educator or mentor time
  + moderation and safeguarding
  + infrastructure and support
  + incident, replacement, and re-review reserve
```

Cheap generation does not eliminate review, teacher, mentor, moderation, source, and support costs. A sustainable model MUST NOT depend on:

- advertising to learners;
- selling or profiling learner data;
- hiding reviewer labor;
- making child access contingent on public posting;
- overstating efficacy to subsidize growth;
- locking evidence to FORGE.

The first pricing and partnership research should compare:

- free core learner maps and exports;
- paid adult compute or advanced tooling;
- educator/team workflow subscriptions;
- institution-funded review and deployment;
- grants or public-interest funding for languages, disability access, and open capability packages;
- paid human critique with explicit compensation and conflict rules.

### 15.1 Build, partner, and defer

FORGE should build and own the capability graph, map compiler, resource/provenance/review kernel, World runtime, support and proof locks, project/evidence contracts, educator decision surface, provider evaluations, correction/appeal, and learner export.

It should partner through replaceable adapters for model inference, video distribution, OER, licensed creators, simulations, datasets, captioning/accessibility services, identity, payments, and later institutional rostering. No partner identifier becomes canonical learner evidence.

It should defer global video hosting, a creator marketplace, mentor matching, autonomous grading, credentials, attendance/school records, multi-jurisdiction homeschool operations, and social/engagement systems until their specific authority and evidence gates pass.

Cost should be tracked per generated map, reviewed map, assigned capability node, practical artifact review, protected proof attempt, independently demonstrated capability, 30/90-day retained capability, content correction, and safety incident. Token count, watch time, clicks, and session completion are operational inputs, not value metrics.

No pricing decision is made in this document.

## 16. Measurement and evaluation

### 16.1 North-Star measurement

The primary learning outcome is:

> On an unfamiliar task after instructional assistance is removed, can the learner perform the named capability to the declared standard, explain or defend the result, and do so again after an appropriate delay?

### 16.2 Required metric families

| Family | Examples | Anti-metric |
| --- | --- | --- |
| Capability | new-case success, representation transfer, practical artifact quality, defence, delayed return | content completed or video watched |
| Agency | map edits understood, rejected suggestions, help choices, export/deletion success | acceptance of AI's first route |
| Human effect | net teacher time, review burden, mentor quality, escalation closure | generated minutes saved without verification time |
| Epistemic quality | eligible source coverage, contradiction handling, stale-resource rate, correction latency | fluent-answer rating |
| Safety and rights | child/adult policy violations, tracking exposure, incident severity, appeal and deletion closure | absence of reported incidents |
| Equity and access | low-bandwidth completion, language parity, accessible-alternative equivalence, materials burden | average outcome hiding subgroup harm |
| Creativity | diversity of questions, approaches, artifacts, and justified departures | rubric polish or output similarity |

### 16.3 Evaluation sequence

1. schema and invariant tests;
2. deterministic fixture and adversarial contract tests;
3. expert review reliability;
4. accessibility and policy journey testing;
5. adult usability and comprehension study;
6. independent transfer and delayed-return pilot;
7. educator workload and decision-quality study;
8. subgroup and adverse-effect analysis;
9. bounded comparative study where ethical and useful;
10. separately governed child or pathway research.

Engineering, usability, learning, child safety, accessibility, teacher workload, and legal/pathway claims remain separate.

## 17. Thirty-, ninety-, and 365-day decision gates

These are sequencing goals, not calendar promises.

### First 30 days — contracts before reach

- accept or reject ADR-009;
- define intent, capability-map, resource-observation, pedagogical-role, project, and proof contracts;
- author one adult-safe capability map and one practical project;
- create a fixture-only resource catalog with at least one video and one reviewed alternative whose construct effect is explicit;
- implement evaluation fixtures for stale, edited, unavailable, unsafe, inaccessible, and hallucinated-resource cases;
- set provider, external-resource, minor, publication, and claims features off by default.

**Gate:** no external discovery or map route reaches a learner until deterministic validation, review states, provenance, and failure behavior pass.

### First 90 days — adult pilot, not universal product

- ship one reviewed adult learning-path pilot behind explicit study/preview language;
- add editable map UI, reviewed resource cards, active checkpoints, practical project, support withdrawal, and return scheduling;
- run representative accessibility and low-bandwidth sessions;
- measure independent transfer, delayed return, route comprehension, resource failures, and total review/teacher time;
- publish negative and incomplete evidence with the positive results.

**Gate:** no 16–17 pilot until adult incident, accessibility, source-lifecycle, and evidence results meet predeclared thresholds.

### First 365 days — repeatability before breadth claims

- demonstrate repeatable publication and replacement across several materially different domains;
- validate reviewer reliability and content/safety error-budget operations;
- evaluate at least one educator-assisted cohort and one adult-independent cohort;
- establish provider switching and resource portability;
- publish cost, workload, equity, adverse-effect, and delayed-retention results;
- seek independent curriculum, assessment, safety, privacy, and accessibility review.

**Gate:** no “learn anything,” homeschool solution, teacher replacement, efficacy-at-scale, or credential-equivalence claim until its separate evidence and authority gate is satisfied.

## 18. Decisions deliberately deferred

- autonomous high-stakes grading or credential issuance;
- open-web search for minors;
- generated-video publication as factual instruction without domain review;
- unrestricted persistent chat or emotional memory;
- permanent child profiles or inferred psychological traits;
- proprietary foundation-model training;
- live mentor marketplace;
- ads, sponsorship ranking, or paid resource placement;
- full legal homeschool operation;
- one universal route-ranking algorithm;
- a universal “mastery” score.

## 19. Signposts to review quarterly

1. reliable real-world task completion, not benchmark averages;
2. independent transfer and delayed-retention studies across ages, domains, languages, and access needs;
3. teacher expertise and workload, including whether AI use creates dependency;
4. junior-task removal, apprenticeship redesign, and expert pipeline health;
5. capability-adjusted inference cost, offline quality, open-model gap, and local-language parity;
6. provider concentration, switching cost, interoperability, and public options;
7. child, privacy, hallucination, bias, accessibility, and platform incidents;
8. diversity of learner questions, approaches, and artifacts;
9. realized productivity, wages, and access distribution rather than exposure estimates;
10. changes in minor, education-AI, platform, accessibility, liability, and credential law.

## 20. Open research programme

The following remain unresolved and must stay visible in the roadmap:

- Which AI-tutoring effects persist for months and transfer across domains?
- Can independent learners obtain gains seen in tightly authored or teacher-guided studies?
- How does sustained AI assistance change memory, confidence calibration, motivation, social development, and identity?
- Which active-video designs work for which ages, domains, and access needs?
- How can resource review scale without hiding labor or collapsing into popularity ranking?
- Does novice-task automation improve or damage expert formation?
- Which generated visual forms are instructionally useful without increasing misconception?
- How should FORGE compare routes while preserving learner agency and avoiding behavioral surveillance?
- Which project and evidence forms are trusted by learners, teachers, communities, universities, and employers?
- What governance, human network, and public accountability would be required before homeschool-capable operation?

These are research questions, not assumptions to smooth over with product copy.

## 21. Selected source notes

| Source | Claim used | Qualification |
| --- | --- | --- |
| [ILO Working Paper 140](https://www.ilo.org/publications/generative-ai-and-jobs-refined-global-index-occupational-exposure) | Broad occupational exposure; transformation more defensible than full replacement | Exposure is not realized job loss |
| [Stanford AI Index 2026 — Education](https://hai.stanford.edu/ai-index/2026-ai-index-report/education) | Rapid student adoption and policy lag | US-heavy indicators do not establish global learning effects |
| [Stanford AI Index 2026 — Economy](https://hai.stanford.edu/ai-index/2026-ai-index-report/economy) | Uneven adoption and bounded productivity evidence | Observational and deployment results do not determine long-run macro effects |
| [METR task horizons](https://metr.org/time-horizons/) | Longer software-oriented autonomous task horizons | Narrow task distribution and measurement limits |
| [OECD Digital Education Outlook 2026](https://www.oecd.org/en/publications/2026/01/oecd-digital-education-outlook-2026_940e0dd8.html) | Assisted performance differs from learning; pedagogical controls matter | Synthesis spans heterogeneous systems |
| [PNAS generative-AI learning study](https://doi.org/10.1073/pnas.2422633122) | Unrestricted support can harm later unaided learning | Bounded population and task; not universal |
| [Scientific Reports AI tutoring study](https://www.nature.com/articles/s41598-025-97652-6) | Carefully scaffolded tutoring can improve immediate learning | One course; pre-authored materials; limited retention evidence |
| [Tutor CoPilot](https://eric.ed.gov/?id=ED661562) | A tutor-facing copilot improved lesson-topic mastery in one live K–12 math-tutoring study | Four-percentage-point result; grade-appropriateness issues; no delayed-transfer claim |
| [IES practice guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) | Retrieval, spacing, worked examples, representations, explanatory questions | Principles need domain and learner translation |
| [EEF cognitive-science agenda](https://educationendowmentfoundation.org.uk/projects-and-evaluation/research-agenda-themes-priority-areas/research-agenda-theme-cognitive-science) | Classroom effects are context-sensitive and may be mixed or null | Research-agenda synthesis, not one intervention effect |
| [UNESCO teacher framework](https://www.unesco.org/en/articles/ai-competency-framework-teachers) | Human-centered teacher augmentation | Framework, not efficacy evidence |
| [ITU Facts and Figures 2025](https://www.itu.int/itu-d/reports/statistics/facts-figures-2025/) | Persistent connectivity inequality | Connectivity does not capture all access constraints |
| [World Bank DPTR 2025](https://www.worldbank.org/en/publication/dptr2025-ai-foundations/report) | Connectivity, compute, context, and competency are distinct foundations | Strategic framework, not a FORGE outcome |
| [YouTube Developer Policies](https://developers.google.com/youtube/terms/developer-policies) | API data, child-client, embedding, and storage duties | Terms are time-sensitive and require connector review |
| [YouTube embed privacy guidance](https://support.google.com/youtube/answer/171780) | Privacy-enhanced embed behavior and limits | Does not mean zero tracking or ads |
| [YouTube editor guidance](https://support.google.com/youtube/answer/9057455) | A video may be trimmed while preserving URL and engagement data | Platform behavior can change |

## 22. Exact claim boundary

This document establishes a strategic direction, scenario set, architecture constraints, and research programme. It does not demonstrate that the proposed workflow is implemented, usable, effective, safe for minors, accessible in representative operation, economically sustainable, jurisdictionally compliant, homeschool-ready, accredited, or production-authorized. Each such claim requires the evidence and authority defined in the governing product specification and delivery gates.
