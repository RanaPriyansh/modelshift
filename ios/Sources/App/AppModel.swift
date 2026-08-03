import ForgeCore
import Foundation
import Observation
import SwiftUI
import WidgetKit

protocol TimeBoundarySleeping: Sendable {
  func sleep(until deadline: Date, from now: Date) async throws
}

struct SystemTimeBoundarySleeper: TimeBoundarySleeping {
  func sleep(until deadline: Date, from now: Date) async throws {
    let interval = deadline.timeIntervalSince(now)
    guard interval.isFinite, interval > 0 else {
      try Task.checkCancellation()
      return
    }

    try await Task.sleep(for: .seconds(interval))
  }
}

private struct CapturedSemesterDeskClock: UniversitySemesterDeskClock {
  let timestamp: String

  func now() -> String {
    timestamp
  }
}

private struct SystemSemesterDeskIdentifierFactory:
  UniversitySemesterDeskIdentifierFactory
{
  func next(kind: UniversitySemesterDeskIdentifierKind) -> String {
    "\(kind.rawValue).\(UUID().uuidString.lowercased())"
  }
}

enum AppTab: Hashable, Sendable {
  case today
  case semester
  case progress
}

enum AppRoute: Hashable, Sendable {
  case settings
  case privacySupport
}

enum SemesterDeskSheet: Equatable, Identifiable, Sendable {
  case addCourse
  case addCourseFact(courseID: String)
  case changeFactStatus(courseID: String, factID: String)
  case recordFactConflict(courseID: String)
  case capacity
  case addPlannedWork(courseID: String?)
  case prepareRecovery
  case reviewRecovery
  case chooseNextAction

  var id: String {
    switch self {
    case .addCourse:
      "add-course"
    case .addCourseFact(let courseID):
      "add-course-fact-\(courseID)"
    case .changeFactStatus(let courseID, let factID):
      "change-fact-status-\(courseID)-\(factID)"
    case .recordFactConflict(let courseID):
      "record-fact-conflict-\(courseID)"
    case .capacity:
      "capacity"
    case .addPlannedWork(let courseID):
      "add-planned-work-\(courseID ?? "choose-course")"
    case .prepareRecovery:
      "prepare-recovery"
    case .reviewRecovery:
      "review-recovery"
    case .chooseNextAction:
      "choose-next-action"
    }
  }
}

enum SemesterDeskTodayAction: Equatable, Sendable {
  case finishRecovery
  case delayedReturn(
    delayedReturnID: String,
    planItemID: String,
    dueAt: String,
    isDue: Bool
  )
  case selectedAction(planItemID: String)
  case choosePlannedWork
  case confirmCapacity
  case addPlannedWork(courseID: String?)
  case addCourse
}

struct SemesterDeskStudyDraft: Equatable, Sendable {
  static let empty = SemesterDeskStudyDraft(
    practiceText: "",
    independentCheckText: "",
    delayedReturnText: ""
  )

  let practiceText: String
  let independentCheckText: String
  let delayedReturnText: String

  var hasContent: Bool {
    !practiceText.isEmpty
      || !independentCheckText.isEmpty
      || !delayedReturnText.isEmpty
  }
}

enum AppLaunchState: Equatable, Sendable {
  case loading
  case ready
}

enum AppModelRecoveryState: Equatable, Sendable {
  case protectedDataUnavailable(message: String)
  case loadFailed(message: String)
  case saveFailed(message: String)
  case resetFailed(message: String)

  var message: String {
    switch self {
    case .protectedDataUnavailable(let message),
      .loadFailed(let message),
      .saveFailed(let message),
      .resetFailed(let message):
      message
    }
  }

  var allowsClearLocalData: Bool {
    if case .protectedDataUnavailable = self {
      return false
    }

    return true
  }
}

enum AppLifecyclePolicy {
  enum Phase: Equatable, Sendable {
    case active
    case inactive
    case background
    case unknown
  }

  enum Action: Equatable, Sendable {
    case consumePendingSystemDestination
    case reconcileReminders
    case persistCurrentState
  }

  static func phase(for scenePhase: ScenePhase) -> Phase {
    switch scenePhase {
    case .active:
      .active
    case .inactive:
      .inactive
    case .background:
      .background
    @unknown default:
      .unknown
    }
  }

  static func actions(for scenePhase: ScenePhase) -> [Action] {
    actions(for: phase(for: scenePhase))
  }

  static func actions(for phase: Phase) -> [Action] {
    switch phase {
    case .active:
      [.consumePendingSystemDestination, .reconcileReminders]
    case .background:
      [.persistCurrentState]
    case .inactive, .unknown:
      []
    }
  }
}

private enum AppSharedStateResult<Value: Sendable>: Sendable {
  case success(Value)
  case unavailable
  case failure
}

private enum AppSharedProjectionMutation: Sendable {
  case unchanged
  case changed
}

private struct AppSharedStateStoreHandle: @unchecked Sendable {
  // ForgeSharedStateStore is immutable and locks every mutable file operation.
  // AppSharedStateService is the only in-process App user after initialization.
  let store: ForgeSharedStateStore?
}

private actor AppSharedStateService: Sendable {
  private static let projectionRefreshLeadTime: TimeInterval = 3_600

  private let store: ForgeSharedStateStore?

  init(handle: AppSharedStateStoreHandle) {
    store = handle.store
  }

  func updateProjectionIfChanged(
    _ projection: ForgeSemesterDeskProjection?
  ) -> AppSharedStateResult<AppSharedProjectionMutation> {
    guard let store else {
      return .unavailable
    }

    do {
      let storedProjection = try store.loadProjection()
      guard let projection else {
        guard storedProjection != nil else {
          return .success(.unchanged)
        }
        try store.clearProjection()
        return .success(.changed)
      }

      if let storedProjection,
        storedProjection.status == projection.status,
        storedProjection.dueAt == projection.dueAt,
        storedProjection.generatedAt <= projection.generatedAt,
        storedProjection.validUntil
          > projection.generatedAt.addingTimeInterval(
            Self.projectionRefreshLeadTime
          )
      {
        return .success(.unchanged)
      }

      try store.saveProjection(projection)
      return .success(.changed)
    } catch {
      return .failure
    }
  }

  func clearAll() -> AppSharedStateResult<Void> {
    guard let store else {
      return .unavailable
    }

    do {
      try store.clearAll()
      return .success(())
    } catch {
      return .failure
    }
  }

  func purgeLegacyState() -> AppSharedStateResult<Void> {
    guard let store else {
      return .unavailable
    }

    do {
      guard try store.purgeLegacyState() else {
        return .failure
      }
      return .success(())
    } catch {
      return .failure
    }
  }

  func consumePendingDestination() -> AppSharedStateResult<ForgeDestination?> {
    guard let store else {
      return .unavailable
    }

    do {
      return .success(try store.consumePendingDestination())
    } catch {
      return .failure
    }
  }
}

@MainActor
@Observable
final class AppModel {
  private static let postDueRefreshEpsilon: TimeInterval = 0.001

  private enum SharedIntegrationIssue: Hashable {
    case projectionUpdate
    case sharedClear
    case sharedClearUnavailable
    case legacyPurge
    case legacyPurgeUnavailable
    case pendingDestinationRead

    var message: String {
      switch self {
      case .projectionUpdate:
        "FORGE could not update shared return data."
      case .sharedClear:
        "FORGE could not clear shared return data."
      case .sharedClearUnavailable, .legacyPurgeUnavailable:
        "Shared return data is unavailable on this device."
      case .legacyPurge:
        "FORGE could not remove legacy shared data."
      case .pendingDestinationRead:
        "FORGE could not read the pending system route."
      }
    }
  }

  private struct ReminderOperationToken: Equatable, Sendable {
    let generation: UInt64
    let stateRevision: UInt64
    let resetEpoch: UInt64
  }

  private struct StateMutationToken: Equatable, Sendable {
    let generation: UInt64
    let resetEpoch: UInt64
  }

  private struct TimeBoundaryToken: Equatable, Sendable {
    let generation: UInt64
    let stateRevision: UInt64
    let resetEpoch: UInt64
    let deadline: Date
  }

  private enum ResetCleanupStage: String, CaseIterable, Hashable {
    case notifications
    case shared
    case privateState

    var learnerLabel: String {
      switch self {
      case .notifications:
        "return reminder"
      case .shared:
        "shared return data"
      case .privateState:
        "local course data"
      }
    }
  }

  private enum ResetResult {
    case completed(namespaceSynchronizationUncertain: Bool)
    case failed(
      stages: [ResetCleanupStage],
      protectedDataUnavailable: Bool,
      privateStateWasCleared: Bool,
      namespaceSynchronizationUncertain: Bool
    )
  }

  private struct PrivateResetResult {
    let isComplete: Bool
    let protectedDataUnavailable: Bool
    let namespaceSynchronizationUncertain: Bool
  }

  private enum RecoveryOrigin: Equatable {
    case initialLoad
    case saveFailure(baseline: PrivateStateEnvelope?)
  }

