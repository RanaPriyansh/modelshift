# FORGE Founder Idea Log

**Owner:** product founder

**Maintainer:** principal architecture task

**Purpose:** preserve the founder's intent, judgments, questions, and evolving thesis before they are translated into specifications or implementation plans

This is an append-only product-thinking record. It is not implementation evidence, publication authority, a delivery commitment, or permission to weaken FORGE's safety, source, accessibility, proof, privacy, or claims gates.

## Logging protocol

Each new founder contribution should record:

1. the date and context;
2. a faithful plain-language paraphrase;
3. decisions or strong preferences expressed;
4. open questions and tensions;
5. the product, architecture, research, and delivery documents affected;
6. the evidence required before an idea becomes a shipped claim.

Do not replace earlier entries when the thesis evolves. Add a later entry and link the change.

---

## 2026-07-23 — The practical AI-era learning hub

### Founder intent

FORGE should become the place people choose when they want to learn in the AI era. It should do for abundant, personalized intelligence what early internet learning platforms did for global distribution, while aiming beyond a library of videos or generated lessons.

A learner should be able to state any topic, capability, or project they want to pursue. FORGE should then help them see the whole territory before they begin:

- the concepts, topics, chapters, prerequisites, and practical capabilities involved;
- several possible depths and routes through that territory;
- what is essential, optional, uncertain, or outside the current reviewed catalog;
- a plan the learner can inspect, rearrange, shorten, deepen, or redirect.

The learning experience should be practical and multimodal. It should combine:

- concise source-grounded text;
- diagrams, simulations, demonstrations, and other visual explanations;
- carefully selected external videos, including appropriate YouTube material when the learner prefers video;
- exercises and bounded exams;
- authentic projects that create something useful or observable;
- reconstruction and unaided transfer;
- help from AI, teachers, tutors, families, peers, or teaching assistants when those relationships are appropriate and safeguarded.

The platform cannot contain every lesson on day one. Its early architecture should therefore orchestrate trusted external resources and generated explanations without pretending that discovery equals review or that model output equals curriculum.

AI should make high-quality explanation, planning, adaptation, feedback, translation, visualization, and creative exploration far more available. It should help teachers rather than erase the value of human judgment, care, relationships, inspiration, safeguarding, and community. FORGE may eventually support serious home education, but it must earn that role through curriculum, evidence, jurisdiction, child-safety, accessibility, human-support, and operational gates.

The human outcome is larger than content completion. FORGE should help people become more capable, creative, curious, independent, and free. It should expand what people can imagine and make, not turn learning into passive consumption or dependence on an answer machine.

### Product decisions and strong preferences

1. **Question-to-map before question-to-answer.** Start by compiling a visible, editable capability map rather than immediately generating a lesson.
2. **Practical application is first-class.** Every substantial path should lead toward demonstrations, exercises, artifacts, experiments, performances, or real projects.
3. **Multimodal by design.** Text, visual explanation, video, interactive representations, practice, projects, and human help are complementary modes.
4. **External-resource orchestration is necessary.** FORGE should safely use high-quality material it does not own instead of waiting to author an exhaustive catalog.
5. **Learner control matters.** Learners should be able to customize depth, order, pace, modality, and goals without allowing unsafe or incoherent plans to masquerade as reviewed pathways.
6. **AI is an intelligence layer, not the whole institution.** It may plan, explain, translate, adapt, visualize, recommend candidates, and help author drafts. Reviewed sources, deterministic systems, accountable people, and protected proof retain their authority.
7. **Teachers and teaching assistants remain valuable.** The near-term product should amplify educators and families. Any future substitute role requires substantially stronger evidence and operations.
8. **The horizon is long.** Architecture and strategy should consider plausible 5-, 10-, 15-, and 20-year changes in work, creativity, expertise, access, institutions, and human–AI collaboration.
9. **Human flourishing is the governing outcome.** Optimize for capability, agency, creativity, understanding, contribution, and freedom—not engagement extraction or content throughput.

