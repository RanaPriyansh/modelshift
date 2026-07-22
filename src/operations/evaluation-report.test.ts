import { describe, expect, it } from "vitest";

import { INTERPRETATION_FIXTURES } from "../../evals/fixtures";
import { buildOfflineRegressionReport, renderEvaluationMarkdown } from "../../scripts/ops/evaluation-report";

const SHA = "0123456789abcdef0123456789abcdef01234567";
describe("offline evaluation regression report", () => {
  it("passes the checked-in authored baseline without retaining learner text", () => {
    const report = buildOfflineRegressionReport({ generatedAt: "2026-07-22T00:00:00.000Z", gitSha: SHA });
    expect(report.offline_regression_status).toBe("pass");
    expect(report.dataset).toMatchObject({ fixture_count: 54, clear_fixture_count: 38, ambiguous_fixture_count: 16 });
    expect(report.metrics.clear_primary_agreement_count).toBe(29);
    expect(report.execution_boundary).toEqual({ model_calls: false, network_access: false, learner_text_persisted: false, per_fixture_text_in_report: false });
    expect(report.live_model_evaluation.status).toBe("not_evaluated");
    expect(JSON.stringify(report)).not.toContain(INTERPRETATION_FIXTURES[0]?.explanation);
  });
  it("fails closed for an incomplete corpus and labels live evaluation honestly", () => {
    expect(buildOfflineRegressionReport({ fixtures: INTERPRETATION_FIXTURES.slice(0, 10), gitSha: SHA }).offline_regression_status).toBe("fail");
    expect(renderEvaluationMarkdown(buildOfflineRegressionReport({ gitSha: SHA }))).toContain("Live model evaluation is **NOT_EVALUATED**");
  });
});