  @ObservationIgnored private let privateStateStore: any PrivateStateStoring
  @ObservationIgnored private let sharedStateService: AppSharedStateService
  @ObservationIgnored private let notificationCoordinator: NotificationCoordinator
  @ObservationIgnored private let timeBoundarySleeper: any TimeBoundarySleeping
  @ObservationIgnored private let now: @MainActor () -> Date
  @ObservationIgnored private let calendar: Calendar
  @ObservationIgnored private let localProfileIDGenerator: @MainActor () -> String
  @ObservationIgnored private let semesterDeskIdentifiers:
    any UniversitySemesterDeskIdentifierFactory
  @ObservationIgnored private let widgetReloader: @MainActor () -> Void
  @ObservationIgnored private let launchPreparation: @MainActor () async throws -> UInt64?
  @ObservationIgnored private var lastPersistedEnvelope: PrivateStateEnvelope?
  @ObservationIgnored private var reminderOperation: Task<Void, Never>?
  @ObservationIgnored private var reminderOperationTail: Task<Void, Never>?
  @ObservationIgnored private var reminderOperationGeneration: UInt64 = 0
  @ObservationIgnored private var stateRevision: UInt64 = 0
  @ObservationIgnored private var stateMutationGeneration: UInt64 = 0
  @ObservationIgnored private var localDataResetOperation: Task<Void, Never>?
  @ObservationIgnored private var recoveryOperation: Task<Void, Never>?
  @ObservationIgnored private var recoveryOrigin: RecoveryOrigin?
  @ObservationIgnored private var localDataResetGeneration: UInt64 = 0
  @ObservationIgnored private var privateStateResetEpoch: UInt64 = 0
  @ObservationIgnored private var privateStateSaveSequence: UInt64 = 0
  @ObservationIgnored private var launchOperationIsRunning = false
  @ObservationIgnored private var launchGeneration: UInt64 = 0
  @ObservationIgnored private var nextLaunchWaiterID: UInt64 = 0
  @ObservationIgnored private var launchCompletionWaiters:
    [UInt64: CheckedContinuation<Void, Never>] = [:]
  #if DEBUG
    @ObservationIgnored private var launchWaiterRegistrationWaiters:
      [CheckedContinuation<Void, Never>] = []
  #endif
  @ObservationIgnored private var backgroundPersistenceOperation: Task<Void, Never>?
  @ObservationIgnored private var sharedProjectionOperation: Task<Void, Never>?
  @ObservationIgnored private var sharedProjectionGeneration: UInt64 = 0
  @ObservationIgnored private var timeBoundaryTask: Task<Void, Never>?
  @ObservationIgnored private var timeBoundaryGeneration: UInt64 = 0
  @ObservationIgnored private var timeBoundaryDeadline: Date?
  @ObservationIgnored private var latestScenePhase: AppLifecyclePolicy.Phase = .unknown
  @ObservationIgnored private var sharedIntegrationIssue: SharedIntegrationIssue?
  @ObservationIgnored private var privateNamespaceSynchronizationPending = false
  @ObservationIgnored private var pendingLaunchDestination: ForgeDestination?
  private var semesterDeskStudyDrafts: [String: SemesterDeskStudyDraft]

  var selectedTab: AppTab
  var todayPath: [AppRoute]
  var semesterPath: [AppRoute]
  var progressPath: [AppRoute]
  var remindersEnabled: Bool
  var isReminderOperationRunning: Bool
  var reminderStatusMessage: String?
  var reminderAuthorizationStatus: LocalNotificationAuthorizationStatus
  var isLocalDataResetRunning: Bool
  var localDataResetStatusMessage: String?
  var recoveryState: AppModelRecoveryState? {
    didSet {
      if recoveryState != nil {
        cancelTimeBoundaryTask()
      }
    }
  }
  var isRecoveryOperationRunning: Bool
  var localIntegrationStatusMessage: String?
  var localPersistenceStatusMessage: String?
  var launchState: AppLaunchState
  var localProfileID: String
  var semesterDesk: UniversitySemesterDeskState?
  var isSemesterDeskOperationRunning: Bool
  var semesterDeskStatusMessage: String?
  var semesterNameDraft: String
  var activeSemesterDeskSheet: SemesterDeskSheet?
  var isProtectedStudyPresented: Bool
  var protectedStudyPlanItemID: String?

  init(
    privateStateStore: any PrivateStateStoring,
    sharedStore: ForgeSharedStateStore?,
    notificationCoordinator: NotificationCoordinator,
    timeBoundarySleeper: any TimeBoundarySleeping,
    now: @escaping @MainActor () -> Date,
    calendar: Calendar,
    localProfileIDGenerator: @escaping @MainActor () -> String = {
      "profile.\(UUID().uuidString.lowercased())"
    },
    semesterDeskIdentifiers:
      any UniversitySemesterDeskIdentifierFactory =
      SystemSemesterDeskIdentifierFactory(),
    widgetReloader: @escaping @MainActor () -> Void,
    launchPreparation: @escaping @MainActor () async throws -> UInt64? = {
      nil
    }
  ) throws {
    let initialNow = now()
    guard initialNow.timeIntervalSinceReferenceDate.isFinite else {
      throw UniversityLearningError.invalidDate(path: "appModel.initialNow")
    }
    let initialLocalProfileID = localProfileIDGenerator()
      .trimmingCharacters(in: .whitespacesAndNewlines)
    guard !initialLocalProfileID.isEmpty else {
      throw UniversitySemesterDeskError(
        code: .invalidInput,
        message: "A local profile identifier is required."
      )
    }

    self.privateStateStore = privateStateStore
    self.sharedStateService = AppSharedStateService(
      handle: AppSharedStateStoreHandle(store: sharedStore)
    )
    self.notificationCoordinator = notificationCoordinator
    self.timeBoundarySleeper = timeBoundarySleeper
    self.now = now
    self.calendar = calendar
    self.localProfileIDGenerator = localProfileIDGenerator
    self.semesterDeskIdentifiers = semesterDeskIdentifiers
    self.widgetReloader = widgetReloader
    self.launchPreparation = launchPreparation
    self.selectedTab = .today
    self.todayPath = []
    self.semesterPath = []
    self.progressPath = []
    self.remindersEnabled = false
    self.isReminderOperationRunning = false
    self.reminderStatusMessage = nil
    self.reminderAuthorizationStatus = .notDetermined
    self.isLocalDataResetRunning = false
    self.localDataResetStatusMessage = nil
    self.recoveryState = nil
    self.isRecoveryOperationRunning = false
    self.localIntegrationStatusMessage = nil
    self.localPersistenceStatusMessage = nil
    self.launchState = .loading
    self.localProfileID = initialLocalProfileID
    self.semesterDesk = nil
    self.isSemesterDeskOperationRunning = false
    self.semesterDeskStatusMessage = nil
    self.semesterNameDraft = ""
    self.activeSemesterDeskSheet = nil
    self.isProtectedStudyPresented = false
    self.protectedStudyPlanItemID = nil
    self.lastPersistedEnvelope = nil
    self.recoveryOrigin = nil
    self.sharedIntegrationIssue = nil
    self.semesterDeskStudyDrafts = [:]
  }

  deinit {
    reminderOperation?.cancel()
    reminderOperationTail?.cancel()
    backgroundPersistenceOperation?.cancel()
    recoveryOperation?.cancel()
    localDataResetOperation?.cancel()
    sharedProjectionOperation?.cancel()
    timeBoundaryTask?.cancel()
  }

  func launch() async {
    guard launchState == .loading else {
      return
    }
    if launchOperationIsRunning {
      guard await waitForRunningLaunch(), !Task.isCancelled else {
        return
      }
      await launch()
      return
    }
    guard launchGeneration < UInt64.max else {
      recoveryState = .loadFailed(
        message: "FORGE could not load local course data."
      )
      launchState = .ready
      return
    }
    launchGeneration += 1
    let generation = launchGeneration
    launchOperationIsRunning = true
    defer {
      if generation == launchGeneration {
        launchOperationIsRunning = false
        let waiters = Array(launchCompletionWaiters.values)
        launchCompletionWaiters.removeAll()
        for waiter in waiters {
          waiter.resume()
        }
      }
    }

    do {
      if let preparedResetEpoch = try await launchPreparation() {
        guard
          !Task.isCancelled,
          generation == launchGeneration
        else {
          return
        }
        privateStateResetEpoch = max(
          privateStateResetEpoch,
          preparedResetEpoch
        )
        privateStateSaveSequence = 0
      }
    } catch {
      guard
        !Task.isCancelled,
        generation == launchGeneration
      else {
        return
      }
      recoveryState = .resetFailed(
        message: "FORGE could not prepare local course data."
      )
      launchState = .ready
      return
    }

    guard !Task.isCancelled, generation == launchGeneration else {
      return
    }
    guard let capturedNow = captureSemesterDeskNow() else {
      recoveryState = .loadFailed(
        message: "FORGE could not load local course data."
      )
      launchState = .ready
      return
    }
    let didLoad = await loadLocalData(at: capturedNow)
    guard
      !Task.isCancelled,
      generation == launchGeneration
    else {
      return
    }
    launchState = .ready
    if didLoad {
      await consumePendingSystemDestinationNow()
      await consumePendingLaunchDestination()
      await replayInitialActiveLifecycle(at: capturedNow)
    }
  }

  private func waitForRunningLaunch() async -> Bool {
    guard !Task.isCancelled, nextLaunchWaiterID < UInt64.max else {
      return false
    }

    nextLaunchWaiterID += 1
    let waiterID = nextLaunchWaiterID
    await withTaskCancellationHandler {
      await withCheckedContinuation { continuation in
        guard !Task.isCancelled else {
          continuation.resume()
          return
        }
        launchCompletionWaiters[waiterID] = continuation
        #if DEBUG
          let registrationWaiters = launchWaiterRegistrationWaiters
          launchWaiterRegistrationWaiters.removeAll()
          for registrationWaiter in registrationWaiters {
            registrationWaiter.resume()
          }
        #endif
      }
    } onCancel: { [weak self] in
      Task { @MainActor [weak self] in
        self?.resumeLaunchWaiter(waiterID)
      }
    }
    return true
  }

  private func resumeLaunchWaiter(_ waiterID: UInt64) {
    launchCompletionWaiters.removeValue(forKey: waiterID)?.resume()
  }

  var canEnableReminders: Bool {
    guard
      semesterDesk != nil,
      launchState == .ready,
      !isLocalDataResetRunning,
      recoveryState == nil,
      let reminderDate = semesterDeskReminderDate
    else {
      return false
    }

    return reminderDate > now()
  }

  var reminderBoundaryText: String {
    guard let reminderDate = semesterDeskReminderDate else {
      return "No delayed return needs a reminder."
    }
    return "Come back on this date: \(reminderDate.formatted(date: .long, time: .shortened))."
  }

  var reminderPermissionLabel: String {
    switch reminderAuthorizationStatus {
    case .notDetermined:
      "Not requested"
    case .denied:
      "Denied in iOS Settings"
    case .authorized, .provisional, .ephemeral:
      "Allowed"
    case .unknown:
      "Unavailable"
    }
  }

