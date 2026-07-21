import { describe, expect, it } from "vitest";

import { INTERPRETATION_FIXTURES } from "../../evals/fixtures";
import { buildOfflineRegressionReport, renderEvaluationMarkdown } from "../../scripts/ops/evaluation-report";

const SHA = "0123456789abcdef0123456789abcdef01234567";

describe("offline evaluation regression report", () => {
  it("passes the checked-in deterministic baseline without retaining explanation text", () => {
    const report = buildOfflineRegressionReport({
      generatedAt: "2026-07-22T00:00:00.000Z",
      gitSha: SHA,
    });

    expect(report.offline_regression_status).toBe("pass");
    expect(report.dataset.fixture_count).toBe(54);
    expect(report.metrics.clear_primary_agreement_count).toBe(29);
    expect(report.execution_boundary).toEqual({
      model_calls: false,
      network_access: false,
      learner_text_persisted: false,
      per_fixture_text_in_report: false,
    });
    expect(report.live_model_evaluation.status).toBe("not_evaluated");
    expect(JSON.stringify(report)).not.toContain(INTERPRETATION_FIXTURES[0]?.explanation);
  });

  it("fails closed when the dataset is incomplete", () => {
    const report = buildOfflineRegressionReport({ fixtures: INTERPRETATION_FIXTURES.slice(0, 10), gitSha: SHA });

    expect(report.offline_regression_status).toBe("fail");
    expect(report.gates.find((gate) => gate.id === "fixture_count")?.status).toBe("fail");
  });

  it("labels the scope accurately in the human-readable report", () => {
    const markdown = renderEvaluationMarkdown(buildOfflineRegressionReport({ gitSha: SHA }));

    expect(markdown).toContain("Live model evaluation is **NOT_EVALUATED**");
    expect(markdown).not.toContain(INTERPRETATION_FIXTURES[1]?.explanation);
  });
});
