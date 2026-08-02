import ForgeCore
import SwiftUI

struct SemesterView: View {
  @Environment(AppModel.self) private var model
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    Group {
      if let desk = model.semesterDesk {
        semesterLedger(desk)
      } else {
        ContentUnavailableView(
          "Semester Desk is not available",
          systemImage: "calendar.badge.exclamationmark",
          description: Text("Create a Semester Desk before you add courses and planned work.")
        )
      }
    }
    .navigationTitle("Semester")
    .background(ForgeDesign.canvas)
    .transaction { transaction in
      if reduceMotion {
        transaction.animation = nil
        transaction.disablesAnimations = true
      }
    }
  }

  private func semesterLedger(_ desk: UniversitySemesterDeskState) -> some View {
    List {
      if let recoveryDraft = desk.recoveryDraft {
        openRecoverySection(recoveryDraft, desk: desk)
      }

      capacitySection(desk)
      coursesSection(desk)
      planSection(desk)

      if !desk.recoveryChanges.isEmpty {
        recoveryHistorySection(desk)
      }

      Section {
        SemesterDeskOperationStatus()
          .listRowBackground(ForgeDesign.canvas)
      }
    }
    .listStyle(.plain)
    .scrollContentBackground(.hidden)
    .background(ForgeDesign.canvas)
    .accessibilityIdentifier("semester.screen")
  }

  private func openRecoverySection(
    _ recoveryDraft: UniversitySemesterDeskRecoveryDraft,
    desk: UniversitySemesterDeskState
  ) -> some View {
    Section {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
        Label("Recovery review is open", systemImage: "arrow.triangle.2.circlepath")
          .font(.headline)
          .foregroundStyle(ForgeDesign.text)

        Text(recoveryDraft.summary)
          .font(.body)
          .fixedSize(horizontal: false, vertical: true)

        Text("\(recoveryDraft.decisions.count) planned items need your final review.")
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)

        SemesterDeskPrimaryButton(
          title: "Review every change",
          systemImage: "list.bullet.clipboard",
          hint: "Shows the previous and proposed values for every planned item.",
          identifier: "semester.review-recovery",
          isDisabled: model.isSemesterDeskOperationRunning
        ) {
          model.presentSemesterDeskSheet(.reviewRecovery)
        }
      }
      .padding(.vertical, ForgeDesign.Spacing.small)
      .accessibilityElement(children: .contain)
      .listRowBackground(ForgeDesign.Action.commitmentSurface)
    } header: {
      Text("Recovery")
    }
  }

  private func capacitySection(_ desk: UniversitySemesterDeskState) -> some View {
    Section {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
        if let capacity = desk.capacity {
          Label(
            "\(SemesterDeskDisplay.duration(capacity.availableMinutes)) confirmed",
            systemImage: "checkmark.circle"
          )
          .font(.headline)
          .foregroundStyle(ForgeDesign.checkedEvidence)
          .accessibilityElement(children: .combine)

          Text("Confirmed \(SemesterDeskDisplay.dateTime(capacity.declaredAt)).")
            .font(.subheadline)
            .foregroundStyle(ForgeDesign.secondaryText)
        } else {
          Label("Capacity is not confirmed", systemImage: "clock.badge.questionmark")
            .font(.headline)
            .accessibilityElement(children: .combine)
        }

        if let draft = desk.capacityDraft {
          Text(
            "Draft: \(SemesterDeskDisplay.duration(draft.availableMinutes)). Confirm this value before FORGE uses it."
          )
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
        }

        SemesterDeskSecondaryAction(
          title: desk.capacityDraft == nil ? "Draft capacity" : "Review draft capacity",
          systemImage: "clock",
          hint: "Opens the capacity draft and confirmation steps.",
          identifier: "semester.capacity",
          isDisabled: model.isSemesterDeskOperationRunning
        ) {
          model.presentSemesterDeskSheet(.capacity)
        }
      }
      .padding(.vertical, ForgeDesign.Spacing.small)
    } header: {
      Text("Capacity")
    }
  }

  private func coursesSection(_ desk: UniversitySemesterDeskState) -> some View {
    Section {
      if desk.courses.isEmpty {
        ContentUnavailableView(
          "No courses",
          systemImage: "books.vertical",
          description: Text("Add a course before you add planned work.")
        )
        .listRowBackground(ForgeDesign.canvas)
      } else {
        ForEach(desk.courses, id: \.id) { course in
          courseLedger(course)
        }
      }

      SemesterDeskSecondaryAction(
        title: "Add a course",
        systemImage: "plus.circle",
        hint: "Adds a course after FORGE saves it on this iPhone.",
        identifier: "semester.add-course",
        isDisabled: model.isSemesterDeskOperationRunning
      ) {
        model.presentSemesterDeskSheet(.addCourse)
      }
    } header: {
      Text("Courses")
    }
  }

  private func courseLedger(_ course: UniversitySemesterDeskCourse) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        Text(course.code)
          .font(.caption.weight(.semibold))
          .foregroundStyle(ForgeDesign.secondaryText)
          .textCase(.uppercase)

        Text(course.title)
          .font(.title3.weight(.semibold))
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityAddTraits(.isHeader)
      }

      if course.facts.isEmpty {
        Text("No course facts")
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
      } else {
        ForEach(course.facts, id: \.id) { fact in
          Divider()
          factRow(fact, courseID: course.id)
        }
      }

      if !course.factConflicts.isEmpty {
        ForEach(course.factConflicts, id: \.id) { conflict in
          Divider()
          conflictRow(conflict, courseID: course.id)
        }
      }

      Divider()

      SemesterDeskSecondaryAction(
        title: "Add a course fact",
        systemImage: "plus.circle",
        hint: "Adds one fact with a status and a supporting source label.",
        identifier: "semester.add-fact.\(course.id)",
        isDisabled: model.isSemesterDeskOperationRunning
      ) {
        model.presentSemesterDeskSheet(.addCourseFact(courseID: course.id))
      }

      if course.facts.count >= 2 {
        SemesterDeskSecondaryAction(
          title: "Record a fact conflict",
          systemImage: "exclamationmark.triangle",
          hint: "Selects two or more course facts and records the conflict summary.",
          identifier: "semester.record-conflict.\(course.id)",
          isDisabled: model.isSemesterDeskOperationRunning
        ) {
          model.presentSemesterDeskSheet(.recordFactConflict(courseID: course.id))
        }
      }

      SemesterDeskSecondaryAction(
        title: "Add planned work",
        systemImage: "calendar.badge.plus",
        hint: "Adds one planned item for this course.",
        identifier: "semester.add-plan.\(course.id)",
        isDisabled: model.isSemesterDeskOperationRunning
      ) {
        model.presentSemesterDeskSheet(.addPlannedWork(courseID: course.id))
      }
    }
    .padding(.vertical, ForgeDesign.Spacing.small)
    .accessibilityElement(children: .contain)
  }

  private func factRow(
    _ fact: UniversitySemesterDeskCourseFact,
    courseID: String
  ) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text(fact.label)
        .font(.headline)
        .fixedSize(horizontal: false, vertical: true)

      Text(fact.value)
        .font(.body)
        .fixedSize(horizontal: false, vertical: true)

      SemesterDeskFactStatusLabel(status: fact.status)

      Text("Source: \(fact.sourceLabel)")
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)

      if let checkedAt = fact.checkedAt {
        Text("Last checked \(SemesterDeskDisplay.dateTime(checkedAt)).")
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
      }

      Button("Change fact status") {
        model.presentSemesterDeskSheet(
          .changeFactStatus(courseID: courseID, factID: fact.id)
        )
      }
      .frame(minHeight: 44, alignment: .leading)
      .disabled(model.isSemesterDeskOperationRunning)
      .accessibilityHint("Changes the visible review status for \(fact.label).")
      .accessibilityIdentifier("semester.change-fact-status.\(fact.id)")
    }
    .accessibilityElement(children: .contain)
  }

  private func conflictRow(
    _ conflict: UniversitySemesterDeskFactConflict,
    courseID: String
  ) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Label(
        conflict.status == .open ? "Open fact conflict" : "Resolved fact conflict",
        systemImage: conflict.status == .open
          ? "exclamationmark.triangle"
          : "checkmark.circle"
      )
      .font(.headline)
      .foregroundStyle(
        conflict.status == .resolved ? ForgeDesign.checkedEvidence : ForgeDesign.text
      )

      Text(conflict.summary)
        .font(.body)
        .fixedSize(horizontal: false, vertical: true)

      if conflict.status == .open {
        Button("Mark conflict as resolved") {
          resolve(conflictID: conflict.id, courseID: courseID)
        }
        .frame(minHeight: 44, alignment: .leading)
        .disabled(model.isSemesterDeskOperationRunning)
        .accessibilityHint("Saves this fact conflict as resolved.")
        .accessibilityIdentifier("semester.resolve-conflict.\(conflict.id)")
      } else if let reviewedAt = conflict.reviewedAt {
        Text("Resolved \(SemesterDeskDisplay.dateTime(reviewedAt)).")
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
      }
    }
    .accessibilityElement(children: .contain)
  }

  private func planSection(_ desk: UniversitySemesterDeskState) -> some View {
    Section {
      if desk.planItems.isEmpty {
        ContentUnavailableView(
          "No planned work",
          systemImage: "calendar",
          description: Text("Add work in the order that you intend to complete it.")
        )
        .listRowBackground(ForgeDesign.canvas)
      } else {
        ForEach(desk.planItems, id: \.id) { item in
          planItemRow(item, desk: desk)
        }
      }

      if let course = desk.courses.first {
        SemesterDeskSecondaryAction(
          title: "Add planned work",
          systemImage: "plus.circle",
          hint: "Adds one planned item to the end of the authored order.",
          identifier: "semester.add-planned-work",
          isDisabled: model.isSemesterDeskOperationRunning
        ) {
          model.presentSemesterDeskSheet(.addPlannedWork(courseID: course.id))
        }
      }

      if desk.recoveryDraft == nil,
        desk.planItems.contains(where: { $0.status == .planned })
      {
        SemesterDeskSecondaryAction(
          title: "Prepare recovery",
          systemImage: "arrow.triangle.2.circlepath",
          hint: "Requires one explicit decision for every planned item.",
          identifier: "semester.prepare-recovery",
          isDisabled: model.isSemesterDeskOperationRunning
        ) {
          model.presentSemesterDeskSheet(.prepareRecovery)
        }
      }
    } header: {
      Text("Planned work")
    }
  }

  private func planItemRow(
    _ item: UniversitySemesterDeskPlanItem,
    desk: UniversitySemesterDeskState
  ) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
      Text(item.title)
        .font(.headline)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)

      if let course = desk.courses.first(where: { $0.id == item.courseID }) {
        Text("\(course.code) · \(course.title)")
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
      }

      Label(item.status.studentLabel, systemImage: planStatusSymbol(item.status))
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(
          item.status == .returnComplete ? ForgeDesign.checkedEvidence : ForgeDesign.text
        )

      Text(
        "\(SemesterDeskDisplay.date(item.currentDate)) · \(SemesterDeskDisplay.duration(item.currentMinutes))"
      )
      .font(.subheadline)
      .foregroundStyle(ForgeDesign.secondaryText)

      if item.currentDate != item.originalDate || item.currentMinutes != item.originalMinutes {
        Text(
          "Original: \(SemesterDeskDisplay.date(item.originalDate)) · \(SemesterDeskDisplay.duration(item.originalMinutes))"
        )
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
      }

      if desk.selectedNextActionID == item.id {
        Label("Selected next action", systemImage: "scope")
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(ForgeDesign.focus)
      }

      if item.status == .deferred {
        Button("Resume deferred work") {
          resume(item)
        }
        .frame(minHeight: 44, alignment: .leading)
        .disabled(model.isSemesterDeskOperationRunning)
        .accessibilityHint("Returns this item to planned work.")
        .accessibilityIdentifier("semester.resume.\(item.id)")
      } else if model.canChooseAsNextAction(item),
        desk.selectedNextActionID != item.id
      {
        Button("Choose as next action") {
          choose(item)
        }
        .frame(minHeight: 44, alignment: .leading)
        .disabled(model.isSemesterDeskOperationRunning)
        .accessibilityHint("Selects this planned item. FORGE does not select work for you.")
        .accessibilityIdentifier("semester.choose.\(item.id)")
      }
    }
    .padding(.vertical, ForgeDesign.Spacing.small)
    .accessibilityElement(children: .contain)
  }

  private func recoveryHistorySection(_ desk: UniversitySemesterDeskState) -> some View {
    Section {
      ForEach(desk.recoveryChanges, id: \.id) { change in
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
          Text(
            desk.planItems.first(where: { $0.id == change.planItemID })?.title
              ?? "Planned work"
          )
          .font(.headline)

          Text(change.outcome.studentLabel)
            .font(.subheadline.weight(.semibold))

          Text(
            "Previous: \(SemesterDeskDisplay.date(change.previousDate)) · \(SemesterDeskDisplay.duration(change.previousMinutes))"
          )
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)

          Text(
            "Confirmed: \(SemesterDeskDisplay.date(change.currentDate)) · \(SemesterDeskDisplay.duration(change.currentMinutes))"
          )
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)

          Text("Reason: \(change.reason)")
            .font(.subheadline)
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, ForgeDesign.Spacing.small)
        .accessibilityElement(children: .combine)
      }
    } header: {
      Text("Recovery history")
    }
  }

  private func planStatusSymbol(_ status: UniversitySemesterDeskPlanItemStatus) -> String {
    switch status {
    case .planned:
      "calendar"
    case .deferred:
      "pause.circle"
    case .inProgress:
      "pencil.line"
    case .practiceComplete:
      "text.bubble"
    case .proofComplete:
      "calendar.badge.clock"
    case .returnComplete:
      "checkmark.seal"
    }
  }

  private func resolve(conflictID: String, courseID: String) {
    Task { @MainActor in
      _ = await model.applySemesterDeskCommand(
        .reviewFactConflict(
          profileID: model.localProfileID,
          courseID: courseID,
          conflictID: conflictID
        )
      )
    }
  }

  private func resume(_ item: UniversitySemesterDeskPlanItem) {
    Task { @MainActor in
      _ = await model.applySemesterDeskCommand(
        .resumeDeferredItem(
          profileID: model.localProfileID,
          planItemID: item.id
        )
      )
    }
  }

  private func choose(_ item: UniversitySemesterDeskPlanItem) {
    Task { @MainActor in
      _ = await model.applySemesterDeskCommand(
        .chooseNextAction(
          profileID: model.localProfileID,
          planItemID: item.id
        )
      )
    }
  }
}
