import ForgeCore
import Foundation
import UserNotifications

enum LocalNotificationAuthorizationStatus: Equatable, Sendable {
  case notDetermined
  case denied
  case authorized
  case provisional
  case ephemeral
  case unknown

  var permitsScheduling: Bool {
    switch self {
    case .authorized, .provisional, .ephemeral:
      true
    case .notDetermined, .denied, .unknown:
      false
    }
  }
}

enum ReminderSchedulingResult: Equatable, Sendable {
  case scheduled
  case notScheduled
  case cleanupFailed

  var storedPreferenceValue: Bool? {
    switch self {
    case .scheduled:
      true
    case .notScheduled:
      false
    case .cleanupFailed:
      nil
    }
  }
}

enum ReminderReconciliationReason: Equatable, Sendable {
  case preferenceDisabled
  case noScheduledReturn
  case invalidReturnDate
  case authorizationNotPermitted
  case cancelled
}

enum ReminderReconciliationResult: Equatable, Sendable {
  case scheduled
  case removed(reason: ReminderReconciliationReason)
  case cleanupFailed
  case schedulingFailed

  var storedPreferenceValue: Bool? {
    switch self {
    case .scheduled:
      true
    case .removed:
      false
    case .cleanupFailed, .schedulingFailed:
      nil
    }
  }
}

@MainActor
protocol LocalNotificationCenter: AnyObject {
  func authorizationStatus() async -> LocalNotificationAuthorizationStatus
  func requestAuthorization(options: UNAuthorizationOptions) async throws -> Bool
  func add(_ request: UNNotificationRequest) async throws
  func pendingNotificationIdentifiers() async -> [String]
  func deliveredNotificationIdentifiers() async -> [String]
  func removePendingNotificationRequests(withIdentifiers identifiers: [String])
  func removeDeliveredNotifications(withIdentifiers identifiers: [String])
}

@MainActor
protocol ImmediateNotificationRemovalReporting: AnyObject {
  func removePendingNotificationsImmediately(
    withIdentifiers identifiers: [String]
  ) -> Bool
  func removeDeliveredNotificationsImmediately(
    withIdentifiers identifiers: [String]
  ) -> Bool
}

extension UNUserNotificationCenter:
  LocalNotificationCenter,
  ImmediateNotificationRemovalReporting
{
  func authorizationStatus() async -> LocalNotificationAuthorizationStatus {
    let settings = await notificationSettings()

    switch settings.authorizationStatus {
    case .notDetermined:
      return .notDetermined
    case .denied:
      return .denied
    case .authorized:
      return .authorized
    case .provisional:
      return .provisional
    case .ephemeral:
      return .ephemeral
    @unknown default:
      return .unknown
    }
  }

  func pendingNotificationIdentifiers() async -> [String] {
    let requests = await pendingNotificationRequests()
    return requests.map(\.identifier)
  }

  func deliveredNotificationIdentifiers() async -> [String] {
    let notifications = await deliveredNotifications()
    return notifications.map(\.request.identifier)
  }

  func removePendingNotificationsImmediately(
    withIdentifiers identifiers: [String]
  ) -> Bool {
    removePendingNotificationRequests(withIdentifiers: identifiers)
    return true
  }

  func removeDeliveredNotificationsImmediately(
    withIdentifiers identifiers: [String]
  ) -> Bool {
    removeDeliveredNotifications(withIdentifiers: identifiers)
    return true
  }
}

@MainActor
private final class NotificationOperationCompletion {
  private var continuation: CheckedContinuation<Void, Never>?
  private var isFinished = false

  func wait() async {
    await withCheckedContinuation { continuation in
      if isFinished {
        continuation.resume()
      } else {
        self.continuation = continuation
      }
    }
  }

  func finish() {
    guard !isFinished else {
      return
    }

    isFinished = true
    continuation?.resume()
    continuation = nil
  }
}

@MainActor
final class NotificationCoordinator {
  private static let reminderIdentifier = "forge.return-reminder"
  private static let staleOperationReminderPrefix = "\(reminderIdentifier)."
  private static let authorizationOptions: UNAuthorizationOptions = [.alert]

  private let center: any LocalNotificationCenter
  private let calendar: Calendar
  private let timeZone: TimeZone
  private let now: @MainActor () -> Date
  private var operationTail: Task<Void, Never>?

  init(
    center: any LocalNotificationCenter = UNUserNotificationCenter.current(),
    calendar: Calendar = .autoupdatingCurrent,
    timeZone: TimeZone = .autoupdatingCurrent,
    now: @escaping @MainActor () -> Date = Date.init
  ) {
    self.center = center
    self.timeZone = timeZone
    self.now = now
    self.operationTail = nil

    var configuredCalendar = calendar
    configuredCalendar.timeZone = timeZone
    self.calendar = configuredCalendar
  }

