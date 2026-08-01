import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

const CONTINUITY_STORAGE_KEY = "forge.device-continuity:v1";

type PlannerResponse = {
  contractKind?: string;
  model?: {
    contribution?: string;
    fallbackReason?: string | null;
  };
  route?: {
    worldId?: string | null;
    worldRoute?: string | null;
  };
};

function captureRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

async function clearDeviceContinuity(page: Page) {
  await page.goto("/start");
  await page.evaluate((key) => localStorage.removeItem(key), CONTINUITY_STORAGE_KEY);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Turn a goal into a credible first path." })).toBeVisible();
}

async function buildCandidate(
  page: Page,
  goal: string,
  desiredOutcome: string,
): Promise<PlannerResponse> {
  await page.getByPlaceholder("I want to…").fill(goal);
  await page.getByRole("button", { name: "Name the outcome" }).click();

  await page.getByPlaceholder(
    "For example: build, explain, decide, repair, investigate, or perform…",
  ).fill(desiredOutcome);
  await page.getByRole("button", { name: "Set route context" }).click();

  await page.getByRole("checkbox", {
    name: /Use these exact fields for one first-party planning response/,
  }).check();
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/forge/plan")
      && response.request().method() === "POST");
  await page.getByRole("button", { name: "Build inspectable candidate" }).click();

  const response = await responsePromise;
  expect(response.status()).toBe(200);
  return await response.json() as PlannerResponse;
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(
    () => page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(1);
}

async function expectSettledSurface(page: Page) {
  await expect(page.getByText("Loading the requested FORGE surface…")).toHaveCount(0);
  await expect(page.locator("#forge-main")).toHaveCount(1);
  await expect(page.locator("#forge-main")).toBeVisible();
}

async function activateSkipLink(page: Page) {
  const skip = page.locator(".forge-skip-link");
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  const target = await skip.boundingBox();
  expect(target, "focused skip link should expose a measurable target").not.toBeNull();
  expect(target!.height).toBeGreaterThanOrEqual(44);
  expect(target!.width).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Enter");
  await expect(page.locator("#forge-main")).toBeFocused();
}

async function completeForceWorldInsidePathSession(page: Page) {
  await page.getByRole("radio", { name: "Gradually slows" }).press("Space");
  await page.getByTestId("commit-prediction").click();
  await page.getByRole("textbox", { name: "Your explanation" }).fill(
    "I think motion needs a continuing push, so the craft may gradually slow.",
  );
  await page.getByTestId("submit-explanation").click();
  await expect(page.getByTestId("stage-interpret")).toBeVisible();
  await page.getByRole("radio", { name: /Only the friction track/ }).press("Space");
  await page.getByTestId("commit-probe-prediction").click();
  await page.getByTestId("run-experiment").click();
  await page.getByRole("textbox", {
    name: /What do you notice after the push ends\?/,
  }).fill("Only the friction track changes velocity after the push ends.");
  await page.getByTestId("submit-reflection").click();
  await page.getByRole("textbox", { name: "Your causal rule" }).fill(
    "Net force causes acceleration, and zero net force leaves velocity constant.",
  );
  await page.getByTestId("enter-proof").click();
  await expect(page.getByTestId("stage-proof")).toBeVisible();
  await page.getByRole("radio", { name: /stays constant above zero/i }).press("Space");
  await page.getByRole("textbox", {
    name: /Explain your choice in one or two sentences/i,
  }).fill("Zero net force means zero acceleration, so the existing velocity stays constant.");
  await page.getByTestId("submit-proof").click();
}

async function fillStartThroughOutcome(
  page: Page,
  goal: string,
  outcome: string,
  currentKnowledge = "",
) {
  await page.getByPlaceholder("I want to…").fill(goal);
  await page.getByRole("button", { name: "Name the outcome" }).click();
  await page.getByPlaceholder(
    "For example: build, explain, decide, repair, investigate, or perform…",
  ).fill(outcome);
  if (currentKnowledge) {
    await page.getByPlaceholder(
      "Name prior knowledge, experience, or where you get stuck.",
    ).fill(currentKnowledge);
  }
  await page.getByRole("button", { name: "Set route context" }).click();
}

