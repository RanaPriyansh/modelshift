import ForgeCore
import Foundation
import UserNotifications

@MainActor
protocol LocalNotificationCenter: AnyObject {
  func requestAuthorization(options: UNAuthorizationOptions) async throws -> Bool
  func add(_ request: UNNotificationRequest) async throws
  func pendingNotificationRequests() async -> [UNNotificationRequest]
  func deliveredNotifications() async -> [UNNotification]
  func removePendingNotificationRequests(withIdentifiers identifiers: [String])
  func removeDeliveredNotifications(withIdentifiers identifiers: [String])
}

extension UNUserNotificationCenter: LocalNotificationCenter {}

@MainActor
final class NotificationCoordinator {
  private static let legacyReminderIdentifier = "forge.return-reminder"
  private static let reminderIdentifierPrefix = "forge.return-reminder."
  private static let authorizationOptions: UNAuthorizationOptions = [.alert]

  private let center: any LocalNotificationCenter
  private var calendar: Calendar
  private let timeZone: TimeZone
  private let now: () -> Date
  private var currentOperation = UInt64.zero
  private var knownReminderIdentifiers = Set<String>()

  init(
    center: any LocalNotificationCenter = UNUserNotificationCenter.current(),
    calendar: Calendar = .autoupdatingCurrent,
    timeZone: TimeZone = .autoupdatingCurrent,
    now: @escaping () -> Date = Date.init
  ) {
    self.center = center
    self.calendar = calendar
    self.timeZone = timeZone
    self.now = now
    self.calendar.timeZone = timeZone
  }

  /// Call this method only from an explicit return-reminder user action.
  func requestAndSchedule(
    snapshot: ForgeSnapshot,
    mode: LearnerMode,
    grownUpManaged: Bool
  ) async -> Bool {
    let operation = beginOperation()
    let requestDate = now()

    guard
      snapshot.mode == mode,
      let dueReturn = snapshot.dueReturn,
      let scheduledDate = ReturnReminderPolicy.scheduledDate(
        for: dueReturn,
        now: requestDate,
        mode: mode,
        grownUpManaged: grownUpManaged,
        timeZone: timeZone,
        calendar: calendar
      )
    else {
      _ = await cancelManagedReminders(for: operation)
      return false
    }

    guard isCurrent(operation), !Task.isCancelled else {
      _ = await cancelManagedReminders(for: operation)
      return false
    }

    guard await cancelManagedReminders(for: operation) else {
      return false
    }

    guard isCurrent(operation), !Task.isCancelled else {
      _ = await cancelManagedReminders(for: operation)
      return false
    }

    let isAuthorized: Bool
    do {
      isAuthorized = try await center.requestAuthorization(
        options: Self.authorizationOptions
      )
    } catch {
      _ = await cancelManagedReminders(for: operation)
      return false
    }

    guard isAuthorized, isCurrent(operation), !Task.isCancelled else {
      _ = await cancelManagedReminders(for: operation)
      return false
    }

    let content = UNMutableNotificationContent()
    content.title = ReturnReminderPolicy.title
    content.body = ReturnReminderPolicy.body
    content.interruptionLevel = .passive
    content.sound = nil

    let dateComponents = calendar.dateComponents(
      [.year, .month, .day, .hour, .minute],
      from: scheduledDate
    )
    let trigger = UNCalendarNotificationTrigger(
      dateMatching: dateComponents,
      repeats: false
    )
    let identifier = Self.reminderIdentifier(for: operation)
    let request = UNNotificationRequest(
      identifier: identifier,
      content: content,
      trigger: trigger
    )

    knownReminderIdentifiers.insert(identifier)

    do {
      try await center.add(request)
    } catch {
      removeReminder(withIdentifier: identifier)
      _ = await cancelManagedReminders(for: operation)
      return false
    }

    guard isCurrent(operation), !Task.isCancelled else {
      removeReminder(withIdentifier: identifier)
      _ = await cancelManagedReminders(for: operation)
      return false
    }

    return true
  }

  func disableReminders() async {
    let operation = beginOperation()
    _ = await cancelManagedReminders(for: operation)
  }

  private func beginOperation() -> UInt64 {
    currentOperation &+= 1
    return currentOperation
  }

  private func isCurrent(_ operation: UInt64) -> Bool {
    currentOperation == operation
  }

  private func cancelManagedReminders(for operation: UInt64) async -> Bool {
    let pendingRequests = await center.pendingNotificationRequests()

    guard isCurrent(operation) else {
      return false
    }

    var pendingIdentifiers = knownReminderIdentifiers
    pendingIdentifiers.insert(Self.legacyReminderIdentifier)
    pendingIdentifiers.formUnion(
      pendingRequests.lazy
        .map(\.identifier)
        .filter(Self.isManagedReminderIdentifier)
    )

    if !pendingIdentifiers.isEmpty {
      center.removePendingNotificationRequests(
        withIdentifiers: pendingIdentifiers.sorted()
      )
    }
    knownReminderIdentifiers.subtract(pendingIdentifiers)

    let deliveredNotifications = await center.deliveredNotifications()

    guard isCurrent(operation) else {
      return false
    }

    let deliveredIdentifiers = Set(
      deliveredNotifications.lazy
        .map(\.request.identifier)
        .filter(Self.isManagedReminderIdentifier)
    )

    if !deliveredIdentifiers.isEmpty {
      center.removeDeliveredNotifications(
        withIdentifiers: deliveredIdentifiers.sorted()
      )
    }

    let remainingPendingRequests = await center.pendingNotificationRequests()

    guard isCurrent(operation) else {
      return false
    }

    let remainingDeliveredNotifications = await center.deliveredNotifications()

    guard isCurrent(operation) else {
      return false
    }

    let remainingIdentifiers = Set(
      remainingPendingRequests.lazy
        .map(\.identifier)
        .filter(Self.isManagedReminderIdentifier)
    ).union(
      remainingDeliveredNotifications.lazy
        .map(\.request.identifier)
        .filter(Self.isManagedReminderIdentifier)
    )

    guard remainingIdentifiers.isEmpty else {
      knownReminderIdentifiers.formUnion(remainingIdentifiers)
      return false
    }

    knownReminderIdentifiers.subtract(
      knownReminderIdentifiers.filter(Self.isManagedReminderIdentifier)
    )
    return true
  }

  private func removeReminder(withIdentifier identifier: String) {
    center.removePendingNotificationRequests(withIdentifiers: [identifier])
    center.removeDeliveredNotifications(withIdentifiers: [identifier])
    knownReminderIdentifiers.remove(identifier)
  }

  private static func reminderIdentifier(for operation: UInt64) -> String {
    "\(reminderIdentifierPrefix)\(operation)"
  }

  private static func isManagedReminderIdentifier(_ identifier: String) -> Bool {
    identifier == legacyReminderIdentifier
      || identifier.hasPrefix(reminderIdentifierPrefix)
  }
}
