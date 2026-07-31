import Foundation

extension ForgeSnapshot {
  public static func sample(
    goal: String = "Become AI-literate",
    mode: LearnerMode = .adult,
    now: Date = .now
  ) -> ForgeSnapshot {
    ForgeSnapshot(
      goal: goal,
      mode: mode,
      nextAction: ForgeNextAction(
        id: "source-claim-check",
        title: "Test a model-generated claim against its sources",
        rationale: "Trustworthy AI use starts with knowing what the evidence can support.",
        durationMinutes: 22,
        state: .ready,
        destination: .focus
      ),
      milestones: [
        ForgeMilestone(
          id: "orientation",
          title: "Orientation",
          detail: "Starting model recorded",
          state: .complete
        ),
        ForgeMilestone(
          id: "claims-evidence",
          title: "Claims and evidence",
          detail: "Active work",
          state: .active
        ),
        ForgeMilestone(
          id: "model-limits",
          title: "Model limits",
          detail: "Next reviewed step",
          state: .next
        ),
        ForgeMilestone(
          id: "further-path",
          title: "Further path",
          detail: "Needs review",
          state: .reviewGap
        ),
      ],
      evidence: [
        ForgeEvidenceRecord(
          id: "source-claim-transfer",
          title: "Source claim transfer",
          status: "Demonstrated once",
          limitation: "Delayed return and broad transfer remain untested.",
          recordedAt: now.addingTimeInterval(-86_400)
        )
      ],
      dueReturn: ForgeDueReturn(
        id: "source-claim-return",
        dueAt: now.addingTimeInterval(3 * 86_400),
        status: "Not tested"
      ),
      updatedAt: now
    )
  }
}
