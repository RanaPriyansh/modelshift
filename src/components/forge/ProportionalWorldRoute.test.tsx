// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BoundedLocalWorldRuntimeReceipt } from "@/src/forge/world-runtime";

const mocked = vi.hoisted(() => ({
  recordWorldRuntimeReceipt: vi.fn(),
  capturedProps: [] as Array<{ onRuntimeReceipt?: (receipt: BoundedLocalWorldRuntimeReceipt) => void; onEvidence?: unknown }>,
}));

vi.mock("@/src/lib/forge-evidence", () => ({ recordWorldRuntimeReceipt: mocked.recordWorldRuntimeReceipt }));
vi.mock("@/src/components/worlds/proportional-reasoning", () => ({
  ProportionalReasoningWorld: (props: { onRuntimeReceipt?: (receipt: BoundedLocalWorldRuntimeReceipt) => void; onEvidence?: unknown }) => {
    mocked.capturedProps.push(props);
    return <button type="button" onClick={() => props.onRuntimeReceipt?.({ attemptId: "attempt.route-receipt" } as BoundedLocalWorldRuntimeReceipt)}>emit receipt</button>;
  },
}));

import { ProportionalWorldRoute } from "./ProportionalWorldRoute";

describe("ProportionalWorldRoute", () => {
  it("projects only the runtime receipt callback and exposes no domain evidence writer", () => {
    render(<ProportionalWorldRoute audience="teen" />);
    fireEvent.click(screen.getByRole("button", { name: "emit receipt" }));
    expect(mocked.recordWorldRuntimeReceipt).toHaveBeenCalledWith({ attemptId: "attempt.route-receipt" });
    expect(mocked.capturedProps.at(-1)?.onEvidence).toBeUndefined();
  });
});
