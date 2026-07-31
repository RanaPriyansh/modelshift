import ForgeCore
import SwiftUI
import WidgetKit

private let focusURL = URL(string: "forge://focus")!

private struct ContinueLearningEntry: TimelineEntry {
  let date: Date
  let dueAt: Date?
}

private struct ContinueLearningProvider: TimelineProvider {
  func placeholder(in context: Context) -> ContinueLearningEntry {
    ContinueLearningEntry(
      date: .now,
      dueAt: Calendar.current.date(byAdding: .day, value: 2, to: .now)
    )
  }

  func getSnapshot(
    in context: Context,
    completion: @escaping (ContinueLearningEntry) -> Void
  ) {
    completion(entry())
  }

  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<ContinueLearningEntry>) -> Void
  ) {
    let entry = entry()
    let defaultRefresh =
      Calendar.current.date(byAdding: .hour, value: 6, to: entry.date)
      ?? entry.date.addingTimeInterval(21_600)
    let refreshDate = max(entry.dueAt ?? defaultRefresh, defaultRefresh)

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
      dueAt: ForgeSharedStateStore().loadSnapshot()?.dueReturn?.dueAt
    )
  }
}

private struct ContinueLearningWidgetView: View {
  let entry: ContinueLearningEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Image(systemName: "scope")
        .font(.title2)

      Spacer(minLength: 0)

      Text("Continue learning")
        .font(.headline)
        .lineLimit(2)

      if let dueAt = entry.dueAt {
        Text("Return \(dueAt, style: .relative)")
          .font(.caption)
          .foregroundStyle(.secondary)
      } else {
        Text("Open FORGE")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .containerBackground(.fill.tertiary, for: .widget)
    .privacySensitive()
    .widgetURL(focusURL)
    .accessibilityElement(children: .combine)
    .accessibilityLabel(accessibilityLabel)
  }

  private var accessibilityLabel: String {
    guard let dueAt = entry.dueAt else {
      return "Continue learning. Open FORGE."
    }

    return "Continue learning. Return \(dueAt.formatted(date: .long, time: .shortened))."
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
