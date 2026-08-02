import ForgeCore
import Foundation
import SwiftUI

struct ProtectedStudyView: View {
  @Environment(AppModel.self) private var model
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @State private var returnDate = Date.now.addingTimeInterval(86_400)
  @AccessibilityFocusState private var statusIsFocused: Bool

  var body: some View {
    NavigationStack {
      Group {
        if let item = model.protectedStudyPlanItem {
          ScrollView {
            VStack(alignment: .leading, spacing: ForgeDesign.Spacing.large) {
              studyHeader(item)
              stageIndicator
              stageContent(item)
              SemesterDeskFormStatus()
                .accessibilityFocused($statusIsFocused)
            }
            .frame(maxWidth: ForgeDesign.Layout.contentMaxWidth, alignment: .leading)
            .padding(.horizontal, ForgeDesign.Spacing.regular)
            .padding(.vertical, ForgeDesign.Spacing.large)
            .frame(maxWidth: .infinity, alignment: .leading)
          }
        } else {
          ContentUnavailableView(
            "Protected study is not available",
            systemImage: "exclamationmark.triangle",
            description: Text("Close this surface and choose planned work again.")
          )
        }
      }
      .background(ForgeDesign.canvas.ignoresSafeArea())
      .navigationTitle("Protected Study")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Close") {
            model.dismissProtectedStudy()
          }
          .disabled(model.isSemesterDeskOperationRunning)
          .accessibilityHint("Closes protected study. Private text stays only in process memory.")
          .accessibilityIdentifier("study.close")
        }
      }
    }
    .interactiveDismissDisabled(model.isSemesterDeskOperationRunning)
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
      statusIsFocused = true
      AccessibilityNotification.Announcement(message).post()
    }
    .accessibilityIdentifier("study.screen")
  }

  private func studyHeader(_ item: UniversitySemesterDeskPlanItem) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text(item.title)
        .font(.largeTitle.weight(.bold))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
        .accessibilityIdentifier("study.title")

      if let course = model.protectedStudyCourse {
        Text("\(course.code) · \(course.title)")
          .font(.body)
          .foregroundStyle(ForgeDesign.secondaryText)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityIdentifier("study.course")
      }

      Label(
        "Private text is not saved",
        systemImage: "lock.fill"
      )
      .font(.subheadline.weight(.semibold))
      .foregroundStyle(ForgeDesign.secondaryText)
      .accessibilityElement(children: .combine)
      .accessibilityIdentifier("study.private-text")
    }
  }

  private var stageIndicator: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.small) {
          ForEach(StudyStage.allCases, id: \.self) { stage in
            stageLabel(stage)
          }
        }
      } else {
        HStack(alignment: .top, spacing: ForgeDesign.Spacing.small) {
          ForEach(StudyStage.allCases, id: \.self) { stage in
            stageLabel(stage)
              .frame(maxWidth: .infinity, alignment: .leading)
          }
        }
      }
    }
    .padding(.vertical, ForgeDesign.Spacing.small)
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(ForgeDesign.boundary)
        .frame(height: 1)
    }
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("study.stages")
  }

  private func stageLabel(_ stage: StudyStage) -> some View {
    Label(
      stage.title,
      systemImage: stage == currentStage ? "circle.inset.filled" : "circle"
    )
    .font(.caption.weight(stage == currentStage ? .bold : .regular))
    .foregroundStyle(stage == currentStage ? ForgeDesign.focus : ForgeDesign.secondaryText)
    .fixedSize(horizontal: false, vertical: true)
    .accessibilityLabel(stage.title)
    .accessibilityValue(stage == currentStage ? "Current stage" : "Not current")
  }

  @ViewBuilder
  private func stageContent(_ item: UniversitySemesterDeskPlanItem) -> some View {
    switch currentStage {
    case .practice:
      practiceStage(item)
    case .independentCheck:
      independentCheckStage(item)
    case .returnDate:
      returnDateStage(item)
    case .delayedReturn:
      delayedReturnStage(item)
    }
  }

  private func practiceStage(_ item: UniversitySemesterDeskPlanItem) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      stageHeading("Practice", detail: "Use private working notes while you complete the work.")

      TextEditor(text: studyDraftBinding(for: item.id, field: .practice))
        .frame(minHeight: 220)
        .padding(ForgeDesign.Spacing.small)
        .scrollContentBackground(.hidden)
        .background(ForgeDesign.surface)
        .overlay {
          RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset)
            .stroke(ForgeDesign.boundary, lineWidth: 1)
        }
        .clipShape(.rect(cornerRadius: ForgeDesign.Radius.inset))
        .accessibilityLabel("Private practice notes")
        .accessibilityHint("FORGE keeps this text only in process memory.")
        .accessibilityIdentifier("study.practice-text")

      Text("Choose the result. FORGE does not inspect or save these notes.")
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)

      SemesterDeskPrimaryButton(
        title: "Practice complete",
        systemImage: "checkmark.circle.fill",
        hint: "Saves only the practice outcome and opens the independent check.",
        identifier: "study.practice-complete",
        isDisabled: model.isSemesterDeskOperationRunning
      ) {
        completePractice(.completed)
      }

      Button("I need more work") {
        completePractice(.needsMoreWork)
      }
      .frame(maxWidth: .infinity, minHeight: 48)
      .buttonStyle(.bordered)
      .disabled(model.isSemesterDeskOperationRunning)
      .accessibilityHint("Saves only this outcome and keeps protected practice active.")
      .accessibilityIdentifier("study.practice-needs-work")
    }
  }

  private func independentCheckStage(
    _ item: UniversitySemesterDeskPlanItem
  ) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      stageHeading(
        "Independent check",
        detail: "Close or ignore your practice notes. Write a new explanation in your own words."
      )

      Text("FORGE will not answer the task.")
        .font(.headline)
        .fixedSize(horizontal: false, vertical: true)

      TextEditor(text: studyDraftBinding(for: item.id, field: .independentCheck))
        .frame(minHeight: 220)
        .padding(ForgeDesign.Spacing.small)
        .scrollContentBackground(.hidden)
        .background(ForgeDesign.surface)
        .overlay {
          RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset)
            .stroke(ForgeDesign.focus, lineWidth: 2)
        }
        .clipShape(.rect(cornerRadius: ForgeDesign.Radius.inset))
        .accessibilityLabel("Private independent explanation")
        .accessibilityHint("FORGE keeps this text only in process memory.")
        .accessibilityIdentifier("study.independent-text")

      SemesterDeskPrimaryButton(
        title: "I can explain this",
        systemImage: "checkmark.circle.fill",
        hint: "Saves only the demonstrated outcome and opens return-date selection.",
        identifier: "study.independent-demonstrated",
        isDisabled: independentText(for: item.id).isEmpty
          || model.isSemesterDeskOperationRunning
      ) {
        submitIndependentCheck(.demonstrated)
      }

      Button("I need a return") {
        submitIndependentCheck(.needsReturn)
      }
      .frame(maxWidth: .infinity, minHeight: 48)
      .buttonStyle(.bordered)
      .disabled(
        independentText(for: item.id).isEmpty
          || model.isSemesterDeskOperationRunning
      )
      .accessibilityHint("Saves only this outcome and opens return-date selection.")
      .accessibilityIdentifier("study.independent-needs-return")
    }
  }

  private func returnDateStage(_ item: UniversitySemesterDeskPlanItem) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      stageHeading(
        "Return date",
        detail: "Choose a future time for a fresh delayed return."
      )

      DatePicker(
        "Come back on this date",
        selection: $returnDate,
        in: model.semesterDeskCurrentDate...,
        displayedComponents: [.date, .hourAndMinute]
      )
      .datePickerStyle(.graphical)
      .accessibilityIdentifier("study.return-date")

      Label(
        returnDate.formatted(date: .long, time: .shortened),
        systemImage: "calendar.badge.clock"
      )
      .font(.headline)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityElement(children: .combine)

      Text("FORGE saves this date before it closes protected study.")
        .font(.subheadline)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)

      SemesterDeskPrimaryButton(
        title: "Save return date",
        systemImage: "checkmark.circle.fill",
        hint: "Saves the future return date before this surface closes.",
        identifier: "study.save-return-date",
        isDisabled: returnDate <= model.semesterDeskCurrentDate
          || model.isSemesterDeskOperationRunning
      ) {
        scheduleReturn()
      }
    }
  }

  private func delayedReturnStage(
    _ item: UniversitySemesterDeskPlanItem
  ) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.regular) {
      stageHeading(
        "Delayed return",
        detail: "Write a fresh explanation without opening your earlier private text."
      )

      TextEditor(text: studyDraftBinding(for: item.id, field: .delayedReturn))
        .frame(minHeight: 220)
        .padding(ForgeDesign.Spacing.small)
        .scrollContentBackground(.hidden)
        .background(ForgeDesign.surface)
        .overlay {
          RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset)
            .stroke(ForgeDesign.Action.commitment, lineWidth: 2)
        }
        .clipShape(.rect(cornerRadius: ForgeDesign.Radius.inset))
        .accessibilityLabel("Private delayed-return explanation")
        .accessibilityHint("FORGE keeps this text only in process memory.")
        .accessibilityIdentifier("study.delayed-return-text")

      SemesterDeskPrimaryButton(
        title: "I retained this",
        systemImage: "checkmark.seal.fill",
        hint: "Saves only the retained outcome and completes this return.",
        identifier: "study.return-retained",
        isDisabled: delayedReturnText(for: item.id).isEmpty
          || model.isSemesterDeskOperationRunning
      ) {
        completeDelayedReturn(.retained)
      }

      Button("I need more work") {
        completeDelayedReturn(.needsMoreWork)
      }
      .frame(maxWidth: .infinity, minHeight: 48)
      .buttonStyle(.bordered)
      .disabled(
        delayedReturnText(for: item.id).isEmpty
          || model.isSemesterDeskOperationRunning
      )
      .accessibilityHint("Saves this outcome and returns the item to planned work.")
      .accessibilityIdentifier("study.return-needs-work")
    }
    .padding(ForgeDesign.Spacing.regular)
    .background(ForgeDesign.Action.commitmentSurface)
    .clipShape(.rect(cornerRadius: ForgeDesign.Radius.inset))
  }

  private func stageHeading(_ title: String, detail: String) -> some View {
    VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
      Text(title)
        .font(.title2.weight(.semibold))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)

      Text(detail)
        .font(.body)
        .foregroundStyle(ForgeDesign.secondaryText)
        .fixedSize(horizontal: false, vertical: true)
    }
  }

  private var currentStage: StudyStage {
    if model.protectedStudyDelayedReturn?.status == .open {
      return .delayedReturn
    }

    switch model.protectedStudyPlanItem?.status {
    case .inProgress:
      return .practice
    case .practiceComplete:
      return .independentCheck
    case .proofComplete:
      return .returnDate
    case .planned, .deferred, .returnComplete, .none:
      return .practice
    }
  }

  private func independentText(for planItemID: String) -> String {
    model.semesterDeskStudyDraft(for: planItemID)
      .independentCheckText
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private func delayedReturnText(for planItemID: String) -> String {
    model.semesterDeskStudyDraft(for: planItemID)
      .delayedReturnText
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private func studyDraftBinding(
    for planItemID: String,
    field: StudyDraftField
  ) -> Binding<String> {
    Binding(
      get: {
        let draft = model.semesterDeskStudyDraft(for: planItemID)
        switch field {
        case .practice:
          return draft.practiceText
        case .independentCheck:
          return draft.independentCheckText
        case .delayedReturn:
          return draft.delayedReturnText
        }
      },
      set: { value in
        let draft = model.semesterDeskStudyDraft(for: planItemID)
        model.updateSemesterDeskStudyDraft(
          for: planItemID,
          practiceText: field == .practice ? value : draft.practiceText,
          independentCheckText:
            field == .independentCheck ? value : draft.independentCheckText,
          delayedReturnText:
            field == .delayedReturn ? value : draft.delayedReturnText
        )
      }
    )
  }

  private func completePractice(_ outcome: UniversitySemesterDeskPracticeOutcome) {
    Task { @MainActor in
      _ = await model.completeProtectedPractice(outcome: outcome)
    }
  }

  private func submitIndependentCheck(_ outcome: UniversitySemesterDeskProofOutcome) {
    Task { @MainActor in
      _ = await model.submitProtectedIndependentCheck(outcome: outcome)
    }
  }

  private func scheduleReturn() {
    Task { @MainActor in
      _ = await model.scheduleProtectedDelayedReturn(at: returnDate)
    }
  }

  private func completeDelayedReturn(_ outcome: UniversitySemesterDeskRetentionOutcome) {
    Task { @MainActor in
      _ = await model.completeProtectedDelayedReturn(outcome: outcome)
    }
  }
}

private enum StudyStage: CaseIterable, Equatable {
  case practice
  case independentCheck
  case returnDate
  case delayedReturn

  var title: String {
    switch self {
    case .practice:
      "Practice"
    case .independentCheck:
      "Independent check"
    case .returnDate:
      "Return date"
    case .delayedReturn:
      "Delayed return"
    }
  }
}

private enum StudyDraftField: Equatable {
  case practice
  case independentCheck
  case delayedReturn
}
