import ForgeCore
import Foundation
import SwiftUI

struct SemesterDeskSheetView: View {
  @Environment(AppModel.self) private var model

  let sheet: SemesterDeskSheet

  var body: some View {
    NavigationStack {
      form
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Close") {
              model.dismissSemesterDeskSheet()
            }
            .disabled(model.isSemesterDeskOperationRunning)
            .accessibilityHint("Closes this form without another saved change.")
          }
        }
    }
    .interactiveDismissDisabled(model.isSemesterDeskOperationRunning)
    .presentationDragIndicator(.visible)
  }

  @ViewBuilder
  private var form: some View {
    switch sheet {
    case .addCourse:
      AddSemesterCourseForm()
    case .addCourseFact(let courseID):
      AddSemesterCourseFactForm(courseID: courseID)
    case .changeFactStatus(let courseID, let factID):
      ChangeSemesterCourseFactStatusForm(
        courseID: courseID,
        factID: factID,
        initialStatus: fact(courseID: courseID, factID: factID)?.status ?? .needsReview
      )
    case .recordFactConflict(let courseID):
      RecordSemesterFactConflictForm(courseID: courseID)
    case .capacity:
      SemesterCapacityForm(
        initialMinutes:
          model.semesterDesk?.capacityDraft?.availableMinutes
          ?? model.semesterDesk?.capacity?.availableMinutes
          ?? 60
      )
    case .addPlannedWork(let courseID):
      AddSemesterPlanItemForm(initialCourseID: courseID)
    case .prepareRecovery:
      PrepareSemesterRecoveryForm(
        plannedItems: model.semesterDesk?.planItems.filter { $0.status == .planned } ?? []
      )
    case .reviewRecovery:
      ReviewSemesterRecoveryForm()
    case .chooseNextAction:
      ChooseSemesterNextActionForm()
    }
  }

  private func fact(
    courseID: String,
    factID: String
  ) -> UniversitySemesterDeskCourseFact? {
    model.semesterDesk?.courses
      .first(where: { $0.id == courseID })?
      .facts
      .first(where: { $0.id == factID })
  }
}

private struct AddSemesterCourseForm: View {
  @Environment(AppModel.self) private var model
  @State private var code = ""
  @State private var title = ""

  var body: some View {
    Form {
      Section {
        TextField("Course code", text: $code)
          .textInputAutocapitalization(.characters)
          .autocorrectionDisabled()
          .accessibilityIdentifier("course-form.code")

        TextField("Course title", text: $title, axis: .vertical)
          .textInputAutocapitalization(.words)
          .accessibilityIdentifier("course-form.title")
      } header: {
        Text("Course")
      } footer: {
        Text("Use the code and title that you use for this course.")
      }

      formStatusSection

      Section {
        SemesterDeskPrimaryButton(
          title: "Save course",
          systemImage: "checkmark.circle.fill",
          hint: "Saves this course at the end of the authored course order.",
          identifier: "course-form.save",
          isDisabled: !canSave
        ) {
          save()
        }
      }
    }
    .navigationTitle("Add Course")
    .navigationBarTitleDisplayMode(.inline)
  }

  private var canSave: Bool {
    !code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && !model.isSemesterDeskOperationRunning
  }

  private func save() {
    Task { @MainActor in
      let didSave = await model.applySemesterDeskCommand(
        .addCourse(
          profileID: model.localProfileID,
          code: code,
          title: title
        )
      )
      if didSave {
        model.dismissSemesterDeskSheet()
      }
    }
  }
}

private struct AddSemesterCourseFactForm: View {
  @Environment(AppModel.self) private var model
  @State private var label = ""
  @State private var value = ""
  @State private var sourceLabel = ""
  @State private var status: UniversitySemesterDeskCourseFactStatus = .notConfirmed

  let courseID: String

