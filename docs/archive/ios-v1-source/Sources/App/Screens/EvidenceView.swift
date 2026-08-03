import ForgeCore
import SwiftUI

struct EvidenceView: View {
  @Environment(AppModel.self) private var model
  @State private var expandedReceiptIDs = Set<EvidenceID>()
  @ScaledMetric(relativeTo: .body) private var receiptMinimumHeight: CGFloat = 56

  var body: some View {
    let receipts = sortedReceipts

    ScrollView {
      LazyVStack(alignment: .leading, spacing: ForgeDesign.Spacing.large) {
        receiptBoundary
        EvidencePackageLimitations(limitations: model.catalog.limitations)

        if receipts.isEmpty {
          EvidenceEmptyState(courseTitle: model.courseTitle)
        } else {
          receiptList(receipts)
        }
      }
      .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth, alignment: .leading)
      .padding(.horizontal, ForgeDesign.Spacing.regular)
      .padding(.vertical, ForgeDesign.Spacing.large)
      .frame(maxWidth: .infinity)
    }
    .background(ForgeDesign.canvas)
    .navigationTitle("Evidence")
  }

  private var sortedReceipts: [LocalEvidenceReceipt] {
    model.learnerState.evidence.sorted { left, right in
      if left.recordedAt == right.recordedAt {
        return left.id.rawValue < right.id.rawValue
      }

      return left.recordedAt > right.recordedAt
    }
  }

  private var receiptBoundary: some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
        UniversitySectionLabel(title: "Adult university course receipts")

        ViewThatFits(in: .horizontal) {
          HStack(alignment: .firstTextBaseline, spacing: ForgeDesign.Spacing.small) {
            UniversityStatusBadge(
              label: "Local scope",
              symbolName: "lock.fill",
              colorRole: .information
            )
            Text("Local-only and unsigned")
              .font(.subheadline.weight(.semibold))
              .foregroundStyle(ForgeDesign.secondaryText)
          }

          VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
            UniversityStatusBadge(
              label: "Local scope",
              symbolName: "lock.fill",
              colorRole: .information
            )
            Text("Local-only and unsigned")
              .font(.subheadline.weight(.semibold))
              .foregroundStyle(ForgeDesign.secondaryText)
          }
        }

        Text(model.courseTitle)
          .font(.title3.weight(.semibold))
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityAddTraits(.isHeader)

        Text(
          "These local receipt fields are for an adult university course on this device. They do not publish, share, change, or issue a credential."
        )
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
      }
      .accessibilityElement(children: .contain)
    }
    .accessibilityIdentifier("evidence.local-boundary")
  }

  private func receiptList(_ receipts: [LocalEvidenceReceipt]) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "Receipt list")

      LazyVStack(spacing: ForgeDesign.Spacing.regular) {
        ForEach(receipts, id: \.id) { receipt in
          EvidenceReceiptRow(
            receipt: receipt,
            catalog: model.catalog,
            courseTitle: model.courseTitle,
            isExpanded: expansionBinding(for: receipt.id)
          )
          .frame(minHeight: receiptMinimumHeight)
        }
      }
    }
    .accessibilityIdentifier("evidence.record-list")
  }

  private func expansionBinding(for receiptID: EvidenceID) -> Binding<Bool> {
    Binding {
      expandedReceiptIDs.contains(receiptID)
    } set: { isExpanded in
      if isExpanded {
        expandedReceiptIDs.insert(receiptID)
      } else {
        expandedReceiptIDs.remove(receiptID)
      }
    }
  }
}

private struct EvidenceReceiptRow: View {
  let receipt: LocalEvidenceReceipt
  let catalog: ReleasedCatalogSnapshot
  let courseTitle: String
  @Binding var isExpanded: Bool

