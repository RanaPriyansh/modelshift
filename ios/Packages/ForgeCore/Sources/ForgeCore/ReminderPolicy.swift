import Foundation

public enum ReturnReminderPolicy {
  public static let quietHoursStart = 21
  public static let quietHoursEnd = 9

  public static func scheduledDate(
    for dueReturn: ForgeDueReturn,
    now: Date,
    mode: LearnerMode,
    grownUpManaged: Bool,
    timeZone: TimeZone,
    calendar baseCalendar: Calendar = .autoupdatingCurrent
  ) -> Date? {
    guard dueReturn.dueAt > now else {
      return nil
    }

    guard mode != .childWithAdult || grownUpManaged else {
      return nil
    }

    var calendar = baseCalendar
    calendar.timeZone = timeZone

    let hour = calendar.component(.hour, from: dueReturn.dueAt)
    let scheduledDate: Date

    if hour >= quietHoursStart {
      scheduledDate =
        calendar.date(
          bySettingHour: 9,
          minute: 0,
          second: 0,
          of: calendar.date(byAdding: .day, value: 1, to: dueReturn.dueAt) ?? dueReturn.dueAt
        ) ?? dueReturn.dueAt
    } else if hour < quietHoursEnd {
      scheduledDate =
        calendar.date(
          bySettingHour: 9,
          minute: 0,
          second: 0,
          of: dueReturn.dueAt
        ) ?? dueReturn.dueAt
    } else {
      scheduledDate = dueReturn.dueAt
    }

    return scheduledDate > now ? scheduledDate : nil
  }

  public static let title = "A return is ready"
  public static let body = "Open FORGE when you choose to test what remains."
}
