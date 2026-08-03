import ForgeCore
import Foundation
import SwiftUI

enum SemesterDeskDisplay {
  static func duration(_ minutes: Int) -> String {
    let hours = minutes / 60
    let remainingMinutes = minutes % 60
    switch (hours, remainingMinutes) {
    case (0, let minutes):
      return "\(minutes) min"
    case (let hours, 0):
      return hours == 1 ? "1 hr" : "\(hours) hr"
    default:
      return "\(hours) hr \(remainingMinutes) min"
    }
  }

  static func date(_ dateOnly: String) -> String {
    let fields = dateOnly.split(separator: "-").compactMap { Int($0) }
    guard fields.count == 3 else {
      return dateOnly
    }
    var components = DateComponents()
    components.calendar = Calendar.autoupdatingCurrent
    components.timeZone = TimeZone.autoupdatingCurrent
    components.year = fields[0]
    components.month = fields[1]
    components.day = fields[2]
    guard let date = components.date else {
      return dateOnly
    }
    return date.formatted(date: .abbreviated, time: .omitted)
  }

  static func dateTime(_ timestamp: String) -> String {
    guard let date = timestampDate(timestamp) else {
      return timestamp
    }
    return date.formatted(date: .abbreviated, time: .shortened)
  }

  static func timestampDate(_ timestamp: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.date(from: timestamp)
  }

  static func dateOnly(_ date: Date, calendar: Calendar = .autoupdatingCurrent) -> String {
    let fields = calendar.dateComponents([.year, .month, .day], from: date)
    guard let year = fields.year, let month = fields.month, let day = fields.day else {
      return ""
    }
    return String(format: "%04d-%02d-%02d", year, month, day)
  }

  static func dateOnlyDate(
    _ value: String,
    calendar: Calendar = .autoupdatingCurrent
  ) -> Date? {
    let fields = value.split(separator: "-").compactMap { Int($0) }
    guard fields.count == 3 else {
      return nil
    }
    return calendar.date(
      from: DateComponents(
        calendar: calendar,
        timeZone: calendar.timeZone,
        year: fields[0],
        month: fields[1],
        day: fields[2],
        hour: 12
      )
    )
  }
}

extension UniversitySemesterDeskCourseFactStatus {
  var studentLabel: String {
    switch self {
    case .checked:
      "Checked"
    case .needsReview:
      "Needs review"
    case .notConfirmed:
      "Not yet confirmed"
    case .changedSinceLastCheck:
      "Changed since last check"
    }
  }

  var studentSymbolName: String {
    switch self {
    case .checked:
      "checkmark.seal"
    case .needsReview:
      "exclamationmark.triangle"
    case .notConfirmed:
      "questionmark.circle"
    case .changedSinceLastCheck:
      "arrow.triangle.2.circlepath"
    }
  }
}

extension UniversitySemesterDeskRecoveryOutcome {
  var studentLabel: String {
    switch self {
    case .moved:
      "Moved"
    case .reduced:
      "Reduced"
    case .kept:
      "Kept"
    case .deferred:
      "Deferred"
    }
  }
}

extension UniversitySemesterDeskPlanItemStatus {
  var studentLabel: String {
    switch self {
    case .planned:
      "Planned"
    case .deferred:
      "Deferred"
    case .inProgress:
      "Practice"
    case .practiceComplete:
      "Independent check"
    case .proofComplete:
      "Return scheduled"
    case .returnComplete:
      "Return completed"
    }
  }
}

struct SemesterDeskOperationStatus: View {
  @Environment(AppModel.self) private var model
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      Divider()

      if model.isSemesterDeskOperationRunning {
        Label {
          Text("Saving changes on this iPhone")
        } icon: {
          if reduceMotion {
            Image(systemName: "clock")
          } else {
            ProgressView()
              .controlSize(.small)
          }
        }
        .font(.subheadline)
        .accessibilityLabel("Saving changes on this iPhone")
        .accessibilityIdentifier("semester-desk.saving")
      } else if let message = model.semesterDeskStatusMessage, !message.isEmpty {
        Label(message, systemImage: "info.circle")
          .font(.subheadline)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityElement(children: .combine)
          .accessibilityIdentifier("semester-desk.status")
      }

