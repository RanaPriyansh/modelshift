import fixture from "../../../tests/fixtures/lesson-draft-response.json";
import { describe, expect, it } from "vitest";

import { compileLessonDraftPipeline } from "./pipeline.server";
import { lessonDraftPipelineSchema, lessonDraftSchema } from "./schema";

const draft = lessonDraftSchema.parse(fixture.draft);

describe("lesson draft pipeline", () => {
  it("keeps model output as a draft and creates unresolved, source-free review requirements", () => {
    const pipeline = compileLessonDraftPipeline(draft);

    expect(pipeline.generation.draft).toEqual(draft);
    expect(pipeline.revision.status).toBe("unreviewed");
    expect(pipeline.revision.appliedCritiqueIds).toEqual([]);
    expect(pipeline.sourcePlan.status).toBe("source-needed");
    expect(pipeline.sourcePlan.items).toEqual([
      expect.objectContaining({
        id: expect.stringMatching(/^source-need-[a-f0-9]{12}$/),
        disposition: "unresolved",
      }),
    ]);
    expect(JSON.stringify(pipeline)).not.toContain("published");
    expect(JSON.stringify(pipeline)).not.toContain("sourceId");
  });

  it("rejects invented source identifiers and model approval fields in a pipeline artifact", () => {
    const pipeline = compileLessonDraftPipeline(draft);
    expect(lessonDraftPipelineSchema.safeParse({
      ...pipeline,
      sourcePlan: { ...pipeline.sourcePlan, sourceId: "source.invented" },
    }).success).toBe(false);
    expect(lessonDraftPipelineSchema.safeParse({
      ...pipeline,
      revision: { ...pipeline.revision, approval: "model-approved" },
    }).success).toBe(false);
  });
});
