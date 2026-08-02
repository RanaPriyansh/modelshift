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
    ScrollView {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.large) {
        PrivacyOverviewSurface(courseTitle: model.courseTitle)

        PrivacyEditorialSection(title: "Your privacy") {
          StorageBoundarySurface()
          Divider()
          ReminderBoundarySurface()
          Divider()
          DataUseSurface()
          Divider()
          EvidenceBoundarySurface()
        }

        PrivacyEditorialSection(title: "Technical details and course limits") {
          StorageProtectionSurface()
          Divider()
          WidgetAndShortcutSurface()
          Divider()
          CatalogLimitationsSurface(
            courseTitle: model.courseTitle,
            limitations: model.catalog.limitations
          )
        }

        LocalDataDeletionSection(identifierPrefix: "privacy-support")
        PublicLinksSurface(links: links)
      }
      .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth)
      .padding(.horizontal, ForgeDesign.Spacing.regular)
      .padding(.vertical, ForgeDesign.Spacing.large)
      .frame(maxWidth: .infinity)
    }
    .background(ForgeDesign.canvas)
    .navigationTitle("Privacy and Support")
    .toolbar(.hidden, for: .tabBar)
    .accessibilityIdentifier("privacy-support.screen")
  }
}

private struct PrivacyOverviewSurface: View {
  let courseTitle: String

  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      UniversitySectionLabel(title: "Adult university course")

      Text(courseTitle)
        .font(.title2.weight(.semibold))
        .foregroundStyle(Color.primary)
        .fixedSize(horizontal: false, vertical: true)

      Text(
        "FORGE keeps course progress on this device. It does not issue a credential or establish institutional authority."
      )
      .foregroundStyle(Color.secondary)
      .fixedSize(horizontal: false, vertical: true)
    }
    .accessibilityElement(children: .combine)
    .accessibilityIdentifier("privacy-support.course")
  }
}

private struct PrivacyEditorialSection<Content: View>: View {
  let title: String

  private let content: Content

  init(
    title: String,
    @ViewBuilder content: () -> Content
  ) {
    self.title = title
    self.content = content()
  }

  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      UniversitySectionLabel(title: title)

      UniversitySurface {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
          content
        }
      }
    }
  }
}

private struct StorageBoundarySurface: View {
  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "What FORGE stores")

      PrivacyFactRow(
        title: "Course progress and activity",
        detail:
          "FORGE saves the current course and activity, selected-choice check results, "
          + "activity progress, help use, receipt metadata, and delayed-return schedules locally. "
          + "FORGE needs this data for durable learning progress."
      )

      PrivacyFactRow(
        title: "Local receipt metadata",
        detail:
          "Each local receipt includes course, activity, package, limitation, help-use, and date "
          + "metadata. It also includes the selected-choice check result."
      )

      PrivacyFactRow(
        title: "Written reasoning and selected choice",
        detail:
          "FORGE keeps written reasoning and values derived from written reasoning in memory while "
          + "the activity is open and during submission. FORGE does not save them. "
          + "FORGE uses selected-choice text to check the activity. FORGE does not save selected-choice text."
      )

      PrivacyFactRow(
        title: "Planned returns and reminders",
        detail:
          "FORGE saves the delayed-return schedule locally. It stores when a return becomes available, "
          + "when it is due, and whether it is completed. It also stores your reminder choice."
      )
    }
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("privacy-support.storage-boundary")
  }
}

private struct StorageProtectionSurface: View {
  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "Private app-data settings")

      PrivacyFactRow(
        title: "File and backup settings",
        detail:
          "FORGE asks iOS to apply file protection to private app data and exclude it from device backups."
      )

      PrivacyFactRow(
        title: "After each save",
        detail:
          "FORGE checks that iOS reports the requested settings. If the check fails, FORGE reports a local-data problem."
      )

      PrivacyFactRow(
        title: "Backup boundary",
        detail:
          "These checks do not show how a device backup handles the data."
      )
    }
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("privacy-support.storage-protection")
  }
}

