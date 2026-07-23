// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EvidencePrototype, TrailPrototype } from "./ForgePrototypePages";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("FORGE local evidence copy", () => {
  it("describes Trail records as browser-local and storage-dependent", () => {
    render(<TrailPrototype />);

    expect(screen.getByText(/When storage is available, browser-local records can retain bounded outcomes/)).toBeInTheDocument();
    expect(screen.queryByText(/Completed proof outcomes are retained only in this browser/)).not.toBeInTheDocument();
  });

  it("keeps its illustrative evidence claim tied to one protected local attempt", () => {
    render(<EvidencePrototype />);

    expect(screen.getByText(/This browser recorded one protected transfer attempt that matched this World’s current criteria/)).toBeInTheDocument();
    expect(screen.queryByText(/Independent transfer was observed once/)).not.toBeInTheDocument();
    expect(screen.queryByText(/independent evidence/i)).not.toBeInTheDocument();
  });
});
