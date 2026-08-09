import ForgeCore
import Foundation
import Testing
import UserNotifications

@testable import FORGE

@Suite("Semester Desk reminder coordinator")
@MainActor
struct NotificationCoordinatorTests {
  @Test("Explicit reminder scheduling requests permission and uses the earliest future due return")
  func explicitSchedulingRequestsPermissionAndUsesEarliestFutureDueReturn() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let earliestDueAt = now.addingTimeInterval(3_600)
    let center = FakeLocalNotificationCenter()
    let coordinator = try makeCoordinator(center: center, now: now)
    let earliestReturn = makeDelayedReturn(
      id: "return.earliest",
      planItemID: "private-plan-item-42",
      dueAt: earliestDueAt
    )

    let result = await coordinator.requestAndSchedule(
      delayedReturns: [
        makeDelayedReturn(
          id: "return.later",
          dueAt: now.addingTimeInterval(7_200)
        ),
        makeDelayedReturn(
          id: "return.open",
          dueAt: now.addingTimeInterval(1_800),
          status: .open
        ),
        earliestReturn,
      ]
    )

    #expect(result == .scheduled)
    #expect(center.authorizationRequestCount == 1)
    #expect(center.authorizationStatusReadCount == 0)
    #expect(Set(center.pending.keys) == [managedReminderIdentifier])

