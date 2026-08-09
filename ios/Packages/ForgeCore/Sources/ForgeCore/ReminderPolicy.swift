import Foundation

public enum ReturnReminderPolicy {
  public static let quietHoursStart = 21
  public static let quietHoursEnd = 9

  public static let title = "Reminder"
  public static let body = "Open FORGE to continue."

  public static func eligibleReturn(
    in delayedReturns: [DelayedReturnRecord],
    now: Date
  ) -> DelayedReturnRecord? {
    guard isFinite(now) else {
      return nil
    }

    return
      delayedReturns
      .filter { isReminderEligible($0, now: now) }
      .min { left, right in
        if left.opensAt == right.opensAt {
          return left.id.rawValue < right.id.rawValue
        }
        return left.opensAt < right.opensAt
      }
  }

  public static func scheduledDate(
    for record: DelayedReturnRecord,
    now: Date,
    timeZone: TimeZone,
    calendar baseCalendar: Calendar
  ) -> Date? {
    guard isReminderEligible(record, now: now) else {
      return nil
    }

    var calendar = baseCalendar
    calendar.timeZone = timeZone

    let hour = calendar.component(.hour, from: record.opensAt)
    let scheduledDate: Date

    if hour >= quietHoursStart {
      guard
        let nextDay = calendar.date(byAdding: .day, value: 1, to: record.opensAt),
        let shiftedDate = calendar.date(
          bySettingHour: quietHoursEnd,
          minute: 0,
          second: 0,
          of: nextDay
        )
      else {
        return nil
      }
      scheduledDate = shiftedDate
    } else if hour < quietHoursEnd {
      guard
        let shiftedDate = calendar.date(
          bySettingHour: quietHoursEnd,
          minute: 0,
          second: 0,
          of: record.opensAt
        )
      else {
        return nil
      }
      scheduledDate = shiftedDate
    } else {
      scheduledDate = record.opensAt
    }

    guard
      isFinite(scheduledDate),
      scheduledDate > now,
      scheduledDate <= record.dueAt
    else {
      return nil
    }

    return scheduledDate
  }

  private static func isReminderEligible(
    _ record: DelayedReturnRecord,
    now: Date
  ) -> Bool {
    guard
      isFinite(now),
      isFinite(record.opensAt),
      isFinite(record.dueAt),
      record.opensAt < record.dueAt,
      record.opensAt > now,
      record.dueAt > now,
      record.status(at: now) == .scheduled
    else {
      return false
    }

    return true
  }

  private static func isFinite(_ date: Date) -> Bool {
    date.timeIntervalSinceReferenceDate.isFinite
  }
}
