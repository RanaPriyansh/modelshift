import Darwin
import Dispatch
import Foundation
import SwiftUI
import Synchronization
import Testing
import UserNotifications

@testable import FORGE
@testable import ForgeCore

@Suite("Adult university app model")
@MainActor
struct AppModelTests {
  @Test("Empty launch creates an unstarted local course")
  func emptyLaunch() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()

      #expect(!model.isCourseStarted)
      #expect(model.recoveryState == nil)
      #expect(model.learnerState.evidence.isEmpty)
      #expect(model.learnerState.delayedReturns.isEmpty)
      #expect(model.currentActivity?.kind == .practice)
      #expect(try await environment.privateStore.load() == nil)
    }
  }

  @Test("Blocked launch stays loading and rejects course actions")
  func blockedLaunchRejectsActions() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      await environment.privateStore.blockNextOperation(.load)
      let model = try await environment.makeUnlaunchedModel()
      let launchTask = Task { @MainActor in
        await model.launch()
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(.load)

      #expect(model.launchState == .loading)
      #expect(!(await model.startUniversityCourse()))
      model.presentActivity()
      #expect(!model.isActivityPresented)

      await environment.privateStore.releaseBlockedOperation(ticket)
      await launchTask.value
      #expect(model.launchState == .ready)
    }
  }

  @Test("Launch applies the latest buffered valid root URL")
  func launchAppliesLatestBufferedURL() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let storedState = try UniversityStarterCourse.initialState(
        updatedAt: environment.clock.now()
      )
      try await environment.privateStore.seed(
        PrivateStateEnvelope(
          learnerState: storedState,
          isCourseStarted: true,
          remindersEnabled: false
        )
      )
      await environment.privateStore.blockNextOperation(.load)
      let model = try await environment.makeUnlaunchedModel()
      let launchTask = Task { @MainActor in
        await model.launch()
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(.load)

      model.route(try validURL("forge://settings"))
      model.route(try validURL("forge://path"))
      model.route(try validURL("forge://invalid"))

      await environment.privateStore.releaseBlockedOperation(ticket)
      await launchTask.value

      #expect(model.launchState == .ready)
      #expect(model.selectedTab == .path)
      #expect(model.todayPath.isEmpty)
    }
  }

  @Test("Launch preparation failure enters visible recovery")
  func launchPreparationFailure() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeUnlaunchedModel(
        launchPreparation: {
          throw PrivateStateStoreError.writeVerification
        }
      )

      await model.launch()

      #expect(model.launchState == .ready)
      #expect(
        model.recoveryState
          == .resetFailed(
            message: "FORGE could not prepare local course data."
          )
      )
    }
  }

  @Test("Duplicate launch calls share one load")
  func duplicateLaunchDoesNotDoubleLoad() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      await environment.privateStore.blockNextOperation(.load)
      let model = try await environment.makeUnlaunchedModel()
      let firstLaunch = Task { @MainActor in
        await model.launch()
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(.load)
      let secondLaunch = Task { @MainActor in
        await model.launch()
      }
      let whileBlocked = await environment.privateStore.snapshot()

      #expect(whileBlocked.loadCount == 1)
      await environment.privateStore.releaseBlockedOperation(ticket)
      await firstLaunch.value
      await secondLaunch.value
      let completed = await environment.privateStore.snapshot()

      #expect(model.launchState == .ready)
      #expect(completed.loadCount == 1)
    }
  }

  @Test("A cancelled duplicate launch waiter finishes before the first load")
  func cancelledDuplicateLaunchWaiterFinishesEarly() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      await environment.privateStore.blockNextOperation(.load)
      let model = try await environment.makeUnlaunchedModel()
      let firstLaunch = Task { @MainActor in
        await model.launch()
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(.load)
      let duplicateLaunch = Task { @MainActor in
        await model.launch()
      }
      await model.waitForLaunchWaiterRegistrationForTesting()

      duplicateLaunch.cancel()
      await duplicateLaunch.value
      let whileFirstLoadIsBlocked = await environment.privateStore.snapshot()

      #expect(model.launchState == .loading)
      #expect(whileFirstLoadIsBlocked.loadCount == 1)

      await environment.privateStore.releaseBlockedOperation(ticket)
      await firstLaunch.value
      #expect(model.launchState == .ready)
    }
  }

  @Test("A second launch restarts after the first launch is cancelled")
  func secondLaunchRestartsAfterCancellation() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      await environment.privateStore.blockNextOperation(.load)
      let model = try await environment.makeUnlaunchedModel()
      let firstLaunch = Task { @MainActor in
        await model.launch()
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(.load)

      firstLaunch.cancel()
      let secondLaunch = Task { @MainActor in
        await model.launch()
      }
      await environment.privateStore.releaseBlockedOperation(ticket)
      await firstLaunch.value
      await secondLaunch.value
      let completed = await environment.privateStore.snapshot()

      #expect(model.launchState == .ready)
      #expect(completed.loadCount == 2)
      #expect(model.recoveryState == nil)
    }
  }

  @Test("Stored launch restores a started course")
  func storedLaunch() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let writer = try await environment.makeModel()
      try await startCourse(writer)
      let stored = try #require(try await environment.privateStore.load())

      let relaunchedEnvironment = try environments.makeEnvironment()
      try await relaunchedEnvironment.privateStore.seed(stored)
      let model = try await relaunchedEnvironment.makeModel()

      #expect(model.isCourseStarted)
      #expect(model.learnerState == stored.learnerState)
      #expect(model.remindersEnabled == stored.remindersEnabled)
      #expect(model.recoveryState == nil)
    }
  }

  @Test("Semester Desk creation saves before it applies")
  func semesterDeskCreationSavesBeforeApply() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      await environment.privateStore.blockNextOperation(.save)

      let creation = Task { @MainActor in
        await model.createSemesterDesk(title: "Autumn 2026")
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(.save)
      let blocked = await environment.privateStore.snapshot()
      let candidate = try #require(blocked.saves.last?.state)

      #expect(model.semesterDesk == nil)
      #expect(model.isSemesterDeskOperationRunning)
      #expect(candidate.localProfileID == model.localProfileID)
      #expect(candidate.semesterDesk?.profileID == model.localProfileID)
      #expect(candidate.semesterDesk?.title == "Autumn 2026")

      await environment.privateStore.releaseBlockedOperation(ticket)
      #expect(await creation.value)
      #expect(model.semesterDesk == candidate.semesterDesk)
      #expect(!model.isSemesterDeskOperationRunning)
      #expect(try await environment.privateStore.load() == candidate)
    }
  }

  @Test("Semester Desk commands save before they apply")
  func semesterDeskCommandSavesBeforeApply() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2026"))
      let priorDesk = try #require(model.semesterDesk)
      await environment.privateStore.blockNextOperation(.save)

      let command = UniversitySemesterDeskCommand.addCourse(
        profileID: model.localProfileID,
        code: "MAT220",
        title: "Linear algebra"
      )
      let transition = Task { @MainActor in
        await model.applySemesterDeskCommand(command)
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(.save)
      let blocked = await environment.privateStore.snapshot()
      let candidate = try #require(blocked.saves.last?.state)

      #expect(model.semesterDesk == priorDesk)
      #expect(model.isSemesterDeskOperationRunning)
      #expect(candidate.semesterDesk?.courses.map(\.code) == ["MAT220"])

      await environment.privateStore.releaseBlockedOperation(ticket)
      #expect(await transition.value)
      #expect(model.semesterDesk == candidate.semesterDesk)
      #expect(!model.isSemesterDeskOperationRunning)
      #expect(try await environment.privateStore.load() == candidate)
    }
  }

  @Test("Semester Desk save failure preserves the prior state")
  func semesterDeskSaveFailureIsAtomic() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2026"))
      let priorDesk = try #require(model.semesterDesk)
      let priorStored = try #require(try await environment.privateStore.load())
      await environment.privateStore.setSaveError(.writeVerification)

      let result = await model.applySemesterDeskCommand(
        .addCourse(
          profileID: model.localProfileID,
          code: "MAT220",
          title: "Linear algebra"
        )
      )

      #expect(!result)
      #expect(model.semesterDesk == priorDesk)
      #expect(try await environment.privateStore.load() == priorStored)
      #expect(
        model.recoveryState
          == .saveFailed(message: "FORGE could not save local course data.")
      )
    }
  }

  @Test("Semester Desk save retry restores the durable prior state")
  func semesterDeskSaveRetryRestoresDurableState() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2026"))
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

      #expect(model.recoveryState == nil)
      #expect(model.semesterDesk == priorDesk)
      #expect(try await environment.privateStore.load()?.semesterDesk == priorDesk)
    }
  }

  @Test("A superseded Semester Desk save does not apply")
  func supersededSemesterDeskSaveDoesNotApply() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2026"))
      let priorDesk = try #require(model.semesterDesk)
      await environment.privateStore.setNextSaveResult(.superseded)

      let result = await model.applySemesterDeskCommand(
        .addCourse(
          profileID: model.localProfileID,
          code: "MAT220",
          title: "Linear algebra"
        )
      )

      #expect(!result)
      #expect(model.semesterDesk == priorDesk)
      #expect(model.recoveryState == nil)
    }
  }

  @Test("Cold launch restores the profile-bound Semester Desk")
  func coldLaunchRestoresSemesterDesk() async throws {
    try await withEnvironmentCleanup { environments in
      let writerEnvironment = try environments.makeEnvironment()
      let writer = try await writerEnvironment.makeModel()
      #expect(await writer.createSemesterDesk(title: "Autumn 2026"))
      #expect(
        await writer.applySemesterDeskCommand(
          .addCourse(
            profileID: writer.localProfileID,
            code: "MAT220",
            title: "Linear algebra"
          )
        )
      )
      let stored = try #require(try await writerEnvironment.privateStore.load())

      let readerEnvironment = try environments.makeEnvironment()
      try await readerEnvironment.privateStore.seed(stored)
      let reader = try await readerEnvironment.makeModel()

      #expect(reader.localProfileID == stored.localProfileID)
      #expect(reader.semesterDesk == stored.semesterDesk)
      #expect(reader.semesterDesk?.profileID == reader.localProfileID)
      #expect(reader.semesterDesk?.courses.map(\.code) == ["MAT220"])
    }
  }

  @Test("Profile mismatch enters load recovery")
  func semesterDeskProfileMismatchFailsClosed() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let desk = try UniversitySemesterDeskEngine.create(
        input: .init(profileID: "profile.other", title: "Autumn 2026"),
        runtime: UniversitySemesterDeskRuntime(
          clock: environment.semesterDeskClock,
          identifiers: environment.semesterDeskIdentifiers
        )
      ).get()
      let learnerState = try UniversityStarterCourse.initialState(
        updatedAt: environment.clock.now()
      )
      await environment.privateStore.setLoadOverride(
        PrivateStateEnvelope(
          localProfileID: "profile.local",
          learnerState: learnerState,
          isCourseStarted: false,
          remindersEnabled: false,
          semesterDesk: desk
        )
      )

      let model = try await environment.makeModel()

      #expect(
        model.recoveryState
          == .loadFailed(message: "FORGE could not load local course data.")
      )
      #expect(model.semesterDesk == nil)
    }
  }

  @Test("Projection sync keeps a same-load legacy cleanup failure visible")
  func projectionSyncKeepsLegacyPurgeFailureVisible() async throws {
    try await withEnvironmentCleanup { environments in
      let suiteName = "FORGEAppTests.Legacy.\(UUID().uuidString)"
      let defaults = try #require(RemovalResistantDefaults(suiteName: suiteName))
      defaults.protectedKey = "forge.snapshot.v1"
      defaults.set("legacy", forKey: defaults.protectedKey ?? "")
      let environment = try environments.makeEnvironment(
        legacyDefaults: defaults,
        legacySuiteName: suiteName
      )

      let writer = try await environment.makeModel()
      _ = try await makeScheduledReturn(writer, environment: environment)
      let stored = try #require(try await environment.privateStore.load())
      let existingProjection = try #require(
        try environment.sharedStore.loadProjection()
      )
      let relaunchedEnvironment = try environments.makeEnvironment(
        legacyDefaults: defaults,
        legacySuiteName: suiteName
      )
      try await relaunchedEnvironment.privateStore.seed(stored)
      try relaunchedEnvironment.sharedStore.saveProjection(existingProjection)
      let reloadsBeforeLoad = relaunchedEnvironment.widgetReloadCount

      let model = try await relaunchedEnvironment.makeModel(
        now: { existingProjection.generatedAt }
      )
      let projection = try #require(
        try relaunchedEnvironment.sharedStore.loadProjection()
      )

      #expect(model.recoveryState == nil)
      #expect(projection.lifecycle == .scheduled)
      #expect(
        model.localIntegrationStatusMessage
          == "FORGE could not remove legacy shared data."
      )
      #expect(
        relaunchedEnvironment.widgetReloadCount == reloadsBeforeLoad
      )
    }
  }

  @Test("Invalid stored state enters load recovery")
  func invalidStoredStateRecovery() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let storedState = try UniversityStarterCourse.initialState(
        updatedAt: environment.clock.now()
      )
      try await environment.privateStore.seed(
        PrivateStateEnvelope(
          learnerState: storedState,
          isCourseStarted: true,
          remindersEnabled: false
        )
      )
      try await environment.writeUnsupportedSchema()

      let model = try await environment.makeModel()

      #expect(
        model.recoveryState
          == .loadFailed(message: "FORGE could not load local course data.")
      )
      #expect(!model.isCourseStarted)
      #expect(!model.isActivityPresented)
    }
  }

  @Test("Protected local data preserves integration state and restores after retry")
  func protectedDataRecovery() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let storedState = try UniversityStarterCourse.initialState(
        updatedAt: environment.clock.now()
      )
      let storedEnvelope = PrivateStateEnvelope(
        learnerState: storedState,
        isCourseStarted: true,
        remindersEnabled: false
      )
      let opensAt = Date(timeIntervalSince1970: 2_000_100_000)
      let projection = try ForgeReturnProjection(
        lifecycle: .scheduled,
        opensAt: opensAt,
        dueAt: opensAt.addingTimeInterval(86_400),
        generatedAt: opensAt.addingTimeInterval(-1),
        validUntil: opensAt.addingTimeInterval(86_400)
      )

      try await environment.privateStore.seed(storedEnvelope)
      try environment.sharedStore.saveProjection(projection)
      try environment.sharedStore.setPendingFocus()
      environment.notificationCenter.pendingIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier
      ]
      await environment.privateStore.setLoadError(PrivateStateStoreError.protectedDataUnavailable)
      let model = try await environment.makeModel(initialScenePhase: .inactive)

      #expect(
        model.recoveryState
          == .protectedDataUnavailable(
            message: "Local data is unavailable. Unlock the device, then retry."
          )
      )
      #expect(!model.isCourseStarted)
      #expect(try environment.sharedStore.loadProjection() == projection)
      #expect(try environment.sharedStore.consumePendingFocus())
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == [TestNotificationCenter.managedReminderIdentifier]
      )

      await environment.privateStore.setLoadError(nil)
      model.retryLocalDataLoad()
      await model.waitForRecoveryOperationForTesting()

      #expect(model.recoveryState == nil)
      #expect(model.isCourseStarted)
      #expect(model.learnerState == storedEnvelope.learnerState)
    }
  }

  @Test("Protected recovery preserves pending focus and managed reminders")
  func protectedRecoveryPreservesIntegrationInputs() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      await environment.privateStore.setLoadError(
        PrivateStateStoreError.protectedDataUnavailable
      )
      let model = try await environment.makeModel(
        initialScenePhase: .inactive
      )
      try environment.sharedStore.setPendingFocus()
      environment.notificationCenter.pendingIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier,
        TestNotificationCenter.staleManagedReminderIdentifier,
      ]
      environment.notificationCenter.deliveredIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier,
        TestNotificationCenter.staleManagedReminderIdentifier,
      ]
      let pendingLookups =
        environment.notificationCenter.pendingLookupCount
      let deliveredLookups =
        environment.notificationCenter.deliveredLookupCount

      model.handleScenePhaseChange(.active)
      model.consumePendingFocus()
      model.reconcileReminders()
      await model.waitForFocusOperationForTesting()
      await model.waitForReminderOperationForTesting()

      #expect(try environment.sharedStore.consumePendingFocus())
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == [
            TestNotificationCenter.managedReminderIdentifier,
            TestNotificationCenter.staleManagedReminderIdentifier,
          ]
      )
      #expect(
        environment.notificationCenter.deliveredIdentifiers
          == [
            TestNotificationCenter.managedReminderIdentifier,
            TestNotificationCenter.staleManagedReminderIdentifier,
          ]
      )
      #expect(
        environment.notificationCenter.pendingLookupCount
          == pendingLookups
      )
      #expect(
        environment.notificationCenter.deliveredLookupCount
          == deliveredLookups
      )
      #expect(!model.isActivityPresented)
    }
  }

  @Test("Legacy local state has stable recovery across retries")
  func legacyStateRecovery() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let legacyFileURL = environment.privateFileURL
        .deletingLastPathComponent()
        .appendingPathComponent(
          PrivateStateStore.v4StateFileName,
          isDirectory: false
        )
      let legacyBytes = Data("{\"schemaVersion\":4}".utf8)
      let expectedRecovery = AppModelRecoveryState.loadFailed(
        message:
          "FORGE found older local course data. This version did not open, change, or replace that data. Clear local data to start again."
      )

      try legacyBytes.write(to: legacyFileURL)
      let model = try await environment.makeModel(initialScenePhase: .inactive)

      #expect(model.recoveryState == expectedRecovery)
      #expect(try Data(contentsOf: legacyFileURL) == legacyBytes)
      let initialSnapshot = await environment.privateStore.snapshot()
      #expect(initialSnapshot.loadCount == 1)
      #expect(initialSnapshot.saveCount == 0)
      #expect(initialSnapshot.clearCount == 0)

      model.retryLocalDataLoad()
      await model.waitForRecoveryOperationForTesting()

      #expect(model.recoveryState == expectedRecovery)
      #expect(try Data(contentsOf: legacyFileURL) == legacyBytes)
      let retrySnapshot = await environment.privateStore.snapshot()
      #expect(retrySnapshot.loadCount == 2)
      #expect(retrySnapshot.saveCount == 0)
      #expect(retrySnapshot.clearCount == 0)
    }
  }

  @Test("Private load failure clears stale shared state once")
  func privateLoadFailureClearsSharedState() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let opensAt = Date(timeIntervalSince1970: 2_000_100_000)
      let dueAt = opensAt.addingTimeInterval(86_400)
      try environment.sharedStore.saveProjection(
        ForgeReturnProjection(
          lifecycle: .scheduled,
          opensAt: opensAt,
          dueAt: dueAt,
          generatedAt: opensAt.addingTimeInterval(-1),
          validUntil: dueAt
        )
      )
      try environment.sharedStore.setPendingFocus()
      await environment.privateStore.setLoadError(PrivateStateStoreError.corruptData)

      let model = try await environment.makeModel()

      #expect(
        model.recoveryState
          == .loadFailed(message: "FORGE could not load local course data.")
      )
      #expect(try environment.sharedStore.loadProjection() == nil)
      #expect(!(try environment.sharedStore.consumePendingFocus()))
      #expect(environment.widgetReloadCount == 1)
    }
  }

  @Test("Private load failure reports shared cleanup failure after one reload")
  func privateLoadFailureReportsSharedCleanupFailure() async throws {
    try await withEnvironmentCleanup { environments in
      let suiteName = "FORGEAppTests.SharedCleanup.(UUID().uuidString)"
      let defaults = try #require(RemovalResistantDefaults(suiteName: suiteName))
      defaults.protectedKey = "forge.snapshot.v1"
      defaults.set("legacy", forKey: defaults.protectedKey ?? "")
      let environment = try environments.makeEnvironment(
        legacyDefaults: defaults,
        legacySuiteName: suiteName
      )

      let opensAt = Date(timeIntervalSince1970: 2_000_200_000)
      let dueAt = opensAt.addingTimeInterval(86_400)
      try environment.sharedStore.saveProjection(
        ForgeReturnProjection(
          lifecycle: .scheduled,
          opensAt: opensAt,
          dueAt: dueAt,
          generatedAt: opensAt.addingTimeInterval(-1),
          validUntil: dueAt
        )
      )
      try environment.sharedStore.setPendingFocus()
      await environment.privateStore.setLoadError(PrivateStateStoreError.corruptData)

      let model = try await environment.makeModel()

      #expect(
        model.recoveryState
          == .loadFailed(message: "FORGE could not load local course data.")
      )
      #expect(
        model.localIntegrationStatusMessage
          == "FORGE could not clear shared return data."
      )
      #expect(try environment.sharedStore.loadProjection() == nil)
      #expect(!(try environment.sharedStore.consumePendingFocus()))
      #expect(environment.widgetReloadCount == 1)
    }
  }

  @Test("Course start saves before it applies state")
  func startSavesBeforeApply() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      let before = await environment.privateStore.snapshot()
      await environment.privateStore.blockNextOperation(.save)
      let startTask = Task { @MainActor in
        await model.startUniversityCourse()
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(.save)
      let duringSave = await environment.privateStore.snapshot()

      #expect(!model.isCourseStarted)
      #expect(duringSave.saves.last?.state.isCourseStarted == true)
      await environment.privateStore.releaseBlockedOperation(ticket)
      #expect(await startTask.value)
      let saved = try #require(try await environment.privateStore.load())
      let after = await environment.privateStore.snapshot()

      #expect(saved.isCourseStarted)
      #expect(model.isCourseStarted)
      #expect(after.saveCount == before.saveCount + 1)
    }
  }

  @Test("Course start does not apply state after a save failure")
  func startSaveFailure() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      await environment.privateStore.setSaveError(PrivateStateStoreError.writeVerification)

      #expect(!(await model.startUniversityCourse()))

      #expect(!model.isCourseStarted)
      #expect(
        model.recoveryState
          == .saveFailed(message: "FORGE could not save local course data.")
      )
      #expect(try await environment.privateStore.load() == nil)
    }
  }

  @Test("Course setup review saves before it dismisses the current activity")
  func reviewCourseSetupSavesBeforeApply() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      model.presentActivity()
      await environment.privateStore.blockNextOperation(.save)
      let reviewTask = Task { @MainActor in
        await model.reviewCourseSetup()
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(.save)
      let duringSave = await environment.privateStore.snapshot()

      #expect(model.isCourseStarted)
      #expect(model.isActivityPresented)
      #expect(duringSave.saves.last?.state.isCourseStarted == false)
      await environment.privateStore.releaseBlockedOperation(ticket)
      await reviewTask.value
      let stored = try #require(try await environment.privateStore.load())

      #expect(!stored.isCourseStarted)
      #expect(!model.isCourseStarted)
      #expect(!model.isActivityPresented)
      #expect(model.courseStartStatusMessage == nil)
    }
  }

  @Test("Course setup review clears a scheduled shared projection")
  func reviewCourseSetupClearsScheduledSharedProjection() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      let projection = try #require(try environment.sharedStore.loadProjection())
      let reloadsBeforeReview = environment.widgetReloadCount

      #expect(projection.lifecycle == .scheduled)

      await model.reviewCourseSetup()

      #expect(!model.isCourseStarted)
      #expect(try environment.sharedStore.loadProjection() == nil)
      #expect(environment.widgetReloadCount == reloadsBeforeReview + 1)
    }
  }

  @Test("Cold load clears a projection for an unstarted course")
  func coldLoadUnstartedCourseClearsSharedProjection() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let writer = try await environment.makeModel()
      _ = try await makeScheduledReturn(writer, environment: environment)
      let stored = try #require(try await environment.privateStore.load())
      let staleProjection = try #require(try environment.sharedStore.loadProjection())
      let relaunchedEnvironment = try environments.makeEnvironment()
      try await relaunchedEnvironment.privateStore.seed(
        PrivateStateEnvelope(
          learnerState: stored.learnerState,
          isCourseStarted: false,
          remindersEnabled: stored.remindersEnabled
        )
      )
      try relaunchedEnvironment.sharedStore.saveProjection(staleProjection)
      let reloadsBeforeLoad = relaunchedEnvironment.widgetReloadCount

      #expect(staleProjection.lifecycle == .scheduled)

      let model = try await relaunchedEnvironment.makeModel()

      #expect(!model.isCourseStarted)
      #expect(model.recoveryState == nil)
      #expect(try relaunchedEnvironment.sharedStore.loadProjection() == nil)
      #expect(
        relaunchedEnvironment.widgetReloadCount == reloadsBeforeLoad + 1
      )
    }
  }

  @Test("Cold load skips a widget reload for an unchanged shared projection")
  func coldLoadSkipsWidgetReloadForUnchangedProjection() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let writer = try await environment.makeModel()
      _ = try await makeScheduledReturn(writer, environment: environment)
      let stableProjection = try #require(try environment.sharedStore.loadProjection())
      let stored = try #require(try await environment.privateStore.load())
      let relaunchedEnvironment = try environments.makeEnvironment()
      try await relaunchedEnvironment.privateStore.seed(stored)
      try relaunchedEnvironment.sharedStore.saveProjection(stableProjection)
      let reloadsBeforeLoad = relaunchedEnvironment.widgetReloadCount

      let model = try await relaunchedEnvironment.makeModel(
        now: { stableProjection.generatedAt }
      )

      #expect(model.isCourseStarted)
      #expect(relaunchedEnvironment.widgetReloadCount == reloadsBeforeLoad)
    }
  }

  @Test("Course setup review keeps course state when saving fails")
  func reviewCourseSetupSaveFailure() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      model.presentActivity()
      let draft = ActivityDraft(
        selectedChoice: "stays_constant_after_force",
        responseText: "Keep this reasoning after a failed setup review."
      )
      model.updateCurrentActivityDraft(
        selectedChoice: draft.selectedChoice,
        responseText: draft.responseText
      )
      let storedBeforeReview = try #require(try await environment.privateStore.load())
      await environment.privateStore.setSaveError(PrivateStateStoreError.writeVerification)

      await model.reviewCourseSetup()
      let storedAfterReview = try #require(try await environment.privateStore.load())

      #expect(model.isCourseStarted)
      #expect(!model.isActivityPresented)
      #expect(model.currentActivityDraft == draft)
      #expect(storedAfterReview == storedBeforeReview)
      #expect(
        model.courseStartStatusMessage == "FORGE could not open course setup."
      )
      #expect(
        model.recoveryState
          == .saveFailed(message: "FORGE could not save local course data.")
      )
    }
  }

  @Test("Failed course review preserves the retained scheduled reminder")
  func failedReviewPreservesRetainedReminder() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      model.setRemindersEnabled(true)
      try await waitForReminderOperation(model)
      let storedBeforeReview = try #require(
        try await environment.privateStore.load()
      )
      let additionsBeforeReview =
        environment.notificationCenter.addedIdentifiers.count
      await environment.privateStore.setSaveError(
        PrivateStateStoreError.writeVerification
      )

      await model.reviewCourseSetup()
      try await waitForReminderOperation(model)
      let storedAfterReview = try #require(
        try await environment.privateStore.load()
      )

      #expect(model.isCourseStarted)
      #expect(model.remindersEnabled)
      #expect(storedAfterReview == storedBeforeReview)
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == [TestNotificationCenter.managedReminderIdentifier]
      )
      #expect(
        environment.notificationCenter.addedIdentifiers.count
          == additionsBeforeReview
      )
      #expect(
        model.recoveryState
          == .saveFailed(message: "FORGE could not save local course data.")
      )
    }
  }

  @Test("Protected course review preserves focus and reminder integration")
  func protectedReviewPreservesIntegrationState() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      model.setRemindersEnabled(true)
      try await waitForReminderOperation(model)
      try environment.sharedStore.setPendingFocus()
      environment.notificationCenter.pendingIdentifiers.insert(
        TestNotificationCenter.staleManagedReminderIdentifier
      )
      environment.notificationCenter.deliveredIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier,
        TestNotificationCenter.staleManagedReminderIdentifier,
      ]
      let storedBeforeReview = try #require(
        try await environment.privateStore.load()
      )
      let pendingBeforeReview =
        environment.notificationCenter.pendingIdentifiers
      let deliveredBeforeReview =
        environment.notificationCenter.deliveredIdentifiers
      let additionsBeforeReview =
        environment.notificationCenter.addedIdentifiers.count
      await environment.privateStore.setSaveError(
        PrivateStateStoreError.protectedDataUnavailable
      )

      await model.reviewCourseSetup()
      let storedAfterReview = try #require(
        try await environment.privateStore.load()
      )

      #expect(model.isCourseStarted)
      #expect(model.remindersEnabled)
      #expect(storedAfterReview == storedBeforeReview)
      #expect(try environment.sharedStore.consumePendingFocus())
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == pendingBeforeReview
      )
      #expect(
        environment.notificationCenter.deliveredIdentifiers
          == deliveredBeforeReview
      )
      #expect(
        environment.notificationCenter.addedIdentifiers.count
          == additionsBeforeReview
      )
      #expect(
        model.recoveryState
          == .protectedDataUnavailable(
            message: "Local data is unavailable. Unlock the device, then retry."
          )
      )
    }
  }

  @Test("Wrong practice response records a non-demonstrated receipt")
  func wrongPracticeReceipt() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)

      let outcome = await model.submitCurrentActivity(
        selectedChoice: "changes_direction",
        responseText: "The force changed the velocity after removal."
      )
      let receipt = try #require(model.learnerState.evidence.first)

      #expect(outcome == .recorded(.notDemonstrated))
      #expect(receipt.activityKind == .practice)
      #expect(receipt.validatorResult == .notDemonstrated)
      #expect(model.currentActivity?.kind == .practice)
    }
  }

  @Test("Correct practice response advances to proof")
  func correctPracticeAdvance() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      try await recordDemonstratedPractice(model)

      let receipt = try #require(model.learnerState.evidence.first)

      #expect(receipt.activityKind == .practice)
      #expect(receipt.validatorResult == .demonstrated)
      #expect(model.currentActivity?.kind == .proof)
    }
  }

  @Test("Correct proof response schedules a linked delayed return")
  func correctProofSchedulesReturn() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      try await recordDemonstratedPractice(model)
      try await recordDemonstratedProof(model)

      let proofReceipt = try #require(model.learnerState.evidence.last)
      let delayedReturn = try onlyDelayedReturn(in: model)

      #expect(proofReceipt.activityKind == .proof)
      #expect(proofReceipt.validatorResult == .demonstrated)
      #expect(delayedReturn.originEvidenceID == proofReceipt.id)
      #expect(delayedReturn.opensAt == proofReceipt.recordedAt.addingTimeInterval(7 * 86_400))
      #expect(delayedReturn.dueAt == delayedReturn.opensAt.addingTimeInterval(30 * 86_400))
      #expect(model.currentActivity?.kind == .delayedReturn)
    }
  }

  @Test("Scheduled return blocks activity presentation and submission")
  func scheduledReturnGate() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      let stateBeforeSubmission = model.learnerState

      model.presentActivity()
      let outcome = await model.submitCurrentActivity(
        selectedChoice: "constant_positive_velocity",
        responseText: "The velocity remains positive and constant."
      )

      #expect(!model.canPresentCurrentActivity)
      #expect(!model.isActivityPresented)
      #expect(outcome == .failed("FORGE could not record this local activity."))
      #expect(model.learnerState == stateBeforeSubmission)
    }
  }

  @Test("Focus URL refreshes scheduled return eligibility before presentation")
  func focusURLRefreshesScheduledReturnEligibility() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(model, environment: environment)
      environment.clock.setNext(to: delayedReturn.opensAt.addingTimeInterval(1))

      model.route(try validURL("forge://focus"))

      #expect(model.currentDelayedReturn?.status == .open)
      #expect(model.isActivityPresented)
    }
  }

  @Test("Pending focus refreshes scheduled return eligibility before presentation")
  func pendingFocusRefreshesScheduledReturnEligibility() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(model, environment: environment)
      environment.clock.setNext(to: delayedReturn.opensAt.addingTimeInterval(1))
      try environment.sharedStore.setPendingFocus()

      model.consumePendingFocus()
      await model.waitForFocusOperationForTesting()

      #expect(model.currentDelayedReturn?.status == .open)
      #expect(model.isActivityPresented)
      #expect(!(try environment.sharedStore.consumePendingFocus()))
    }
  }

  @Test("Opened return becomes available to the current activity")
  func openedReturn() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(model, environment: environment)

      environment.clock.setNext(to: delayedReturn.opensAt.addingTimeInterval(1))
      model.handleScenePhaseChange(.active)

      #expect(model.currentDelayedReturn?.status == .open)
      #expect(model.canPresentCurrentActivity)

      model.presentActivity()
      #expect(model.isActivityPresented)

      try await waitForReminderOperation(model)
    }
  }

  @Test("Due returns permit work and expired returns block it")
  func dueAndExpiredReturnGates() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(model, environment: environment)

      environment.clock.setNext(
        to: delayedReturn.dueAt.addingTimeInterval(-2)
      )
      model.handleScenePhaseChange(.active)

      #expect(model.canPresentCurrentActivity)
      environment.clock.setNext(to: delayedReturn.dueAt)
      model.presentActivity()
      #expect(model.currentDelayedReturn?.status == .due)
      #expect(model.isActivityPresented)
      model.dismissActivity()

      try await waitForReminderOperation(model)
      environment.clock.setNext(to: delayedReturn.dueAt.addingTimeInterval(10))
      model.handleScenePhaseChange(.active)
      let stateBeforeSubmission = model.learnerState

      model.presentActivity()
      let outcome = await model.submitCurrentActivity(
        selectedChoice: "constant_positive_velocity",
        responseText: "The return is no longer available."
      )

      #expect(model.currentDelayedReturn?.status == .expired)
      #expect(!model.canPresentCurrentActivity)
      #expect(!model.isActivityPresented)
      #expect(outcome == .failed("FORGE could not record this local activity."))
      #expect(model.learnerState == stateBeforeSubmission)

      try await waitForReminderOperation(model)
    }
  }

  @Test("Completed return links the completion receipt")
  func linkedReturnCompletion() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(model, environment: environment)

      environment.clock.setNext(to: delayedReturn.opensAt.addingTimeInterval(1))
      model.handleScenePhaseChange(.active)
      await model.waitForSharedProjectionOperationForTesting()
      try await waitForReminderOperation(model)

      let widgetReloadsBeforeCompletion = environment.widgetReloadCount
      let outcome = await model.submitCurrentActivity(
        selectedChoice: "constant_positive_velocity",
        responseText: "The velocity stays positive and constant after the force stops."
      )
      let completionReceipt = try #require(model.learnerState.evidence.last)
      let completedReturn = try onlyDelayedReturn(in: model)

      #expect(outcome == .recorded(.demonstrated))
      #expect(completedReturn.id == delayedReturn.id)
      #expect(completedReturn.completedAt == completionReceipt.recordedAt)
      #expect(completedReturn.completionEvidenceID == completionReceipt.id)
      #expect(completionReceipt.activityID == delayedReturn.activityID)
      #expect(completionReceipt.activityKind == .delayedReturn)
      #expect(environment.widgetReloadCount == widgetReloadsBeforeCompletion + 1)
      #expect(!model.canPresentCurrentActivity)
      model.presentActivity()
      #expect(!model.isActivityPresented)

      try await waitForReminderOperation(model)
    }
  }

  @Test("Raw response text is excluded from private storage")
  func rawResponseExclusion() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      let rawResponse = "RAW_RESPONSE_MUST_NOT_PERSIST_6B39408C"

      try requireRecorded(
        await model.submitCurrentActivity(
          selectedChoice: "stays_constant_after_force",
          responseText: rawResponse
        ),
        expected: .demonstrated
      )

      let persistedText = String(
        decoding: try await environment.privateStore.rawData(),
        as: UTF8.self
      )

      #expect(!persistedText.contains(rawResponse))
      #expect(!persistedText.contains("responseText"))
      #expect(model.learnerState.evidence.count == 1)
    }
  }

  @Test("In-memory activity drafts survive temporary lifecycle and root-route dismissals")
  func activityDraftSurvivesTemporaryDismissals() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      try await startCourse(model)
      let draft = ActivityDraft(
        selectedChoice: "stays_constant_after_force",
        responseText: "The force no longer changes the velocity."
      )

      model.presentActivity()
      model.updateCurrentActivityDraft(
        selectedChoice: draft.selectedChoice,
        responseText: draft.responseText
      )
      model.handleScenePhaseChange(.background)
      model.handleScenePhaseChange(.active)
      model.handleTimeEnvironmentChange()
      model.route(try validURL("forge://settings"))
      await model.waitForFocusOperationForTesting()

      #expect(!model.isActivityPresented)
      #expect(model.currentActivityDraft == draft)

      model.presentActivity()

      #expect(model.isActivityPresented)
      #expect(model.currentActivityDraft == draft)
    }
  }

  @Test("Failed activity submissions keep in-memory raw drafts out of private storage")
  func failedActivitySubmissionRetainsDraftWithoutPersistence() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      try await startCourse(model)
      let rawDraftText = "DRAFT_MUST_NOT_PERSIST_6B39408C"

      model.updateCurrentActivityDraft(
        selectedChoice: "stays_constant_after_force",
        responseText: rawDraftText
      )
      model.handleScenePhaseChange(.background)
      await Task.yield()
      await environment.privateStore.setSaveError(
        PrivateStateStoreError.writeVerification
      )

      let outcome = await model.submitCurrentActivity(
        selectedChoice: "stays_constant_after_force",
        responseText: rawDraftText
      )
      let persistedText = String(
        decoding: try await environment.privateStore.rawData(),
        as: UTF8.self
      )

      #expect(outcome == .failed("FORGE could not record this local activity."))
      #expect(
        model.currentActivityDraft
          == ActivityDraft(
            selectedChoice: "stays_constant_after_force",
            responseText: rawDraftText
          )
      )
      #expect(!persistedText.contains(rawDraftText))
      #expect(!persistedText.contains("responseText"))
    }
  }

  @Test(
    "Activity drafts clear after explicit discard, completed submission, course review, and reset"
  )
  func activityDraftClearingBoundaries() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      try await startCourse(model)

      model.updateCurrentActivityDraft(
        selectedChoice: "stays_constant_after_force",
        responseText: "Discard this reasoning."
      )
      model.discardCurrentActivityDraft()
      #expect(model.currentActivityDraft == .empty)

      model.updateCurrentActivityDraft(
        selectedChoice: "changes_direction",
        responseText: "Complete an unsuccessful reasoning check."
      )
      try requireRecorded(
        await model.submitCurrentActivity(
          selectedChoice: "changes_direction",
          responseText: "Complete an unsuccessful reasoning check."
        ),
        expected: .notDemonstrated
      )
      #expect(model.currentActivityDraft == .empty)

      model.updateCurrentActivityDraft(
        selectedChoice: "stays_constant_after_force",
        responseText: "Complete this reasoning."
      )
      try requireRecorded(
        await model.submitCurrentActivity(
          selectedChoice: "stays_constant_after_force",
          responseText: "Complete this reasoning."
        ),
        expected: .demonstrated
      )
      #expect(model.currentActivityDraft == .empty)

      model.updateCurrentActivityDraft(
        selectedChoice: "stays_constant_after_force",
        responseText: "Review this setup."
      )
      await model.reviewCourseSetup()
      #expect(model.currentActivityDraft == .empty)

      try await startCourse(model)
      model.updateCurrentActivityDraft(
        selectedChoice: "stays_constant_after_force",
        responseText: "Reset this reasoning."
      )
      model.clearLocalData()
      try await waitForReset(model)

      #expect(model.currentActivityDraft == .empty)
    }
  }

  @Test("Submission save failure preserves the previous state")
  func submissionSaveFailureIsAtomic() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      model.presentActivity()
      let stateBeforeSubmission = model.learnerState
      let storedBeforeSubmission = try #require(try await environment.privateStore.load())
      await environment.privateStore.setSaveError(PrivateStateStoreError.writeVerification)

      let outcome = await model.submitCurrentActivity(
        selectedChoice: "stays_constant_after_force",
        responseText: "A response that should not change persisted state."
      )
      let storedAfterSubmission = try #require(try await environment.privateStore.load())

      #expect(outcome == .failed("FORGE could not record this local activity."))
      #expect(model.learnerState == stateBeforeSubmission)
      #expect(storedAfterSubmission == storedBeforeSubmission)
      #expect(!model.isActivityPresented)
      #expect(
        model.recoveryState
          == .saveFailed(message: "FORGE could not save local course data.")
      )
    }
  }

  @Test("Background persistence cannot supersede a gated submission")
  func backgroundDoesNotSupersedeSubmission() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      try await startCourse(model)
      try await waitForReminderOperation(model)
      model.presentActivity()
      await environment.privateStore.blockNextOperation(.save)
      let submissionTask = Task { @MainActor in
        await model.submitCurrentActivity(
          selectedChoice: "stays_constant_after_force",
          responseText: "The velocity stays constant after the force is removed."
        )
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(.save)
      let duringSubmission = await environment.privateStore.snapshot()

      model.handleScenePhaseChange(.background)
      await Task.yield()
      let afterBackground = await environment.privateStore.snapshot()

      #expect(afterBackground.saveCount == duringSubmission.saveCount)
      await environment.privateStore.releaseBlockedOperation(ticket)
      #expect(await submissionTask.value == .recorded(.demonstrated))
      #expect(model.learnerState.evidence.count == 1)
    }
  }

  @Test("A duplicate submission cannot pass a gated first save")
  func duplicateSubmissionDoesNotRecordTwice() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      try await startCourse(model)
      model.presentActivity()
      await environment.privateStore.blockNextOperation(.save)
      let firstSubmission = Task { @MainActor in
        await model.submitCurrentActivity(
          selectedChoice: "stays_constant_after_force",
          responseText: "The velocity stays constant after the force is removed."
        )
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(
        .save
      )
      let savesDuringFirstSubmission = await environment.privateStore
        .snapshot().saveCount

      let duplicateOutcome = await model.submitCurrentActivity(
        selectedChoice: "stays_constant_after_force",
        responseText: "This duplicate must not create another receipt."
      )
      let savesAfterDuplicate = await environment.privateStore.snapshot()
        .saveCount

      #expect(
        duplicateOutcome
          == .failed("FORGE could not record this local activity.")
      )
      #expect(savesAfterDuplicate == savesDuringFirstSubmission)

      await environment.privateStore.releaseBlockedOperation(ticket)
      #expect(await firstSubmission.value == .recorded(.demonstrated))
      let stored = try #require(try await environment.privateStore.load())

      #expect(model.learnerState.evidence.count == 1)
      #expect(stored.learnerState.evidence.count == 1)
    }
  }

  @Test("Nonfinite submission time preserves local activity data")
  func nonfiniteSubmissionClockPreservesState() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      model.presentActivity()
      let stateBeforeSubmission = model.learnerState
      let storedBeforeSubmission = try #require(try await environment.privateStore.load())
      let widgetReloadsBeforeSubmission = environment.widgetReloadCount
      environment.clock.setNext(
        to: Date(timeIntervalSinceReferenceDate: .infinity)
      )

      let outcome = await model.submitCurrentActivity(
        selectedChoice: "stays_constant_after_force",
        responseText: "This attempt has no usable local time."
      )
      let storedAfterSubmission = try #require(try await environment.privateStore.load())

      #expect(outcome == .failed("FORGE could not record this local activity."))
      #expect(model.learnerState == stateBeforeSubmission)
      #expect(storedAfterSubmission == storedBeforeSubmission)
      #expect(!model.isActivityPresented)
      #expect(
        model.experienceErrorMessage == "Current local activity data is unavailable."
      )
      #expect(environment.widgetReloadCount == widgetReloadsBeforeSubmission)
    }
  }

  @Test("Protected submission save enters protected recovery without clearing data")
  func protectedSubmissionSaveRecovery() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      model.presentActivity()
      let stateBeforeSubmission = model.learnerState
      let storedBeforeSubmission = try #require(try await environment.privateStore.load())
      let beforeSubmission = await environment.privateStore.snapshot()
      await environment.privateStore.setSaveError(PrivateStateStoreError.protectedDataUnavailable)

      let outcome = await model.submitCurrentActivity(
        selectedChoice: "stays_constant_after_force",
        responseText: "The velocity stays constant after the force is removed."
      )
      let storedAfterSubmission = try #require(try await environment.privateStore.load())

      #expect(outcome == .failed("FORGE could not record this local activity."))
      #expect(model.learnerState == stateBeforeSubmission)
      #expect(storedAfterSubmission == storedBeforeSubmission)
      #expect(!model.isActivityPresented)
      #expect(
        model.recoveryState
          == .protectedDataUnavailable(
            message: "Local data is unavailable. Unlock the device, then retry."
          )
      )
      #expect(!model.allowsClearLocalDataDuringRecovery)

      model.clearLocalData()
      let afterClearRequest = await environment.privateStore.snapshot()
      #expect(!model.isLocalDataResetRunning)
      #expect(afterClearRequest.clearCount == beforeSubmission.clearCount)
    }
  }

  @Test("Reminder enable and disable persist the local preference")
  func reminderEnableAndDisablePersistence() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)

      model.setRemindersEnabled(true)
      try await waitForReminderOperation(model)
      let enabledEnvelope = try #require(try await environment.privateStore.load())

      #expect(model.remindersEnabled)
      #expect(enabledEnvelope.remindersEnabled)
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == [TestNotificationCenter.managedReminderIdentifier]
      )

      environment.notificationCenter.pendingIdentifiers.insert("external.pending")
      environment.notificationCenter.deliveredIdentifiers.insert("external.delivered")

      model.setRemindersEnabled(false)
      try await waitForReminderOperation(model)
      let disabledEnvelope = try #require(try await environment.privateStore.load())

      #expect(!model.remindersEnabled)
      #expect(!disabledEnvelope.remindersEnabled)
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == Set(["external.pending"])
      )
      #expect(
        environment.notificationCenter.deliveredIdentifiers
          == Set(["external.delivered"])
      )
    }
  }

  @Test("Protected reminder disable preserves all managed notifications")
  func protectedReminderDisablePreservesManagedNotifications() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      model.setRemindersEnabled(true)
      try await waitForReminderOperation(model)
      environment.notificationCenter.pendingIdentifiers.insert(
        TestNotificationCenter.staleManagedReminderIdentifier
      )
      environment.notificationCenter.deliveredIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier,
        TestNotificationCenter.staleManagedReminderIdentifier,
        "external.delivered",
      ]
      environment.notificationCenter.pendingIdentifiers.insert(
        "external.pending"
      )
      let pendingBeforeDisable =
        environment.notificationCenter.pendingIdentifiers
      let deliveredBeforeDisable =
        environment.notificationCenter.deliveredIdentifiers
      let storedBeforeDisable = try #require(
        try await environment.privateStore.load()
      )
      await environment.privateStore.setSaveError(
        PrivateStateStoreError.protectedDataUnavailable
      )

      model.setRemindersEnabled(false)
      try await waitForReminderOperation(model)
      let storedAfterDisable = try #require(
        try await environment.privateStore.load()
      )

      #expect(model.remindersEnabled)
      #expect(storedBeforeDisable.remindersEnabled)
      #expect(storedAfterDisable == storedBeforeDisable)
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == pendingBeforeDisable
      )
      #expect(
        environment.notificationCenter.deliveredIdentifiers
          == deliveredBeforeDisable
      )
      #expect(
        model.recoveryState
          == .protectedDataUnavailable(
            message: "Local data is unavailable. Unlock the device, then retry."
          )
      )
    }
  }

  @Test("Background persistence cannot supersede a reminder preference save")
  func backgroundDoesNotSupersedeReminderSave() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      await environment.privateStore.blockNextOperation(.save)

      model.setRemindersEnabled(true)
      let ticket = await environment.privateStore.waitForBlockedOperation(.save)
      let duringReminderSave = await environment.privateStore.snapshot()
      model.handleScenePhaseChange(.background)
      await Task.yield()
      let afterBackground = await environment.privateStore.snapshot()

      #expect(afterBackground.saveCount == duringReminderSave.saveCount)
      await environment.privateStore.releaseBlockedOperation(ticket)
      try await waitForReminderOperation(model)
      #expect(model.remindersEnabled)
    }
  }

  @Test("Denied reminder authorization keeps the local preference disabled")
  func reminderAuthorizationDenied() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      environment.notificationCenter.authorizationResult = false

      model.setRemindersEnabled(true)
      try await waitForReminderOperation(model)
      let stored = try #require(try await environment.privateStore.load())

      #expect(!model.remindersEnabled)
      #expect(!stored.remindersEnabled)
      #expect(environment.notificationCenter.pendingIdentifiers.isEmpty)
      #expect(environment.notificationCenter.authorizationRequestCount == 1)
      #expect(
        model.reminderStatusMessage
          == "No eligible return is available for a local reminder."
      )
    }
  }

  @Test("Reminder removal failure keeps the enabled preference")
  func reminderCleanupFailureKeepsPreference() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      model.setRemindersEnabled(true)
      try await waitForReminderOperation(model)
      environment.notificationCenter.preventRemoval = true

      model.setRemindersEnabled(false)
      try await waitForReminderOperation(model)
      let stored = try #require(try await environment.privateStore.load())

      #expect(model.remindersEnabled)
      #expect(stored.remindersEnabled)
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == [TestNotificationCenter.managedReminderIdentifier]
      )
      #expect(
        model.reminderStatusMessage == "FORGE could not update the local reminder."
      )
      #expect(model.recoveryState == nil)
    }
  }

  @Test("Reminder scheduling failure keeps the enabled preference")
  func reminderSchedulingFailureKeepsPreference() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      model.setRemindersEnabled(true)
      try await waitForReminderOperation(model)
      environment.notificationCenter.addError = PrivateStateStoreError.writeVerification

      model.reconcileReminders()
      try await waitForReminderOperation(model)
      let stored = try #require(try await environment.privateStore.load())

      #expect(model.remindersEnabled)
      #expect(stored.remindersEnabled)
      #expect(environment.notificationCenter.pendingIdentifiers.isEmpty)
      #expect(
        model.reminderStatusMessage == "FORGE could not update the local reminder."
      )
      #expect(model.recoveryState == nil)
    }
  }

  @Test("Stale successful reminder completion removes the scheduled notification")
  func staleReminderCompletionIsCompensated() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      environment.notificationCenter.pausesAfterAdd = true
      defer { environment.notificationCenter.resumeAfterAdd() }

      model.setRemindersEnabled(true)
      try await waitForBlockedReminderAdd(environment.notificationCenter)
      #expect(model.isReminderOperationRunning)
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == [TestNotificationCenter.managedReminderIdentifier]
      )

      await model.reviewCourseSetup()
      let storedAfterReview = try #require(try await environment.privateStore.load())
      #expect(!model.isCourseStarted)
      #expect(!storedAfterReview.isCourseStarted)

      environment.notificationCenter.resumeAfterAdd()
      try await waitForReminderOperation(model)

      #expect(!model.remindersEnabled)
      #expect(environment.notificationCenter.pendingIdentifiers.isEmpty)
      #expect(model.recoveryState == nil)
    }
  }

  @Test("A new reminder waits for stale cleanup and remains scheduled")
  func newReminderFollowsStaleCleanup() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      environment.notificationCenter.pausesAfterAdd = true
      defer { environment.notificationCenter.resumeAfterAdd() }

      model.setRemindersEnabled(true)
      try await waitForBlockedReminderAdd(environment.notificationCenter)
      await model.reviewCourseSetup()
      #expect(!model.isCourseStarted)
      #expect(environment.notificationCenter.pendingIdentifiers.isEmpty)

      #expect(await model.startUniversityCourse())
      model.setRemindersEnabled(true)
      environment.notificationCenter.resumeAfterAdd()
      try await waitForReminderOperation(model)

      #expect(model.isCourseStarted)
      #expect(model.remindersEnabled)
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == [TestNotificationCenter.managedReminderIdentifier]
      )
    }
  }

  @Test("Course review disables reminders for the next launch")
  func reviewDisablesReminderForRelaunch() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      model.setRemindersEnabled(true)
      try await waitForReminderOperation(model)
      #expect(model.remindersEnabled)
      #expect(!environment.notificationCenter.pendingIdentifiers.isEmpty)

      await model.reviewCourseSetup()
      let stored = try #require(
        try await environment.privateStore.load()
      )

      #expect(!stored.isCourseStarted)
      #expect(!stored.remindersEnabled)
      #expect(environment.notificationCenter.pendingIdentifiers.isEmpty)

      let relaunchedEnvironment = try environments.makeEnvironment()
      try await relaunchedEnvironment.privateStore.seed(stored)
      let relaunchedModel = try await relaunchedEnvironment.makeModel()

      #expect(!relaunchedModel.isCourseStarted)
      #expect(!relaunchedModel.remindersEnabled)
    }
  }

  @Test("Injected time reaches reminder scheduling and completion projection")
  func reminderSchedulingUsesInjectedCompletionTime() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(
        model,
        environment: environment
      )
      let lastDate = try #require(environment.clock.returnedDates.last)
      let actionTime = lastDate.addingTimeInterval(10)
      let coordinatorTime = actionTime.addingTimeInterval(10)
      let completionTime = coordinatorTime.addingTimeInterval(10)
      try environment.sharedStore.saveProjection(
        ForgeReturnProjection(
          lifecycle: .scheduled,
          opensAt: delayedReturn.opensAt,
          dueAt: delayedReturn.dueAt,
          generatedAt: lastDate,
          validUntil: completionTime.addingTimeInterval(60)
        )
      )
      environment.clock.enqueue(actionTime)
      environment.clock.enqueue(coordinatorTime)
      environment.notificationCenter.pausesAfterAdd = true
      defer { environment.notificationCenter.resumeAfterAdd() }

      model.setRemindersEnabled(true)
      try await waitForBlockedReminderAdd(environment.notificationCenter)

      #expect(
        Array(environment.clock.returnedDates.suffix(2))
          == [actionTime, coordinatorTime]
      )
      environment.clock.enqueue(completionTime)
      environment.notificationCenter.resumeAfterAdd()
      try await waitForReminderOperation(model)
      let projection = try #require(try environment.sharedStore.loadProjection())

      #expect(projection.generatedAt == completionTime)
      #expect(model.remindersEnabled)
    }
  }

  @Test("Active course relaunch reconciles its enabled local reminder")
  func activeCourseRelaunchReconcilesReminders() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let writer = try await environment.makeModel()
      _ = try await makeScheduledReturn(writer, environment: environment)
      writer.setRemindersEnabled(true)
      try await waitForReminderOperation(writer)
      let stored = try #require(try await environment.privateStore.load())
      #expect(environment.notificationCenter.addedIdentifiers.count == 1)

      let relaunchedEnvironment = try environments.makeEnvironment()
      try await relaunchedEnvironment.privateStore.seed(stored)
      let model = try await relaunchedEnvironment.makeModel()
      try await waitForReminderOperation(model)

      #expect(stored.isCourseStarted)
      #expect(stored.remindersEnabled)
      #expect(model.isCourseStarted)
      #expect(model.remindersEnabled)
      #expect(
        relaunchedEnvironment.notificationCenter.pendingIdentifiers
          == [TestNotificationCenter.managedReminderIdentifier]
      )
      #expect(
        relaunchedEnvironment.notificationCenter.addedIdentifiers.count == 1
      )
    }
  }

  @Test("Local reset cancels a blocked reminder and clears its notification")
  func localResetCancelsBlockedReminder() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      environment.notificationCenter.pausesAfterAdd = true
      defer { environment.notificationCenter.resumeAfterAdd() }

      model.setRemindersEnabled(true)
      try await waitForBlockedReminderAdd(environment.notificationCenter)
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == [TestNotificationCenter.managedReminderIdentifier]
      )

      model.clearLocalData()
      environment.notificationCenter.resumeAfterAdd()
      try await waitForReset(model)
      guard await waitUntil({ environment.notificationCenter.pendingIdentifiers.isEmpty }) else {
        throw AppModelTestError.operationTimedOut
      }

      #expect(!model.isCourseStarted)
      #expect(!model.remindersEnabled)
      #expect(environment.notificationCenter.pendingIdentifiers.isEmpty)
      #expect(try await environment.privateStore.load() == nil)
    }
  }

  @Test("Reset cancels blocked reminder reconciliation before verified cleanup")
  func resetCancelsBlockedReminderReconciliation() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      try await waitForReminderOperation(model)
      environment.notificationCenter.pendingIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier,
        TestNotificationCenter.staleManagedReminderIdentifier,
      ]
      environment.notificationCenter.deliveredIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier,
        TestNotificationCenter.staleManagedReminderIdentifier,
      ]
      environment.notificationCenter.pausesPendingLookup = true
      model.reconcileReminders()
      await environment.notificationCenter.waitForPendingLookup()

      model.clearLocalData()
      try await waitForReset(model)

      #expect(!model.isLocalDataResetRunning)
      #expect(!model.isCourseStarted)
      #expect(try await environment.privateStore.load() == nil)
      #expect(environment.notificationCenter.pendingIdentifiers.isEmpty)
      #expect(environment.notificationCenter.deliveredIdentifiers.isEmpty)
      #expect(!environment.notificationCenter.isPendingLookupBlocked)
    }
  }

  @Test("Blocked reminder scheduling does not retain the app model")
  func blockedReminderSchedulingDoesNotRetainModel() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      weak var weakModel: AppModel?
      do {
        let model = try await environment.makeModel()
        weakModel = model
        _ = try await makeScheduledReturn(model, environment: environment)
        environment.notificationCenter.pausesAfterAdd = true

        model.setRemindersEnabled(true)
        try await waitForBlockedReminderAdd(environment.notificationCenter)

        #expect(model.isReminderOperationRunning)
      }

      guard await waitUntil({ weakModel == nil }) else {
        throw AppModelTestError.operationTimedOut
      }
      #expect(weakModel == nil)
      #expect(environment.notificationCenter.isAddBlocked)
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == [TestNotificationCenter.managedReminderIdentifier]
      )

      environment.notificationCenter.resumeAfterAdd()
      guard
        await waitUntil({
          environment.notificationCenter.pendingIdentifiers.isEmpty
            && !environment.notificationCenter.isAddBlocked
        })
      else {
        throw AppModelTestError.operationTimedOut
      }

      #expect(environment.notificationCenter.pendingIdentifiers.isEmpty)
    }
  }

  @Test("Stale scheduled notification is removed with its preference")
  func staleNotificationCleanup() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let writer = try await environment.makeModel()
      try await startCourse(writer)
      let stored = try #require(try await environment.privateStore.load())
      let relaunchedEnvironment = try environments.makeEnvironment()
      try await relaunchedEnvironment.privateStore.seed(
        PrivateStateEnvelope(
          learnerState: stored.learnerState,
          isCourseStarted: stored.isCourseStarted,
          remindersEnabled: true
        )
      )
      relaunchedEnvironment.notificationCenter.pendingIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier
      ]

      let model = try await relaunchedEnvironment.makeModel()
      model.handleScenePhaseChange(.active)
      try await waitForReminderOperation(model)
      let cleanedState = try #require(
        try await relaunchedEnvironment.privateStore.load()
      )

      #expect(!model.remindersEnabled)
      #expect(!cleanedState.remindersEnabled)
      #expect(
        relaunchedEnvironment.notificationCenter.pendingIdentifiers.isEmpty
      )
    }
  }

  @Test("Stale notification cleanup completes when preference persistence fails")
  func staleNotificationCleanupAfterPreferenceSaveFailure() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let writer = try await environment.makeModel()
      try await startCourse(writer)
      let stored = try #require(try await environment.privateStore.load())
      let relaunchedEnvironment = try environments.makeEnvironment()
      try await relaunchedEnvironment.privateStore.seed(
        PrivateStateEnvelope(
          learnerState: stored.learnerState,
          isCourseStarted: stored.isCourseStarted,
          remindersEnabled: true
        )
      )
      relaunchedEnvironment.notificationCenter.pendingIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier
      ]

      let model = try await relaunchedEnvironment.makeModel()
      await relaunchedEnvironment.privateStore.setSaveError(
        PrivateStateStoreError.writeVerification
      )
      model.handleScenePhaseChange(.active)
      try await waitForReminderOperation(model)
      let retainedState = try #require(
        try await relaunchedEnvironment.privateStore.load()
      )

      #expect(model.remindersEnabled)
      #expect(retainedState.remindersEnabled)
      #expect(
        relaunchedEnvironment.notificationCenter.pendingIdentifiers.isEmpty
      )
      #expect(
        model.recoveryState
          == .saveFailed(message: "FORGE could not save local course data.")
      )
    }
  }

  @Test("Pre-course deep links preserve navigation and activity state")
  func preCourseDeepLinkGating() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      model.selectedTab = .evidence
      model.evidencePath = [.privacySupport]

      model.route(try validURL("forge://settings"))
      model.route(try validURL("forge://focus"))

      #expect(model.selectedTab == .evidence)
      #expect(model.todayPath.isEmpty)
      #expect(model.pathPath.isEmpty)
      #expect(model.evidencePath == [.privacySupport])
      #expect(!model.isActivityPresented)
    }
  }

  @Test("Explicit root route wins over pending focus")
  func rootRoutePrecedenceOverPendingFocus() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      model.pathPath = [.privacySupport]
      model.evidencePath = [.settings]
      model.presentActivity()
      try environment.sharedStore.setPendingFocus()

      model.route(try validURL("forge://settings"))
      model.handleScenePhaseChange(.active)
      await model.waitForFocusOperationForTesting()

      #expect(model.selectedTab == .today)
      #expect(model.todayPath == [.settings])
      #expect(model.pathPath.isEmpty)
      #expect(model.evidencePath.isEmpty)
      #expect(!model.isActivityPresented)
      #expect(!(try environment.sharedStore.consumePendingFocus()))

      try await waitForReminderOperation(model)
    }
  }

  @Test("Active transition discards pending focus while course access is blocked")
  func blockedActiveTransitionDiscardsPendingFocus() async throws {
    try await withEnvironmentCleanup { environments in
      let noCourseEnvironment = try environments.makeEnvironment()
      let noCourseModel = try await noCourseEnvironment.makeModel()
      try noCourseEnvironment.sharedStore.setPendingFocus()

      noCourseModel.handleScenePhaseChange(.active)
      await noCourseModel.waitForFocusOperationForTesting()

      #expect(!(try noCourseEnvironment.sharedStore.consumePendingFocus()))
      #expect(!noCourseModel.isActivityPresented)

      let recoveryEnvironment = try environments.makeEnvironment()
      await recoveryEnvironment.privateStore.setLoadError(PrivateStateStoreError.corruptData)
      let recoveryModel = try await recoveryEnvironment.makeModel()
      try recoveryEnvironment.sharedStore.setPendingFocus()

      recoveryModel.handleScenePhaseChange(.active)
      await recoveryModel.waitForFocusOperationForTesting()

      #expect(!(try recoveryEnvironment.sharedStore.consumePendingFocus()))
      #expect(!recoveryModel.isActivityPresented)

      let resetEnvironment = try environments.makeEnvironment()
      let resetModel = try await resetEnvironment.makeModel()
      try await startCourse(resetModel)
      resetModel.clearLocalData()
      try resetEnvironment.sharedStore.setPendingFocus()

      resetModel.handleScenePhaseChange(.active)
      await resetModel.waitForFocusOperationForTesting()

      try await waitForReset(resetModel)
      #expect(!(try resetEnvironment.sharedStore.consumePendingFocus()))
    }
  }

  @Test("Pending focus is retained during launch and consumed after readiness")
  func pendingFocusRespectsLaunchAndRouteEligibility() async throws {
    try await withEnvironmentCleanup { environments in
      let loadingEnvironment = try environments.makeEnvironment()
      let storedState = PrivateStateEnvelope(
        learnerState: try UniversityStarterCourse.initialState(
          updatedAt: Date(timeIntervalSince1970: 2_000_000_000)
        ),
        isCourseStarted: true,
        remindersEnabled: false
      )
      try await loadingEnvironment.privateStore.seed(storedState)
      await loadingEnvironment.privateStore.blockNextOperation(.load)
      let loadingModel = try await loadingEnvironment.makeUnlaunchedModel()
      loadingModel.handleScenePhaseChange(.active)
      let launchTask = Task { @MainActor in
        await loadingModel.launch()
      }
      let ticket = await loadingEnvironment.privateStore.waitForBlockedOperation(.load)
      try loadingEnvironment.sharedStore.setPendingFocus()
      let pendingFocusURL = loadingEnvironment.sharedRootURL.appendingPathComponent(
        "forge.pending-focus.v3",
        isDirectory: false
      )

      #expect(loadingModel.launchState == .loading)
      #expect(FileManager.default.fileExists(atPath: pendingFocusURL.path))
      await loadingEnvironment.privateStore.releaseBlockedOperation(ticket)
      await launchTask.value

      #expect(loadingModel.launchState == .ready)
      #expect(!FileManager.default.fileExists(atPath: pendingFocusURL.path))
      #expect(loadingModel.isActivityPresented)

      let unstartedEnvironment = try environments.makeEnvironment()
      let unstartedModel = try await unstartedEnvironment.makeModel()
      try unstartedEnvironment.sharedStore.setPendingFocus()

      unstartedModel.consumePendingFocus()
      await unstartedModel.waitForFocusOperationForTesting()

      #expect(!(try unstartedEnvironment.sharedStore.consumePendingFocus()))
      #expect(!unstartedModel.isActivityPresented)

      let startedEnvironment = try environments.makeEnvironment()
      let startedModel = try await startedEnvironment.makeModel()
      try await startCourse(startedModel)
      try startedEnvironment.sharedStore.setPendingFocus()

      startedModel.consumePendingFocus()
      await startedModel.waitForFocusOperationForTesting()

      #expect(!(try startedEnvironment.sharedStore.consumePendingFocus()))
      #expect(startedModel.isActivityPresented)
    }
  }

  @Test("Pending focus written after a root route is consumed on next active")
  func pendingFocusAfterRootRouteIsConsumed() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      model.route(try validURL("forge://settings"))
      await model.waitForFocusOperationForTesting()
      try environment.sharedStore.setPendingFocus()

      model.handleScenePhaseChange(.active)
      await model.waitForFocusOperationForTesting()

      #expect(model.selectedTab == .today)
      #expect(model.todayPath == [.settings])
      #expect(model.isActivityPresented)
      #expect(!(try environment.sharedStore.consumePendingFocus()))

      try await waitForReminderOperation(model)
    }
  }

  @Test("Current focus intent presents the current activity once")
  func currentFocusIntent() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      try environment.sharedStore.setPendingFocus()

      model.handleScenePhaseChange(.active)
      await model.waitForFocusOperationForTesting()

      #expect(model.isActivityPresented)
      #expect(!(try environment.sharedStore.consumePendingFocus()))

      try await waitForReminderOperation(model)
    }
  }

  @Test("Direct root routes select their adult-university destinations")
  func directRootRoutes() async throws {
    try await withEnvironmentCleanup { environments in
      try await assertRootRoute("forge://today", expectedTab: .today)
      try await assertRootRoute("forge://path", expectedTab: .path)
      try await assertRootRoute("forge://evidence", expectedTab: .evidence)
      try await assertRootRoute("forge://returns", expectedTab: .today)
    }
  }

  @Test("Direct focus route presents the current adult-university activity")
  func directFocusRoute() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)

      model.route(try validURL("forge://focus"))

      #expect(model.selectedTab == .today)
      #expect(model.isActivityPresented)
    }
  }

  @Test("Background persists local state and inactive does not")
  func backgroundAndInactivePersistence() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await waitForReminderOperation(model)
      let beforeLifecycle = await environment.privateStore.snapshot()

      model.handleScenePhaseChange(.inactive)
      let afterInactive = await environment.privateStore.snapshot()
      #expect(afterInactive.saveCount == beforeLifecycle.saveCount)
      #expect(try await environment.privateStore.load() == nil)

      await environment.privateStore.blockNextOperation(.save)
      model.handleScenePhaseChange(.background)
      let ticket = await environment.privateStore.waitForBlockedOperation(.save)
      await environment.privateStore.releaseBlockedOperation(ticket)
      await environment.privateStore.waitForCompletion(of: ticket)
      let stored = try #require(try await environment.privateStore.load())
      let afterBackground = await environment.privateStore.snapshot()

      #expect(afterBackground.saveCount == beforeLifecycle.saveCount + 1)
      #expect(stored.learnerState == model.learnerState)
      #expect(stored.localProfileID == model.localProfileID)
      #expect(stored.semesterDesk == nil)
      #expect(!stored.isCourseStarted)
      #expect(!stored.remindersEnabled)
    }
  }

  @Test("Shared projection has exact scheduled, open, due, and expired lifecycles")
  func sharedProjectionExactLifecycle() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      try await recordDemonstratedPractice(model)
      try await waitForReminderOperation(model)
      try await recordDemonstratedProof(model)

      let proofReceipt = try #require(model.learnerState.evidence.last)
      let delayedReturn = try onlyDelayedReturn(in: model)
      let scheduled = try #require(try environment.sharedStore.loadProjection())

      #expect(scheduled.lifecycle == .scheduled)
      #expect(scheduled.opensAt == delayedReturn.opensAt)
      #expect(scheduled.dueAt == delayedReturn.dueAt)
      #expect(scheduled.generatedAt == proofReceipt.recordedAt)
      #expect(
        scheduled.validUntil
          == min(
            delayedReturn.dueAt.addingTimeInterval(3_600),
            proofReceipt.recordedAt.addingTimeInterval(8 * 86_400)
          )
      )

      try await waitForReminderOperation(model)
      environment.clock.setNext(to: delayedReturn.opensAt.addingTimeInterval(1))
      model.handleScenePhaseChange(.active)
      await model.waitForSharedProjectionOperationForTesting()
      let open = try #require(try environment.sharedStore.loadProjection())

      #expect(open.lifecycle == .open)
      #expect(open.generatedAt == delayedReturn.opensAt.addingTimeInterval(1))
      #expect(
        open.validUntil
          == min(
            delayedReturn.dueAt.addingTimeInterval(3_600),
            open.generatedAt.addingTimeInterval(48 * 3_600)
          )
      )

      try await waitForReminderOperation(model)
      environment.clock.setNext(to: delayedReturn.dueAt)
      model.handleScenePhaseChange(.active)
      await model.waitForSharedProjectionOperationForTesting()
      let due = try #require(try environment.sharedStore.loadProjection())

      #expect(due.lifecycle == .due)
      #expect(due.generatedAt == delayedReturn.dueAt)
      #expect(due.validUntil == delayedReturn.dueAt.addingTimeInterval(3_600))

      try await waitForReminderOperation(model)
      environment.clock.setNext(to: delayedReturn.dueAt.addingTimeInterval(10))
      model.handleScenePhaseChange(.active)
      await model.waitForSharedProjectionOperationForTesting()

      #expect(try environment.sharedStore.loadProjection() == nil)

      try await waitForReminderOperation(model)
    }
  }

  @Test("Ten unchanged active transitions do not rewrite shared projection")
  func unchangedActiveTransitionsDoNotRewriteProjection() async throws {
    try await withEnvironmentCleanup { environments in
      let writeCounter = SharedProjectionWriteCounter()
      var hooks = ForgeSharedStateStoreTestHooks()
      hooks.beforeStagingRename = { writeCounter.record(stagingName: $0) }
      let environment = try environments.makeEnvironment(
        sharedStoreTestHooks: hooks
      )
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      let writesBeforeTransitions = writeCounter.value
      let reloadsBeforeTransitions = environment.widgetReloadCount

      for _ in 0..<10 {
        model.handleScenePhaseChange(.active)
        await model.waitForSharedProjectionOperationForTesting()
        await model.waitForFocusOperationForTesting()
        try await waitForReminderOperation(model)
      }

      #expect(writeCounter.value == writesBeforeTransitions)
      #expect(environment.widgetReloadCount == reloadsBeforeTransitions)
    }
  }

  @Test("A lifecycle change writes and reloads shared projection once")
  func lifecycleChangeWritesProjectionOnce() async throws {
    try await withEnvironmentCleanup { environments in
      let writeCounter = SharedProjectionWriteCounter()
      var hooks = ForgeSharedStateStoreTestHooks()
      hooks.beforeStagingRename = { writeCounter.record(stagingName: $0) }
      let environment = try environments.makeEnvironment(
        sharedStoreTestHooks: hooks
      )
      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(
        model,
        environment: environment
      )
      let writesBeforeTransition = writeCounter.value
      let reloadsBeforeTransition = environment.widgetReloadCount
      environment.clock.setNext(
        to: delayedReturn.opensAt.addingTimeInterval(1)
      )

      model.handleScenePhaseChange(.active)
      await model.waitForSharedProjectionOperationForTesting()
      await model.waitForFocusOperationForTesting()
      try await waitForReminderOperation(model)
      let projection = try #require(
        try environment.sharedStore.loadProjection()
      )

      #expect(projection.lifecycle == .open)
      #expect(writeCounter.value == writesBeforeTransition + 1)
      #expect(environment.widgetReloadCount == reloadsBeforeTransition + 1)
    }
  }

  @Test("A held App Group lock does not block the main actor")
  func heldSharedLockDoesNotBlockMainActor() async throws {
    try await withEnvironmentCleanup { environments in
      let gate = OneShotBlockingGate()
      var hooks = ForgeSharedStateStoreTestHooks()
      hooks.lockAcquisitionTimeoutNanoseconds = 60_000_000_000
      hooks.lockRetryIntervalNanoseconds = 1
      hooks.waitForLockRetry = { _ in gate.blockIfEnabled() }
      let environment = try environments.makeEnvironment(
        sharedStoreTestHooks: hooks
      )
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      var heldDescriptor: Int32? = try holdExclusiveSharedStoreLock(
        in: environment.sharedRootURL
      )
      defer {
        gate.release()
        if let heldDescriptor {
          releaseSharedStoreLock(heldDescriptor)
        }
      }
      gate.enableNextBlock()

      model.handleScenePhaseChange(.active)
      await gate.waitUntilBlocked()
      let mainActorProbe = Task { @MainActor in model.selectedTab }

      #expect(await mainActorProbe.value == .today)

      if let descriptor = heldDescriptor {
        releaseSharedStoreLock(descriptor)
        heldDescriptor = nil
      }
      gate.release()
      await model.waitForSharedProjectionOperationForTesting()
      await model.waitForFocusOperationForTesting()
      try await waitForReminderOperation(model)
    }
  }

  @Test("A root route defeats an older pending-focus consume")
  func rootRouteDefeatsOlderPendingFocusConsume() async throws {
    try await withEnvironmentCleanup { environments in
      let gate = OneShotBlockingGate()
      var hooks = ForgeSharedStateStoreTestHooks()
      hooks.beforeLockBinding = { gate.blockIfEnabled() }
      let environment = try environments.makeEnvironment(
        sharedStoreTestHooks: hooks
      )
      let model = try await environment.makeModel()
      try await startCourse(model)
      try environment.sharedStore.setPendingFocus()
      gate.enableNextBlock()
      defer { gate.release() }

      model.consumePendingFocus()
      await gate.waitUntilBlocked()
      model.route(try validURL("forge://settings"))

      #expect(model.todayPath == [.settings])
      #expect(!model.isActivityPresented)

      gate.release()
      await model.waitForFocusOperationForTesting()

      #expect(model.todayPath == [.settings])
      #expect(!model.isActivityPresented)
      #expect(!(try environment.sharedStore.consumePendingFocus()))
    }
  }

  @Test("Reset follows older shared work and leaves shared state empty")
  func resetDefeatsOlderSharedWork() async throws {
    try await withEnvironmentCleanup { environments in
      let gate = OneShotBlockingGate()
      var hooks = ForgeSharedStateStoreTestHooks()
      hooks.beforeLockBinding = { gate.blockIfEnabled() }
      let environment = try environments.makeEnvironment(
        sharedStoreTestHooks: hooks
      )
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      try environment.sharedStore.setPendingFocus()
      gate.enableNextBlock()
      defer { gate.release() }

      model.handleScenePhaseChange(.active)
      await gate.waitUntilBlocked()
      model.clearLocalData()
      gate.release()
      try await waitForReset(model)

      #expect(!model.isCourseStarted)
      #expect(!model.isActivityPresented)
      #expect(model.recoveryState == nil)
      #expect(try environment.sharedStore.loadProjection() == nil)
      #expect(!(try environment.sharedStore.consumePendingFocus()))
      #expect(try await environment.privateStore.load() == nil)
    }
  }

  @Test("Protected reset restores focus consumed by older in-flight work")
  func protectedResetRestoresInFlightFocus() async throws {
    try await withEnvironmentCleanup { environments in
      let gate = OneShotBlockingGate()
      var hooks = ForgeSharedStateStoreTestHooks()
      hooks.beforeLockBinding = { gate.blockIfEnabled() }
      let environment = try environments.makeEnvironment(
        sharedStoreTestHooks: hooks
      )
      let model = try await environment.makeModel()
      try await startCourse(model)
      try environment.sharedStore.setPendingFocus()
      gate.enableNextBlock()
      defer { gate.release() }

      model.consumePendingFocus()
      await gate.waitUntilBlocked()
      await environment.privateStore.setClearError(
        PrivateStateStoreError.protectedDataUnavailable
      )
      await environment.privateStore.blockNextOperation(.clear)
      model.clearLocalData()
      let clearTicket = await environment.privateStore
        .waitForBlockedOperation(.clear)

      await environment.privateStore.releaseBlockedOperation(clearTicket)
      gate.release()
      try await waitForReset(model)

      #expect(
        model.recoveryState
          == .protectedDataUnavailable(
            message:
              "Local data is unavailable. Unlock the device, then retry. Failed steps: local course data."
          )
      )
      #expect(try environment.sharedStore.consumePendingFocus())
      #expect(try await environment.privateStore.load() != nil)
    }
  }

  @Test("Launch and recovery apply root routes before pending focus")
  func launchAndRecoveryRootOrdering() async throws {
    try await withEnvironmentCleanup { environments in
      let launchEnvironment = try environments.makeEnvironment()
      let launchState = try UniversityStarterCourse.initialState(
        updatedAt: launchEnvironment.clock.now()
      )
      try await launchEnvironment.privateStore.seed(
        PrivateStateEnvelope(
          learnerState: launchState,
          isCourseStarted: true,
          remindersEnabled: false
        )
      )
      try launchEnvironment.sharedStore.setPendingFocus()
      await launchEnvironment.privateStore.blockNextOperation(.load)
      let launchModel = try await launchEnvironment.makeUnlaunchedModel()
      let launchTask = Task { @MainActor in
        await launchModel.launch()
      }
      let launchTicket = await launchEnvironment.privateStore
        .waitForBlockedOperation(.load)
      launchModel.route(try validURL("forge://settings"))
      await launchEnvironment.privateStore.releaseBlockedOperation(
        launchTicket
      )
      await launchTask.value

      #expect(launchModel.todayPath == [.settings])
      #expect(!launchModel.isActivityPresented)
      #expect(!(try launchEnvironment.sharedStore.consumePendingFocus()))

      let recoveryEnvironment = try environments.makeEnvironment()
      let recoveryState = try UniversityStarterCourse.initialState(
        updatedAt: recoveryEnvironment.clock.now()
      )
      try await recoveryEnvironment.privateStore.seed(
        PrivateStateEnvelope(
          learnerState: recoveryState,
          isCourseStarted: true,
          remindersEnabled: false
        )
      )
      await recoveryEnvironment.privateStore.setLoadError(.corruptData)
      let recoveryModel = try await recoveryEnvironment.makeModel()
      try recoveryEnvironment.sharedStore.setPendingFocus()
      recoveryModel.route(try validURL("forge://settings"))
      await recoveryEnvironment.privateStore.setLoadError(nil)
      await recoveryEnvironment.privateStore.blockNextOperation(.load)
      recoveryModel.retryLocalDataLoad()
      let recoveryTicket = await recoveryEnvironment.privateStore
        .waitForBlockedOperation(.load)
      recoveryModel.route(try validURL("forge://path"))
      await recoveryEnvironment.privateStore.releaseBlockedOperation(
        recoveryTicket
      )
      await recoveryModel.waitForRecoveryOperationForTesting()

      #expect(recoveryModel.selectedTab == .path)
      #expect(recoveryModel.todayPath.isEmpty)
      #expect(!recoveryModel.isActivityPresented)
      #expect(!(try recoveryEnvironment.sharedStore.consumePendingFocus()))
    }
  }

  @Test("Unavailable shared storage does not block course start or present focus")
  func unavailableSharedStoreReportsIntegrationFailures() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel(includeSharedStore: false)

      #expect(await model.startUniversityCourse())
      #expect(
        model.localIntegrationStatusMessage
          == "FORGE could not update shared return data."
      )

      model.consumePendingFocus()
      await model.waitForFocusOperationForTesting()

      #expect(!model.isActivityPresented)
      #expect(
        model.localIntegrationStatusMessage
          == "FORGE could not read shared focus data."
      )
    }
  }

  @Test("Nil shared store fails a full reset")
  func nilSharedResetFailure() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel(includeSharedStore: false)
      try await startCourse(model)

      model.clearLocalData()
      try await waitForReset(model)

      #expect(
        model.recoveryState
          == .resetFailed(
            message: "FORGE could not reset local data. Failed steps: shared return data."
          )
      )
      #expect(try await environment.privateStore.load() == nil)
    }
  }

  @Test("Full reset clears private and App Group state")
  func successfulFullReset() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      #expect(await model.createSemesterDesk(title: "Autumn 2026"))
      let previousProfileID = model.localProfileID
      try environment.sharedStore.setPendingFocus()
      environment.notificationCenter.pendingIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier,
        TestNotificationCenter.staleManagedReminderIdentifier,
        "external.pending",
      ]
      environment.notificationCenter.deliveredIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier,
        TestNotificationCenter.staleManagedReminderIdentifier,
        "external.delivered",
      ]

      model.clearLocalData()
      try await waitForReset(model)

      #expect(!model.isCourseStarted)
      #expect(model.localProfileID != previousProfileID)
      #expect(model.semesterDesk == nil)
      #expect(model.recoveryState == nil)
      #expect(model.learnerState.evidence.isEmpty)
      #expect(model.learnerState.delayedReturns.isEmpty)
      #expect(try await environment.privateStore.load() == nil)
      #expect(try environment.sharedStore.loadProjection() == nil)
      #expect(!(try environment.sharedStore.consumePendingFocus()))
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == Set(["external.pending"])
      )
      #expect(
        environment.notificationCenter.deliveredIdentifiers
          == Set(["external.delivered"])
      )
    }
  }

  @Test("Reset supersedes a blocked course start")
  func resetSupersedesBlockedCourseStart() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      await environment.privateStore.blockNextOperation(.save)
      let startTask = Task { @MainActor in
        await model.startUniversityCourse()
      }
      let saveTicket = await environment.privateStore
        .waitForBlockedOperation(.save)

      model.clearLocalData()
      try await waitForReset(model)

      #expect(!model.isCourseStartRunning)
      #expect(!model.isCourseStarted)
      #expect(model.courseStartStatusMessage == nil)
      #expect(try await environment.privateStore.load() == nil)

      await environment.privateStore.releaseBlockedOperation(saveTicket)
      #expect(!(await startTask.value))
      #expect(!model.isCourseStarted)
      #expect(model.courseStartStatusMessage == nil)
      #expect(try await environment.privateStore.load() == nil)
    }
  }

  @Test("Reset prevents a late Semester Desk save from restoring old data")
  func resetSupersedesBlockedSemesterDeskSave() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      #expect(await model.createSemesterDesk(title: "Autumn 2026"))
      let oldProfileID = model.localProfileID
      await environment.privateStore.blockNextOperation(.save)
      let commandTask = Task { @MainActor in
        await model.applySemesterDeskCommand(
          .addCourse(
            profileID: oldProfileID,
            code: "MAT220",
            title: "Linear algebra"
          )
        )
      }
      let saveTicket = await environment.privateStore
        .waitForBlockedOperation(.save)

      model.clearLocalData()
      try await waitForReset(model)
      await environment.privateStore.releaseBlockedOperation(saveTicket)
      #expect(!(await commandTask.value))

      #expect(model.localProfileID != oldProfileID)
      #expect(model.semesterDesk == nil)
      #expect(try await environment.privateStore.load() == nil)
    }
  }

  @Test("Reset supersedes a blocked course review")
  func resetSupersedesBlockedCourseReview() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      try await startCourse(model)
      try await waitForReminderOperation(model)
      await environment.privateStore.blockNextOperation(.save)
      let reviewTask = Task { @MainActor in
        await model.reviewCourseSetup()
      }
      let saveTicket = await environment.privateStore
        .waitForBlockedOperation(.save)

      model.clearLocalData()
      try await waitForReset(model)

      #expect(!model.isCourseReviewRunning)
      #expect(!model.isCourseStarted)
      #expect(model.courseStartStatusMessage == nil)
      #expect(try await environment.privateStore.load() == nil)

      await environment.privateStore.releaseBlockedOperation(saveTicket)
      await reviewTask.value
      #expect(!model.isCourseStarted)
      #expect(model.courseStartStatusMessage == nil)
      #expect(try await environment.privateStore.load() == nil)
    }
  }

  @Test("Reset supersedes a blocked activity submission")
  func resetSupersedesBlockedSubmission() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      try await startCourse(model)
      try await waitForReminderOperation(model)
      model.presentActivity()
      await environment.privateStore.blockNextOperation(.save)
      let submissionTask = Task { @MainActor in
        await model.submitCurrentActivity(
          selectedChoice: "stays_constant_after_force",
          responseText: "The velocity stays constant after the force is removed."
        )
      }
      let saveTicket = await environment.privateStore
        .waitForBlockedOperation(.save)

      model.clearLocalData()
      try await waitForReset(model)

      #expect(!model.isActivitySubmissionRunning)
      #expect(model.learnerState.evidence.isEmpty)
      #expect(model.activityStatusMessage == nil)
      #expect(try await environment.privateStore.load() == nil)

      await environment.privateStore.releaseBlockedOperation(saveTicket)
      #expect(
        await submissionTask.value
          == .failed("FORGE could not record this local activity.")
      )
      #expect(model.learnerState.evidence.isEmpty)
      #expect(model.activityStatusMessage == nil)
      #expect(try await environment.privateStore.load() == nil)
    }
  }

  @Test("Protected private data failure keeps reset in protected recovery")
  func protectedResetFailure() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      await environment.privateStore.setClearError(PrivateStateStoreError.protectedDataUnavailable)

      model.clearLocalData()
      try await waitForReset(model)

      #expect(
        model.recoveryState
          == .protectedDataUnavailable(
            message:
              "Local data is unavailable. Unlock the device, then retry. Failed steps: local course data."
          )
      )
      #expect(try await environment.privateStore.load() != nil)
    }
  }

  @Test("Protected reset preserves every external integration surface")
  func protectedResetPreservesExternalIntegrationState() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      let projectionBeforeReset = try #require(
        try environment.sharedStore.loadProjection()
      )
      try environment.sharedStore.setPendingFocus()
      environment.notificationCenter.pendingIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier,
        TestNotificationCenter.staleManagedReminderIdentifier,
        "external.pending",
      ]
      environment.notificationCenter.deliveredIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier,
        TestNotificationCenter.staleManagedReminderIdentifier,
        "external.delivered",
      ]
      let reloadsBeforeReset = environment.widgetReloadCount
      await environment.privateStore.setClearError(
        PrivateStateStoreError.protectedDataUnavailable
      )

      model.clearLocalData()
      try await waitForReset(model)

      #expect(
        model.recoveryState
          == .protectedDataUnavailable(
            message:
              "Local data is unavailable. Unlock the device, then retry. Failed steps: local course data."
          )
      )
      #expect(!model.allowsClearLocalDataDuringRecovery)
      #expect(try await environment.privateStore.load() != nil)
      #expect(
        try environment.sharedStore.loadProjection()
          == projectionBeforeReset
      )
      #expect(try environment.sharedStore.consumePendingFocus())
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == [
            TestNotificationCenter.managedReminderIdentifier,
            TestNotificationCenter.staleManagedReminderIdentifier,
            "external.pending",
          ]
      )
      #expect(
        environment.notificationCenter.deliveredIdentifiers
          == [
            TestNotificationCenter.managedReminderIdentifier,
            TestNotificationCenter.staleManagedReminderIdentifier,
            "external.delivered",
          ]
      )
      #expect(environment.widgetReloadCount == reloadsBeforeReset)
      #expect(!model.isLocalDataResetRunning)
      #expect(!model.isRecoveryOperationRunning)
    }
  }

  @Test("Notification cleanup failure remains visible after local reset cleanup")
  func notificationResetFailure() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      environment.notificationCenter.pendingIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier
      ]
      environment.notificationCenter.preventRemoval = true

      model.clearLocalData()
      try await waitForReset(model)

      #expect(
        model.recoveryState
          == .resetFailed(
            message: "FORGE could not reset local data. Failed steps: return reminder."
          )
      )
      #expect(try await environment.privateStore.load() == nil)
      #expect(try environment.sharedStore.loadProjection() == nil)
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == [TestNotificationCenter.managedReminderIdentifier]
      )
      #expect(!model.isLocalDataResetRunning)
      #expect(!model.isRecoveryOperationRunning)
    }
  }

  @Test("Generic private reset failure keeps private state and reports its stage")
  func genericPrivateResetFailure() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      await environment.privateStore.setClearError(PrivateStateStoreError.writeVerification)

      model.clearLocalData()
      try await waitForReset(model)

      #expect(
        model.recoveryState
          == .resetFailed(
            message: "FORGE could not reset local data. Failed steps: local course data."
          )
      )
      #expect(try await environment.privateStore.load() != nil)
      #expect(model.allowsClearLocalDataDuringRecovery)
      #expect(!model.isLocalDataResetRunning)
      #expect(!model.isRecoveryOperationRunning)
    }
  }

  @Test("Reset retry repeats complete cleanup before it clears recovery")
  func resetRetryRepeatsCompleteCleanup() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      environment.notificationCenter.pendingIdentifiers = [
        TestNotificationCenter.managedReminderIdentifier
      ]
      environment.notificationCenter.preventRemoval = true
      await environment.privateStore.setClearError(PrivateStateStoreError.writeVerification)

      model.clearLocalData()
      try await waitForReset(model)

      #expect(
        model.recoveryState
          == .resetFailed(
            message:
              "FORGE could not reset local data. Failed steps: return reminder, local course data."
          )
      )
      let beforeRetry = await environment.privateStore.snapshot()
      try environment.sharedStore.setPendingFocus()
      await environment.privateStore.setClearError(nil)

      model.retryLocalDataLoad()
      try await waitForReset(model)

      #expect(
        model.recoveryState
          == .resetFailed(
            message: "FORGE could not reset local data. Failed steps: return reminder."
          )
      )
      let afterRetry = await environment.privateStore.snapshot()
      #expect(afterRetry.clearCount == beforeRetry.clearCount + 1)
      #expect(try await environment.privateStore.load() == nil)
      #expect(!(try environment.sharedStore.consumePendingFocus()))
      #expect(
        environment.notificationCenter.pendingIdentifiers
          == [TestNotificationCenter.managedReminderIdentifier]
      )

      environment.notificationCenter.preventRemoval = false
      model.retryLocalDataLoad()
      try await waitForReset(model)

      #expect(model.recoveryState == nil)
      #expect(!model.isCourseStarted)
      #expect(try await environment.privateStore.load() == nil)
      #expect(environment.notificationCenter.pendingIdentifiers.isEmpty)
    }
  }

  @Test("Nonfinite post-cleanup time reports the initial-state reset failure")
  func nonfinitePostCleanupResetClock() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      environment.clock.enqueue(Date(timeIntervalSince1970: 2_000_001_000))
      environment.clock.enqueue(Date(timeIntervalSinceReferenceDate: .infinity))

      model.clearLocalData()
      try await waitForReset(model)

      #expect(
        model.recoveryState
          == .resetFailed(
            message: "FORGE could not reset local data. Failed step: new local course state."
          )
      )
      #expect(try await environment.privateStore.load() == nil)
      #expect(!model.isLocalDataResetRunning)
      #expect(!model.isRecoveryOperationRunning)
    }
  }

  @Test("Retry reload clears load recovery after storage becomes available")
  func retryLoad() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      await environment.privateStore.setLoadError(PrivateStateStoreError.corruptData)
      let model = try await environment.makeModel()
      #expect(model.recoveryState != nil)

      await environment.privateStore.setLoadError(nil)
      model.retryLocalDataLoad()
      await model.waitForRecoveryOperationForTesting()

      #expect(model.recoveryState == nil)
      #expect(!model.isCourseStarted)
      #expect(model.currentActivity?.kind == .practice)
    }
  }

  @Test("Save recovery does not replace valid memory with a nil load")
  func saveRecoveryRejectsNilLoad() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      try await startCourse(model)
      try await waitForReminderOperation(model)
      model.presentActivity()
      let baselineState = model.learnerState
      await environment.privateStore.setSaveError(
        PrivateStateStoreError.writeVerification
      )

      _ = await model.submitCurrentActivity(
        selectedChoice: "stays_constant_after_force",
        responseText: "The velocity stays constant after the force is removed."
      )
      await environment.privateStore.setSaveError(nil)
      await environment.privateStore.setLoadOverride(nil)

      model.retryLocalDataLoad()
      await model.waitForRecoveryOperationForTesting()

      #expect(model.learnerState == baselineState)
      #expect(model.isCourseStarted)
      #expect(
        model.recoveryState
          == .saveFailed(message: "FORGE could not save local course data.")
      )
    }
  }

  @Test("Save recovery does not replace valid memory with a conflicting load")
  func saveRecoveryRejectsConflictingLoad() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      try await startCourse(model)
      try await waitForReminderOperation(model)
      model.presentActivity()
      let baselineState = model.learnerState
      let olderEnvelope = PrivateStateEnvelope(
        learnerState: try UniversityStarterCourse.initialState(
          updatedAt: Date(timeIntervalSince1970: 1_900_000_000)
        ),
        isCourseStarted: false,
        remindersEnabled: false
      )
      await environment.privateStore.setSaveError(
        PrivateStateStoreError.writeVerification
      )

      _ = await model.submitCurrentActivity(
        selectedChoice: "stays_constant_after_force",
        responseText: "The velocity stays constant after the force is removed."
      )
      await environment.privateStore.setSaveError(nil)
      await environment.privateStore.setLoadOverride(olderEnvelope)

      model.retryLocalDataLoad()
      await model.waitForRecoveryOperationForTesting()

      #expect(model.learnerState == baselineState)
      #expect(model.isCourseStarted)
      #expect(
        model.recoveryState
          == .saveFailed(message: "FORGE could not save local course data.")
      )
    }
  }

  @Test("Active scene during blocked launch starts one time-boundary task")
  func activeSceneDuringBlockedLaunchStartsOneBoundaryTask() async throws {
    try await withEnvironmentCleanup { environments in
      let stored = try await makeStoredScheduledReturn(in: environments)
      let environment = try environments.makeEnvironment(
        start: stored.envelope.learnerState.updatedAt.addingTimeInterval(60)
      )
      try await environment.privateStore.seed(stored.envelope)
      await environment.privateStore.blockNextOperation(.load)
      let model = try await environment.makeUnlaunchedModel()
      model.handleScenePhaseChange(.active)
      let launchTask = Task { @MainActor in
        await model.launch()
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(.load)

      #expect((await environment.timeBoundarySleeper.snapshot()).requests.isEmpty)

      await environment.privateStore.releaseBlockedOperation(ticket)
      await launchTask.value
      let request = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      let snapshot = await environment.timeBoundarySleeper.snapshot()

      #expect(request.deadline == stored.delayedReturn.opensAt)
      #expect(snapshot.requests == [request])
    }
  }

  @Test("Background scene during blocked launch does not replay active work")
  func backgroundSceneDuringBlockedLaunchDoesNotReplayActiveWork() async throws {
    try await withEnvironmentCleanup { environments in
      let stored = try await makeStoredScheduledReturn(in: environments)
      let environment = try environments.makeEnvironment(
        start: stored.envelope.learnerState.updatedAt.addingTimeInterval(60)
      )
      try await environment.privateStore.seed(stored.envelope)
      await environment.privateStore.blockNextOperation(.load)
      let model = try await environment.makeUnlaunchedModel()
      model.handleScenePhaseChange(.background)
      let launchTask = Task { @MainActor in
        await model.launch()
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(.load)

      await environment.privateStore.releaseBlockedOperation(ticket)
      await launchTask.value
      let snapshot = await environment.timeBoundarySleeper.snapshot()

      #expect(model.launchState == .ready)
      #expect(snapshot.requests.isEmpty)
      #expect(environment.notificationCenter.addedIdentifiers.isEmpty)
    }
  }

  @Test("Time-boundary scheduler selects the earliest future boundary")
  func schedulerChoosesEarliestBoundary() async throws {
    try await withEnvironmentCleanup { environments in
      let stored = try await makeStoredScheduledReturn(in: environments)
      let originalState = stored.envelope.learnerState
      let originReceipt = try #require(
        originalState.evidence.first {
          $0.id == stored.delayedReturn.originEvidenceID
        }
      )
      let practiceReceipt = try #require(
        originalState.evidence.first {
          $0.activityKind == .practice
            && $0.recordedAt < originReceipt.recordedAt
        }
      )
      let earlierProofTime = practiceReceipt.recordedAt.addingTimeInterval(
        originReceipt.recordedAt.timeIntervalSince(
          practiceReceipt.recordedAt
        ) / 2
      )
      let earlierOriginReceipt = try LocalEvidenceReceipt(
        id: EvidenceID("evidence.scheduler-earlier-proof"),
        scope: originReceipt.scope,
        courseID: originReceipt.courseID,
        capabilityID: originReceipt.capabilityID,
        activityID: originReceipt.activityID,
        activityKind: originReceipt.activityKind,
        taskFamilyID: originReceipt.taskFamilyID,
        proofClaimID: originReceipt.proofClaimID,
        validatorID: originReceipt.validatorID,
        validatorResult: originReceipt.validatorResult,
        catalogReleaseID: originReceipt.catalogReleaseID,
        package: originReceipt.package,
        limitations: originReceipt.limitations,
        assistanceIDs: originReceipt.assistanceIDs,
        recordedAt: earlierProofTime
      )
      let catalog = try UniversityStarterCourse.catalog()
      let originActivity = try #require(
        catalog.activities.first {
          $0.id == originReceipt.activityID
        }
      )
      let returnPolicy = try #require(originActivity.returnPolicy)
      let earlierOpensAt = earlierProofTime.addingTimeInterval(
        returnPolicy.openDelay
      )
      let earlierReturn = try DelayedReturnRecord(
        id: DelayedReturnID("return.evidence.scheduler-earlier-proof"),
        courseID: stored.delayedReturn.courseID,
        activityID: stored.delayedReturn.activityID,
        originEvidenceID: earlierOriginReceipt.id,
        opensAt: earlierOpensAt,
        dueAt: earlierOpensAt.addingTimeInterval(returnPolicy.dueWindow),
        completedAt: nil,
        completionEvidenceID: nil
      )
      let expandedProgress = try originalState.progress.map { progress in
        guard progress.activityID == originReceipt.activityID else {
          return progress
        }
        return try LocalActivityProgress(
          courseID: progress.courseID,
          activityID: progress.activityID,
          capabilityID: progress.capabilityID,
          attempts: progress.attempts + 1,
          lastResult: progress.lastResult,
          lastRecordedAt: progress.lastRecordedAt
        )
      }
      let expandedState = try LocalLearnerState(
        activeCourseID: originalState.activeCourseID,
        activeActivityID: originalState.activeActivityID,
        progress: expandedProgress,
        assistance: originalState.assistance,
        evidence: originalState.evidence + [earlierOriginReceipt],
        delayedReturns: originalState.delayedReturns + [earlierReturn],
        updatedAt: originalState.updatedAt
      )
      try expandedState.validate(against: catalog)
      let environment = try environments.makeEnvironment(
        start: originalState.updatedAt.addingTimeInterval(60)
      )
      try await environment.privateStore.seed(
        PrivateStateEnvelope(
          learnerState: expandedState,
          isCourseStarted: true,
          remindersEnabled: false
        )
      )
      let model = try await environment.makeModel()
      #expect(model.isCourseStarted)
      #expect(model.recoveryState == nil)
      let request = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}

      #expect(request.deadline == earlierReturn.opensAt)
      #expect(request.scheduledFrom < request.deadline)
    }
  }

  @Test("Opening wake refreshes the return and schedules its due boundary")
  func opensAtWakeRefreshesAndSchedulesDueAt() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(
        model,
        environment: environment
      )
      let opensRequest = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      try await waitForReminderOperation(model)
      environment.clock.setNext(to: delayedReturn.opensAt)

      await environment.timeBoundarySleeper.resume(opensRequest)
      let dueRequest = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}

      #expect(try #require(model.currentDelayedReturn).status == .open)
      #expect(dueRequest.deadline == delayedReturn.dueAt)
    }
  }

  @Test("Exact due wake schedules a positive post-due expiry check")
  func exactDueWakeSchedulesPostDueExpiryCheck() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(
        model,
        environment: environment
      )
      let opensRequest = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      try await waitForReminderOperation(model)
      environment.clock.setNext(to: delayedReturn.opensAt)
      await environment.timeBoundarySleeper.resume(opensRequest)
      let dueRequest = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      try await waitForReminderOperation(model)
      environment.clock.setNext(to: delayedReturn.dueAt)

      await environment.timeBoundarySleeper.resume(dueRequest)
      let expiryRequest = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}

      #expect(try #require(model.currentDelayedReturn).status == .due)
      #expect(expiryRequest.deadline > delayedReturn.dueAt)
      #expect(
        expiryRequest.deadline
          == delayedReturn.dueAt.addingTimeInterval(0.001)
      )
    }
  }

  @Test("Post-due wake expires the return and closes its activity sheet")
  func postDueWakeExpiresReturnAndDismissesSheet() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(
        model,
        environment: environment
      )
      let opensRequest = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      try await waitForReminderOperation(model)
      environment.clock.setNext(to: delayedReturn.opensAt)
      await environment.timeBoundarySleeper.resume(opensRequest)
      let dueRequest = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      model.isActivityPresented = true
      try await waitForReminderOperation(model)
      environment.clock.setNext(to: delayedReturn.dueAt)
      await environment.timeBoundarySleeper.resume(dueRequest)
      let expiryRequest = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      try await waitForReminderOperation(model)
      let lastClockDate = try #require(environment.clock.returnedDates.last)
      environment.clock.setNext(
        to: lastClockDate.addingTimeInterval(1)
      )

      await environment.timeBoundarySleeper.resume(expiryRequest)
      await model.waitForTimeBoundaryTaskForTesting()

      #expect(try #require(model.currentDelayedReturn).status == .expired)
      #expect(!model.isActivityPresented)
    }
  }

  @Test("Inactive and background scenes cancel the retained boundary task")
  func inactiveAndBackgroundCancelBoundaryTask() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      let inactiveRequest = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}

      model.handleScenePhaseChange(.inactive)
      await environment.timeBoundarySleeper.waitForCancellation(
        of: inactiveRequest
      )
      model.handleScenePhaseChange(.active)
      let backgroundRequest = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}

      model.handleScenePhaseChange(.background)
      await environment.timeBoundarySleeper.waitForCancellation(
        of: backgroundRequest
      )

      let snapshot = await environment.timeBoundarySleeper.snapshot()
      #expect(snapshot.cancelledIDs.contains(inactiveRequest.id))
      #expect(snapshot.cancelledIDs.contains(backgroundRequest.id))
    }
  }

  @Test("Local reset cancels the retained boundary task")
  func resetCancelsBoundaryTask() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      let request = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}

      model.clearLocalData()
      await environment.timeBoundarySleeper.waitForCancellation(of: request)
      try await waitForReset(model)

      #expect(!model.isCourseStarted)
      #expect(
        (await environment.timeBoundarySleeper.snapshot()).cancelledIDs
          .contains(request.id)
      )
    }
  }

  @Test("Recovery entry cancels the retained boundary task")
  func recoveryCancelsBoundaryTask() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      let request = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}

      model.recoveryState = .loadFailed(message: "Test recovery.")
      await environment.timeBoundarySleeper.waitForCancellation(of: request)

      #expect(model.recoveryState != nil)
      #expect(!model.isActivityPresented)
    }
  }

  @Test("Course setup review cancels the retained boundary task")
  func courseReviewCancelsBoundaryTask() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      let request = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      await environment.privateStore.blockNextOperation(.save)
      let reviewTask = Task { @MainActor in
        await model.reviewCourseSetup()
      }
      let ticket = await environment.privateStore.waitForBlockedOperation(.save)

      await environment.timeBoundarySleeper.waitForCancellation(of: request)
      await environment.privateStore.releaseBlockedOperation(ticket)
      await reviewTask.value

      #expect(!model.isCourseStarted)
    }
  }

  @Test("A superseded course review restores one retained boundary task")
  func supersededCourseReviewRestoresBoundaryTask() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      _ = try await makeScheduledReturn(model, environment: environment)
      let request = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      let storedBeforeReview = try #require(
        try await environment.privateStore.load()
      )
      await environment.privateStore.setNextSaveResult(.superseded)

      await model.reviewCourseSetup()
      await environment.timeBoundarySleeper.waitForCancellation(of: request)
      let replacement = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      let snapshot = await environment.timeBoundarySleeper.snapshot()
      let storedAfterReview = try #require(
        try await environment.privateStore.load()
      )

      #expect(model.isCourseStarted)
      #expect(model.recoveryState == nil)
      #expect(storedAfterReview == storedBeforeReview)
      #expect(replacement.deadline == request.deadline)
      #expect(snapshot.requests == [request, replacement])
      #expect(snapshot.pendingIDs == Set([replacement.id]))
      #expect(snapshot.cancelledIDs == Set([request.id]))
    }
  }

  @Test("Cancelled boundary generation cannot apply a late wake")
  func cancelledBoundaryGenerationCannotApplyLateWake() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(
        model,
        environment: environment
      )
      let request = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      await environment.timeBoundarySleeper.keepPendingAfterCancellation(
        request
      )
      let evidenceBeforeCancellation = model.learnerState.evidence

      model.handleScenePhaseChange(.inactive)
      await environment.timeBoundarySleeper.waitForCancellation(of: request)
      environment.clock.setNext(to: delayedReturn.opensAt)
      await environment.timeBoundarySleeper.resume(request)
      await environment.timeBoundarySleeper.waitForCompletion(of: request)

      #expect(try #require(model.currentDelayedReturn).status == .scheduled)
      #expect(model.learnerState.evidence == evidenceBeforeCancellation)
    }
  }

  @Test("Boundary task does not retain the app model")
  func boundaryTaskDoesNotRetainModel() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      weak var weakModel: AppModel?
      var retainedRequest: TestTimeBoundarySleepRequest?

      do {
        let model = try await environment.makeModel()
        weakModel = model
        _ = try await makeScheduledReturn(model, environment: environment)
        retainedRequest = await environment.timeBoundarySleeper.nextRequest()
        withExtendedLifetime(model) {}
      }

      let request = try #require(retainedRequest)
      await environment.timeBoundarySleeper.waitForCancellation(of: request)

      #expect(weakModel == nil)
    }
  }

  @Test("Boundary wake does not write private state or evidence")
  func boundaryWakeDoesNotWriteEvidence() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(
        model,
        environment: environment
      )
      let request = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      let storeBeforeWake = await environment.privateStore.snapshot()
      let evidenceBeforeWake = model.learnerState.evidence
      try await waitForReminderOperation(model)
      environment.clock.setNext(to: delayedReturn.opensAt)

      await environment.timeBoundarySleeper.resume(request)
      _ = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      await model.waitForSharedProjectionOperationForTesting()
      try await waitForReminderOperation(model)
      let storeAfterWake = await environment.privateStore.snapshot()

      #expect(storeAfterWake.saveCount == storeBeforeWake.saveCount)
      #expect(model.learnerState.evidence == evidenceBeforeWake)
    }
  }

  @Test("Activity presentation refreshes stale time eligibility")
  func presentActivityRechecksFreshEligibility() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(
        model,
        environment: environment
      )
      let request = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      try await waitForReminderOperation(model)
      environment.clock.setNext(
        to: delayedReturn.dueAt.addingTimeInterval(1)
      )

      model.presentActivity()
      await environment.timeBoundarySleeper.waitForCancellation(of: request)

      #expect(try #require(model.currentDelayedReturn).status == .expired)
      #expect(!model.isActivityPresented)
    }
  }

  @Test("Stale submission writes no receipt or private state")
  func staleSubmissionWritesNoReceipt() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(
        model,
        environment: environment
      )
      let request = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      let storeBeforeSubmission = await environment.privateStore.snapshot()
      let evidenceBeforeSubmission = model.learnerState.evidence
      try await waitForReminderOperation(model)
      environment.clock.setNext(
        to: delayedReturn.dueAt.addingTimeInterval(1)
      )

      let outcome = await model.submitCurrentActivity(
        selectedChoice: "stays_constant_after_force",
        responseText: "This response is stale."
      )
      await environment.timeBoundarySleeper.waitForCancellation(of: request)
      let storeAfterSubmission = await environment.privateStore.snapshot()

      #expect(
        outcome
          == .failed("FORGE could not record this local activity.")
      )
      #expect(storeAfterSubmission.saveCount == storeBeforeSubmission.saveCount)
      #expect(model.learnerState.evidence == evidenceBeforeSubmission)
      #expect(!model.isActivityPresented)
    }
  }

  @Test("Active time environment change refreshes and reschedules")
  func activeTimeEnvironmentChangeRefreshesAndReschedules() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(
        model,
        environment: environment
      )
      let request = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      try await waitForReminderOperation(model)
      environment.clock.setNext(to: delayedReturn.opensAt)

      model.handleTimeEnvironmentChange()
      await environment.timeBoundarySleeper.waitForCancellation(of: request)
      let dueRequest = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}

      #expect(try #require(model.currentDelayedReturn).status == .open)
      #expect(dueRequest.deadline == delayedReturn.dueAt)
    }
  }

  @Test("Inactive time environment change does not refresh")
  func inactiveTimeEnvironmentChangeDoesNotRefresh() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(
        model,
        environment: environment
      )
      let request = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      model.handleScenePhaseChange(.inactive)
      await environment.timeBoundarySleeper.waitForCancellation(of: request)
      let clockCallCount = environment.clock.returnedDates.count
      let requestCount = (await environment.timeBoundarySleeper.snapshot())
        .requests.count
      environment.clock.setNext(to: delayedReturn.opensAt)

      model.handleTimeEnvironmentChange()
      let snapshot = await environment.timeBoundarySleeper.snapshot()

      #expect(environment.clock.returnedDates.count == clockCallCount)
      #expect(snapshot.requests.count == requestCount)
      #expect(try #require(model.currentDelayedReturn).status == .scheduled)
    }
  }

  @Test("Boundary wake reschedules while shared projection is blocked")
  func boundaryReschedulesWhileSharedProjectionIsBlocked() async throws {
    try await withEnvironmentCleanup { environments in
      let gate = OneShotBlockingGate()
      var hooks = ForgeSharedStateStoreTestHooks()
      hooks.beforeLockBinding = { gate.blockIfEnabled() }
      let environment = try environments.makeEnvironment(
        sharedStoreTestHooks: hooks
      )
      let model = try await environment.makeModel()
      let delayedReturn = try await makeScheduledReturn(
        model,
        environment: environment
      )
      let opensRequest = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}
      try await waitForReminderOperation(model)
      gate.enableNextBlock()
      defer { gate.release() }
      environment.clock.setNext(to: delayedReturn.opensAt)

      await environment.timeBoundarySleeper.resume(opensRequest)
      await gate.waitUntilBlocked()
      let dueRequest = await environment.timeBoundarySleeper.nextRequest()
      withExtendedLifetime(model) {}

      #expect(dueRequest.deadline == delayedReturn.dueAt)

      gate.release()
      await model.waitForSharedProjectionOperationForTesting()
      try await waitForReminderOperation(model)
    }
  }

  @Test("Recovery applies the latest URL before pending focus")
  func recoveryRoutePrecedesPendingFocus() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()
      let storedState = try UniversityStarterCourse.initialState(
        updatedAt: environment.clock.now()
      )
      try await environment.privateStore.seed(
        PrivateStateEnvelope(
          learnerState: storedState,
          isCourseStarted: true,
          remindersEnabled: false
        )
      )
      await environment.privateStore.setLoadError(.corruptData)
      let model = try await environment.makeModel()
      try environment.sharedStore.setPendingFocus()

      model.route(try validURL("forge://settings"))
      await environment.privateStore.setLoadError(nil)
      model.retryLocalDataLoad()
      await model.waitForRecoveryOperationForTesting()

      #expect(model.recoveryState == nil)
      #expect(model.selectedTab == .today)
      #expect(model.todayPath == [.settings])
      #expect(!model.isActivityPresented)
      #expect(!(try environment.sharedStore.consumePendingFocus()))
    }
  }

  @Test("Nonfinite initial clock is rejected")
  func nonfiniteClockRejection() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      #expect(throws: UniversityLearningError.self) {
        _ = try AppModel(
          catalog: environment.catalog,
          learningEngine: environment.learningEngine,
          privateStateStore: environment.privateStore,
          sharedStore: environment.sharedStore,
          notificationCoordinator: environment.notificationCoordinator,
          timeBoundarySleeper: environment.timeBoundarySleeper,
          now: { Date(timeIntervalSinceReferenceDate: .infinity) },
          calendar: environment.calendar,
          evidenceIDGenerator: { "evidence.unused" },
          widgetReloader: {}
        )
      }
    }
  }

  @Test("Learning engine and catalog identity must match")
  func engineCatalogMismatchRejection() async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let mismatchedCatalog = try alternateCatalog(from: environment.catalog)

      #expect(throws: UniversityLearningError.self) {
        _ = try AppModel(
          catalog: mismatchedCatalog,
          learningEngine: environment.learningEngine,
          privateStateStore: environment.privateStore,
          sharedStore: environment.sharedStore,
          notificationCoordinator: environment.notificationCoordinator,
          timeBoundarySleeper: environment.timeBoundarySleeper,
          now: { environment.clock.now() },
          calendar: environment.calendar,
          evidenceIDGenerator: { "evidence.unused" },
          widgetReloader: {}
        )
      }
    }
  }

  private func withEnvironmentCleanup(
    _ operation: @MainActor (TestEnvironmentGroup) async throws -> Void
  ) async throws {
    let environments = TestEnvironmentGroup()
    do {
      try await operation(environments)
    } catch {
      await environments.clean()
      throw error
    }
    await environments.clean()
  }

  private func assertRootRoute(
    _ route: String,
    expectedTab: AppTab
  ) async throws {
    try await withEnvironmentCleanup { environments in
      let environment = try environments.makeEnvironment()

      let model = try await environment.makeModel()
      try await startCourse(model)
      model.todayPath = [.settings]
      model.pathPath = [.privacySupport]
      model.evidencePath = [.settings]
      model.presentActivity()
      try environment.sharedStore.setPendingFocus()

      model.route(try validURL(route))
      await model.waitForFocusOperationForTesting()

      #expect(model.selectedTab == expectedTab)
      #expect(model.todayPath.isEmpty)
      #expect(model.pathPath.isEmpty)
      #expect(model.evidencePath.isEmpty)
      #expect(!model.isActivityPresented)
      #expect(!(try environment.sharedStore.consumePendingFocus()))
    }
  }

  private func startCourse(_ model: AppModel) async throws {
    guard await model.startUniversityCourse() else {
      throw AppModelTestError.courseDidNotStart
    }
  }

  private func recordDemonstratedPractice(_ model: AppModel) async throws {
    try requireRecorded(
      await model.submitCurrentActivity(
        selectedChoice: "stays_constant_after_force",
        responseText: "The velocity stays constant after the force is removed."
      ),
      expected: .demonstrated
    )
  }

  private func recordDemonstratedProof(_ model: AppModel) async throws {
    try requireRecorded(
      await model.submitCurrentActivity(
        selectedChoice: "stays_constant_after_force",
        responseText: "The velocity stays constant in the unfamiliar mechanics case."
      ),
      expected: .demonstrated
    )
  }

  private func requireRecorded(
    _ outcome: ActivitySubmissionOutcome,
    expected: ValidatorResult
  ) throws {
    guard outcome == .recorded(expected) else {
      throw AppModelTestError.unexpectedSubmissionOutcome
    }
  }

  private func makeScheduledReturn(
    _ model: AppModel,
    environment: TestEnvironment
  ) async throws -> DelayedReturnRecord {
    try await startCourse(model)
    try await recordDemonstratedPractice(model)
    try await waitForReminderOperation(model)
    try await recordDemonstratedProof(model)
    try await waitForReminderOperation(model)
    return try onlyDelayedReturn(in: model)
  }

  private func makeStoredScheduledReturn(
    in environments: TestEnvironmentGroup
  ) async throws -> (
    envelope: PrivateStateEnvelope,
    delayedReturn: DelayedReturnRecord
  ) {
    let environment = try environments.makeEnvironment()
    let model = try await environment.makeModel()
    let delayedReturn = try await makeScheduledReturn(
      model,
      environment: environment
    )
    let envelope = try #require(try await environment.privateStore.load())
    model.handleScenePhaseChange(.inactive)
    return (envelope, delayedReturn)
  }

  private func onlyDelayedReturn(
    in model: AppModel
  ) throws -> DelayedReturnRecord {
    guard model.learnerState.delayedReturns.count == 1,
      let delayedReturn = model.learnerState.delayedReturns.first
    else {
      throw AppModelTestError.missingDelayedReturn
    }

    return delayedReturn
  }

  private func waitForReminderOperation(_ model: AppModel) async throws {
    await model.waitForReminderOperationForTesting()
    guard !model.isReminderOperationRunning else {
      throw AppModelTestError.operationTimedOut
    }
  }

  private func waitForReset(_ model: AppModel) async throws {
    await model.waitForLocalDataResetOperationForTesting()
    guard !model.isLocalDataResetRunning else {
      throw AppModelTestError.operationTimedOut
    }
  }

  private func waitForBlockedReminderAdd(
    _ notificationCenter: TestNotificationCenter
  ) async throws {
    guard await waitUntil({ notificationCenter.isAddBlocked }) else {
      throw AppModelTestError.operationTimedOut
    }
  }

  private func waitUntil(
    _ condition: @escaping @MainActor () -> Bool
  ) async -> Bool {
    for _ in 0..<maximumTaskPollCount {
      if condition() {
        return true
      }
      await Task.yield()
    }

    return condition()
  }

  private func validURL(_ string: String) throws -> URL {
    guard let url = URL(string: string) else {
      throw AppModelTestError.invalidURL
    }

    return url
  }

  private func alternateCatalog(
    from catalog: ReleasedCatalogSnapshot
  ) throws -> ReleasedCatalogSnapshot {
    try ReleasedCatalogSnapshot(
      catalogReleaseID: CatalogReleaseID("catalog.adult-mechanics.local-starter.v2"),
      package: catalog.package,
      courseID: catalog.courseID,
      capabilities: catalog.capabilities,
      activities: catalog.activities,
      sourceBindings: catalog.sourceBindings,
      proofClaimIDs: catalog.proofClaimIDs,
      limitations: catalog.limitations
    )
  }
}

