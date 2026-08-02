import Foundation
import Testing

@testable import ForgeCore

struct UniversityLearningEngineTests {
  @Test
  func differentResponseTextsPersistIdenticalReceiptMetadata() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let first = try UniversityLearningTestSupport.practicedState(
      catalog: catalog, response: "first ephemeral response")
    let second = try UniversityLearningTestSupport.practicedState(
      catalog: catalog, response: "second ephemeral response")
    let firstReceipt = try #require(first.evidence.first)
    let secondReceipt = try #require(second.evidence.first)

    #expect(firstReceipt == secondReceipt)
  }

  @Test
  func wrongAnswersDoNotUnlockProof() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry())
    let initial = try UniversityLearningTestSupport.initialState(catalog: catalog)
    let wrongPractice = try engine.transition(
      state: initial,
      submission: try UniversityLearningTestSupport.submission(
        activityID: practice.id,
        evidenceID: try EvidenceID("evidence.wrong-practice"),
        choice: "changes_direction"),
      now: UniversityLearningTestSupport.date(1))
    #expect(wrongPractice.activeActivityID == practice.id)
    #expect(wrongPractice.evidence.last?.validatorResult == .notDemonstrated)

    let proofState = try LocalLearnerState(
      activeCourseID: catalog.courseID,
      activeActivityID: proof.id,
      progress: wrongPractice.progress,
      assistance: wrongPractice.assistance,
      evidence: wrongPractice.evidence,
      delayedReturns: [],
      updatedAt: UniversityLearningTestSupport.date(2))
    let before = proofState
    UniversityLearningTestSupport.expectError(
      .proofPrerequisiteMissing(
        activityID: proof.id.rawValue,
        prerequisiteID: practice.id.rawValue)
    ) {
      _ = try engine.transition(
        state: proofState,
        submission: try UniversityLearningTestSupport.submission(
          activityID: proof.id,
          evidenceID: try EvidenceID("evidence.proof.blocked"),
          choice: "stays_constant_after_force"),
        now: UniversityLearningTestSupport.date(2))
    }
    #expect(proofState == before)
  }

  @Test
  func proofBeforeAnyPrerequisiteIsRejectedAtomically() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry())
    let state = try UniversityLearningTestSupport.initialState(
      catalog: catalog, activeActivityID: proof.id)
    let before = state

    UniversityLearningTestSupport.expectError(
      .proofPrerequisiteMissing(
        activityID: proof.id.rawValue,
        prerequisiteID: proof.prerequisiteActivityIDs[0].rawValue)
    ) {
      _ = try engine.transition(
        state: state,
        submission: try UniversityLearningTestSupport.submission(
          activityID: proof.id,
          evidenceID: try EvidenceID("evidence.proof.early"),
          choice: "stays_constant_after_force"),
        now: UniversityLearningTestSupport.date(1))
    }
    #expect(state == before)
  }

  @Test
  func timeRegressionIsRejectedAtomically() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry())
    let state = try LocalLearnerState(
      activeCourseID: catalog.courseID, activeActivityID: practice.id,
      progress: [], assistance: [], evidence: [], delayedReturns: [],
      updatedAt: UniversityLearningTestSupport.date(2))
    let before = state
    let now = UniversityLearningTestSupport.date(1)

    UniversityLearningTestSupport.expectError(
      .timeRegression(stateUpdatedAt: state.updatedAt, now: now)
    ) {
      _ = try engine.transition(
        state: state,
        submission: try UniversityLearningTestSupport.submission(
          activityID: practice.id,
          evidenceID: try EvidenceID("evidence.time-regression"),
          choice: "stays_constant_after_force"),
        now: now)
    }
    #expect(state == before)
  }

  @Test
  func prerequisiteAtProofTimeIsRejectedAtomically() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry())
    let practiceTime = UniversityLearningTestSupport.date(2)
    let practiced = try UniversityLearningTestSupport.practicedState(
      catalog: catalog, at: practiceTime)
    let state = try LocalLearnerState(
      activeCourseID: catalog.courseID, activeActivityID: proof.id,
      progress: practiced.progress, assistance: practiced.assistance,
      evidence: practiced.evidence, delayedReturns: [], updatedAt: practiceTime)
    let before = state

    UniversityLearningTestSupport.expectError(
      .proofPrerequisiteMissing(
        activityID: proof.id.rawValue, prerequisiteID: practice.id.rawValue)
    ) {
      _ = try engine.transition(
        state: state,
        submission: try UniversityLearningTestSupport.submission(
          activityID: proof.id,
          evidenceID: try EvidenceID("evidence.same-time-proof"),
          choice: "stays_constant_after_force"),
        now: practiceTime)
    }
    #expect(state == before)
  }

  @Test
  func constructPreservingAccessAccommodationIsAllowedInProof() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry())
    let practiced = try UniversityLearningTestSupport.practicedState(catalog: catalog)
    let access = try AssistanceRequest(
      id: try AssistanceID("assistance.access"),
      kind: .accessAccommodation,
      aiAction: .none,
      retrievalMode: .none,
      modelIdentityRequirement: .none,
      preservesConstruct: true)

    let next = try engine.transition(
      state: practiced,
      submission: try UniversityLearningTestSupport.submission(
        activityID: proof.id,
        evidenceID: try EvidenceID("evidence.proof.access"),
        choice: "stays_constant_after_force",
        assistance: [access]),
      now: UniversityLearningTestSupport.date(2))
    #expect(next.evidence.last?.activityID == proof.id)
    #expect(next.evidence.last?.assistanceIDs == [access.id])
    #expect(next.assistance.last?.kind == .accessAccommodation)
    let delayedReturn = try UniversityLearningTestSupport.activity(.delayedReturn, in: catalog)
    #expect(next.activeActivityID == delayedReturn.id)
  }

  @Test
  func proofBlocksAIInstructionSolutionsReplayAndAnswerChangingHelp() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry())
    let practiced = try UniversityLearningTestSupport.practicedState(catalog: catalog)
    let requests: [(AssistanceKind, AIAction)] = [
      (.ai, .explain),
      (.instructionalHelp, .instruct),
      (.solution, .solution),
      (.replay, .replay),
      (.answerChanging, .answerChanging),
    ]

    for (index, request) in requests.enumerated() {
      let assistance = try AssistanceRequest(
        id: try AssistanceID("assistance.blocked.\(index)"),
        kind: request.0,
        aiAction: request.1,
        retrievalMode: request.0 == .ai ? .catalogOnly : .none,
        modelIdentityRequirement: request.0 == .ai ? .optional : .none,
        preservesConstruct: false)
      let before = practiced
      UniversityLearningTestSupport.expectError(.proofAssistanceBlocked(kind: request.0)) {
        _ = try engine.transition(
          state: practiced,
          submission: try UniversityLearningTestSupport.submission(
            activityID: proof.id,
            evidenceID: try EvidenceID("evidence.blocked.\(index)"),
            choice: "stays_constant_after_force",
            assistance: [assistance]),
          now: UniversityLearningTestSupport.date(2))
      }
      #expect(practiced == before)
    }
  }

  @Test
  func proofDerivesDelayedReturnDatesOriginAndDifferentTaskFamily() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    let delayedReturn = try UniversityLearningTestSupport.activity(.delayedReturn, in: catalog)
    let proofTime = UniversityLearningTestSupport.date(10)
    let state = try UniversityLearningTestSupport.proofReadyState(
      catalog: catalog, proofTime: proofTime)
    let record = try #require(state.delayedReturns.first)
    let proofReceipt = try #require(state.evidence.last)

    #expect(record.activityID == delayedReturn.id)
    #expect(record.opensAt == proofTime.addingTimeInterval(7 * 86_400))
    #expect(record.dueAt == proofTime.addingTimeInterval(37 * 86_400))
    #expect(record.originEvidenceID == proofReceipt.id)
    #expect(proof.taskFamilyID != delayedReturn.taskFamilyID)
    #expect(record.status(at: record.opensAt) == .open)
    #expect(record.status(at: record.dueAt) == .due)
  }

  @Test
  func returnEndpointsAreInclusiveAndWrongReturnStaysOpen() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let delayedReturn = try UniversityLearningTestSupport.activity(.delayedReturn, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry())
    let proofed = try UniversityLearningTestSupport.proofReadyState(catalog: catalog)
    let record = try #require(proofed.delayedReturns.first)
    let wrongAtOpen = try engine.transition(
      state: proofed,
      submission: try UniversityLearningTestSupport.submission(
        activityID: delayedReturn.id,
        evidenceID: try EvidenceID("evidence.return.wrong"),
        choice: "increasing_velocity",
        delayedReturnID: record.id),
      now: record.opensAt)
    let stillOpen = try #require(wrongAtOpen.delayedReturns.first)
    #expect(stillOpen.completedAt == nil)
    #expect(stillOpen.status(at: record.opensAt) == .open)
    #expect(wrongAtOpen.evidence.last?.validatorResult == .notDemonstrated)

    let completed = try engine.transition(
      state: wrongAtOpen,
      submission: try UniversityLearningTestSupport.submission(
        activityID: delayedReturn.id,
        evidenceID: try EvidenceID("evidence.return.correct"),
        choice: "constant_positive_velocity",
        delayedReturnID: record.id),
      now: record.dueAt)
    let finished = try #require(completed.delayedReturns.first)
    #expect(finished.completedAt == record.dueAt)
    #expect(finished.completionEvidenceID == completed.evidence.last?.id)
    #expect(finished.status(at: record.dueAt) == .completed)
    #expect(completed.evidence.last?.validatorResult == .demonstrated)
  }

  @Test
  func expiredReturnIsRejectedWithoutStateChange() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let delayedReturn = try UniversityLearningTestSupport.activity(.delayedReturn, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry())
    let state = try UniversityLearningTestSupport.proofReadyState(catalog: catalog)
    let record = try #require(state.delayedReturns.first)
    let before = state

    UniversityLearningTestSupport.expectError(
      .delayedReturnExpired(id: record.id.rawValue)
    ) {
      _ = try engine.transition(
        state: state,
        submission: try UniversityLearningTestSupport.submission(
          activityID: delayedReturn.id,
          evidenceID: try EvidenceID("evidence.return.expired"),
          choice: "constant_positive_velocity",
          delayedReturnID: record.id),
        now: record.dueAt.addingTimeInterval(1))
    }
    #expect(state == before)
  }

  @Test
  func maximumProgressAttemptFailsWithoutOverflow() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry())
    let state = try UniversityLearningTestSupport.maximumAttemptState(catalog: catalog)
    let before = state

    UniversityLearningTestSupport.expectError(
      .arrayTooLarge(path: "state.evidence", maximum: UniversityLearningLimits.maximumEvidence)
    ) {
      _ = try engine.transition(
        state: state,
        submission: try UniversityLearningTestSupport.submission(
          activityID: practice.id, evidenceID: try EvidenceID("evidence.progress.limit.next"),
          choice: "stays_constant_after_force"),
        now: UniversityLearningTestSupport.date(2))
    }
    #expect(state == before)
  }

  @Test
  func multiplePrerequisitesAdvanceDeterministically() throws {
    let catalog = try UniversityLearningTestSupport.catalogWithMultiplePrerequisites()
    let practices = catalog.activities.filter { $0.kind == .practice }
      .sorted { $0.id.rawValue < $1.id.rawValue }
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry())
    let first = try engine.transition(
      state: try UniversityLearningTestSupport.initialState(catalog: catalog),
      submission: try UniversityLearningTestSupport.submission(
        activityID: practices[0].id,
        evidenceID: try EvidenceID("evidence.multi.first"),
        choice: "stays_constant_after_force"),
      now: UniversityLearningTestSupport.date(1))
    #expect(first.activeActivityID == practices[1].id)

    let second = try engine.transition(
      state: first,
      submission: try UniversityLearningTestSupport.submission(
        activityID: practices[1].id,
        evidenceID: try EvidenceID("evidence.multi.second"),
        choice: "stays_constant_after_force"),
      now: UniversityLearningTestSupport.date(2))
    #expect(second.activeActivityID == proof.id)
  }

  @Test
  func invalidChoiceIsRejectedAtomically() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry())
    let state = try UniversityLearningTestSupport.initialState(catalog: catalog)
    let before = state

    UniversityLearningTestSupport.expectError(
      .invalidChoice(activityID: practice.id.rawValue, choice: "not-a-choice")
    ) {
      _ = try engine.transition(
        state: state,
        submission: try UniversityLearningTestSupport.submission(
          activityID: practice.id,
          evidenceID: try EvidenceID("evidence.invalid-choice"),
          choice: "not-a-choice"),
        now: UniversityLearningTestSupport.date(1))
    }
    #expect(state == before)
  }
}
