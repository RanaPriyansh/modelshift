import ForgeCore
import SwiftUI

struct SemesterProgressView: View {
  @Environment(AppModel.self) private var model

  var body: some View {
    Group {
      if let desk = model.semesterDesk {
        progressList(desk)
      } else {
        ContentUnavailableView(
          "Progress is not available",
          systemImage: "chart.line.uptrend.xyaxis",
          description: Text("Create a Semester Desk before you record learning history.")
        )
      }
    }
    .navigationTitle("Progress")
    .background(ForgeDesign.canvas)
    .accessibilityIdentifier("progress.screen")
  }

  private func progressList(_ desk: UniversitySemesterDeskState) -> some View {
    List {
      if desk.progressEvidence.isEmpty {
        ContentUnavailableView(
          "No learning history",
          systemImage: "clock.arrow.circlepath",
          description: Text(
            "Practice, independent checks, and delayed returns will appear here."
          )
        )
        .listRowBackground(ForgeDesign.canvas)
      } else {
        ForEach(itemsWithEvidence(in: desk), id: \.id) { item in
          Section {
            ForEach(evidence(for: item, in: desk), id: \.id) { record in
              evidenceRow(record)
            }
          } header: {
            VStack(alignment: .leading, spacing: 2) {
              Text(item.title)
              if let course = desk.courses.first(where: { $0.id == item.courseID }) {
                Text("\(course.code) · \(course.title)")
                  .textCase(nil)
              }
            }
            .fixedSize(horizontal: false, vertical: true)
          }
        }
      }

      Section {
        SemesterDeskOperationStatus()
          .listRowBackground(ForgeDesign.canvas)
      }
    }
    .listStyle(.plain)
    .scrollContentBackground(.hidden)
    .background(ForgeDesign.canvas)
  }

  private func evidenceRow(_ record: UniversitySemesterDeskProgressEvidence) -> some View {
    HStack(alignment: .top, spacing: ForgeDesign.Spacing.regular) {
      Image(systemName: symbol(for: record.kind))
        .font(.headline)
        .foregroundStyle(color(for: record.outcome))
        .frame(width: 28, height: 44, alignment: .top)
        .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
        Text(title(for: record.kind))
          .font(.headline)
          .fixedSize(horizontal: false, vertical: true)

        Text(outcome(for: record.outcome))
          .font(.body.weight(.semibold))
          .foregroundStyle(color(for: record.outcome))
          .fixedSize(horizontal: false, vertical: true)

        Text(SemesterDeskDisplay.dateTime(record.occurredAt))
          .font(.subheadline)
          .foregroundStyle(ForgeDesign.secondaryText)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.vertical, ForgeDesign.Spacing.small)
    .accessibilityElement(children: .combine)
  }

  private func itemsWithEvidence(
    in desk: UniversitySemesterDeskState
  ) -> [UniversitySemesterDeskPlanItem] {
    desk.planItems.filter { item in
      desk.progressEvidence.contains { $0.planItemID == item.id }
    }
  }

  private func evidence(
    for item: UniversitySemesterDeskPlanItem,
    in desk: UniversitySemesterDeskState
  ) -> [UniversitySemesterDeskProgressEvidence] {
    desk.progressEvidence.filter { $0.planItemID == item.id }
  }

  private func title(for kind: UniversitySemesterDeskProgressEvidenceKind) -> String {
    switch kind {
    case .practiceCompleted:
      "Practice completed"
    case .independentProofCompleted:
      "Independent check completed"
    case .delayedReturnCompleted:
      "Delayed return completed"
    }
  }

  private func symbol(for kind: UniversitySemesterDeskProgressEvidenceKind) -> String {
    switch kind {
    case .practiceCompleted:
      "pencil.line"
    case .independentProofCompleted:
      "text.bubble"
    case .delayedReturnCompleted:
      "calendar.badge.checkmark"
    }
  }

  private func outcome(for outcome: UniversitySemesterDeskProgressEvidenceOutcome) -> String {
    switch outcome {
    case .completed:
      "Completed"
    case .needsMoreWork, .needsReturn:
      "Needs more work"
    case .demonstrated:
      "Demonstrated"
    case .retained:
      "Retained"
    }
  }

  private func color(for outcome: UniversitySemesterDeskProgressEvidenceOutcome) -> Color {
    switch outcome {
    case .completed, .demonstrated, .retained:
      ForgeDesign.checkedEvidence
    case .needsMoreWork, .needsReturn:
      ForgeDesign.text
    }
  }
}
