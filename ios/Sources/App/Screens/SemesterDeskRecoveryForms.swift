import ForgeCore
import Foundation
import SwiftUI

private struct SemesterRecoveryDecisionDraft: Equatable {
  var outcome: UniversitySemesterDeskRecoveryOutcome
  var nextDate: Date
  var nextMinutes: Int
  var reason: String
}

struct PrepareSemesterRecoveryForm: View {
  @Environment(AppModel.self) private var model
  @State private var recoverySummary = ""
  @State private var decisions: [String: SemesterRecoveryDecisionDraft]

  let plannedItems: [UniversitySemesterDeskPlanItem]

  init(plannedItems: [UniversitySemesterDeskPlanItem]) {
    self.plannedItems = plannedItems
    let calendar = Calendar.autoupdatingCurrent
    let pairs = plannedItems.map { item in
      let currentDate =
        SemesterDeskDisplay.dateOnlyDate(item.currentDate, calendar: calendar) ?? Date.now
      let nextDate = calendar.date(byAdding: .day, value: 1, to: currentDate) ?? currentDate
      return (
        item.id,
        SemesterRecoveryDecisionDraft(
          outcome: .kept,
          nextDate: nextDate,
          nextMinutes: max(1, item.currentMinutes - 15),
          reason: ""
        )
      )
    }
    _decisions = State(initialValue: Dictionary(uniqueKeysWithValues: pairs))
  }

  var body: some View {
    Form {
      Section {
        TextField(
          "State what changed this week",
          text: $recoverySummary,
          axis: .vertical
        )
        .lineLimit(3...8)
        .accessibilityIdentifier("recovery-form.summary")
      } header: {
        Text("Recovery summary")
      } footer: {
        Text("FORGE will not change planned work until you review and confirm the saved draft.")
      }

      if plannedItems.isEmpty {
        Section {
          ContentUnavailableView(
            "No planned work",
            systemImage: "calendar",
            description: Text("Add or resume planned work before you prepare recovery.")
          )
        }
      } else {
        ForEach(plannedItems, id: \.id) { item in
          decisionSection(item)
        }
      }

      Section {
        SemesterDeskFormStatus()
      }

      Section {
        SemesterDeskPrimaryButton(
          title: "Save recovery draft",
          systemImage: "square.and.arrow.down",
          hint: "Saves every decision for review. It does not change planned work.",
          identifier: "recovery-form.save",
          isDisabled: !canSave
        ) {
          save()
        }
      }
    }
    .navigationTitle("Prepare Recovery")
    .navigationBarTitleDisplayMode(.inline)
  }

  private func decisionSection(
    _ item: UniversitySemesterDeskPlanItem
  ) -> some View {
    Section {
      LabeledContent("Previous date", value: SemesterDeskDisplay.date(item.currentDate))
      LabeledContent(
        "Previous duration",
        value: SemesterDeskDisplay.duration(item.currentMinutes)
      )

      Picker("Decision", selection: outcomeBinding(for: item.id)) {
        ForEach(UniversitySemesterDeskRecoveryOutcome.allCases, id: \.self) { outcome in
          Text(outcome.studentLabel).tag(outcome)
        }
      }
      .pickerStyle(.navigationLink)
      .accessibilityIdentifier("recovery-form.outcome.\(item.id)")

      if let draft = decisions[item.id] {
        switch draft.outcome {
        case .moved, .deferred:
          DatePicker(
            "Proposed date",
            selection: dateBinding(for: item.id),
            displayedComponents: .date
          )
          .accessibilityIdentifier("recovery-form.date.\(item.id)")
        case .reduced:
          Stepper(
            value: minutesBinding(for: item.id),
            in: 1...max(1, item.currentMinutes - 1),
            step: 5
          ) {
            LabeledContent(
              "Proposed duration",
              value: SemesterDeskDisplay.duration(draft.nextMinutes)
            )
          }
          .accessibilityIdentifier("recovery-form.minutes.\(item.id)")
        case .kept:
          Text("The date and duration will stay the same.")
            .font(.subheadline)
            .foregroundStyle(ForgeDesign.secondaryText)
        }
      }

      TextField(
        "Reason for this decision",
        text: reasonBinding(for: item.id),
        axis: .vertical
      )
      .lineLimit(2...6)
      .accessibilityIdentifier("recovery-form.reason.\(item.id)")
    } header: {
      Text(item.title)
    }
  }

  private var canSave: Bool {
    !plannedItems.isEmpty
      && !recoverySummary.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && plannedItems.allSatisfy(isDecisionValid)
      && !model.isSemesterDeskOperationRunning
  }

  private func isDecisionValid(_ item: UniversitySemesterDeskPlanItem) -> Bool {
    guard let draft = decisions[item.id],
      !draft.reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else {
      return false
    }

    switch draft.outcome {
    case .moved, .deferred:
      return SemesterDeskDisplay.dateOnly(draft.nextDate) != item.currentDate
    case .reduced:
      return draft.nextMinutes > 0 && draft.nextMinutes < item.currentMinutes
    case .kept:
      return true
    }
  }