### Named product concepts to investigate

- **Learning Map Compiler:** converts a goal into a transparent prerequisite, concept, capability, project, and proof graph.
- **Resource Orchestrator:** retrieves reviewed internal material and ranked external candidates across text, video, simulation, dataset, tool, expert, and community formats.
- **Visual Understanding Layer:** creates or selects diagrams, demonstrations, manipulatives, simulations, timelines, spatial models, and accessible alternatives.
- **Project and Practice Studio:** turns knowledge goals into progressively authentic exercises and artifacts with rubrics, checkpoints, provenance, and reflection.
- **Educator Copilot / TA Mode:** helps teachers and families inspect plans, adapt explanations, prepare materials, notice gaps, and respond without covert surveillance or automated authority.
- **Frontier-to-Curriculum Pipeline:** turns unknown learner questions into source discovery and review work rather than fabricated course availability.
- **Future Capabilities Observatory:** periodically examines how AI changes valuable human capabilities and updates FORGE's long-term curriculum thesis without silently changing published learning paths.

### Open questions and tensions

- How can external video discovery remain current without turning recommendations into unreviewed endorsements?
- What is the minimum review packet for a video, and how should age suitability, accessibility, rights, bias, advertisements, sponsorship, comments, tracking, region availability, creator changes, and removals be handled?
- When should FORGE embed a resource, link out, quote a transcript, create an original explanation, or generate a new visual?
- How can a customizable map preserve learner agency without creating prerequisite gaps or false confidence?
- What kinds of exams are valid for which domains, and where are projects, oral explanation, performance, portfolios, or delayed proof better evidence?
- Which forms of AI feedback support learning, and which create answer dependence or contaminate protected proof?
- What must remain human-led for minors, safeguarding, motivation, conflict, care, identity, ethics, creative apprenticeship, and high-stakes decisions?
- What economic model can sustain review, accessibility, source rights, compute, human support, and safety without advertising or learner-data exploitation?
- Which future-of-AI claims are robust enough to influence architecture now, and which should remain scenarios rather than forecasts?

### Documents and workstreams affected

- `README.md` — long-term product vision.
- `FORGE_PRODUCT_SPEC.md` — learner journey, rights, external resources, projects, educator roles, and claim boundaries.
- `docs/program/ARCHITECTURE.md` — map compiler, resource orchestration, review authority, state, and failure behavior.
- `docs/program/MASTER_PLAN.md` — staged research and implementation goals.
- `docs/FORGE_RESEARCH_TO_SYSTEM.md` — research claims and testable system decisions.
- New research packet — 5/10/15/20-year AI-era learning scenarios and strategic invariants.
- New ADR — practical multimodal learning paths and external-resource candidate handling.

### Evidence required before stronger claims

This idea does not establish that FORGE can teach any topic, replace school, operate a homeschool program, improve learning, select safe videos, or act as a teacher. Those claims remain prohibited until their specific content, source, learning-validity, accessibility, child-safety, jurisdiction, human-operation, and production gates pass.

---

## 2026-07-23 — Provider choice for lesson planning and generation

### Founder intent

FORGE should eventually let an authorized user choose among multiple LLM/AI providers and connect an API capability for bounded lesson planning, explanation, visualization, and draft generation. Provider choice should help FORGE use the strongest available capabilities without making one vendor the curriculum, evidence, or product authority.

### Decision boundary

- Provider-neutral schemas, deterministic validators, reviewed sources, human review, and authored fallbacks remain the stable system.
- A provider may propose a map, explanation, example, translation, visual draft, or lesson draft. It may not publish curriculum, approve a source/resource, choose its own proof answer, establish age/identity authority, or upgrade evidence.
- Existing Studio adapters are mock/off-by-default evidence only. This entry does not authorize live keys, browser key handling, provider spending, retention, or production calls.
- Provider credentials must never enter `NEXT_PUBLIC_*`, browser storage, logs, model prompts, or learner evidence.