    let request = try #require(center.addedRequests.first)
    #expect(request.identifier == managedReminderIdentifier)
    #expect(try triggerDate(from: request) == earliestDueAt)
    #expect(request.content.title == "Come back on this date")
    #expect(request.content.body == "Open FORGE Today to check what you retained.")
    #expect(!request.content.title.contains(earliestReturn.id))
    #expect(!request.content.body.contains(earliestReturn.id))
    #expect(!request.content.title.contains(earliestReturn.planItemID))
    #expect(!request.content.body.contains(earliestReturn.planItemID))
    #expect(!request.content.title.contains(earliestReturn.dueAt))
    #expect(!request.content.body.contains(earliestReturn.dueAt))
    #expect(request.content.userInfo.isEmpty)
    #expect(request.content.interruptionLevel == .passive)
    #expect(request.content.sound == nil)
  }

  @Test("Reconciliation reads existing permission and removes only managed reminders")
  func reconciliationReadsPermissionAndRemovesOnlyManagedReminders() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.seedPending(managedReminderIdentifier)
    center.seedPending(staleOperationReminderIdentifier)
    center.seedPending("unmanaged-notification")
    center.delivered = [
      managedReminderIdentifier,
      staleOperationReminderIdentifier,
      "unmanaged-delivered",
    ]
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.reconcile(
      isEnabled: true,
      delayedReturns: [
        makeDelayedReturn(dueAt: now.addingTimeInterval(3_600))
      ]
    )

    #expect(result == .scheduled)
    #expect(center.authorizationStatusReadCount == 1)
    #expect(center.authorizationRequestCount == 0)
    #expect(
      Set(center.pending.keys) == [
        managedReminderIdentifier,
        "unmanaged-notification",
      ])
    #expect(center.delivered == ["unmanaged-delivered"])

    let addIndex = try #require(center.events.firstIndex(of: "add"))
    let pendingRemovalIndex = try #require(
      center.events.firstIndex(of: "removePending")
    )
    let deliveredRemovalIndex = try #require(
      center.events.firstIndex(of: "removeDelivered")
    )
    #expect(pendingRemovalIndex < addIndex)
    #expect(deliveredRemovalIndex < addIndex)
  }

  @Test("Only a future due return can schedule a reminder")
  func onlyFutureDueReturnCanScheduleReminder() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.seedPending(managedReminderIdentifier)
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.reconcile(
      isEnabled: true,
      delayedReturns: [
        makeDelayedReturn(
          id: "return.past",
          dueAt: now.addingTimeInterval(-1)
        ),
        makeDelayedReturn(
          id: "return.open",
          dueAt: now.addingTimeInterval(3_600),
          status: .open
        ),
        makeDelayedReturn(
          id: "return.completed",
          dueAt: now.addingTimeInterval(7_200),
          status: .completed,
          completedAt: now
        ),
        makeDelayedReturn(
          id: "return.invalid",
          dueAt: "not-a-date"
        ),
      ]
    )

    #expect(result == .removed(reason: .noScheduledReturn))
    #expect(center.authorizationStatusReadCount == 0)
    #expect(center.authorizationRequestCount == 0)
    #expect(center.pending[managedReminderIdentifier] == nil)
  }

  @Test("Disabled reminders remove the managed request without reading permission")
  func disabledRemindersRemoveManagedRequestWithoutReadingPermission() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.seedPending(managedReminderIdentifier)
    center.delivered = [managedReminderIdentifier, "unmanaged-delivered"]
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.reconcile(
      isEnabled: false,
      delayedReturns: []
    )

    #expect(result == .removed(reason: .preferenceDisabled))
    #expect(center.authorizationStatusReadCount == 0)
    #expect(center.authorizationRequestCount == 0)
    #expect(center.pending[managedReminderIdentifier] == nil)
    #expect(center.delivered == ["unmanaged-delivered"])
  }

  @Test("Denied reconciliation permission removes the managed request without a prompt")
  func deniedReconciliationPermissionRemovesManagedRequestWithoutPrompt() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.authorizationStatusValue = .denied
    center.seedPending(managedReminderIdentifier)
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.reconcile(
      isEnabled: true,
      delayedReturns: [
        makeDelayedReturn(dueAt: now.addingTimeInterval(3_600))
      ]
    )

    #expect(result == .removed(reason: .authorizationNotPermitted))
    #expect(center.authorizationStatusReadCount == 1)
    #expect(center.authorizationRequestCount == 0)
    #expect(center.pending[managedReminderIdentifier] == nil)
  }

  @Test("Explicit permission denial or error removes managed reminders")
  func explicitPermissionFailureRemovesManagedReminders() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)

    for shouldThrow in [false, true] {
      let center = FakeLocalNotificationCenter()
      center.requestAuthorizationResult = false
      center.authorizationRequestThrows = shouldThrow
      center.seedPending(managedReminderIdentifier)
      center.seedPending(staleOperationReminderIdentifier)
      center.delivered = [managedReminderIdentifier]
      let coordinator = try makeCoordinator(center: center, now: now)

      let result = await coordinator.requestAndSchedule(
        delayedReturns: [
          makeDelayedReturn(dueAt: now.addingTimeInterval(3_600))
        ]
      )

      #expect(result == .notScheduled)
      #expect(center.authorizationRequestCount == 1)
      #expect(center.authorizationStatusReadCount == 0)
      #expect(center.pending[managedReminderIdentifier] == nil)
      #expect(center.pending[staleOperationReminderIdentifier] == nil)
      #expect(center.delivered.isEmpty)
    }
  }

  @Test("Scheduling failure removes the request and reports the failure mode")
  func schedulingFailureRemovesRequestAndReportsFailureMode() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let delayedReturn = makeDelayedReturn(dueAt: now.addingTimeInterval(3_600))

    let explicitCenter = FakeLocalNotificationCenter()
    explicitCenter.addThrowsAfterRecording = true
    let explicitCoordinator = try makeCoordinator(
      center: explicitCenter,
      now: now
    )
    let explicitResult = await explicitCoordinator.requestAndSchedule(
      delayedReturns: [delayedReturn]
    )
    #expect(explicitResult == .notScheduled)
    #expect(explicitCenter.pending[managedReminderIdentifier] == nil)

    let reconciliationCenter = FakeLocalNotificationCenter()
    reconciliationCenter.addThrowsAfterRecording = true
    let reconciliationCoordinator = try makeCoordinator(
      center: reconciliationCenter,
      now: now
    )
    let reconciliationResult = await reconciliationCoordinator.reconcile(
      isEnabled: true,
      delayedReturns: [delayedReturn]
    )
    #expect(reconciliationResult == .schedulingFailed)
    #expect(reconciliationCenter.pending[managedReminderIdentifier] == nil)
  }

  @Test("Cleanup failures are reported and leave the managed request visible")
  func cleanupFailuresAreReportedAndLeaveManagedRequestVisible() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)

    let pendingCenter = FakeLocalNotificationCenter()
    pendingCenter.seedPending(managedReminderIdentifier)
    pendingCenter.failPendingRemoval = true
    let pendingCoordinator = try makeCoordinator(center: pendingCenter, now: now)
    let pendingResult = await pendingCoordinator.requestAndSchedule(
      delayedReturns: [
        makeDelayedReturn(dueAt: now.addingTimeInterval(3_600))
      ]
    )
    #expect(pendingResult == .cleanupFailed)
    #expect(pendingCenter.pending[managedReminderIdentifier] != nil)

    let deliveredCenter = FakeLocalNotificationCenter()
    deliveredCenter.delivered = [managedReminderIdentifier]
    deliveredCenter.failDeliveredRemoval = true
    let deliveredCoordinator = try makeCoordinator(
      center: deliveredCenter,
      now: now
    )
    let deliveredResult = await deliveredCoordinator.reconcile(
      isEnabled: false,
      delayedReturns: []
    )
    #expect(deliveredResult == .cleanupFailed)
    #expect(deliveredCenter.delivered == [managedReminderIdentifier])
  }

  @Test("Cancellation after add removes the managed reminder")
  func cancellationAfterAddRemovesManagedReminder() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.suspendNextAdd = true
    let coordinator = try makeCoordinator(center: center, now: now)

    let task = Task { @MainActor in
      await coordinator.requestAndSchedule(
        delayedReturns: [
          makeDelayedReturn(dueAt: now.addingTimeInterval(3_600))
        ]
      )
    }

    try await center.waitForSuspendedAdd()
    task.cancel()
    center.resumeSuspendedAdd()

    #expect(await task.value == .notScheduled)
    #expect(center.pending[managedReminderIdentifier] == nil)
  }

  @Test("A later disable waits for the current scheduling operation")
  func laterDisableWaitsForCurrentSchedulingOperation() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.suspendNextAdd = true
    let coordinator = try makeCoordinator(center: center, now: now)

    let schedulingTask = Task { @MainActor in
      await coordinator.requestAndSchedule(
        delayedReturns: [
          makeDelayedReturn(dueAt: now.addingTimeInterval(3_600))
        ]
      )
    }
    try await center.waitForSuspendedAdd()

    let disableTask = Task { @MainActor in
      await coordinator.disableReminders()
    }
    await Task.yield()
    #expect(center.pending[managedReminderIdentifier] != nil)

    center.resumeSuspendedAdd()

    #expect(await schedulingTask.value == .scheduled)
    #expect(await disableTask.value)
    #expect(center.pending[managedReminderIdentifier] == nil)
  }

  @Test("Each coordinator operation reads the injected time once")
  func eachCoordinatorOperationReadsInjectedTimeOnce() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let recorder = NowReadRecorder(date: now)
    let center = FakeLocalNotificationCenter()
    let coordinator = try makeCoordinator(
      center: center,
      nowProvider: recorder.read
    )
    let delayedReturn = makeDelayedReturn(dueAt: now.addingTimeInterval(3_600))

    _ = await coordinator.requestAndSchedule(delayedReturns: [delayedReturn])
    #expect(recorder.readCount == 1)

    _ = await coordinator.reconcile(
      isEnabled: true,
      delayedReturns: [delayedReturn]
    )
    #expect(recorder.readCount == 2)

    _ = await coordinator.disableReminders()
    #expect(recorder.readCount == 3)
  }

  @Test("A daylight-saving return keeps its exact local reminder components")
  func daylightSavingReturnKeepsExactLocalReminderComponents() async throws {
    let timeZone = try #require(TimeZone(identifier: "America/New_York"))
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    let now = try #require(
      calendar.date(
        from: DateComponents(
          year: 2027,
          month: 3,
          day: 13,
          hour: 20,
          minute: 0,
          second: 0
        )
      )
    )
    let dueAt = try #require(
      calendar.date(
        from: DateComponents(
          year: 2027,
          month: 3,
          day: 14,
          hour: 9,
          minute: 0,
          second: 0
        )
      )
    )
    let center = FakeLocalNotificationCenter()
    let coordinator = makeCoordinator(
      center: center,
      now: now,
      calendar: calendar,
      timeZone: timeZone
    )

    #expect(
      await coordinator.requestAndSchedule(
        delayedReturns: [makeDelayedReturn(dueAt: dueAt)]
      ) == .scheduled
    )

    let request = try #require(center.addedRequests.first)
    let trigger = try #require(
      request.trigger as? UNCalendarNotificationTrigger
    )
    #expect(try triggerDate(from: request) == dueAt)
    #expect(trigger.dateComponents.year == 2027)
    #expect(trigger.dateComponents.month == 3)
    #expect(trigger.dateComponents.day == 14)
    #expect(trigger.dateComponents.hour == 9)
    #expect(trigger.dateComponents.minute == 0)
    #expect(trigger.dateComponents.second == 0)
    #expect(trigger.dateComponents.timeZone?.identifier == timeZone.identifier)
  }

  @Test("A fractional return time rounds forward without scheduling early")
  func fractionalReturnTimeRoundsForwardWithoutSchedulingEarly() async throws {
    let timeZone = try #require(TimeZone(secondsFromGMT: 0))
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let dueAt = now.addingTimeInterval(3_600.125)
    let center = FakeLocalNotificationCenter()
    let coordinator = makeCoordinator(
      center: center,
      now: now,
      calendar: calendar,
      timeZone: timeZone
    )

    #expect(
      await coordinator.requestAndSchedule(
        delayedReturns: [makeDelayedReturn(dueAt: dueAt)]
      ) == .scheduled
    )

    let request = try #require(center.addedRequests.first)
    let triggerAt = try triggerDate(from: request)
    #expect(triggerAt >= dueAt)
    #expect(triggerAt > now)
    #expect(triggerAt < dueAt.addingTimeInterval(2))
  }

  private func makeCoordinator(
    center: FakeLocalNotificationCenter,
    now: Date
  ) throws -> NotificationCoordinator {
    try makeCoordinator(center: center, nowProvider: { now })
  }

  private func makeCoordinator(
    center: FakeLocalNotificationCenter,
    nowProvider: @escaping @MainActor () -> Date
  ) throws -> NotificationCoordinator {
    let timeZone = try #require(TimeZone(secondsFromGMT: 0))
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    return makeCoordinator(
      center: center,
      nowProvider: nowProvider,
      calendar: calendar,
      timeZone: timeZone
    )
  }

  private func makeCoordinator(
    center: FakeLocalNotificationCenter,
    now: Date,
    calendar: Calendar,
    timeZone: TimeZone
  ) -> NotificationCoordinator {
    makeCoordinator(
      center: center,
      nowProvider: { now },
      calendar: calendar,
      timeZone: timeZone
    )
  }

  private func makeCoordinator(
    center: FakeLocalNotificationCenter,
    nowProvider: @escaping @MainActor () -> Date,
    calendar: Calendar,
    timeZone: TimeZone
  ) -> NotificationCoordinator {
    return NotificationCoordinator(
      center: center,
      calendar: calendar,
      timeZone: timeZone,
      now: nowProvider
    )
  }

  private func makeDelayedReturn(
    id: String = "return.default",
    planItemID: String = "plan-item.default",
    dueAt: Date,
    status: UniversitySemesterDeskDelayedReturnStatus = .due,
    completedAt: Date? = nil
  ) -> UniversitySemesterDeskDelayedReturn {
    makeDelayedReturn(
      id: id,
      planItemID: planItemID,
      dueAt: AppModel.semesterDeskTimestamp(for: dueAt),
      status: status,
      completedAt: completedAt.map(AppModel.semesterDeskTimestamp(for:))
    )
  }

  private func makeDelayedReturn(
    id: String,
    planItemID: String = "plan-item.default",
    dueAt: String,
    status: UniversitySemesterDeskDelayedReturnStatus = .due,
    completedAt: String? = nil
  ) -> UniversitySemesterDeskDelayedReturn {
    let object: [String: Any] = [
      "id": id,
      "planItemID": planItemID,
      "dueAt": dueAt,
      "status": status.rawValue,
      "openedAt": status == .open ? dueAt : NSNull(),
      "completedAt": completedAt ?? NSNull(),
      "retentionOutcome": status == .completed
        ? UniversitySemesterDeskRetentionOutcome.retained.rawValue : NSNull(),
    ]
    do {
      let data = try JSONSerialization.data(
        withJSONObject: object,
        options: [.sortedKeys]
      )
      return try JSONDecoder().decode(
        UniversitySemesterDeskDelayedReturn.self,
        from: data
      )
    } catch {
      preconditionFailure("The test delayed return must decode: \(error)")
    }
  }

  private func triggerDate(from request: UNNotificationRequest) throws -> Date {
    let trigger = try #require(
      request.trigger as? UNCalendarNotificationTrigger
    )
    let calendar = try #require(trigger.dateComponents.calendar)
    guard let date = calendar.date(from: trigger.dateComponents) else {
      throw NotificationCoordinatorTestError.invalidDate
    }
    return date
  }
}