  /// Call this method only from an explicit return-reminder user action.
  func requestAndSchedule(
    delayedReturns: [UniversitySemesterDeskDelayedReturn]
  ) async -> ReminderSchedulingResult {
    await enqueue { [self] in
      await requestAndScheduleOperation(delayedReturns: delayedReturns)
    }
  }

  func reconcile(
    isEnabled: Bool,
    delayedReturns: [UniversitySemesterDeskDelayedReturn]
  ) async -> ReminderReconciliationResult {
    await enqueue { [self] in
      await reconcileOperation(
        isEnabled: isEnabled,
        delayedReturns: delayedReturns
      )
    }
  }

  func disableReminders() async -> Bool {
    await enqueue { [self] in
      _ = now()
      return await cancelManagedReminders()
    }
  }

  func authorizationStatus() async -> LocalNotificationAuthorizationStatus {
    await center.authorizationStatus()
  }

  func removeKnownReminderImmediately() -> Bool {
    let identifiers = [Self.reminderIdentifier]
    guard
      let reportingCenter =
        center as? any ImmediateNotificationRemovalReporting
    else {
      center.removePendingNotificationRequests(
        withIdentifiers: identifiers
      )
      center.removeDeliveredNotifications(
        withIdentifiers: identifiers
      )
      return true
    }
    let didRequestPendingRemoval =
      reportingCenter.removePendingNotificationsImmediately(
        withIdentifiers: identifiers
      )
    let didRequestDeliveredRemoval =
      reportingCenter.removeDeliveredNotificationsImmediately(
        withIdentifiers: identifiers
      )
    return didRequestPendingRemoval && didRequestDeliveredRemoval
  }

  private func requestAndScheduleOperation(
    delayedReturns: [UniversitySemesterDeskDelayedReturn]
  ) async -> ReminderSchedulingResult {
    let capturedNow = now()

    guard !Task.isCancelled else {
      return await resultAfterManagedReminderCleanup()
    }

    guard
      let scheduledDate = eligibleReturnDate(
        in: delayedReturns,
        now: capturedNow
      )
    else {
      return await resultAfterManagedReminderCleanup()
    }

    guard
      let trigger = makeReminderTrigger(
        for: scheduledDate,
        after: capturedNow
      )
    else {
      return await resultAfterManagedReminderCleanup()
    }

    guard await cancelManagedReminders() else {
      return .cleanupFailed
    }

    guard !Task.isCancelled else {
      return await resultAfterManagedReminderCleanup()
    }

    let isAuthorized: Bool
    do {
      isAuthorized = try await center.requestAuthorization(
        options: Self.authorizationOptions
      )
    } catch {
      return await resultAfterManagedReminderCleanup()
    }

    guard isAuthorized, !Task.isCancelled else {
      return await resultAfterManagedReminderCleanup()
    }

    do {
      try await center.add(makeReminderRequest(trigger: trigger))
    } catch {
      return await resultAfterManagedReminderCleanup()
    }

    guard !Task.isCancelled else {
      return await resultAfterManagedReminderCleanup()
    }

    return .scheduled
  }

  private func reconcileOperation(
    isEnabled: Bool,
    delayedReturns: [UniversitySemesterDeskDelayedReturn]
  ) async -> ReminderReconciliationResult {
    let capturedNow = now()

    guard !Task.isCancelled else {
      return await removeAndReport(reason: .cancelled)
    }

    guard isEnabled else {
      return await removeAndReport(reason: .preferenceDisabled)
    }

    guard
      let scheduledDate = eligibleReturnDate(
        in: delayedReturns,
        now: capturedNow
      )
    else {
      return await removeAndReport(reason: .noScheduledReturn)
    }

    guard
      let trigger = makeReminderTrigger(
        for: scheduledDate,
        after: capturedNow
      )
    else {
      return await removeAndReport(reason: .invalidReturnDate)
    }

    let authorizationStatus = await center.authorizationStatus()

    guard !Task.isCancelled else {
      return await removeAndReport(reason: .cancelled)
    }

    guard authorizationStatus.permitsScheduling else {
      return await removeAndReport(reason: .authorizationNotPermitted)
    }

    guard await cancelManagedReminders() else {
      return .cleanupFailed
    }

    guard !Task.isCancelled else {
      return await removeAndReport(reason: .cancelled)
    }

    do {
      try await center.add(makeReminderRequest(trigger: trigger))
    } catch {
      guard await cancelManagedReminders() else {
        return .cleanupFailed
      }
      return .schedulingFailed
    }

    guard !Task.isCancelled else {
      return await removeAndReport(reason: .cancelled)
    }

    return .scheduled
  }