  var body: some View {
    Form {
      if let course {
        Section {
          LabeledContent("Course", value: "\(course.code) · \(course.title)")
        }
      }

      Section {
        TextField("Fact label", text: $label, axis: .vertical)
          .accessibilityIdentifier("fact-form.label")

        TextField("Fact value", text: $value, axis: .vertical)
          .accessibilityIdentifier("fact-form.value")

        TextField("Supporting source label", text: $sourceLabel, axis: .vertical)
          .accessibilityIdentifier("fact-form.source")
      } header: {
        Text("Course fact")
      } footer: {
        Text(
          "The source label is supporting context. FORGE does not show an internal source object.")
      }

      Section("Review status") {
        Picker("Fact status", selection: $status) {
          ForEach(UniversitySemesterDeskCourseFactStatus.allCases, id: \.self) { value in
            Text(value.studentLabel).tag(value)
          }
        }
        .pickerStyle(.navigationLink)
        .accessibilityIdentifier("fact-form.status")

        if status == .checked {
          Label("FORGE will record the current time as the last check.", systemImage: "clock")
            .font(.subheadline)
            .foregroundStyle(ForgeDesign.secondaryText)
            .fixedSize(horizontal: false, vertical: true)
        }
      }

      formStatusSection

      Section {
        SemesterDeskPrimaryButton(
          title: "Save course fact",
          systemImage: "checkmark.circle.fill",
          hint: "Saves this fact after the current facts for this course.",
          identifier: "fact-form.save",
          isDisabled: !canSave
        ) {
          save()
        }
      }
    }
    .navigationTitle("Add Course Fact")
    .navigationBarTitleDisplayMode(.inline)
  }

  private var course: UniversitySemesterDeskCourse? {
    model.semesterDesk?.courses.first { $0.id == courseID }
  }

  private var canSave: Bool {
    course != nil
      && !label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && !sourceLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && !model.isSemesterDeskOperationRunning
  }

  private func save() {
    Task { @MainActor in
      let didSave = await model.applySemesterDeskCommand(
        .addCourseFact(
          profileID: model.localProfileID,
          courseID: courseID,
          label: label,
          value: value,
          status: status,
          sourceLabel: sourceLabel,
          checkedAt: status == .checked
            ? AppModel.semesterDeskTimestamp(for: model.semesterDeskCurrentDate)
            : nil
        )
      )
      if didSave {
        model.dismissSemesterDeskSheet()
      }
    }
  }
}

private struct ChangeSemesterCourseFactStatusForm: View {
  @Environment(AppModel.self) private var model
  @State private var status: UniversitySemesterDeskCourseFactStatus

  let courseID: String
  let factID: String

  init(
    courseID: String,
    factID: String,
    initialStatus: UniversitySemesterDeskCourseFactStatus
  ) {
    self.courseID = courseID
    self.factID = factID
    _status = State(initialValue: initialStatus)
  }

  var body: some View {
    Form {
      if let fact {
        Section {
          Text(fact.label)
            .font(.headline)
          Text(fact.value)
          Text("Source: \(fact.sourceLabel)")
            .font(.subheadline)
            .foregroundStyle(ForgeDesign.secondaryText)
        }
      }

      Section("Review status") {
        Picker("Fact status", selection: $status) {
          ForEach(UniversitySemesterDeskCourseFactStatus.allCases, id: \.self) { value in
            Label(value.studentLabel, systemImage: value.studentSymbolName)
              .tag(value)
          }
        }
        .pickerStyle(.inline)
        .labelsHidden()
        .accessibilityLabel("Fact status")
        .accessibilityIdentifier("fact-status-form.status")

        if status == .checked {
          Text("FORGE will record the current time as the last check.")
            .font(.subheadline)
            .foregroundStyle(ForgeDesign.secondaryText)
        }
      }

      formStatusSection

      Section {
        SemesterDeskPrimaryButton(
          title: "Save fact status",
          systemImage: "checkmark.circle.fill",
          hint: "Saves the selected review status for this fact.",
          identifier: "fact-status-form.save",
          isDisabled: fact == nil || model.isSemesterDeskOperationRunning
        ) {
          save()
        }
      }
    }
    .navigationTitle("Change Fact Status")
    .navigationBarTitleDisplayMode(.inline)
  }

