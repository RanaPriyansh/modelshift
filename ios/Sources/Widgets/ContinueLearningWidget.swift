import ForgeCore
import Foundation
import SwiftUI
import WidgetKit

private struct ContinueLearningWidgetPresentation {
  let copy: WidgetProjectionPolicy.Copy
  let symbol: String
  let route: URL?
  let accessibilityHint: String
  let nextRefreshDate: Date

  init(_ presentation: WidgetProjectionPolicy.Presentation) {
    copy = presentation.copy
    symbol = presentation.symbol
    route = Self.routeURL(for: presentation.route)
    accessibilityHint = presentation.copy.accessibilityHint
    nextRefreshDate = presentation.nextRefreshDate
  }

  init(
    copy: WidgetProjectionPolicy.Copy,
    symbol: String,
    nextRefreshDate: Date
  ) {
    self.copy = copy
    self.symbol = symbol
    route = Self.routeURL(for: .today)
    accessibilityHint = copy.accessibilityHint
    self.nextRefreshDate = nextRefreshDate
  }

  private static func routeURL(
    for route: WidgetProjectionPolicy.Route
  ) -> URL? {
    let closedRoute: WidgetProjectionPolicy.Route

    switch route {
    case .today:
      closedRoute = .today
    case .semester:
      closedRoute = .semester
    case .progress:
      closedRoute = .progress
    case .settings:
      closedRoute = .settings
    @unknown default:
      closedRoute = .today
    }

    return URL(string: closedRoute.rawValue)
      ?? URL(string: WidgetProjectionPolicy.Route.today.rawValue)
  }

  static func placeholder(at date: Date) -> Self {
    Self(
      copy: WidgetProjectionPolicy.Copy(
        status: "Loading",
        title: "FORGE Semester Desk",
        detail: "Loading local status",
        accessibilityLabel: "FORGE. Widget content is loading.",
        accessibilityHint: "Opens the local FORGE Today view."
      ),
      symbol: "circle.dotted",
      nextRefreshDate: date.addingTimeInterval(
        WidgetProjectionPolicy.maximumRefreshInterval
      )
    )
  }

  static func snapshot(at date: Date) -> Self {
    Self(
      copy: WidgetProjectionPolicy.Copy(
        status: "Preview",
        title: "FORGE Semester Desk",
        detail: "Local status is hidden",
        accessibilityLabel: "FORGE. Widget preview.",
        accessibilityHint: "Opens the local FORGE Today view."
      ),
      symbol: "eye",
      nextRefreshDate: date.addingTimeInterval(
        WidgetProjectionPolicy.maximumRefreshInterval
      )
    )
  }
}

private enum ContinueLearningSharedState {
  static func input() -> WidgetProjectionPolicy.Input {
    do {
      let reader = try ForgeSharedProjectionReader()
      guard let projection = try reader.readProjection() else {
        return .noData
      }

      return .projection(projection)
    } catch ForgeSharedStateStoreError.lockAcquisitionTimedOut {
      return .transientlyUnavailableStore
    } catch ForgeSharedStateStoreError.corruptProjection,
      ForgeSharedStateStoreError.oversizedProjection
    {
      return .corruptData
    } catch {
      return .unavailableStore
    }
  }
}

private struct ContinueLearningEntry: TimelineEntry {
  let date: Date
  let presentation: ContinueLearningWidgetPresentation
  let isRedacted: Bool
}

private struct ContinueLearningProvider: TimelineProvider {
  func placeholder(in context: Context) -> ContinueLearningEntry {
    let date = Date.now
    return ContinueLearningEntry(
      date: date,
      presentation: .placeholder(at: date),
      isRedacted: true
    )
  }

  func getSnapshot(
    in context: Context,
    completion: @escaping (ContinueLearningEntry) -> Void
  ) {
    let date = Date.now
    completion(
      ContinueLearningEntry(
        date: date,
        presentation: .snapshot(at: date),
        isRedacted: true
      )
    )
  }

  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<ContinueLearningEntry>) -> Void
  ) {
    let entry = entry()

    completion(
      Timeline(
        entries: [entry],
        policy: .after(entry.presentation.nextRefreshDate)
      )
    )
  }

  private func entry() -> ContinueLearningEntry {
    let date = Date.now
    let presentation = WidgetProjectionPolicy.presentation(
      for: ContinueLearningSharedState.input(),
      now: date,
      calendar: .autoupdatingCurrent
    )

    return ContinueLearningEntry(
      date: date,
      presentation: ContinueLearningWidgetPresentation(presentation),
      isRedacted: false
    )
  }
}

