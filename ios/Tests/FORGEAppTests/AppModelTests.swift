import Darwin
import Foundation
import SwiftUI
import Synchronization
import Testing
import UserNotifications

@testable import FORGE
@testable import ForgeCore

@Suite("Semester Desk app model")
@MainActor
struct AppModelTests {
  @Test("Cold launch consumes the pending shared Today destination")
  func coldLaunchConsumesPendingSharedTodayDestination() async throws {
    try await withEnvironment { environment in
      let writer = try await environment.makeLaunchedModel()
      #expect(await writer.createSemesterDesk(title: "Autumn 2027"))
      try environment.sharedStore.setPendingDestination(.today)

      let reader = try environment.makeModel()
      reader.selectedTab = .semester
      reader.handleScenePhaseChange(.active)
      await reader.launch()

      #expect(reader.selectedTab == .today)
      #expect(try environment.sharedStore.consumePendingDestination() == nil)
    }
  }

  @Test("An active scene transition consumes a pending shared destination")
  func activeSceneTransitionConsumesPendingSharedDestination() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      model.selectedTab = .today
      try environment.sharedStore.setPendingDestination(.progress)

      model.handleScenePhaseChange(.inactive)
      model.handleScenePhaseChange(.active)
      await settleMainActorWork()

      #expect(model.selectedTab == .progress)
      #expect(try environment.sharedStore.consumePendingDestination() == nil)
    }
  }

  @Test("Successful local-data recovery consumes a pending shared destination")
  func successfulRecoveryConsumesPendingSharedDestination() async throws {
    try await withEnvironment { environment in
      let writer = try await environment.makeLaunchedModel()
      #expect(await writer.createSemesterDesk(title: "Autumn 2027"))

      await environment.privateStore.setLoadError(.writeVerification)
      let reader = try environment.makeModel()
      reader.handleScenePhaseChange(.active)
      await reader.launch()
      #expect(reader.recoveryState != nil)

      try environment.sharedStore.setPendingDestination(.semester)
      await environment.privateStore.setLoadError(nil)
      reader.retryLocalDataLoad()
      await reader.waitForRecoveryOperationForTesting()
      await settleMainActorWork()

      #expect(reader.recoveryState == nil)
      #expect(reader.selectedTab == .semester)
      #expect(try environment.sharedStore.consumePendingDestination() == nil)
    }
  }

  @Test("A transient shared destination read error retains the route for a later retry")
  func transientSharedDestinationReadErrorRetainsRouteForLaterRetry() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      try environment.sharedStore.setPendingDestination(.progress)

      let descriptor = try holdExclusiveSharedStoreLock(
        in: environment.sharedRootURL
      )
      await model.consumePendingSystemDestinationForTesting()
      #expect(model.selectedTab == .today)
      releaseSharedStoreLock(descriptor)

      await model.consumePendingSystemDestinationForTesting()
      #expect(model.selectedTab == .progress)
      #expect(try environment.sharedStore.consumePendingDestination() == nil)
    }
  }

  @Test("Semester Desk creation saves before it applies to memory")
  func semesterDeskCreationSavesBeforeItAppliesToMemory() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      await environment.privateStore.blockNextSave(
        checkCancellationBeforeInstallation: false
      )

      let creation = Task { @MainActor in
        await model.createSemesterDesk(title: "Autumn 2027")
      }
      await environment.privateStore.waitForBlockedSave()
      let candidate = try #require(await environment.privateStore.latestSave())

      #expect(model.semesterDesk == nil)
      #expect(model.isSemesterDeskOperationRunning)
      #expect(candidate.localProfileID == model.localProfileID)
      #expect(candidate.semesterDesk.profileID == model.localProfileID)
      #expect(candidate.semesterDesk.title == "Autumn 2027")

      await environment.privateStore.releaseBlockedSave()
      #expect(await creation.value)
      #expect(model.semesterDesk == candidate.semesterDesk)
      #expect(!model.isSemesterDeskOperationRunning)
      #expect(await environment.privateStore.currentState() == candidate)
    }
  }

  @Test("Semester Desk commands save before they apply to memory")
  func semesterDeskCommandSavesBeforeItAppliesToMemory() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      await waitForSemesterDeskIdle(model)
      let priorDesk = try #require(model.semesterDesk)
      await environment.privateStore.blockNextSave(
        checkCancellationBeforeInstallation: false
      )

      let command = UniversitySemesterDeskCommand.addCourse(
        profileID: model.localProfileID,
        code: "MAT220",
        title: "Linear algebra"
      )
      let transition = Task { @MainActor in
        await model.applySemesterDeskCommand(command)
      }
      await environment.privateStore.waitForBlockedSave()
      let candidate = try #require(await environment.privateStore.latestSave())

      #expect(model.semesterDesk == priorDesk)
      #expect(model.isSemesterDeskOperationRunning)
      #expect(candidate.semesterDesk.courses.map(\.code) == ["MAT220"])

      await environment.privateStore.releaseBlockedSave()
      #expect(await transition.value)
      await waitForSemesterDeskIdle(model)
      #expect(model.semesterDesk == candidate.semesterDesk)
      #expect(!model.isSemesterDeskOperationRunning)
      #expect(await environment.privateStore.currentState() == candidate)
    }
  }

  @Test("Overlapping Semester Desk creation saves only the accepted action")
  func overlappingSemesterDeskCreationIsRejected() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      await environment.privateStore.blockNextSave(
        checkCancellationBeforeInstallation: false
      )

      let firstCreation = Task { @MainActor in
        await model.createSemesterDesk(title: "Autumn 2027")
      }
      await environment.privateStore.waitForBlockedSave()

      #expect(!(await model.createSemesterDesk(title: "Spring 2028")))
      #expect(await environment.privateStore.saveCount() == 1)
      #expect(model.semesterDesk == nil)

      await environment.privateStore.releaseBlockedSave()
      #expect(await firstCreation.value)
      await waitForSemesterDeskIdle(model)
      #expect(model.semesterDesk?.title == "Autumn 2027")
      #expect(await environment.privateStore.saveCount() == 1)
    }
  }

  @Test("Overlapping Semester Desk commands save only the accepted action")
  func overlappingSemesterDeskCommandsAreRejected() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      await waitForSemesterDeskIdle(model)
      let command = UniversitySemesterDeskCommand.addCourse(
        profileID: model.localProfileID,
        code: "MAT220",
        title: "Linear algebra"
      )
      await environment.privateStore.blockNextSave(
        checkCancellationBeforeInstallation: false
      )

      let firstCommand = Task { @MainActor in
        await model.applySemesterDeskCommand(command)
      }
      await environment.privateStore.waitForBlockedSave()

      #expect(!(await model.applySemesterDeskCommand(command)))
      #expect(await environment.privateStore.saveCount() == 2)
      #expect(model.semesterDesk?.courses.isEmpty == true)

      await environment.privateStore.releaseBlockedSave()
      #expect(await firstCommand.value)
      await waitForSemesterDeskIdle(model)
      #expect(model.semesterDesk?.courses.map(\.code) == ["MAT220"])
      #expect(await environment.privateStore.saveCount() == 2)
    }
  }

  @Test("Cancellation before private installation does not apply a Semester Desk")
  func cancellationBeforePrivateInstallationDoesNotApplySemesterDesk() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      await environment.privateStore.blockNextSave(
        checkCancellationBeforeInstallation: true
      )

      let creation = Task { @MainActor in
        await model.createSemesterDesk(title: "Autumn 2027")
      }
      await environment.privateStore.waitForBlockedSave()
      creation.cancel()
      await environment.privateStore.releaseBlockedSave()

      #expect(!(await creation.value))
      #expect(model.semesterDesk == nil)
      #expect(model.recoveryState == nil)
      #expect(await environment.privateStore.currentState() == nil)
      #expect(!model.isSemesterDeskOperationRunning)
    }
  }

  @Test("Cancellation after private installation applies the durable Semester Desk")
  func cancellationAfterPrivateInstallationAppliesDurableSemesterDesk() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      await environment.privateStore.blockNextSaveAfterInstallation()

      let creation = Task { @MainActor in
        await model.createSemesterDesk(title: "Autumn 2027")
      }
      await environment.privateStore.waitForSaveBlockedAfterInstallation()
      let durableState = try #require(await environment.privateStore.currentState())

      creation.cancel()
      await environment.privateStore.releaseSaveBlockedAfterInstallation()

      #expect(await creation.value)
      await waitForSemesterDeskIdle(model)
      #expect(durableState.semesterDesk != nil)
      #expect(model.semesterDesk == durableState.semesterDesk)
      #expect(await environment.privateStore.currentState() == durableState)
      #expect(!model.isSemesterDeskOperationRunning)
    }
  }

  @Test("Semester Desk save failure preserves the prior state")
  func semesterDeskSaveFailurePreservesPriorState() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      await waitForSemesterDeskIdle(model)
      let priorDesk = try #require(model.semesterDesk)
      let priorState = try #require(await environment.privateStore.currentState())
      await environment.privateStore.setSaveError(.writeVerification)

      #expect(
        !(await model.applySemesterDeskCommand(
          .addCourse(
            profileID: model.localProfileID,
            code: "MAT220",
            title: "Linear algebra"
          )
        ))
      )
      #expect(model.semesterDesk == priorDesk)
      #expect(await environment.privateStore.currentState() == priorState)
      #expect(
        model.recoveryState
          == .saveFailed(message: "FORGE could not save local course data.")
      )
    }
  }

  @Test("Semester Desk save retry restores the durable prior state")
  func semesterDeskSaveRetryRestoresDurablePriorState() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      await waitForSemesterDeskIdle(model)
      let priorDesk = try #require(model.semesterDesk)
      await environment.privateStore.setSaveError(.writeVerification)

      #expect(
        !(await model.applySemesterDeskCommand(
          .addCourse(
            profileID: model.localProfileID,
            code: "MAT220",
            title: "Linear algebra"
          )
        ))
      )
      await environment.privateStore.setSaveError(nil)

      model.retryLocalDataLoad()
      await model.waitForRecoveryOperationForTesting()
      await waitForSemesterDeskIdle(model)

      #expect(model.recoveryState == nil)
      #expect(model.semesterDesk == priorDesk)
      #expect(await environment.privateStore.currentState()?.semesterDesk == priorDesk)
    }
  }

  @Test("A superseded Semester Desk save does not apply")
  func supersededSemesterDeskSaveDoesNotApply() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      await waitForSemesterDeskIdle(model)
      let priorDesk = try #require(model.semesterDesk)
      await environment.privateStore.setNextSaveResult(.superseded)

      #expect(
        !(await model.applySemesterDeskCommand(
          .addCourse(
            profileID: model.localProfileID,
            code: "MAT220",
            title: "Linear algebra"
          )
        ))
      )
      #expect(model.semesterDesk == priorDesk)
      #expect(model.recoveryState == nil)
    }
  }

  @Test("Semester Desk commands use the injected time and reject another profile")
  func semesterDeskCommandsUseInjectedTimeAndRejectAnotherProfile() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      let creationDate = Date(timeIntervalSince1970: 2_000_010_000)
      environment.clock.set(creationDate)

      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      await waitForSemesterDeskIdle(model)
      #expect(
        model.semesterDesk?.createdAt
          == AppModel.semesterDeskTimestamp(for: creationDate)
      )

      let transitionDate = creationDate.addingTimeInterval(60)
      environment.clock.set(transitionDate)
      #expect(
        await model.applySemesterDeskCommand(
          .addCourse(
            profileID: model.localProfileID,
            code: "MAT220",
            title: "Linear algebra"
          )
        )
      )
      await waitForSemesterDeskIdle(model)
      let currentDesk = try #require(model.semesterDesk)
      #expect(
        currentDesk.updatedAt
          == AppModel.semesterDeskTimestamp(for: transitionDate)
      )

      #expect(
        !(await model.applySemesterDeskCommand(
          .addCourse(
            profileID: "profile.someone-else",
            code: "MAT221",
            title: "Vector spaces"
          )
        ))
      )
      #expect(model.semesterDesk == currentDesk)
      #expect(
        model.semesterDeskStatusMessage
          == "This action belongs to a different local profile."
      )
    }
  }

  @Test("Cold launch restores a profile-bound Semester Desk and blocks duplicate creation")
  func coldLaunchRestoresProfileBoundSemesterDeskAndBlocksDuplicateCreation() async throws {
    try await withEnvironment { environment in
      let writer = try await environment.makeLaunchedModel()
      #expect(await writer.createSemesterDesk(title: "Autumn 2027"))
      await waitForSemesterDeskIdle(writer)
      #expect(
        await writer.applySemesterDeskCommand(
          .addCourse(
            profileID: writer.localProfileID,
            code: "MAT220",
            title: "Linear algebra"
          )
        )
      )
      await waitForSemesterDeskIdle(writer)
      let storedState = try #require(await environment.privateStore.currentState())

      let reader = try await environment.makeLaunchedModel()
      #expect(reader.localProfileID == storedState.localProfileID)
      #expect(reader.semesterDesk == storedState.semesterDesk)
      #expect(reader.semesterDesk?.profileID == reader.localProfileID)
      #expect(reader.semesterDesk?.courses.map(\.code) == ["MAT220"])

      let restoredDesk = try #require(reader.semesterDesk)
      #expect(!(await reader.createSemesterDesk(title: "Spring 2028")))
      #expect(reader.semesterDesk == restoredDesk)
    }
  }

  @Test("Today selects the honest Semester Desk action in priority order")
  func semesterDeskTodayActionPriority() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      await waitForSemesterDeskIdle(model)
      #expect(model.semesterDeskTodayAction == .confirmCapacity)

      #expect(
        await model.applySemesterDeskCommand(
          .draftCapacity(
            profileID: model.localProfileID,
            availableMinutes: 120
          )
        )
      )
      await waitForSemesterDeskIdle(model)
      #expect(
        await model.applySemesterDeskCommand(
          .confirmCapacity(profileID: model.localProfileID)
        )
      )
      await waitForSemesterDeskIdle(model)
      #expect(model.semesterDeskTodayAction == .addCourse)

      #expect(
        await model.applySemesterDeskCommand(
          .addCourse(
            profileID: model.localProfileID,
            code: "MAT220",
            title: "Linear algebra"
          )
        )
      )
      await waitForSemesterDeskIdle(model)
      let courseID = try #require(model.semesterDesk?.courses.first?.id)
      #expect(
        model.semesterDeskTodayAction == .addPlannedWork(courseID: courseID)
      )

      #expect(
        await model.applySemesterDeskCommand(
          .addPlanItem(
            profileID: model.localProfileID,
            courseID: courseID,
            title: "Matrix transformations",
            date: "2033-05-18",
            minutes: 45
          )
        )
      )
      await waitForSemesterDeskIdle(model)
      let planItemID = try #require(model.semesterDesk?.planItems.first?.id)
      #expect(model.semesterDeskTodayAction == .choosePlannedWork)

      #expect(
        await model.applySemesterDeskCommand(
          .chooseNextAction(
            profileID: model.localProfileID,
            planItemID: planItemID
          )
        )
      )
      await waitForSemesterDeskIdle(model)
      #expect(
        model.semesterDeskTodayAction == .selectedAction(planItemID: planItemID)
      )

      #expect(
        await model.applySemesterDeskCommand(
          .prepareRecovery(
            profileID: model.localProfileID,
            summary: "The available study time changed.",
            decisions: [
              UniversitySemesterDeskRecoveryDecisionInput(
                planItemID: planItemID,
                outcome: .kept,
                reason: "This item still fits the available time."
              )
            ]
          )
        )
      )
      await waitForSemesterDeskIdle(model)
      #expect(model.semesterDeskTodayAction == .finishRecovery)
    }
  }

  @Test("A stored profile mismatch enters local-data recovery")
  func storedProfileMismatchEntersLocalDataRecovery() async throws {
    try await withEnvironment { environment in
      let writer = try await environment.makeLaunchedModel()
      #expect(await writer.createSemesterDesk(title: "Autumn 2027"))
      await waitForSemesterDeskIdle(writer)
      let storedState = try #require(await environment.privateStore.currentState())
      let mismatchedState = PrivateStateEnvelope(
        localProfileID: "profile.someone-else",
        semesterDesk: storedState.semesterDesk,
        returnRemindersEnabled: storedState.returnRemindersEnabled
      )
      await environment.privateStore.replaceState(mismatchedState)

      let reader = try environment.makeModel()
      reader.handleScenePhaseChange(.active)
      await reader.launch()

      guard case .loadFailed = reader.recoveryState else {
        Issue.record("A profile mismatch must enter load recovery.")
        return
      }
      #expect(reader.semesterDesk == nil)
    }
  }

  @Test("An empty launch does not create a private state file")
  func emptyLaunchDoesNotSavePrivateState() async throws {
    try await withEnvironment { environment in
      let model = try environment.makeModel()
      model.handleScenePhaseChange(.active)
      await model.launch()

      #expect(model.recoveryState == nil)
      #expect(model.semesterDesk == nil)
      #expect(await environment.privateStore.saveCount() == 0)
      #expect(await environment.privateStore.currentState() == nil)
    }
  }

  @Test("Background entry during onboarding does not create private state")
  func backgroundOnboardingDoesNotSavePrivateState() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      model.handleScenePhaseChange(.background)
      await settleMainActorWork()

      #expect(model.semesterDesk == nil)
      #expect(await environment.privateStore.saveCount() == 0)
      #expect(await environment.privateStore.currentState() == nil)
    }
  }

  @Test("A schema-one envelope restores the Semester Desk")
  func schemaOneEnvelopeRestoresSemesterDesk() async throws {
    try await withEnvironment { environment in
      let writer = try await environment.makeLaunchedModel()
      #expect(await writer.createSemesterDesk(title: "Autumn 2027"))
      let stored = try #require(await environment.privateStore.currentState())
      #expect(stored.schemaVersion == 1)
      #expect(stored.returnRemindersEnabled == false)

      let reader = try environment.makeModel()
      await reader.launch()

      #expect(reader.localProfileID == stored.localProfileID)
      #expect(reader.semesterDesk == stored.semesterDesk)
      #expect(reader.remindersEnabled == stored.returnRemindersEnabled)
    }
  }

  @Test("Stale private state enters recovery without a private mutation")
  func stalePrivateStateEntersRecoveryWithoutMutation() async throws {
    try await withEnvironment { environment in
      let writer = try await environment.makeLaunchedModel()
      #expect(await writer.createSemesterDesk(title: "Autumn 2027"))
      let before = try await environment.privateStore.encodedCurrentState()
      let saveCount = await environment.privateStore.saveCount()
      await environment.privateStore.setLoadError(
        .stalePrivateStatePresent(entries: ["private-state-v5.json"])
      )

      let reader = try environment.makeModel()
      let initialProfileID = reader.localProfileID
      await reader.launch()

      guard case .loadFailed = reader.recoveryState else {
        Issue.record("Stale local state must enter recovery.")
        return
      }
      #expect(reader.localProfileID == initialProfileID)
      #expect(reader.semesterDesk == nil)
      #expect(await environment.privateStore.encodedCurrentState() == before)
      #expect(await environment.privateStore.saveCount() == saveCount)
    }
  }

  @Test("A first save failure retries against a nil persisted baseline")
  func firstSaveFailureRetriesAgainstNilPersistedBaseline() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      await environment.privateStore.setSaveError(.writeVerification)

      #expect(!(await model.createSemesterDesk(title: "Autumn 2027")))
      guard case .saveFailed = model.recoveryState else {
        Issue.record("A failed first save must enter recovery.")
        return
      }
      #expect(model.semesterDesk == nil)
      #expect(await environment.privateStore.currentState() == nil)

      await environment.privateStore.setSaveError(nil)
      model.retryLocalDataLoad()
      await model.waitForRecoveryOperationForTesting()

      #expect(model.recoveryState == nil)
      #expect(model.semesterDesk == nil)
      #expect(await environment.privateStore.currentState() == nil)
    }
  }

  @Test("A failed command retries against the exact persisted baseline")
  func persistedStateRetryUsesExactBaseline() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      let baseline = try #require(await environment.privateStore.currentState())
      await environment.privateStore.setSaveError(.writeVerification)

      #expect(
        !(await model.applySemesterDeskCommand(
          .addCourse(
            profileID: model.localProfileID,
            code: "MAT220",
            title: "Linear algebra"
          )
        ))
      )
      guard case .saveFailed = model.recoveryState else {
        Issue.record("A failed command save must enter recovery.")
        return
      }

      await environment.privateStore.setSaveError(nil)
      await environment.privateStore.replaceState(nil)
      model.retryLocalDataLoad()
      await model.waitForRecoveryOperationForTesting()
      #expect(model.recoveryState != nil)
      #expect(model.semesterDesk == baseline.semesterDesk)

      await environment.privateStore.replaceState(baseline)
      model.retryLocalDataLoad()
      await model.waitForRecoveryOperationForTesting()
      #expect(model.recoveryState == nil)
      #expect(model.semesterDesk == baseline.semesterDesk)
    }
  }

  @Test("A partial private reset keeps the current profile and Semester Desk")
  func partialResetKeepsProfileAndSemesterDesk() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      let profileID = model.localProfileID
      let desk = try #require(model.semesterDesk)
      await environment.privateStore.setNextClearResult(
        .completed(
          PrivateStateClearReceipt(
            files: [
              PrivateStateRemovalRecord(
                name: "semester-desk-private-state-v1.json",
                disposition: .retained
              )
            ],
            stages: [],
            namespace: .notRequired
          )
        )
      )

      model.clearLocalData()
      await model.waitForLocalDataResetOperationForTesting()

      guard case .resetFailed = model.recoveryState else {
        Issue.record("A partial private reset must remain in recovery.")
        return
      }
      #expect(model.localProfileID == profileID)
      #expect(model.semesterDesk == desk)
    }
  }

  @Test("The return reminder preference restores on relaunch")
  func returnReminderPreferenceRestoresOnRelaunch() async throws {
    try await withEnvironment { environment in
      let writer = try await environment.makeLaunchedModel()
      #expect(await writer.createSemesterDesk(title: "Autumn 2027"))
      let stored = try #require(await environment.privateStore.currentState())
      let reminderState = PrivateStateEnvelope(
        localProfileID: stored.localProfileID,
        semesterDesk: stored.semesterDesk,
        returnRemindersEnabled: true
      )
      await environment.privateStore.replaceState(reminderState)

      let reader = try environment.makeModel()
      await reader.launch()

      #expect(reader.remindersEnabled)
      #expect(reader.semesterDesk == stored.semesterDesk)
    }
  }

  @Test("Encoded private state excludes drafts and legacy fields")
  func encodedPrivateStateExcludesDraftsAndLegacyFields() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      let data = try await environment.privateStore.encodedCurrentState()
      let text = try #require(String(data: data, encoding: .utf8))

      #expect(!text.contains("learnerState"))
      #expect(!text.contains("isCourseStarted"))
      #expect(!text.contains("remindersEnabled"))
      #expect(!text.contains("practiceText"))
      #expect(!text.contains("independentCheckText"))
      #expect(!text.contains("delayedReturnText"))
      #expect(text.contains("returnRemindersEnabled"))
    }
  }

  @Test("Protected Study draft text stays in process memory and returns complete honestly")
  func protectedStudyDraftTextStaysInProcessMemory() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      let planItemID = try await makePlan(in: model)

      #expect(await model.beginProtectedStudy(planItemID: planItemID))
      await waitForSemesterDeskIdle(model)
      model.updateSemesterDeskStudyDraft(
        for: planItemID,
        practiceText: "RAW_PRACTICE_MUST_NOT_PERSIST",
        independentCheckText: "RAW_PROOF_MUST_NOT_PERSIST",
        delayedReturnText: "RAW_RETURN_MUST_NOT_PERSIST"
      )

      let data = try await environment.privateStore.encodedCurrentState()
      let text = try #require(String(data: data, encoding: .utf8))
      #expect(!text.contains("RAW_PRACTICE_MUST_NOT_PERSIST"))
      #expect(!text.contains("RAW_PROOF_MUST_NOT_PERSIST"))
      #expect(!text.contains("RAW_RETURN_MUST_NOT_PERSIST"))

      #expect(await model.completeProtectedPractice(outcome: .completed))
      await waitForSemesterDeskIdle(model)
      #expect(
        await model.submitProtectedIndependentCheck(outcome: .demonstrated)
      )
      await waitForSemesterDeskIdle(model)
      let returnDate = environment.clock.date.addingTimeInterval(3_600)
      #expect(await model.scheduleProtectedDelayedReturn(at: returnDate))
      await waitForSemesterDeskIdle(model)
      let delayedReturn = try #require(
        model.semesterDesk?.delayedReturns.first
      )
      #expect(delayedReturn.status == .due)
      #expect(!model.isProtectedStudyPresented)
      #expect(model.semesterDeskStudyDraft(for: planItemID) == .empty)

      environment.clock.set(returnDate)
      #expect(
        await model.openProtectedDelayedReturn(
          delayedReturnID: delayedReturn.id,
          planItemID: planItemID
        )
      )
      await waitForSemesterDeskIdle(model)
      #expect(await model.completeProtectedDelayedReturn(outcome: .retained))
      await waitForSemesterDeskIdle(model)
      let completedDelayedReturn = model.semesterDesk?.delayedReturns.first {
        $0.id == delayedReturn.id
      }
      let completedPlanItem = model.semesterDesk?.planItems.first {
        $0.id == planItemID
      }
      #expect(completedDelayedReturn?.status == .completed)
      #expect(completedPlanItem?.status == .returnComplete)
    }
  }

  @Test("Reset removes private state, shared destinations, and process-only drafts")
  func resetRemovesPrivateStateSharedDestinationsAndProcessOnlyDrafts() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      let planItemID = try await makePlan(in: model)
      let priorProfileID = model.localProfileID
      #expect(await model.beginProtectedStudy(planItemID: planItemID))
      await waitForSemesterDeskIdle(model)
      model.updateSemesterDeskStudyDraft(
        for: planItemID,
        practiceText: "draft that reset must remove",
        independentCheckText: "",
        delayedReturnText: ""
      )
      try environment.sharedStore.setPendingDestination(.progress)

      model.clearLocalData()
      await model.waitForLocalDataResetOperationForTesting()

      #expect(model.recoveryState == nil)
      #expect(model.semesterDesk == nil)
      #expect(model.localProfileID != priorProfileID)
      #expect(model.semesterDeskStudyDraft(for: planItemID) == .empty)
      #expect(await environment.privateStore.currentState() == nil)
      #expect(try environment.sharedStore.consumePendingDestination() == nil)
    }
  }

  @Test("Reset supersedes a blocked Semester Desk creation before installation")
  func resetSupersedesBlockedSemesterDeskCreationBeforeInstallation() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      await environment.privateStore.blockNextSave(
        checkCancellationBeforeInstallation: false
      )

      let creation = Task { @MainActor in
        await model.createSemesterDesk(title: "Autumn 2027")
      }
      await environment.privateStore.waitForBlockedSave()

      model.clearLocalData()
      await model.waitForLocalDataResetOperationForTesting()
      await environment.privateStore.releaseBlockedSave()

      #expect(!(await creation.value))
      #expect(model.semesterDesk == nil)
      #expect(await environment.privateStore.currentState() == nil)
      #expect(model.recoveryState == nil)
    }
  }

  @Test("Reset supersedes a blocked Semester Desk command")
  func resetSupersedesBlockedSemesterDeskCommand() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      await waitForSemesterDeskIdle(model)
      await environment.privateStore.blockNextSave(
        checkCancellationBeforeInstallation: false
      )

      let command = Task { @MainActor in
        await model.applySemesterDeskCommand(
          .addCourse(
            profileID: model.localProfileID,
            code: "MAT220",
            title: "Linear algebra"
          )
        )
      }
      await environment.privateStore.waitForBlockedSave()

      model.clearLocalData()
      await model.waitForLocalDataResetOperationForTesting()
      await environment.privateStore.releaseBlockedSave()

      #expect(!(await command.value))
      #expect(model.semesterDesk == nil)
      #expect(await environment.privateStore.currentState() == nil)
      #expect(model.recoveryState == nil)
    }
  }

  @Test("Reset prevents a late durable Semester Desk save from restoring data")
  func resetPreventsLateDurableSemesterDeskSaveFromRestoringData() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      await environment.privateStore.blockNextSaveAfterInstallation()

      let creation = Task { @MainActor in
        await model.createSemesterDesk(title: "Autumn 2027")
      }
      await environment.privateStore.waitForSaveBlockedAfterInstallation()
      #expect(await environment.privateStore.currentState()?.semesterDesk != nil)

      model.clearLocalData()
      await model.waitForLocalDataResetOperationForTesting()
      await environment.privateStore.releaseSaveBlockedAfterInstallation()

      #expect(!(await creation.value))
      #expect(model.semesterDesk == nil)
      #expect(await environment.privateStore.currentState() == nil)
      #expect(model.recoveryState == nil)
    }
  }

  @Test("An active time boundary is scheduled and a background transition cancels it")
  func activeTimeBoundarySchedulesAndBackgroundCancelsIt() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      let planItemID = try await makePlan(in: model)
      #expect(await model.beginProtectedStudy(planItemID: planItemID))
      await waitForSemesterDeskIdle(model)
      #expect(await model.completeProtectedPractice(outcome: .completed))
      await waitForSemesterDeskIdle(model)
      #expect(
        await model.submitProtectedIndependentCheck(outcome: .demonstrated)
      )
      await waitForSemesterDeskIdle(model)

      let dueAt = environment.clock.date.addingTimeInterval(3_600)
      #expect(await model.scheduleProtectedDelayedReturn(at: dueAt))
      await waitForSemesterDeskIdle(model)
      await settleMainActorWork()

      let scheduled = await environment.timeBoundarySleeper.snapshot()
      #expect(scheduled.requests.last?.deadline == dueAt)
      #expect(scheduled.requests.last?.scheduledFrom == environment.clock.date)

      model.handleScenePhaseChange(.background)
      await settleMainActorWork()
      let cancelled = await environment.timeBoundarySleeper.snapshot()
      #expect(cancelled.cancellationCount >= 1)
    }
  }

  @Test("A nonfinite clock rejects Semester Desk commands")
  func nonfiniteClockRejectsSemesterDeskCommands() async throws {
    try await withEnvironment { environment in
      let model = try await environment.makeLaunchedModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2027"))
      await waitForSemesterDeskIdle(model)
      let priorDesk = try #require(model.semesterDesk)

      environment.clock.set(
        Date(timeIntervalSinceReferenceDate: .nan)
      )
      #expect(
        !(await model.applySemesterDeskCommand(
          .addCourse(
            profileID: model.localProfileID,
            code: "MAT220",
            title: "Linear algebra"
          )
        ))
      )
      #expect(model.semesterDesk == priorDesk)
      #expect(
        model.semesterDeskStatusMessage
          == "FORGE could not read the current time."
      )

    }
  }

  private func makePlan(in model: AppModel) async throws -> String {
    #expect(await model.createSemesterDesk(title: "Autumn 2027"))
    await waitForSemesterDeskIdle(model)
    #expect(
      await model.applySemesterDeskCommand(
        .addCourse(
          profileID: model.localProfileID,
          code: "MAT220",
          title: "Linear algebra"
        )
      )
    )
    await waitForSemesterDeskIdle(model)
    let courseID = try #require(model.semesterDesk?.courses.first?.id)
    #expect(
      await model.applySemesterDeskCommand(
        .addPlanItem(
          profileID: model.localProfileID,
          courseID: courseID,
          title: "Matrix transformations",
          date: "2033-05-18",
          minutes: 45
        )
      )
    )
    await waitForSemesterDeskIdle(model)
    let planItemID = try #require(model.semesterDesk?.planItems.first?.id)
    #expect(
      await model.applySemesterDeskCommand(
        .chooseNextAction(
          profileID: model.localProfileID,
          planItemID: planItemID
        )
      )
    )
    await waitForSemesterDeskIdle(model)
    return planItemID
  }
}

