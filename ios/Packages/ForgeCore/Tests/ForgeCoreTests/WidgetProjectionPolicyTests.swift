import Foundation
import Testing

@testable import ForgeCore

struct WidgetProjectionPolicyTests {
  @Test(
    "Unavailable and invalid inputs have generic Today outputs",
    arguments: [
      (
        WidgetProjectionPolicy.Input.unavailableStore,
        WidgetProjectionPolicy.State.unavailableStore,
        "Unavailable",
        "Widget data unavailable",
        "Open FORGE to view Today",
        "FORGE. Widget data is unavailable. Open FORGE.",
        "Opens the local FORGE Today view.",
        "xmark.circle"
      ),
      (
        WidgetProjectionPolicy.Input.noData,
        WidgetProjectionPolicy.State.noData,
        "No data",
        "No delayed return",
        "Open FORGE to view Today",
        "FORGE. No delayed return is shown. Open FORGE.",
        "Opens the local FORGE Today view.",
        "minus.circle"
      ),
      (
        WidgetProjectionPolicy.Input.corruptData,
        WidgetProjectionPolicy.State.corruptData,
        "Corrupt data",
        "Return data unreadable",
        "Open FORGE to view Today",
        "FORGE. Return data cannot be read. Open FORGE.",
        "Opens the local FORGE Today view.",
        "exclamationmark.octagon"
      ),
    ]
  )
  func nonProjectionInputsUseGenericTodayCopy(
    input: WidgetProjectionPolicy.Input,
    expectedState: WidgetProjectionPolicy.State,
    expectedStatus: String,
    expectedTitle: String,
    expectedDetail: String,
    expectedAccessibilityLabel: String,
    expectedAccessibilityHint: String,
    expectedSymbol: String
  ) throws {
    let now = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let presentation = WidgetProjectionPolicy.presentation(
      for: input,
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.state == expectedState)
    #expect(presentation.copy.status == expectedStatus)
    #expect(presentation.copy.title == expectedTitle)
    #expect(presentation.copy.detail == expectedDetail)
    #expect(presentation.copy.accessibilityLabel == expectedAccessibilityLabel)
    #expect(presentation.copy.accessibilityHint == expectedAccessibilityHint)
    #expect(presentation.symbol == expectedSymbol)
    #expect(presentation.route.url.absoluteString == "forge://today")
    #expect(
      presentation.nextRefreshDate
        == now.addingTimeInterval(WidgetProjectionPolicy.maximumRefreshInterval)
    )
  }

  @Test
  func transientStoreUnavailableUsesGenericCopyAndShortRetry() throws {
    let now = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let hardFailure = WidgetProjectionPolicy.presentation(
      for: .unavailableStore,
      now: now,
      calendar: utcCalendar()
    )
    let transientFailure = WidgetProjectionPolicy.presentation(
      for: .transientlyUnavailableStore,
      now: now,
      calendar: utcCalendar()
    )
    let noData = WidgetProjectionPolicy.presentation(
      for: .noData,
      now: now,
      calendar: utcCalendar()
    )

    #expect(transientFailure.state == hardFailure.state)
    #expect(transientFailure.copy == hardFailure.copy)
    #expect(transientFailure.symbol == hardFailure.symbol)
    #expect(transientFailure.route == hardFailure.route)
    #expect(
      transientFailure.nextRefreshDate
        == now.addingTimeInterval(WidgetProjectionPolicy.transientRetryInterval)
    )
    #expect(
      hardFailure.nextRefreshDate
        == now.addingTimeInterval(WidgetProjectionPolicy.maximumRefreshInterval)
    )
    #expect(
      noData.nextRefreshDate
        == now.addingTimeInterval(WidgetProjectionPolicy.maximumRefreshInterval)
    )
  }

  @Test
  func scheduledProjectionUsesTodayAndRefreshesAtOpening() throws {
    let now = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let opensAt = now.addingTimeInterval(3_600)
    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(
        try projection(
          lifecycle: .scheduled,
          opensAt: opensAt,
          dueAt: now.addingTimeInterval(86_400),
          generatedAt: now,
          validUntil: now.addingTimeInterval(172_800)
        )
      ),
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.state == .scheduled)
    #expect(presentation.copy.status == "Scheduled")
    #expect(presentation.copy.title == "Return activity scheduled")
    #expect(presentation.copy.detail == "Open FORGE to view Today")
    #expect(
      presentation.copy.accessibilityLabel
        == "FORGE. Return activity is scheduled. Open FORGE."
    )
    #expect(
      presentation.copy.accessibilityHint == "Opens the local FORGE Today view."
    )
    #expect(presentation.symbol == "calendar")
    #expect(presentation.route.url.absoluteString == "forge://today")
    #expect(presentation.nextRefreshDate == opensAt)
  }

  @Test
  func openProjectionUsesFocusAndGenericCopy() throws {
    let now = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(
        try projection(
          lifecycle: .open,
          opensAt: now.addingTimeInterval(-3_600),
          dueAt: now.addingTimeInterval(86_400),
          generatedAt: now.addingTimeInterval(-1_800),
          validUntil: now.addingTimeInterval(172_800)
        )
      ),
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.state == .open)
    #expect(presentation.copy.status == "Open")
    #expect(presentation.copy.title == "Return activity open")
    #expect(presentation.copy.detail == "Open FORGE to continue")
    #expect(
      presentation.copy.accessibilityLabel
        == "FORGE. Return activity is open. Open FORGE."
    )
    #expect(
      presentation.copy.accessibilityHint == "Opens the local FORGE focus view."
    )
    #expect(presentation.symbol == "arrow.right.circle")
    #expect(presentation.route.url.absoluteString == "forge://focus")
  }

  @Test
  func dueProjectionUsesFocusOnTheLocalDueDay() throws {
    let now = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let dueAt = now.addingTimeInterval(3_600)
    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(
        try projection(
          lifecycle: .open,
          opensAt: now.addingTimeInterval(-3_600),
          dueAt: dueAt,
          generatedAt: now.addingTimeInterval(-1_800),
          validUntil: now.addingTimeInterval(86_400)
        )
      ),
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.state == .due)
    #expect(presentation.copy.status == "Due today")
    #expect(presentation.copy.title == "Return activity due today")
    #expect(presentation.copy.detail == "Open FORGE to continue")
    #expect(
      presentation.copy.accessibilityLabel
        == "FORGE. Return activity is due today. Open FORGE."
    )
    #expect(
      presentation.copy.accessibilityHint == "Opens the local FORGE focus view."
    )
    #expect(presentation.symbol == "exclamationmark.circle")
    #expect(presentation.route.url.absoluteString == "forge://focus")
    #expect(presentation.nextRefreshDate == dueAt)
  }

  @Test
  func localCalendarChangesOpenToDueAtTheLocalDayBoundary() throws {
    let timeZone = try #require(TimeZone(identifier: "Asia/Kolkata"))
    var localCalendar = Calendar(identifier: .gregorian)
    localCalendar.timeZone = timeZone
    let opensAt = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let beforeDueDay = try utcDate(
      year: 2026,
      month: 8,
      day: 2,
      hour: 17,
      minute: 30
    )
    let dueAt = try utcDate(
      year: 2026,
      month: 8,
      day: 2,
      hour: 19,
      minute: 30
    )
    let onLocalDueDay = try utcDate(
      year: 2026,
      month: 8,
      day: 2,
      hour: 19
    )
    let returnProjection = try projection(
      lifecycle: .open,
      opensAt: opensAt,
      dueAt: dueAt,
      generatedAt: beforeDueDay,
      validUntil: dueAt.addingTimeInterval(86_400)
    )

    let openPresentation = WidgetProjectionPolicy.presentation(
      for: .projection(returnProjection),
      now: beforeDueDay,
      calendar: localCalendar
    )
    let duePresentation = WidgetProjectionPolicy.presentation(
      for: .projection(returnProjection),
      now: onLocalDueDay,
      calendar: localCalendar
    )

    #expect(utcCalendar().isDate(dueAt, inSameDayAs: beforeDueDay))
    #expect(!localCalendar.isDate(dueAt, inSameDayAs: beforeDueDay))
    #expect(openPresentation.state == .open)
    #expect(
      openPresentation.nextRefreshDate
        == localCalendar.startOfDay(for: dueAt)
    )
    #expect(duePresentation.state == .due)
    #expect(duePresentation.route.url.absoluteString == "forge://focus")
  }

  @Test(
    "The due boundary expires only after dueAt",
    arguments: [
      (0.0, WidgetProjectionPolicy.State.due),
      (1.0, WidgetProjectionPolicy.State.expired),
    ]
  )
  func dueBoundary(
    nowOffset: TimeInterval,
    expectedState: WidgetProjectionPolicy.State
  ) throws {
    let dueAt = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(
        try projection(
          lifecycle: .due,
          opensAt: dueAt.addingTimeInterval(-3_600),
          dueAt: dueAt,
          generatedAt: dueAt,
          validUntil: dueAt.addingTimeInterval(86_400)
        )
      ),
      now: dueAt.addingTimeInterval(nowOffset),
      calendar: utcCalendar()
    )

    #expect(presentation.state == expectedState)
  }

  @Test
  func nowEqualDueAtKeepsDueStateAndSchedulesAFutureRefresh() throws {
    let dueAt = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(
        try projection(
          lifecycle: .due,
          opensAt: dueAt.addingTimeInterval(-3_600),
          dueAt: dueAt,
          generatedAt: dueAt,
          validUntil: dueAt.addingTimeInterval(86_400)
        )
      ),
      now: dueAt,
      calendar: utcCalendar()
    )

    #expect(presentation.state == .due)
    #expect(presentation.nextRefreshDate > dueAt)
    #expect(
      presentation.nextRefreshDate
        == dueAt.addingTimeInterval(WidgetProjectionPolicy.maximumRefreshInterval)
    )
  }

  @Test
  func expiredProjectionUsesTodayAndClosedWindowCopy() throws {
    let now = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let dueAt = now.addingTimeInterval(-1)
    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(
        try projection(
          lifecycle: .due,
          opensAt: now.addingTimeInterval(-3_600),
          dueAt: dueAt,
          generatedAt: dueAt,
          validUntil: now.addingTimeInterval(3_600)
        )
      ),
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.state == .expired)
    #expect(presentation.copy.status == "Window closed")
    #expect(presentation.copy.title == "Return window closed")
    #expect(presentation.copy.detail == "Open FORGE to view Today")
    #expect(
      presentation.copy.accessibilityLabel
        == "FORGE. Return window is closed. Open FORGE."
    )
    #expect(
      presentation.copy.accessibilityHint == "Opens the local FORGE Today view."
    )
    #expect(presentation.route.url.absoluteString == "forge://today")
    #expect(presentation.nextRefreshDate == now.addingTimeInterval(3_600))
  }

  @Test
  func staleProjectionUsesTodayAndRefreshCopy() throws {
    let now = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(
        try projection(
          lifecycle: .scheduled,
          opensAt: now.addingTimeInterval(3_600),
          dueAt: now.addingTimeInterval(86_400),
          generatedAt: now.addingTimeInterval(-2),
          validUntil: now.addingTimeInterval(-1)
        )
      ),
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.state == .stale)
    #expect(presentation.copy.status == "Refresh needed")
    #expect(presentation.copy.title == "Widget data expired")
    #expect(presentation.copy.detail == "Open FORGE to refresh")
    #expect(
      presentation.copy.accessibilityLabel
        == "FORGE. Widget data is stale. Open FORGE to refresh."
    )
    #expect(
      presentation.copy.accessibilityHint == "Opens the local FORGE Today view."
    )
    #expect(presentation.route.url.absoluteString == "forge://today")
    #expect(
      presentation.nextRefreshDate
        == now.addingTimeInterval(WidgetProjectionPolicy.maximumRefreshInterval)
    )
  }

  @Test
  func nowEqualValidUntilUsesStaleState() throws {
    let now = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(
        try projection(
          lifecycle: .scheduled,
          opensAt: now.addingTimeInterval(3_600),
          dueAt: now.addingTimeInterval(86_400),
          generatedAt: now.addingTimeInterval(-1),
          validUntil: now
        )
      ),
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.state == .stale)
    #expect(presentation.nextRefreshDate > now)
  }

  @Test
  func validUntilBoundsScheduledRefreshes() throws {
    let now = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let validUntil = now.addingTimeInterval(1_800)
    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(
        try projection(
          lifecycle: .scheduled,
          opensAt: now.addingTimeInterval(7_200),
          dueAt: now.addingTimeInterval(86_400),
          generatedAt: now,
          validUntil: validUntil
        )
      ),
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.state == .scheduled)
    #expect(presentation.nextRefreshDate == validUntil)
  }

  @Test
  func sixHourRefreshCapBoundsFutureStateChanges() throws {
    let now = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(
        try projection(
          lifecycle: .scheduled,
          opensAt: now.addingTimeInterval(86_400),
          dueAt: now.addingTimeInterval(172_800),
          generatedAt: now,
          validUntil: now.addingTimeInterval(259_200)
        )
      ),
      now: now,
      calendar: utcCalendar()
    )

    #expect(
      presentation.nextRefreshDate
        == now.addingTimeInterval(WidgetProjectionPolicy.maximumRefreshInterval)
    )
  }

  @Test
  func everyPresentationSchedulesARefreshAfterNow() throws {
    let now = try utcDate(year: 2026, month: 8, day: 2, hour: 12)
    let inputs: [WidgetProjectionPolicy.Input] = [
      .unavailableStore,
      .noData,
      .corruptData,
      .projection(
        try projection(
          lifecycle: .scheduled,
          opensAt: now.addingTimeInterval(3_600),
          dueAt: now.addingTimeInterval(86_400),
          generatedAt: now,
          validUntil: now.addingTimeInterval(172_800)
        )
      ),
      .projection(
        try projection(
          lifecycle: .open,
          opensAt: now.addingTimeInterval(-3_600),
          dueAt: now.addingTimeInterval(86_400),
          generatedAt: now.addingTimeInterval(-1),
          validUntil: now.addingTimeInterval(172_800)
        )
      ),
      .projection(
        try projection(
          lifecycle: .due,
          opensAt: now.addingTimeInterval(-3_600),
          dueAt: now,
          generatedAt: now,
          validUntil: now.addingTimeInterval(86_400)
        )
      ),
      .projection(
        try projection(
          lifecycle: .due,
          opensAt: now.addingTimeInterval(-7_200),
          dueAt: now.addingTimeInterval(-3_600),
          generatedAt: now.addingTimeInterval(-3_600),
          validUntil: now.addingTimeInterval(3_600)
        )
      ),
      .projection(
        try projection(
          lifecycle: .scheduled,
          opensAt: now.addingTimeInterval(3_600),
          dueAt: now.addingTimeInterval(86_400),
          generatedAt: now.addingTimeInterval(-2),
          validUntil: now.addingTimeInterval(-1)
        )
      ),
    ]

    for input in inputs {
      let presentation = WidgetProjectionPolicy.presentation(
        for: input,
        now: now,
        calendar: utcCalendar()
      )

      #expect(presentation.nextRefreshDate > now)
    }
  }

  private func projection(
    lifecycle: ForgeReturnProjectionLifecycle,
    opensAt: Date,
    dueAt: Date,
    generatedAt: Date,
    validUntil: Date
  ) throws -> ForgeReturnProjection {
    try ForgeReturnProjection(
      lifecycle: lifecycle,
      opensAt: opensAt,
      dueAt: dueAt,
      generatedAt: generatedAt,
      validUntil: validUntil
    )
  }

  private func utcCalendar() -> Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(secondsFromGMT: 0)!
    return calendar
  }

  private func utcDate(
    year: Int,
    month: Int,
    day: Int,
    hour: Int,
    minute: Int = 0
  ) throws -> Date {
    try #require(
      utcCalendar().date(
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
}
