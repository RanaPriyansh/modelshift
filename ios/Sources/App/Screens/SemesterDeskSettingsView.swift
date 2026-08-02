import ForgeCore
import Foundation
import SwiftUI

struct SemesterDeskSettingsView: View {
  @Environment(AppModel.self) private var model
  @State private var clearConfirmationIsPresented = false

  var body: some View {
    List {
      reminderSection
      exportSection
      privacySection
      localDataSection
      aboutSection
    }
    .listStyle(.insetGrouped)
    .scrollContentBackground(.hidden)
    .background(ForgeDesign.canvas)
    .navigationTitle("Settings")
    .toolbar(.hidden, for: .tabBar)
    .alert(
      "Clear local data?",
      isPresented: $clearConfirmationIsPresented
    ) {
      Button("Cancel", role: .cancel) {}
      Button("Clear local data", role: .destructive) {
        model.clearLocalData()
      }
    } message: {
      Text(
        "FORGE cannot restore cleared Semester Desk data. It also removes managed local reminders and shared return state."
      )
    }
    .accessibilityIdentifier("semester-settings.screen")
  }

  private var reminderSection: some View {
    Section {
      if let delayedReturn = earliestIncompleteReturn {
        LabeledContent(
          "Return date",
          value: SemesterDeskDisplay.dateTime(delayedReturn.dueAt)
        )

        LabeledContent("Permission", value: "Not checked for Semester Desk")
        LabeledContent("Reminder status", value: "Not available in this build")

        Text(
          "FORGE does not schedule a Semester Desk reminder until native reminder integration is available."
        )
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
      } else {
        LabeledContent("Permission", value: "Not checked for Semester Desk")
        LabeledContent("Reminder status", value: "No return needs a reminder")
      }
    } header: {
      Text("Return reminder")
    } footer: {
      Text("iOS controls notification permission and delivery.")
    }
  }

  private var exportSection: some View {
    Section {
      LabeledContent("Download or export", value: "Not available")

      Text("FORGE does not show an export action until a supported private export exists.")
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    } header: {
      Text("Export")
    }
  }

  private var privacySection: some View {
    Section {
      NavigationLink(value: AppRoute.privacySupport) {
        Label("Privacy and support", systemImage: "hand.raised")
          .frame(minHeight: 44)
      }
      .accessibilityHint("Opens Semester Desk privacy and support information.")
      .accessibilityIdentifier("semester-settings.privacy-support")

      Text("Web and iPhone data do not sync.")
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)

      Text("Raw practice and proof text is not saved.")
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
    } header: {
      Text("Privacy")
    }
  }

  private var localDataSection: some View {
    Section {
      Button("Clear local data", role: .destructive) {
        clearConfirmationIsPresented = true
      }
      .frame(minHeight: 44)
      .disabled(model.isLocalDataResetRunning)
      .accessibilityHint("Opens a destructive confirmation alert.")
      .accessibilityIdentifier("semester-settings.clear-local-data")

      if model.isLocalDataResetRunning {
        ProgressView("Clearing local data")
          .accessibilityIdentifier("semester-settings.clear-progress")
      }

      if let message = model.localDataResetStatusMessage, !message.isEmpty {
        Text(message)
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityIdentifier("semester-settings.clear-status")
      }
    } header: {
      Text("Local data")
    } footer: {
      Text("This action removes the local Semester Desk from this iPhone.")
    }
  }

  private var aboutSection: some View {
    Section("About") {
      LabeledContent("Application", value: "FORGE")
      LabeledContent("Version", value: applicationVersion)
    }
  }

  private var earliestIncompleteReturn: UniversitySemesterDeskDelayedReturn? {
    model.semesterDesk?.delayedReturns
      .filter { $0.status != .completed }
      .sorted { $0.dueAt < $1.dueAt }
      .first
  }

  private var applicationVersion: String {
    let version =
      Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
      ?? "Unknown"
    let build =
      Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String
      ?? "Unknown"
    return "\(version) (\(build))"
  }
}

struct SemesterDeskPrivacySupportView: View {
  private let privacyPolicyURL = ForgePublicWebURL.validated(
    Bundle.main.object(forInfoDictionaryKey: "FORGEPrivacyPolicyURL") as? String
  )
  private let supportURL = ForgePublicWebURL.validated(
    Bundle.main.object(forInfoDictionaryKey: "FORGESupportURL") as? String
  )

  var body: some View {
    List {
      Section("Your data") {
        privacyRow(
          title: "Local Semester Desk",
          detail: "Your Semester Desk stays on this iPhone."
        )
        privacyRow(
          title: "No web sync",
          detail: "Web and iPhone data do not sync."
        )
        privacyRow(
          title: "Private study text",
          detail:
            "FORGE keeps raw practice and proof text in process memory only. FORGE does not save this text."
        )
        privacyRow(
          title: "Learning history",
          detail: "FORGE saves answer-free outcomes and dates. One record does not prove mastery."
        )
      }

      Section("Service limits") {
        privacyRow(
          title: "No AI service",
          detail: "This Semester Desk does not use an AI service."
        )
        privacyRow(
          title: "No official authority",
          detail: "Local learning history is not an official university record or credential."
        )
        privacyRow(
          title: "Reminder delivery",
          detail:
            "iOS controls notification permission and delivery. FORGE does not promise delivery."
        )
      }

      Section("Public information") {
        publicLink(
          title: "Privacy policy",
          url: privacyPolicyURL,
          identifier: "semester-privacy.policy"
        )
        publicLink(
          title: "Support",
          url: supportURL,
          identifier: "semester-privacy.support"
        )

        Text("FORGE does not attach Semester Desk data to these public links.")
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .listStyle(.insetGrouped)
    .scrollContentBackground(.hidden)
    .background(ForgeDesign.canvas)
    .navigationTitle("Privacy and Support")
    .toolbar(.hidden, for: .tabBar)
    .accessibilityIdentifier("semester-privacy.screen")
  }

  private func privacyRow(title: String, detail: String) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text(title)
        .font(.headline)
      Text(detail)
        .font(.body)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(.vertical, ForgeDesign.Spacing.tight)
    .accessibilityElement(children: .combine)
  }

  @ViewBuilder
  private func publicLink(
    title: String,
    url: URL?,
    identifier: String
  ) -> some View {
    if let url {
      Link(destination: url) {
        Label(title, systemImage: "arrow.up.right.square")
          .frame(minHeight: 44)
      }
      .accessibilityHint("Opens the public \(title.lowercased()) in a browser.")
      .accessibilityIdentifier("\(identifier).link")
    } else {
      LabeledContent(title, value: "Not available")
        .frame(minHeight: 44)
        .accessibilityIdentifier("\(identifier).unavailable")
    }
  }
}
