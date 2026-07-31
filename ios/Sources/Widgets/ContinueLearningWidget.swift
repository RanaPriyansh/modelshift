import SwiftUI
import WidgetKit

private let focusURL = URL(string: "forge://focus")!

private struct ContinueLearningEntry: TimelineEntry {
    let date: Date
}

private struct ContinueLearningProvider: TimelineProvider {
    func placeholder(in context: Context) -> ContinueLearningEntry {
        ContinueLearningEntry(date: .now)
    }

    func getSnapshot(
        in context: Context,
        completion: @escaping (ContinueLearningEntry) -> Void
    ) {
        completion(ContinueLearningEntry(date: .now))
    }

    func getTimeline(
        in context: Context,
        completion: @escaping (Timeline<ContinueLearningEntry>) -> Void
    ) {
        completion(
            Timeline(
                entries: [ContinueLearningEntry(date: .now)],
                policy: .never
            )
        )
    }
}

private struct ContinueLearningWidgetView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: "book.pages")
                .font(.title2)

            Spacer(minLength: 0)

            Text("Continue Learning")
                .font(.headline)
                .lineLimit(2)

            Text("Open FORGE")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(.fill.tertiary, for: .widget)
        .privacySensitive()
        .widgetURL(focusURL)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Continue Learning. Open FORGE.")
    }
}

@main
struct FORGEWidgets: Widget {
    private let kind = "com.forgelearning.app.continue-learning"

    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: ContinueLearningProvider()
        ) { _ in
            ContinueLearningWidgetView()
        }
        .configurationDisplayName("Continue Learning")
        .description("Open FORGE without showing learner details.")
        .supportedFamilies([.systemSmall])
    }
}
