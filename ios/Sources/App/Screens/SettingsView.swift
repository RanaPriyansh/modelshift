import ForgeCore
import SwiftUI

struct SettingsView: View {
  @Environment(AppModel.self) private var model
  @State private var isClearDataConfirmationPresented = false

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

        if model.isReminderOperationRunning {
          ProgressView("Updating reminders")
        }

        if let status = model.reminderStatusMessage {
          Text(status)
            .foregroundStyle(.secondary)
        }
      } header: {
        Text("Return reminders")
      } footer: {
        Text(model.reminderBoundaryText)
      }

      Section("Privacy") {
        LabeledContent("Learner mode") {
          Text(model.snapshot.mode.title)
        }

        Label(model.snapshot.mode.dataBoundary, systemImage: "lock.shield")

        LabeledContent("Cloud sync", value: "Off")
        LabeledContent("Analytics", value: "Off")
        LabeledContent("Lock Screen details", value: "Hidden")

        Text("FORGE stores learning data in the private app group on this device.")
          .foregroundStyle(.secondary)
      }

      Section("Learning setup") {
        Button("Review onboarding") {
          model.reviewOnboarding()
        }
      }

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

        if model.isLocalDataResetRunning {
          ProgressView("Clearing local data")
        }
      } header: {
        Text("Local data")
      } footer: {
        Text(
          "This deletes the goal, setup, path, local evidence, pending route, and reminder preference from this device."
        )
      }

      Section("Evidence boundary") {
        Text("Privacy settings cannot create, upgrade, or share evidence.")
          .foregroundStyle(.secondary)
      }
    }
    .navigationTitle("Settings")
    .alert(
      "Clear local learning data?",
      isPresented: $isClearDataConfirmationPresented
    ) {
      Button("Cancel", role: .cancel) {}
      Button("Clear data", role: .destructive) {
        model.clearLocalData()
      }
    } message: {
      Text(
        "This action deletes local learning data and scheduled reminders. You cannot undo this action."
      )
    }
  }
}

#Preview {
  NavigationStack {
    SettingsView()
  }
  .environment(AppModel.preview())
}
