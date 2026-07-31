// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { universityResearchReadinessFixtureScenarios } from "@/app/internal/university-research-readiness/research-readiness-fixture.server";
import { universitySemesterLoopFixtureScenarios } from "@/app/internal/university-semester-loop/semester-loop-fixture.server";
import { UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS } from "@/src/forge/university-research-artifacts";
import { canonicalJson, sha256Digest } from "@/src/forge/events";
import { projectUniversityResearchReadiness } from "@/src/forge/university-research-operations";

import {
  UniversityResearchReadinessUnavailable,
  UniversityResearchReadinessWorkspace,
} from "./UniversityResearchReadinessWorkspace";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderWorkspace() {
  const scenarios = await universityResearchReadinessFixtureScenarios();
  return {
    scenarios,
    ...render(<UniversityResearchReadinessWorkspace scenarios={scenarios} />),
  };
}

describe("UniversityResearchReadinessWorkspace", () => {
  it("leads with the permission boundary and five ordered readiness gates", async () => {
    await renderWorkspace();

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Rehearsal is not permission.",
    })).toBeInTheDocument();
    expect(screen.getByRole("heading", {
      level: 2,
      name: "Repair the protocol before any rehearsal.",
    })).toBeInTheDocument();

    const readiness = screen.getByRole("region", {
      name: "Research readiness gates",
    });
    expect(readiness).toHaveTextContent("Protocol");
    expect(readiness).toHaveTextContent("Artifact comparator");
    expect(readiness).toHaveTextContent("Research approval refs");
    expect(readiness).toHaveTextContent("Operator");
    expect(readiness).toHaveTextContent("Plan preflight");
    expect(readiness.querySelectorAll("li")).toHaveLength(5);
    expect(readiness.querySelector('[data-tone="stopped"]')).toHaveTextContent(
      "Protocol",
    );
    expect(readiness).toHaveTextContent("Protocol stopped");
    expect(readiness).toHaveTextContent("Not evaluated");
  });

  it("maps all five fixture projections to their exact visible status", async () => {
    const { container } = await renderWorkspace();
    const cases = [
      ["Invalid protocol", "draft_invalid", "Repair the protocol before any rehearsal."],
      ["Missing approval", "approval_required", "Approval is missing. Stop here."],
      ["Operator gap", "operator_gap", "Every required role needs a fixture placeholder."],
      ["Comparator mismatch", "substitute_mismatch", "The comparator must answer the same question."],
      ["Synthetic plan coherent", "synthetic_plan_coherent", "The synthetic preflight plan is internally coherent."],
    ] as const;

    for (const [radio, status, heading] of cases) {
      fireEvent.click(screen.getByRole("radio", { name: radio }));
      expect(container.querySelector("article")).toHaveAttribute(
        "data-status",
        status,
      );
      expect(screen.getByRole("heading", {
        level: 2,
        name: heading,
      })).toBeInTheDocument();
    }
  });

  it("shows separate protocol, approval, operator, comparator, and sample facts", async () => {
    await renderWorkspace();
    fireEvent.click(screen.getByRole("radio", {
      name: "Synthetic plan coherent",
    }));

    expect(screen.getByText(
      /university-observation-protocol\.phase-minus-one/,
    )).toBeInTheDocument();
    expect(screen.getByText("4 of 4")).toBeInTheDocument();
    expect(screen.getByText("6 of 6 required roles")).toBeInTheDocument();
    expect(screen.getByText(
      "Shared information and task manifest aligns; candidate/substitute rendering not checked",
    )).toBeInTheDocument();
    expect(screen.getByText(
      "Future adult-only target: 5-10; current fixture: no people",
    )).toBeInTheDocument();
    expect(screen.getByText("Fixture references bound")).toBeInTheDocument();
    expect(screen.getByText("Fixture roles represented")).toBeInTheDocument();
    expect(screen.getByText("Plan coherent")).toBeInTheDocument();
    expect(screen.getAllByText("Not allowed").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText(/does not establish approval/)).toBeInTheDocument();
  });

  it("does not present downstream facts as evaluated after a protocol stop", async () => {
    await renderWorkspace();

    expect(screen.getAllByText("Supplied, not evaluated")).toHaveLength(5);
    expect(screen.queryByText("4 of 4")).not.toBeInTheDocument();
    expect(screen.queryByText("6 of 6 required roles")).not.toBeInTheDocument();
    expect(screen.queryByText(
      "Shared information and task manifest aligns; candidate/substitute rendering not checked",
    )).not.toBeInTheDocument();
    expect(screen.getByText(/\(supplied, stopped\)$/)).toBeInTheDocument();
  });

  it("distinguishes structurally unexposed facts from supplied semantic drift", async () => {
    const projection = await projectUniversityResearchReadiness({
      schemaVersion: "university-research-readiness-request.v1",
    });
    render(
      <UniversityResearchReadinessWorkspace
        scenarios={[{
          id: "invalid-protocol",
          label: "Invalid protocol",
          projection,
          artifactProjection: null,
        }]}
      />,
    );

    expect(screen.getAllByText("Not exposed")).toHaveLength(7);
    expect(screen.queryByText("Supplied, not evaluated")).not.toBeInTheDocument();
    expect(screen.getByText(/Invalid input/)).toBeInTheDocument();
  });

  it("announces only a concise status update when the selected scenario changes", async () => {
    await renderWorkspace();

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(
      "Protocol stopped. Repair the protocol before any rehearsal.",
    );
    expect(status).not.toHaveTextContent("Declared approvals");

    fireEvent.click(screen.getByRole("radio", {
      name: "Synthetic plan coherent",
    }));
    expect(status).toHaveTextContent(
      "Caller-asserted plan coherent. The synthetic preflight plan is internally coherent.",
    );
    expect(status).not.toHaveTextContent("Future adult-only target");
  });

  it("uses native local controls without action routes or browser effects", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    const writeText = vi.fn().mockResolvedValue(undefined);
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "clipboard",
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    try {
      const { container } = await renderWorkspace();
      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(5);
      radios.forEach((radio) => {
        expect(radio).not.toHaveAttribute("tabindex", "-1");
      });

      fireEvent.click(screen.getByRole("radio", {
        name: "Synthetic plan coherent",
      }));
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(storageSpy).not.toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
      expect(container.textContent).not.toContain("—");
      expect(container.textContent).not.toContain("–");
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "clipboard");
      }
    }
  });

  it("shows exact authored identities while keeping review and approval open", async () => {
    const { scenarios } = await renderWorkspace();
    fireEvent.click(screen.getByRole("radio", {
      name: "Synthetic plan coherent",
    }));
    const artifact = screen.getByRole("region", {
      name: "Artifact evidence stops before review.",
    });
    const authored = scenarios.find(
      (scenario) => scenario.id === "synthetic-plan-coherent",
    )?.artifactProjection;

    expect(artifact).toHaveTextContent(
      "The manifests match mechanically. Independent review is still required.",
    );
    expect(artifact).toHaveTextContent("Requested; not completed");
    expect(artifact).toHaveTextContent("Artifact approval");
    expect(artifact).toHaveTextContent("Not established");
    expect(artifact).toHaveTextContent("All six gates remain open");
    expect(artifact).toHaveTextContent(
      "candidate build digest remains caller asserted and unverified",
    );
    expect(artifact).toHaveTextContent("Substitute manifest digest");
    expect(artifact).toHaveTextContent("Supplied renderer binding digest");
    expect(artifact).toHaveTextContent(
      "Expected renderer descriptor digest",
    );
    expect(artifact).toHaveTextContent("Declared checklist digest");
    expect(artifact).toHaveTextContent(
      "Expected review checklist digest",
    );
    expect(artifact).toHaveTextContent("Declared delivery contract");
    expect(artifact).toHaveTextContent(
      "Static local keyboard packet; not rendered",
    );
    expect(artifact).not.toHaveTextContent("Compiled artifact digest");
    expect(artifact).toHaveTextContent("Candidate rendered parity");
    expect(artifact).toHaveTextContent("Substitute rendered parity");
    expect(artifact).toHaveTextContent("Not rendered");
    expect(artifact.textContent).not.toContain("...");
    expect(artifact.textContent).not.toContain("Participant ready");
    expect(artifact.textContent).not.toContain("Rehearsal ready");

    const exactDigests = [
      authored?.artifacts?.packP.digest,
      authored?.artifacts?.packQ.digest,
      authored?.artifacts?.substitute.rendererBindingDigest,
      authored?.artifacts?.substitute.templateDigest,
      authored?.artifacts?.substitute.artifactDigest,
      authored?.artifacts?.moderatorPacket.digest,
      authored?.artifacts?.independentReview.checklistDigest,
      authored?.artifacts?.independentReview.envelopeDigest,
    ].filter((value): value is string => Boolean(value));
    expect(exactDigests).toHaveLength(8);
    exactDigests.forEach((digest) => expect(artifact).toHaveTextContent(digest));
  });

  it("renders every exact scenario identity in protocol order with no inferred pairing", async () => {
    const { scenarios } = await renderWorkspace();
    fireEvent.click(screen.getByRole("radio", {
      name: "Synthetic plan coherent",
    }));
    const ledger = screen.getByRole("region", {
      name: "Scenario identity ledger",
    });
    const rows = Array.from(ledger.querySelectorAll(":scope > ol > li"));
    const authored = scenarios.find(
      (scenario) => scenario.id === "synthetic-plan-coherent",
    )?.artifactProjection?.artifacts;

    expect(rows).toHaveLength(7);
    expect(rows.map((row) => row.querySelector("code")?.textContent)).toEqual([
      "ready",
      "source-review",
      "capacity-break",
      "tight-window",
      "world-changed",
      "path-complete",
      "path-blocked",
    ]);
    rows.forEach((row, index) => {
      expect(row).toHaveTextContent("Pack P scenario digest");
      expect(row).toHaveTextContent("Pack Q scenario digest");
      expect(row).toHaveTextContent("Matched mechanically");
      expect(row).toHaveTextContent("Shared signature digest");
      const digests = Array.from(row.querySelectorAll("dd code")).map(
        (entry) => entry.textContent,
      );
      expect(digests).toEqual([
        authored?.packP.scenarios[index]?.scenarioDigest,
        authored?.packQ.scenarios[index]?.scenarioDigest,
        authored?.packP.scenarios[index]?.semanticSignatureDigest,
      ]);
      digests.forEach((digest) => {
        expect(digest).toMatch(/^sha256:[a-f0-9]{64}$/);
      });
    });
    expect(ledger.querySelectorAll("dd code")).toHaveLength(21);
  });

  it("domain-separates the candidate fixture identity from raw JSON and other artifact domains", async () => {
    const [readinessScenarios, candidateScenarios] = await Promise.all([
      universityResearchReadinessFixtureScenarios(),
      universitySemesterLoopFixtureScenarios(),
    ]);
    const coherent = readinessScenarios.find(
      (scenario) => scenario.id === "synthetic-plan-coherent",
    );
    const [expected, raw, wrongDomain] = await Promise.all([
      sha256Digest(canonicalJson({
        digestDomain:
          UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.candidateFixture,
        value: candidateScenarios,
      })),
      sha256Digest(canonicalJson(candidateScenarios)),
      sha256Digest(canonicalJson({
        digestDomain:
          UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenarioPack,
        value: candidateScenarios,
      })),
    ]);

    expect(coherent?.projection.protocol?.fixtureDigest).toBe(expected);
    expect(expected).not.toBe(raw);
    expect(expected).not.toBe(wrongDomain);
  });

  it("distinguishes artifact mismatch from a protocol-stop non-evaluation", async () => {
    await renderWorkspace();
    const artifact = screen.getByRole("region", {
      name: "Artifact evidence stops before review.",
    });

    expect(artifact).toHaveTextContent(
      "Artifact preflight was not evaluated.",
    );
    expect(artifact).not.toHaveTextContent("Mismatch");
    expect(artifact).toHaveTextContent(
      "Artifact identities and deterministic checks were not evaluated.",
    );

    fireEvent.click(screen.getByRole("radio", {
      name: "Comparator mismatch",
    }));
    expect(artifact).toHaveTextContent(
      "The authored manifests do not match mechanically.",
    );
    expect(artifact).toHaveTextContent("substitute.binding_mismatch");
    expect(artifact).toHaveTextContent("Mismatch");
    expect(artifact).toHaveTextContent("Requested; blocked until repair");
  });

  it("keeps artifact state announcements concise and non-identifying", async () => {
    await renderWorkspace();
    const status = screen.getByRole("status");

    expect(status).toHaveTextContent(
      "Artifact preflight was not evaluated.",
    );
    fireEvent.click(screen.getByRole("radio", {
      name: "Synthetic plan coherent",
    }));
    expect(status).toHaveTextContent(
      "The manifests match mechanically. Independent review is still required.",
    );
    expect(status).toHaveTextContent("Independent review remains required.");
    expect(status).not.toHaveTextContent("sha256:");
    expect(status).not.toHaveTextContent("Open gates");
  });

  it("fails closed when no fixture scenarios are supplied", () => {
    const { rerender } = render(
      <UniversityResearchReadinessWorkspace scenarios={[]} />,
    );
    expect(screen.getByRole("heading", {
      level: 1,
      name: "No university research-readiness state is available.",
    })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    rerender(<UniversityResearchReadinessUnavailable />);
    expect(screen.getByText(
      /No protocol, approval, operator plan, comparator, sample, participant, recording, or research evidence was exposed/,
    )).toBeInTheDocument();
  });
});