private enum ForgeWidgetTerrain {
  static let ground = Color(red: 0.05, green: 0.12, blue: 0.10)
  static let ridge = Color(red: 0.08, green: 0.29, blue: 0.22)
  static let signal = Color(red: 0.94, green: 0.69, blue: 0.24)
  static let mist = Color(red: 0.94, green: 0.97, blue: 0.92)
  static let quietMist = Color(red: 0.76, green: 0.84, blue: 0.78)
  static let markerFill = Color.white.opacity(0.10)
  static let markerBorder = Color.white.opacity(0.18)
}

private struct ContinueLearningWidgetView: View {
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  let entry: ContinueLearningEntry

  var body: some View {
    let presentation = entry.presentation

    stateContent(presentation)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .containerBackground(for: .widget) {
        LinearGradient(
          colors: [ForgeWidgetTerrain.ridge, ForgeWidgetTerrain.ground],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )
      }
      .privacySensitive()
      .dynamicTypeSize(.xSmall ... .accessibility5)
      .widgetURL(presentation.route)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(presentation.copy.accessibilityLabel)
      .accessibilityHint(presentation.accessibilityHint)
      .accessibilityAddTraits(.isButton)
  }

  @ViewBuilder
  private func stateContent(
    _ presentation: ContinueLearningWidgetPresentation
  ) -> some View {
    if entry.isRedacted {
      widgetContent(presentation)
        .redacted(reason: .placeholder)
    } else {
      widgetContent(presentation)
    }
  }

  private func widgetContent(
    _ presentation: ContinueLearningWidgetPresentation
  ) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 8) {
        Image(systemName: "mountain.2.fill")
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(ForgeWidgetTerrain.signal)
          .accessibilityHidden(true)

        Text("FORGE")
          .font(.caption2.weight(.bold))
          .tracking(1.2)
          .foregroundStyle(ForgeWidgetTerrain.mist)
          .lineLimit(1)

        Spacer(minLength: 0)

        Text("LOCAL")
          .font(.caption2.weight(.semibold))
          .tracking(0.8)
          .foregroundStyle(ForgeWidgetTerrain.quietMist)
          .lineLimit(1)
      }

      Spacer(minLength: 2)

      statusContent(presentation)
    }
  }

  @ViewBuilder
  private func statusContent(
    _ presentation: ContinueLearningWidgetPresentation
  ) -> some View {
    if dynamicTypeSize.isAccessibilitySize {
      VStack(alignment: .leading, spacing: 6) {
        statusMarker(for: presentation)

        copyContent(presentation)
      }
    } else {
      HStack(alignment: .top, spacing: 10) {
        statusMarker(for: presentation)

        copyContent(presentation)
      }
    }
  }

  private func copyContent(
    _ presentation: ContinueLearningWidgetPresentation
  ) -> some View {
    VStack(alignment: .leading, spacing: 3) {
      Text(presentation.copy.status)
        .font(.caption2.weight(.bold))
        .tracking(0.7)
        .foregroundStyle(ForgeWidgetTerrain.quietMist)
        .lineLimit(1)

      Text(presentation.copy.title)
        .font(.headline.weight(.semibold))
        .foregroundStyle(ForgeWidgetTerrain.mist)
        .lineLimit(2)

      Text(presentation.copy.detail)
        .font(.caption)
        .foregroundStyle(ForgeWidgetTerrain.quietMist)
        .lineLimit(2)
    }
  }

  private func statusMarker(
    for presentation: ContinueLearningWidgetPresentation
  ) -> some View {
    Image(systemName: presentation.symbol)
      .font(.body.weight(.semibold))
      .foregroundStyle(ForgeWidgetTerrain.signal)
      .frame(width: 32, height: 32)
      .background(
        ForgeWidgetTerrain.markerFill,
        in: RoundedRectangle(cornerRadius: 10, style: .continuous)
      )
      .overlay {
        RoundedRectangle(cornerRadius: 10, style: .continuous)
          .stroke(ForgeWidgetTerrain.markerBorder, lineWidth: 1)
      }
      .accessibilityHidden(true)
  }
}

@main
struct FORGEWidgets: Widget {
  private let kind = "com.forgelearning.app.continue-learning"

  var body: some WidgetConfiguration {
    StaticConfiguration(
      kind: kind,
      provider: ContinueLearningProvider()
    ) { entry in
      ContinueLearningWidgetView(entry: entry)
    }
    .configurationDisplayName("Semester Desk")
    .description("See the next safe Semester Desk action.")
    .supportedFamilies([.systemSmall])
  }
}
