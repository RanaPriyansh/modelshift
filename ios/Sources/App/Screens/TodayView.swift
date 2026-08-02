import ForgeCore
import SwiftUI

struct TodayView: View {
  @Environment(AppModel.self) private var model
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @ScaledMetric(relativeTo: .body) private var bottomContentClearance: CGFloat = 88

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.large) {
        activityContent
        courseContext

        if let message = model.localIntegrationStatusMessage {
          localIntegrationStatus(message)
        }

        if let message = model.localPersistenceStatusMessage {
          localIntegrationStatus(message)
        }

        sourceAndLocalLimits
      }
      .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth, alignment: .leading)
      .padding(.horizontal, ForgeDesign.Spacing.regular)
      .padding(.vertical, ForgeDesign.Spacing.large)
      .frame(maxWidth: .infinity)
    }
    .contentMargins(.bottom, bottomContentClearance, for: .scrollContent)
    .background(ForgeDesign.canvas)
    .navigationTitle("Today")
    .transaction { transaction in
      if reduceMotion {
        transaction.animation = nil
        transaction.disablesAnimations = true
      }
    }
    .onChange(of: model.localIntegrationStatusMessage, initial: false) { oldMessage, newMessage in
      announceLocalIntegrationStatusChange(from: oldMessage, to: newMessage)
    }
    .onChange(of: model.localPersistenceStatusMessage, initial: false) {
      oldMessage,
      newMessage in
      announceLocalIntegrationStatusChange(from: oldMessage, to: newMessage)
    }
    .onChange(of: model.isCourseReviewRunning, initial: false) { _, isRunning in
      announceCourseReviewProgress(isRunning)
    }
  }

  private var courseContext: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      Divider()

      UniversitySectionLabel(title: "Course context")

      Text(model.courseTitle)
        .font(.headline.weight(.semibold))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
        .accessibilityIdentifier("today.course-title")

      Text(model.courseSummary)
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)

      UniversityMetadataRow(
        label: "Last local update",
        value: exactDateTime(model.learnerState.updatedAt)
      )
      .accessibilityIdentifier("today.updated-at-visual")

      reviewCourseSetupButton
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .contain)
  }

  @ViewBuilder
  private var activityContent: some View {
    if let experience = model.experience {
      activeActivityCard(experience)
    } else if let message = model.experienceErrorMessage {
      activityUnavailableCard(message)
    } else {
      activityUnavailableCard("Current activity data is not available.")
    }
  }

  private func activeActivityCard(
    _ experience: UniversityExperienceProjection.Projection
  ) -> some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
        UniversitySectionLabel(title: "Next action")

        nextActionContent(for: experience)

        Divider()

        UniversitySectionLabel(title: "Activity details")

        UniversityMetadataRow(
          label: "Activity kind",
          value: activityKindText(for: experience.activeActivity.kind)
        )

        UniversityMetadataRow(
          label: "Activity state",
          value: activityStateText(for: experience.nextActionState)
        )
        .accessibilityIdentifier("today.activity-state-active")

        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
          Text("Prompt")
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(ForgeDesign.secondaryText)

          Text(experience.activeActivity.prompt)
            .font(.body)
            .fixedSize(horizontal: false, vertical: true)
        }
      }
    }
  }

  private func activityUnavailableCard(_ message: String) -> some View {
    UniversitySurface {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
        UniversitySectionLabel(title: "Next action")

        Text(message)
          .font(.body)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityIdentifier("today.activity-state-unavailable")

        activityAccessButton(
          title: "Open current activity",
          hint: "Activity data is not available.",
          isEnabled: false
        )
      }
    }
  }

  @ViewBuilder
  private func nextActionContent(
    for experience: UniversityExperienceProjection.Projection
  ) -> some View {
    switch experience.nextActionState {
    case .activeActivity:
      currentActivityAction

    case .delayedReturn:
      if let delayedReturn = model.currentDelayedReturn {
        delayedReturnAction(delayedReturn)
      } else {
        delayedReturnAccess(
          message: "Delayed return data is not available.",
          isEnabled: false
        )
      }
    }
  }

  private var currentActivityAction: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      activityAccessButton(
        title: "Open current activity",
        hint: model.canPresentCurrentActivity
          ? "Opens the current activity."
          : "Activity access is not available.",
        isEnabled: model.canPresentCurrentActivity
      )

      Text(
        model.canPresentCurrentActivity
          ? "This activity is ready to open."
          : "Activity access is not available."
      )
      .font(.subheadline)
      .foregroundStyle(ForgeDesign.secondaryText)
    }
  }

  private func delayedReturnAction(
    _ delayedReturn: UniversityExperienceProjection.DelayedReturnRow
  ) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      delayedReturnActionDetails(for: delayedReturn.status)

      UniversityMetadataRow(
        label: "Return state",
        value: delayedReturnStateText(for: delayedReturn.status)
      )
      .accessibilityIdentifier("today.return-status-visual")

      UniversityMetadataRow(
        label: "Opens",
        value: exactDateTime(delayedReturn.opensAt)
      )
      .accessibilityIdentifier("today.return-opens-at")

      UniversityMetadataRow(
        label: "Due",
        value: exactDateTime(delayedReturn.dueAt)
      )
      .accessibilityIdentifier("today.return-date-visual")
    }
  }

  @ViewBuilder
  private func delayedReturnActionDetails(
    for status: DelayedReturnStatus
  ) -> some View {
    switch status {
    case .scheduled:
      delayedReturnAccess(
        message: "The return is scheduled.",
        isEnabled: false
      )

    case .open:
      delayedReturnAccess(
        message: "The return is open.",
        isEnabled: model.canPresentCurrentActivity
      )

    case .due:
      delayedReturnAccess(
        message: "The return is due.",
        isEnabled: model.canPresentCurrentActivity
      )

    case .expired:
      delayedReturnAccess(
        message: "The return window is closed.",
        isEnabled: false
      )

    case .completed:
      delayedReturnAccess(
        message: "The return is recorded.",
        isEnabled: false
      )
    }
  }

  private func delayedReturnAccess(
    message: String,
    isEnabled: Bool
  ) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      activityAccessButton(
        title: "Open delayed return",
        hint: isEnabled
          ? "Opens the delayed return activity."
          : "This delayed return cannot open now.",
        isEnabled: isEnabled
      )

      Text(message)
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
    }
  }

  private func activityAccessButton(
    title: String,
    hint: String,
    isEnabled: Bool
  ) -> some View {
    Button {
      model.presentActivity()
    } label: {
      Label(title, systemImage: "arrow.right.circle.fill")
        .frame(maxWidth: .infinity)
        .frame(minHeight: 48)
        .fixedSize(horizontal: false, vertical: true)
        .multilineTextAlignment(.center)
    }
    .buttonStyle(ForgeCommitmentButtonStyle())
    .disabled(!isEnabled)
    .accessibilityHint(hint)
    .accessibilityIdentifier("today.open-activity")
  }

  private var reviewCourseSetupButton: some View {
    Button {
      Task { @MainActor in
        await model.reviewCourseSetup()
      }
    } label: {
      HStack(spacing: ForgeDesign.Spacing.small) {
        if model.isCourseReviewRunning {
          ProgressView()
            .controlSize(.small)
            .accessibilityHidden(true)
        } else {
          Image(systemName: "slider.horizontal.3")
            .accessibilityHidden(true)
        }

        Text(
          model.isCourseReviewRunning
            ? "Opening course setup\u{2026}"
            : "Review course setup"
        )
        .frame(maxWidth: .infinity, alignment: .leading)
        .fixedSize(horizontal: false, vertical: true)
        .multilineTextAlignment(.leading)
      }
    }
    .buttonStyle(ForgeSecondaryButtonStyle())
    .disabled(model.isCourseReviewRunning)
    .accessibilityLabel(
      model.isCourseReviewRunning ? "Opening course setup" : "Review course setup"
    )
    .accessibilityValue(model.isCourseReviewRunning ? "In progress" : "")
    .accessibilityHint(
      model.isCourseReviewRunning
        ? "FORGE is opening the local course setup."
        : "Opens the local course setup."
    )
    .accessibilityIdentifier("today.change-direction")
  }

  private func localIntegrationStatus(_ message: String) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      Divider()

      UniversitySectionLabel(title: "Local data status")

      Text(message)
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .contain)
  }

  private func announceLocalIntegrationStatusChange(
    from oldMessage: String?,
    to newMessage: String?
  ) {
    guard oldMessage != newMessage, let newMessage, !newMessage.isEmpty else {
      return
    }

    AccessibilityNotification.Announcement(newMessage).post()
  }

  private func announceCourseReviewProgress(_ isRunning: Bool) {
    guard isRunning else {
      return
    }

    AccessibilityNotification.Announcement(
      "Opening local course setup."
    ).post()
  }

  private var sourceAndLocalLimits: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      Divider()

      UniversitySectionLabel(title: "Source and local limits")

      Text(sourceProvenanceMessage)
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)

      Text("Activity records stay on this device. They do not establish a learning result.")
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityIdentifier("today.boundary-copy-visual")
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .contain)
  }

  private var sourceProvenanceMessage: String {
    model.catalog.sourceBindings.contains { $0.provenance == .provenanceIncomplete }
      ? "Source provenance is incomplete."
      : "Source provenance is recorded in the local course data."
  }

  private func activityStateText(
    for nextActionState: UniversityExperienceProjection.NextActionState
  ) -> String {
    switch nextActionState {
    case .activeActivity:
      "Active"

    case .delayedReturn(let status):
      delayedReturnStateText(for: status)
    }
  }

  private func activityKindText(for kind: ActivityKind) -> String {
    switch kind {
    case .practice:
      "Practice"

    case .proof:
      "Independent check"

    case .delayedReturn:
      "Delayed return"
    }
  }

  private func delayedReturnStateText(for status: DelayedReturnStatus) -> String {
    switch status {
    case .scheduled:
      "Scheduled"

    case .open:
      "Open"

    case .due:
      "Due"

    case .expired:
      "Window closed"

    case .completed:
      "Return recorded"
    }
  }

  private func exactDateTime(_ date: Date) -> String {
    date.formatted(date: .long, time: .shortened)
  }
}