private let managedReminderIdentifier = "forge.return-reminder"
private let staleOperationReminderIdentifier = "forge.return-reminder.42"

private enum NotificationCoordinatorTestError: Error {
  case invalidDate
  case timedOut(String)
}

@MainActor
private func waitUntil(
  _ description: String,
  condition: () -> Bool
) async throws {
  for _ in 0..<10_000 {
    if condition() {
      return
    }
    await Task.yield()
  }
  throw NotificationCoordinatorTestError.timedOut(description)
}

@MainActor
private final class NowReadRecorder {
  let date: Date
  private(set) var readCount = 0

  init(date: Date) {
    self.date = date
  }

  func read() -> Date {
    readCount += 1
    return date
  }
}

private enum FakeLocalNotificationCenterError: Error {
  case authorizationRequest
  case add
}

@MainActor
private final class FakeLocalNotificationCenter: LocalNotificationCenter {
  var authorizationStatusValue: LocalNotificationAuthorizationStatus = .authorized
  var requestAuthorizationResult = true
  var pending: [String: UNNotificationRequest] = [:]
  var delivered: Set<String> = []
  var authorizationRequestCount = 0
  var authorizationStatusReadCount = 0
  var addedRequests: [UNNotificationRequest] = []
  var events: [String] = []
  var suspendNextAdd = false
  var failPendingRemoval = false
  var failDeliveredRemoval = false
  var authorizationRequestThrows = false
  var addThrowsAfterRecording = false