private let maximumTaskPollCount = 256

private enum AppModelTestError: Error {
  case courseDidNotStart
  case invalidStoredData
  case invalidURL
  case lockAcquisitionFailed
  case missingDelayedReturn
  case operationTimedOut
  case unexpectedSubmissionOutcome
}

private final class SharedProjectionWriteCounter: Sendable {
  private let count = Mutex(0)

  var value: Int {
    count.withLock { $0 }
  }

  func record(stagingName: String) {
    guard stagingName == "forge.return-projection.v3.json.staging" else {
      return
    }
    count.withLock { $0 += 1 }
  }
}

private final class OneShotBlockingGate: Sendable {
  private struct State: Sendable {
    var isEnabled = false
    var didBlock = false
  }

  private let state = Mutex(State())
  private let releaseSemaphore = DispatchSemaphore(value: 0)
  private let entered: AsyncStream<Void>
  private let enteredContinuation: AsyncStream<Void>.Continuation

  init() {
    (entered, enteredContinuation) = AsyncStream.makeStream(
      bufferingPolicy: .bufferingNewest(1)
    )
  }

  func enableNextBlock() {
    state.withLock {
      precondition(!$0.isEnabled)
      precondition(!$0.didBlock)
      $0.isEnabled = true
    }
  }

  func blockIfEnabled() {
    let shouldBlock = state.withLock { state in
      guard state.isEnabled, !state.didBlock else {
        return false
      }
      state.didBlock = true
      return true
    }
    guard shouldBlock else {
      return
    }

    enteredContinuation.yield()
    releaseSemaphore.wait()
  }

