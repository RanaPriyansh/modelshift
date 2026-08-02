import Foundation

public enum WidgetProjectionPolicy: Sendable {
  public static let maximumRefreshInterval: TimeInterval = 6 * 60 * 60
  public static let transientRetryInterval: TimeInterval = 60

  public enum Input: Sendable, Equatable {
    case unavailableStore
    case transientlyUnavailableStore
    case noData
    case corruptData
    case projection(ForgeReturnProjection)
  }

  public enum State: Sendable, Equatable {
    case unavailableStore
    case noData
    case corruptData
    case scheduled
    case open
    case due
    case expired
    case stale
  }

  public enum Route: String, Sendable, Equatable {
    case today = "forge://today"
    case focus = "forge://focus"

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
    public let nextRefreshDate: Date

    public init(
      state: State,
      copy: Copy,
      symbol: String,
      route: Route,
      nextRefreshDate: Date
    ) {
      self.state = state
      self.copy = copy
      self.symbol = symbol
      self.route = route
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
      return makePresentation(
        state: .unavailableStore,
        nextRefreshDate: refreshCap
      )
    case .transientlyUnavailableStore:
      return makePresentation(
        state: .unavailableStore,
        nextRefreshDate: now.addingTimeInterval(transientRetryInterval)
      )
    case .noData:
      return makePresentation(state: .noData, nextRefreshDate: refreshCap)
    case .corruptData:
      return makePresentation(state: .corruptData, nextRefreshDate: refreshCap)
    case .projection(let projection):
      return returnPresentation(
        for: projection,
        now: now,
        calendar: calendar,
        refreshCap: refreshCap
      )
    }
  }

  private static func returnPresentation(
    for projection: ForgeReturnProjection,
    now: Date,
    calendar: Calendar,
    refreshCap: Date
  ) -> Presentation {
    if now >= projection.validUntil {
      return makePresentation(state: .stale, nextRefreshDate: refreshCap)
    }

    let state: State
    let boundaries: [Date]

    if now < projection.opensAt {
      state = .scheduled
      boundaries = [projection.opensAt, projection.validUntil]
    } else if now > projection.dueAt {
      state = .expired
      boundaries = [projection.validUntil]
    } else if calendar.isDate(projection.dueAt, inSameDayAs: now) {
      state = .due
      boundaries = [projection.dueAt, projection.validUntil]
    } else {
      state = .open
      boundaries = [
        calendar.startOfDay(for: projection.dueAt),
        projection.validUntil,
      ]
    }

    return makePresentation(
      state: state,
      nextRefreshDate: nextRefreshDate(
        now: now,
        refreshCap: refreshCap,
        boundaries: boundaries
      )
    )
  }

  private static func nextRefreshDate(
    now: Date,
    refreshCap: Date,
    boundaries: [Date]
  ) -> Date {
    boundaries.reduce(refreshCap) { nextRefreshDate, boundary in
      guard boundary > now else {
        return nextRefreshDate
      }
      return min(nextRefreshDate, boundary)
    }
  }

  private static func makePresentation(
    state: State,
    nextRefreshDate: Date
  ) -> Presentation {
    switch state {
    case .unavailableStore:
      return Presentation(
        state: state,
        copy: Copy(
          status: "Unavailable",
          title: "Widget data unavailable",
          detail: "Open FORGE to view Today",
          accessibilityLabel: "FORGE. Widget data is unavailable. Open FORGE.",
          accessibilityHint: "Opens the local FORGE Today view."
        ),
        symbol: "xmark.circle",
        route: .today,
        nextRefreshDate: nextRefreshDate
      )
    case .noData:
      return Presentation(
        state: state,
        copy: Copy(
          status: "No data",
          title: "No delayed return",
          detail: "Open FORGE to view Today",
          accessibilityLabel: "FORGE. No delayed return is shown. Open FORGE.",
          accessibilityHint: "Opens the local FORGE Today view."
        ),
        symbol: "minus.circle",
        route: .today,
        nextRefreshDate: nextRefreshDate
      )
    case .corruptData:
      return Presentation(
        state: state,
        copy: Copy(
          status: "Corrupt data",
          title: "Return data unreadable",
          detail: "Open FORGE to view Today",
          accessibilityLabel: "FORGE. Return data cannot be read. Open FORGE.",
          accessibilityHint: "Opens the local FORGE Today view."
        ),
        symbol: "exclamationmark.octagon",
        route: .today,
        nextRefreshDate: nextRefreshDate
      )
    case .scheduled:
      return Presentation(
        state: state,
        copy: Copy(
          status: "Scheduled",
          title: "Return activity scheduled",
          detail: "Open FORGE to view Today",
          accessibilityLabel: "FORGE. Return activity is scheduled. Open FORGE.",
          accessibilityHint: "Opens the local FORGE Today view."
        ),
        symbol: "calendar",
        route: .today,
        nextRefreshDate: nextRefreshDate
      )
    case .open:
      return Presentation(
        state: state,
        copy: Copy(
          status: "Open",
          title: "Return activity open",
          detail: "Open FORGE to continue",
          accessibilityLabel: "FORGE. Return activity is open. Open FORGE.",
          accessibilityHint: "Opens the local FORGE focus view."
        ),
        symbol: "arrow.right.circle",
        route: .focus,
        nextRefreshDate: nextRefreshDate
      )
    case .due:
      return Presentation(
        state: state,
        copy: Copy(
          status: "Due today",
          title: "Return activity due today",
          detail: "Open FORGE to continue",
          accessibilityLabel: "FORGE. Return activity is due today. Open FORGE.",
          accessibilityHint: "Opens the local FORGE focus view."
        ),
        symbol: "exclamationmark.circle",
        route: .focus,
        nextRefreshDate: nextRefreshDate
      )
    case .expired:
      return Presentation(
        state: state,
        copy: Copy(
          status: "Window closed",
          title: "Return window closed",
          detail: "Open FORGE to view Today",
          accessibilityLabel: "FORGE. Return window is closed. Open FORGE.",
          accessibilityHint: "Opens the local FORGE Today view."
        ),
        symbol: "xmark.circle",
        route: .today,
        nextRefreshDate: nextRefreshDate
      )
    case .stale:
      return Presentation(
        state: state,
        copy: Copy(
          status: "Refresh needed",
          title: "Widget data expired",
          detail: "Open FORGE to refresh",
          accessibilityLabel: "FORGE. Widget data is stale. Open FORGE to refresh.",
          accessibilityHint: "Opens the local FORGE Today view."
        ),
        symbol: "arrow.clockwise.circle",
        route: .today,
        nextRefreshDate: nextRefreshDate
      )
    }
  }
}