private struct ReminderBoundarySurface: View {
  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "Local reminders")

      PrivacyFactRow(
        title: "Reminder text",
        detail:
          "The reminder text is general. It does not include course, activity, local receipt, or personal "
          + "information. It does not include written reasoning, selected-choice text, a selected-choice "
          + "check result, or a value derived from written reasoning."
      )

      PrivacyFactRow(
        title: "Reminder limit",
        detail:
          "A reminder does not complete a planned return, create a learning record, or change course progress."
      )
    }
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("privacy-support.reminders")
  }
}

private struct WidgetAndShortcutSurface: View {
  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "Widget and shortcuts")

      PrivacyFactRow(
        title: "Widget values",
        detail:
          "The widget uses a general delayed-return state and time window. It includes whether a return "
          + "is scheduled, open, or due. It also includes when the return becomes available, when it is due, "
          + "when FORGE prepares the window, and when it expires."
      )

      PrivacyFactRow(
        title: "Backup behavior",
        detail:
          "The shared time window can be included in a device backup. iOS controls this behavior."
      )

      PrivacyFactRow(
        title: "Widget limit",
        detail:
          "The widget has only the return lifecycle and time boundaries. It does not include course or "
          + "activity details, local receipts, or personal information. It does not include written reasoning, "
          + "selected-choice text, a selected-choice check result, or a value derived from written reasoning. "
          + "Opening it does not change course progress."
      )

      PrivacyFactRow(
        title: "Shortcut limit",
        detail:
          "A shortcut can ask FORGE to open the local focus screen. It does not receive course or activity "
          + "details, local receipts, or personal information. It does not receive written reasoning, "
          + "selected-choice text, a selected-choice check result, or a value derived from written reasoning."
      )
    }
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("privacy-support.app-group")
  }
}

private struct DataUseSurface: View {
  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "Network and AI boundary")

      PrivacyFactRow(
        title: "Learning-data network and cloud sync",
        detail:
          "This course does not send learning data over a network. It does not sync learning data to cloud services."
      )

      PrivacyFactRow(
        title: "AI service",
        detail: "This course does not use an AI service."
      )

      PrivacyFactRow(
        title: "Public links",
        detail:
          "Privacy and support links open in your device browser. FORGE does not attach learning data to those links."
      )
    }
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("privacy-support.data-use")
  }
}

private struct EvidenceBoundarySurface: View {
  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "Local learning record boundary")

      PrivacyFactRow(
        title: "Scope",
        detail: "Local learning records remain on this device. They are not official records."
      )

      PrivacyFactRow(
        title: "Limit",
        detail:
          "A local learning record does not issue a credential, establish institutional authority, or make a course decision."
      )
    }
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("privacy-support.evidence-boundary")
  }
}

private struct CatalogLimitationsSurface: View {
  let courseTitle: String
  let limitations: [CatalogLimitation]

  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      UniversitySectionLabel(title: "Course limitations")

      Text("This course lists these limits for \(courseTitle).")
        .foregroundStyle(Color.secondary)
        .fixedSize(horizontal: false, vertical: true)

      if limitations.isEmpty {
        Text("This course has no listed limitations.")
          .foregroundStyle(Color.secondary)
          .fixedSize(horizontal: false, vertical: true)
      } else {
        ForEach(limitations, id: \.id) { limitation in
          Label {
            Text(limitation.statement)
              .fixedSize(horizontal: false, vertical: true)
          } icon: {
            Image(systemName: "exclamationmark.triangle")
              .accessibilityHidden(true)
          }
          .foregroundStyle(Color.primary)
          .accessibilityElement(children: .ignore)
          .accessibilityLabel("Course limitation")
          .accessibilityValue(limitation.statement)
        }
      }
    }
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("privacy-support.catalog-limitations")
  }
}