### Open security, product, and operating questions

- Should adult BYOK be transient per request, encrypted in a user-owned vault, or omitted in favor of institution-managed keys?
- Which server-owned authority, reauthentication, rotation, revocation, deletion, export, and incident controls are required for any stored secret?
- How will FORGE disclose the selected provider, model/version, data sent, retention policy, training policy, jurisdiction, cost, latency, and fallback before a call?
- Which per-user/tenant budgets, rate limits, concurrency, retry, timeout, spend alerts, and abuse controls are mandatory?
- Which learner fields are never provider-eligible, and how are deterministic redaction, learner preview/consent, sensitive-topic routing, and deletion proven?
- How will provider/model upgrades pass held-out task, source, safety, access, schema, cost, and regression evaluation before rollout?
- What remains usable through authored or local fallbacks when a provider fails, changes terms, is removed, or becomes unaffordable?

### Evidence required before enablement

Live provider or BYOK operation remains a separate adult-only release decision. It requires server-owned secret authority, no-browser-exposure proof, provider-specific privacy/data-flow review, bounded budgets and abuse controls, deletion/rotation recovery, model/version receipts, held-out evaluation, kill switch, incident runbook, and an exact-SHA configured integration result. Minor-facing provider use requires a later independent child-rights, consent, safety, legal, and operations gate.

---

## 2026-07-23 — Ship reviewable slices while keeping the North Star

### Founder intent

FORGE should start existing as a usable product now and become stronger through repeated review. The team should keep building and shipping visible features instead of waiting for the entire education-system vision to be perfect on paper. Reviewers should be able to inspect the product as it grows, find what is weak or missing, and use that evidence to choose the next implementation slice.

Speed does not change the destination. The North Star remains a broad, practical, source-grounded learning system that helps children through adults understand deeply, make things, receive appropriate support, and demonstrate what they can do independently. The near-term product should reveal that architecture honestly without pretending that an exploratory map, fixture contract, generated draft, or polished screen already teaches any topic or can operate a homeschool.

### Execution interpretation

1. **Build vertical, inspectable seams.** Prefer small slices that connect visible learner need to an explicit contract and a testable boundary.
2. **Show unfinished states.** Unknown topics, missing sources, unavailable representations, absent projects, and unreviewed proof should appear as named work rather than fabricated completeness.
3. **Bind every shipped claim to evidence.** Record the exact code, tests, runtime authority, and exclusions for each slice so review can improve the real system.
4. **Keep momentum through modularity.** Capability maps, resources, representations, projects, proof, and educator operations should advance independently behind stable fail-closed interfaces.
5. **Do not borrow future authority.** A local fixture may justify the next integration task, but it does not authorize publication, providers, persistent learner data, minors, outcomes claims, or institutional use.
6. **Review and revise continuously.** Product, learning, accessibility, source, security/privacy, safety, and operations critiques should change the backlog without turning every early slice into a release ceremony.

### Current product consequence

The first implementation response is deliberately narrow: fixture-only capability-map, resource, representation, and project/practice contracts plus a contestable exploratory-map preview. The learner can see that FORGE has preserved their question and can challenge missing review gates, while the interface explicitly says that no reviewed route has yet been compiled or saved. This makes part of the future system reviewable without claiming a live learning path.

### Evidence required before the next stronger statement

The next stronger product statement requires one exact, bounded adult route that connects an accepted capability map to reviewed resources, a construct-aware representation, safe practical work, support withdrawal, unfamiliar proof, and return scheduling. It also requires trusted source/reviewer authority, server-owned adult entitlement, persistence and deletion boundaries, rendered accessibility evidence, failure/fallback behavior, and an exact-SHA release packet. Minor, homeschool, teacher-replacement, mastery, safety, and efficacy claims remain later independent gates.
