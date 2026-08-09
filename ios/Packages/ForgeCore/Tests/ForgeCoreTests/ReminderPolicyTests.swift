import Foundation
import Testing

@testable import ForgeCore

struct ReminderPolicyTests {
  @Test
  func notificationCopyIsNeutral() {
    #expect(ReturnReminderPolicy.title == "Reminder")
    #expect(ReturnReminderPolicy.body == "Open FORGE to continue.")
  }

  @Test
  func eligibleReturnSelectsTheEarliestScheduledRecordThenIdentifier() throws {
    let timeZone = try #require(TimeZone(secondsFromGMT: 0))
    let now = try Self.date(timeZone, year: 2027, month: 1, day: 1, hour: 12)
    let earliestOpen = try Self.date(timeZone, year: 2027, month: 1, day: 2, hour: 9)
    let dueAt = try Self.date(timeZone, year: 2027, month: 1, day: 4, hour: 12)
    let late = try Self.record(
      id: "late",
      opensAt: try Self.date(timeZone, year: 2027, month: 1, day: 3, hour: 9),
      dueAt: dueAt
    )
    let laterIdentifier = try Self.record(
      id: "zeta",
      opensAt: earliestOpen,
      dueAt: dueAt
    )
    let selected = try Self.record(
      id: "alpha",
      opensAt: earliestOpen,
      dueAt: dueAt
    )

    let result = ReturnReminderPolicy.eligibleReturn(
      in: [late, laterIdentifier, selected],
      now: now
    )

    #expect(result?.id == selected.id)
  }