  var body: some View {
    UniversitySurface {
      DisclosureGroup(isExpanded: $isExpanded) {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
          Divider()
          receiptFields
        }
        .padding(.top, ForgeDesign.Spacing.tight)
      } label: {
        receiptSummary
      }
      .tint(ForgeDesign.navigationCommitment)
      .accessibilityIdentifier(
        "evidence.receipt-disclosure.\(receipt.id.rawValue)"
      )
      .accessibilityValue(isExpanded ? "Expanded" : "Collapsed")
      .accessibilityHint(
        isExpanded
          ? "Hides local receipt fields."
          : "Shows local receipt fields."
      )
    }
    .privacySensitive()
    .accessibilityIdentifier("evidence.receipt.\(receipt.id.rawValue)")
  }

  private var receiptSummary: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      ViewThatFits(in: .horizontal) {
        HStack(alignment: .firstTextBaseline, spacing: ForgeDesign.Spacing.small) {
          scopeLabel
          Spacer(minLength: ForgeDesign.Spacing.small)
          recordedTime
        }

        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
          scopeLabel
          recordedTime
        }
      }

      Text(activityTitle)
        .font(.headline)
        .fixedSize(horizontal: false, vertical: true)

      Text(validatorResultTitle(receipt.validatorResult))
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(resultForeground)
        .fixedSize(horizontal: false, vertical: true)

      Text(activityKindTitle(receipt.activityKind))
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Local-only unsigned receipt for \(activityTitle)")
    .accessibilityValue(
      "Check result: \(validatorResultTitle(receipt.validatorResult)). Activity kind: \(activityKindTitle(receipt.activityKind)). Recorded time: \(recordedTimeValue)."
    )
  }

  private var scopeLabel: some View {
    Label("Local-only unsigned", systemImage: "lock.fill")
      .font(.caption.weight(.semibold))
      .foregroundStyle(ForgeDesign.neutralInformation)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityHidden(true)
  }

  private var recordedTime: some View {
    Text(recordedTimeValue)
      .font(.caption.monospacedDigit())
      .foregroundStyle(ForgeDesign.secondaryText)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityHidden(true)
  }

  private var receiptFields: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "Receipt fields")

      UniversityMetadataRow(label: "Scope", value: "Local-only unsigned")
      UniversityMetadataRow(label: "Course", value: courseTitle)
      UniversityMetadataRow(label: "Activity", value: activityTitle)
      UniversityMetadataRow(label: "Capability", value: capabilityTitle)
      UniversityMetadataRow(
        label: "Activity kind",
        value: activityKindTitle(receipt.activityKind)
      )
      UniversityMetadataRow(
        label: "Check result",
        value: validatorResultTitle(receipt.validatorResult)
      )
      UniversityMetadataRow(
        label: "Assistance references",
        value: "\(receipt.assistanceIDs.count)"
      )
      UniversityMetadataRow(label: "Recorded time", value: recordedTimeValue)
    }
  }

  private var recordedTimeValue: String {
    receipt.recordedAt.formatted(date: .long, time: .shortened)
  }

  private var resultForeground: Color {
    switch receipt.validatorResult {
    case .demonstrated:
      ForgeDesign.recordedLocalCheck
    case .notDemonstrated:
      ForgeDesign.failedCheck
    }
  }

  private var activityTitle: String {
    catalog.activities.first(where: { $0.id == receipt.activityID })?.prompt
      ?? "Course activity"
  }

  private var capabilityTitle: String {
    catalog.capabilities.first(where: { $0.id == receipt.capabilityID })?.title
      ?? "Course capability"
  }
}

private struct EvidencePackageLimitations: View {
  let limitations: [CatalogLimitation]

  var body: some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
        UniversitySectionLabel(title: "Package limitations")

        if limitations.isEmpty {
          UniversityMetadataRow(label: "Package limitations", value: "None listed")
        } else {
          ForEach(limitations, id: \.id) { limitation in
            VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
              Text(limitationKindTitle(limitation.kind))
                .font(.subheadline.weight(.semibold))
                .fixedSize(horizontal: false, vertical: true)

              Text(limitation.statement)
                .font(.subheadline)
                .foregroundStyle(ForgeDesign.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(limitationKindTitle(limitation.kind))
                .accessibilityValue(limitation.statement)
            }
          }
        }
      }
    }
    .accessibilityIdentifier("evidence.package-limitations")
  }
}

private struct EvidenceEmptyState: View {
  let courseTitle: String

  var body: some View {
    UniversitySurface {
      ContentUnavailableView(
        "No local receipts",
        systemImage: "doc.text.magnifyingglass",
        description: Text("This device has no local receipts for \(courseTitle).")
      )
      .frame(maxWidth: .infinity, alignment: .leading)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel("No local receipts")
      .accessibilityValue("This device has no local receipts for \(courseTitle).")
      .accessibilityAddTraits(.isHeader)
      .accessibilityIdentifier("evidence.empty-state")
    }
  }
}

private func activityKindTitle(_ kind: ActivityKind) -> String {
  switch kind {
  case .practice:
    "Practice"
  case .proof:
    "Independent check"
  case .delayedReturn:
    "Delayed return"
  }
}

private func validatorResultTitle(_ result: ValidatorResult) -> String {
  switch result {
  case .demonstrated:
    "Recorded local check"
  case .notDemonstrated:
    "Check not passed"
  }
}

private func limitationKindTitle(_ kind: LimitationKind) -> String {
  switch kind {
  case .provenance:
    "Provenance limit"
  case .claimBoundary:
    "Claim boundary"
  }
}

#Preview {
  NavigationStack {
    EvidenceView()
  }
  .environment(AppModel.preview())
}

#Preview("Evidence — Accessibility XL") {
  NavigationStack {
    EvidenceView()
  }
  .environment(AppModel.preview())
  .environment(\.dynamicTypeSize, .accessibility5)
}