@MainActor
private func withEnvironment(
  _ body: (TestEnvironment) async throws -> Void
) async throws {
  let environment = try TestEnvironment()
  defer { environment.clean() }
  try await body(environment)
}

@MainActor
private func settleMainActorWork() async {
  for _ in 0..<128 {
    await Task.yield()
  }
}

@MainActor
private func waitForSemesterDeskIdle(_ model: AppModel) async {
  await model.waitForReminderOperationForTesting()
}

private enum AppModelTestError: Error {
  case sharedLock
}

private func holdExclusiveSharedStoreLock(in root: URL) throws -> Int32 {
  let lockURL = root.appendingPathComponent("forge-shared-state-v4.lock")
  let descriptor = lockURL.withUnsafeFileSystemRepresentation { path -> Int32 in
    guard let path else {
      return -1
    }
    return open(
      path,
      O_CREAT | O_RDWR | O_CLOEXEC | O_NOFOLLOW,
      S_IRUSR | S_IWUSR
    )
  }
  guard descriptor >= 0, flock(descriptor, LOCK_EX | LOCK_NB) == 0 else {
    if descriptor >= 0 {
      _ = close(descriptor)
    }
    throw AppModelTestError.sharedLock
  }
  return descriptor
}

private func releaseSharedStoreLock(_ descriptor: Int32) {
  _ = flock(descriptor, LOCK_UN)
  _ = close(descriptor)
}

