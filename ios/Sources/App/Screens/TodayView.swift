import ForgeCore
import SwiftUI

struct TodayView: View {
  @Environment(AppModel.self) private var model

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
    .background(ForgeDesign.canvas)
    .navigationTitle("Today")
    .toolbar {
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
      .foregroundStyle(.secondary)
      .textCase(.uppercase)
      .tracking(0.8)
  }

  private var deviceOnlyLabel: some View {
    Label("Device-only", systemImage: "lock.fill")
      .font(.caption)
      .foregroundStyle(.secondary)
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
          .foregroundStyle(.secondary)
          .monospacedDigit()
      }

      Text(model.snapshot.nextAction.title)
        .font(.title2.weight(.semibold))
        .accessibilityAddTraits(.isHeader)

      Text(model.snapshot.nextAction.rationale)
        .font(.body)
        .foregroundStyle(.secondary)

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
      .controlSize(.large)
      .accessibilityHint("Opens a full-screen preview. It records no evidence.")
      .accessibilityIdentifier("today.open-focus")
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
          Text("Delayed return")
            .font(.headline)

          Text(dueReturn.dueAt, format: .dateTime.day().month().hour().minute())
            .font(.subheadline)

          Text(dueReturn.status)
            .font(.footnote)
            .foregroundStyle(.secondary)
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
    .background(ForgeDesign.surface)
    .clipShape(
      RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
    )
    .accessibilityLabel(
      "Delayed return, \(dueReturn.status), due \(dueReturn.dueAt.formatted(date: .long, time: .shortened))"
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
        .foregroundStyle(.secondary)
    }
    .padding(ForgeDesign.Spacing.regular)
    .background(ForgeDesign.surface)
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
    .foregroundStyle(.secondary)
    .frame(maxWidth: .infinity, alignment: .trailing)
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