  func waitUntilBlocked() async {
    var iterator = entered.makeAsyncIterator()
    _ = await iterator.next()
  }

  func release() {
    releaseSemaphore.signal()
  }
}

private struct TestTimeBoundarySleepRequest: Equatable, Sendable {
  let id: UInt64
  let deadline: Date
  let scheduledFrom: Date
}

private struct TestTimeBoundarySleeperSnapshot: Equatable, Sendable {
  let requests: [TestTimeBoundarySleepRequest]
  let pendingIDs: Set<UInt64>
  let cancelledIDs: Set<UInt64>
}

private actor TestTimeBoundarySleeper: TimeBoundarySleeping {
  private var isShutDown = false
  private var nextID: UInt64 = 1
  private var requests: [TestTimeBoundarySleepRequest] = []
  private var queuedRequests: [TestTimeBoundarySleepRequest] = []
  private var requestWaiters: [CheckedContinuation<TestTimeBoundarySleepRequest, Never>] = []
  private var pending: [UInt64: CheckedContinuation<Void, any Error>] = [:]
  private var cancelledIDs: Set<UInt64> = []
  private var cancellationWaiters: [UInt64: [CheckedContinuation<Void, Never>]] = [:]
  private var completedIDs: Set<UInt64> = []
  private var completionWaiters: [UInt64: [CheckedContinuation<Void, Never>]] = [:]
  private var nonCooperativeIDs: Set<UInt64> = []
  private var quiescenceWaiters: [CheckedContinuation<Void, Never>] = []

  func sleep(until deadline: Date, from now: Date) async throws {
    guard !isShutDown else {
      throw CancellationError()
    }
    let request = TestTimeBoundarySleepRequest(
      id: nextID,
      deadline: deadline,
      scheduledFrom: now
    )
    nextID &+= 1
    requests.append(request)
    publish(request)
    defer { complete(request.id) }

    try await withTaskCancellationHandler {
      try await withCheckedThrowingContinuation { continuation in
        pending[request.id] = continuation
      }
      try Task.checkCancellation()
    } onCancel: {
      Task {
        await self.cancel(request.id)
      }
    }
  }

  func nextRequest() async -> TestTimeBoundarySleepRequest {
    if !queuedRequests.isEmpty {
      return queuedRequests.removeFirst()
    }
    return await withCheckedContinuation { continuation in
      requestWaiters.append(continuation)
    }
  }

  func keepPendingAfterCancellation(
    _ request: TestTimeBoundarySleepRequest
  ) {
    precondition(pending[request.id] != nil)
    nonCooperativeIDs.insert(request.id)
  }

  func waitForCancellation(
    of request: TestTimeBoundarySleepRequest
  ) async {
    if cancelledIDs.contains(request.id) {
      return
    }
    await withCheckedContinuation { continuation in
      cancellationWaiters[request.id, default: []].append(continuation)
    }
  }

  func resume(_ request: TestTimeBoundarySleepRequest) {
    guard let continuation = pending.removeValue(forKey: request.id) else {
      preconditionFailure("The time-boundary request is not pending.")
    }
    nonCooperativeIDs.remove(request.id)
    continuation.resume()
    resumeQuiescenceWaitersIfReady()
  }

  func waitForCompletion(
    of request: TestTimeBoundarySleepRequest
  ) async {
    if completedIDs.contains(request.id) {
      return
    }
    await withCheckedContinuation { continuation in
      completionWaiters[request.id, default: []].append(continuation)
    }
  }

  func snapshot() -> TestTimeBoundarySleeperSnapshot {
    TestTimeBoundarySleeperSnapshot(
      requests: requests,
      pendingIDs: Set(pending.keys),
      cancelledIDs: cancelledIDs
    )
  }

  func cancelAll() {
    isShutDown = true
    let continuations = Array(pending.values)
    pending.removeAll()
    nonCooperativeIDs.removeAll()
    for continuation in continuations {
      continuation.resume(throwing: CancellationError())
    }
    resumeQuiescenceWaitersIfReady()
  }

  func waitForQuiescence() async {
    if pending.isEmpty {
      return
    }
    await withCheckedContinuation { continuation in
      quiescenceWaiters.append(continuation)
    }
  }

  private func publish(_ request: TestTimeBoundarySleepRequest) {
    if requestWaiters.isEmpty {
      queuedRequests.append(request)
      return
    }
    let waiter = requestWaiters.removeFirst()
    waiter.resume(returning: request)
  }

  private func cancel(_ id: UInt64) {
    cancelledIDs.insert(id)
    let waiters = cancellationWaiters.removeValue(forKey: id) ?? []
    for waiter in waiters {
      waiter.resume()
    }
    guard !nonCooperativeIDs.contains(id) else {
      return
    }
    if let continuation = pending.removeValue(forKey: id) {
      continuation.resume(throwing: CancellationError())
    }
    resumeQuiescenceWaitersIfReady()
  }

  private func complete(_ id: UInt64) {
    completedIDs.insert(id)
    let waiters = completionWaiters.removeValue(forKey: id) ?? []
    for waiter in waiters {
      waiter.resume()
    }
  }

  private func resumeQuiescenceWaitersIfReady() {
    guard pending.isEmpty else {
      return
    }
    let waiters = quiescenceWaiters
    quiescenceWaiters.removeAll()
    for waiter in waiters {
      waiter.resume()
    }
  }
}