  @Test
  func eligibleReturnRejectsTheOpenBoundaryAndIneligibleStatuses() throws {
    let timeZone = try #require(TimeZone(secondsFromGMT: 0))
    let calendar = Self.calendar(timeZone)
    let now = try Self.date(timeZone, year: 2027, month: 1, day: 2, hour: 12)
    let atOpen = try Self.record(
      id: "open-boundary",
      opensAt: now,
      dueAt: now.addingTimeInterval(3_600)
    )
    let open = try Self.record(
      id: "open",
      opensAt: now.addingTimeInterval(-1),
      dueAt: now.addingTimeInterval(3_600)
    )
    let due = try Self.record(
      id: "due",
      opensAt: now.addingTimeInterval(-3_600),
      dueAt: now
    )
    let expired = try Self.record(
      id: "expired",
      opensAt: now.addingTimeInterval(-7_200),
      dueAt: now.addingTimeInterval(-3_600)
    )
    let completed = try Self.record(
      id: "completed",
      opensAt: now.addingTimeInterval(-3_600),
      dueAt: now.addingTimeInterval(3_600),
      completedAt: now.addingTimeInterval(-1)
    )

    for record in [atOpen, open, due, expired, completed] {
      #expect(ReturnReminderPolicy.eligibleReturn(in: [record], now: now) == nil)
      #expect(
        ReturnReminderPolicy.scheduledDate(
          for: record,
          now: now,
          timeZone: timeZone,
          calendar: calendar
        ) == nil
      )
    }
  }

  @Test
  func policyRejectsNonfiniteNow() throws {
    let timeZone = try #require(TimeZone(secondsFromGMT: 0))
    let calendar = Self.calendar(timeZone)
    let opensAt = try Self.date(timeZone, year: 2027, month: 1, day: 2, hour: 12)
    let record = try Self.record(
      id: "nonfinite-now",
      opensAt: opensAt,
      dueAt: opensAt.addingTimeInterval(86_400)
    )
    let nonfiniteNow = Date(timeIntervalSinceReferenceDate: .infinity)

    #expect(ReturnReminderPolicy.eligibleReturn(in: [record], now: nonfiniteNow) == nil)
    #expect(
      ReturnReminderPolicy.scheduledDate(
        for: record,
        now: nonfiniteNow,
        timeZone: timeZone,
        calendar: calendar
      ) == nil
    )
  }

  @Test
  func scheduledDateUsesOpensAtInsteadOfDueAt() throws {
    let timeZone = try #require(TimeZone(secondsFromGMT: 0))
    let calendar = Self.calendar(timeZone)
    let now = try Self.date(timeZone, year: 2027, month: 1, day: 1, hour: 12)
    let opensAt = try Self.date(timeZone, year: 2027, month: 1, day: 2, hour: 12)
    let dueAt = try Self.date(timeZone, year: 2027, month: 1, day: 4, hour: 12)
    let record = try Self.record(id: "uses-open", opensAt: opensAt, dueAt: dueAt)

    let result = ReturnReminderPolicy.scheduledDate(
      for: record,
      now: now,
      timeZone: timeZone,
      calendar: calendar
    )

    #expect(result == opensAt)
    #expect(result != dueAt)
  }

  @Test
  func scheduledDateUsesTheInjectedNonUTCTimeZone() throws {
    let timeZone = try #require(TimeZone(identifier: "Asia/Kolkata"))
    let localCalendar = Self.calendar(timeZone)
    let opensAt = try Self.date(timeZone, year: 2027, month: 1, day: 2, hour: 21, minute: 30)
    let record = try Self.record(
      id: "kolkata",
      opensAt: opensAt,
      dueAt: try Self.date(timeZone, year: 2027, month: 1, day: 4, hour: 12)
    )
    let now = try Self.date(timeZone, year: 2027, month: 1, day: 1, hour: 12)
    let expected = try Self.date(timeZone, year: 2027, month: 1, day: 3, hour: 9)
    var utcCalendar = Calendar(identifier: .gregorian)
    utcCalendar.timeZone = try #require(TimeZone(secondsFromGMT: 0))

    let result = ReturnReminderPolicy.scheduledDate(
      for: record,
      now: now,
      timeZone: timeZone,
      calendar: utcCalendar
    )

    #expect(result == expected)
    #expect(localCalendar.component(.hour, from: try #require(result)) == 9)
  }

  @Test
  func scheduledDatePreservesLocalTimeAcrossSpringDSTTransition() throws {
    let timeZone = try #require(TimeZone(identifier: "America/New_York"))
    let calendar = Self.calendar(timeZone)
    let opensAt = try Self.date(timeZone, year: 2027, month: 3, day: 13, hour: 21)
    let record = try Self.record(
      id: "spring-dst",
      opensAt: opensAt,
      dueAt: try Self.date(timeZone, year: 2027, month: 3, day: 15, hour: 12)
    )
    let now = try Self.date(timeZone, year: 2027, month: 3, day: 12, hour: 12)
    let expected = try Self.date(timeZone, year: 2027, month: 3, day: 14, hour: 9)

    let result = ReturnReminderPolicy.scheduledDate(
      for: record,
      now: now,
      timeZone: timeZone,
      calendar: calendar
    )

    #expect(result == expected)
  }

  @Test
  func scheduledDatePreservesLocalTimeAcrossFallDSTTransition() throws {
    let timeZone = try #require(TimeZone(identifier: "America/New_York"))
    let calendar = Self.calendar(timeZone)
    let opensAt = try Self.date(timeZone, year: 2027, month: 11, day: 6, hour: 21)
    let record = try Self.record(
      id: "fall-dst",
      opensAt: opensAt,
      dueAt: try Self.date(timeZone, year: 2027, month: 11, day: 8, hour: 12)
    )
    let now = try Self.date(timeZone, year: 2027, month: 11, day: 5, hour: 12)
    let expected = try Self.date(timeZone, year: 2027, month: 11, day: 7, hour: 9)

    let result = ReturnReminderPolicy.scheduledDate(
      for: record,
      now: now,
      timeZone: timeZone,
      calendar: calendar
    )

    #expect(result == expected)
  }

  @Test(
    arguments: [
      (20, 59, 2, 20, 59),
      (21, 0, 3, 9, 0),
      (8, 59, 2, 9, 0),
      (9, 0, 2, 9, 0),
    ]
  )
  func scheduledDateHonorsExactQuietHourBoundaries(
    openHour: Int,
    openMinute: Int,
    expectedDay: Int,
    expectedHour: Int,
    expectedMinute: Int
  ) throws {
    let timeZone = try #require(TimeZone(secondsFromGMT: 0))
    let calendar = Self.calendar(timeZone)
    let now = try Self.date(timeZone, year: 2027, month: 1, day: 1, hour: 12)
    let opensAt = try Self.date(
      timeZone,
      year: 2027,
      month: 1,
      day: 2,
      hour: openHour,
      minute: openMinute
    )
    let record = try Self.record(
      id: "boundary-\(openHour)-\(openMinute)",
      opensAt: opensAt,
      dueAt: try Self.date(timeZone, year: 2027, month: 1, day: 4, hour: 12)
    )
    let expected = try Self.date(
      timeZone,
      year: 2027,
      month: 1,
      day: expectedDay,
      hour: expectedHour,
      minute: expectedMinute
    )

    let result = ReturnReminderPolicy.scheduledDate(
      for: record,
      now: now,
      timeZone: timeZone,
      calendar: calendar
    )

    #expect(result == expected)
  }

  @Test
  func scheduledDateRejectsAQuietHourShiftAfterDueAt() throws {
    let timeZone = try #require(TimeZone(secondsFromGMT: 0))
    let calendar = Self.calendar(timeZone)
    let now = try Self.date(timeZone, year: 2027, month: 1, day: 1, hour: 12)
    let opensAt = try Self.date(timeZone, year: 2027, month: 1, day: 2, hour: 21)
    let record = try Self.record(
      id: "shift-after-due",
      opensAt: opensAt,
      dueAt: try Self.date(timeZone, year: 2027, month: 1, day: 2, hour: 22)
    )

    let result = ReturnReminderPolicy.scheduledDate(
      for: record,
      now: now,
      timeZone: timeZone,
      calendar: calendar
    )

    #expect(result == nil)
  }

  private static func calendar(_ timeZone: TimeZone) -> Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    return calendar
  }

  private static func date(
    _ timeZone: TimeZone,
    year: Int,
    month: Int,
    day: Int,
    hour: Int,
    minute: Int = 0
  ) throws -> Date {
    try #require(
      calendar(timeZone).date(
        from: DateComponents(
          year: year,
          month: month,
          day: day,
          hour: hour,
          minute: minute
        )
      )
    )
  }

  private static func record(
    id: String,
    opensAt: Date,
    dueAt: Date,
    completedAt: Date? = nil
  ) throws -> DelayedReturnRecord {
    let completionEvidenceID: EvidenceID?
    if completedAt == nil {
      completionEvidenceID = nil
    } else {
      completionEvidenceID = try EvidenceID("evidence.completion.\(id)")
    }

    return try DelayedReturnRecord(
      id: try DelayedReturnID("return.\(id)"),
      courseID: try CourseID("course.reminder-policy"),
      activityID: try ActivityID("activity.reminder-policy"),
      originEvidenceID: try EvidenceID("evidence.origin.\(id)"),
      opensAt: opensAt,
      dueAt: dueAt,
      completedAt: completedAt,
      completionEvidenceID: completionEvidenceID
    )
  }
}