test.describe("FORGE continuity product acceptance", () => {
  test("keeps the public product chapters truthful and operational", async ({ page }) => {
    const runtimeErrors = captureRuntimeErrors(page);
    const chapters = [
      { path: "/paths", heading: "Learn toward something you want to do." },
      { path: "/how-forge-works", heading: "A path is credible when every move earns its place." },
      { path: "/trust", heading: "FORGE should be inspectable before it is impressive." },
      { path: "/modelshift", heading: "ModelShift challenges a mental model, then removes the instrument." },
    ] as const;

    for (const chapter of chapters) {
      const response = await page.goto(chapter.path);
      expect(response?.status()).toBe(200);
      await expectSettledSurface(page);
      await expect(page.getByRole("heading", { name: chapter.heading })).toBeVisible();
    }

    expect(runtimeErrors).toEqual([]);
  });

  test("accepts an exact grounded Force path and projects its deterministic action brief", async ({ page }) => {
    const runtimeErrors = captureRuntimeErrors(page);
    await clearDeviceContinuity(page);

    const goal = "Understand why a moving object keeps moving after a brief force ends.";
    const planner = await buildCandidate(
      page,
      goal,
      "Predict and explain a new force-and-motion case without hints.",
    );

    expect(planner).toMatchObject({
      contractKind: "grounded_learning",
      model: { contribution: "not_used", fallbackReason: "disabled" },
      route: {
        worldId: "world.force-and-motion",
        worldRoute: "/learn/force-and-motion",
      },
    });
    await expect(page.getByText("Reviewed World match · acceptance required")).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept exact path" })).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), CONTINUITY_STORAGE_KEY)).toBeNull();

    await Promise.all([
      page.waitForURL("**/app"),
      page.getByRole("button", { name: "Accept exact path" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: goal })).toBeVisible();

    const nextAction = page.locator(".forge-next-action");
    await expect(nextAction.getByText("Ready", { exact: true })).toBeVisible();
    await expect(nextAction.getByRole("heading", { name: "Force & motion" })).toBeVisible();
    await expect(nextAction).toContainText("world.force-and-motion");

    const ledger = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, CONTINUITY_STORAGE_KEY);
    expect(ledger).toMatchObject({
      format: "forge-device-continuity",
      schemaVersion: 1,
      records: [{
        goal: { learnerWords: goal },
        revisions: [
          { status: "candidate", executionAllowed: false },
          {
            status: "accepted",
            executionAllowed: true,
            authority: {
              kind: "reviewed_world",
              worldRef: {
                worldId: "world.force-and-motion",
                worldRoute: "/learn/force-and-motion",
                activityProtocol: "modelshift",
              },
            },
          },
        ],
        activityStates: [
          { status: "ready" },
        ],
      }],
    });

    await Promise.all([
      page.waitForURL("**/app/study"),
      nextAction.getByRole("link", { name: "Open action brief" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Force & motion" })).toBeVisible();
    await expect(page.locator(".forge-study-brief")).toContainText("world.force-and-motion");
    await expect(page.getByRole("button", { name: "Begin reviewed World" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Record step worked through" })).toHaveCount(0);
    await expect(page.locator(".forge-study-brief")).toContainText("Only the World runtime can close this path activity.");

    expect(runtimeErrors).toEqual([]);
  });

  test("restores an unfinished Force attempt from its exact device-local session checkpoint", async ({ page }) => {
    const runtimeErrors = captureRuntimeErrors(page);
    await clearDeviceContinuity(page);
    await page.evaluate(() => {
      localStorage.setItem("forge.device-profile:v1", JSON.stringify({
        schemaVersion: 1,
        profileId: "d1b53bde-528e-48d8-8ce7-f5c9249be9d8",
        ageMode: "adult",
        guardianPresent: false,
        createdAt: new Date().toISOString(),
      }));
    });

    await buildCandidate(
      page,
      "Understand why a moving object keeps moving after a brief force ends.",
      "Predict and explain a new force-and-motion case without hints.",
    );
    await Promise.all([
      page.waitForURL("**/app"),
      page.getByRole("button", { name: "Accept exact path" }).click(),
    ]);
    await page.getByRole("link", { name: "Open action brief" }).click();
    await page.getByRole("button", { name: "Begin reviewed World" }).click();
    await expect(page).toHaveURL(
      /\/focus\/modelshift\/study-session\.[a-z0-9._-]+$/,
    );
    const sessionUrl = page.url();

    await page.getByRole("radio", { name: "Gradually slows" }).press("Space");
    await page.getByTestId("commit-prediction").click();
    const draft =
      "My unfinished causal explanation should survive a normal exit.";
    await page.getByRole("textbox", { name: "Your explanation" }).fill(draft);
    await expect.poll(() => page.evaluate(() =>
      Object.entries(localStorage)
        .filter(([key]) => key.startsWith("forge.world-session-checkpoint:"))
        .map(([, value]) => value)
        .join("\n"),
    )).toContain(draft);

    await Promise.all([
      page.waitForURL("**/app/study"),
      page.getByRole("link", {
        name: "Return without claiming completion",
      }).click(),
    ]);
    await page.goto(sessionUrl);
    await expect(page.getByRole("textbox", {
      name: "Your explanation",
    })).toHaveValue(draft);
    await expect(page.getByTestId("stage-predict")).toHaveCount(0);

    const localState = await page.evaluate((continuityKey) => {
      const continuity = JSON.parse(localStorage.getItem(continuityKey)!);
      return {
        evidence: localStorage.getItem("forge.evidence-ledger"),
        session: continuity.records[0].studySessions[0],
      };
    }, CONTINUITY_STORAGE_KEY);
    expect(localState.session).toMatchObject({
      status: "active",
      completedAt: null,
      runtimeCorrelation: null,
    });
    expect(localState.evidence).toBeNull();
    expect(runtimeErrors).toEqual([]);
  });

  test("completes the exact goal-to-session-to-delayed-return evidence journey", async ({ page }) => {
    const runtimeErrors = captureRuntimeErrors(page);
    await clearDeviceContinuity(page);
    await page.evaluate(() => {
      localStorage.removeItem("forge.evidence-ledger");
      localStorage.setItem("forge.device-profile:v1", JSON.stringify({
        schemaVersion: 1,
        profileId: "d1b53bde-528e-48d8-8ce7-f5c9249be9d8",
        ageMode: "adult",
        guardianPresent: false,
        createdAt: new Date().toISOString(),
      }));
    });

    const goal = "Understand why a moving object keeps moving after a brief force ends.";
    await buildCandidate(
      page,
      goal,
      "Predict and explain a new force-and-motion case without hints.",
    );
    await Promise.all([
      page.waitForURL("**/app"),
      page.getByRole("button", { name: "Accept exact path" }).click(),
    ]);
    await page.getByRole("link", { name: "Open action brief" }).click();
    await page.getByRole("button", { name: "Begin reviewed World" }).click();
    await expect(page).toHaveURL(/\/focus\/modelshift\/study-session\.[a-z0-9._-]+$/);
    await expect(page.getByTestId("study-session-runtime")).toContainText(
      "world.force-and-motion · v1.0.2",
    );
    await expect(page.getByRole("button", {
      name: /record step worked through/i,
    })).toHaveCount(0);

    await completeForceWorldInsidePathSession(page);
    const completion = page.getByTestId("study-session-completed");
    await expect(completion).toBeVisible();
    await expect(completion).toContainText("proof.attempt.");
    await expect(completion).toContainText("A separate delayed-return task is scheduled");
    await expect(completion.getByRole("link", {
      name: "Inspect scheduled delayed return",
    })).toBeVisible();
    expect(await page.evaluate(() =>
      Object.keys(localStorage).filter((key) =>
        key.startsWith("forge.world-session-checkpoint:")),
    )).toHaveLength(0);

    const localState = await page.evaluate((continuityKey) => {
      const continuity = JSON.parse(localStorage.getItem(continuityKey)!);
      const evidence = JSON.parse(localStorage.getItem("forge.evidence-ledger")!);
      return {
        activity: continuity.records[0].activityStates[0],
        session: continuity.records[0].studySessions[0],
        returnTask: continuity.records[0].delayedReturnTasks[0],
        evidence: evidence.entries[0],
      };
    }, CONTINUITY_STORAGE_KEY);
    expect(localState).toMatchObject({
      activity: { status: "completed", stateVersion: 3 },
      session: {
        status: "completed",
        sessionVersion: 2,
        runtimeCorrelation: {
          evidenceEntryId: localState.evidence.id,
          attemptId: expect.stringMatching(/^attempt\./),
          worldId: "world.force-and-motion",
          worldVersion: "1.0.2",
        },
      },
      returnTask: {
        returnId: expect.stringMatching(/^return-task\./),
        studySessionId: localState.session.sessionId,
        originEvidenceEntryId: localState.evidence.id,
        returnEvidenceEntryId: expect.stringMatching(/^return-proof\./),
        worldId: "world.force-and-motion",
        worldVersion: "1.0.2",
        taskFamilyId: "task-family.force-motion.delayed-velocity-return.v1",
        status: "scheduled",
        completedAt: null,
      },
      evidence: {
        id: expect.stringMatching(/^proof\.attempt\./),
        capabilityId: "capability.force-motion.zero-net-force",
        proof: {
          mode: "independent_transfer",
          assistanceAccess: "removed",
          outcome: "proved",
        },
      },
    });
    expect(
      Date.parse(localState.returnTask.dueAt)
      - Date.parse(localState.returnTask.scheduledAt),
    ).toBe(7 * 24 * 60 * 60 * 1_000);

    await page.goto("/app");
    await expect(page.getByRole("heading", {
      name: "Every activity in this accepted path has been worked through.",
    })).toBeVisible();
    await expect(page.getByRole("heading", {
      name: "A reviewed delayed task is scheduled.",
    })).toBeVisible();
    await page.goto("/app/paths");
    const exactPathLink = page.getByRole("link", {
      name: "Inspect exact revision and session bindings",
    });
    await expect(exactPathLink).toBeVisible();
    await exactPathLink.click();
    await expect(page).toHaveURL(/\/app\/paths\/continuity-record\./);
    await expect(page.locator("body")).toContainText("session completed");
    await expect(page.getByRole("link", {
      name: "Inspect delayed return schedule",
    })).toBeVisible();

    await page.goto("/app/returns");
    await expect(page.getByRole("heading", {
      name: "Immediate performance is not a retention claim.",
    })).toBeVisible();
    await expect(page.getByTestId("return-upcoming-list")).toContainText(
      "Motion after a brief push",
    );
    await expect(page.getByRole("link", {
      name: "Inspect task boundary",
    })).toBeVisible();

    const completionWindowEndsAt =
      Date.parse(localState.returnTask.dueAt) + 30 * 24 * 60 * 60 * 1_000;
    await page.clock.setFixedTime(new Date(completionWindowEndsAt + 1));
    await page.reload();
    await expect(page.getByTestId("return-expired-list")).toContainText(
      "Window closed",
    );
    await expect(page.getByTestId("return-expired-list")).toContainText(
      "Untested",
    );
    await expect(page.getByRole("link", {
      name: "Open unaided return",
    })).toHaveCount(0);
    await page.getByRole("link", { name: "Inspect closed boundary" }).click();
    await expect(page.getByRole("heading", {
      name: "This reviewed completion window has closed.",
    })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByRole("button", {
      name: "Submit unaided return",
    })).toHaveCount(0);
    const expiredState = await page.evaluate((continuityKey) => {
      const continuity = JSON.parse(localStorage.getItem(continuityKey)!);
      const evidence = JSON.parse(localStorage.getItem("forge.evidence-ledger")!);
      return {
        task: continuity.records[0].delayedReturnTasks[0],
        evidenceCount: evidence.entries.length,
      };
    }, CONTINUITY_STORAGE_KEY);
    expect(expiredState).toMatchObject({
      task: { status: "scheduled", completedAt: null },
      evidenceCount: 1,
    });

    await page.clock.setFixedTime(new Date(localState.returnTask.dueAt));
    await page.goto("/app/returns");
    await expect(page.getByTestId("return-due-list")).toContainText(
      "Motion after a brief push",
    );
    await page.getByRole("link", { name: "Open unaided return" }).click();
    await expect(page.getByTestId("delayed-return-runtime")).toBeVisible();
    await expect(page.getByText(
      "AI interpretation, instructional help, replay, and your earlier result are unavailable here.",
      { exact: false },
    )).toBeVisible();
    await page.getByRole("radio", {
      name: "It stays at a constant positive velocity.",
    }).check();
    await page.getByRole("button", {
      name: "Submit unaided return",
    }).click();
    await expect(page.getByTestId("delayed-return-completed")).toBeVisible();

    await page.getByRole("link", { name: "Inspect bounded evidence" }).click();
    await expect(page).toHaveURL(/\/app\/evidence$/);
    const retentionRecord = page.locator(".forge-ledger-list > li").filter({
      hasText: "return proof",
    });
    await expect(retentionRecord).toHaveCount(1);
    await expect(retentionRecord).toContainText("Completed delayed-return attempt");

    const finalState = await page.evaluate((continuityKey) => {
      const continuity = JSON.parse(localStorage.getItem(continuityKey)!);
      const evidence = JSON.parse(localStorage.getItem("forge.evidence-ledger")!);
      return {
        returnTask: continuity.records[0].delayedReturnTasks[0],
        entries: evidence.entries,
      };
    }, CONTINUITY_STORAGE_KEY);
    expect(finalState.returnTask).toMatchObject({
      returnId: localState.returnTask.returnId,
      status: "completed",
      completedAt: localState.returnTask.dueAt,
    });
    expect(finalState.entries).toHaveLength(2);
    expect(finalState.entries).toContainEqual(expect.objectContaining({
      id: localState.returnTask.returnEvidenceEntryId,
      source: {
        kind: "return_challenge",
        refId: localState.returnTask.returnId,
      },
      proof: {
        conditionId: "proof.force-motion.independent-transfer",
        mode: "return_proof",
        assistanceAccess: "removed",
        outcome: "proved",
      },
      assistance: [],
      returnSchedule: null,
    }));

    expect(runtimeErrors).toEqual([]);
  });

  test("keeps a minor's exact wording local and sends only a fixed reviewed-topic token", async ({ page }) => {
    const plannerBodies: unknown[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST"
        && new URL(request.url()).pathname === "/api/forge/plan"
      ) {
        plannerBodies.push(request.postDataJSON());
      }
    });
    await clearDeviceContinuity(page);

    const privateGoal = "My private goal is to understand why friction changes motion.";
    const privateOutcome = "My private outcome is to explain a family example.";
    const privateKnowledge = "My private note says I confuse velocity and force.";
    const privateConstraint = "My private access and deadline note.";
    await fillStartThroughOutcome(
      page,
      privateGoal,
      privateOutcome,
      privateKnowledge,
    );
    await page.getByRole("radio", { name: /^Teen/ }).check();
    await page.getByLabel(
      "Materials, cost, language, mobility, bandwidth, or deadline · optional",
    ).fill(privateConstraint);
    await page.getByRole("checkbox", {
      name: /Use these exact fields for one first-party planning response/,
    }).check();
    const response = page.waitForResponse((candidate) =>
      candidate.url().endsWith("/api/forge/plan")
      && candidate.request().method() === "POST");
    await page.getByRole("button", { name: "Build inspectable candidate" }).click();
    expect((await response).status()).toBe(200);
    await expect(page.getByText("Reviewed World match · acceptance required")).toBeVisible();

    expect(plannerBodies).toHaveLength(1);
    expect(plannerBodies[0]).toMatchObject({
      question: "force and motion",
      ageMode: "teen",
      currentKnowledge: "",
      practicalOutcome: "Complete the reviewed World’s independent transfer task.",
      constraints: "",
      sourceMode: "authored_only",
    });
    const outbound = JSON.stringify(plannerBodies[0]);
    for (const privateValue of [
      privateGoal,
      privateOutcome,
      privateKnowledge,
      privateConstraint,
    ]) {
      expect(outbound).not.toContain(privateValue);
    }

    await page.getByRole("button", { name: "Reject this candidate" }).click();
    await fillStartThroughOutcome(
      page,
      "My private unmatched goal is to learn pottery glazing.",
      "Make a safe first test tile.",
    );
    await page.getByRole("radio", { name: /^Teen/ }).check();
    await page.getByRole("checkbox", {
      name: /Use these exact fields for one first-party planning response/,
    }).check();
    await page.getByRole("button", { name: "Build inspectable candidate" }).click();
    await expect(page.getByText("Coverage gap · not executable")).toBeVisible();
    expect(plannerBodies).toHaveLength(1);
    await expect(page.getByText(/No reviewed World matches this goal/i)).toBeVisible();
  });

  test("saves an unknown goal only as a non-runnable open question with export and deletion control", async ({ page }) => {
    const runtimeErrors = captureRuntimeErrors(page);
    await clearDeviceContinuity(page);

    const goal = "How did Roman aqueduct maintenance shape city planning?";
    const planner = await buildCandidate(
      page,
      goal,
      "Create a source-grounded maintenance and city-planning explanation.",
    );

    expect(planner).toMatchObject({
      contractKind: "exploratory_source_plan",
      model: { contribution: "not_used", fallbackReason: "disabled" },
      route: { worldId: null },
    });
    await expect(page.getByText("Coverage gap · not executable")).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept exact path" })).toHaveCount(0);

    await Promise.all([
      page.waitForURL("**/app"),
      page.getByRole("button", { name: "Save as an open question" }).click(),
    ]);
    await expect(page.getByRole("heading", {
      name: "What do you want to be able to do?",
    })).toBeVisible();
    await expect(page.getByText("1 saved open question")).toBeVisible();
    await expect(page.getByText(/They remain non-runnable/)).toBeVisible();

    const record = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw).records[0] : null;
    }, CONTINUITY_STORAGE_KEY);
    expect(record).toMatchObject({
      goal: { learnerWords: goal },
      revisions: [{
        status: "candidate",
        executionAllowed: false,
        authority: { kind: "candidate_unverified" },
      }],
      decisions: [],
      activityStates: [],
    });

    await page.goto("/app/paths");
    await expect(page.getByRole("heading", { name: goal })).toBeVisible();
    await expect(page.getByText("Open question · not executable")).toBeVisible();
    await expect(page.getByText(/execution blocked/)).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export local paths" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("forge-device-paths.json");
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const exported = JSON.parse(await readFile(downloadPath!, "utf8"));
    expect(exported).toMatchObject({
      format: "forge-device-continuity-export",
      dataClass: "learner-owned-local-copy",
      records: [{ goal: { learnerWords: goal } }],
    });
    await expect(page.getByRole("status")).toContainText("learner-owned JSON copy");

    await page.getByRole("button", { name: "Delete from device" }).click();
    await expect(page.getByRole("button", { name: "Confirm delete" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Keep it" })).toBeVisible();
    await page.getByRole("button", { name: "Keep it" }).click();
    await expect(page.getByRole("heading", { name: goal })).toBeVisible();

    await page.getByRole("button", { name: "Delete from device" }).click();
    await page.getByRole("button", { name: "Confirm delete" }).click();
    await expect(page.getByRole("status")).toContainText("deleted");
    await expect(page.getByRole("heading", { name: "This device has no learner-owned path history." })).toBeVisible();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).records.length, CONTINUITY_STORAGE_KEY)).toBe(0);

    expect(runtimeErrors).toEqual([]);
  });

  test("preserves 320px reflow and keyboard operation across public, start, and app surfaces", async ({ page }) => {
    const runtimeErrors = captureRuntimeErrors(page);
    await page.setViewportSize({ width: 320, height: 800 });

    for (const route of ["/paths", "/how-forge-works", "/trust", "/modelshift"]) {
      await page.goto(route);
      await expectSettledSurface(page);
      await expectNoHorizontalOverflow(page);
      await activateSkipLink(page);
    }

    await clearDeviceContinuity(page);
    const goalField = page.getByPlaceholder("I want to…");
    await expect(goalField).toBeFocused();
    await page.keyboard.type("Understand force and motion");
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Name the outcome" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByPlaceholder(
      "For example: build, explain, decide, repair, investigate, or perform…",
    )).toBeFocused();
    await expectNoHorizontalOverflow(page);

    for (const route of ["/app", "/app/paths", "/app/study"]) {
      await page.goto(route);
      await expectSettledSurface(page);
      await expectNoHorizontalOverflow(page);
      await activateSkipLink(page);
    }

    const shapePath = page.getByRole("link", { name: "Inspect my path" });
    await page.keyboard.press("Tab");
    await expect(shapePath).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/app\/paths$/);

    expect(runtimeErrors).toEqual([]);
  });
});