  var semesterDeskReminderDate: Date? {
    guard let semesterDesk else {
      return nil
    }
    let currentDate = now()
    return semesterDesk.delayedReturns
      .filter { $0.status == .due }
      .compactMap { delayedReturn in
        Self.semesterDeskDate(from: delayedReturn.dueAt)
      }
      .filter { $0 > currentDate }
      .min()
  }

  var localDataRecoveryMessage: String {
    recoveryState?.message ?? "No local data recovery is active."
  }

  var allowsClearLocalDataDuringRecovery: Bool {
    recoveryState?.allowsClearLocalData ?? true
  }

  var semesterDeskTodayAction: SemesterDeskTodayAction? {
    semesterDeskTodayAction(at: now())
  }

  var protectedStudyPlanItem: UniversitySemesterDeskPlanItem? {
    guard let protectedStudyPlanItemID else {
      return nil
    }
    return semesterDesk?.planItems.first { $0.id == protectedStudyPlanItemID }
  }

  var protectedStudyCourse: UniversitySemesterDeskCourse? {
    guard let courseID = protectedStudyPlanItem?.courseID else {
      return nil
    }
    return semesterDesk?.courses.first { $0.id == courseID }
  }

  var activeProtectedStudySession: UniversitySemesterDeskProtectedStudySession? {
    guard let protectedStudyPlanItemID else {
      return nil
    }
    return semesterDesk?.protectedStudySessions.last {
      $0.planItemID == protectedStudyPlanItemID && $0.status == .active
    }
  }

  var protectedStudyDelayedReturn: UniversitySemesterDeskDelayedReturn? {
    guard let protectedStudyPlanItemID else {
      return nil
    }
    return semesterDesk?.delayedReturns.first {
      $0.planItemID == protectedStudyPlanItemID && $0.status != .completed
    }
  }

  var semesterDeskCurrentDate: Date {
    now()
  }

  var semesterDeskCalendar: Calendar {
    calendar
  }

  func semesterDeskTodayAction(at date: Date) -> SemesterDeskTodayAction? {
    guard let semesterDesk else {
      return nil
    }
    if semesterDesk.recoveryDraft != nil {
      return .finishRecovery
    }

    let currentTimestamp = Self.semesterDeskTimestamp(for: date)
    let incompleteReturns = semesterDesk.delayedReturns
      .filter { $0.status != .completed }
      .sorted { $0.dueAt < $1.dueAt }
    if let delayedReturn = incompleteReturns.first(where: {
      $0.status == .open || $0.dueAt <= currentTimestamp
    }) {
      return .delayedReturn(
        delayedReturnID: delayedReturn.id,
        planItemID: delayedReturn.planItemID,
        dueAt: delayedReturn.dueAt,
        isDue: true
      )
    }

    if let selectedID = semesterDesk.selectedNextActionID,
      let selectedItem = semesterDesk.planItems.first(where: { $0.id == selectedID }),
      selectedItem.status != .deferred,
      selectedItem.status != .returnComplete
    {
      if selectedItem.status == .proofComplete,
        let delayedReturn = incompleteReturns.first(where: {
          $0.planItemID == selectedItem.id
        })
      {
        return .delayedReturn(
          delayedReturnID: delayedReturn.id,
          planItemID: delayedReturn.planItemID,
          dueAt: delayedReturn.dueAt,
          isDue: false
        )
      }
      return .selectedAction(planItemID: selectedID)
    }
    if semesterDesk.planItems.contains(where: { $0.status == .planned }) {
      return .choosePlannedWork
    }
    if let delayedReturn = incompleteReturns.first {
      return .delayedReturn(
        delayedReturnID: delayedReturn.id,
        planItemID: delayedReturn.planItemID,
        dueAt: delayedReturn.dueAt,
        isDue: false
      )
    }
    if semesterDesk.capacity == nil {
      return .confirmCapacity
    }
    if let course = semesterDesk.courses.first {
      return .addPlannedWork(courseID: course.id)
    }
    return .addCourse
  }

  func canChooseAsNextAction(_ item: UniversitySemesterDeskPlanItem) -> Bool {
    guard item.status == .planned,
      let course = semesterDesk?.courses.first(where: { $0.id == item.courseID })
    else {
      return false
    }
    return !course.facts.contains(where: { $0.status != .checked })
      && !course.factConflicts.contains(where: { $0.status == .open })
  }

  func presentSemesterDeskSheet(_ sheet: SemesterDeskSheet) {
    guard
      launchState == .ready,
      semesterDesk != nil,
      recoveryState == nil,
      !isLocalDataResetRunning,
      !isSemesterDeskOperationRunning,
      !isProtectedStudyPresented
    else {
      return
    }
    activeSemesterDeskSheet = sheet
  }

  func dismissSemesterDeskSheet() {
    activeSemesterDeskSheet = nil
  }

  func semesterDeskStudyDraft(for planItemID: String) -> SemesterDeskStudyDraft {
    semesterDeskStudyDrafts[planItemID] ?? .empty
  }

  func updateSemesterDeskStudyDraft(
    for planItemID: String,
    practiceText: String,
    independentCheckText: String,
    delayedReturnText: String
  ) {
    guard
      launchState == .ready,
      recoveryState == nil,
      !isLocalDataResetRunning,
      isProtectedStudyPresented,
      protectedStudyPlanItemID == planItemID,
      semesterDesk?.planItems.contains(where: { $0.id == planItemID }) == true
    else {
      return
    }
    let draft = SemesterDeskStudyDraft(
      practiceText: practiceText,
      independentCheckText: independentCheckText,
      delayedReturnText: delayedReturnText
    )
    if draft.hasContent {
      semesterDeskStudyDrafts[planItemID] = draft
    } else {
      semesterDeskStudyDrafts.removeValue(forKey: planItemID)
    }
  }

  func beginProtectedStudy(planItemID: String) async -> Bool {
    guard
      await applySemesterDeskCommand(
        .startProtectedStudy(
          profileID: localProfileID,
          planItemID: planItemID
        )
      )
    else {
      return false
    }
    protectedStudyPlanItemID = planItemID
    isProtectedStudyPresented = true
    activeSemesterDeskSheet = nil
    return true
  }

  func continueProtectedStudy(planItemID: String) {
    guard
      launchState == .ready,
      recoveryState == nil,
      !isLocalDataResetRunning,
      !isSemesterDeskOperationRunning,
      let item = semesterDesk?.planItems.first(where: { $0.id == planItemID }),
      item.status == .inProgress
        || item.status == .practiceComplete
        || item.status == .proofComplete
    else {
      return
    }
    protectedStudyPlanItemID = planItemID
    isProtectedStudyPresented = true
    activeSemesterDeskSheet = nil
  }

  func openProtectedDelayedReturn(
    delayedReturnID: String,
    planItemID: String
  ) async -> Bool {
    guard
      launchState == .ready,
      recoveryState == nil,
      !isLocalDataResetRunning,
      !isSemesterDeskOperationRunning,
      let delayedReturn = semesterDesk?.delayedReturns.first(where: {
        $0.id == delayedReturnID && $0.planItemID == planItemID
      })
    else {
      return false
    }

    if delayedReturn.status == .due {
      guard let capturedNow = captureSemesterDeskNow() else {
        return false
      }
      let currentTimestamp = Self.semesterDeskTimestamp(for: capturedNow)
      guard delayedReturn.dueAt <= currentTimestamp else {
        semesterDeskStatusMessage = "Come back on this date before you open the return."
        return false
      }
      guard
        await applySemesterDeskCommand(
          .openDelayedReturn(
            profileID: localProfileID,
            delayedReturnID: delayedReturnID
          ),
          capturedNow: capturedNow
        )
      else {
        return false
      }
    } else if delayedReturn.status != .open {
      return false
    }

    protectedStudyPlanItemID = planItemID
    isProtectedStudyPresented = true
    activeSemesterDeskSheet = nil
    return true
  }

  func completeProtectedPractice(
    outcome: UniversitySemesterDeskPracticeOutcome
  ) async -> Bool {
    guard let session = activeProtectedStudySession else {
      return false
    }
    return await applySemesterDeskCommand(
      .completePractice(
        profileID: localProfileID,
        studySessionID: session.id,
        outcome: outcome
      )
    )
  }

  func submitProtectedIndependentCheck(
    outcome: UniversitySemesterDeskProofOutcome
  ) async -> Bool {
    guard let planItemID = protectedStudyPlanItemID else {
      return false
    }
    let didSave = await applySemesterDeskCommand(
      .submitIndependentProof(
        profileID: localProfileID,
        planItemID: planItemID,
        outcome: outcome
      )
    )
    if didSave {
      let draft = semesterDeskStudyDraft(for: planItemID)
      updateSemesterDeskStudyDraft(
        for: planItemID,
        practiceText: draft.practiceText,
        independentCheckText: "",
        delayedReturnText: draft.delayedReturnText
      )
    }
    return didSave
  }

  func scheduleProtectedDelayedReturn(at dueDate: Date) async -> Bool {
    guard let planItemID = protectedStudyPlanItemID else {
      return false
    }
    guard let capturedNow = captureSemesterDeskNow() else {
      return false
    }
    guard dueDate > capturedNow else {
      semesterDeskStatusMessage = "Choose a return date and time in the future."
      return false
    }
    let didSave = await applySemesterDeskCommand(
      .scheduleDelayedReturn(
        profileID: localProfileID,
        planItemID: planItemID,
        dueAt: Self.semesterDeskTimestamp(for: dueDate)
      ),
      capturedNow: capturedNow
    )
    if didSave {
      discardSemesterDeskStudyDraft(for: planItemID)
      dismissProtectedStudy()
    }
    return didSave
  }

  func completeProtectedDelayedReturn(
    outcome: UniversitySemesterDeskRetentionOutcome
  ) async -> Bool {
    guard let delayedReturn = protectedStudyDelayedReturn else {
      return false
    }
    let didSave = await applySemesterDeskCommand(
      .completeDelayedReturn(
        profileID: localProfileID,
        delayedReturnID: delayedReturn.id,
        outcome: outcome
      )
    )
    if didSave {
      discardSemesterDeskStudyDraft(for: delayedReturn.planItemID)
      dismissProtectedStudy()
    }
    return didSave
  }

