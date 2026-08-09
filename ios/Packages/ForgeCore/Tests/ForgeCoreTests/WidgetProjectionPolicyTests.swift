import Foundation
import Testing

@testable import ForgeCore

struct WidgetProjectionPolicyTests {
  @Test(
    "Fallback states open Today",
    arguments: [
      WidgetProjectionPolicy.Input.unavailableStore,
      .noData,
      .corruptData,
    ]
  )
  func fallbackStatesOpenToday(
    input: WidgetProjectionPolicy.Input
  ) {
    let now = Date(timeIntervalSinceReferenceDate: 100)
    let presentation = WidgetProjectionPolicy.presentation(
      for: input,
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.route == .today)
    #expect(
      presentation.nextRefreshDate
        == now.addingTimeInterval(
          WidgetProjectionPolicy.maximumRefreshInterval
        )
    )
  }

  @Test("A transient store failure retries after one minute")
  func transientFailureUsesShortRetry() {
    let now = Date(timeIntervalSinceReferenceDate: 100)
    let presentation = WidgetProjectionPolicy.presentation(
      for: .transientlyUnavailableStore,
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.state == .unavailableStore)
    #expect(
      presentation.nextRefreshDate
        == now.addingTimeInterval(
          WidgetProjectionPolicy.transientRetryInterval
        )
    )
  }

  @Test("Needs review opens Semester with generic copy")
  func needsReviewPresentation() throws {
    let now = Date(timeIntervalSinceReferenceDate: 100)
    let projection = try SharedStoreTestSupport.projection(
      status: .needsReview,
      dueAt: nil,
      generatedAt: now,
      validUntil: now.addingTimeInterval(3_600)
    )

    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(projection),
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.state == .needsReview)
    #expect(presentation.route == .semester)
    #expect(presentation.copy.status == "Needs review")
    #expect(presentation.copy.title == "Check your semester")
    #expect(presentation.copy.detail == "See what changed in Semester")
    #expect(presentation.dueAt == nil)
  }

  @Test("Ready work opens Today with generic copy")
  func readyToWorkPresentation() throws {
    let now = Date(timeIntervalSinceReferenceDate: 100)
    let projection = try SharedStoreTestSupport.projection(
      status: .readyToWork,
      dueAt: nil,
      generatedAt: now,
      validUntil: now.addingTimeInterval(3_600)
    )

    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(projection),
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.state == .readyToWork)
    #expect(presentation.route == .today)
    #expect(presentation.copy.status == "Ready to work on")
    #expect(presentation.copy.title == "Your next action is ready")
    #expect(presentation.copy.detail == "Open Today to begin")
    #expect(presentation.dueAt == nil)
  }

  @Test("Come back uses the due date as the next boundary")
  func comeBackPresentation() throws {
    let now = Date(timeIntervalSinceReferenceDate: 100)
    let dueAt = now.addingTimeInterval(1_800)
    let projection = try SharedStoreTestSupport.projection(
      status: .comeBack,
      dueAt: dueAt,
      generatedAt: now,
      validUntil: now.addingTimeInterval(3_600)
    )

    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(projection),
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.state == .comeBack)
    #expect(presentation.route == .today)
    #expect(presentation.copy.status == "Come back on this date")
    #expect(presentation.copy.title == "Return to your work")
    #expect(presentation.dueAt == dueAt)
    #expect(presentation.nextRefreshDate == dueAt)
  }

  @Test("A projection becomes stale at its validity boundary")
  func staleProjection() throws {
    let generatedAt = Date(timeIntervalSinceReferenceDate: 100)
    let validUntil = generatedAt.addingTimeInterval(3_600)
    let projection = try SharedStoreTestSupport.projection(
      status: .readyToWork,
      dueAt: nil,
      generatedAt: generatedAt,
      validUntil: validUntil
    )

    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(projection),
      now: validUntil,
      calendar: utcCalendar()
    )

    #expect(presentation.state == .stale)
    #expect(presentation.route == .today)
  }

  @Test("The validity boundary wins before the six-hour cap")
  func validityBoundaryWins() throws {
    let now = Date(timeIntervalSinceReferenceDate: 100)
    let validUntil = now.addingTimeInterval(600)
    let projection = try SharedStoreTestSupport.projection(
      status: .readyToWork,
      dueAt: nil,
      generatedAt: now,
      validUntil: validUntil
    )

    let presentation = WidgetProjectionPolicy.presentation(
      for: .projection(projection),
      now: now,
      calendar: utcCalendar()
    )

    #expect(presentation.nextRefreshDate == validUntil)
  }

  @Test("Widget copy excludes protected study and source detail vocabulary")
  func presentationCopyExcludesPrivateVocabulary() throws {
    let now = Date(timeIntervalSinceReferenceDate: 100)
    let inputs: [WidgetProjectionPolicy.Input] = [
      .projection(
        try SharedStoreTestSupport.projection(
          status: .needsReview,
          dueAt: nil,
          generatedAt: now,
          validUntil: now.addingTimeInterval(600)
        )
      ),
      .projection(
        try SharedStoreTestSupport.projection(
          status: .readyToWork,
          dueAt: nil,
          generatedAt: now,
          validUntil: now.addingTimeInterval(600)
        )
      ),
    ]

    for input in inputs {
      let presentation = WidgetProjectionPolicy.presentation(
        for: input,
        now: now,
        calendar: utcCalendar()
      )
      let copy = [
        presentation.copy.status,
        presentation.copy.title,
        presentation.copy.detail,
        presentation.copy.accessibilityLabel,
        presentation.copy.accessibilityHint,
      ].joined(separator: " ").lowercased()
      for forbidden in [
        "practice text",
        "proof text",
        "answer",
        "course",
        "plan item",
        "activity",
        "source label",
        "conflict detail",
        "learner state",
        "evidence",
        "response",
        "selected choice",
      ] {
        #expect(!copy.contains(forbidden))
      }
    }
  }

  @Test("All widget routes are canonical v2 routes")
  func v2Routes() {
    #expect(WidgetProjectionPolicy.Route.today.url.absoluteString == "forge://today")
    #expect(
      WidgetProjectionPolicy.Route.semester.url.absoluteString
        == "forge://semester"
    )
    #expect(
      WidgetProjectionPolicy.Route.progress.url.absoluteString
        == "forge://progress"
    )
    #expect(
      WidgetProjectionPolicy.Route.settings.url.absoluteString
        == "forge://settings"
    )
  }

  private func utcCalendar() -> Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(secondsFromGMT: 0)!
    return calendar
  }
}