private func holdExclusiveSharedStoreLock(in root: URL) throws -> Int32 {
  let lockURL = root.appendingPathComponent("forge-shared-state-v3.lock")
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
  guard descriptor >= 0 else {
    throw AppModelTestError.lockAcquisitionFailed
  }
  guard flock(descriptor, LOCK_EX | LOCK_NB) == 0 else {
    _ = close(descriptor)
    throw AppModelTestError.lockAcquisitionFailed
  }
  return descriptor
}

private func releaseSharedStoreLock(_ descriptor: Int32) {
  _ = flock(descriptor, LOCK_UN)
  _ = close(descriptor)
}

@MainActor
private final class TestEnvironmentGroup {
  private var environments: [TestEnvironment] = []

  func makeEnvironment(
    start: Date = Date(timeIntervalSince1970: 2_000_000_000),
    legacyDefaults: UserDefaults? = nil,
    legacySuiteName: String? = nil,
    sharedStoreTestHooks: ForgeSharedStateStoreTestHooks = .init()
  ) throws -> TestEnvironment {
    let environment = try TestEnvironment(
      start: start,
      legacyDefaults: legacyDefaults,
      legacySuiteName: legacySuiteName,
      sharedStoreTestHooks: sharedStoreTestHooks
    )
    environments.append(environment)
    return environment
  }

