export type CandidateDirection = {
  id: string;
  title: string;
  transformation: string;
  forWhom: string;
  areas: readonly string[];
  publicationNeed: string;
  availableWorlds: readonly string[];
  goal: string;
};

export const METHOD_STEPS = [
  {
    number: "01",
    title: "Name the capability",
    body: "Start with what you want to understand, build, or be able to do. Forge keeps the goal in your language.",
    proof: "A goal you can inspect and revise.",
  },
  {
    number: "02",
    title: "Clarify the starting point",
    body: "Add only the context that changes the route: present experience, time, constraints, and the standard of proof you need.",
    proof: "A bounded interpretation, not a personality score.",
  },
  {
    number: "03",
    title: "Inspect the route",
    body: "A credible path names prerequisites, milestones, sources, active work, projects, proof, and the gaps that are not ready.",
    proof: "An editable proposal before any commitment.",
  },
  {
    number: "04",
    title: "Do active work",
    body: "Use reviewed resources, make predictions, retrieve ideas, explain decisions, and apply them in unfamiliar situations.",
    proof: "Work that reveals a model, not passive completion.",
  },
  {
    number: "05",
    title: "Enter ModelShift",
    body: "When a mental model matters, compare explanations and run the authored test that separates them.",
    proof: "A deterministic observation where correctness stays outside model judgment.",
  },
  {
    number: "06",
    title: "Build and prove",
    body: "Projects turn understanding into an artifact. Assistance is then removed for a separate transfer.",
    proof: "Evidence that records the help used and what was independently demonstrated.",
  },
  {
    number: "07",
    title: "Return later",
    body: "A future return check should test retention instead of assuming one successful session means mastery.",
    proof: "Retained only after it is actually tested.",
  },
] as const;

export const CANDIDATE_DIRECTIONS: readonly CandidateDirection[] = [
  {
    id: "ai-literacy",
    title: "Become AI-literate",
    transformation: "Move from trusting fluent output to tracing claims, comparing support, and stating uncertainty.",
    forWhom: "Learners who use AI for study or work and want a more reliable way to judge its answers.",
    areas: ["Source judgment", "Model limits", "Verification", "Responsible use"],
    publicationNeed: "A reviewed end-to-end sequence, released project, and delayed-return proof family.",
    availableWorlds: ["AI & learning", "What can a photograph prove?"],
    goal: "I want to become AI-literate.",
  },
  {
    id: "engineering",
    title: "Think like an engineer",
    transformation: "Move from ideas to constraints, testable models, built artifacts, and defended trade-offs.",
    forWhom: "Learners who want to reason quantitatively and build under real constraints.",
    areas: ["Systems", "Measurement", "Design", "Testing"],
    publicationNeed: "Reviewed build projects, safety coverage, materials, and human critique.",
    availableWorlds: ["Force & motion", "Ratios that stay the same"],
    goal: "I want to think, build, test, and communicate like an engineer.",
  },
  {
    id: "general-knowledge",
    title: "Build strong general knowledge",
    transformation: "Move from disconnected facts to a source-linked map of ideas across domains.",
    forWhom: "Curious learners seeking breadth without pretending a reading list is a curriculum.",
    areas: ["Science", "History", "Civics", "Culture"],
    publicationNeed: "A broad reviewed capability map, cross-domain projects, and proof families.",
    availableWorlds: [],
    goal: "I want broad general knowledge and the ability to connect ideas across domains.",
  },
  {
    id: "politics",
    title: "Understand politics and government",
    transformation: "Move from slogans to institutions, incentives, primary sources, and explicit trade-offs.",
    forWhom: "Learners who want to evaluate civic and policy claims with more care.",
    areas: ["Institutions", "Rights", "Public finance", "Media literacy"],
    publicationNeed: "Jurisdiction-specific sources, neutrality review, and controversy-handling policy.",
    availableWorlds: ["What can a photograph prove?"],
    goal: "I want to understand how governments work and evaluate political claims.",
  },
  {
    id: "philosophy",
    title: "Learn philosophy seriously",
    transformation: "Move from opinions to charitable argument reconstruction, objections, and bounded positions.",
    forWhom: "Learners who want to reason about knowledge, ethics, reality, and a good life.",
    areas: ["Logic", "Epistemology", "Ethics", "Argument"],
    publicationNeed: "Reviewed primary texts, interpretation notes, and human-reviewed defence.",
    availableWorlds: [],
    goal: "I want to reason clearly about knowledge, ethics, reality, and a good life.",
  },
  {
    id: "psychology",
    title: "Understand psychology",
    transformation: "Move from popular claims to mechanisms, methods, evidence quality, and careful limits.",
    forWhom: "Learners who want to read psychological research critically without treating it as diagnosis.",
    areas: ["Research methods", "Statistics", "Learning", "Behaviour"],
    publicationNeed: "Current source packages, methods foundations, and clinical safety boundaries.",
    availableWorlds: [],
    goal: "I want to understand psychology and read research critically.",
  },
  {
    id: "software",
    title: "Learn software development",
    transformation: "Move from snippets to specified, tested, secure, explainable systems.",
    forWhom: "Learners who want to build reliable software and understand the systems behind it.",
    areas: ["Programming", "Testing", "Systems", "Security"],
    publicationNeed: "Versioned execution, a reviewed project ladder, code review, and deployment proof.",
    availableWorlds: [],
    goal: "I want to build reliable software and understand the systems behind it.",
  },
  {
    id: "science",
    title: "Improve scientific reasoning",
    transformation: "Move from plausible stories to competing predictions, separating tests, and revision.",
    forWhom: "Learners who want to investigate explanations and quantify what evidence can support.",
    areas: ["Models", "Measurement", "Experiment", "Uncertainty"],
    publicationNeed: "Reviewed investigations, statistics and ethics coverage, and delayed proof.",
    availableWorlds: ["Force & motion", "Ratios that stay the same", "What can a photograph prove?"],
    goal: "I want to test explanations and reason from evidence like a scientist.",
  },
] as const;