  func dismissProtectedStudy() {
    isProtectedStudyPresented = false
    protectedStudyPlanItemID = nil
  }

  static func semesterDeskTimestamp(for date: Date) -> String {
    Date.ISO8601FormatStyle(includingFractionalSeconds: true).format(date)
  }

  static func semesterDeskDate(from timestamp: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [
      .withInternetDateTime,
      .withFractionalSeconds,
    ]
    return formatter.date(from: timestamp)
  }

  func makeSemesterDeskLocalExport() throws -> SemesterDeskLocalExport {
    guard let semesterDesk else {
      throw SemesterDeskLocalExportError.invalidState
    }
    return try SemesterDeskLocalExport.make(
      semesterDesk: semesterDesk,
      profileID: localProfileID,
      returnRemindersEnabled: remindersEnabled,
      exportedAt: now()
    )
  }

  @discardableResult
  func createSemesterDesk(title: String) async -> Bool {
    guard
      launchState == .ready,
      semesterDesk == nil,
      !isSemesterDeskOperationRunning,
      !isReminderOperationRunning,
      !isLocalDataResetRunning,
      recoveryState == nil
    else {
      return false
    }

    semesterNameDraft = title
    guard let capturedNow = captureSemesterDeskNow() else {
      return false
    }
    let mutationToken = beginStateMutation()
    isSemesterDeskOperationRunning = true
    semesterDeskStatusMessage = nil
    defer {
      if ownsStateMutation(mutationToken) {
        isSemesterDeskOperationRunning = false
      }
    }

    let result = UniversitySemesterDeskEngine.create(
      input: UniversitySemesterDeskCreateInput(
        profileID: localProfileID,
        title: title
      ),
      runtime: semesterDeskRuntime(capturedNow: capturedNow)
    )
    let createdDesk: UniversitySemesterDeskState
    switch result {
    case .success(let state):
      createdDesk = state
    case .failure(let error):
      semesterDeskStatusMessage = error.message
      return false
    }

    let candidate = envelope(semesterDesk: createdDesk)
    guard await saveCandidate(candidate) else {
      guard ownsStateMutation(mutationToken) else {
        return false
      }
      semesterDeskStatusMessage = "FORGE could not save your Semester Desk."
      return false
    }
    guard ownsStateMutation(mutationToken) else {
      return false
    }

    apply(candidate)
    scheduleNextTimeBoundary(after: capturedNow)
    await syncSharedProjection(at: capturedNow)
    guard ownsStateMutation(mutationToken) else {
      return false
    }
    reconcileReminders(at: capturedNow)
    semesterNameDraft = ""
    localDataResetStatusMessage = nil
    semesterDeskStatusMessage = "Your Semester Desk is ready."
    return true
  }

  @discardableResult
  func applySemesterDeskCommand(
    _ command: UniversitySemesterDeskCommand
  ) async -> Bool {
    await applySemesterDeskCommand(command, capturedNow: nil)
  }

  private func applySemesterDeskCommand(
    _ command: UniversitySemesterDeskCommand,
    capturedNow: Date?
  ) async -> Bool {
    guard command.profileID == localProfileID else {
      semesterDeskStatusMessage = "This action belongs to a different local profile."
      return false
    }
    guard let currentDesk = semesterDesk, currentDesk.profileID == localProfileID else {
      semesterDeskStatusMessage = "Create your Semester Desk before you continue."
      return false
    }
    guard
      launchState == .ready,
      !isSemesterDeskOperationRunning,
      !isReminderOperationRunning,
      !isLocalDataResetRunning,
      recoveryState == nil
    else {
      return false
    }
    guard case .success = UniversitySemesterDeskEngine.validate(state: currentDesk) else {
      semesterDeskStatusMessage = "FORGE could not use this Semester Desk."
      return false
    }
    guard let actionNow = capturedNow ?? captureSemesterDeskNow() else {
      return false
    }

    let mutationToken = beginStateMutation()
    isSemesterDeskOperationRunning = true
    semesterDeskStatusMessage = nil
    defer {
      if ownsStateMutation(mutationToken) {
        isSemesterDeskOperationRunning = false
      }
    }

    let result = UniversitySemesterDeskEngine.transition(
      state: currentDesk,
      command: command,
      runtime: semesterDeskRuntime(capturedNow: actionNow)
    )
    let transitionedDesk: UniversitySemesterDeskState
    switch result {
    case .success(let state):
      transitionedDesk = state
    case .failure(let error):
      semesterDeskStatusMessage = error.message
      return false
    }

    let candidate = envelope(semesterDesk: transitionedDesk)
    guard await saveCandidate(candidate) else {
      guard ownsStateMutation(mutationToken) else {
        return false
      }
      semesterDeskStatusMessage = "FORGE could not save your Semester Desk."
      return false
    }
    guard ownsStateMutation(mutationToken) else {
      return false
    }

    apply(candidate)
    scheduleNextTimeBoundary(after: actionNow)
    await syncSharedProjection(at: actionNow)
    guard ownsStateMutation(mutationToken) else {
      return false
    }
    reconcileReminders(at: actionNow)
    semesterDeskStatusMessage = "Your Semester Desk is updated."
    return true
  }

  func setRemindersEnabled(_ isEnabled: Bool) {
    guard
      launchState == .ready,
      !isLocalDataResetRunning,
      !isSemesterDeskOperationRunning,
      semesterDesk != nil,
      recoveryState == nil
    else {
      return
    }

    guard let capturedNow = captureSemesterDeskNow() else {
      reminderStatusMessage = "FORGE could not update the local reminder."
      return
    }

    if isEnabled {
      guard canEnableReminders else {
        reminderStatusMessage = reminderBoundaryText
        return
      }
      beginExplicitReminderEnable(at: capturedNow)
      return
    }

    beginExplicitReminderDisable(at: capturedNow)
  }

  func clearLocalData() {
    guard
      !isLocalDataResetRunning,
      recoveryState?.allowsClearLocalData != false
    else {
      return
    }

    cancelTimeBoundaryTask()
    localDataResetGeneration += 1
    let generation = localDataResetGeneration
    guard privateStateResetEpoch < UInt64.max else {
      recoveryState = .resetFailed(
        message: "FORGE could not reset local data."
      )
      return
    }
    privateStateResetEpoch += 1
    privateStateSaveSequence = 0
    let resetEpoch = privateStateResetEpoch
    stateMutationGeneration &+= 1
    isSemesterDeskOperationRunning = false
    recoveryOrigin = nil
    isLocalDataResetRunning = true
    isRecoveryOperationRunning = true
    let priorSharedProjectionOperation = cancelSharedProjectionOperation()

    let notificationCoordinator = notificationCoordinator
    let sharedStateService = sharedStateService
    let privateStateStore = privateStateStore
    let widgetReloader = widgetReloader
    localDataResetOperation = Task { @MainActor [weak self] in
      let privateResult = await Self.clearPrivateState(
        privateStateStore: privateStateStore,
        resetEpoch: resetEpoch
      )
      guard
        !Task.isCancelled,
        let self,
        generation == self.localDataResetGeneration,
        resetEpoch == self.privateStateResetEpoch
      else {
        return
      }

      guard privateResult.isComplete else {
        if let priorSharedProjectionOperation {
          await priorSharedProjectionOperation.value
        }
        self.finishLocalDataReset(
          Self.resetResult(
            privateResult: privateResult,
            externalFailures: []
          )
        )
        return
      }

      self.cancelReminderOperationWithoutWaiting()
      if let priorSharedProjectionOperation {
        await priorSharedProjectionOperation.value
      }
      guard
        !Task.isCancelled,
        generation == self.localDataResetGeneration,
        resetEpoch == self.privateStateResetEpoch
      else {
        return
      }
      let result = await Self.clearExternalStateAfterPrivateReset(
        privateResult: privateResult,
        notificationCoordinator: notificationCoordinator,
        sharedStateService: sharedStateService,
        widgetReloader: widgetReloader
      )
      guard
        !Task.isCancelled,
        generation == self.localDataResetGeneration,
        resetEpoch == self.privateStateResetEpoch
      else {
        return
      }
      self.finishLocalDataReset(result)
    }
  }

  func retryLocalDataLoad() {
    guard
      let recoveryState,
      !isLocalDataResetRunning,
      !isRecoveryOperationRunning
    else {
      return
    }

    if case .resetFailed = recoveryState {
      clearLocalData()
      return
    }
    guard let capturedNow = captureSemesterDeskNow() else {
      return
    }
    cancelReminderOperationWithoutWaiting()
    isRecoveryOperationRunning = true
    let resetEpoch = privateStateResetEpoch
    recoveryOperation = Task { @MainActor [weak self] in
      guard let self else {
        return
      }
      defer {
        if resetEpoch == self.privateStateResetEpoch {
          self.isRecoveryOperationRunning = false
          self.recoveryOperation = nil
        }
      }
      guard
        !Task.isCancelled,
        resetEpoch == self.privateStateResetEpoch,
        self.recoveryState != nil
      else {
        return
      }
      let didLoad = await self.loadLocalData(at: capturedNow)
      guard
        !Task.isCancelled,
        resetEpoch == self.privateStateResetEpoch
      else {
        return
      }
      if didLoad {
        await self.consumePendingSystemDestinationNow()
        await self.consumePendingLaunchDestination()
        await self.replayInitialActiveLifecycle(at: capturedNow)
      }
    }
  }

  #if DEBUG
    func waitForLaunchWaiterRegistrationForTesting() async {
      if !launchCompletionWaiters.isEmpty {
        return
      }
      await withCheckedContinuation { continuation in
        launchWaiterRegistrationWaiters.append(continuation)
      }
    }

    func waitForRecoveryOperationForTesting() async {
      await recoveryOperation?.value
    }

    func waitForReminderOperationForTesting() async {
      let operation = reminderOperation ?? reminderOperationTail
      await operation?.value
    }