  func clean() async {
    for environment in environments.reversed() {
      await environment.clean()
    }
    environments.removeAll()
  }
}

@MainActor
private final class TestEnvironment {
  let rootURL: URL
  let privateFileURL: URL
  let sharedRootURL: URL
  let catalog: ReleasedCatalogSnapshot
  let learningEngine: UniversityLearningEngine
  let calendar: Calendar
  let clock: StrictDateClock
  let privateStore: TestPrivateStateStore
  let sharedStore: ForgeSharedStateStore
  let notificationCenter: TestNotificationCenter
  let notificationCoordinator: NotificationCoordinator
  let timeBoundarySleeper: TestTimeBoundarySleeper
  let semesterDeskClock: TestSemesterDeskClock
  let semesterDeskIdentifiers: TestSemesterDeskIdentifierFactory

  private var nextEvidenceNumber = 1
  private var nextProfileNumber = 1
  private let legacyDefaults: UserDefaults?
  private let legacySuiteName: String?
  private(set) var widgetReloadCount = 0

  init(
    start: Date = Date(timeIntervalSince1970: 2_000_000_000),
    legacyDefaults: UserDefaults? = nil,
    legacySuiteName: String? = nil,
    sharedStoreTestHooks: ForgeSharedStateStoreTestHooks = .init()
  ) throws {
    let rootURL = FileManager.default.temporaryDirectory.appendingPathComponent(
      "forge-app-model-tests-\(UUID().uuidString)",
      isDirectory: true
    )
    let privateRootURL = rootURL.appendingPathComponent("private", isDirectory: true)
    let sharedRootURL = rootURL.appendingPathComponent("app-group", isDirectory: true)
    try FileManager.default.createDirectory(
      at: privateRootURL,
      withIntermediateDirectories: true
    )
    try FileManager.default.createDirectory(
      at: sharedRootURL,
      withIntermediateDirectories: true
    )

    let privateFileURL = privateRootURL.appendingPathComponent(
      "private-state-v5.json",
      isDirectory: false
    )
    let availability = TestProtectedDataAvailability()
    let privateStore = TestPrivateStateStore(
      fileURL: privateFileURL,
      protectedDataAvailability: availability
    )
    let notificationCenter = TestNotificationCenter()
    let timeBoundarySleeper = TestTimeBoundarySleeper()
    let clock = StrictDateClock(start: start)
    let semesterDeskClock = TestSemesterDeskClock(
      timestamp: "2033-05-18T03:33:20.000Z"
    )
    let semesterDeskIdentifiers = TestSemesterDeskIdentifierFactory()
    let timeZone = TimeZone(secondsFromGMT: 0) ?? .gmt
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    let catalog = try UniversityStarterCourse.catalog()
    let learningEngine = try UniversityLearningEngine(
      catalog: catalog,
      validators: ValidatorRegistry()
    )

    self.rootURL = rootURL
    self.privateFileURL = privateFileURL
    self.sharedRootURL = sharedRootURL
    self.catalog = catalog
    self.learningEngine = learningEngine
    self.calendar = calendar
    self.clock = clock
    self.privateStore = privateStore
    self.sharedStore = ForgeSharedStateStore(
      sharedRootDirectory: sharedRootURL,
      legacyDefaults: legacyDefaults,
      testHooks: sharedStoreTestHooks
    )
    self.notificationCenter = notificationCenter
    self.timeBoundarySleeper = timeBoundarySleeper
    self.semesterDeskClock = semesterDeskClock
    self.semesterDeskIdentifiers = semesterDeskIdentifiers
    self.notificationCoordinator = NotificationCoordinator(
      center: notificationCenter,
      calendar: calendar,
      timeZone: timeZone,
      now: { clock.now() }
    )
    self.legacyDefaults = legacyDefaults
    self.legacySuiteName = legacySuiteName
  }

