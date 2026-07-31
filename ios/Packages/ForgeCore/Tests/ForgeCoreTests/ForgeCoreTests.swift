import Foundation
import Testing

@testable import ForgeCore

struct ForgeCoreTests {
  @Test
  func onboardingRequiresMeaningfulGoalAndGrownUpForChildMode() {
    var draft = OnboardingDraft(
      goal: "Learn AI",
      mode: .childWithAdult,
      availableMinutes: 25,
      grownUpPresent: false
    )

    #expect(!draft.isReady)

    draft.grownUpPresent = true
    #expect(draft.isReady)
    #expect(draft.normalizedGoal == "Learn AI")
  }

  @Test(
    arguments: [
      ("forge://today", ForgeDestination.today),
      ("forge://path", ForgeDestination.path),
      ("forge://evidence", ForgeDestination.evidence),
      ("https://example.com/app/returns", ForgeDestination.returns),
      ("https://example.com/app/study/session-1", ForgeDestination.focus),
    ]
  )
  func deepLinksResolveKnownRoutes(
    value: String,
    expected: ForgeDestination
  ) throws {
    let url = try #require(URL(string: value))
    #expect(ForgeDeepLink.destination(for: url) == expected)
  }

  @Test(
    arguments: [
      "forge://unknown",
      "forge:///unknown",
      "mailto:today@example.com",
      "ftp://example.com/app/today",
      "https://example.com/today",
      "https://example.com/app/today/extra",
    ]
  )
  func deepLinksRejectUnknownRoutesAndUnsupportedSchemes(value: String) throws {
    let url = try #require(URL(string: value))
    #expect(ForgeDeepLink.destination(for: url) == nil)
  }

  @Test
  func childReminderRequiresGrownUpManagement() {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let dueReturn = ForgeDueReturn(
      id: "return",
      dueAt: now.addingTimeInterval(3_600),
      status: "Not tested"
    )

    let scheduled = ReturnReminderPolicy.scheduledDate(
      for: dueReturn,
      now: now,
      mode: .childWithAdult,
      grownUpManaged: false,
      timeZone: TimeZone(secondsFromGMT: 0)!
    )

    #expect(scheduled == nil)
  }

  @Test
  func reminderMovesOutOfQuietHours() throws {
    let timeZone = try #require(TimeZone(secondsFromGMT: 0))
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone

    let now = try #require(
      calendar.date(
        from: DateComponents(
          year: 2027,
          month: 1,
          day: 1,
          hour: 12
        ))
    )
    let dueAt = try #require(
      calendar.date(
        from: DateComponents(
          year: 2027,
          month: 1,
          day: 2,
          hour: 22
        ))
    )

    let scheduled = ReturnReminderPolicy.scheduledDate(
      for: ForgeDueReturn(id: "return", dueAt: dueAt, status: "Not tested"),
      now: now,
      mode: .adult,
      grownUpManaged: false,
      timeZone: timeZone,
      calendar: calendar
    )

    let expected = try #require(
      calendar.date(
        from: DateComponents(
          year: 2027,
          month: 1,
          day: 3,
          hour: 9
        ))
    )
    #expect(scheduled == expected)
  }

  @Test(arguments: [0.0, -1.0])
  func reminderRejectsDueDatesThatAreNotInTheFuture(offset: TimeInterval) {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let scheduled = ReturnReminderPolicy.scheduledDate(
      for: ForgeDueReturn(
        id: "return",
        dueAt: now.addingTimeInterval(offset),
        status: "Not tested"
      ),
      now: now,
      mode: .adult,
      grownUpManaged: false,
      timeZone: TimeZone(secondsFromGMT: 0)!
    )

    #expect(scheduled == nil)
  }

  @Test(
    arguments: [
      (8, 59, 2, 9, 0),
      (9, 0, 2, 9, 0),
      (20, 59, 2, 20, 59),
      (21, 0, 3, 9, 0),
    ]
  )
  func reminderHonorsExactQuietHourBoundaries(
    dueHour: Int,
    dueMinute: Int,
    expectedDay: Int,
    expectedHour: Int,
    expectedMinute: Int
  ) throws {
    let timeZone = try #require(TimeZone(secondsFromGMT: 0))
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    let now = try #require(
      calendar.date(
        from: DateComponents(
          year: 2027,
          month: 1,
          day: 1,
          hour: 12
        ))
    )
    let dueAt = try #require(
      calendar.date(
        from: DateComponents(
          year: 2027,
          month: 1,
          day: 2,
          hour: dueHour,
          minute: dueMinute
        ))
    )
    let expected = try #require(
      calendar.date(
        from: DateComponents(
          year: 2027,
          month: 1,
          day: expectedDay,
          hour: expectedHour,
          minute: expectedMinute
        ))
    )

    let scheduled = ReturnReminderPolicy.scheduledDate(
      for: ForgeDueReturn(id: "return", dueAt: dueAt, status: "Not tested"),
      now: now,
      mode: .adult,
      grownUpManaged: false,
      timeZone: timeZone,
      calendar: calendar
    )

    #expect(scheduled == expected)
  }

  @Test
  func childReminderSchedulesWhenGrownUpManagesIt() {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let dueAt = now.addingTimeInterval(3_600)

    let scheduled = ReturnReminderPolicy.scheduledDate(
      for: ForgeDueReturn(id: "return", dueAt: dueAt, status: "Not tested"),
      now: now,
      mode: .childWithAdult,
      grownUpManaged: true,
      timeZone: TimeZone(secondsFromGMT: 0)!
    )

    #expect(scheduled == dueAt)
  }

  @Test
  func sharedStateRoundTripsAndConsumesRouteOnce() throws {
    let suiteName = "ForgeCoreTests.\(UUID().uuidString)"
    let defaults = try #require(UserDefaults(suiteName: suiteName))
    defer { defaults.removePersistentDomain(forName: suiteName) }

    let store = ForgeSharedStateStore(defaults: defaults)
    let snapshot = ForgeSnapshot.sample(
      now: Date(timeIntervalSince1970: 1_800_000_000)
    )

    try store.save(snapshot: snapshot)
    store.setPendingDestination(.focus)
    store.onboardingDismissed = true

    #expect(store.loadSnapshot() == snapshot)
    #expect(store.onboardingDismissed)
    #expect(store.consumePendingDestination() == .focus)
    #expect(store.consumePendingDestination() == nil)
  }

  @Test
  func clearAllRemovesOwnedStateAndPreservesUnrelatedDefaults() throws {
    let suiteName = "ForgeCoreTests.\(UUID().uuidString)"
    let defaults = try #require(UserDefaults(suiteName: suiteName))
    defer { defaults.removePersistentDomain(forName: suiteName) }

    let store = ForgeSharedStateStore(defaults: defaults)
    try store.save(
      snapshot: ForgeSnapshot.sample(
        now: Date(timeIntervalSince1970: 1_800_000_000)
      ))
    try store.save(
      onboarding: OnboardingDraft(
        goal: "Learn safely",
        mode: .teen,
        availableMinutes: 25
      ))
    store.setPendingDestination(.returns)
    store.onboardingDismissed = true
    store.remindersEnabled = true
    defaults.set("preserve", forKey: "unrelated")

    store.clearAll()

    #expect(store.loadSnapshot() == nil)
    #expect(store.loadOnboarding() == nil)
    #expect(store.consumePendingDestination() == nil)
    #expect(!store.onboardingDismissed)
    #expect(!store.remindersEnabled)
    #expect(defaults.string(forKey: "unrelated") == "preserve")
  }
}