  private func outcomeBinding(
    for planItemID: String
  ) -> Binding<UniversitySemesterDeskRecoveryOutcome> {
    Binding(
      get: { decisions[planItemID]?.outcome ?? .kept },
      set: { value in
        guard var draft = decisions[planItemID] else {
          return
        }
        draft.outcome = value
        decisions[planItemID] = draft
      }
    )
  }

  private func dateBinding(for planItemID: String) -> Binding<Date> {
    Binding(
      get: { decisions[planItemID]?.nextDate ?? Date.now },
      set: { value in
        guard var draft = decisions[planItemID] else {
          return
        }
        draft.nextDate = value
        decisions[planItemID] = draft
      }
    )
  }

  private func minutesBinding(for planItemID: String) -> Binding<Int> {
    Binding(
      get: { decisions[planItemID]?.nextMinutes ?? 1 },
      set: { value in
        guard var draft = decisions[planItemID] else {
          return
        }
        draft.nextMinutes = value
        decisions[planItemID] = draft
      }
    )
  }

  private func reasonBinding(for planItemID: String) -> Binding<String> {
    Binding(
      get: { decisions[planItemID]?.reason ?? "" },
      set: { value in
        guard var draft = decisions[planItemID] else {
          return
        }
        draft.reason = value
        decisions[planItemID] = draft
      }
    )
  }

  private func save() {
    let inputs = plannedItems.compactMap { item -> UniversitySemesterDeskRecoveryDecisionInput? in
      guard let draft = decisions[item.id] else {
        return nil
      }
      let nextDate: String?
      let nextMinutes: Int?
      switch draft.outcome {
      case .moved, .deferred:
        nextDate = SemesterDeskDisplay.dateOnly(draft.nextDate)
        nextMinutes = nil
      case .reduced:
        nextDate = nil
        nextMinutes = draft.nextMinutes
      case .kept:
        nextDate = nil
        nextMinutes = nil
      }
      return UniversitySemesterDeskRecoveryDecisionInput(
        planItemID: item.id,
        outcome: draft.outcome,
        nextDate: nextDate,
        nextMinutes: nextMinutes,
        reason: draft.reason
      )
    }

    Task { @MainActor in
      let didSave = await model.applySemesterDeskCommand(
        .prepareRecovery(
          profileID: model.localProfileID,
          summary: recoverySummary,
          decisions: inputs
        )
      )
      if didSave {
        model.dismissSemesterDeskSheet()
      }
    }
  }
}

struct ReviewSemesterRecoveryForm: View {
  @Environment(AppModel.self) private var model

  var body: some View {
    Form {
      if let draft = model.semesterDesk?.recoveryDraft {
        Section {
          Text(draft.summary)
            .font(.body)
            .fixedSize(horizontal: false, vertical: true)

          Text("Review every previous and proposed value before confirmation.")
            .font(.subheadline)
            .foregroundStyle(ForgeDesign.secondaryText)
            .fixedSize(horizontal: false, vertical: true)
        } header: {
          Text("Recovery summary")
        }

        ForEach(draft.decisions, id: \.planItemID) { decision in
          reviewSection(decision)
        }

        Section {
          SemesterDeskFormStatus()
        }

        Section {
          SemesterDeskPrimaryButton(
            title: "Confirm every recovery change",
            systemImage: "checkmark.circle.fill",
            hint: "Saves every reviewed change and closes the recovery draft.",
            identifier: "recovery-review.confirm",
            isDisabled: model.isSemesterDeskOperationRunning
          ) {
            confirm()
          }
        } footer: {
          Text("FORGE will not select the next action after this confirmation.")
        }
      } else {
        Section {
          ContentUnavailableView(
            "No recovery draft",
            systemImage: "checkmark.circle",
            description: Text("Prepare a recovery draft before you review changes.")
          )
        }
      }
    }
    .navigationTitle("Review Recovery")
    .navigationBarTitleDisplayMode(.inline)
  }

  private func reviewSection(
    _ decision: UniversitySemesterDeskRecoveryDecision
  ) -> some View {
    let item = model.semesterDesk?.planItems.first { $0.id == decision.planItemID }
    return Section {
      LabeledContent(
        "Decision",
        value: decision.outcome.studentLabel
      )

      if let item {
        LabeledContent(
          "Previous date",
          value: SemesterDeskDisplay.date(item.currentDate)
        )
        LabeledContent(
          "Previous duration",
          value: SemesterDeskDisplay.duration(item.currentMinutes)
        )
        LabeledContent(
          "Proposed date",
          value: SemesterDeskDisplay.date(decision.nextDate ?? item.currentDate)
        )
        LabeledContent(
          "Proposed duration",
          value: SemesterDeskDisplay.duration(decision.nextMinutes ?? item.currentMinutes)
        )
      }

      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        Text("Reason")
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
        Text(decision.reason)
          .font(.body)
          .fixedSize(horizontal: false, vertical: true)
      }
      .accessibilityElement(children: .combine)
    } header: {
      Text(item?.title ?? "Planned work")
    }
  }

  private func confirm() {
    Task { @MainActor in
      let didSave = await model.applySemesterDeskCommand(
        .confirmRecovery(profileID: model.localProfileID)
      )
      if didSave {
        model.dismissSemesterDeskSheet()
      }
    }
  }
}
