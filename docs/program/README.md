# FORGE Program Control Room

**Authority:** principal architecture/review task  
**Canonical repository:** `/Users/Priyansh/Documents/codex-buildweek/education`  
**Product baseline before program control:** `846158a492039b14381eae3c2fbb1f309d049ea5`
**Initial control-room commit:** `5b0bceb`
**Program posture:** C1 interactive foundation; G1 candidate; broad product vision, narrow claims

## North Star

FORGE should let a child learning with a grown-up, a teenager, or an adult begin with any legitimate question and leave with a stronger model of the world, an ability they can exercise without AI help, a truthful record of the conditions under which they demonstrated it, and a clear next path that preserves their agency.

The product is not a larger course catalog or a friendlier chatbot. It is a replacement architecture for the parts of education that routinely fail learners:

- questions are subordinated to schedules;
- explanations are optimized for coverage rather than model change;
- practice is confused with understanding;
- help-contaminated performance is called mastery;
- subject boundaries hide transferable ways of thinking;
- learners have little control over pace, depth, evidence, or privacy;
- relationships and real work are either absent or unsafe;
- credentials make claims that the underlying evidence cannot support.

FORGE counters those failures with one governing loop:

> learner question → explicit starting model → plausible readings → separating experience → reconstruction → assistance withdrawal → unfamiliar proof → bounded evidence → deliberate return or application

## Product constitution

1. **The learner acts.** AI may interpret, compare, assemble, or direct attention; it may not replace the protected learner action.
2. **Evidence decides.** A model, teacher, parent, completion event, or score cannot silently upgrade a claim.
3. **Assistance is provenance.** Help is recorded factually and changes what a result may mean; it is not shame or a penalty.
4. **Proof happens after help leaves.** Accessibility remains; instructional assistance does not.
5. **Questions may be broad; claims stay narrow.** “Learn anything” describes access and direction, not universal curriculum coverage or efficacy.
6. **Curriculum publication is a review act.** Generated drafts remain drafts until sources, rights, explanation, access, safety, and proof design pass review.
7. **Children receive stricter defaults.** Guardian-managed mode, curated sources, no open contact, no cloud evidence by default, and no verified-age fiction.
8. **Learner data is not the business model.** No advertising profiles, hidden rank, emotion/personality inference, raw-chat archive, or engagement optimization.
9. **Relationships cannot be automated away.** Human guidance, care, accountability, collaboration, and safeguarding remain first-class system responsibilities.
10. **A negative result is useful.** The product must preserve uncertainty, failed transfer, open questions, and “not tested” states.

## Success model

FORGE is successful only if it improves all five dimensions without hiding harm in an average score:

| Dimension | System question | Evidence needed before a broad claim |
| --- | --- | --- |
| Capability | Can the learner explain, decide, make, or perform in a new case? | Valid unfamiliar tasks, reliability, delayed return, scoped transfer |
| Autonomy | Can the learner choose questions, depth, support, data, and next action? | Comprehension, meaningful choices, reversibility, no dark patterns |
| Relationships | Are helpful adults and peers present without unsafe access or surveillance? | Verified roles, consent, reporting, expiry, workload, safeguarding operations |
| Protection | Are privacy, source, physical, psychological, and assessment harms prevented or recoverable? | Incident tests, deletion/export, content review, access testing, stop authority |
| Portability | Can evidence support later learning or opportunity without becoming a permanent label? | Provenance, external moderation, expiry, appeals, transition studies |

## Current truth

The baseline contains four working Learning Worlds, a deterministic path compiler, browser-local evidence, a typed event journal, privacy-minimal device profiles, optional cloud-auth adapters, a provider-neutral Lesson Studio, staged Supabase schemas, and production-grade unit/browser coverage.

It does **not** contain a complete curriculum, verified cloud identity operation, guardian-consent service, live evidence sync, people network, accredited pathway, representative learner study, efficacy evidence, or a live-credential evaluation of the four provider adapters.

The source commit `846158a` is pushed. Its attempted Vercel production deployment `dpl_GwTK18jVR2NmEb4VKa3KGhf6hLzi` is blocked; the last READY production deployment is still `af5f3ca`. Release Operations owns diagnosis. No worker may call the blocked candidate deployed.

## Cost-aware operating model

- The principal task owns architecture, contract changes, integration decisions, red-team review, claim language, and production authorization.
- The principal task does not perform routine feature coding, poll continuously, or rerun unchanged checks.
- Implementation defaults to `gpt-5.6-terra` at high or xhigh reasoning in isolated worktrees.
- Repetitive verification and inventory work defaults to `gpt-5.6-luna` high.
- `gpt-5.6-sol` is reserved for a bounded task whose complexity demonstrably exceeds Terra; `ultra` remains principal-only and demand-driven.
- Each worker receives one bounded goal, commits one reviewable slice, reports exact evidence, and stops. Follow-up work is sent to the same lane so context is reused.
- Nothing is merged, deployed, migrated, or enabled merely because a worker reports success.

## Canonical program documents

1. [Architecture baseline](ARCHITECTURE.md)
2. [Dependency-ordered master plan](MASTER_PLAN.md)
3. [Worker thread ledger and work packets](THREAD_LEDGER.md)
4. [Principal review and integration protocol](REVIEW_PROTOCOL.md)

These files are principal-owned. Workers may cite them and propose changes in their handoff, but must not edit them unless the principal assigns a documentation-only amendment.
