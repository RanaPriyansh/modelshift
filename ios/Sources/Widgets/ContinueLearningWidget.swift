import ForgeCore
import Foundation
import SwiftUI
import WidgetKit

private enum ContinueLearningRoute {
  static let focus = URL(string: "forge://focus")
}

private enum ContinueLearningState {
  case placeholder
  case snapshot
  case delayedReturn
  case noData
  case corruptedData

  var accessibilityLabel: String {
    switch self {
    case .placeholder:
      "FORGE. Widget content is loading."
    case .snapshot:
      "FORGE. Widget preview."
    case .delayedReturn:
      "FORGE. A delayed return is available. Open FORGE."
    case .noData:
      "FORGE. No delayed return is available. Open FORGE."
    case .corruptedData:
      "FORGE. Delayed return is unavailable. Open FORGE."
    }
  }
}

private struct SharedSnapshotProbe: Decodable {
  struct DueReturn: Decodable {
    let dueAt: Date
  }

  let dueReturn: DueReturn?
}

private enum ContinueLearningSharedState {
  private static let snapshotKey = "forge.snapshot.v1"
  private static let maximumSnapshotByteCount = 64 * 1024

  static func load() -> ContinueLearningState {
    guard let defaults = UserDefaults(suiteName: ForgeSharedStateStore.appGroupIdentifier)
    else {
      return .noData
    }

    guard let snapshotData = defaults.data(forKey: snapshotKey) else {
      return .noData
    }

    guard snapshotData.count <= maximumSnapshotByteCount else {
      return .corruptedData
    }

    guard
      let snapshot = try? JSONDecoder().decode(
        SharedSnapshotProbe.self,
        from: snapshotData
      )
    else {
      return .corruptedData
    }

    guard let dueAt = snapshot.dueReturn?.dueAt else {
      return .noData
    }

    guard dueAt.timeIntervalSinceReferenceDate.isFinite else {
      return .corruptedData
    }

    return dueAt > .now ? .delayedReturn : .noData
  }
}

private struct ContinueLearningEntry: TimelineEntry {
  let date: Date
  let state: ContinueLearningState
}

private struct ContinueLearningProvider: TimelineProvider {
  func placeholder(in context: Context) -> ContinueLearningEntry {
    ContinueLearningEntry(date: .now, state: .placeholder)
  }

  func getSnapshot(
    in context: Context,
    completion: @escaping (ContinueLearningEntry) -> Void
  ) {
    completion(ContinueLearningEntry(date: .now, state: .snapshot))
  }

  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<ContinueLearningEntry>) -> Void
  ) {
    let entry = entry()
    let refreshDate = entry.date.addingTimeInterval(21_600)

    completion(
      Timeline(
        entries: [entry],
        policy: .after(refreshDate)
      )
    )
  }

  private func entry() -> ContinueLearningEntry {
    ContinueLearningEntry(
      date: .now,
      state: ContinueLearningSharedState.load()
    )
  }
}

private enum ForgeWidgetTerrain {
  static let ground = Color(red: 0.05, green: 0.12, blue: 0.10)
  static let ridge = Color(red: 0.08, green: 0.29, blue: 0.22)
  static let signal = Color(red: 0.94, green: 0.69, blue: 0.24)
  static let mist = Color(red: 0.94, green: 0.97, blue: 0.92)
  static let quietMist = Color(red: 0.76, green: 0.84, blue: 0.78)
}

private struct ContinueLearningWidgetView: View {
  let entry: ContinueLearningEntry

  var body: some View {
    stateContent
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .containerBackground(for: .widget) {
        LinearGradient(
          colors: [ForgeWidgetTerrain.ridge, ForgeWidgetTerrain.ground],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )
      }
      .privacySensitive()
      .widgetURL(ContinueLearningRoute.focus)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(entry.state.accessibilityLabel)
      .accessibilityHint("Opens the local FORGE focus view.")
  }

  @ViewBuilder
  private var stateContent: some View {
    switch entry.state {
    case .placeholder, .snapshot:
      widgetContent(detail: "Return review available")
        .redacted(reason: .placeholder)
    case .delayedReturn:
      widgetContent(detail: "Return review available")
    case .noData:
      widgetContent(detail: "No delayed return")
    case .corruptedData:
      widgetContent(detail: "Unavailable")
    }
  }

  private func widgetContent(detail: String) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 8) {
        Image(systemName: "mountain.2.fill")
          .font(.title3.weight(.semibold))
          .foregroundStyle(ForgeWidgetTerrain.signal)
          .accessibilityHidden(true)

        Text("FORGE")
          .font(.caption.weight(.bold))
          .tracking(1.2)
          .foregroundStyle(ForgeWidgetTerrain.mist)
          .lineLimit(1)
      }

      Spacer(minLength: 0)

      Text("Learning space")
        .font(.headline)
        .foregroundStyle(ForgeWidgetTerrain.mist)
        .lineLimit(2)

      Text(detail)
        .font(.caption)
        .foregroundStyle(ForgeWidgetTerrain.quietMist)
        .lineLimit(2)
    }
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
    .configurationDisplayName("Continue Learning")
    .description("Open FORGE without showing learner details.")
    .supportedFamilies([.systemSmall])
  }
}