  private var fact: UniversitySemesterDeskCourseFact? {
    model.semesterDesk?.courses
      .first(where: { $0.id == courseID })?
      .facts
      .first(where: { $0.id == factID })
  }

  private func save() {
    Task { @MainActor in
      let didSave = await model.applySemesterDeskCommand(
        .setCourseFactStatus(
          profileID: model.localProfileID,
          courseID: courseID,
          factID: factID,
          status: status,
          checkedAt: status == .checked
            ? AppModel.semesterDeskTimestamp(for: model.semesterDeskCurrentDate)
            : nil
        )
      )
      if didSave {
        model.dismissSemesterDeskSheet()
      }
    }
  }
}

private struct RecordSemesterFactConflictForm: View {
  @Environment(AppModel.self) private var model
  @State private var selectedFactIDs = Set<String>()
  @State private var summary = ""

  let courseID: String

  var body: some View {
    Form {
      if let course {
        Section {
          ForEach(course.facts, id: \.id) { fact in
            Toggle(
              isOn: selectionBinding(for: fact.id)
            ) {
              VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
                Text(fact.label)
                  .font(.headline)
                Text(fact.value)
                  .font(.subheadline)
                  .foregroundStyle(ForgeDesign.secondaryText)
              }
            }
            .frame(minHeight: 44)
            .accessibilityHint("Includes this fact in the conflict.")
            .accessibilityIdentifier("conflict-form.fact.\(fact.id)")
          }
        } header: {
          Text("Select facts")
        } footer: {
          Text("Select at least two different facts.")
        }
      }

      Section("Conflict summary") {
        TextField("State what conflicts", text: $summary, axis: .vertical)
          .lineLimit(3...8)
          .accessibilityIdentifier("conflict-form.summary")
      }

      formStatusSection

      Section {
        SemesterDeskPrimaryButton(
          title: "Save fact conflict",
          systemImage: "exclamationmark.triangle.fill",
          hint: "Saves this conflict as open until you resolve it.",
          identifier: "conflict-form.save",
          isDisabled: !canSave
        ) {
          save()
        }
      }
    }
    .navigationTitle("Record Fact Conflict")
    .navigationBarTitleDisplayMode(.inline)
  }

  private var course: UniversitySemesterDeskCourse? {
    model.semesterDesk?.courses.first { $0.id == courseID }
  }

  private var canSave: Bool {
    selectedFactIDs.count >= 2
      && !summary.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && !model.isSemesterDeskOperationRunning
  }

  private func selectionBinding(for factID: String) -> Binding<Bool> {
    Binding(
      get: { selectedFactIDs.contains(factID) },
      set: { isSelected in
        if isSelected {
          selectedFactIDs.insert(factID)
        } else {
          selectedFactIDs.remove(factID)
        }
      }
    )
  }

  private func save() {
    let factIDs =
      course?.facts.compactMap { fact in
        selectedFactIDs.contains(fact.id) ? fact.id : nil
      } ?? []
    Task { @MainActor in
      let didSave = await model.applySemesterDeskCommand(
        .recordFactConflict(
          profileID: model.localProfileID,
          courseID: courseID,
          factIDs: factIDs,
          summary: summary
        )
      )
      if didSave {
        model.dismissSemesterDeskSheet()
      }
    }
  }
}

private struct SemesterCapacityForm: View {
  @Environment(AppModel.self) private var model
  @State private var availableMinutes: Int

  init(initialMinutes: Int) {
    _availableMinutes = State(initialValue: initialMinutes)
  }

