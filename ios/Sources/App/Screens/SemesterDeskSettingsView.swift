import ForgeCore
import Foundation
import SwiftUI
import UIKit
import UniformTypeIdentifiers

struct SemesterDeskSettingsView: View {
  private enum StatusFocus: Hashable {
    case reminder
    case export
  }

  @Environment(AppModel.self) private var model
  @State private var clearConfirmationIsPresented = false
  @State private var exportDocument: SemesterDeskExportDocument?
  @State private var exportIsPresented = false
  @State private var exportStatusMessage: String?
  @State private var pendingReminderStatusMessage: String?
  @State private var reminderOperationWasObserved = false
  @State private var reminderAnnouncementGeneration = 0
  @State private var exportAnnouncementGeneration = 0
  @AccessibilityFocusState private var statusFocus: StatusFocus?

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
        "FORGE cannot restore cleared Semester Desk data. This action removes local reminders and shared widget data."
      )
    }
    .fileExporter(
      isPresented: $exportIsPresented,
      document: exportDocument,
      contentType: .json,
      defaultFilename: exportDocument?.export.filename
    ) { result in
      switch result {
      case .success:
        setExportStatus("The local Semester Desk export is ready.")
      case .failure:
        setExportStatus("FORGE could not export the local Semester Desk.")
      }
      exportDocument = nil
    }
    .onChange(of: model.reminderStatusMessage, initial: false) { _, message in
      updateReminderStatusAnnouncement(for: message)
    }
    .onChange(of: model.isReminderOperationRunning, initial: true) { _, isRunning in
      updateReminderOperationState(isRunning)
    }
    .accessibilityIdentifier("semester-settings.screen")
  }

  private var reminderSection: some View {
    Section {
      Toggle(
        "Local return reminder",
        isOn: Binding(
          get: { model.remindersEnabled },
          set: { model.setRemindersEnabled($0) }
        )
      )
      .disabled(
        model.isReminderOperationRunning
          || (!model.remindersEnabled && !model.canEnableReminders)
      )
      .accessibilityIdentifier("semester-settings.reminder-toggle")

      if let reminderDate = model.semesterDeskReminderDate {
        LabeledContent(
          "Come back on this date",
          value: reminderDate.formatted(date: .long, time: .shortened)
        )
      } else {
        LabeledContent("Come back on this date", value: "No return date")
      }

      LabeledContent("Permission", value: model.reminderPermissionLabel)
      LabeledContent(
        "Reminder status",
        value: model.remindersEnabled ? "Enabled" : "Disabled"
      )

      if model.isReminderOperationRunning {
        ProgressView("Updating the local reminder")
          .accessibilityIdentifier("semester-settings.reminder-progress")
      }

      if let message = model.reminderStatusMessage, !message.isEmpty {
        Text(message)
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityFocused($statusFocus, equals: .reminder)
          .accessibilityIdentifier("semester-settings.reminder-status")
      }

      if model.reminderAuthorizationStatus == .denied,
        let settingsURL = URL(string: UIApplication.openSettingsURLString)
      {
        Link("Open iOS Settings", destination: settingsURL)
          .frame(minHeight: 44)
          .accessibilityHint("Opens notification permission in iOS Settings.")
          .accessibilityIdentifier("semester-settings.open-ios-settings")
      }
    } header: {
      Text("Return reminder")
    } footer: {
      Text("FORGE schedules one local reminder at the earliest return date. iOS controls delivery.")
    }
  }

  private var exportSection: some View {
    Section {
      Button {
        do {
          let export = try model.makeSemesterDeskLocalExport()
          exportDocument = SemesterDeskExportDocument(export: export)
          exportAnnouncementGeneration += 1
          exportStatusMessage = nil
          exportIsPresented = true
        } catch {
          exportDocument = nil
          setExportStatus("FORGE could not prepare the local Semester Desk export.")
        }
      } label: {
        Label("Export Semester Desk", systemImage: "square.and.arrow.up")
          .frame(minHeight: 44)
      }
      .accessibilityLabel("Export local Semester Desk JSON")
      .accessibilityHint("Opens the iOS file export dialog.")
      .accessibilityIdentifier("semester-settings.export")

      if let exportStatusMessage {
        Text(exportStatusMessage)
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityFocused($statusFocus, equals: .export)
          .accessibilityIdentifier("semester-settings.export-status")
      }
    } header: {
      Text("Export")
    } footer: {
      Text("The export contains the validated Semester Desk and local reminder preference.")
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

  private var applicationVersion: String {
    let version =
      Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
      ?? "Unknown"
    let build =
      Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String
      ?? "Unknown"
    return "\(version) (\(build))"
  }

  private func updateReminderStatusAnnouncement(for message: String?) {
    guard let message, !message.isEmpty else {
      pendingReminderStatusMessage = nil
      reminderAnnouncementGeneration += 1
      if statusFocus == .reminder {
        statusFocus = nil
      }
      return
    }

    guard !model.isReminderOperationRunning, !reminderOperationWasObserved else {
      pendingReminderStatusMessage = message
      return
    }

    announceReminderStatus(message)
  }

  private func updateReminderOperationState(_ isRunning: Bool) {
    guard !isRunning else {
      reminderOperationWasObserved = true
      pendingReminderStatusMessage = nil
      reminderAnnouncementGeneration += 1
      if statusFocus == .reminder {
        statusFocus = nil
      }
      return
    }

    announcePendingReminderStatus()
  }

  private func announcePendingReminderStatus() {
    guard reminderOperationWasObserved else {
      return
    }
    reminderOperationWasObserved = false

    guard
      !model.isLocalDataResetRunning,
      let message = pendingReminderStatusMessage ?? model.reminderStatusMessage,
      !message.isEmpty,
      model.reminderStatusMessage == message
    else {
      pendingReminderStatusMessage = nil
      return
    }

    pendingReminderStatusMessage = nil
    announceReminderStatus(message)
  }

  private func announceReminderStatus(_ message: String) {
    reminderAnnouncementGeneration += 1
    let generation = reminderAnnouncementGeneration
    statusFocus = nil

    Task { @MainActor in
      await Task.yield()
      guard
        generation == reminderAnnouncementGeneration,
        !model.isReminderOperationRunning,
        !model.isLocalDataResetRunning,
        model.reminderStatusMessage == message
      else {
        return
      }

      statusFocus = .reminder
      AccessibilityNotification.Announcement(message).post()
    }
  }

  private func setExportStatus(_ message: String) {
    exportStatusMessage = message
    exportAnnouncementGeneration += 1
    let generation = exportAnnouncementGeneration
    statusFocus = nil

    Task { @MainActor in
      await Task.yield()
      guard
        generation == exportAnnouncementGeneration,
        exportStatusMessage == message
      else {
        return
      }

      statusFocus = .export
      AccessibilityNotification.Announcement(message).post()
    }
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