    func waitForLocalDataResetOperationForTesting() async {
      await localDataResetOperation?.value
    }

    func waitForSharedProjectionOperationForTesting() async {
      await sharedProjectionOperation?.value
    }

    func waitForTimeBoundaryTaskForTesting() async {
      await timeBoundaryTask?.value
    }
  #endif

  func route(_ url: URL) {
    guard let destination = ForgeDeepLink.destination(for: url) else {
      return
    }
    guard launchState == .ready, routesAreEligible else {
      pendingLaunchDestination = destination
      return
    }
    route(to: destination)
  }

  private func route(to destination: ForgeDestination) {
    guard routesAreEligible else {
      return
    }
    switch destination {
    case .today:
      handleRootRoute(tab: .today, route: nil)
    case .semester:
      handleRootRoute(tab: .semester, route: nil)
    case .progress:
      handleRootRoute(tab: .progress, route: nil)
    case .settings:
      handleRootRoute(tab: .today, route: .settings)
    }
  }

  private func consumePendingLaunchDestination() async {
    guard let destination = pendingLaunchDestination else {
      return
    }
    pendingLaunchDestination = nil
    route(to: destination)
  }

  func consumePendingSystemDestination() {
    guard
      launchState == .ready,
      !isLocalDataResetRunning,
      recoveryState == nil
    else {
      return
    }
    Task { @MainActor [weak self] in
      await self?.consumePendingSystemDestinationNow()
    }
  }

  private func consumePendingSystemDestinationNow() async {
    let expectedResetEpoch = privateStateResetEpoch
    let result = await sharedStateService.consumePendingDestination()
    guard
      !Task.isCancelled,
      expectedResetEpoch == privateStateResetEpoch,
      !isLocalDataResetRunning,
      recoveryState == nil
    else {
      return
    }

    switch result {
    case .success(let destination):
      clearSharedIntegrationIssue(.pendingDestinationRead)
      if let destination {
        route(to: destination)
      }
    case .unavailable, .failure:
      setSharedIntegrationIssue(.pendingDestinationRead)
    }
  }

  #if DEBUG
    func consumePendingSystemDestinationForTesting() async {
      await consumePendingSystemDestinationNow()
    }
  #endif

  private func replayInitialActiveLifecycle(at capturedNow: Date) async {
    guard latestScenePhase == .active else {
      cancelTimeBoundaryTask()
      return
    }
    guard routesAreEligible else {
      cancelTimeBoundaryTask()
      return
    }
    await syncSharedProjection(at: capturedNow)
    reconcileReminders(at: capturedNow)
    scheduleNextTimeBoundary(after: capturedNow)
  }

  func handleScenePhaseChange(_ scenePhase: ScenePhase) {
    let phase = AppLifecyclePolicy.phase(for: scenePhase)
    latestScenePhase = phase
    guard launchState == .ready else {
      if phase != .active {
        cancelTimeBoundaryTask()
      }
      return
    }
    switch phase {
    case .active:
      guard routesAreEligible else {
        cancelTimeBoundaryTask()
        return
      }
      guard let capturedNow = captureSemesterDeskNow() else {
        cancelTimeBoundaryTask()
        return
      }

      scheduleSharedProjection(at: capturedNow)
      scheduleNextTimeBoundary(after: capturedNow)
      let actions = AppLifecyclePolicy.actions(for: phase)
      Task { @MainActor [weak self] in
        guard let self else {
          return
        }

        for action in actions {
          guard self.latestScenePhase == .active, self.routesAreEligible else {
            return
          }

          switch action {
          case .consumePendingSystemDestination:
            await self.consumePendingSystemDestinationNow()
          case .reconcileReminders:
            self.reconcileReminders(at: capturedNow)
          case .persistCurrentState:
            break
          }
        }
      }
    case .background:
      cancelTimeBoundaryTask()
      for action in AppLifecyclePolicy.actions(for: phase) {
        if action == .persistCurrentState {
          backgroundPersistenceOperation?.cancel()
          backgroundPersistenceOperation = Task { @MainActor [weak self] in
            await self?.persistCurrentState()
          }
        }
      }
    case .inactive, .unknown:
      cancelTimeBoundaryTask()
    }
  }

  func handleTimeEnvironmentChange() {
    guard
      latestScenePhase == .active,
      routesAreEligible,
      let capturedNow = captureSemesterDeskNow()
    else {
      return
    }

    refreshForActiveTimeChange(at: capturedNow)
  }

  func persistCurrentState() async {
    guard
      !isSemesterDeskOperationRunning,
      !isReminderOperationRunning,
      !isLocalDataResetRunning,
      recoveryState == nil
    else {
      return
    }

    guard let currentEnvelope else {
      return
    }
    _ = await saveCandidate(currentEnvelope)
  }

  func reconcileReminders() {
    guard let capturedNow = captureSemesterDeskNow() else {
      reminderStatusMessage = "FORGE could not update the local reminder."
      return
    }
    reconcileReminders(at: capturedNow)
  }

  private func reconcileReminders(at capturedNow: Date) {
    guard
      launchState == .ready,
      !isLocalDataResetRunning,
      recoveryState == nil
    else {
      return
    }

    beginReminderReconciliation(
      isEnabled: remindersEnabled,
      at: capturedNow
    )
  }

  static func preview() -> AppModel {
    do {
      return try AppModel(
        privateStateStore: InMemoryPrivateStateStore(),
        sharedStore: nil,
        notificationCoordinator: NotificationCoordinator(),
        timeBoundarySleeper: SystemTimeBoundarySleeper(),
        now: Date.init,
        calendar: .autoupdatingCurrent,
        widgetReloader: {}
      )
    } catch {
      fatalError("FORGE could not create the preview model.")
    }
  }

  private var currentEnvelope: PrivateStateEnvelope? {
    guard let semesterDesk else {
      return nil
    }
    return envelope(semesterDesk: semesterDesk)
  }

  private var routesAreEligible: Bool {
    launchState == .ready
      && semesterDesk != nil
      && !isLocalDataResetRunning
      && recoveryState == nil
  }

  private var isProtectedDataRecoveryActive: Bool {
    if case .protectedDataUnavailable = recoveryState {
      return true
    }
    return false
  }

  private func beginStateMutation() -> StateMutationToken {
    stateMutationGeneration &+= 1
    return StateMutationToken(
      generation: stateMutationGeneration,
      resetEpoch: privateStateResetEpoch
    )
  }

  private func ownsStateMutation(_ token: StateMutationToken) -> Bool {
    token.generation == stateMutationGeneration
      && token.resetEpoch == privateStateResetEpoch
  }

  private func envelope(
    semesterDesk: UniversitySemesterDeskState,
    returnRemindersEnabled: Bool? = nil
  ) -> PrivateStateEnvelope {
    PrivateStateEnvelope(
      localProfileID: localProfileID,
      semesterDesk: semesterDesk,
      returnRemindersEnabled: returnRemindersEnabled ?? remindersEnabled
    )
  }

  private func loadLocalData(at capturedNow: Date) async -> Bool {
    let expectedResetEpoch = privateStateResetEpoch
    let expectedRevision = stateRevision
    let expectedRecoveryOrigin = recoveryOrigin
    do {
      let loadedState = try await privateStateStore.load()
      guard
        !Task.isCancelled,
        expectedResetEpoch == privateStateResetEpoch,
        expectedRevision == stateRevision
      else {
        return false
      }
      if case .saveFailure(let baseline) = expectedRecoveryOrigin {
        guard loadedState == baseline else {
          return false
        }
      }
      if let stored = loadedState {
        guard stored.schemaVersion == PrivateStateEnvelope.currentSchemaVersion else {
          throw PrivateStateStoreError.unsupportedSchema(stored.schemaVersion)
        }
        try validateProfileAndSemesterDesk(in: stored)
        apply(stored)
        lastPersistedEnvelope = stored
      } else {
        remindersEnabled = false
        semesterDesk = nil
        stateRevision += 1
        lastPersistedEnvelope = nil
      }

      recoveryState = nil
      recoveryOrigin = nil
      localPersistenceStatusMessage = nil
      privateNamespaceSynchronizationPending = false
      localDataResetStatusMessage = nil
      _ = await purgeLegacySharedState()
      await syncSharedProjection(at: semesterDesk != nil ? capturedNow : nil)
      return true
    } catch {
      guard
        !Task.isCancelled,
        expectedResetEpoch == privateStateResetEpoch,
        expectedRevision == stateRevision
      else {
        return false
      }
      if recoveryOrigin == nil {
        recoveryOrigin = .initialLoad
      }
      if Self.isProtectedDataError(error) {
        recoveryState = .protectedDataUnavailable(
          message: "Local data is unavailable. Unlock the device, then retry."
        )
        return false
      }

      if Self.isStalePrivateStateError(error) {
        recoveryState = .loadFailed(
          message:
            "FORGE found local data from an older version. This version did not open, change, or replace that data. Clear local data to start again."
        )
        return false
      }

      recoveryState = .loadFailed(message: "FORGE could not load local course data.")
      await clearSharedStateAfterPrivateLoadFailure()
      let didRemoveReminders =
        notificationCoordinator.removeKnownReminderImmediately()
      if !didRemoveReminders {
        let cleanupMessage = " FORGE also could not remove the local reminder."
        switch recoveryState {
        case .protectedDataUnavailable(let message):
          recoveryState = .protectedDataUnavailable(
            message: message + cleanupMessage
          )
        case .loadFailed(let message):
          recoveryState = .loadFailed(message: message + cleanupMessage)
        default:
          break
        }
      }
      return false
    }
  }

