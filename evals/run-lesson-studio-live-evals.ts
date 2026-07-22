import { generateLessonDraft } from "../src/lib/lesson-studio/providers.server";

import {
  resolveLessonStudioLiveEvalConfig,
  runLessonStudioLiveEval,
} from "./lesson-studio-live-eval-core";

async function main() {
  const config = resolveLessonStudioLiveEvalConfig(process.env);
  const report = await runLessonStudioLiveEval(config, generateLessonDraft);
  // The report is redacted by construction. Do not add prompts, drafts, keys, or provider bodies here.
  console.log(JSON.stringify(report));
  if (report.status !== "PASSED") process.exitCode = 2;
}

void main();