  private var suspendedAddContinuation: CheckedContinuation<Void, Never>?

  func authorizationStatus() async -> LocalNotificationAuthorizationStatus {
    events.append("authorizationStatus")
    authorizationStatusReadCount += 1
    return authorizationStatusValue
  }

  func requestAuthorization(options: UNAuthorizationOptions) async throws -> Bool {
    events.append("requestAuthorization")
    authorizationRequestCount += 1
    if authorizationRequestThrows {
      throw FakeLocalNotificationCenterError.authorizationRequest
    }
    return requestAuthorizationResult
  }

  func add(_ request: UNNotificationRequest) async throws {
    events.append("add")
    addedRequests.append(request)
    pending[request.identifier] = request
    if suspendNextAdd {
      suspendNextAdd = false
      await withCheckedContinuation { continuation in
        suspendedAddContinuation = continuation
      }
    }
    if addThrowsAfterRecording {
      throw FakeLocalNotificationCenterError.add
    }
  }

  func pendingNotificationIdentifiers() async -> [String] {
    events.append("pendingRead")
    return pending.keys.sorted()
  }

  func deliveredNotificationIdentifiers() async -> [String] {
    events.append("deliveredRead")
    return delivered.sorted()
  }

  func removePendingNotificationRequests(withIdentifiers identifiers: [String]) {
    events.append("removePending")
    guard !failPendingRemoval else {
      return
    }
    for identifier in identifiers {
      pending.removeValue(forKey: identifier)
    }
  }

  func removeDeliveredNotifications(withIdentifiers identifiers: [String]) {
    events.append("removeDelivered")
    guard !failDeliveredRemoval else {
      return
    }
    delivered.subtract(identifiers)
  }

  func seedPending(_ identifier: String) {
    pending[identifier] = UNNotificationRequest(
      identifier: identifier,
      content: UNMutableNotificationContent(),
      trigger: nil
    )
  }

  func waitForSuspendedAdd() async throws {
    try await waitUntil("suspended add") {
      suspendedAddContinuation != nil
    }
  }

  func resumeSuspendedAdd() {
    suspendedAddContinuation?.resume()
    suspendedAddContinuation = nil
  }
}
