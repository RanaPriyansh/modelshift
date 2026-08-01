import ForgeCore
import SwiftUI

struct EvidenceView: View {
  @Environment(AppModel.self) private var model
  @ScaledMetric(relativeTo: .body) private var recordMinimumHeight: CGFloat = 44

  var body: some View {
    List {
      Section {
        EvidenceBoundaryRow(
          title: "Local fixture records",
          detail:
            "This screen shows local fixture records only. It does not show verified evidence or provider evidence.",
          systemImage: "doc.text"
        )

        EvidenceBoundaryRow(
          title: "No authority or efficacy proof",
          detail:
            "A local fixture cannot prove a participant action, a signed receipt, release approval, production status, or learning efficacy.",
          systemImage: "hand.raised"
        )

        EvidenceBoundaryRow(
          title: "Device-local and read-only",
          detail:
            "This build stores these records on this device. This screen does not share, publish, or upgrade them.",
          systemImage: "lock"
        )
      } header: {
        Text("Evidence boundary")
          .foregroundStyle(ForgeDesign.secondaryText)
      }

      if model.snapshot.evidence.isEmpty {
        ContentUnavailableView(
          "No local fixture records",
          systemImage: "doc.text.magnifyingglass",
          description: Text("Completed work does not create verified evidence automatically.")
        )
      } else {
        Section {
          ForEach(model.snapshot.evidence) { record in
            NavigationLink {
              EvidenceRecordView(record: record)
            } label: {
              EvidenceRecordRow(record: record)
            }
            .frame(minHeight: recordMinimumHeight)
            .contentShape(Rectangle())
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(record.title)
            .accessibilityValue(
              "Local fixture. \(record.status). Recorded \(record.recordedAt.formatted(date: .long, time: .omitted))"
            )
            .accessibilityHint(
              "Opens local record details. This record is not verified or provider evidence."
            )
            .privacySensitive()
          }
        } header: {
          Text("Local fixture records")
            .foregroundStyle(ForgeDesign.secondaryText)
        } footer: {
          Text(
            "Each record states what remains untested. A local fixture does not prove a verified result."
          )
          .foregroundStyle(ForgeDesign.secondaryText)
          .accessibilityIdentifier("evidence.records-footer-visual")
        }
      }
    }
    .navigationTitle("Evidence")
    .toolbar {
      SettingsToolbar()
    }
  }
}

private struct EvidenceRecordRow: View {
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  let record: ForgeEvidenceRecord

  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text(record.title)
        .font(.headline)
        .fixedSize(horizontal: false, vertical: true)

      localFixtureLabel

      Text(record.status)
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)

      Text(record.recordedAt, format: .dateTime.day().month().year())
        .font(.caption)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .privacySensitive()
  }

  @ViewBuilder
  private var localFixtureLabel: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        Text("Local fixture")
      } else {
        Label("Local fixture", systemImage: "doc.text")
      }
    }
    .font(.caption.weight(.semibold))
    .foregroundStyle(ForgeDesign.secondaryText)
    .fixedSize(horizontal: false, vertical: true)
  }
}

private struct EvidenceRecordView: View {
  let record: ForgeEvidenceRecord

  var body: some View {
    List {
      Section {
        Text(record.title)
          .font(.headline)
          .fixedSize(horizontal: false, vertical: true)
          .privacySensitive()
          .accessibilityAddTraits(.isHeader)

        EvidenceField(label: "Record type", value: "Local fixture")
          .privacySensitive()

        EvidenceField(label: "Local status", value: record.status)
          .privacySensitive()

        EvidenceField(
          label: "Recorded on this device",
          value: record.recordedAt.formatted(date: .long, time: .omitted)
        )
        .privacySensitive()
      } header: {
        Text("Record")
          .foregroundStyle(ForgeDesign.secondaryText)
      }

      Section {
        Text(record.limitation)
          .fixedSize(horizontal: false, vertical: true)
          .privacySensitive()
      } header: {
        Text("Limits")
          .foregroundStyle(ForgeDesign.secondaryText)
      }

      Section {
        EvidenceBoundaryRow(
          title: "Not verified or provider evidence",
          detail:
            "This local fixture does not show a provider event, participant activity, a signed receipt, release approval, production status, or learning efficacy.",
          systemImage: "hand.raised"
        )

        EvidenceBoundaryRow(
          title: "Read-only local record",
          detail:
            "This view does not upgrade, publish, or make a decision from this local fixture.",
          systemImage: "lock"
        )
      } header: {
        Text("Evidence boundary")
          .foregroundStyle(ForgeDesign.secondaryText)
      }
    }
    .navigationTitle("Evidence record")
    .navigationBarTitleDisplayMode(.inline)
  }
}

private struct EvidenceBoundaryRow: View {
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  let title: String
  let detail: String
  let systemImage: String

  var body: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
          boundaryIcon
          boundaryCopy
        }
      } else {
        HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
          boundaryIcon
          boundaryCopy
        }
      }
    }
    .accessibilityElement(children: .combine)
  }

  private var boundaryIcon: some View {
    Image(systemName: systemImage)
      .font(.title3)
      .foregroundStyle(.tint)
      .frame(width: 28, height: 44)
      .accessibilityHidden(true)
  }

  private var boundaryCopy: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text(title)
        .font(.subheadline.weight(.semibold))
        .fixedSize(horizontal: false, vertical: true)

      Text(detail)
        .font(.footnote)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

private struct EvidenceField: View {
  let label: String
  let value: String

  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text(label)
        .font(.caption.weight(.semibold))
        .foregroundStyle(ForgeDesign.secondaryText)

      Text(value)
        .font(.body)
        .fixedSize(horizontal: false, vertical: true)
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
