import ForgeCore
import SwiftUI

struct SettingsView: View {
  @Environment(AppModel.self) private var model
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  var body: some View {
    Form {
      Section {
        if model.snapshot.mode == .childWithAdult {
          Toggle(
            "A grown-up manages reminders",
            isOn: Binding(
              get: { model.grownUpManagesReminders },
              set: { model.setGrownUpManagesReminders($0) }
            )
          )
          .disabled(
            model.isReminderOperationRunning
              || model.isLocalDataResetRunning
          )
          .accessibilityIdentifier("settings.grown-up-reminders")
        }

        Toggle(
          "Return reminders",
          isOn: Binding(
            get: { model.remindersEnabled },
            set: { model.setRemindersEnabled($0) }
          )
        )
        .disabled(
          model.isReminderOperationRunning
            || model.isLocalDataResetRunning
            || (!model.remindersEnabled && !model.canEnableReminders)
        )
        .accessibilityIdentifier("settings.return-reminders")

        if model.isReminderOperationRunning {
          ProgressView("Updating reminders")
        }

        if let status = model.reminderStatusMessage {
          Text(status)
            .foregroundStyle(ForgeDesign.secondaryText)
        }
      } header: {
        Text("Return reminders")
          .foregroundStyle(ForgeDesign.secondaryText)
      } footer: {
        Text(model.reminderBoundaryText)
          .foregroundStyle(ForgeDesign.secondaryText)
      }

      Section {
        NavigationLink {
          PrivacySupportView()
        } label: {
          Label("Privacy and Support", systemImage: "hand.raised")
        }
        .accessibilityHint(
          "Opens device data, privacy, support, and local deletion information."
        )
        .accessibilityIdentifier("settings.privacy-support")

        LabeledContent("Learner mode") {
          Text(model.snapshot.mode.title)
        }

        learnerModeDataBoundary

        LabeledContent("Cloud sync", value: "Off")
        LabeledContent("Analytics", value: "Off")
        LabeledContent("Lock Screen details", value: "Hidden")

        Text("FORGE stores learning data in a device-local app group.")
          .foregroundStyle(ForgeDesign.secondaryText)
          .accessibilityIdentifier("settings.storage-boundary-visual")
      } header: {
        Text("Privacy")
          .foregroundStyle(ForgeDesign.secondaryText)
      }

      Section {
        Button("Review onboarding") {
          model.reviewOnboarding()
        }
        .accessibilityIdentifier("settings.review-onboarding")
      } header: {
        Text("Learning setup")
          .foregroundStyle(ForgeDesign.secondaryText)
          .accessibilityIdentifier("settings.learning-setup-header-visual")
      }

      LocalDataDeletionSection(identifierPrefix: "settings")

      Section {
        Text("Privacy settings cannot create, upgrade, or share evidence.")
          .foregroundStyle(ForgeDesign.secondaryText)
          .accessibilityIdentifier("settings.evidence-boundary-visual")
      } header: {
        Text("Evidence boundary")
          .foregroundStyle(ForgeDesign.secondaryText)
          .accessibilityIdentifier("settings.evidence-boundary-header-visual")
      }
    }
    .navigationTitle("Settings")
  }

  @ViewBuilder
  private var learnerModeDataBoundary: some View {
    if dynamicTypeSize.isAccessibilitySize {
      Text(model.snapshot.mode.dataBoundary)
        .fixedSize(horizontal: false, vertical: true)
    } else {
      Label(model.snapshot.mode.dataBoundary, systemImage: "lock.shield")
        .fixedSize(horizontal: false, vertical: true)
    }
  }
}

#Preview {
  NavigationStack {
    SettingsView()
  }
  .environment(AppModel.preview())
}
