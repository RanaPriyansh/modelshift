import Foundation

public enum WidgetProjectionPolicy: Sendable {
  public static let maximumRefreshInterval: TimeInterval = 6 * 60 * 60
  public static let transientRetryInterval: TimeInterval = 60

  public enum Input: Sendable, Equatable {
    case unavailableStore
    case transientlyUnavailableStore
    case noData
    case corruptData
    case projection(ForgeSemesterDeskProjection)
  }

  public enum State: Sendable, Equatable {
    case unavailableStore
    case noData
    case corruptData
    case needsReview
    case readyToWork
    case comeBack
    case stale
  }

  public enum Route: String, Sendable, Equatable {
    case today = "forge://today"
    case semester = "forge://semester"
    case progress = "forge://progress"
    case settings = "forge://settings"

    public var url: URL {
      URL(string: rawValue)!
    }
  }

  public struct Copy: Sendable, Equatable {
    public let status: String
    public let title: String
    public let detail: String
    public let accessibilityLabel: String
    public let accessibilityHint: String

    public init(
      status: String,
      title: String,
      detail: String,
      accessibilityLabel: String,
      accessibilityHint: String
    ) {
      self.status = status
      self.title = title
      self.detail = detail
      self.accessibilityLabel = accessibilityLabel
      self.accessibilityHint = accessibilityHint
    }
  }

  public struct Presentation: Sendable, Equatable {
    public let state: State
    public let copy: Copy
    public let symbol: String
    public let route: Route
    public let dueAt: Date?
    public let nextRefreshDate: Date

    public init(
      state: State,
      copy: Copy,
      symbol: String,
      route: Route,
      dueAt: Date?,
      nextRefreshDate: Date
    ) {
      self.state = state
      self.copy = copy
      self.symbol = symbol
      self.route = route
      self.dueAt = dueAt
      self.nextRefreshDate = nextRefreshDate
    }
  }

  public static func presentation(
    for input: Input,
    now: Date,
    calendar: Calendar
  ) -> Presentation {
    let refreshCap = now.addingTimeInterval(maximumRefreshInterval)

    switch input {
    case .unavailableStore:
      return makeFallback(
        state: .unavailableStore,
        nextRefreshDate: refreshCap
      )
    case .transientlyUnavailableStore:
      return makeFallback(
        state: .unavailableStore,
        nextRefreshDate: now.addingTimeInterval(transientRetryInterval)
      )
    case .noData:
      return makeFallback(state: .noData, nextRefreshDate: refreshCap)
    case .corruptData:
      return makeFallback(state: .corruptData, nextRefreshDate: refreshCap)
    case .projection(let projection):
      guard now < projection.validUntil else {
        return makeFallback(state: .stale, nextRefreshDate: refreshCap)
      }
      let nextRefreshDate = [
        projection.validUntil,
        projection.dueAt,
      ]
      .compactMap { $0 }
      .filter { $0 > now }
      .reduce(refreshCap, min)
      return makeProjectionPresentation(
        projection,
        calendar: calendar,
        nextRefreshDate: nextRefreshDate
      )
    }
  }

  private static func makeProjectionPresentation(
    _ projection: ForgeSemesterDeskProjection,
    calendar: Calendar,
    nextRefreshDate: Date
  ) -> Presentation {
    switch projection.status {
    case .needsReview:
      return Presentation(
        state: .needsReview,
        copy: Copy(
          status: "Needs review",
          title: "Check your semester",
          detail: "See what changed in Semester",
          accessibilityLabel:
            "FORGE. Your semester needs review. See what changed in Semester.",
          accessibilityHint: "Opens Semester."
        ),
        symbol: "exclamationmark.bubble",
        route: .semester,
        dueAt: nil,
        nextRefreshDate: nextRefreshDate
      )
    case .readyToWork:
      return Presentation(
        state: .readyToWork,
        copy: Copy(
          status: "Ready to work on",
          title: "Your next action is ready",
          detail: "Open Today to begin",
          accessibilityLabel:
            "FORGE. Your next action is ready.",
          accessibilityHint: "Opens Today."
        ),
        symbol: "arrow.right.circle",
        route: .today,
        dueAt: nil,
        nextRefreshDate: nextRefreshDate
      )
    case .comeBack:
      let dueText =
        projection.dueAt.map {
          displayDate($0, calendar: calendar)
        } ?? "the saved date"
      return Presentation(
        state: .comeBack,
        copy: Copy(
          status: "Come back on this date",
          title: "Return to your work",
          detail: dueText,
          accessibilityLabel:
            "FORGE. Return to your work on \(dueText).",
          accessibilityHint: "Opens Today."
        ),
        symbol: "calendar",
        route: .today,
        dueAt: projection.dueAt,
        nextRefreshDate: nextRefreshDate
      )
    }
  }

  private static func makeFallback(
    state: State,
    nextRefreshDate: Date
  ) -> Presentation {
    switch state {
    case .unavailableStore:
      return Presentation(
        state: state,
        copy: Copy(
          status: "Unavailable",
          title: "Widget data is unavailable",
          detail: "Open FORGE to view Today",
          accessibilityLabel: "FORGE. Widget data is unavailable.",
          accessibilityHint: "Opens Today."
        ),
        symbol: "xmark.circle",
        route: .today,
        dueAt: nil,
        nextRefreshDate: nextRefreshDate
      )
    case .noData:
      return Presentation(
        state: state,
        copy: Copy(
          status: "Today",
          title: "Open your Semester Desk",
          detail: "See the next honest action",
          accessibilityLabel: "FORGE. Open your Semester Desk.",
          accessibilityHint: "Opens Today."
        ),
        symbol: "sun.max",
        route: .today,
        dueAt: nil,
        nextRefreshDate: nextRefreshDate
      )
    case .corruptData:
      return Presentation(
        state: state,
        copy: Copy(
          status: "Needs review",
          title: "Widget data cannot be read",
          detail: "Open FORGE to check local data",
          accessibilityLabel: "FORGE. Widget data cannot be read.",
          accessibilityHint: "Opens Today."
        ),
        symbol: "exclamationmark.octagon",
        route: .today,
        dueAt: nil,
        nextRefreshDate: nextRefreshDate
      )
    case .stale:
      return Presentation(
        state: state,
        copy: Copy(
          status: "Needs review",
          title: "Open FORGE to refresh",
          detail: "Widget data is no longer current",
          accessibilityLabel: "FORGE. Widget data needs a refresh.",
          accessibilityHint: "Opens Today."
        ),
        symbol: "arrow.clockwise.circle",
        route: .today,
        dueAt: nil,
        nextRefreshDate: nextRefreshDate
      )
    case .needsReview, .readyToWork, .comeBack:
      preconditionFailure("Projection states need projection metadata.")
    }
  }

  private static func displayDate(_ date: Date, calendar: Calendar) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.calendar = calendar
    formatter.timeZone = calendar.timeZone
    formatter.dateStyle = .medium
    formatter.timeStyle = .short
    return formatter.string(from: date)
  }
}
