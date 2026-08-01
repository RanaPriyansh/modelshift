import ForgeCore
import SwiftUI

struct PathView: View {
  @Environment(AppModel.self) private var model

  var body: some View {
    List {
      Section {
        Text(model.snapshot.goal)
          .font(.title2.weight(.bold))
          .privacySensitive()
          .accessibilityAddTraits(.isHeader)
      } header: {
        Text("Goal")
          .foregroundStyle(ForgeDesign.secondaryText)
      }

      Section {
        NextActionButton(nextAction: model.snapshot.nextAction) {
          model.presentFocus()
        }
      } header: {
        Text("Next action")
          .foregroundStyle(ForgeDesign.secondaryText)
      } footer: {
        Text(
          "The preview does not start work or record progress, proof, or evidence."
        )
        .foregroundStyle(ForgeDesign.secondaryText)
      }

      Section {
        ForEach(model.snapshot.milestones) { milestone in
          MilestoneRow(milestone: milestone)
        }
      } header: {
        Text("Path milestones")
          .foregroundStyle(ForgeDesign.secondaryText)
      } footer: {
        Text("Milestone status does not prove retention or create evidence.")
          .foregroundStyle(ForgeDesign.secondaryText)
      }

      Section {
        Label(
          "The learner can review or replace this path. AI does not activate it.",
          systemImage: "person.crop.circle.badge.checkmark"
        )

        Label(
          "This build stores the path on this device. Path changes do not create evidence.",
          systemImage: "lock"
        )
      } header: {
        Text("Path boundary")
          .foregroundStyle(ForgeDesign.secondaryText)
      }
    }
    .navigationTitle("Path")
    .toolbar {
      SettingsToolbar()
    }
  }
}

private struct NextActionButton: View {
  let nextAction: ForgeNextAction
  let action: () -> Void

  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  var body: some View {
    Button(action: action) {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
        Text("Read-only preview")
          .font(.caption.weight(.semibold))
          .foregroundStyle(ForgeDesign.secondaryText)
          .textCase(.uppercase)
          .tracking(0.8)

        actionMetadata

        Text(nextAction.title)
          .font(.title3.weight(.semibold))
          .fixedSize(horizontal: false, vertical: true)

        Text(nextAction.rationale)
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)

        Label(
          canOpenFocusPreview ? "Open focus preview" : "Focus preview unavailable",
          systemImage: canOpenFocusPreview
            ? "arrow.right.circle.fill"
            : "exclamationmark.triangle"
        )
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(
          canOpenFocusPreview ? Color.accentColor : ForgeDesign.secondaryText
        )
      }
      .padding(ForgeDesign.Spacing.regular)
      .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
      .contentShape(Rectangle())
      .background(
        ForgeDesign.accentWash,
        in: RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
      )
      .overlay {
        RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
          .stroke(ForgeDesign.hairline, lineWidth: 1)
      }
    }
    .buttonStyle(.plain)
    .disabled(!canOpenFocusPreview)
    .privacySensitive()
    .accessibilityLabel("Next action. \(nextAction.title)")
    .accessibilityValue(
      "\(nextAction.state.label). \(nextAction.durationMinutes) minutes. \(nextAction.rationale)"
    )
    .accessibilityHint(
      canOpenFocusPreview
        ? "Opens a full-screen read-only preview. It does not record progress or evidence."
        : "This preview is unavailable. It does not record progress or evidence."
    )
    .accessibilityIdentifier("path.open-focus")
  }

  @ViewBuilder
  private var actionMetadata: some View {
    if dynamicTypeSize.isAccessibilitySize {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        actionStateLabel
        durationLabel
      }
    } else {
      HStack(alignment: .firstTextBaseline) {
        actionStateLabel
        Spacer(minLength: ForgeDesign.Spacing.small)
        durationLabel
      }
    }
  }

  private var actionStateLabel: some View {
    Label(nextAction.state.label, systemImage: nextAction.state.symbolName)
      .font(.subheadline.weight(.semibold))
      .foregroundStyle(nextAction.state.tint)
  }

  private var durationLabel: some View {
    Text("\(nextAction.durationMinutes) min")
      .font(.subheadline.weight(.medium))
      .foregroundStyle(ForgeDesign.secondaryText)
      .monospacedDigit()
  }

  private var canOpenFocusPreview: Bool {
    nextAction.destination == .focus && nextAction.state != .unavailable
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
        if milestone.state == .active {
          Label("Current milestone", systemImage: "flag.fill")
            .font(.caption.weight(.semibold))
            .foregroundStyle(.tint)
            .accessibilityIdentifier("path.milestone-current-visual")
        }

        Text(milestone.title)
          .font(.headline)
          .accessibilityIdentifier("path.milestone-title-visual")

        Text(milestone.state.label)
          .font(.subheadline)
          .fontWeight(.semibold)
          .foregroundStyle(milestone.state.tint)
          .accessibilityIdentifier("path.milestone-state-visual")

        Text(milestone.detail)
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
          .accessibilityIdentifier("path.milestone-detail-visual")
      }
      .fixedSize(horizontal: false, vertical: true)
    }
    .privacySensitive()
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(
      milestone.state == .active
        ? "Current milestone. \(milestone.title)"
        : milestone.title
    )
    .accessibilityValue("\(milestone.state.label). \(milestone.detail)")
  }
}

extension ActionState {
  fileprivate var label: String {
    switch self {
    case .ready:
      "Ready"
    case .dueReturn:
      "Return due"
    case .unavailable:
      "Unavailable"
    }
  }

  fileprivate var symbolName: String {
    switch self {
    case .ready:
      "arrow.forward.circle.fill"
    case .dueReturn:
      "calendar.badge.clock"
    case .unavailable:
      "exclamationmark.triangle"
    }
  }

  fileprivate var tint: Color {
    switch self {
    case .ready:
      Color.accentColor
    case .dueReturn:
      ForgeDesign.warningText
    case .unavailable:
      ForgeDesign.secondaryText
    }
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
      ForgeDesign.successText
    case .active:
      Color.accentColor
    case .next:
      ForgeDesign.secondaryText
    case .reviewGap:
      ForgeDesign.warningText
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
