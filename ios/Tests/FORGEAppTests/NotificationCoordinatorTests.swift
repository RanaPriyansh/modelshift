import ForgeCore
import Foundation
import Testing
import UserNotifications

@testable import FORGE

@Suite("Notification coordinator")
@MainActor
struct NotificationCoordinatorTests {
  @Test("Explicit scheduling requests authorization without reading its status")
  func explicitSchedulingRequestsAuthorization() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let delayedReturn = try makeDelayedReturn(
      opensAt: now.addingTimeInterval(3_600),
      dueAt: now.addingTimeInterval(7_200)
    )
    let center = FakeLocalNotificationCenter()
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.requestAndSchedule(
      delayedReturns: [delayedReturn]
    )

    #expect(result == .scheduled)
    #expect(center.authorizationRequestCount == 1)
    #expect(center.authorizationStatusReadCount == 0)
    #expect(Set(center.pending.keys) == [managedReminderIdentifier])

    let request = try #require(center.addedRequests.first)
    #expect(request.identifier == managedReminderIdentifier)
    #expect(request.content.title == ReturnReminderPolicy.title)
    #expect(request.content.body == ReturnReminderPolicy.body)
    #expect(!request.content.title.contains(delayedReturn.id.rawValue))
    #expect(!request.content.body.contains(delayedReturn.id.rawValue))
    #expect(!request.content.title.contains(delayedReturn.courseID.rawValue))
    #expect(!request.content.body.contains(delayedReturn.courseID.rawValue))
    #expect(!request.content.title.contains(delayedReturn.activityID.rawValue))
    #expect(!request.content.body.contains(delayedReturn.activityID.rawValue))
    #expect(!request.content.title.contains(delayedReturn.originEvidenceID.rawValue))
    #expect(!request.content.body.contains(delayedReturn.originEvidenceID.rawValue))
    #expect(request.content.userInfo.isEmpty)
    #expect(request.content.interruptionLevel == .passive)
    #expect(request.content.sound == nil)
  }

  @Test("Reconciliation reads authorization without requesting it")
  func reconciliationReadsAuthorizationWithoutRequest() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.seedPending(managedReminderIdentifier)
    center.seedPending("unmanaged-notification")
    center.delivered = [managedReminderIdentifier, "unmanaged-delivered"]
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.reconcile(
      isEnabled: true,
      delayedReturns: [
        try makeDelayedReturn(
          opensAt: now.addingTimeInterval(3_600),
          dueAt: now.addingTimeInterval(7_200)
        )
      ]
    )

    #expect(result == .scheduled)
    #expect(center.authorizationStatusReadCount == 1)
    #expect(center.authorizationRequestCount == 0)
    #expect(center.pending["unmanaged-notification"] != nil)
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

  @Test("Removes stale operation-specific reminders before scheduling")
  func removesStaleOperationSpecificReminders() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.seedPending(staleOperationReminderIdentifier)
    center.seedPending("unmanaged-notification")
    center.delivered = [
      staleOperationReminderIdentifier,
      "unmanaged-delivered",
    ]
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.reconcile(
      isEnabled: true,
      delayedReturns: [
        try makeDelayedReturn(
          opensAt: now.addingTimeInterval(3_600),
          dueAt: now.addingTimeInterval(7_200)
        )
      ]
    )

    #expect(result == .scheduled)
    #expect(center.pending[staleOperationReminderIdentifier] == nil)
    #expect(center.pending["unmanaged-notification"] != nil)
    #expect(Set(center.pending.keys) == [managedReminderIdentifier, "unmanaged-notification"])
    #expect(center.delivered == ["unmanaged-delivered"])
  }

  @Test("Schedules from opensAt instead of dueAt")
  func schedulesFromReturnOpenDate() async throws {
    let timeZone = try #require(TimeZone(secondsFromGMT: 0))
    let calendar = makeCalendar(timeZone: timeZone)
    let now = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 1,
      day: 2,
      hour: 10
    )
    let opensAt = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 1,
      day: 2,
      hour: 10,
      minute: 30,
      second: 47
    )
    let dueAt = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 1,
      day: 2,
      hour: 12
    )
    let center = FakeLocalNotificationCenter()
    let coordinator = try makeCoordinator(
      center: center,
      now: now,
      timeZone: timeZone
    )

    let result = await coordinator.reconcile(
      isEnabled: true,
      delayedReturns: [try makeDelayedReturn(opensAt: opensAt, dueAt: dueAt)]
    )

    #expect(result == .scheduled)
    let request = try #require(center.addedRequests.first)
    #expect(try triggerDate(from: request) == opensAt)
  }

  @Test("Uses 9 AM local time after quiet hours")
  func movesLateReturnToNextMorning() async throws {
    let timeZone = try #require(TimeZone(secondsFromGMT: 0))
    let calendar = makeCalendar(timeZone: timeZone)
    let now = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 1,
      day: 2,
      hour: 20
    )
    let opensAt = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 1,
      day: 2,
      hour: 21,
      minute: 30
    )
    let dueAt = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 1,
      day: 3,
      hour: 10
    )
    let expectedDate = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 1,
      day: 3,
      hour: 9
    )
    let center = FakeLocalNotificationCenter()
    let coordinator = try makeCoordinator(
      center: center,
      now: now,
      timeZone: timeZone
    )

    let result = await coordinator.requestAndSchedule(
      delayedReturns: [try makeDelayedReturn(opensAt: opensAt, dueAt: dueAt)]
    )

    #expect(result == .scheduled)
    let request = try #require(center.addedRequests.first)
    #expect(try triggerDate(from: request) == expectedDate)
  }

  @Test("Preserves local time through daylight-saving change")
  func preservesLocalTimeThroughDaylightSavingChange() async throws {
    let timeZone = try #require(TimeZone(identifier: "America/New_York"))
    let calendar = makeCalendar(timeZone: timeZone)
    let now = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 3,
      day: 13,
      hour: 20
    )
    let opensAt = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 3,
      day: 13,
      hour: 21,
      minute: 30
    )
    let dueAt = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 3,
      day: 14,
      hour: 10
    )
    let expectedDate = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 3,
      day: 14,
      hour: 9
    )
    let center = FakeLocalNotificationCenter()
    let coordinator = try makeCoordinator(
      center: center,
      now: now,
      timeZone: timeZone
    )

    let result = await coordinator.reconcile(
      isEnabled: true,
      delayedReturns: [try makeDelayedReturn(opensAt: opensAt, dueAt: dueAt)]
    )

    #expect(result == .scheduled)
    let request = try #require(center.addedRequests.first)
    let trigger = try #require(
      request.trigger as? UNCalendarNotificationTrigger
    )
    #expect(try triggerDate(from: request) == expectedDate)
    #expect(trigger.dateComponents.timeZone?.identifier == timeZone.identifier)
  }

  @Test("Selects the earliest scheduled return")
  func selectsEarliestScheduledReturn() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let earlierOpen = now.addingTimeInterval(3_600)
    let laterOpen = now.addingTimeInterval(7_200)
    let center = FakeLocalNotificationCenter()
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.reconcile(
      isEnabled: true,
      delayedReturns: [
        try makeDelayedReturn(
          id: "return2",
          opensAt: laterOpen,
          dueAt: laterOpen.addingTimeInterval(3_600)
        ),
        try makeDelayedReturn(
          id: "return1",
          opensAt: earlierOpen,
          dueAt: earlierOpen.addingTimeInterval(3_600)
        ),
      ]
    )

    #expect(result == .scheduled)
    let request = try #require(center.addedRequests.first)
    #expect(try triggerDate(from: request) == earlierOpen)
  }

  @Test("Removes a reminder when preference is disabled")
  func removesReminderWhenPreferenceDisabled() async throws {
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

  @Test("Removes a reminder when no scheduled return exists")
  func removesReminderWhenNoScheduledReturnExists() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.seedPending(managedReminderIdentifier)
    center.delivered = [managedReminderIdentifier]
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.reconcile(
      isEnabled: true,
      delayedReturns: []
    )

    #expect(result == .removed(reason: .noScheduledReturn))
    #expect(center.authorizationStatusReadCount == 0)
    #expect(center.pending[managedReminderIdentifier] == nil)
    #expect(center.delivered.isEmpty)
  }

  @Test("Removes a reminder for non-scheduled return states")
  func removesReminderForNonScheduledReturns() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let delayedReturns = [
      try makeDelayedReturn(
        id: "open1",
        opensAt: now.addingTimeInterval(-3_600),
        dueAt: now.addingTimeInterval(3_600)
      ),
      try makeDelayedReturn(
        id: "due1",
        opensAt: now.addingTimeInterval(-7_200),
        dueAt: now
      ),
      try makeDelayedReturn(
        id: "expired1",
        opensAt: now.addingTimeInterval(-7_200),
        dueAt: now.addingTimeInterval(-1)
      ),
      try makeDelayedReturn(
        id: "completed1",
        opensAt: now.addingTimeInterval(3_600),
        dueAt: now.addingTimeInterval(7_200),
        completedAt: now
      ),
    ]

    for delayedReturn in delayedReturns {
      let center = FakeLocalNotificationCenter()
      center.seedPending(managedReminderIdentifier)
      let coordinator = try makeCoordinator(center: center, now: now)

      let result = await coordinator.reconcile(
        isEnabled: true,
        delayedReturns: [delayedReturn]
      )

      #expect(result == .removed(reason: .noScheduledReturn))
      #expect(center.pending[managedReminderIdentifier] == nil)
      #expect(center.authorizationStatusReadCount == 0)
    }
  }

  @Test("Reports an invalid return date and removes the reminder")
  func reportsInvalidReturnDate() async throws {
    let timeZone = try #require(TimeZone(secondsFromGMT: 0))
    let calendar = makeCalendar(timeZone: timeZone)
    let now = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 1,
      day: 2,
      hour: 20
    )
    let opensAt = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 1,
      day: 2,
      hour: 21,
      minute: 30
    )
    let dueAt = try makeDate(
      calendar: calendar,
      year: 2027,
      month: 1,
      day: 3,
      hour: 8
    )
    let center = FakeLocalNotificationCenter()
    center.seedPending(managedReminderIdentifier)
    let coordinator = try makeCoordinator(
      center: center,
      now: now,
      timeZone: timeZone
    )

    let result = await coordinator.reconcile(
      isEnabled: true,
      delayedReturns: [try makeDelayedReturn(opensAt: opensAt, dueAt: dueAt)]
    )

    #expect(result == .removed(reason: .invalidReturnDate))
    #expect(center.authorizationStatusReadCount == 0)
    #expect(center.pending[managedReminderIdentifier] == nil)
  }

  @Test("Explicit authorization denial removes the reminder")
  func explicitAuthorizationDenialRemovesReminder() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.requestAuthorizationResult = false
    center.seedPending(managedReminderIdentifier)
    center.delivered = [managedReminderIdentifier]
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.requestAndSchedule(
      delayedReturns: [
        try makeDelayedReturn(
          opensAt: now.addingTimeInterval(3_600),
          dueAt: now.addingTimeInterval(7_200)
        )
      ]
    )

    #expect(result == .notScheduled)
    #expect(center.authorizationRequestCount == 1)
    #expect(center.authorizationStatusReadCount == 0)
    #expect(center.pending[managedReminderIdentifier] == nil)
    #expect(center.delivered.isEmpty)
  }

  @Test("Explicit authorization errors remove current and stale reminders")
  func explicitAuthorizationErrorRemovesReminders() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.authorizationRequestThrows = true
    center.seedPending(managedReminderIdentifier)
    center.seedPending(staleOperationReminderIdentifier)
    center.delivered = [
      managedReminderIdentifier,
      staleOperationReminderIdentifier,
      "unmanaged-delivered",
    ]
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.requestAndSchedule(
      delayedReturns: [
        try makeDelayedReturn(
          opensAt: now.addingTimeInterval(3_600),
          dueAt: now.addingTimeInterval(7_200)
        )
      ]
    )

    #expect(result == .notScheduled)
    #expect(center.authorizationRequestCount == 1)
    #expect(center.addedRequests.isEmpty)
    #expect(center.pending[managedReminderIdentifier] == nil)
    #expect(center.pending[staleOperationReminderIdentifier] == nil)
    #expect(center.delivered == ["unmanaged-delivered"])
  }

  @Test("Reconciliation denial removes the reminder without a prompt")
  func reconciliationAuthorizationDenialRemovesReminder() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.authorizationStatusValue = .denied
    center.seedPending(managedReminderIdentifier)
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.reconcile(
      isEnabled: true,
      delayedReturns: [
        try makeDelayedReturn(
          opensAt: now.addingTimeInterval(3_600),
          dueAt: now.addingTimeInterval(7_200)
        )
      ]
    )

    #expect(result == .removed(reason: .authorizationNotPermitted))
    #expect(center.authorizationStatusReadCount == 1)
    #expect(center.authorizationRequestCount == 0)
    #expect(center.pending[managedReminderIdentifier] == nil)
  }

  @Test("Does not report success after an add failure")
  func reportsAddFailuresAndRemovesTheRequest() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let delayedReturn = try makeDelayedReturn(
      opensAt: now.addingTimeInterval(3_600),
      dueAt: now.addingTimeInterval(7_200)
    )
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

  @Test("Reports pending cleanup failure separately")
  func reportsPendingCleanupFailure() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.seedPending(managedReminderIdentifier)
    center.failPendingRemoval = true
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.requestAndSchedule(
      delayedReturns: [
        try makeDelayedReturn(
          opensAt: now.addingTimeInterval(3_600),
          dueAt: now.addingTimeInterval(7_200)
        )
      ]
    )

    #expect(result == .cleanupFailed)
    #expect(center.addedRequests.isEmpty)
    #expect(center.pending[managedReminderIdentifier] != nil)
  }

  @Test("Reports delivered cleanup failure separately")
  func reportsDeliveredCleanupFailure() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.delivered = [managedReminderIdentifier]
    center.failDeliveredRemoval = true
    let coordinator = try makeCoordinator(center: center, now: now)

    let result = await coordinator.reconcile(
      isEnabled: false,
      delayedReturns: []
    )

    #expect(result == .cleanupFailed)
    #expect(center.delivered == [managedReminderIdentifier])
  }

  @Test("Cancellation after add removes the managed reminder")
  func cancellationAfterAddRemovesReminder() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.suspendNextAdd = true
    let coordinator = try makeCoordinator(center: center, now: now)
    let delayedReturn = try makeDelayedReturn(
      opensAt: now.addingTimeInterval(3_600),
      dueAt: now.addingTimeInterval(7_200)
    )

    let task = Task { @MainActor in
      await coordinator.requestAndSchedule(delayedReturns: [delayedReturn])
    }

    try await center.waitForSuspendedAdd()
    task.cancel()
    center.resumeSuspendedAdd()

    let result = await task.value

    #expect(result == .notScheduled)
    #expect(center.pending[managedReminderIdentifier] == nil)
  }

  @Test("Serializes a later disable operation after a scheduling operation")
  func serializesDisableAfterScheduling() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let center = FakeLocalNotificationCenter()
    center.suspendNextAdd = true
    let coordinator = try makeCoordinator(center: center, now: now)
    let delayedReturn = try makeDelayedReturn(
      opensAt: now.addingTimeInterval(3_600),
      dueAt: now.addingTimeInterval(7_200)
    )

    let schedulingTask = Task { @MainActor in
      await coordinator.requestAndSchedule(delayedReturns: [delayedReturn])
    }

    try await center.waitForSuspendedAdd()

    let disableTask = Task { @MainActor in
      await coordinator.disableReminders()
    }

    await Task.yield()
    #expect(center.pending[managedReminderIdentifier] != nil)

    center.resumeSuspendedAdd()

    let schedulingResult = await schedulingTask.value
    let disableResult = await disableTask.value

    #expect(schedulingResult == .scheduled)
    #expect(disableResult)
    #expect(center.pending[managedReminderIdentifier] == nil)
  }

  @Test("Each coordinator operation reads the injected time once")
  func readsInjectedTimeOncePerOperation() async throws {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let nowRecorder = NowReadRecorder(date: now)
    let center = FakeLocalNotificationCenter()
    let coordinator = try makeCoordinator(
      center: center,
      nowProvider: nowRecorder.read
    )
    let delayedReturn = try makeDelayedReturn(
      opensAt: now.addingTimeInterval(3_600),
      dueAt: now.addingTimeInterval(7_200)
    )

    _ = await coordinator.requestAndSchedule(delayedReturns: [delayedReturn])
    #expect(nowRecorder.readCount == 1)

    _ = await coordinator.reconcile(
      isEnabled: true,
      delayedReturns: [delayedReturn]
    )
    #expect(nowRecorder.readCount == 2)

    _ = await coordinator.disableReminders()
    #expect(nowRecorder.readCount == 3)
  }

  private func makeCoordinator(
    center: FakeLocalNotificationCenter,
    now: Date,
    timeZone: TimeZone? = nil
  ) throws -> NotificationCoordinator {
    try makeCoordinator(
      center: center,
      nowProvider: { now },
      timeZone: timeZone
    )
  }

  private func makeCoordinator(
    center: FakeLocalNotificationCenter,
    nowProvider: @escaping @MainActor () -> Date,
    timeZone: TimeZone? = nil
  ) throws -> NotificationCoordinator {
    let timeZone = try #require(timeZone ?? TimeZone(secondsFromGMT: 0))
    return NotificationCoordinator(
      center: center,
      calendar: makeCalendar(timeZone: timeZone),
      timeZone: timeZone,
      now: nowProvider
    )
  }

  private func makeCalendar(timeZone: TimeZone) -> Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    return calendar
  }

  private func makeDate(
    calendar: Calendar,
    year: Int,
    month: Int,
    day: Int,
    hour: Int,
    minute: Int = 0,
    second: Int = 0
  ) throws -> Date {
    guard
      let date = calendar.date(
        from: DateComponents(
          year: year,
          month: month,
          day: day,
          hour: hour,
          minute: minute,
          second: second
        )
      )
    else {
      throw NotificationCoordinatorTestError.invalidDate
    }

    return date
  }

  private func makeDelayedReturn(
    id: String = "return1",
    opensAt: Date,
    dueAt: Date,
    completedAt: Date? = nil
  ) throws -> DelayedReturnRecord {
    var json: [String: Any] = [
      "id": id,
      "courseID": "course1",
      "activityID": "activity1",
      "originEvidenceID": "evidence1",
      "opensAt": opensAt.timeIntervalSince1970,
      "dueAt": dueAt.timeIntervalSince1970,
    ]

    if let completedAt {
      json["completedAt"] = completedAt.timeIntervalSince1970
      json["completionEvidenceID"] = "completion\(id)"
    } else {
      json["completedAt"] = NSNull()
      json["completionEvidenceID"] = NSNull()
    }

    let data = try JSONSerialization.data(
      withJSONObject: json,
      options: [.sortedKeys]
    )
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .secondsSince1970
    return try decoder.decode(DelayedReturnRecord.self, from: data)
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
