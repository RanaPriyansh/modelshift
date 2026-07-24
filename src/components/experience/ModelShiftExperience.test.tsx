// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY } from "@/src/lib/forge-evidence";
import type { WorldSessionCheckpointIdentity } from "@/src/lib/forge-continuity";

import { ModelShiftExperience } from "./ModelShiftExperience";

const CHECKPOINT_IDENTITY: WorldSessionCheckpointIdentity = {
  sessionId: "study-session.force-resume-test",
  worldId: "world.force-and-motion",
  worldVersion: "1.0.0",
};

const CHECKPOINT_STORAGE_KEY = [
  "forge.world-session-checkpoint:v1",
  CHECKPOINT_IDENTITY.sessionId,
  CHECKPOINT_IDENTITY.worldId,
  CHECKPOINT_IDENTITY.worldVersion,
].join(":");

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

async function advanceToProof(): Promise<void> {
  fireEvent.click(screen.getByRole("radio", { name: /Only the friction track/ }));
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
  await advanceToProof();
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
  it("keeps learner wording on-device and opens the deterministic authored compiler", async () => {
    installMotionStubs();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ModelShiftExperience />);

    await reachCompiler();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("stage-interpret-loading")).toBeNull();
    expect(screen.getAllByTestId("compiler-reading")).toHaveLength(2);
    expect(screen.getByText("Motion needs an ongoing push")).toBeTruthy();
    expect(screen.getByText("Force changes velocity")).toBeTruthy();
    expect(screen.getByText(/Raw wording stays on this device/i)).toBeTruthy();
  });

  it("records the disabled-provider authored representation once and renders exactly two distinct compiler readings", async () => {
    installMotionStubs();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const onRuntimeReceipt = vi.fn();
    render(<ModelShiftExperience onRuntimeReceipt={onRuntimeReceipt} />);

    await reachCompiler();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("compiler-reading")).toHaveLength(2);
    expect(screen.getByText("Motion needs an ongoing push")).toBeTruthy();
    expect(screen.getByText("Force changes velocity")).toBeTruthy();
    fireEvent.click(screen.getByText("How this test was chosen"));
    expect(screen.getByText("Deterministic fallback (disabled)")).toBeTruthy();
    await advanceToProof();
    await completeProof();

    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(1));
    const receipt = onRuntimeReceipt.mock.calls[0]?.[0];
    expect(receipt).not.toHaveProperty("validatorInput");
    expect(receipt).toMatchObject({
      schemaVersion: "1.1.0",
      cognitiveSupport: [{
        actionId: "action.force-and-motion.interpretation.fallback.disabled",
        source: "authored",
        tier: "representation",
        policyId: "policy.force-and-motion.interpretation.v1",
        providerId: null,
        modelId: null,
        fallbackReason: "disabled",
      }],
      validator: { outcome: "pass" },
      authority: { proofAuthority: "honour_based", persistence: "not_persisted", isDurable: false },
      sourceProvenanceStatus: "incomplete",
    });
    expect(JSON.stringify(receipt)).not.toContain("The velocity becomes flat");
    const ledger = JSON.parse(localStorage.getItem(DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY) ?? "{}");
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0].id).toBe(`proof.${receipt.attemptId}`);
    expect(ledger.entries[0].assistance).toEqual([{
      kind: "authored_representation",
      sourceId: "action.force-and-motion.interpretation.fallback.disabled",
    }]);
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
    await advanceToProof();
    await completeProof();
    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(1));
    const firstReceipt = onRuntimeReceipt.mock.calls[0]?.[0];
    expect(firstReceipt.cognitiveSupport).toEqual([{
      actionId: "action.force-and-motion.interpretation.fallback.ambiguous-input",
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
      { kind: "authored_representation", sourceId: "action.force-and-motion.interpretation.fallback.ambiguous-input" },
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

  it("never creates an interpretation request that could outlive the component", async () => {
    installMotionStubs();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const first = render(<ModelShiftExperience />);

    await reachCompiler();
    first.unmount();
    render(<ModelShiftExperience />);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("stage-predict")).toBeTruthy();
    expect(screen.queryByTestId("stage-interpret")).toBeNull();
  });

  it("restores a path-backed in-progress attempt by replaying accepted events and preserving the local draft", async () => {
    installMotionStubs();
    const first = render(
      <ModelShiftExperience checkpointIdentity={CHECKPOINT_IDENTITY} />,
    );
    await waitFor(() => expect(screen.getByTestId("stage-predict")).toBeTruthy());

    fireEvent.click(screen.getByRole("radio", { name: "Gradually slows" }));
    fireEvent.click(screen.getByTestId("commit-prediction"));
    const explanation = await screen.findByRole("textbox", {
      name: /Your explanation/,
    });
    fireEvent.change(explanation, {
      target: { value: "My unfinished explanation stays on this device." },
    });
    await waitFor(() => {
      expect(localStorage.getItem(CHECKPOINT_STORAGE_KEY)).toContain(
        "My unfinished explanation stays on this device.",
      );
    });
    first.unmount();
    render(<ModelShiftExperience checkpointIdentity={CHECKPOINT_IDENTITY} />);

    const restored = await screen.findByRole("textbox", {
      name: /Your explanation/,
    });
    expect((restored as HTMLTextAreaElement).value).toBe(
      "My unfinished explanation stays on this device.",
    );
    expect(screen.queryByTestId("stage-predict")).toBeNull();
  });

  it("leaves a malformed checkpoint untouched until the learner explicitly discards it", async () => {
    installMotionStubs();
    const malformed = "{\"schemaVersion\":\"tampered\"}";
    localStorage.setItem(CHECKPOINT_STORAGE_KEY, malformed);
    const onCheckpointError = vi.fn();

    render(
      <ModelShiftExperience
        checkpointIdentity={CHECKPOINT_IDENTITY}
        onCheckpointError={onCheckpointError}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "This saved session cannot be opened safely",
      }),
    ).toBeTruthy();
    expect(localStorage.getItem(CHECKPOINT_STORAGE_KEY)).toBe(malformed);
    expect(onCheckpointError).toHaveBeenCalledWith("malformed");

    fireEvent.click(
      screen.getByRole("button", {
        name: /Discard this checkpoint and start fresh/,
      }),
    );
    await waitFor(() => expect(screen.getByTestId("stage-predict")).toBeTruthy());
    expect(localStorage.getItem(CHECKPOINT_STORAGE_KEY)).not.toBe(malformed);
  });

  it("does not persist a session checkpoint for a direct guest World", () => {
    installMotionStubs();
    render(<ModelShiftExperience />);
    fireEvent.click(screen.getByRole("radio", { name: "Gradually slows" }));
    fireEvent.click(screen.getByTestId("commit-prediction"));

    expect(
      Object.keys(localStorage).filter((key) =>
        key.startsWith("forge.world-session-checkpoint:")),
    ).toHaveLength(0);
  });
});