  var body: some View {
    Form {
      Section {
        Stepper(
          value: $availableMinutes,
          in: 0...10_080,
          step: 15
        ) {
          LabeledContent(
            "Available time",
            value: SemesterDeskDisplay.duration(availableMinutes)
          )
        }
        .accessibilityIdentifier("capacity-form.minutes-stepper")

        TextField(
          "Available minutes",
          value: $availableMinutes,
          format: .number
        )
        .keyboardType(.numberPad)
        .accessibilityIdentifier("capacity-form.minutes")
      } header: {
        Text("Capacity draft")
      } footer: {
        Text("Use whole minutes. Zero is a valid honest capacity.")
      }

      if let draft = model.semesterDesk?.capacityDraft {
        Section("Saved draft") {
          LabeledContent(
            "Available time",
            value: SemesterDeskDisplay.duration(draft.availableMinutes)
          )

          Text("Confirm only after you review this saved draft.")
            .font(.subheadline)
            .foregroundStyle(ForgeDesign.secondaryText)
        }
      }

      formStatusSection

      Section {
        SemesterDeskPrimaryButton(
          title: model.semesterDesk?.capacityDraft == nil
            ? "Save capacity draft"
            : "Update capacity draft",
          systemImage: "square.and.arrow.down",
          hint: "Saves this capacity as a draft. It does not confirm the capacity.",
          identifier: "capacity-form.save-draft",
          isDisabled: availableMinutes < 0 || model.isSemesterDeskOperationRunning
        ) {
          saveDraft()
        }

        if model.semesterDesk?.capacityDraft != nil {
          Button("Confirm saved capacity") {
            confirm()
          }
          .frame(maxWidth: .infinity, minHeight: 48)
          .buttonStyle(.borderedProminent)
          .tint(ForgeDesign.checkedEvidence)
          .disabled(model.isSemesterDeskOperationRunning)
          .accessibilityHint("Confirms the saved capacity draft and closes this form.")
          .accessibilityIdentifier("capacity-form.confirm")
        }
      }
    }
    .navigationTitle("Capacity")
    .navigationBarTitleDisplayMode(.inline)
  }

  private func saveDraft() {
    Task { @MainActor in
      _ = await model.applySemesterDeskCommand(
        .draftCapacity(
          profileID: model.localProfileID,
          availableMinutes: availableMinutes
        )
      )
    }
  }

  private func confirm() {
    Task { @MainActor in
      let didSave = await model.applySemesterDeskCommand(
        .confirmCapacity(profileID: model.localProfileID)
      )
      if didSave {
        model.dismissSemesterDeskSheet()
      }
    }
  }
}

private struct AddSemesterPlanItemForm: View {
  @Environment(AppModel.self) private var model
  @State private var courseID: String
  @State private var title = ""
  @State private var plannedDate = Date.now
  @State private var minutes = 30

  init(initialCourseID: String?) {
    _courseID = State(initialValue: initialCourseID ?? "")
  }

  var body: some View {
    Form {
      Section("Course") {
        Picker("Course", selection: $courseID) {
          Text("Choose a course").tag("")
          ForEach(model.semesterDesk?.courses ?? [], id: \.id) { course in
            Text("\(course.code) · \(course.title)").tag(course.id)
          }
        }
        .pickerStyle(.navigationLink)
        .accessibilityIdentifier("plan-form.course")
      }

      Section("Planned work") {
        TextField("Work title", text: $title, axis: .vertical)
          .accessibilityIdentifier("plan-form.title")

        DatePicker(
          "Planned date",
          selection: $plannedDate,
          displayedComponents: .date
        )
        .accessibilityIdentifier("plan-form.date")

        Stepper(value: $minutes, in: 1...1_440, step: 15) {
          LabeledContent("Duration", value: SemesterDeskDisplay.duration(minutes))
        }
        .accessibilityIdentifier("plan-form.minutes")
      }

      formStatusSection

      Section {
        SemesterDeskPrimaryButton(
          title: "Save planned work",
          systemImage: "checkmark.circle.fill",
          hint: "Saves this item at the end of the authored plan order.",
          identifier: "plan-form.save",
          isDisabled: !canSave
        ) {
          save()
        }
      }
    }
    .navigationTitle("Add Planned Work")
    .navigationBarTitleDisplayMode(.inline)
    .task {
      if courseID.isEmpty {
        courseID = model.semesterDesk?.courses.first?.id ?? ""
      }
    }
  }

  private var canSave: Bool {
    !courseID.isEmpty
      && !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && minutes > 0
      && !model.isSemesterDeskOperationRunning
  }