      Label(
        "This Semester Desk stays on this iPhone. Web and iPhone data do not sync.",
        systemImage: "iphone"
      )
      .font(.subheadline)
      .foregroundStyle(ForgeDesign.secondaryText)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityElement(children: .combine)
      .accessibilityIdentifier("semester-desk.local-boundary")
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

struct SemesterDeskPrimaryButton: View {
  let title: String
  let systemImage: String
  let hint: String
  let identifier: String
  let isDisabled: Bool
  let action: @MainActor () -> Void

  var body: some View {
    Button(action: action) {
      Label(title, systemImage: systemImage)
        .frame(maxWidth: .infinity, minHeight: 48)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
    }
    .buttonStyle(ForgeCommitmentButtonStyle())
    .disabled(isDisabled)
    .accessibilityLabel(title)
    .accessibilityHint(hint)
    .accessibilityIdentifier(identifier)
  }
}

struct SemesterDeskSecondaryAction: View {
  let title: String
  let systemImage: String
  let hint: String
  let identifier: String
  let isDisabled: Bool
  let action: @MainActor () -> Void

  var body: some View {
    Button(action: action) {
      Label(title, systemImage: systemImage)
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        .contentShape(Rectangle())
        .fixedSize(horizontal: false, vertical: true)
    }
    .buttonStyle(.plain)
    .disabled(isDisabled)
    .accessibilityLabel(title)
    .accessibilityHint(hint)
    .accessibilityIdentifier(identifier)
  }
}

struct SemesterDeskFactStatusLabel: View {
  let status: UniversitySemesterDeskCourseFactStatus

  var body: some View {
    Label(status.studentLabel, systemImage: status.studentSymbolName)
      .font(.subheadline.weight(.semibold))
      .foregroundStyle(status == .checked ? ForgeDesign.checkedEvidence : ForgeDesign.text)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityElement(children: .combine)
  }
}

struct SemesterDeskFormStatus: View {
  @Environment(AppModel.self) private var model
  @AccessibilityFocusState private var statusIsFocused: Bool
  @State private var pendingStatusMessage: String?

  var body: some View {
    Group {
      if model.isSemesterDeskOperationRunning {
        ProgressView("Saving changes")
          .frame(maxWidth: .infinity, alignment: .leading)
          .accessibilityIdentifier("semester-desk.form-saving")
      } else if let message = model.semesterDeskStatusMessage, !message.isEmpty {
        Label(message, systemImage: "info.circle")
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.text)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityElement(children: .combine)
          .accessibilityFocused($statusIsFocused)
          .accessibilityIdentifier("semester-desk.form-status")
      }
    }
    .onChange(of: model.semesterDeskStatusMessage, initial: false) { _, message in
      updateStatusAnnouncement(for: message)
    }
    .onChange(of: model.isSemesterDeskOperationRunning, initial: false) { _, isRunning in
      guard !isRunning else {
        return
      }
      announcePendingStatusMessage()
    }
  }

  private func updateStatusAnnouncement(for message: String?) {
    guard let message, !message.isEmpty else {
      pendingStatusMessage = nil
      statusIsFocused = false
      return
    }

    statusIsFocused = false
    guard !model.isSemesterDeskOperationRunning else {
      pendingStatusMessage = message
      return
    }

    announce(message)
  }

  private func announcePendingStatusMessage() {
    guard
      let message = pendingStatusMessage,
      model.semesterDeskStatusMessage == message
    else {
      return
    }

    pendingStatusMessage = nil
    announce(message)
  }

  private func announce(_ message: String) {
    statusIsFocused = true
    AccessibilityNotification.Announcement(message).post()
  }
}
