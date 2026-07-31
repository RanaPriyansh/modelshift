import ForgeCore
import SwiftUI

struct EvidenceView: View {
  @Environment(AppModel.self) private var model

  var body: some View {
    List {
      if model.snapshot.evidence.isEmpty {
        ContentUnavailableView(
          "No evidence yet",
          systemImage: "doc.text.magnifyingglass",
          description: Text("Completed work does not create evidence automatically.")
        )
      } else {
        Section {
          ForEach(model.snapshot.evidence) { record in
            NavigationLink {
              EvidenceRecordView(record: record)
            } label: {
              EvidenceRecordRow(record: record)
            }
            .accessibilityHint("Opens the read-only record details.")
          }
        } header: {
          Text("Bounded records")
        } footer: {
          Text("Each record states what remains untested.")
        }
      }

      Section("Evidence boundary") {
        Label(
          "Evidence can support a claim. It cannot make a consequential decision.",
          systemImage: "hand.raised"
        )

        Label(
          "This build stores records on this device. This view does not share or publish them.",
          systemImage: "lock"
        )
      }
    }
    .navigationTitle("Evidence")
    .toolbar {
      SettingsToolbar()
    }
  }
}

private struct EvidenceRecordRow: View {
  let record: ForgeEvidenceRecord

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(record.title)
        .font(.headline)

      Text(record.status)
        .font(.subheadline.weight(.semibold))

      Text(record.recordedAt, format: .dateTime.day().month().year())
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .privacySensitive()
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(record.title)
    .accessibilityValue(
      "\(record.status). Recorded \(record.recordedAt.formatted(date: .long, time: .omitted))"
    )
  }
}

private struct EvidenceRecordView: View {
  let record: ForgeEvidenceRecord

  var body: some View {
    List {
      Section("Record") {
        Text(record.title)
          .font(.headline)
          .privacySensitive()
          .accessibilityAddTraits(.isHeader)

        EvidenceField(label: "Outcome", value: record.status)
          .privacySensitive()

        EvidenceField(
          label: "Recorded",
          value: record.recordedAt.formatted(date: .long, time: .omitted)
        )
        .privacySensitive()
      }

      Section("Limits") {
        Text(record.limitation)
          .privacySensitive()
      }

      Section("Privacy and authority") {
        Label(
          "This view is read-only. It does not upgrade or publish evidence.",
          systemImage: "lock"
        )

        Label(
          "This build keeps the record on this device.",
          systemImage: "iphone"
        )
      }
    }
    .navigationTitle("Evidence record")
    .navigationBarTitleDisplayMode(.inline)
  }
}

private struct EvidenceField: View {
  let label: String
  let value: String

  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text(label)
        .font(.caption.weight(.semibold))
        .foregroundStyle(.secondary)

      Text(value)
        .font(.body)
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(label)
    .accessibilityValue(value)
  }
}

#Preview {
  NavigationStack {
    EvidenceView()
  }
  .environment(AppModel.preview())
}

#Preview("Evidence — Large Type") {
  NavigationStack {
    EvidenceView()
  }
  .environment(AppModel.preview())
  .environment(\.dynamicTypeSize, .accessibility2)
}