  func makeModel(
    includeSharedStore: Bool = true,
    now: (@MainActor () -> Date)? = nil,
    initialScenePhase: ScenePhase = .active
  ) async throws -> AppModel {
    let model = try await makeUnlaunchedModel(
      includeSharedStore: includeSharedStore,
      now: now
    )
    model.handleScenePhaseChange(initialScenePhase)
    await model.launch()
    return model
  }

  func makeUnlaunchedModel(
    includeSharedStore: Bool = true,
    now: (@MainActor () -> Date)? = nil,
    launchPreparation: @escaping @MainActor () async throws -> UInt64? = { nil }
  ) async throws -> AppModel {
    return try AppModel(
      catalog: catalog,
      learningEngine: learningEngine,
      privateStateStore: privateStore,
      sharedStore: includeSharedStore ? sharedStore : nil,
      notificationCoordinator: notificationCoordinator,
      timeBoundarySleeper: timeBoundarySleeper,
      now: now ?? { [clock] in clock.now() },
      calendar: calendar,
      evidenceIDGenerator: { [self] in
        nextEvidenceID()
      },
      localProfileIDGenerator: { [self] in
        nextProfileID()
      },
      semesterDeskRuntimeProvider: { [self] in
        UniversitySemesterDeskRuntime(
          clock: semesterDeskClock,
          identifiers: semesterDeskIdentifiers
        )
      },
      widgetReloader: { [self] in
        widgetReloadCount += 1
      },
      launchPreparation: launchPreparation
    )
  }

