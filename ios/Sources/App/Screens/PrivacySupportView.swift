import ForgeCore
import Foundation
import SwiftUI

struct PrivacySupportView: View {
  @Environment(AppModel.self) private var model

  private let links: PrivacySupportLinks

  init() {
    links = .fromMainBundle
  }

  init(
    privacyPolicyValue: String?,
    supportValue: String?
  ) {
    links = PrivacySupportLinks(
      privacyPolicyValue: privacyPolicyValue,
      supportValue: supportValue
    )
  }

  var body: some View {
    Form {
      dataBoundarySection
      storedDataSection
      dataUseSection
      systemPrivacySection
      LocalDataDeletionSection(identifierPrefix: "privacy-support")
      evidenceBoundarySection
      publicLinksSection
    }
    .navigationTitle("Privacy and Support")
    .accessibilityIdentifier("privacy-support.screen")
  }

  private var dataBoundarySection: some View {
    Section {
      LabeledContent("Current boundary") {
        Text("Device-local")
      }
      .accessibilityIdentifier("privacy-support.data-boundary")

      LabeledContent("Learner mode") {
        Text(model.snapshot.mode.title)
      }
      .accessibilityIdentifier("privacy-support.learner-mode")

      Text(model.snapshot.mode.dataBoundary)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)

      Text(
        "FORGE stores its data in a device-local app group. It does not sync this data to FORGE servers."
      )
      .foregroundStyle(ForgeDesign.secondaryText)
      .fixedSize(horizontal: false, vertical: true)
    } header: {
      Text("Data boundary")
        .foregroundStyle(ForgeDesign.secondaryText)
    }
  }

  private var storedDataSection: some View {
    Section {
      PrivacyDataCategoryRow(
        title: "Learning setup",
        detail: "Goal, learner mode, available time, study depth, and grown-up presence selection.",
        identifier: "privacy-support.stored-data.setup"
      )
      PrivacyDataCategoryRow(
        title: "Learning path",
        detail: "Next action, path milestones, and delayed-return time.",
        identifier: "privacy-support.stored-data.path"
      )
      PrivacyDataCategoryRow(
        title: "Local evidence",
        detail: "Evidence record titles, status, limitations, and recorded time.",
        identifier: "privacy-support.stored-data.evidence"
      )
      PrivacyDataCategoryRow(
        title: "App state",
        detail: "Onboarding completion, reminder preference, and pending internal route.",
        identifier: "privacy-support.stored-data.app-state"
      )
    } header: {
      Text("Stored on this device")
        .foregroundStyle(ForgeDesign.secondaryText)
    }
  }

  private var dataUseSection: some View {
    Section {
      PrivacyStatusRow(
        title: "Network activity",
        value: "Off",
        identifier: "privacy-support.network-state"
      )
      PrivacyStatusRow(
        title: "Analytics",
        value: "Off",
        identifier: "privacy-support.analytics-state"
      )
      PrivacyStatusRow(
        title: "Remote push",
        value: "Off",
        identifier: "privacy-support.remote-push-state"
      )

      Text(
        "This build has no network client, analytics service, or remote push registration."
      )
      .foregroundStyle(ForgeDesign.secondaryText)
      .fixedSize(horizontal: false, vertical: true)
    } header: {
      Text("Network and data use")
        .foregroundStyle(ForgeDesign.secondaryText)
    }
  }

  private var systemPrivacySection: some View {
    Section {
      PrivacyDataCategoryRow(
        title: "Widget",
        detail:
          "The widget shows whether a local delayed return is available. "
          + "It does not show learner goals or evidence. "
          + "iOS marks its content as privacy-sensitive.",
        identifier: "privacy-support.widget-privacy"
      )
      PrivacyDataCategoryRow(
        title: "Notification",
        detail:
          "If enabled, FORGE schedules one local return reminder. "
          + "The notification contains no learner, goal, path, or evidence text.",
        identifier: "privacy-support.notification-privacy"
      )
    } header: {
      Text("Widgets and notifications")
        .foregroundStyle(ForgeDesign.secondaryText)
    }
  }

  private var evidenceBoundarySection: some View {
    Section {
      Text(
        "This center does not create, edit, upgrade, share, or make decisions from evidence. Local evidence remains read-only."
      )
      .foregroundStyle(ForgeDesign.secondaryText)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityIdentifier("privacy-support.evidence-boundary")
    } header: {
      Text("Evidence boundary")
        .foregroundStyle(ForgeDesign.secondaryText)
    }
  }

  private var publicLinksSection: some View {
    Section {
      DistributionLinkRow(
        title: "Privacy policy",
        url: links.privacyPolicyURL,
        identifier: "privacy-support.privacy-policy"
      )
      DistributionLinkRow(
        title: "Support",
        url: links.supportURL,
        identifier: "privacy-support.support"
      )
    } header: {
      Text("Privacy policy and support")
        .foregroundStyle(ForgeDesign.secondaryText)
    } footer: {
      Text(
        "FORGE shows a public link only when the distribution configuration contains a valid HTTPS URL."
      )
      .foregroundStyle(ForgeDesign.secondaryText)
      .fixedSize(horizontal: false, vertical: true)
    }
  }
}

