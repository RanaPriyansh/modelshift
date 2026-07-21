import type { RatioAudience, RatioContent } from "./model";

export const PROPORTIONAL_REASONING_CONTENT: RatioContent = Object.freeze({
  title: "The two citrus mixes",
  capabilityClaim: "Compare and scale proportional relationships across representations.",
  mixtures: Object.freeze([
    Object.freeze({
      id: "glass_a",
      name: "Glass A",
      concentrateParts: 2,
      waterParts: 3,
      vesselLabel: "2 scoops concentrate + 3 cups water",
    }),
    Object.freeze({
      id: "jug_b",
      name: "Jug B",
      concentrateParts: 5,
      waterParts: 6,
      vesselLabel: "5 scoops concentrate + 6 cups water",
    }),
  ] as const),
  initialPrompt: "Which drink will taste more strongly of citrus?",
  initialOptions: Object.freeze([
    Object.freeze({ id: "same_strength", label: "They taste equally strong" }),
    Object.freeze({ id: "glass_a_stronger", label: "Glass A tastes stronger" }),
    Object.freeze({ id: "jug_b_stronger", label: "Jug B tastes stronger" }),
  ]),
  readings: Object.freeze([
    Object.freeze({
      id: "additive_gap",
      label: "Compare what is left over",
      summary: "There is one more cup of water than concentrate in each drink, so the mixtures count as the same.",
      prediction: "The drinks should taste equally strong.",
    }),
    Object.freeze({
      id: "multiplicative_ratio",
      label: "Compare one quantity for the same amount of the other",
      summary: "Strength depends on the concentrate-to-water relationship, not the additive gap between the amounts.",
      prediction: "Jug B should taste stronger.",
    }),
  ] as const),
  disagreement: "The readings disagree when the additive gap matches but the multiplicative relationship does not.",
  separatingTest: "Rewrite both recipes for exactly 6 cups of water, then compare concentrate without rounding.",
  cues: Object.freeze([
    Object.freeze({
      level: 1,
      label: "Attention cue",
      text: "What could you make the same in both recipes before you compare them?",
    }),
    Object.freeze({
      level: 2,
      label: "Representation cue",
      text: "Glass A can be doubled: 2 concentrate for 3 water becomes 4 concentrate for 6 water.",
    }),
    Object.freeze({
      level: 3,
      label: "Principle",
      text: "Equivalent ratios come from multiplying or dividing both quantities by the same non-zero factor. A matching difference is not enough.",
    }),
  ] as const),
  reconstructionPrompt: "Explain how you can decide whether two relationships are proportional without relying on their totals.",
  transfer: Object.freeze({
    prompt: "A map uses 3 cm to represent 8 km. A trail measures 12 cm on the same map. How long is the real trail?",
    mapDistanceCm: Object.freeze({ numerator: 3, denominator: 1 }),
    realDistanceKm: Object.freeze({ numerator: 8, denominator: 1 }),
    targetMapDistanceCm: Object.freeze({ numerator: 12, denominator: 1 }),
    options: Object.freeze([
      Object.freeze({ id: "18_km", label: "18 km", distanceKm: Object.freeze({ numerator: 18, denominator: 1 }) }),
      Object.freeze({ id: "24_km", label: "24 km", distanceKm: Object.freeze({ numerator: 24, denominator: 1 }) }),
      Object.freeze({ id: "32_km", label: "32 km", distanceKm: Object.freeze({ numerator: 32, denominator: 1 }) }),
      Object.freeze({ id: "96_km", label: "96 km", distanceKm: Object.freeze({ numerator: 96, denominator: 1 }) }),
    ]),
  }),
  returnProof: Object.freeze({
    afterDays: 3,
    description: "A new proportional situation, with no cues and a different representation.",
  }),
});

export const AUDIENCE_COPY: Readonly<Record<RatioAudience, {
  readonly welcome: string;
  readonly explanationPrompt: string;
  readonly experimentNote: string;
}>> = Object.freeze({
  child_with_grown_up: Object.freeze({
    welcome: "You can explore this with a grown-up. The relationship you prove is the same one everyone uses.",
    explanationPrompt: "Tell us how you decided. Your grown-up can type your exact words.",
    experimentNote: "Try the parts view first, then use the exact-number table together if you want.",
  }),
  teen: Object.freeze({
    welcome: "Use any method you trust. The instrument will test the relationship, not judge your wording.",
    explanationPrompt: "Explain what you compared and why that should decide the taste.",
    experimentNote: "Move between parts, common quantities, and the exact table. They describe one relationship.",
  }),
  adult: Object.freeze({
    welcome: "No school shorthand is required. Commit your reasoning, then inspect an exact comparison.",
    explanationPrompt: "Describe the comparison you would rely on in an everyday decision.",
    experimentNote: "The standard stays exact: each view is derived from the same whole-number relationship.",
  }),
});