  func writeUnsupportedSchema() async throws {
    let data = try await privateStore.rawData()
    guard var object = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      throw AppModelTestError.invalidStoredData
    }

    object["schemaVersion"] = PrivateStateEnvelope.currentSchemaVersion + 1
    let updatedData = try JSONSerialization.data(
      withJSONObject: object,
      options: [.sortedKeys]
    )
    try updatedData.write(to: privateFileURL, options: .atomic)
  }

  func clean() async {
    await timeBoundarySleeper.cancelAll()
    await timeBoundarySleeper.waitForQuiescence()
    notificationCenter.resumeAfterAdd()
    notificationCenter.resumePendingLookup()
    await notificationCenter.waitForBlockedOperationsToFinish()
    await privateStore.waitForQuiescence()
    try? FileManager.default.removeItem(at: rootURL)
    if let legacySuiteName {
      legacyDefaults?.removePersistentDomain(forName: legacySuiteName)
    }
  }

  private func nextEvidenceID() -> String {
    defer { nextEvidenceNumber += 1 }
    return "evidence.app-model.\(nextEvidenceNumber)"
  }

  private func nextProfileID() -> String {
    defer { nextProfileNumber += 1 }
    return "profile.app-model.\(nextProfileNumber)"
  }
}

@MainActor
private final class StrictDateClock {
  private var nextDate: Date
  private var queuedDates: [Date] = []
  private(set) var returnedDates: [Date] = []

