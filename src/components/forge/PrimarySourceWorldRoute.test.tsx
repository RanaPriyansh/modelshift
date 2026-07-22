// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BoundedLocalWorldRuntimeReceipt } from "@/src/forge/world-runtime/protocol";
import type { WorldRuntimeReceiptRecording } from "@/src/lib/forge-evidence";

const emittedRecording: WorldRuntimeReceiptRecording = {
  receipt: { attemptId: "attempt.primary-route-receipt" } as BoundedLocalWorldRuntimeReceipt,
  validatorInput: { assignments: {} },
};

const mocked = vi.hoisted(() => ({
  recordWorldRuntimeReceipt: vi.fn(),
  capturedProps: [] as Array<{
    onRuntimeReceipt?: (recording: WorldRuntimeReceiptRecording) => void;
    onEvidence?: unknown;
  }>,
}));

vi.mock("@/src/lib/forge-evidence", () => ({ recordWorldRuntimeReceipt: mocked.recordWorldRuntimeReceipt }));
vi.mock("@/src/components/worlds/primary-source-reasoning", () => ({
  PrimarySourceReasoningWorld: (props: {
    onRuntimeReceipt?: (recording: WorldRuntimeReceiptRecording) => void;
    onEvidence?: unknown;
  }) => {
    mocked.capturedProps.push(props);
    return (
      <button
        type="button"
        onClick={() => props.onRuntimeReceipt?.(emittedRecording)}
      >
        emit primary receipt
      </button>
    );
  },
}));

import { PrimarySourceWorldRoute } from "./PrimarySourceWorldRoute";

describe("PrimarySourceWorldRoute", () => {
  it("projects only the runtime receipt callback and exposes no domain evidence writer", () => {
    render(<PrimarySourceWorldRoute />);
    fireEvent.click(screen.getByRole("button", { name: "emit primary receipt" }));
    expect(mocked.recordWorldRuntimeReceipt).toHaveBeenCalledWith(emittedRecording);
    expect(mocked.capturedProps.at(-1)?.onEvidence).toBeUndefined();
  });
});
