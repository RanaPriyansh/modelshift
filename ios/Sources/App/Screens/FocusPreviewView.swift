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
        VStack(alignment: .leading, spacing: 20) {
          Label("Preview only", systemImage: "eye")
            .font(.headline)
            .foregroundStyle(.secondary)

          VStack(alignment: .leading, spacing: 8) {
            Text(snapshot.nextAction.title)
              .font(.title2.weight(.bold))
              .privacySensitive()
              .accessibilityAddTraits(.isHeader)

            Text(snapshot.nextAction.rationale)
              .font(.body)
              .foregroundStyle(.secondary)
              .privacySensitive()

            Label(
              "\(snapshot.nextAction.durationMinutes) minutes",
              systemImage: "clock"
            )
          }
          .privacySensitive()

          GroupBox("Session boundary") {
            Text(
              "This preview does not ask for or store a learner response. It records no completion, proof, or evidence."
            )
            .frame(maxWidth: .infinity, alignment: .leading)
          }
          .accessibilityElement(children: .combine)

          DisclosureGroup("Source, safety, and access", isExpanded: $showsSupport) {
            VStack(alignment: .leading, spacing: 12) {
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
            .padding(.top, 8)
          }
          .accessibilityHint(
            showsSupport
              ? "Hides source, safety, and access information."
              : "Shows source, safety, and access information."
          )

          Button(action: togglePause) {
            Label(
              isPaused ? "Continue preview" : "Pause preview",
              systemImage: isPaused ? "play.fill" : "pause.fill"
            )
            .frame(maxWidth: .infinity)
          }
          .buttonStyle(.borderedProminent)
          .controlSize(.large)
          .accessibilityValue(isPaused ? "Paused" : "Active")
          .accessibilityHint(
            "Changes only this preview. It does not record progress."
          )

          Button("End preview", role: .cancel, action: endPreview)
            .frame(maxWidth: .infinity)
            .accessibilityHint("Closes the preview without recording progress.")
        }
        .frame(maxWidth: 680, alignment: .leading)
        .padding()
        .frame(maxWidth: .infinity)
      }
      .navigationTitle(isPaused ? "Preview paused" : "Focus preview")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Close", action: endPreview)
            .accessibilityHint("Closes the preview without recording progress.")
        }
      }
    }
    .interactiveDismissDisabled()
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