struct LocalDataDeletionSection: View {
  @Environment(AppModel.self) private var model
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @State private var isClearDataConfirmationPresented = false
  @AccessibilityFocusState private var clearDataFocus: ClearDataFocus?

  let identifierPrefix: String

  private enum ClearDataFocus: Hashable {
    case clearLocalData
    case confirmationHeading
  }

  var body: some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
        UniversitySectionLabel(title: "Delete local data")

        if isClearDataConfirmationPresented {
          clearDataConfirmation
        } else {
          clearDataAction
        }

        if model.isLocalDataResetRunning {
          ProgressView("Clearing local data")
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityIdentifier("\(identifierPrefix).clear-local-data-progress")
        }

        if let statusMessage = model.localDataResetStatusMessage {
          Text(statusMessage)
            .foregroundStyle(Color.secondary)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityIdentifier("\(identifierPrefix).clear-local-data-status")
        }
      }
    }
    .accessibilityIdentifier("\(identifierPrefix).local-data")
    .onChange(
      of: model.localDataResetStatusMessage,
      initial: false,
      announceStatusChange
    )
    .onChange(of: isClearDataConfirmationPresented) { _, isPresented in
      if isPresented {
        clearDataFocus = .confirmationHeading
        AccessibilityNotification.Announcement(
          "Clear local data confirmation. Review the effect, then choose Cancel or Clear local data."
        ).post()
      } else if !model.isLocalDataResetRunning {
        clearDataFocus = .clearLocalData
      } else {
        clearDataFocus = nil
      }
    }
  }

  private var clearDataAction: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      Text(
        "FORGE tries to clear saved learning data, the shared return window and pending focus request, "
          + "and local reminders. If a step fails, FORGE shows a recovery report."
      )
      .foregroundStyle(Color.secondary)
      .fixedSize(horizontal: false, vertical: true)

      Button(role: .destructive, action: presentClearDataConfirmation) {
        Label("Clear local learning data", systemImage: "trash")
          .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
          .fixedSize(horizontal: false, vertical: true)
      }
      .buttonStyle(.bordered)
      .controlSize(.large)
      .tint(ForgeDesign.warningText)
      .disabled(model.isLocalDataResetRunning)
      .accessibilityLabel("Clear local learning data")
      .accessibilityHint(
        "Shows the second confirmation step. FORGE does not clear local data yet."
      )
      .accessibilityIdentifier("\(identifierPrefix).clear-local-data")
      .accessibilityFocused($clearDataFocus, equals: .clearLocalData)
    }
  }

  private var clearDataConfirmation: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      clearDataConfirmationHeader

      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        Text("What will happen")
          .font(.headline)
          .accessibilityAddTraits(.isHeader)

        Text(
          "FORGE will try to clear saved learning data, the shared return window and pending focus request, "
            + "and local reminders on this device. FORGE cannot restore cleared local learning data."
        )
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)

        Text("If a step fails, FORGE shows a recovery report.")
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(ForgeDesign.Spacing.regular)
      .background(ForgeDesign.raisedSurface)
      .clipShape(
        RoundedRectangle(
          cornerRadius: ForgeDesign.Radius.inset,
          style: .continuous
        )
      )
      .overlay {
        RoundedRectangle(
          cornerRadius: ForgeDesign.Radius.inset,
          style: .continuous
        )
        .stroke(ForgeDesign.hairline, lineWidth: 1)
      }

      VStack(spacing: ForgeDesign.Spacing.small) {
        Button("Cancel", action: dismissClearDataConfirmation)
          .frame(maxWidth: .infinity, minHeight: 48)
          .buttonStyle(.bordered)
          .controlSize(.large)
          .tint(ForgeDesign.tabSelection)
          .disabled(model.isLocalDataResetRunning)
          .accessibilityLabel("Cancel local data clear")
          .accessibilityHint("Returns to local data options. FORGE does not clear local data.")
          .accessibilityIdentifier("\(identifierPrefix).cancel-clear-local-data")

        Button("Clear local data", role: .destructive, action: clearLocalData)
          .frame(maxWidth: .infinity, minHeight: 48)
          .buttonStyle(.bordered)
          .controlSize(.large)
          .tint(ForgeDesign.warningText)
          .disabled(model.isLocalDataResetRunning)
          .accessibilityLabel("Clear local data")
          .accessibilityHint(
            "Clears local learning data. FORGE cannot restore cleared local learning data."
          )
          .accessibilityIdentifier("\(identifierPrefix).confirm-clear-local-data")
      }
    }
    .accessibilityIdentifier("\(identifierPrefix).clear-local-data-confirmation")
  }

  private var clearDataConfirmationHeader: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
          clearDataConfirmationSymbol
          clearDataConfirmationHeaderCopy
        }
      } else {
        HStack(alignment: .top, spacing: ForgeDesign.Spacing.regular) {
          clearDataConfirmationSymbol
          clearDataConfirmationHeaderCopy
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .fixedSize(horizontal: false, vertical: true)
  }

  private var clearDataConfirmationSymbol: some View {
    Image(systemName: "trash")
      .font(.title2.weight(.semibold))
      .foregroundStyle(ForgeDesign.warningText)
      .frame(width: 48, height: 48)
      .background(ForgeDesign.accentWash, in: Circle())
      .accessibilityHidden(true)
  }

  private var clearDataConfirmationHeaderCopy: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text("Clear local data?")
        .font(.title2.weight(.semibold))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
        .accessibilityFocused($clearDataFocus, equals: .confirmationHeading)

      Text(
        "This is the second step. Choose Clear local data only if you intend to remove the data."
      )
      .foregroundStyle(ForgeDesign.secondaryText)
      .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .layoutPriority(1)
  }

  private func presentClearDataConfirmation() {
    isClearDataConfirmationPresented = true
  }

  private func dismissClearDataConfirmation() {
    isClearDataConfirmationPresented = false
  }

  private func clearLocalData() {
    isClearDataConfirmationPresented = false
    model.clearLocalData()
  }

  private func announceStatusChange(from oldStatus: String?, to newStatus: String?) {
    guard oldStatus != newStatus, let newStatus, !newStatus.isEmpty else {
      return
    }

    AccessibilityNotification.Announcement(newStatus).post()
  }
}