private struct TestTimeBoundaryRequest: Equatable, Sendable {
  let deadline: Date
  let scheduledFrom: Date
}

private actor TestTimeBoundarySleeper: TimeBoundarySleeping {
  private var requests: [TestTimeBoundaryRequest] = []
  private var cancellationCount = 0

  func sleep(until deadline: Date, from now: Date) async throws {
    requests.append(
      TestTimeBoundaryRequest(deadline: deadline, scheduledFrom: now)
    )
    do {
      try await Task.sleep(for: .seconds(86_400))
    } catch {
      cancellationCount += 1
      throw error
    }
  }

  func snapshot() -> (
    requests: [TestTimeBoundaryRequest],
    cancellationCount: Int
  ) {
    (requests, cancellationCount)
  }
}

@MainActor
private final class TestClock {
  private(set) var date: Date

  init(date: Date) {
    self.date = date
  }

  func now() -> Date {
    date
  }

  func set(_ date: Date) {
    self.date = date
  }
}

private final class TestSemesterDeskIdentifierFactory:
  UniversitySemesterDeskIdentifierFactory,
  Sendable
{
  private let counter = Mutex(0)

  func next(kind: UniversitySemesterDeskIdentifierKind) -> String {
    let ordinal = counter.withLock { value in
      value += 1
      return value
    }
    return "\(kind.rawValue).app-model.\(ordinal)"
  }
}