  private func removeAndReport(
    reason: ReminderReconciliationReason
  ) async -> ReminderReconciliationResult {
    guard await cancelManagedReminders() else {
      return .cleanupFailed
    }

    return .removed(reason: reason)
  }

  private func resultAfterManagedReminderCleanup() async -> ReminderSchedulingResult {
    guard await cancelManagedReminders() else {
      return .cleanupFailed
    }

    return .notScheduled
  }

  private func cancelManagedReminders() async -> Bool {
    let pendingIdentifiers = managedIdentifiers(
      await center.pendingNotificationIdentifiers()
    )

    if !pendingIdentifiers.isEmpty {
      center.removePendingNotificationRequests(
        withIdentifiers: pendingIdentifiers
      )
    }

    let deliveredIdentifiers = managedIdentifiers(
      await center.deliveredNotificationIdentifiers()
    )

    if !deliveredIdentifiers.isEmpty {
      center.removeDeliveredNotifications(
        withIdentifiers: deliveredIdentifiers
      )
    }

    let remainingPendingIdentifiers = managedIdentifiers(
      await center.pendingNotificationIdentifiers()
    )
    let remainingDeliveredIdentifiers = managedIdentifiers(
      await center.deliveredNotificationIdentifiers()
    )

    return remainingPendingIdentifiers.isEmpty
      && remainingDeliveredIdentifiers.isEmpty
  }

  private func managedIdentifiers(_ identifiers: [String]) -> [String] {
    Array(Set(identifiers.filter(Self.isManagedReminderIdentifier))).sorted()
  }

  private static func isManagedReminderIdentifier(_ identifier: String) -> Bool {
    identifier == Self.reminderIdentifier
      || identifier.hasPrefix(Self.staleOperationReminderPrefix)
  }

  private func makeReminderRequest(
    trigger: UNCalendarNotificationTrigger
  ) -> UNNotificationRequest {
    let content = UNMutableNotificationContent()
    content.title = "Come back on this date"
    content.body = "Open FORGE Today to check what you retained."
    content.interruptionLevel = .passive
    content.sound = nil

    return UNNotificationRequest(
      identifier: Self.reminderIdentifier,
      content: content,
      trigger: trigger
    )
  }

  private func makeReminderTrigger(
    for scheduledDate: Date,
    after capturedNow: Date
  ) -> UNCalendarNotificationTrigger? {
    func dateComponents(for date: Date) -> DateComponents {
      var components = calendar.dateComponents(
        [.year, .month, .day, .hour, .minute, .second],
        from: date
      )
      components.calendar = calendar
      components.timeZone = timeZone
      return components
    }

    var components = dateComponents(for: scheduledDate)

    guard var triggerDate = calendar.date(from: components) else {
      return nil
    }

    if triggerDate < scheduledDate {
      guard
        let laterDate = calendar.date(
          byAdding: .second,
          value: 1,
          to: scheduledDate
        )
      else {
        return nil
      }

      components = dateComponents(for: laterDate)
      guard let laterTriggerDate = calendar.date(from: components) else {
        return nil
      }

      triggerDate = laterTriggerDate
    }

    guard triggerDate >= scheduledDate, triggerDate > capturedNow else {
      return nil
    }

    return UNCalendarNotificationTrigger(
      dateMatching: components,
      repeats: false
    )
  }

  private func eligibleReturnDate(
    in delayedReturns: [UniversitySemesterDeskDelayedReturn],
    now: Date
  ) -> Date? {
    guard now.timeIntervalSinceReferenceDate.isFinite else {
      return nil
    }

    return
      delayedReturns
      .filter { $0.status == .due }
      .compactMap { delayedReturn -> (id: String, date: Date)? in
        guard
          let date = parseSemesterDeskTimestamp(delayedReturn.dueAt),
          date > now
        else {
          return nil
        }
        return (delayedReturn.id, date)
      }
      .min { left, right in
        if left.date == right.date {
          return left.id < right.id
        }
        return left.date < right.date
      }?
      .date
  }

  private func parseSemesterDeskTimestamp(_ value: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [
      .withInternetDateTime,
      .withFractionalSeconds,
    ]
    return formatter.date(from: value)
  }

  private func enqueue<T>(
    _ operation: @escaping @MainActor () async -> T
  ) async -> T {
    let previousOperation = operationTail
    let completion = NotificationOperationCompletion()
    operationTail = Task { @MainActor in
      await completion.wait()
    }

    defer {
      completion.finish()
    }

    await previousOperation?.value
    return await operation()
  }
}