private struct PublicLinksSurface: View {
  let links: PrivacySupportLinks

  var body: some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
        UniversitySectionLabel(title: "Privacy policy and support")

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

        Text(
          "FORGE shows a link only when a usable public web address is available. "
            + "If it is not available, FORGE shows Not available yet. A shown link can still be unavailable."
        )
        .font(.footnote)
        .foregroundStyle(Color.secondary)
        .fixedSize(horizontal: false, vertical: true)
      }
    }
    .accessibilityIdentifier("privacy-support.public-links")
  }
}

private struct PrivacyFactRow: View {
  let title: String
  let detail: String

  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text(title)
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(Color.primary)
        .fixedSize(horizontal: false, vertical: true)

      Text(detail)
        .font(.body)
        .foregroundStyle(Color.secondary)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(title)
    .accessibilityValue(detail)
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
          .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
          .contentShape(Rectangle())
          .fixedSize(horizontal: false, vertical: true)
      }
      .accessibilityIdentifier("\(identifier).link")
      .accessibilityHint("Opens the public \(title.lowercased()) in a browser.")
    } else {
      PrivacyFactRow(
        title: title,
        detail: "Not available yet"
      )
      .accessibilityIdentifier("\(identifier).not-configured")
      .accessibilityHint("No public \(title.lowercased()) link is available.")
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

#Preview("Privacy and Support — Accessibility XL") {
  NavigationStack {
    PrivacySupportView(
      privacyPolicyValue: "https://forgelearning.org/privacy",
      supportValue: "https://forgelearning.org/support"
    )
  }
  .environment(AppModel.preview())
  .environment(\.dynamicTypeSize, .accessibility3)
}
