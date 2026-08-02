import ForgeCore
import SwiftUI

struct SettingsView: View {
  @Environment(AppModel.self) private var model
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @State private var isTechnicalDetailsExpanded = false

  var body: some View {
    ScrollView {
      LazyVStack(alignment: .leading, spacing: ForgeDesign.Spacing.large) {
        reminderSurface
        packageSurface
        privacySupportSurface
      }
      .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth, alignment: .leading)
      .padding(.horizontal, ForgeDesign.Spacing.regular)
      .padding(.vertical, ForgeDesign.Spacing.large)
      .frame(maxWidth: .infinity)
    }
    .background(ForgeDesign.canvas)
    .navigationTitle("Settings")
    .toolbar(.hidden, for: .tabBar)
    .onChange(of: model.reminderStatusMessage, initial: false) { oldMessage, newMessage in
      announceStatusChange(from: oldMessage, to: newMessage)
    }
  }

  private var reminderSurface: some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
        reminderHeading

        Toggle(
          "Return reminder",
          isOn: Binding(
            get: { model.remindersEnabled },
            set: { model.setRemindersEnabled($0) }
          )
        )
        .toggleStyle(.switch)
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        .contentShape(Rectangle())
        .disabled(isReminderToggleDisabled)
        .accessibilityLabel("Return reminder")
        .accessibilityValue(model.remindersEnabled ? "On" : "Off")
        .accessibilityHint(reminderToggleHint)
        .accessibilityIdentifier("settings.return-reminders")

        if model.isReminderOperationRunning {
          Label("Updating return reminder", systemImage: "arrow.triangle.2.circlepath")
            .font(.subheadline)
            .foregroundStyle(ForgeDesign.secondaryText)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityElement(children: .combine)
        }

        if let statusMessage = model.reminderStatusMessage {
          Text(statusMessage)
            .font(.subheadline)
            .foregroundStyle(ForgeDesign.secondaryText)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityIdentifier("settings.reminder-status")
        }

        reminderGuidance
      }
    }
  }

  @ViewBuilder
  private var reminderHeading: some View {
    if dynamicTypeSize.isAccessibilitySize {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        UniversitySectionLabel(title: "Return reminder")
        UniversityStatusBadge(
          label: "On device",
          symbolName: "iphone",
          colorRole: .information
        )
      }
    } else {
      HStack(alignment: .firstTextBaseline, spacing: ForgeDesign.Spacing.regular) {
        UniversitySectionLabel(title: "Return reminder")
        Spacer(minLength: ForgeDesign.Spacing.small)
        UniversityStatusBadge(
          label: "On device",
          symbolName: "iphone",
          colorRole: .information
        )
      }
    }
  }

  private var reminderGuidance: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      if let delayedReturn = model.currentDelayedReturn {
        UniversityMetadataRow(
          label: "Return opens",
          value: delayedReturn.opensAt.formatted(date: .long, time: .shortened)
        )

        UniversityMetadataRow(
          label: "Return state",
          value: returnStateText(for: delayedReturn.status)
        )
      }

      Text(model.reminderBoundaryText)

      Text("FORGE requests one generic local reminder for the return opening time.")

      Text(
        "If the return opens from 21:00–08:59, FORGE moves the reminder to 09:00 local time."
      )

      Text("iOS controls notification delivery. FORGE does not promise notification delivery.")
    }
    .font(.subheadline)
    .foregroundStyle(ForgeDesign.secondaryText)
    .fixedSize(horizontal: false, vertical: true)
    .accessibilityElement(children: .combine)
    .accessibilityIdentifier("settings.reminder-guidance")
  }

  private var packageSurface: some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
        UniversitySectionLabel(title: "Local package")

        Text(model.courseTitle)
          .font(.title3.weight(.semibold))
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityAddTraits(.isHeader)

        UniversityMetadataRow(
          label: "Package",
          value: "\(model.courseTitle) · Version \(model.catalog.package.version)"
        )

        technicalDetails

        provenanceBoundary
      }
    }
  }

  private var technicalDetails: some View {
    DisclosureGroup(isExpanded: $isTechnicalDetailsExpanded) {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        UniversityMetadataRow(
          label: "Package identifier",
          value: model.catalog.package.packageID.rawValue
        )
        .accessibilityLabel("Package identifier")
        .accessibilityIdentifier("settings.package-id")

        UniversityMetadataRow(
          label: "Package digest",
          value: model.catalog.package.digest.hex
        )
        .accessibilityLabel("Package digest")
        .accessibilityIdentifier("settings.package-digest")

        Text("These values identify a local package. They do not create credentials.")
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityIdentifier("settings.package-no-credential-boundary")
      }
      .padding(.top, ForgeDesign.Spacing.tight)
    } label: {
      Text("Technical details")
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        .contentShape(Rectangle())
    }
    .accessibilityLabel("Technical details")
    .accessibilityValue(isTechnicalDetailsExpanded ? "Expanded" : "Collapsed")
    .accessibilityHint("Shows the local package identifier and digest.")
    .accessibilityIdentifier("settings.package-technical-details")
  }

  private var privacySupportSurface: some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
        UniversitySectionLabel(title: "Privacy and Support")

        NavigationLink(value: AppRoute.privacySupport) {
          Label("Open privacy and support", systemImage: "hand.raised")
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .contentShape(Rectangle())
        }
        .accessibilityHint("Opens privacy and support information.")
        .accessibilityIdentifier("settings.privacy-support")
      }
    }
  }

  private var isReminderToggleDisabled: Bool {
    if model.isReminderOperationRunning || model.isLocalDataResetRunning {
      return true
    }

    guard let delayedReturn = model.currentDelayedReturn else {
      return true
    }

    return delayedReturn.status != .scheduled || !model.canEnableReminders
  }

  @ViewBuilder
  private var provenanceBoundary: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
          UniversityStatusBadge(
            label: "Source limit",
            symbolName: "exclamationmark.triangle.fill",
            colorRole: .caution
          )
          provenanceText
        }
      } else {
        HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
          UniversityStatusBadge(
            label: "Source limit",
            symbolName: "exclamationmark.triangle.fill",
            colorRole: .caution
          )
          provenanceText
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Caution. This local package has incomplete source provenance.")
  }

  private var provenanceText: some View {
    Text("This local package has incomplete source provenance.")
      .font(.subheadline)
      .foregroundStyle(ForgeDesign.secondaryText)
      .fixedSize(horizontal: false, vertical: true)
  }

  private var reminderToggleHint: String {
    if model.isReminderOperationRunning {
      return "FORGE is updating the return reminder. Wait for the update to finish."
    }

    if model.isLocalDataResetRunning {
      return "FORGE is resetting local data. Return reminders are not available."
    }

    guard let delayedReturn = model.currentDelayedReturn else {
      return "No delayed return is available. Return reminders are not available."
    }

    switch delayedReturn.status {
    case .scheduled:
      return model.canEnableReminders
        ? "This control requests one generic local reminder for the return opening time."
        : model.reminderBoundaryText
    case .completed:
      return "Return recorded. A new opening reminder is not available."
    case .expired:
      return "Window closed. A new opening reminder is not available."
    case .open:
      return "The return is open. A new opening reminder is not available."
    case .due:
      return "The return is due. A new opening reminder is not available."
    }
  }

  private func returnStateText(for status: DelayedReturnStatus) -> String {
    switch status {
    case .scheduled:
      return "Scheduled"
    case .open:
      return "Return open"
    case .due:
      return "Return due"
    case .expired:
      return "Window closed"
    case .completed:
      return "Return recorded"
    }
  }

  private func announceStatusChange(from oldMessage: String?, to newMessage: String?) {
    guard oldMessage != newMessage, let newMessage, !newMessage.isEmpty else {
      return
    }

    AccessibilityNotification.Announcement(newMessage).post()
  }
}