@MainActor
private final class TestEnvironment {
  let rootURL: URL
  let sharedRootURL: URL
  let calendar: Calendar
  let clock: TestClock
  let privateStore: TestPrivateStateStore
  let sharedStore: ForgeSharedStateStore
  let notificationCenter: TestNotificationCenter
  let notificationCoordinator: NotificationCoordinator
  let timeBoundarySleeper: TestTimeBoundarySleeper
  let semesterDeskIdentifiers = TestSemesterDeskIdentifierFactory()

  private var nextProfileOrdinal = 0

  init() throws {
    rootURL = FileManager.default.temporaryDirectory.appendingPathComponent(
      "forge-semester-desk-app-model-\(UUID().uuidString)",
      isDirectory: true
    )
    sharedRootURL = rootURL.appendingPathComponent("app-group", isDirectory: true)
    try FileManager.default.createDirectory(
      at: sharedRootURL,
      withIntermediateDirectories: true
    )

    let timeZone = TimeZone(secondsFromGMT: 0) ?? .gmt
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    let clock = TestClock(date: Date(timeIntervalSince1970: 2_000_000_000))
    let privateStore = TestPrivateStateStore()
    let notificationCenter = TestNotificationCenter()
    let timeBoundarySleeper = TestTimeBoundarySleeper()
    let notificationCoordinator = NotificationCoordinator(
      center: notificationCenter,
      calendar: calendar,
      timeZone: timeZone,
      now: { clock.now() }
    )

    self.calendar = calendar
    self.clock = clock
    self.privateStore = privateStore
    self.sharedStore = ForgeSharedStateStore(
      sharedRootDirectory: sharedRootURL,
      testHooks: ForgeSharedStateStoreTestHooks(
        lockAcquisitionTimeoutNanoseconds: 5_000_000,
        lockRetryIntervalNanoseconds: 500_000
      )
    )
    self.notificationCenter = notificationCenter
    self.notificationCoordinator = notificationCoordinator
    self.timeBoundarySleeper = timeBoundarySleeper
  }