struct LocalDataDeletionSection: View {
  @Environment(AppModel.self) private var model
  @State private var isClearDataConfirmationPresented = false

  let identifierPrefix: String

  var body: some View {
    Section {
      Button("Clear local learning data", role: .destructive) {
        isClearDataConfirmationPresented = true
      }
      .disabled(
        model.isLocalDataResetRunning
          || model.isReminderOperationRunning
      )
      .accessibilityHint(
        "Shows a confirmation before local learning data is deleted."
      )
      .accessibilityIdentifier("\(identifierPrefix).clear-local-data")

      if model.isLocalDataResetRunning {
        ProgressView("Clearing local data")
      }
    } header: {
      Text("Local data")
        .foregroundStyle(ForgeDesign.secondaryText)
        .accessibilityIdentifier("\(identifierPrefix).local-data-header-visual")
    } footer: {
      Text(
        "This deletes the goal, setup, path, local evidence, pending route, and reminder preference from this device."
      )
      .foregroundStyle(ForgeDesign.secondaryText)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityIdentifier("\(identifierPrefix).local-data-footer-visual")
    }
    .alert(
      "Clear local learning data?",
      isPresented: $isClearDataConfirmationPresented
    ) {
      Button("Cancel", role: .cancel) {}
      Button("Clear data", role: .destructive) {
        model.clearLocalData()
      }
      .accessibilityIdentifier("\(identifierPrefix).confirm-clear-local-data")
    } message: {
      Text(
        "This action deletes local learning data and scheduled reminders. You cannot undo this action."
      )
      .fixedSize(horizontal: false, vertical: true)
    }
  }
}

private struct PrivacyDataCategoryRow: View {
  let title: String
  let detail: String
  let identifier: String

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(title)
        .font(.body.weight(.medium))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityIdentifier("privacy-support.category-title-visual")
      Text(detail)
        .font(.footnote)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityIdentifier("privacy-support.category-detail-visual")
    }
    .accessibilityElement(children: .combine)
    .accessibilityIdentifier(identifier)
  }
}

private struct PrivacyStatusRow: View {
  let title: String
  let value: String
  let identifier: String

  var body: some View {
    LabeledContent(title, value: value)
      .accessibilityIdentifier(identifier)
  }
}

private struct DistributionLinkRow: View {
  let title: String
  let url: URL?
  let identifier: String

  var body: some View {
    if let url {
      Link(destination: url) {
        Label(title, systemImage: "arrow.up.right.square")
      }
      .accessibilityIdentifier("\(identifier).link")
      .accessibilityHint("Opens the public \(title.lowercased()) in a browser.")
    } else {
      LabeledContent(title, value: "Not configured for distribution")
        .accessibilityIdentifier("\(identifier).not-configured")
        .accessibilityHint("No public \(title.lowercased()) link is configured.")
    }
  }
}

private struct PrivacySupportLinks {
  let privacyPolicyURL: URL?
  let supportURL: URL?

  init(
    privacyPolicyValue: String?,
    supportValue: String?
  ) {
    privacyPolicyURL = Self.publicHTTPSURL(from: privacyPolicyValue)
    supportURL = Self.publicHTTPSURL(from: supportValue)
  }

  static let fromMainBundle = Self(
    privacyPolicyValue: Bundle.main.object(
      forInfoDictionaryKey: "FORGEPrivacyPolicyURL"
    ) as? String,
    supportValue: Bundle.main.object(
      forInfoDictionaryKey: "FORGESupportURL"
    ) as? String
  )

  private static func publicHTTPSURL(from value: String?) -> URL? {
    ForgePublicWebURL.validated(value)
  }
}

#Preview("Privacy and Support") {
  NavigationStack {
    PrivacySupportView(
      privacyPolicyValue: "https://forgelearning.org/privacy",
      supportValue: "https://forgelearning.org/support"
    )
  }
  .environment(AppModel.preview())
}

#Preview("Privacy and Support — Not configured") {
  NavigationStack {
    PrivacySupportView(
      privacyPolicyValue: nil,
      supportValue: nil
    )
  }
  .environment(AppModel.preview())
}
