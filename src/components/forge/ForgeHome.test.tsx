// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ForgePlanContract } from "@/src/lib/forge-planner";

import { ForgeHome } from "./ForgeHome";

const REFUSAL = {
  contractKind: "refusal",
  message: "This request needs a different boundary.",
} as unknown as ForgePlanContract;

function planResponse(contract: ForgePlanContract) {
  return { ok: true, json: async () => contract } as Response;
}

function submitQuestion() {
  fireEvent.change(screen.getByRole("textbox", { name: /^Your question/ }), {
    target: { value: "Help me understand force and motion." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Shape my first move" }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ForgeHome planner client", () => {
  it("aborts a timed-out request and offers a retry without saving the question", async () => {
    vi.useFakeTimers();
    let resolveFirst!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const fetchMock = vi.fn()
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce(planResponse(REFUSAL));
    vi.stubGlobal("fetch", fetchMock);
    render(<ForgeHome />);

    submitQuestion();
    const signal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal | undefined;
    await act(async () => { await vi.advanceTimersByTimeAsync(8_000); });

    expect(signal?.aborted).toBe(true);
    expect(screen.getByRole("alert")).toHaveTextContent("The path request took too long. Your question was not saved.");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await Promise.resolve();
    });
    expect(screen.getByTestId("forge-plan-refusal")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => { resolveFirst(planResponse(REFUSAL)); });
    expect(screen.queryByTestId("forge-plan-refusal")).toBeInTheDocument();
  });

  it("aborts an active request on unmount without writing late planner state", async () => {
    let resolveFetch!: (response: Response) => void;
    const pendingResponse = new Promise<Response>((resolve) => { resolveFetch = resolve; });
    const fetchMock = vi.fn().mockReturnValue(pendingResponse);
    vi.stubGlobal("fetch", fetchMock);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rendered = render(<ForgeHome />);

    submitQuestion();
    const signal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal | undefined;
    rendered.unmount();
    expect(signal?.aborted).toBe(true);

    await act(async () => { resolveFetch(planResponse(REFUSAL)); });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("ignores a response that arrives after timeout recovery", async () => {
    vi.useFakeTimers();
    let resolveFetch!: (response: Response) => void;
    const pendingResponse = new Promise<Response>((resolve) => { resolveFetch = resolve; });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pendingResponse));
    render(<ForgeHome />);

    submitQuestion();
    await act(async () => { await vi.advanceTimersByTimeAsync(8_000); });
    expect(screen.getByRole("alert")).toHaveTextContent("The path request took too long.");

    await act(async () => { resolveFetch(planResponse(REFUSAL)); });
    expect(screen.queryByTestId("forge-plan-refusal")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("The path request took too long.");
  });
});
