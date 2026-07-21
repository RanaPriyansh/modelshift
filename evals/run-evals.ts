import { INTERPRETATION_FIXTURES, INTERPRETATION_FIXTURE_VERSION } from "./fixtures";
import { ruleBaseline, scoreRuleBaseline } from "./rule-baseline";

const baseline = scoreRuleBaseline(INTERPRETATION_FIXTURES);
const categoryCounts = new Map<string, number>();
let invalidFixtures = 0;

for (const fixture of INTERPRETATION_FIXTURES) {
  categoryCounts.set(fixture.category, (categoryCounts.get(fixture.category) ?? 0) + 1);
  if (fixture.explanation.length === 0 || fixture.explanation.length > 600) invalidFixtures += 1;
}

const probeSafety = INTERPRETATION_FIXTURES.every((fixture) => ruleBaseline(fixture.explanation).probe !== undefined);
const apiKeyPresent = Boolean(process.env.OPENAI_API_KEY);

console.log("ModelShift interpretation eval report");
console.log(`fixtures: ${INTERPRETATION_FIXTURES.length} (version ${INTERPRETATION_FIXTURE_VERSION})`);
console.log(`categories: ${[...categoryCounts.entries()].map(([name, count]) => `${name}=${count}`).join(", ")}`);
console.log(`fixture input validity: ${invalidFixtures === 0 ? "PASS" : `FAIL (${invalidFixtures})`}`);
console.log(`rule baseline primary-category agreement on clear fixtures: ${baseline.correct}/${baseline.clear} (${(baseline.agreement * 100).toFixed(1)}%)`);
console.log(`rule baseline always selects an authored probe: ${probeSafety ? "PASS" : "FAIL"}`);
console.log(`live model evaluation: ${apiKeyPresent ? "not run by this offline deterministic runner" : "NOT RUN (OPENAI_API_KEY is absent)"}`);
console.log("No live accuracy, latency, or 85% model-agreement claim is made by this report.");

if (INTERPRETATION_FIXTURES.length < 50 || invalidFixtures > 0 || !probeSafety) process.exitCode = 1;