  private func saveCandidate(
    _ candidate: PrivateStateEnvelope
  ) async -> Bool {
    guard
      candidate != lastPersistedEnvelope
        || privateNamespaceSynchronizationPending
    else {
      return true
    }

    guard privateStateSaveSequence < UInt64.max else {
      recoveryOrigin = .saveFailure(baseline: lastPersistedEnvelope)
      recoveryState = .saveFailed(
        message: "FORGE could not save local course data."
      )
      return false
    }
    privateStateSaveSequence += 1
    let token = PrivateStateSaveToken(
      resetEpoch: privateStateResetEpoch,
      sequence: privateStateSaveSequence
    )
    let expectedRevision = stateRevision
    do {
      let result = try await privateStateStore.save(
        candidate,
        token: token
      )
      guard
        token.resetEpoch == privateStateResetEpoch,
        token.sequence == privateStateSaveSequence,
        expectedRevision == stateRevision
      else {
        return false
      }
      switch result {
      case .installed(let namespace):
        lastPersistedEnvelope = candidate
        if namespace == .synchronizationUncertain {
          privateNamespaceSynchronizationPending = true
          localPersistenceStatusMessage =
            "FORGE saved local course data. The device could not confirm the save."
        } else {
          privateNamespaceSynchronizationPending = false
          localPersistenceStatusMessage = nil
        }
        return true
      case .superseded:
        return false
      }
    } catch is CancellationError {
      guard
        token.resetEpoch == privateStateResetEpoch,
        token.sequence == privateStateSaveSequence,
        expectedRevision == stateRevision
      else {
        return false
      }
      return false
    } catch {
      guard
        token.resetEpoch == privateStateResetEpoch,
        token.sequence == privateStateSaveSequence,
        expectedRevision == stateRevision
      else {
        return false
      }
      recoveryOrigin = .saveFailure(baseline: lastPersistedEnvelope)
      if Self.isProtectedDataError(error) {
        recoveryState = .protectedDataUnavailable(
          message: "Local data is unavailable. Unlock the device, then retry."
        )
      } else {
        recoveryState = .saveFailed(message: "FORGE could not save local course data.")
      }
      cancelReminderOperationWithoutWaiting()
      return false
    }
  }

  private func apply(_ envelope: PrivateStateEnvelope) {
    localProfileID = envelope.localProfileID
    remindersEnabled = envelope.returnRemindersEnabled
    semesterDesk = envelope.semesterDesk
    stateRevision += 1
  }

  private func validateProfileAndSemesterDesk(
    in envelope: PrivateStateEnvelope
  ) throws {
    guard
      !envelope.localProfileID
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .isEmpty
    else {
      throw PrivateStateStoreError.invalidProfile
    }
    guard envelope.semesterDesk.profileID == envelope.localProfileID else {
      throw PrivateStateStoreError.profileMismatch
    }
    if case .failure = UniversitySemesterDeskEngine.validate(
      state: envelope.semesterDesk
    ) {
      throw PrivateStateStoreError.invalidSemesterDesk
    }
  }

  private func discardSemesterDeskStudyDraft(for planItemID: String) {
    semesterDeskStudyDrafts.removeValue(forKey: planItemID)
  }

  private func discardAllSemesterDeskStudyDrafts() {
    semesterDeskStudyDrafts.removeAll()
  }

  private func refreshForActiveTimeChange(at capturedNow: Date) {
    scheduleSharedProjection(at: capturedNow)
    reconcileReminders(at: capturedNow)
    scheduleNextTimeBoundary(after: capturedNow)
  }

  private func nextTimeBoundary(after capturedNow: Date) -> Date? {
    var nextBoundary: Date?

    func include(_ candidate: Date) {
      guard candidate > capturedNow else {
        return
      }
      if let currentBoundary = nextBoundary {
        if candidate < currentBoundary {
          nextBoundary = candidate
        }
      } else {
        nextBoundary = candidate
      }
    }

    for delayedReturn in semesterDesk?.delayedReturns ?? []
    where delayedReturn.status == .due {
      guard let dueAt = Self.semesterDeskDate(from: delayedReturn.dueAt) else {
        continue
      }
      include(dueAt)
      if dueAt == capturedNow {
        include(
          dueAt.addingTimeInterval(
            Self.postDueRefreshEpsilon
          )
        )
      }
    }

    return nextBoundary
  }

  private func scheduleNextTimeBoundary(after capturedNow: Date) {
    cancelTimeBoundaryTask()
    guard
      latestScenePhase == .active,
      routesAreEligible,
      let deadline = nextTimeBoundary(after: capturedNow)
    else {
      return
    }

    let token = TimeBoundaryToken(
      generation: timeBoundaryGeneration,
      stateRevision: stateRevision,
      resetEpoch: privateStateResetEpoch,
      deadline: deadline
    )
    let sleeper = timeBoundarySleeper
    timeBoundaryDeadline = deadline
    timeBoundaryTask = Task { @concurrent [weak self, sleeper] in
      do {
        try await sleeper.sleep(until: deadline, from: capturedNow)
      } catch {
        await self?.finishTimeBoundarySleepFailure(token)
        return
      }
      guard !Task.isCancelled else {
        return
      }
      await self?.handleTimeBoundaryWake(token)
    }
  }

  private func handleTimeBoundaryWake(_ token: TimeBoundaryToken) {
    guard
      token.generation == timeBoundaryGeneration,
      token.stateRevision == stateRevision,
      token.resetEpoch == privateStateResetEpoch,
      token.deadline == timeBoundaryDeadline,
      latestScenePhase == .active,
      routesAreEligible
    else {
      return
    }

    timeBoundaryTask = nil
    timeBoundaryDeadline = nil
    guard let capturedNow = captureSemesterDeskNow() else {
      cancelTimeBoundaryTask()
      return
    }

    refreshForActiveTimeChange(at: capturedNow)
  }

  private func finishTimeBoundarySleepFailure(_ token: TimeBoundaryToken) {
    guard token.generation == timeBoundaryGeneration else {
      return
    }
    timeBoundaryTask = nil
    timeBoundaryDeadline = nil
  }

  private func cancelTimeBoundaryTask() {
    timeBoundaryGeneration &+= 1
    timeBoundaryTask?.cancel()
    timeBoundaryTask = nil
    timeBoundaryDeadline = nil
  }

  private func captureSemesterDeskNow() -> Date? {
    let capturedNow = now()
    guard capturedNow.timeIntervalSinceReferenceDate.isFinite else {
      semesterDeskStatusMessage = "FORGE could not read the current time."
      return nil
    }

    return capturedNow
  }

  private func semesterDeskRuntime(
    capturedNow: Date
  ) -> UniversitySemesterDeskRuntime {
    UniversitySemesterDeskRuntime(
      clock: CapturedSemesterDeskClock(
        timestamp: Self.semesterDeskTimestamp(for: capturedNow)
      ),
      identifiers: semesterDeskIdentifiers
    )
  }

  private func beginExplicitReminderEnable(at capturedNow: Date) {
    let delayedReturns = semesterDesk?.delayedReturns ?? []
    let (token, previousOperation) = beginReminderOperation()
    let coordinator = notificationCoordinator
    reminderOperation = Task { @MainActor [weak self, coordinator] in
      if let previousOperation {
        await previousOperation.value
      }
      guard !Task.isCancelled, self?.ownsReminderOperation(token) == true else {
        return
      }
      guard self?.isReminderStateCurrent(token) == true else {
        self?.finishReminderOperation(token)
        return
      }

      let result = await coordinator.requestAndSchedule(
        delayedReturns: delayedReturns
      )
      let authorizationStatus = await coordinator.authorizationStatus()
      if self?.ownsReminderOperation(token) == true {
        self?.reminderAuthorizationStatus = authorizationStatus
      }
      let requiresCleanup =
        await self?.completeExplicitReminderEnable(
          result,
          token: token,
          now: capturedNow
        ) ?? (result == .scheduled)
      if requiresCleanup {
        let didCleanUp = await coordinator.disableReminders()
        if !didCleanUp, self?.ownsReminderOperation(token) == true {
          self?.reminderStatusMessage = "FORGE could not update the local reminder."
        }
        self?.finishReminderOperation(token)
      }
    }
  }

  private func beginExplicitReminderDisable(at capturedNow: Date) {
    guard
      let semesterDesk
    else {
      reminderStatusMessage = "FORGE could not update the local reminder."
      return
    }

    let priorPreference = remindersEnabled
    let delayedReturns = semesterDesk.delayedReturns
    let candidate = envelope(
      semesterDesk: semesterDesk,
      returnRemindersEnabled: false
    )
    let (token, previousOperation) = beginReminderOperation()
    let coordinator = notificationCoordinator
    reminderOperation = Task { @MainActor [weak self, coordinator] in
      if let previousOperation {
        await previousOperation.value
      }
      guard
        !Task.isCancelled,
        let self,
        self.isReminderStateCurrent(token)
      else {
        return
      }

      if priorPreference {
        let didSave = await self.saveCandidate(candidate)
        guard self.isReminderStateCurrent(token), didSave else {
          self.finishReminderOperation(token)
          return
        }
      }

      let result = await coordinator.reconcile(
        isEnabled: false,
        delayedReturns: delayedReturns
      )
      let authorizationStatus = await coordinator.authorizationStatus()
      if self.isReminderStateCurrent(token) {
        self.reminderAuthorizationStatus = authorizationStatus
      }
      await self.completeExplicitReminderDisable(
        result,
        priorPreference: priorPreference,
        candidate: candidate,
        token: token,
        now: capturedNow
      )
    }
  }

  private func beginReminderReconciliation(
    isEnabled: Bool,
    at capturedNow: Date
  ) {
    let delayedReturns = semesterDesk?.delayedReturns ?? []
    let (token, previousOperation) = beginReminderOperation()
    let coordinator = notificationCoordinator
    reminderOperation = Task { @MainActor [weak self, coordinator] in
      if let previousOperation {
        await previousOperation.value
      }
      guard !Task.isCancelled, self?.ownsReminderOperation(token) == true else {
        return
      }
      guard self?.isReminderStateCurrent(token) == true else {
        self?.finishReminderOperation(token)
        return
      }

      let result = await coordinator.reconcile(
        isEnabled: isEnabled,
        delayedReturns: delayedReturns
      )
      let authorizationStatus = await coordinator.authorizationStatus()
      if self?.ownsReminderOperation(token) == true {
        self?.reminderAuthorizationStatus = authorizationStatus
      }
      let requiresCleanup =
        await self?.completeReminderReconciliation(
          result,
          token: token,
          now: capturedNow
        ) ?? (result == .scheduled)
      if requiresCleanup {
        let didCleanUp = await coordinator.disableReminders()
        if !didCleanUp, self?.ownsReminderOperation(token) == true {
          self?.reminderStatusMessage = "FORGE could not update the local reminder."
        }
        self?.finishReminderOperation(token)
      }
    }
  }