  private func save() {
    Task { @MainActor in
      let didSave = await model.applySemesterDeskCommand(
        .addPlanItem(
          profileID: model.localProfileID,
          courseID: courseID,
          title: title,
          date: SemesterDeskDisplay.dateOnly(plannedDate),
          minutes: minutes
        )
      )
      if didSave {
        model.dismissSemesterDeskSheet()
      }
    }
  }
}

private struct ChooseSemesterNextActionForm: View {
  @Environment(AppModel.self) private var model
  @State private var selectedPlanItemID: String?

  var body: some View {
    Form {
      Section {
        Text("Choose one planned item. FORGE does not select work for you.")
          .font(.body)
          .fixedSize(horizontal: false, vertical: true)
      }

      if plannedItems.isEmpty {
        Section {
          ContentUnavailableView(
            "No planned work",
            systemImage: "calendar",
            description: Text("Add or resume planned work before you choose the next action.")
          )
        }
      } else {
        Section("Planned work") {
          ForEach(plannedItems, id: \.id) { item in
            Button {
              guard model.canChooseAsNextAction(item) else {
                return
              }
              selectedPlanItemID = item.id
            } label: {
              HStack(alignment: .top, spacing: ForgeDesign.Spacing.regular) {
                Image(
                  systemName: selectedPlanItemID == item.id
                    ? "checkmark.circle.fill"
                    : "circle"
                )
                .foregroundStyle(
                  selectedPlanItemID == item.id ? ForgeDesign.focus : ForgeDesign.secondaryText
                )
                .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
                  Text(item.title)
                    .font(.headline)
                    .foregroundStyle(ForgeDesign.text)

                  Text(
                    "\(SemesterDeskDisplay.date(item.currentDate)) · \(SemesterDeskDisplay.duration(item.currentMinutes))"
                  )
                  .font(.subheadline)
                  .foregroundStyle(ForgeDesign.secondaryText)

                  if let blockedReason = blockedReason(for: item) {
                    Text(blockedReason)
                      .font(.subheadline)
                      .foregroundStyle(ForgeDesign.secondaryText)
                  }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
              }
              .frame(minHeight: 44)
              .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(!model.canChooseAsNextAction(item))
            .accessibilityLabel(item.title)
            .accessibilityValue(
              selectedPlanItemID == item.id ? "Selected" : "Not selected"
            )
            .accessibilityHint(
              blockedReason(for: item) ?? "Selects this item for confirmation."
            )
            .accessibilityIdentifier("choose-form.item.\(item.id)")
          }
        }
      }

      formStatusSection

      Section {
        SemesterDeskPrimaryButton(
          title: "Choose this work",
          systemImage: "checkmark.circle.fill",
          hint: "Saves your selected item as the next action.",
          identifier: "choose-form.save",
          isDisabled: selectedPlanItemID == nil || model.isSemesterDeskOperationRunning
        ) {
          save()
        }
      }
    }
    .navigationTitle("Choose Next Action")
    .navigationBarTitleDisplayMode(.inline)
  }

  private var plannedItems: [UniversitySemesterDeskPlanItem] {
    model.semesterDesk?.planItems.filter { $0.status == .planned } ?? []
  }

  private func blockedReason(for item: UniversitySemesterDeskPlanItem) -> String? {
    guard !model.canChooseAsNextAction(item),
      let course = model.semesterDesk?.courses.first(where: { $0.id == item.courseID })
    else {
      return nil
    }
    if course.facts.contains(where: { $0.status != .checked }) {
      return "Check every course fact before you choose this work."
    }
    if course.factConflicts.contains(where: { $0.status == .open }) {
      return "Resolve each open fact conflict before you choose this work."
    }
    return "This item is not available as the next action."
  }

  private func save() {
    guard let selectedPlanItemID else {
      return
    }
    Task { @MainActor in
      let didSave = await model.applySemesterDeskCommand(
        .chooseNextAction(
          profileID: model.localProfileID,
          planItemID: selectedPlanItemID
        )
      )
      if didSave {
        model.dismissSemesterDeskSheet()
      }
    }
  }
}

@ViewBuilder
private var formStatusSection: some View {
  Section {
    SemesterDeskFormStatus()
  }
}
