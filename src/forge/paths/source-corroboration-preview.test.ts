import { describe, expect, it } from "vitest";

import { FIRST_PILOT_PRACTICE_TEMPLATE } from "../practice/contracts";
import { FIRST_PILOT_PROJECT_TEMPLATE } from "../projects/contracts";
import { getCurrentPathwayAvailability } from "../pathways/public-availability";
import { SOURCE_CORROBORATION_RUNTIME_BINDING } from "../world-runtime/source-corroboration-binding";
import {
  projectSourceCorroborationPreview,
  SOURCE_CORROBORATION_PATH_PREVIEW,
  SOURCE_CORROBORATION_PATH_ROUTE,
} from "./source-corroboration-preview";

type Mutable<T> = T extends string ? string
  : T extends number ? number
    : T extends boolean ? boolean
      : T extends readonly (infer Item)[] ? Mutable<Item>[]
        : T extends object ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
          : T;

function clone<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}

function expectDeeplyFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeeplyFrozen(child);
}

describe("source corroboration path preview", () => {
  it("projects the fixed practical path as a deeply immutable, presentation-only view", () => {
    expect(SOURCE_CORROBORATION_PATH_PREVIEW).toMatchObject({
      route: SOURCE_CORROBORATION_PATH_ROUTE,
      title: "Corroborate a model-generated factual claim",
      banner: { status: "working-world", available: true },
      primaryAction: { id: "action.source-corroboration.learner-operation", available: true },
    });
    expect(SOURCE_CORROBORATION_PATH_PREVIEW.steps.map((step) => step.status)).toEqual([
      "working-world",
      "legacy-source-metadata",
      "fixture-template-only",
      "fixture-template-only",
      "provider-disabled",
      "honour-based-local-proof",
      "return-unavailable",
    ]);
    expect(SOURCE_CORROBORATION_PATH_PREVIEW.boundaries.map((boundary) => boundary.status)).toEqual([
      "legacy-source-metadata",
      "provider-disabled",
      "fixture-template-only",
      "honour-based-local-proof",
      "return-unavailable",
    ]);
    expect(JSON.stringify(SOURCE_CORROBORATION_PATH_PREVIEW)).not.toMatch(/https?:\/\//i);
    expectDeeplyFrozen(SOURCE_CORROBORATION_PATH_PREVIEW);
  });

  it("fails closed for malformed or altered dependencies without throwing or widening another action", () => {
    const alteredProject = clone(FIRST_PILOT_PROJECT_TEMPLATE);
    alteredProject.content.approvedOperationIds = alteredProject.content.approvedOperationIds.filter((operationId) => operationId !== "operation.authored.transfer");
    const alteredPractice = clone(FIRST_PILOT_PRACTICE_TEMPLATE);
    alteredPractice.content.feedbackBoundary.autonomousScore = true;
    const alteredBinding = clone(SOURCE_CORROBORATION_RUNTIME_BINDING);
    alteredBinding.protocolVersion = "1.0.0";

    expect(() => projectSourceCorroborationPreview(null)).not.toThrow();
    const preview = projectSourceCorroborationPreview({
      runtimeBinding: alteredBinding,
      projectTemplate: alteredProject,
      practiceTemplate: alteredPractice,
      youtubePolicy: null,
    });

    expect(preview.primaryAction).toMatchObject({ available: false, unavailableReason: "runtime-binding-unavailable" });
    expect(preview.banner).toMatchObject({ status: "path-unavailable", available: false });
    expect(preview.steps.find((step) => step.id === "world")?.action).toMatchObject({ available: false, unavailableReason: "runtime-binding-unavailable" });
    expect(preview.steps.find((step) => step.id === "project")?.action).toMatchObject({ available: false, unavailableReason: "project-template-unavailable" });
    expect(preview.steps.find((step) => step.id === "practice")?.action).toMatchObject({ available: false, unavailableReason: "practice-template-unavailable" });
    expect(preview.steps.find((step) => step.id === "provider")?.action).toMatchObject({ available: false, unavailableReason: "provider-policy-unavailable" });
  });

  it("treats every dependency as required when a caller supplies an explicit input object", () => {
    const preview = projectSourceCorroborationPreview({ runtimeBinding: SOURCE_CORROBORATION_RUNTIME_BINDING });

    expect(preview.banner).toMatchObject({ status: "path-unavailable", available: false });
    expect(preview.primaryAction).toMatchObject({ available: false, unavailableReason: "project-template-unavailable" });
    expect(preview.steps.find((step) => step.id === "project")?.action).toMatchObject({ available: false, unavailableReason: "project-template-unavailable" });
    expect(preview.steps.find((step) => step.id === "practice")?.action).toMatchObject({ available: false, unavailableReason: "practice-template-unavailable" });
    expect(preview.steps.find((step) => step.id === "provider")?.action).toMatchObject({ available: false, unavailableReason: "provider-policy-unavailable" });
  });

  it("fails closed for drift in every pinned runtime and practice boundary", () => {
    const runtimeVariants = [
      (binding: Mutable<typeof SOURCE_CORROBORATION_RUNTIME_BINDING>) => { binding.protocolVersion = "2.0.0"; },
      (binding: Mutable<typeof SOURCE_CORROBORATION_RUNTIME_BINDING>) => { binding.actions[0].kind = "reset"; },
      (binding: Mutable<typeof SOURCE_CORROBORATION_RUNTIME_BINDING>) => { binding.evidence.proofAuthority = "unknown"; },
      (binding: Mutable<typeof SOURCE_CORROBORATION_RUNTIME_BINDING>) => { binding.evidence.persistence = "persisted"; },
      (binding: Mutable<typeof SOURCE_CORROBORATION_RUNTIME_BINDING>) => { binding.returnProof.enabled = true; },
      (binding: Mutable<typeof SOURCE_CORROBORATION_RUNTIME_BINDING>) => { binding.sourceBindings[0].provenanceStatus = "reviewed"; },
      (binding: Mutable<typeof SOURCE_CORROBORATION_RUNTIME_BINDING>) => { binding.sourceBindings[0].sourceItemId = "source.tampered"; },
      (binding: Mutable<typeof SOURCE_CORROBORATION_RUNTIME_BINDING>) => { binding.sourceBindings.pop(); },
      (binding: Mutable<typeof SOURCE_CORROBORATION_RUNTIME_BINDING>) => { binding.support.policyId = "policy.tampered"; },
      (binding: Mutable<typeof SOURCE_CORROBORATION_RUNTIME_BINDING>) => { binding.proof.validatorId = "validator.tampered"; },
      (binding: Mutable<typeof SOURCE_CORROBORATION_RUNTIME_BINDING>) => { Object.assign(binding.sourceBindings[0], { locatorIds: ["locator.tampered"] }); },
    ];

    for (const mutate of runtimeVariants) {
      const runtimeBinding = clone(SOURCE_CORROBORATION_RUNTIME_BINDING);
      mutate(runtimeBinding);
      const preview = projectSourceCorroborationPreview({
        runtimeBinding,
        projectTemplate: FIRST_PILOT_PROJECT_TEMPLATE,
        practiceTemplate: FIRST_PILOT_PRACTICE_TEMPLATE,
      });
      expect(preview.banner).toMatchObject({ status: "path-unavailable", available: false });
      expect(preview.steps.find((step) => step.id === "world")?.action).toMatchObject({ available: false });
    }

    const practiceTemplate = clone(FIRST_PILOT_PRACTICE_TEMPLATE);
    practiceTemplate.content.feedbackBoundary.autonomousMasteryClaim = true;
    const preview = projectSourceCorroborationPreview({
      runtimeBinding: SOURCE_CORROBORATION_RUNTIME_BINDING,
      projectTemplate: FIRST_PILOT_PROJECT_TEMPLATE,
      practiceTemplate,
    });
    expect(preview.steps.find((step) => step.id === "practice")?.action).toMatchObject({ available: false, unavailableReason: "practice-template-unavailable" });
  });

  it("requires the currently released public source-corroboration World before presenting a CTA", () => {
    const publicAvailability = clone(getCurrentPathwayAvailability());
    const computingAi = publicAvailability.find((entry) => entry.area === "computing-ai");
    if (!computingAi) throw new Error("Expected the computing-ai public availability entry.");
    computingAi.status = "identified-gap";

    const preview = projectSourceCorroborationPreview({
      runtimeBinding: SOURCE_CORROBORATION_RUNTIME_BINDING,
      projectTemplate: FIRST_PILOT_PROJECT_TEMPLATE,
      practiceTemplate: FIRST_PILOT_PRACTICE_TEMPLATE,
      publicAvailability,
    });
    expect(preview.banner).toMatchObject({ status: "path-unavailable", available: false });
    expect(preview.primaryAction).toMatchObject({ available: false, unavailableReason: "public-world-unavailable" });
    expect(preview.steps.find((step) => step.id === "world")).toMatchObject({
      status: "path-unavailable",
      action: { available: false, unavailableReason: "public-world-unavailable" },
    });
  });

  it("does not read getter-backed runtime or public-availability candidates before rejecting them", () => {
    let runtimeGetterReads = 0;
    const getterBackedRuntime = clone(SOURCE_CORROBORATION_RUNTIME_BINDING);
    Object.defineProperty(getterBackedRuntime, "protocolVersion", {
      configurable: true,
      enumerable: true,
      get: () => {
        runtimeGetterReads += 1;
        return "1.1.0";
      },
    });
    const runtimePreview = projectSourceCorroborationPreview({
      runtimeBinding: getterBackedRuntime,
      projectTemplate: FIRST_PILOT_PROJECT_TEMPLATE,
      practiceTemplate: FIRST_PILOT_PRACTICE_TEMPLATE,
      publicAvailability: getCurrentPathwayAvailability(),
    });
    expect(runtimeGetterReads).toBe(0);
    expect(runtimePreview.steps.find((step) => step.id === "world")?.action).toMatchObject({ available: false, unavailableReason: "runtime-binding-unavailable" });

    let availabilityGetterReads = 0;
    const getterBackedAvailability = clone(getCurrentPathwayAvailability());
    Object.defineProperty(getterBackedAvailability[0], "area", {
      configurable: true,
      enumerable: true,
      get: () => {
        availabilityGetterReads += 1;
        return "language-literacy";
      },
    });
    const availabilityPreview = projectSourceCorroborationPreview({
      runtimeBinding: SOURCE_CORROBORATION_RUNTIME_BINDING,
      projectTemplate: FIRST_PILOT_PROJECT_TEMPLATE,
      practiceTemplate: FIRST_PILOT_PRACTICE_TEMPLATE,
      publicAvailability: getterBackedAvailability,
    });
    expect(availabilityGetterReads).toBe(0);
    expect(availabilityPreview.steps.find((step) => step.id === "world")?.action).toMatchObject({ available: false, unavailableReason: "public-world-unavailable" });
  });
});