  init(start: Date) {
    nextDate = start
  }

  func now() -> Date {
    let currentDate = queuedDates.isEmpty ? nextDate : queuedDates.removeFirst()
    if let lastDate = returnedDates.last {
      precondition(currentDate > lastDate)
    }
    returnedDates.append(currentDate)
    nextDate = currentDate.addingTimeInterval(1)
    return currentDate
  }

  func setNext(to date: Date) {
    if let lastDate = returnedDates.last {
      precondition(date > lastDate)
    }
    queuedDates.removeAll()
    nextDate = date
  }

  func enqueue(_ date: Date) {
    let priorDate = queuedDates.last ?? returnedDates.last
    if let priorDate {
      precondition(date > priorDate)
    }
    queuedDates.append(date)
  }
}

private final class TestSemesterDeskClock:
  UniversitySemesterDeskClock,
  Sendable
{
  private let timestamp: String

  init(timestamp: String) {
    self.timestamp = timestamp
  }

  func now() -> String {
    timestamp
  }
}

private final class TestSemesterDeskIdentifierFactory:
  UniversitySemesterDeskIdentifierFactory,
  Sendable
{
  private let count = Mutex(0)

  func next(kind: UniversitySemesterDeskIdentifierKind) -> String {
    let ordinal = count.withLock { count in
      count += 1
      return count
    }
    return "\(kind.rawValue).app-model.\(ordinal)"
  }
}

@MainActor
private final class TestProtectedDataAvailability: ProtectedDataAvailability {
  var isAvailable = true
}

private struct TestPrivateStateSaveSnapshot: Equatable, Sendable {
  let state: PrivateStateEnvelope
  let token: PrivateStateSaveToken
}

private struct TestPrivateStateStoreSnapshot: Equatable, Sendable {
  let loadCount: Int
  let saveCount: Int
  let clearCount: Int
  let saves: [TestPrivateStateSaveSnapshot]
  let clearEpochs: [UInt64]
}

private struct TestPrivateStateStoreTicket: Hashable, Sendable {
  let operation: PrivateStateStoreOperation
  let ordinal: Int
}

private enum TestPrivateStateLoadOverride: Sendable {
  case value(PrivateStateEnvelope?)
}

private actor TestPrivateStateStore: PrivateStateStoring {
  nonisolated let fileURL: URL

  private let protectedDataAvailability: any ProtectedDataAvailability
  private var store: PrivateStateStore
  private var loadError: PrivateStateStoreError?
  private var loadOverride: TestPrivateStateLoadOverride?
  private var saveError: PrivateStateStoreError?
  private var nextSaveResult: PrivateStateSaveResult?
  private var clearError: PrivateStateStoreError?
  private var saveNamespace: PrivateStateNamespaceSynchronization = .synchronized
  private var loadCount = 0
  private var saveCount = 0
  private var clearCount = 0
  private var saves: [TestPrivateStateSaveSnapshot] = []
  private var clearEpochs: [UInt64] = []
  private var operationToBlock: PrivateStateStoreOperation?
  private var blockedTicket: TestPrivateStateStoreTicket?
  private var blockedOperationContinuation: CheckedContinuation<Void, Never>?
  private var blockedWaiters: [CheckedContinuation<Void, Never>] = []
  private var completedTickets: Set<TestPrivateStateStoreTicket> = []
  private var completionWaiters: [TestPrivateStateStoreTicket: [CheckedContinuation<Void, Never>]] =
    [:]
  private var activeTickets: Set<TestPrivateStateStoreTicket> = []
  private var quiescenceWaiters: [CheckedContinuation<Void, Never>] = []

  init(
    fileURL: URL,
    protectedDataAvailability: any ProtectedDataAvailability
  ) {
    self.fileURL = fileURL
    self.protectedDataAvailability = protectedDataAvailability
    store = PrivateStateStore(
      fileURL: fileURL,
      protectedDataAvailability: protectedDataAvailability
    )
  }

  func setLoadError(_ error: PrivateStateStoreError?) {
    loadError = error
  }

  func setLoadOverride(_ envelope: PrivateStateEnvelope?) {
    loadOverride = .value(envelope)
  }

  func setSaveError(_ error: PrivateStateStoreError?) {
    saveError = error
  }

  func setNextSaveResult(_ result: PrivateStateSaveResult?) {
    nextSaveResult = result
  }

  func setClearError(_ error: PrivateStateStoreError?) {
    clearError = error
  }

  func setSaveNamespace(
    _ namespace: PrivateStateNamespaceSynchronization
  ) {
    saveNamespace = namespace
  }

  func blockNextOperation(_ operation: PrivateStateStoreOperation) {
    precondition(operationToBlock == nil)
    precondition(blockedTicket == nil)
    operationToBlock = operation
  }

  func waitForBlockedOperation(
    _ operation: PrivateStateStoreOperation
  ) async -> TestPrivateStateStoreTicket {
    if let blockedTicket, blockedTicket.operation == operation {
      return blockedTicket
    }
    await withCheckedContinuation { continuation in
      blockedWaiters.append(continuation)
    }
    guard let blockedTicket, blockedTicket.operation == operation else {
      preconditionFailure("The requested storage operation did not block.")
    }
    return blockedTicket
  }

  func releaseBlockedOperation(
    _ ticket: TestPrivateStateStoreTicket
  ) {
    precondition(blockedTicket == ticket)
    blockedTicket = nil
    let continuation = blockedOperationContinuation
    blockedOperationContinuation = nil
    continuation?.resume()
  }

  func waitForCompletion(
    of ticket: TestPrivateStateStoreTicket
  ) async {
    if completedTickets.contains(ticket) {
      return
    }
    await withCheckedContinuation { continuation in
      completionWaiters[ticket, default: []].append(continuation)
    }
  }

  func waitForQuiescence() async {
    if activeTickets.isEmpty {
      return
    }
    await withCheckedContinuation { continuation in
      quiescenceWaiters.append(continuation)
    }
  }

  func snapshot() -> TestPrivateStateStoreSnapshot {
    TestPrivateStateStoreSnapshot(
      loadCount: loadCount,
      saveCount: saveCount,
      clearCount: clearCount,
      saves: saves,
      clearEpochs: clearEpochs
    )
  }

  func load() async throws -> PrivateStateEnvelope? {
    loadCount += 1
    let ticket = TestPrivateStateStoreTicket(
      operation: .load,
      ordinal: loadCount
    )
    activeTickets.insert(ticket)
    defer { complete(ticket) }
    await waitAtGate(for: ticket)
    if let loadError {
      throw loadError
    }
    if let loadOverride {
      switch loadOverride {
      case .value(let envelope):
        return envelope
      }
    }

    return try await store.load()
  }

  func save(
    _ state: PrivateStateEnvelope,
    token: PrivateStateSaveToken
  ) async throws -> PrivateStateSaveResult {
    saveCount += 1
    saves.append(TestPrivateStateSaveSnapshot(state: state, token: token))
    let ticket = TestPrivateStateStoreTicket(
      operation: .save,
      ordinal: saveCount
    )
    activeTickets.insert(ticket)
    defer { complete(ticket) }
    await waitAtGate(for: ticket)
    if let saveError {
      throw saveError
    }
    if let nextSaveResult {
      self.nextSaveResult = nil
      return nextSaveResult
    }
    let result = try await store.save(state, token: token)
    switch result {
    case .installed:
      return .installed(namespace: saveNamespace)
    case .superseded:
      return .superseded
    }
  }

  func clear(resetEpoch: UInt64) async throws -> PrivateStateClearResult {
    clearCount += 1
    clearEpochs.append(resetEpoch)
    let ticket = TestPrivateStateStoreTicket(
      operation: .clear,
      ordinal: clearCount
    )
    activeTickets.insert(ticket)
    defer { complete(ticket) }
    await waitAtGate(for: ticket)
    if let clearError {
      throw clearError
    }
    return try await store.clear(resetEpoch: resetEpoch)
  }

  func seed(_ state: PrivateStateEnvelope) async throws {
    precondition(activeTickets.isEmpty)
    precondition(loadCount == 0)
    precondition(saveCount == 0)
    precondition(clearCount == 0)
    let seedingStore = PrivateStateStore(
      fileURL: fileURL,
      protectedDataAvailability: protectedDataAvailability
    )
    _ = try await seedingStore.save(state)
    store = PrivateStateStore(
      fileURL: fileURL,
      protectedDataAvailability: protectedDataAvailability
    )
  }

  func rawData() throws -> Data {
    try Data(contentsOf: fileURL)
  }

  private func waitAtGate(
    for ticket: TestPrivateStateStoreTicket
  ) async {
    guard operationToBlock == ticket.operation else {
      return
    }
    operationToBlock = nil
    blockedTicket = ticket
    let waiters = blockedWaiters
    blockedWaiters.removeAll()
    for waiter in waiters {
      waiter.resume()
    }
    await withCheckedContinuation { continuation in
      blockedOperationContinuation = continuation
    }
  }

  private func complete(
    _ ticket: TestPrivateStateStoreTicket
  ) {
    activeTickets.remove(ticket)
    completedTickets.insert(ticket)
    let waiters = completionWaiters.removeValue(forKey: ticket) ?? []
    for waiter in waiters {
      waiter.resume()
    }
    if activeTickets.isEmpty {
      let waiters = quiescenceWaiters
      quiescenceWaiters.removeAll()
      for waiter in waiters {
        waiter.resume()
      }
    }
  }
}

@MainActor
private final class TestNotificationCenter:
  LocalNotificationCenter,
  ImmediateNotificationRemovalReporting
{
  static let managedReminderIdentifier = "forge.return-reminder"
  static let staleManagedReminderIdentifier = "forge.return-reminder.stale"

  var authorizationStatusValue: LocalNotificationAuthorizationStatus = .authorized
  var authorizationResult: Bool?
  var authorizationError: Error?
  var addError: Error?
  var preventRemoval = false
  var pausesAfterAdd = false
  var pausesPendingLookup = false
  var pendingIdentifiers = Set<String>()
  var deliveredIdentifiers = Set<String>()
  private(set) var authorizationRequestCount = 0
  private(set) var addedIdentifiers = [String]()
  private(set) var pendingLookupCount = 0
  private(set) var deliveredLookupCount = 0
  private(set) var isAddBlocked = false
  private(set) var isPendingLookupBlocked = false

  private var addContinuation: CheckedContinuation<Void, Never>?
  private var pendingLookupContinuation: CheckedContinuation<Void, Never>?
  private var pendingLookupCancellationRequested = false
  private var pendingLookupBlockedWaiters: [CheckedContinuation<Void, Never>] = []
  private var unblockedWaiters: [CheckedContinuation<Void, Never>] = []

  func authorizationStatus() async -> LocalNotificationAuthorizationStatus {
    authorizationStatusValue
  }

  func requestAuthorization(options _: UNAuthorizationOptions) async throws -> Bool {
    authorizationRequestCount += 1
    if let authorizationError {
      throw authorizationError
    }

    return authorizationResult ?? authorizationStatusValue.permitsScheduling
  }

  func add(_ request: UNNotificationRequest) async throws {
    if let addError {
      throw addError
    }

    pendingIdentifiers.insert(request.identifier)
    addedIdentifiers.append(request.identifier)
    guard pausesAfterAdd else {
      return
    }

    isAddBlocked = true
    await withCheckedContinuation { continuation in
      addContinuation = continuation
    }
    isAddBlocked = false
    resumeUnblockedWaitersIfReady()
  }

  func pendingNotificationIdentifiers() async -> [String] {
    pendingLookupCount += 1
    if pausesPendingLookup {
      isPendingLookupBlocked = true
      let blockedWaiters = pendingLookupBlockedWaiters
      pendingLookupBlockedWaiters.removeAll()
      for waiter in blockedWaiters {
        waiter.resume()
      }
      await withTaskCancellationHandler(
        operation: {
          await withCheckedContinuation { continuation in
            if pendingLookupCancellationRequested {
              continuation.resume()
            } else {
              pendingLookupContinuation = continuation
            }
          }
        },
        onCancel: { [weak self] in
          Task { @MainActor [weak self] in
            self?.cancelPendingLookup()
          }
        }
      )
      pendingLookupCancellationRequested = false
      isPendingLookupBlocked = false
      resumeUnblockedWaitersIfReady()
    }
    return pendingIdentifiers.sorted()
  }

  func deliveredNotificationIdentifiers() async -> [String] {
    deliveredLookupCount += 1
    return deliveredIdentifiers.sorted()
  }

  func removePendingNotificationRequests(
    withIdentifiers identifiers: [String]
  ) {
    _ = removePendingNotificationsImmediately(
      withIdentifiers: identifiers
    )
  }

  func removeDeliveredNotifications(
    withIdentifiers identifiers: [String]
  ) {
    _ = removeDeliveredNotificationsImmediately(
      withIdentifiers: identifiers
    )
  }

  func removePendingNotificationsImmediately(
    withIdentifiers identifiers: [String]
  ) -> Bool {
    guard !preventRemoval else {
      return false
    }

    pendingIdentifiers.subtract(identifiers)
    return true
  }

  func removeDeliveredNotificationsImmediately(
    withIdentifiers identifiers: [String]
  ) -> Bool {
    guard !preventRemoval else {
      return false
    }

    deliveredIdentifiers.subtract(identifiers)
    return true
  }

  func resumeAfterAdd() {
    pausesAfterAdd = false
    addContinuation?.resume()
    addContinuation = nil
  }

  func resumePendingLookup() {
    pausesPendingLookup = false
    pendingLookupContinuation?.resume()
    pendingLookupContinuation = nil
  }

  func waitForPendingLookup() async {
    guard !isPendingLookupBlocked else {
      return
    }

    await withCheckedContinuation { continuation in
      pendingLookupBlockedWaiters.append(continuation)
    }
  }

  func waitForBlockedOperationsToFinish() async {
    guard isAddBlocked || isPendingLookupBlocked else {
      return
    }
    await withCheckedContinuation { continuation in
      unblockedWaiters.append(continuation)
    }
  }

  private func resumeUnblockedWaitersIfReady() {
    guard !isAddBlocked, !isPendingLookupBlocked else {
      return
    }
    let waiters = unblockedWaiters
    unblockedWaiters.removeAll()
    for waiter in waiters {
      waiter.resume()
    }
  }

  private func cancelPendingLookup() {
    pausesPendingLookup = false
    pendingLookupCancellationRequested = true
    pendingLookupContinuation?.resume()
    pendingLookupContinuation = nil
  }
}

private final class RemovalResistantDefaults: UserDefaults {
  var protectedKey: String?

  override func removeObject(forKey defaultName: String) {
    guard defaultName != protectedKey else {
      return
    }
    super.removeObject(forKey: defaultName)
  }
}
