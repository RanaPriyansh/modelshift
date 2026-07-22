// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY } from "@/src/lib/forge-evidence";

import { ModelShiftExperience } from "./ModelShiftExperience";

const modelInterpretation = {
  schema_version: "1.0",
  source: "model",
  providerId: "openai",
  modelId: "gpt-5.6-sol",
  policyId: "policy.force-and-motion.interpretation.v1",
  hypotheses: [{
    id: "force_equals_velocity",
    support: "high",
    evidence_spans: ["push sets the speed"],
    rationale: "The explanation links force to current speed.",
  }],
  missing_distinctions: ["zero_net_force_means_zero_acceleration"],
  recommended_probe_id: "brief_vs_continuous_force",
  recommended_level_1_question_id: "compare_force_and_velocity_graphs",
  abstain: false,
  abstain_reason: "none",
} as const;

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

function installMotionStubs(): void {
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
}

async function reachCompiler({ fallback = false }: { readonly fallback?: boolean } = {}): Promise<void> {
  fireEvent.click(screen.getByRole("radio", { name: "Gradually slows" }));
  fireEvent.click(screen.getByTestId("commit-prediction"));
  if (fallback) {
    fireEvent.click(screen.getByRole("button", { name: /genuinely don't know/i }));
  } else {
    fireEvent.change(screen.getByRole("textbox", { name: /Your explanation/ }), {
      target: { value: "A push sets the speed, so motion needs that push." },
    });
    fireEvent.click(screen.getByTestId("submit-explanation"));
  }
  await waitFor(() => expect(screen.getByTestId("stage-interpret")).toBeTruthy());
}

async function advanceToProof({ fallback = false }: { readonly fallback?: boolean } = {}): Promise<void> {
  fireEvent.click(screen.getByRole("radio", { name: fallback ? /Only the friction track/ : /It stays constant/ }));
  fireEvent.click(screen.getByTestId("commit-probe-prediction"));
  fireEvent.click(screen.getByTestId("run-experiment"));
  fireEvent.change(screen.getByRole("textbox", { name: /What do you notice after the push ends/ }), {
    target: { value: "The force ends, so the force-free velocity does not change." },
  });
  fireEvent.click(screen.getByTestId("submit-reflection"));
  fireEvent.change(screen.getByRole("textbox", { name: /Your causal rule/ }), {
    target: { value: "Net force changes acceleration, so zero net force does not change existing velocity." },
  });
  fireEvent.click(screen.getByTestId("enter-proof"));
  await waitFor(() => expect(screen.getByTestId("stage-proof")).toBeTruthy());
}

async function reachProof({ fallback = false }: { readonly fallback?: boolean } = {}): Promise<void> {
  await reachCompiler({ fallback });
  await advanceToProof({ fallback });
}

async function completeProof(): Promise<void> {
  fireEvent.click(screen.getByRole("radio", { name: /stays constant above zero/i }));
  fireEvent.change(screen.getByRole("textbox", { name: /Explain your choice in one or two sentences/ }), {
    target: { value: "The velocity becomes flat once the force reaches zero." },
  });
  fireEvent.click(screen.getByTestId("submit-proof"));
  await waitFor(() => expect(screen.getByTestId("stage-result")).toBeTruthy());
}

describe("ModelShiftExperience runtime migration", () => {
  it.each([
    ["empty", {}],
    ["incomplete", { schema_version: "1.0", source: "model" }],
  ])("routes an %s successful API payload through authored fallback", async (_label, payload) => {
    installMotionStubs();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => payload })));
    render(<ModelShiftExperience />);

    await reachCompiler();
    expect(screen.queryByTestId("stage-interpret-loading")).toBeNull();
    expect(screen.getAllByTestId("compiler-reading")).toHaveLength(2);
    expect(screen.getByText("Motion needs an ongoing push")).toBeTruthy();
    expect(screen.getByText("Force changes velocity")).toBeTruthy();
  });

  it("uses the runtime receipt once for model support and renders exactly two distinct compiler readings", async () => {
    installMotionStubs();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => modelInterpretation })));
    const onRuntimeReceipt = vi.fn();
    render(<ModelShiftExperience onRuntimeReceipt={onRuntimeReceipt} />);

    await reachCompiler();
    expect(screen.getAllByTestId("compiler-reading")).toHaveLength(2);
    expect(screen.getByText("Force sets the current speed")).toBeTruthy();
    expect(screen.getByText("Motion needs an ongoing push")).toBeTruthy();
    fireEvent.click(screen.getByText("How this test was chosen"));
    expect(screen.getByText("openai / gpt-5.6-sol, after schema and semantic validation")).toBeTruthy();
    await advanceToProof();
    await completeProof();

    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(1));
    const receipt = onRuntimeReceipt.mock.calls[0]?.[0];
    expect(receipt).toMatchObject({
      schemaVersion: "1.0.2",
      cognitiveSupport: [{
        actionId: "action.force-and-motion.interpretation",
        source: "model",
        tier: "representation",
        policyId: "policy.force-and-motion.interpretation.v1",
        providerId: "openai",
        modelId: "gpt-5.6-sol",
        fallbackReason: null,
      }],
      validator: { outcome: "pass" },
      authority: { proofAuthority: "honour_based", persistence: "not_persisted", isDurable: false },
      sourceProvenanceStatus: "incomplete",
    });
    expect(JSON.stringify(receipt)).not.toContain("The velocity becomes flat");
    const ledger = JSON.parse(localStorage.getItem(DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY) ?? "{}");
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0].id).toBe(`proof.${receipt.attemptId}`);
    expect(ledger.entries[0].assistance).toEqual([{ kind: "model_interpretation", sourceId: "action.force-and-motion.interpretation" }]);
    expect(JSON.stringify(ledger)).not.toContain("The velocity becomes flat");
    const receiptFacts = screen.getByTestId("force-runtime-receipt").textContent;
    expect(receiptFacts).toContain("honour_based");
    expect(receiptFacts).toContain("not_persisted");
    expect(receiptFacts).toContain("incomplete legacy metadata");
  });

  it("records authored fallback representation once, renders the deterministic pair, and resets the receipt guard", async () => {
    installMotionStubs();
    const onRuntimeReceipt = vi.fn();
    render(<ModelShiftExperience onRuntimeReceipt={onRuntimeReceipt} />);

    await reachCompiler({ fallback: true });
    expect(screen.getAllByTestId("compiler-reading")).toHaveLength(2);
    expect(screen.getByText("Motion needs an ongoing push")).toBeTruthy();
    expect(screen.getByText("Force changes velocity")).toBeTruthy();
    await advanceToProof({ fallback: true });
    await completeProof();
    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(1));
    const firstReceipt = onRuntimeReceipt.mock.calls[0]?.[0];
    expect(firstReceipt.cognitiveSupport).toEqual([{
      actionId: "action.force-and-motion.interpretation",
      stage: "interpret_two_readings",
      source: "authored",
      tier: "representation",
      policyId: "policy.force-and-motion.interpretation.v1",
      providerId: null,
      modelId: null,
      fallbackReason: "ambiguous_input",
    }]);

    let ledger = JSON.parse(localStorage.getItem(DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY) ?? "{}");
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0].assistance).toEqual([
      { kind: "authored_representation", sourceId: "action.force-and-motion.interpretation" },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Start a fresh session" }));
    expect(screen.getByTestId("stage-predict")).toBeTruthy();
    await reachProof({ fallback: true });
    await completeProof();
    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(2));
    const secondReceipt = onRuntimeReceipt.mock.calls[1]?.[0];
    expect(secondReceipt.attemptId).not.toBe(firstReceipt.attemptId);
    ledger = JSON.parse(localStorage.getItem(DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY) ?? "{}");
    expect(ledger.entries).toHaveLength(2);
  });

  it("uses instance-safe IDs and radio names, then moves focus to the runtime-opened stage", () => {
    installMotionStubs();
    const { container } = render(<><ModelShiftExperience /><ModelShiftExperience /></>);
    const ids = [...container.querySelectorAll("input[id]")].map((input) => input.id);
    const names = [...new Set([...container.querySelectorAll("input[type=radio]")].map((input) => input.getAttribute("name")))];
    const mains = [...container.querySelectorAll("main[id]")];
    const mainIds = mains.map((main) => main.id);
    const skipTargets = screen.getAllByRole("link", { name: "Skip to the experiment" }).map((link) => link.getAttribute("href"));
    expect(new Set(ids).size).toBe(ids.length);
    expect(names).toHaveLength(2);
    expect(new Set(mainIds).size).toBe(2);
    expect(skipTargets).toEqual(mainIds.map((id) => `#${id}`));

    cleanup();
    render(<ModelShiftExperience />);
    fireEvent.click(screen.getByRole("radio", { name: "Gradually slows" }));
    fireEvent.click(screen.getByTestId("commit-prediction"));
    expect(document.activeElement?.tagName).toBe("MAIN");
  });

  it("aborts an outstanding interpretation on unmount and ignores its stale response", async () => {
    installMotionStubs();
    type MockResponse = { readonly ok: true; readonly json: () => Promise<typeof modelInterpretation> };
    let resolveFetch!: (response: MockResponse) => void;
    const pendingFetch = new Promise<MockResponse>((resolve) => { resolveFetch = resolve; });
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<MockResponse>>();
    fetchMock.mockReturnValue(pendingFetch);
    vi.stubGlobal("fetch", fetchMock);
    const first = render(<ModelShiftExperience />);

    fireEvent.click(screen.getByRole("radio", { name: "Gradually slows" }));
    fireEvent.click(screen.getByTestId("commit-prediction"));
    fireEvent.change(screen.getByRole("textbox", { name: /Your explanation/ }), {
      target: { value: "A push sets the speed, so motion needs that push." },
    });
    fireEvent.click(screen.getByTestId("submit-explanation"));
    await waitFor(() => expect(screen.getByTestId("stage-interpret-loading")).toBeTruthy());
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;

    first.unmount();
    expect(signal?.aborted).toBe(true);
    render(<ModelShiftExperience />);
    await act(async () => {
      resolveFetch({ ok: true, json: async () => modelInterpretation });
      await pendingFetch;
      await Promise.resolve();
    });

    expect(screen.getByTestId("stage-predict")).toBeTruthy();
    expect(screen.queryByTestId("stage-interpret")).toBeNull();
  });
});
