// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BoundedLocalWorldRuntimeReceipt } from "@/src/forge/world-runtime";
import type { WorldRuntimeReceiptRecording } from "@/src/lib/forge-evidence";

const emittedRecording: WorldRuntimeReceiptRecording = {
  receipt: { attemptId: "attempt.route-receipt" } as BoundedLocalWorldRuntimeReceipt,
  validatorInput: { choiceId: "32_km" },
};

const mocked = vi.hoisted(() => ({
  recordWorldRuntimeReceipt: vi.fn(),
  capturedProps: [] as Array<{ onRuntimeReceipt?: (recording: WorldRuntimeReceiptRecording) => void; onEvidence?: unknown }>,
}));

vi.mock("@/src/lib/forge-evidence", () => ({ recordWorldRuntimeReceipt: mocked.recordWorldRuntimeReceipt }));
vi.mock("@/src/components/worlds/proportional-reasoning", () => ({
  ProportionalReasoningWorld: (props: { onRuntimeReceipt?: (recording: WorldRuntimeReceiptRecording) => void; onEvidence?: unknown }) => {
    mocked.capturedProps.push(props);
    return <button type="button" onClick={() => props.onRuntimeReceipt?.(emittedRecording)}>emit receipt</button>;
  },
}));

import { ProportionalWorldRoute } from "./ProportionalWorldRoute";

describe("ProportionalWorldRoute", () => {
  it("projects only the runtime receipt callback and exposes no domain evidence writer", () => {
    render(<ProportionalWorldRoute audience="teen" />);
    fireEvent.click(screen.getByRole("button", { name: "emit receipt" }));
    expect(mocked.recordWorldRuntimeReceipt).toHaveBeenCalledWith(emittedRecording);
    expect(mocked.capturedProps.at(-1)?.onEvidence).toBeUndefined();
  });
});