  func makeModel() throws -> AppModel {
    try AppModel(
      privateStateStore: privateStore,
      sharedStore: sharedStore,
      notificationCoordinator: notificationCoordinator,
      timeBoundarySleeper: timeBoundarySleeper,
      now: { [clock] in clock.now() },
      calendar: calendar,
      localProfileIDGenerator: { [weak self] in
        guard let self else {
          return "profile.unavailable"
        }
        return self.nextProfileID()
      },
      semesterDeskIdentifiers: semesterDeskIdentifiers,
      widgetReloader: {}
    )
  }

  func makeLaunchedModel() async throws -> AppModel {
    let model = try makeModel()
    model.handleScenePhaseChange(.active)
    await model.launch()
    return model
  }

  func clean() {
    try? FileManager.default.removeItem(at: rootURL)
  }

  private func nextProfileID() -> String {
    nextProfileOrdinal += 1
    return "profile.app-model.\(nextProfileOrdinal)"
  }
}

private struct TestPrivateStateSaveSnapshot: Sendable {
  let state: PrivateStateEnvelope
  let token: PrivateStateSaveToken
}

private actor TestPrivateStateStore: PrivateStateStoring {
  private var state: PrivateStateEnvelope?
  private var saves: [TestPrivateStateSaveSnapshot] = []
  private var loadError: PrivateStateStoreError?
  private var saveError: PrivateStateStoreError?
  private var nextSaveResult: PrivateStateSaveResult?
  private var nextClearResult: PrivateStateClearResult?
  private var latestResetEpoch: UInt64 = 0
  private var latestSequence: UInt64 = 0
  private var shouldBlockNextSave = false
  private var checkCancellationBeforeInstallation = false
  private var blockedSaveContinuation: CheckedContinuation<Void, Never>?
  private var blockedSaveWaiters: [CheckedContinuation<Void, Never>] = []
  private var shouldBlockSaveAfterInstallation = false
  private var installedSaveContinuation: CheckedContinuation<Void, Never>?
  private var installedSaveWaiters: [CheckedContinuation<Void, Never>] = []

  func setLoadError(_ error: PrivateStateStoreError?) {
    loadError = error
  }

  func setSaveError(_ error: PrivateStateStoreError?) {
    saveError = error
  }

  func setNextSaveResult(_ result: PrivateStateSaveResult?) {
    nextSaveResult = result
  }

  func setNextClearResult(_ result: PrivateStateClearResult?) {
    nextClearResult = result
  }

  func blockNextSave(checkCancellationBeforeInstallation: Bool) {
    precondition(!shouldBlockNextSave)
    shouldBlockNextSave = true
    self.checkCancellationBeforeInstallation = checkCancellationBeforeInstallation
  }

  func waitForBlockedSave() async {
    if blockedSaveContinuation != nil {
      return
    }
    await withCheckedContinuation { continuation in
      blockedSaveWaiters.append(continuation)
    }
  }

  func releaseBlockedSave() {
    blockedSaveContinuation?.resume()
    blockedSaveContinuation = nil
  }

  func blockNextSaveAfterInstallation() {
    precondition(!shouldBlockSaveAfterInstallation)
    shouldBlockSaveAfterInstallation = true
  }

  func waitForSaveBlockedAfterInstallation() async {
    if installedSaveContinuation != nil {
      return
    }
    await withCheckedContinuation { continuation in
      installedSaveWaiters.append(continuation)
    }
  }

  func releaseSaveBlockedAfterInstallation() {
    installedSaveContinuation?.resume()
    installedSaveContinuation = nil
  }

  func latestSave() -> PrivateStateEnvelope? {
    saves.last?.state
  }

  func currentState() -> PrivateStateEnvelope? {
    state
  }

  func replaceState(_ state: PrivateStateEnvelope?) {
    self.state = state
  }

  func saveCount() -> Int {
    saves.count
  }

  func encodedCurrentState() throws -> Data {
    guard let state else {
      throw PrivateStateStoreError.corruptData
    }
    return try JSONEncoder().encode(state)
  }

  func load() async throws -> PrivateStateEnvelope? {
    if let loadError {
      throw loadError
    }
    return state
  }

  func save(
    _ state: PrivateStateEnvelope,
    token: PrivateStateSaveToken
  ) async throws -> PrivateStateSaveResult {
    saves.append(TestPrivateStateSaveSnapshot(state: state, token: token))
    if shouldBlockNextSave {
      shouldBlockNextSave = false
      let waiters = blockedSaveWaiters
      blockedSaveWaiters.removeAll()
      for waiter in waiters {
        waiter.resume()
      }
      await withCheckedContinuation { continuation in
        blockedSaveContinuation = continuation
      }
      if checkCancellationBeforeInstallation {
        checkCancellationBeforeInstallation = false
        try Task.checkCancellation()
      }
    }

    if let saveError {
      throw saveError
    }
    if let nextSaveResult {
      self.nextSaveResult = nil
      return nextSaveResult
    }

    guard token.resetEpoch >= latestResetEpoch else {
      return .superseded
    }
    if token.resetEpoch > latestResetEpoch {
      latestResetEpoch = token.resetEpoch
      latestSequence = 0
    }
    guard token.sequence > latestSequence else {
      return .superseded
    }
    latestSequence = token.sequence
    self.state = state
    if shouldBlockSaveAfterInstallation {
      shouldBlockSaveAfterInstallation = false
      let waiters = installedSaveWaiters
      installedSaveWaiters.removeAll()
      for waiter in waiters {
        waiter.resume()
      }
      await withCheckedContinuation { continuation in
        installedSaveContinuation = continuation
      }
    }
    return .installed(namespace: .synchronized)
  }

  func clear(resetEpoch: UInt64) async throws -> PrivateStateClearResult {
    guard resetEpoch >= latestResetEpoch else {
      return .superseded
    }
    latestResetEpoch = resetEpoch
    latestSequence = 0
    if let nextClearResult {
      self.nextClearResult = nil
      return nextClearResult
    }
    let disposition: PrivateStateRemovalDisposition =
      state == nil ? .alreadyAbsent : .removed
    state = nil
    return .completed(
      PrivateStateClearReceipt(
        files: [
          PrivateStateRemovalRecord(
            name: "semester-desk-private-state-v1.json",
            disposition: disposition
          )
        ],
        stages: [],
        namespace: disposition == .removed ? .changed(.synchronized) : .notRequired
      )
    )
  }
}

