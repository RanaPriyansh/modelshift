import ForgeCore
import SwiftUI

struct TodayView: View {
  @Environment(AppModel.self) private var model
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @ScaledMetric(relativeTo: .body) private var bottomContentClearance: CGFloat = 88

  var body: some View {
    ScrollView {
      LazyVStack(alignment: .leading, spacing: ForgeDesign.Spacing.large) {
        goalHeader
        nextAction

        if let dueReturn = model.snapshot.dueReturn {
          dueReturnCard(dueReturn)
        }

        boundaryCard
        updatedAt
      }
      .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth, alignment: .leading)
      .padding(.horizontal, ForgeDesign.Spacing.regular)
      .padding(.vertical, ForgeDesign.Spacing.large)
      .frame(maxWidth: .infinity)
    }
    .contentMargins(.bottom, bottomContentClearance, for: .scrollContent)
    .background(ForgeDesign.canvas)
    .navigationTitle("Today")
    .toolbar {
      if dynamicTypeSize.isAccessibilitySize {
        ToolbarItem(placement: .topBarLeading) {
          Button {
            model.reviewOnboarding()
          } label: {
            Image(systemName: "arrow.triangle.branch")
          }
          .accessibilityLabel("Change direction")
          .accessibilityHint("Opens the local learning setup for review.")
          .accessibilityIdentifier("today.change-direction")
        }
      }

      SettingsToolbar()
    }
  }

  private var goalHeader: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      ViewThatFits(in: .horizontal) {
        HStack {
          activeGoalLabel
          Spacer()
          deviceOnlyLabel
        }

        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
          activeGoalLabel
          deviceOnlyLabel
        }
      }

      Text(model.snapshot.goal)
        .font(.title2.weight(.bold))
        .accessibilityAddTraits(.isHeader)
    }
  }

  private var activeGoalLabel: some View {
    Label("Active goal", systemImage: "scope")
      .font(.caption.weight(.semibold))
      .foregroundStyle(ForgeDesign.secondaryText)
      .textCase(.uppercase)
      .tracking(0.8)
  }

  private var deviceOnlyLabel: some View {
    Label("Device-only", systemImage: "lock.fill")
      .font(.caption)
      .foregroundStyle(ForgeDesign.secondaryText)
      .accessibilityElement(children: .combine)
  }

  private var nextAction: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      HStack(alignment: .firstTextBaseline) {
        Label("Next action", systemImage: "arrow.forward.circle.fill")
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(.tint)

        Spacer(minLength: ForgeDesign.Spacing.small)

        Text("\(model.snapshot.nextAction.durationMinutes) min")
          .font(.subheadline.weight(.medium))
          .foregroundStyle(ForgeDesign.secondaryText)
          .monospacedDigit()
      }

      Text(model.snapshot.nextAction.title)
        .font(.title2.weight(.semibold))
        .accessibilityAddTraits(.isHeader)

      Text(model.snapshot.nextAction.rationale)
        .font(.body)
        .foregroundStyle(ForgeDesign.secondaryText)

      Divider()

      Button {
        model.presentFocus()
      } label: {
        HStack {
          Text("Open focus preview")
          Spacer()
          Image(systemName: "arrow.right")
        }
        .frame(maxWidth: .infinity)
      }
      .buttonStyle(.borderedProminent)
      .tint(Color.accentColor)
      .controlSize(.large)
      .foregroundStyle(ForgeDesign.primaryActionForeground)
      .accessibilityHint("Opens a full-screen preview. It records no evidence.")
      .accessibilityIdentifier("today.open-focus")

      if !dynamicTypeSize.isAccessibilitySize {
        Button {
          model.reviewOnboarding()
        } label: {
          Label("Change direction", systemImage: "arrow.triangle.branch")
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(ForgeSecondaryButtonStyle())
        .accessibilityHint("Opens the local learning setup for review.")
        .accessibilityIdentifier("today.change-direction")
      }
    }
    .padding(ForgeDesign.Spacing.large)
    .background(ForgeDesign.raisedSurface)
    .clipShape(
      RoundedRectangle(cornerRadius: ForgeDesign.Radius.card, style: .continuous)
    )
    .overlay {
      RoundedRectangle(cornerRadius: ForgeDesign.Radius.card, style: .continuous)
        .stroke(ForgeDesign.hairline, lineWidth: 1)
    }
  }

  private func dueReturnCard(_ dueReturn: ForgeDueReturn) -> some View {
    Button {
      model.presentFocus()
    } label: {
      HStack(alignment: .top, spacing: ForgeDesign.Spacing.regular) {
        Image(systemName: "calendar.badge.clock")
          .font(.title3)
          .foregroundStyle(.tint)
          .frame(width: 44, height: 44)
          .background(ForgeDesign.accentWash, in: Circle())
          .accessibilityHidden(true)

        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
          Text("Review due return")
            .font(.headline)

          Text(dueReturn.dueAt, format: .dateTime.day().month().hour().minute())
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(Color.primary)
            .padding(.horizontal, ForgeDesign.Spacing.small)
            .padding(.vertical, ForgeDesign.Spacing.tight)
            .accessibilityIdentifier("today.return-date-visual")
            .accessibilityHidden(true)

          Text(dueReturn.status)
            .font(.footnote)
            .foregroundStyle(ForgeDesign.secondaryText)
            .accessibilityIdentifier("today.return-status-visual")
            .accessibilityHidden(true)
        }

        Spacer(minLength: ForgeDesign.Spacing.small)

        Image(systemName: "chevron.right")
          .font(.footnote.weight(.semibold))
          .foregroundStyle(.tertiary)
          .accessibilityHidden(true)
      }
      .padding(ForgeDesign.Spacing.regular)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .buttonStyle(.plain)
    .background(ForgeDesign.raisedSurface)
    .clipShape(
      RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
    )
    .accessibilityLabel("Review due return")
    .accessibilityValue(
      "Due \(dueReturn.dueAt.formatted(date: .long, time: .shortened)). \(dueReturn.status)"
    )
    .accessibilityHint("Opens the read-only focus preview.")
    .accessibilityIdentifier("today.open-return")
  }

  private var boundaryCard: some View {
    HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
      Image(systemName: "checkmark.seal.fill")
        .foregroundStyle(.tint)
        .accessibilityHidden(true)

      Text("FORGE proposes the next action. Only your accepted path gives it authority.")
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .accessibilityIdentifier("today.boundary-copy-visual")
    }
    .padding(ForgeDesign.Spacing.regular)
    .background(ForgeDesign.raisedSurface)
    .clipShape(
      RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
    )
    .accessibilityElement(children: .combine)
    .accessibilityLabel(
      "Path authority. FORGE proposes the next action. Your accepted path gives it authority."
    )
  }

  private var updatedAt: some View {
    Text(
      "Updated \(model.snapshot.updatedAt, format: .relative(presentation: .named))"
    )
    .font(.footnote)
    .foregroundStyle(ForgeDesign.secondaryText)
    .frame(maxWidth: .infinity, alignment: .trailing)
    .accessibilityIdentifier("today.updated-at-visual")
    .accessibilityLabel(
      "Updated \(model.snapshot.updatedAt.formatted(date: .long, time: .shortened))"
    )
  }
}

#Preview {
  NavigationStack {
    TodayView()
  }
  .environment(AppModel.preview())
}

#Preview("Today — Large Type") {
  NavigationStack {
    TodayView()
  }
  .environment(AppModel.preview())
  .environment(\.dynamicTypeSize, .accessibility2)
}
