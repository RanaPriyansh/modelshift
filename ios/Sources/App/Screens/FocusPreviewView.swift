import ForgeCore
import SwiftUI

struct FocusPreviewView: View {
  @Environment(\.dismiss) private var dismiss

  let snapshot: ForgeSnapshot

  @State private var isPaused = false
  @State private var showsSupport = false

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.large) {
          Label("Local preview only", systemImage: "eye")
            .font(.headline)
            .foregroundStyle(ForgeDesign.secondaryText)

          VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
            Text(snapshot.nextAction.title)
              .font(.title2.weight(.bold))
              .fixedSize(horizontal: false, vertical: true)
              .privacySensitive()
              .accessibilityAddTraits(.isHeader)

            Text(snapshot.nextAction.rationale)
              .font(.body)
              .foregroundStyle(ForgeDesign.secondaryText)
              .fixedSize(horizontal: false, vertical: true)
              .privacySensitive()

            Label(
              "Suggested time: \(snapshot.nextAction.durationMinutes) minutes",
              systemImage: "clock"
            )
            .font(.subheadline.weight(.medium))
            .foregroundStyle(ForgeDesign.secondaryText)
            .fixedSize(horizontal: false, vertical: true)
            .monospacedDigit()
          }
          .privacySensitive()

          previewBoundary

          DisclosureGroup(isExpanded: $showsSupport) {
            VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
              Label(
                "Use only the reviewed World and version.",
                systemImage: "doc.badge.checkmark"
              )
              Label(
                "Stop when a source or safety boundary is unclear.",
                systemImage: "hand.raised"
              )
              Label(
                "Keep access support available during independent work.",
                systemImage: "accessibility"
              )
            }
            .padding(.top, ForgeDesign.Spacing.small)
          } label: {
            Text("Source, safety, and access")
              .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
              .fixedSize(horizontal: false, vertical: true)
          }
          .accessibilityHint(
            showsSupport
              ? "Hides source, safety, and access information."
              : "Shows source, safety, and access information."
          )
          .accessibilityIdentifier("focus.support")

          Button(action: togglePause) {
            Label(
              isPaused ? "Continue preview" : "Pause preview",
              systemImage: isPaused ? "play.fill" : "pause.fill"
            )
            .frame(maxWidth: .infinity, minHeight: 44)
            .fixedSize(horizontal: false, vertical: true)
            .multilineTextAlignment(.center)
          }
          .buttonStyle(.borderedProminent)
          .tint(Color.accentColor)
          .controlSize(.large)
          .foregroundStyle(ForgeDesign.primaryActionForeground)
          .accessibilityValue(isPaused ? "Preview paused" : "Preview open")
          .accessibilityHint(
            "Changes only this local preview. It does not time work, measure learning, or record progress."
          )
          .accessibilityIdentifier("focus.pause")

          Button("End preview", role: .cancel, action: endPreview)
            .buttonStyle(ForgeSecondaryButtonStyle())
            .accessibilityHint("Closes the preview without recording progress.")
            .accessibilityIdentifier("focus.end")
        }
        .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth, alignment: .leading)
        .padding(.horizontal, ForgeDesign.Spacing.regular)
        .padding(.vertical, ForgeDesign.Spacing.large)
        .frame(maxWidth: .infinity)
      }
      .background(ForgeDesign.canvas)
      .navigationTitle(isPaused ? "Preview paused" : "Focus preview")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Close", action: endPreview)
            .frame(minWidth: 44, minHeight: 44)
            .accessibilityHint("Closes the preview without recording progress.")
            .accessibilityIdentifier("focus.close")
        }
      }
    }
    .interactiveDismissDisabled()
  }

  private var previewBoundary: some View {
    HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
      Image(systemName: "lock.fill")
        .foregroundStyle(.tint)
        .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        Text("Preview boundary")
          .font(.headline)
          .fixedSize(horizontal: false, vertical: true)

        Text(
          "This local preview does not run or time a session. It does not ask for or store a learner response. It does not record completion, proof, or evidence. It cannot show that learning occurred."
        )
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(ForgeDesign.Spacing.regular)
    .background(ForgeDesign.surface)
    .clipShape(
      RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
    )
    .overlay {
      RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
        .stroke(ForgeDesign.hairline, lineWidth: 1)
    }
    .accessibilityElement(children: .combine)
  }

  private func togglePause() {
    isPaused.toggle()
  }

  private func endPreview() {
    dismiss()
  }
}

#Preview {
  FocusPreviewView(snapshot: .sample())
}

#Preview("Focus preview — Large Type") {
  FocusPreviewView(snapshot: .sample())
    .environment(\.dynamicTypeSize, .accessibility2)
}