@MainActor
private final class TestNotificationCenter:
  LocalNotificationCenter,
  ImmediateNotificationRemovalReporting
{
  private var pendingIdentifiers = Set<String>()
  private var deliveredIdentifiers = Set<String>()

  func authorizationStatus() async -> LocalNotificationAuthorizationStatus {
    .authorized
  }

  func requestAuthorization(options _: UNAuthorizationOptions) async throws -> Bool {
    true
  }

  func add(_ request: UNNotificationRequest) async throws {
    pendingIdentifiers.insert(request.identifier)
  }

  func pendingNotificationIdentifiers() async -> [String] {
    pendingIdentifiers.sorted()
  }

  func deliveredNotificationIdentifiers() async -> [String] {
    deliveredIdentifiers.sorted()
  }

  func removePendingNotificationRequests(withIdentifiers identifiers: [String]) {
    pendingIdentifiers.subtract(identifiers)
  }

  func removeDeliveredNotifications(withIdentifiers identifiers: [String]) {
    deliveredIdentifiers.subtract(identifiers)
  }

  func removePendingNotificationsImmediately(
    withIdentifiers identifiers: [String]
  ) -> Bool {
    pendingIdentifiers.subtract(identifiers)
    return true
  }

  func removeDeliveredNotificationsImmediately(
    withIdentifiers identifiers: [String]
  ) -> Bool {
    deliveredIdentifiers.subtract(identifiers)
    return true
  }
}
