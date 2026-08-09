import ForgeCore
import SwiftUI

struct TodayView: View {
  @Environment(AppModel.self) private var model
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    TimelineView(.periodic(from: .now, by: 60)) { _ in
      ScrollView {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.large) {
          semesterHeader
          nextAction
          SemesterDeskOperationStatus()
        }
        .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth, alignment: .leading)
        .padding(.horizontal, ForgeDesign.Spacing.regular)
        .padding(.vertical, ForgeDesign.Spacing.large)
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .safeAreaInset(edge: .bottom, spacing: 0) {
        if let action = model.semesterDeskTodayAction {
          primaryActionFooter(action)
        }
      }
      .background(ForgeDesign.canvas)
    }
    .navigationTitle("Today")
    .transaction { transaction in
      if reduceMotion {
        transaction.animation = nil
        transaction.disablesAnimations = true
      }
    }
    .onChange(of: model.semesterDeskStatusMessage, initial: false) { _, message in
      guard let message, !message.isEmpty else {
        return
      }
      AccessibilityNotification.Announcement(message).post()
    }
  }

  private var semesterHeader: some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      Text(model.semesterDesk?.title ?? "Semester Desk")
        .font(.largeTitle.weight(.bold))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
        .accessibilityIdentifier("today.semester-name")

      if let capacity = model.semesterDesk?.capacity {
        Label(
          "Confirmed capacity: \(SemesterDeskDisplay.duration(capacity.availableMinutes))",
          systemImage: "clock"
        )
        .font(.body)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("today.confirmed-capacity")
      } else {
        Label("Capacity is not yet confirmed", systemImage: "clock.badge.questionmark")
          .font(.body)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityElement(children: .combine)
          .accessibilityIdentifier("today.confirmed-capacity")
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private var nextAction: some View {
    if let action = model.semesterDeskTodayAction {
      actionSurface(action)
    } else {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
        Text("Today is not available")
          .font(.title2.weight(.semibold))
          .accessibilityAddTraits(.isHeader)

        Text("FORGE could not find a safe next action.")
          .font(.body)
          .foregroundStyle(ForgeDesign.secondaryText)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .accessibilityIdentifier("today.action-unavailable")
    }
  }

  private func actionSurface(_ action: SemesterDeskTodayAction) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      Label(actionHeading(action), systemImage: actionSymbol(action))
        .font(.title2.weight(.semibold))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
        .accessibilityIdentifier("today.primary-heading")

      if let item = planItem(for: action) {
        Text(item.title)
          .font(.headline)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityIdentifier("today.plan-item-title")

        if let course = course(for: item) {
          Text("\(course.code) · \(course.title)")
            .font(.subheadline)
            .foregroundStyle(ForgeDesign.secondaryText)
            .fixedSize(horizontal: false, vertical: true)
        }
      }

      Text(actionReason(action))
        .font(.body)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityIdentifier("today.primary-reason")
    }
    .padding(.vertical, ForgeDesign.Spacing.large)
    .overlay(alignment: .top) {
      Rectangle()
        .fill(actionBoundary(action))
        .frame(height: 3)
    }
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(ForgeDesign.boundary)
        .frame(height: 1)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("today.primary-action")
  }

  private func primaryActionFooter(_ action: SemesterDeskTodayAction) -> some View {
    primaryAction(action)
      .padding(.horizontal, ForgeDesign.Spacing.regular)
      .padding(.top, ForgeDesign.Spacing.small)
      .padding(.bottom, ForgeDesign.Spacing.regular)
      .frame(maxWidth: .infinity)
      .background(ForgeDesign.canvas)
      .overlay(alignment: .top) {
        Rectangle()
          .fill(ForgeDesign.boundary)
          .frame(height: 1)
      }
  }

  @ViewBuilder
  private func primaryAction(_ action: SemesterDeskTodayAction) -> some View {
    switch action {
    case .finishRecovery:
      primaryButton(
        title: "Review recovery changes",
        systemImage: "list.bullet.clipboard",
        hint: "Shows every proposed change before confirmation."
      ) {
        model.presentSemesterDeskSheet(.reviewRecovery)
      }

    case .delayedReturn(let delayedReturnID, let planItemID, _, let isDue):
      primaryButton(
        title: isDue ? "Open delayed return" : "Return is not open yet",
        systemImage: isDue ? "arrow.right.circle.fill" : "calendar.badge.clock",
        hint: isDue
          ? "Opens a fresh independent check."
          : "This return stays blocked until its saved date and time.",
        isDisabled: !isDue
      ) {
        Task { @MainActor in
          _ = await model.openProtectedDelayedReturn(
            delayedReturnID: delayedReturnID,
            planItemID: planItemID
          )
        }
      }

    case .selectedAction(let planItemID):
      let status = model.semesterDesk?.planItems.first { $0.id == planItemID }?.status
      if status == .planned {
        primaryButton(
          title: "Start protected study",
          systemImage: "arrow.right.circle.fill",
          hint: "Opens a quiet practice surface for this planned work."
        ) {
          Task { @MainActor in
            _ = await model.beginProtectedStudy(planItemID: planItemID)
          }
        }
      } else {
        primaryButton(
          title: "Continue protected study",
          systemImage: "arrow.right.circle.fill",
          hint: "Returns to the current protected study stage."
        ) {
          model.continueProtectedStudy(planItemID: planItemID)
        }
      }

    case .choosePlannedWork:
      primaryButton(
        title: "Choose planned work",
        systemImage: "checkmark.circle",
        hint: "Shows planned work in your authored order."
      ) {
        model.presentSemesterDeskSheet(.chooseNextAction)
      }

    case .confirmCapacity:
      primaryButton(
        title: "Confirm capacity",
        systemImage: "clock",
        hint: "Opens the capacity draft and confirmation steps."
      ) {
        model.presentSemesterDeskSheet(.capacity)
      }

    case .addPlannedWork(let courseID):
      primaryButton(
        title: "Add planned work",
        systemImage: "plus.circle",
        hint: "Adds one planned item to the semester."
      ) {
        model.presentSemesterDeskSheet(.addPlannedWork(courseID: courseID))
      }

    case .addCourse:
      primaryButton(
        title: "Add a course",
        systemImage: "plus.circle",
        hint: "Adds the first course to this Semester Desk."
      ) {
        model.presentSemesterDeskSheet(.addCourse)
      }
    }
  }

  private func primaryButton(
    title: String,
    systemImage: String,
    hint: String,
    isDisabled: Bool = false,
    action: @escaping @MainActor () -> Void
  ) -> some View {
    SemesterDeskPrimaryButton(
      title: title,
      systemImage: systemImage,
      hint: hint,
      identifier: "today.primary-button",
      isDisabled: isDisabled || model.isSemesterDeskOperationRunning,
      action: action
    )
  }

  private func actionHeading(_ action: SemesterDeskTodayAction) -> String {
    switch action {
    case .finishRecovery:
      "Recovery needs your review"
    case .delayedReturn:
      "Come back on this date"
    case .selectedAction:
      "Ready to work on"
    case .choosePlannedWork:
      "Your choice"
    case .confirmCapacity:
      "Confirm your available time"
    case .addPlannedWork:
      "Add the work you intend to do"
    case .addCourse:
      "Add your first course"
    }
  }

  private func actionReason(_ action: SemesterDeskTodayAction) -> String {
    switch action {
    case .finishRecovery:
      return "A saved recovery draft is open. Confirm nothing until you review every change."
    case .delayedReturn(_, _, let dueAt, let isDue):
      if isDue {
        return
          "The saved return date has arrived. Use a new explanation without your earlier notes."
      }
      return
        "This return opens \(SemesterDeskDisplay.dateTime(dueAt)). FORGE blocks it before that time."
    case .selectedAction(let planItemID):
      let status = model.semesterDesk?.planItems.first { $0.id == planItemID }?.status
      return status == .planned
        ? "You selected this item as the next action."
        : "This protected study is still active."
    case .choosePlannedWork:
      return "Planned work exists, but you have not selected the next action."
    case .confirmCapacity:
      return "State the time that you can use before you add more planned work."
    case .addPlannedWork:
      return "Your capacity is confirmed. Add one item in the order that you authored it."
    case .addCourse:
      return "A course is required before you can add planned work."
    }
  }

  private func actionSymbol(_ action: SemesterDeskTodayAction) -> String {
    switch action {
    case .finishRecovery:
      "arrow.triangle.2.circlepath"
    case .delayedReturn:
      "calendar.badge.clock"
    case .selectedAction:
      "scope"
    case .choosePlannedWork:
      "checkmark.circle"
    case .confirmCapacity:
      "clock"
    case .addPlannedWork, .addCourse:
      "plus.circle"
    }
  }

  private func actionBoundary(_ action: SemesterDeskTodayAction) -> Color {
    switch action {
    case .finishRecovery, .delayedReturn:
      ForgeDesign.Action.commitment
    case .selectedAction:
      ForgeDesign.focus
    case .choosePlannedWork, .confirmCapacity, .addPlannedWork, .addCourse:
      ForgeDesign.boundary
    }
  }

  private func planItem(
    for action: SemesterDeskTodayAction
  ) -> UniversitySemesterDeskPlanItem? {
    let planItemID: String?
    switch action {
    case .delayedReturn(_, let value, _, _), .selectedAction(let value):
      planItemID = value
    case .finishRecovery, .choosePlannedWork, .confirmCapacity, .addPlannedWork, .addCourse:
      planItemID = nil
    }
    guard let planItemID else {
      return nil
    }
    return model.semesterDesk?.planItems.first { $0.id == planItemID }
  }

  private func course(
    for item: UniversitySemesterDeskPlanItem
  ) -> UniversitySemesterDeskCourse? {
    model.semesterDesk?.courses.first { $0.id == item.courseID }
  }
}
