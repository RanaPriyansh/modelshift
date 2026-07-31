import ForgeCore
import SwiftUI

struct PathView: View {
  @Environment(AppModel.self) private var model

  var body: some View {
    List {
      Section("Goal") {
        Text(model.snapshot.goal)
          .font(.title2.weight(.bold))
          .privacySensitive()
          .accessibilityAddTraits(.isHeader)
      }

      Section {
        ForEach(model.snapshot.milestones) { milestone in
          MilestoneRow(milestone: milestone)
        }
      } header: {
        Text("Reviewed path")
      } footer: {
        Text("A completed milestone records progress. It does not prove retention.")
      }

      Section("Path boundary") {
        Label(
          "The learner can review or replace this path. AI does not activate it.",
          systemImage: "person.crop.circle.badge.checkmark"
        )

        Label(
          "This build stores the path on this device. Path changes do not create evidence.",
          systemImage: "lock"
        )
      }
    }
    .navigationTitle("Path")
    .toolbar {
      SettingsToolbar()
    }
  }
}

private struct MilestoneRow: View {
  let milestone: ForgeMilestone

  var body: some View {
    HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
      Image(systemName: milestone.state.symbolName)
        .font(.title3)
        .foregroundStyle(milestone.state.tint)
        .frame(width: 28)
        .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        Text(milestone.title)
          .font(.headline)

        Text(milestone.state.label)
          .font(.subheadline)
          .fontWeight(.semibold)
          .foregroundStyle(milestone.state.tint)

        Text(milestone.detail)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
    }
    .privacySensitive()
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(milestone.title)
    .accessibilityValue("\(milestone.state.label). \(milestone.detail)")
  }
}

extension ForgeMilestone.State {
  fileprivate var label: String {
    switch self {
    case .complete:
      "Complete"
    case .active:
      "Active"
    case .next:
      "Next"
    case .reviewGap:
      "Needs review"
    }
  }

  fileprivate var symbolName: String {
    switch self {
    case .complete:
      "checkmark.circle.fill"
    case .active:
      "circle.inset.filled"
    case .next:
      "circle"
    case .reviewGap:
      "exclamationmark.triangle"
    }
  }

  fileprivate var tint: Color {
    switch self {
    case .complete:
      .green
    case .active:
      .accentColor
    case .next:
      .secondary
    case .reviewGap:
      .orange
    }
  }
}

#Preview {
  NavigationStack {
    PathView()
  }
  .environment(AppModel.preview())
}

#Preview("Path — Large Type") {
  NavigationStack {
    PathView()
  }
  .environment(AppModel.preview())
  .environment(\.dynamicTypeSize, .accessibility2)
}
