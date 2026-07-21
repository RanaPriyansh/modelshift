import { TOPIC_INDEX, type AuthoredTopic } from "./catalog";

function normalized(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐‑‒–—-]/g, " ")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsPhrase(text: string, phrase: string): boolean {
  const escaped = normalized(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, "i").test(text);
}

export function classifyAuthoredTopic(question: string): AuthoredTopic | null {
  const text = normalized(question);
  const ranked = TOPIC_INDEX.map((topic) => ({
    topic,
    score: topic.matchers.reduce(
      (sum, matcher) => sum + (containsPhrase(text, matcher.phrase) ? matcher.weight : 0),
      0,
    ),
  })).sort((left, right) => right.score - left.score);

  const best = ranked[0];
  const runnerUp = ranked[1];
  if (!best || best.score < 4) return null;
  if (runnerUp && best.score === runnerUp.score) return null;
  return best.topic;
}