  private func beginReminderOperation() -> (ReminderOperationToken, Task<Void, Never>?) {
    reminderOperationGeneration += 1
    let token = ReminderOperationToken(
      generation: reminderOperationGeneration,
      stateRevision: stateRevision,
      resetEpoch: privateStateResetEpoch
    )
    let previousOperation = reminderOperation ?? reminderOperationTail
    previousOperation?.cancel()
    reminderOperation = nil
    reminderOperationTail = nil
    isReminderOperationRunning = true
    return (token, previousOperation)
  }

  private func completeExplicitReminderEnable(
    _ result: ReminderSchedulingResult,
    token: ReminderOperationToken,
    now capturedNow: Date?
  ) async -> Bool {
    let statusMessage: String
    let didSchedule: Bool
    switch result {
    case .scheduled:
      statusMessage = "A local reminder is enabled for the return date."
      didSchedule = true
    case .notScheduled:
      if semesterDeskReminderDate == nil {
        statusMessage = "No delayed return needs a reminder."
      } else {
        statusMessage = reminderPermissionFailureMessage
      }
      didSchedule = false
    case .cleanupFailed:
      statusMessage = "FORGE could not update the local reminder."
      didSchedule = false
    }

    return await completeReminderOperation(
      preference: result.storedPreferenceValue,
      didSchedule: didSchedule,
      statusMessage: statusMessage,
      token: token,
      now: capturedNow
    )
  }

  private func completeReminderReconciliation(
    _ result: ReminderReconciliationResult,
    token: ReminderOperationToken,
    now capturedNow: Date?
  ) async -> Bool {
    let statusMessage: String
    let didSchedule: Bool
    switch result {
    case .scheduled:
      statusMessage = "A local reminder is enabled for the return date."
      didSchedule = true
    case .removed(let reason):
      switch reason {
      case .authorizationNotPermitted:
        statusMessage = reminderPermissionFailureMessage
      case .noScheduledReturn, .invalidReturnDate:
        statusMessage = "No delayed return needs a reminder."
      case .preferenceDisabled, .cancelled:
        statusMessage = "The local reminder is removed."
      }
      didSchedule = false
    case .cleanupFailed, .schedulingFailed:
      statusMessage = "FORGE could not update the local reminder."
      didSchedule = false
    }

    return await completeReminderOperation(
      preference: result.storedPreferenceValue,
      didSchedule: didSchedule,
      statusMessage: statusMessage,
      token: token,
      now: capturedNow
    )
  }

  private var reminderPermissionFailureMessage: String {
    switch reminderAuthorizationStatus {
    case .denied:
      "Notifications are denied. Change permission in iOS Settings."
    case .notDetermined:
      "FORGE could not request notification permission."
    case .authorized, .provisional, .ephemeral:
      "FORGE could not schedule the local reminder."
    case .unknown:
      "Notification permission is unavailable."
    }
  }

  private func completeExplicitReminderDisable(
    _ result: ReminderReconciliationResult,
    priorPreference: Bool,
    candidate: PrivateStateEnvelope,
    token: ReminderOperationToken,
    now capturedNow: Date?
  ) async {
    guard isReminderStateCurrent(token) else {
      finishReminderOperation(token)
      return
    }

    switch result {
    case .removed:
      apply(candidate)
      reminderStatusMessage = "The local reminder is removed."
      if let capturedNow {
        scheduleNextTimeBoundary(after: capturedNow)
        await syncSharedProjection(at: capturedNow)
      }
    case .scheduled, .cleanupFailed, .schedulingFailed:
      if priorPreference, let semesterDesk {
        let rollback = envelope(
          semesterDesk: semesterDesk,
          returnRemindersEnabled: true
        )
        let didRestore = await saveCandidate(rollback)
        guard isReminderStateCurrent(token), didRestore else {
          finishReminderOperation(token)
          return
        }
      }
      reminderStatusMessage = "FORGE could not update the local reminder."
    }

    finishReminderOperation(token)
  }

  private func completeReminderOperation(
    preference: Bool?,
    didSchedule: Bool,
    statusMessage: String,
    token: ReminderOperationToken,
    now capturedNow: Date?
  ) async -> Bool {
    guard ownsReminderOperation(token) else {
      return didSchedule
    }

    guard token.resetEpoch == privateStateResetEpoch else {
      finishReminderOperation(token)
      return false
    }

    guard isReminderStateCurrent(token) else {
      if !didSchedule {
        finishReminderOperation(token)
      }
      return didSchedule
    }

    guard let capturedNow else {
      reminderStatusMessage = "FORGE could not update the local reminder."
      if !didSchedule {
        finishReminderOperation(token)
      }
      return didSchedule
    }

    guard let preference else {
      reminderStatusMessage = statusMessage
      finishReminderOperation(token)
      return false
    }
    guard preference != remindersEnabled else {
      reminderStatusMessage = statusMessage
      finishReminderOperation(token)
      return false
    }

    guard let semesterDesk else {
      finishReminderOperation(token)
      return didSchedule
    }
    let candidate = envelope(
      semesterDesk: semesterDesk,
      returnRemindersEnabled: preference
    )
    guard await saveCandidate(candidate) else {
      finishReminderOperation(token)
      return didSchedule
    }

    apply(candidate)
    reminderStatusMessage = statusMessage
    scheduleNextTimeBoundary(after: capturedNow)
    await syncSharedProjection(at: capturedNow)
    finishReminderOperation(token)
    return false
  }

  private func ownsReminderOperation(_ token: ReminderOperationToken) -> Bool {
    token.generation == reminderOperationGeneration
  }

  private func isReminderStateCurrent(_ token: ReminderOperationToken) -> Bool {
    ownsReminderOperation(token)
      && token.stateRevision == stateRevision
      && token.resetEpoch == privateStateResetEpoch
  }

  private func finishReminderOperation(_ token: ReminderOperationToken) {
    guard token.generation == reminderOperationGeneration else {
      return
    }

    reminderOperation = nil
    isReminderOperationRunning = false
  }

  private func cancelReminderOperationWithoutWaiting() {
    reminderOperationGeneration += 1
    if let reminderOperation {
      reminderOperation.cancel()
      reminderOperationTail = reminderOperation
    }
    reminderOperation = nil
    isReminderOperationRunning = false
  }

  private func syncSharedProjection(at generatedAt: Date?) async {
    await scheduleSharedProjection(at: generatedAt).value
  }

  @discardableResult
  private func scheduleSharedProjection(
    at generatedAt: Date?
  ) -> Task<Void, Never> {
    let projection: ForgeSemesterDeskProjection?
    do {
      projection = try makeSharedProjection(at: generatedAt)
    } catch {
      setSharedIntegrationIssue(.projectionUpdate)
      return Task {}
    }

    sharedProjectionGeneration &+= 1
    let generation = sharedProjectionGeneration
    let previousOperation = sharedProjectionOperation
    let service = sharedStateService
    let operation = Task { @concurrent [weak self, service] in
      if let previousOperation {
        await previousOperation.value
      }
      guard !Task.isCancelled else {
        return
      }
      let result = await service.updateProjectionIfChanged(projection)
      guard !Task.isCancelled else {
        return
      }
      await self?.finishSharedProjectionUpdate(
        result,
        generation: generation
      )
    }
    sharedProjectionOperation = operation
    return operation
  }

  private func makeSharedProjection(
    at generatedAt: Date?
  ) throws -> ForgeSemesterDeskProjection? {
    guard
      let generatedAt,
      let semesterDesk
    else {
      return nil
    }

    let validUntil = generatedAt.addingTimeInterval(
      WidgetProjectionPolicy.maximumRefreshInterval
    )
    if semesterDesk.courses.contains(where: { course in
      course.facts.contains { $0.status != .checked }
        || course.factConflicts.contains { $0.status == .open }
    }) {
      return try ForgeSemesterDeskProjection(
        status: .needsReview,
        dueAt: nil,
        generatedAt: generatedAt,
        validUntil: validUntil
      )
    }

    let incompleteReturn =
      semesterDesk.delayedReturns
      .filter { $0.status != .completed }
      .compactMap { delayedReturn -> (UniversitySemesterDeskDelayedReturn, Date)? in
        guard let dueAt = Self.semesterDeskDate(from: delayedReturn.dueAt) else {
          return nil
        }
        return (delayedReturn, dueAt)
      }
      .min { left, right in
        if left.1 == right.1 {
          return left.0.id < right.0.id
        }
        return left.1 < right.1
      }
    if let (_, dueAt) = incompleteReturn {
      return try ForgeSemesterDeskProjection(
        status: dueAt > generatedAt ? .comeBack : .readyToWork,
        dueAt: dueAt > generatedAt ? dueAt : nil,
        generatedAt: generatedAt,
        validUntil: validUntil
      )
    }

    let nextPlanItem =
      semesterDesk.selectedNextActionID.flatMap { selectedID in
        semesterDesk.planItems.first {
          $0.id == selectedID
            && $0.status != .deferred
            && $0.status != .returnComplete
        }
      }
      ?? semesterDesk.planItems.first { $0.status == .planned }
    guard nextPlanItem != nil else {
      return nil
    }
    return try ForgeSemesterDeskProjection(
      status: .readyToWork,
      dueAt: nil,
      generatedAt: generatedAt,
      validUntil: validUntil
    )
  }

  private func finishSharedProjectionUpdate(
    _ result: AppSharedStateResult<AppSharedProjectionMutation>,
    generation: UInt64
  ) {
    guard generation == sharedProjectionGeneration else {
      return
    }

    switch result {
    case .success(let mutation):
      if mutation == .changed {
        widgetReloader()
      }
      clearSharedIntegrationIssue(.projectionUpdate)
    case .unavailable, .failure:
      setSharedIntegrationIssue(.projectionUpdate)
    }
  }

