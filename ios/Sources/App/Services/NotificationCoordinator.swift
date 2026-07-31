import ForgeCore
import Foundation
import UserNotifications

@MainActor
final class NotificationCoordinator {
    private static let reminderIdentifier = "forge.return-reminder"

    private let center: UNUserNotificationCenter
    private var calendar: Calendar
    private let timeZone: TimeZone
    private let now: () -> Date

    init(
        center: UNUserNotificationCenter = .current(),
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

    func requestAndSchedule(
        snapshot: ForgeSnapshot,
        mode: LearnerMode,
        grownUpManaged: Bool
    ) async -> Bool {
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
            await disableReminders()
            return false
        }

        let isAuthorized: Bool
        do {
            isAuthorized = try await center.requestAuthorization(options: [.alert])
        } catch {
            await disableReminders()
            return false
        }

        guard isAuthorized, !Task.isCancelled else {
            await disableReminders()
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
        let request = UNNotificationRequest(
            identifier: Self.reminderIdentifier,
            content: content,
            trigger: trigger
        )

        center.removeDeliveredNotifications(
            withIdentifiers: [Self.reminderIdentifier]
        )

        do {
            try await center.add(request)
        } catch {
            await disableReminders()
            return false
        }

        guard !Task.isCancelled else {
            await disableReminders()
            return false
        }

        return true
    }

    func disableReminders() async {
        center.removePendingNotificationRequests(
            withIdentifiers: [Self.reminderIdentifier]
        )
        center.removeDeliveredNotifications(
            withIdentifiers: [Self.reminderIdentifier]
        )
    }
}