  private func cancelSharedProjectionOperation() -> Task<Void, Never>? {
    sharedProjectionGeneration &+= 1
    let operation = sharedProjectionOperation
    operation?.cancel()
    sharedProjectionOperation = nil
    return operation
  }

  private func clearSharedStateAfterPrivateLoadFailure() async {
    let priorProjectionOperation = cancelSharedProjectionOperation()
    if let priorProjectionOperation {
      await priorProjectionOperation.value
    }

    let result = await sharedStateService.clearAll()
    switch result {
    case .success:
      widgetReloader()
      clearSharedIntegrationIssues([
        .sharedClear,
        .sharedClearUnavailable,
      ])
    case .unavailable:
      setSharedIntegrationIssue(.sharedClearUnavailable)
    case .failure:
      widgetReloader()
      setSharedIntegrationIssue(.sharedClear)
    }
  }

  @discardableResult
  private func purgeLegacySharedState() async -> Bool {
    let result = await sharedStateService.purgeLegacyState()
    switch result {
    case .success:
      clearSharedIntegrationIssues([
        .legacyPurge,
        .legacyPurgeUnavailable,
      ])
      return true
    case .unavailable:
      setSharedIntegrationIssue(.legacyPurgeUnavailable)
      return false
    case .failure:
      setSharedIntegrationIssue(.legacyPurge)
      return false
    }
  }

  private func handleRootRoute(tab: AppTab, route: AppRoute?) {
    resetNavigation()
    selectedTab = tab
    if let route {
      todayPath = [route]
    }
  }

  private func setSharedIntegrationIssue(_ issue: SharedIntegrationIssue) {
    sharedIntegrationIssue = issue
    localIntegrationStatusMessage = issue.message
  }

  private func clearSharedIntegrationIssue(_ issue: SharedIntegrationIssue) {
    guard sharedIntegrationIssue == issue else {
      return
    }
    sharedIntegrationIssue = nil
    localIntegrationStatusMessage = nil
  }

  private func clearSharedIntegrationIssues(
    _ issues: Set<SharedIntegrationIssue>
  ) {
    guard let sharedIntegrationIssue, issues.contains(sharedIntegrationIssue) else {
      return
    }
    self.sharedIntegrationIssue = nil
    localIntegrationStatusMessage = nil
  }

  private func resetNavigation() {
    todayPath = []
    semesterPath = []
    progressPath = []
  }

  private static func clearPrivateState(
    privateStateStore: any PrivateStateStoring,
    resetEpoch: UInt64
  ) async -> PrivateResetResult {
    do {
      let result = try await privateStateStore.clear(
        resetEpoch: resetEpoch
      )
      switch result {
      case .completed(let receipt):
        return PrivateResetResult(
          isComplete: receipt.isComplete,
          protectedDataUnavailable: false,
          namespaceSynchronizationUncertain:
            receipt.namespaceSynchronizationUncertain
        )
      case .superseded:
        return PrivateResetResult(
          isComplete: false,
          protectedDataUnavailable: false,
          namespaceSynchronizationUncertain: false
        )
      }
    } catch {
      return PrivateResetResult(
        isComplete: false,
        protectedDataUnavailable: Self.isProtectedDataError(error),
        namespaceSynchronizationUncertain: false
      )
    }
  }

  private static func clearExternalStateAfterPrivateReset(
    privateResult: PrivateResetResult,
    notificationCoordinator: NotificationCoordinator,
    sharedStateService: AppSharedStateService,
    widgetReloader: @MainActor () -> Void
  ) async -> ResetResult {
    var externalFailures: Set<ResetCleanupStage> = []

    if !(await notificationCoordinator.disableReminders()) {
      externalFailures.insert(.notifications)
    }

    switch await sharedStateService.clearAll() {
    case .success:
      widgetReloader()
    case .failure:
      externalFailures.insert(.shared)
      widgetReloader()
    case .unavailable:
      externalFailures.insert(.shared)
    }

    return resetResult(
      privateResult: privateResult,
      externalFailures: externalFailures
    )
  }

  private static func resetResult(
    privateResult: PrivateResetResult,
    externalFailures: Set<ResetCleanupStage>
  ) -> ResetResult {
    var failedStages = externalFailures
    if !privateResult.isComplete {
      failedStages.insert(.privateState)
    }
    let orderedFailures: [ResetCleanupStage] = [
      .notifications,
      .privateState,
      .shared,
    ].filter { failedStages.contains($0) }

    guard orderedFailures.isEmpty else {
      return .failed(
        stages: orderedFailures,
        protectedDataUnavailable:
          privateResult.protectedDataUnavailable,
        privateStateWasCleared: privateResult.isComplete,
        namespaceSynchronizationUncertain:
          privateResult.namespaceSynchronizationUncertain
      )
    }

    return .completed(
      namespaceSynchronizationUncertain:
        privateResult.namespaceSynchronizationUncertain
    )
  }

  private func finishLocalDataReset(_ result: ResetResult) {
    localDataResetOperation = nil
    isLocalDataResetRunning = false
    isRecoveryOperationRunning = false

    switch result {
    case .completed(let namespaceSynchronizationUncertain):
      guard resetCurrentStateAfterPrivateRemoval() else {
        return
      }
      recoveryState = nil
      if namespaceSynchronizationUncertain {
        privateNamespaceSynchronizationPending = true
        localDataResetStatusMessage =
          "FORGE removed local learning data. The device could not confirm the removal."
      } else {
        localDataResetStatusMessage = "Local learning data is cleared."
      }
    case .failed(
      let failedStages,
      let protectedDataUnavailable,
      let privateStateWasCleared,
      let namespaceSynchronizationUncertain
    ):
      if privateStateWasCleared {
        guard resetCurrentStateAfterPrivateRemoval() else {
          return
        }
        if namespaceSynchronizationUncertain {
          privateNamespaceSynchronizationPending = true
          localDataResetStatusMessage =
            "FORGE removed local learning data. The device could not confirm the removal."
        }
      }
      let names = failedStages.map(\.learnerLabel).joined(separator: ", ")
      if protectedDataUnavailable {
        recoveryState = .protectedDataUnavailable(
          message:
            "Local data is unavailable. Unlock the device, then retry. Failed steps: \(names)."
        )
        return
      }

      recoveryState = .resetFailed(
        message: "FORGE could not reset local data. Failed steps: \(names)."
      )
    }
  }

  private func resetCurrentStateAfterPrivateRemoval() -> Bool {
    let replacementProfileID = localProfileIDGenerator()
      .trimmingCharacters(in: .whitespacesAndNewlines)
    guard !replacementProfileID.isEmpty else {
      recoveryState = .resetFailed(
        message: "FORGE could not reset local data. Failed step: new local profile."
      )
      return false
    }

    localProfileID = replacementProfileID
    semesterDesk = nil
    remindersEnabled = false
    semesterNameDraft = ""
    activeSemesterDeskSheet = nil
    dismissProtectedStudy()
    discardAllSemesterDeskStudyDrafts()
    lastPersistedEnvelope = nil
    privateNamespaceSynchronizationPending = false
    stateRevision += 1
    resetNavigation()
    selectedTab = .today
    reminderStatusMessage = nil
    semesterDeskStatusMessage = nil
    return true
  }

  private static func isProtectedDataError(_ error: Error) -> Bool {
    guard let storeError = error as? PrivateStateStoreError else {
      return false
    }

    return storeError == .protectedDataUnavailable
  }

  private static func isStalePrivateStateError(_ error: Error) -> Bool {
    guard let storeError = error as? PrivateStateStoreError else {
      return false
    }
    if case .stalePrivateStatePresent = storeError {
      return true
    }
    return false
  }
}

@MainActor
enum AppComposition {
  static func makeAppModel(
    privateStateStore: any PrivateStateStoring = PrivateStateStore(),
    timeBoundarySleeper: any TimeBoundarySleeping = SystemTimeBoundarySleeper(),
    now: @escaping @MainActor () -> Date = Date.init,
    launchPreparation: @escaping @MainActor () async throws -> UInt64? = {
      nil
    }
  ) -> AppModel {
    do {
      return try AppModel(
        privateStateStore: privateStateStore,
        sharedStore: try? ForgeSharedStateStore(),
        notificationCoordinator: NotificationCoordinator(now: now),
        timeBoundarySleeper: timeBoundarySleeper,
        now: now,
        calendar: .autoupdatingCurrent,
        widgetReloader: { WidgetCenter.shared.reloadAllTimelines() },
        launchPreparation: launchPreparation
      )
    } catch {
      fatalError("FORGE could not create the app model.")
    }
  }
}

private actor InMemoryPrivateStateStore: PrivateStateStoring {
  private var envelope: PrivateStateEnvelope?
  private var latestResetEpoch: UInt64 = 0
  private var latestSequence: UInt64 = 0

  init(envelope: PrivateStateEnvelope? = nil) {
    self.envelope = envelope
  }

  func load() async throws -> PrivateStateEnvelope? {
    envelope
  }

  func save(
    _ state: PrivateStateEnvelope,
    token: PrivateStateSaveToken
  ) async throws -> PrivateStateSaveResult {
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
    envelope = state
    return .installed(namespace: .synchronized)
  }

  func clear(
    resetEpoch: UInt64
  ) async throws -> PrivateStateClearResult {
    guard resetEpoch >= latestResetEpoch else {
      return .superseded
    }
    latestResetEpoch = resetEpoch
    latestSequence = 0
    let disposition: PrivateStateRemovalDisposition =
      envelope == nil ? .alreadyAbsent : .removed
    envelope = nil
    return .completed(
      PrivateStateClearReceipt(
        files: [
          PrivateStateRemovalRecord(
            name: "semester-desk-private-state-v1.json",
            disposition: disposition
          )
        ],
        stages: [],
        namespace:
          disposition == .removed
          ? .changed(.synchronized)
          : .notRequired
      )
    )
  }
}
