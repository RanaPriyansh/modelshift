import Foundation

private struct TransitionContext {
  let activity: CatalogActivity, submission: LearnerSubmission
  let assistance: [AssistanceFact], result: ValidatorResult, now: Date
}
public struct UniversityLearningEngine: Sendable {
  public let catalog: ReleasedCatalogSnapshot, validators: ValidatorRegistry

  public init(catalog: ReleasedCatalogSnapshot, validators: ValidatorRegistry) throws {
    try catalog.validate()
    self.catalog = catalog
    self.validators = validators
  }
  public func transition(
    state: LocalLearnerState, submission: LearnerSubmission, now: Date
  ) throws -> LocalLearnerState {
    try state.validate(against: catalog)
    try validateTransitionTime(now, after: state)
    guard let activity = catalog.activities.first(where: { $0.id == submission.activityID }) else {
      throw UniversityLearningError.activityNotFound(id: submission.activityID.rawValue)
    }
    guard state.activeActivityID == activity.id else {
      throw UniversityLearningError.activeActivityMismatch(
        expected: state.activeActivityID.rawValue, actual: activity.id.rawValue)
    }
    guard activity.choices.contains(submission.selectedChoice) else {
      throw UniversityLearningError.invalidChoice(
        activityID: activity.id.rawValue, choice: submission.selectedChoice)
    }
    let context = TransitionContext(
      activity: activity,
      submission: submission,
      assistance: try makeAssistance(submission.assistance, for: activity, now: now),
      result: validators.result(
        for: activity.validatorID, selectedChoice: submission.selectedChoice),
      now: now)
    switch activity.kind {
    case .practice: return try transitionPractice(state, context)
    case .proof: return try transitionProof(state, context)
    case .delayedReturn: return try transitionDelayedReturn(state, context)
    }
  }
  private func transitionPractice(
    _ state: LocalLearnerState, _ context: TransitionContext
  ) throws -> LocalLearnerState {
    let receipt = try makeReceipt(context)
    let nextActivityID =
      context.result == .demonstrated
      ? nextPracticeActivityID(state, context, receipt: receipt) : context.activity.id
    return try nextState(
      state, context, receipt: receipt, nextActivityID: nextActivityID,
      delayedReturns: state.delayedReturns)
  }

  private func nextPracticeActivityID(
    _ state: LocalLearnerState, _ context: TransitionContext, receipt: LocalEvidenceReceipt
  ) -> ActivityID {
    let evidence = state.evidence + [receipt]
    let proofs = catalog.activities.filter {
      $0.kind == .proof && $0.capabilityID == context.activity.capabilityID
        && $0.prerequisiteActivityIDs.contains(context.activity.id)
    }.sorted { $0.id.rawValue < $1.id.rawValue }
    if let proof = proofs.first(where: { proof in
      proof.prerequisiteActivityIDs.allSatisfy {
        hasDemonstratedPractice(
          $0, capabilityID: context.activity.capabilityID, evidence: evidence,
          at: context.now)
      }
    }) {
      return proof.id
    }
    guard let proof = proofs.first else { return context.activity.id }
    let unmet = proof.prerequisiteActivityIDs.filter {
      !hasDemonstratedPractice(
        $0, capabilityID: context.activity.capabilityID, evidence: evidence,
        at: context.now)
    }.sorted { $0.rawValue < $1.rawValue }
    if let next = unmet.first { return next }
    return context.activity.id
  }

  private func hasDemonstratedPractice(
    _ activityID: ActivityID, capabilityID: CapabilityID, evidence: [LocalEvidenceReceipt],
    at now: Date
  ) -> Bool {
    evidence.contains {
      $0.activityKind == .practice && $0.activityID == activityID
        && $0.capabilityID == capabilityID && $0.validatorResult == .demonstrated
        && $0.recordedAt <= now
    }
  }

  private func transitionProof(
    _ state: LocalLearnerState, _ context: TransitionContext
  ) throws -> LocalLearnerState {
    try requirePrerequisites(state, activity: context.activity, before: context.now)
    let receipt = try makeReceipt(context)
    guard context.result == .demonstrated, let policy = context.activity.returnPolicy else {
      return try nextState(
        state, context, receipt: receipt, nextActivityID: context.activity.id,
        delayedReturns: state.delayedReturns)
    }
    guard
      let returnActivity = catalog.activities.first(where: {
        $0.id == policy.delayedReturnActivityID
      })
    else {
      throw UniversityLearningError.missingReference(
        path: "activity.\(context.activity.id.rawValue).returnPolicy.delayedReturnActivityID",
        id: policy.delayedReturnActivityID.rawValue)
    }
    let opensAt = context.now.addingTimeInterval(policy.openDelay)
    let dueAt = opensAt.addingTimeInterval(policy.dueWindow)
    try validateDate(opensAt, path: "delayedReturn.opensAt")
    try validateDate(dueAt, path: "delayedReturn.dueAt")
    let delayedReturn = try DelayedReturnRecord(
      id: try DelayedReturnID("return.\(context.submission.evidenceID.rawValue)"),
      courseID: catalog.courseID,
      activityID: returnActivity.id,
      originEvidenceID: receipt.id,
      opensAt: opensAt,
      dueAt: dueAt,
      completedAt: nil,
      completionEvidenceID: nil)
    guard !state.delayedReturns.contains(where: { $0.id == delayedReturn.id }) else {
      throw UniversityLearningError.duplicateEvidenceID(id: delayedReturn.id.rawValue)
    }
    return try nextState(
      state, context, receipt: receipt, nextActivityID: returnActivity.id,
      delayedReturns: state.delayedReturns + [delayedReturn])
  }

  private func transitionDelayedReturn(
    _ state: LocalLearnerState, _ context: TransitionContext
  ) throws -> LocalLearnerState {
    let matching = state.delayedReturns.filter { $0.activityID == context.activity.id }
    let delayedReturn: DelayedReturnRecord
    if let requestedID = context.submission.delayedReturnID {
      guard let requested = matching.first(where: { $0.id == requestedID }) else {
        throw UniversityLearningError.delayedReturnNotFound(id: requestedID.rawValue)
      }
      delayedReturn = requested
    } else {
      guard let only = matching.first, matching.count == 1 else {
        throw UniversityLearningError.delayedReturnNotFound(id: context.activity.id.rawValue)
      }
      delayedReturn = only
    }
    switch delayedReturn.status(at: context.now) {
    case .scheduled:
      throw UniversityLearningError.delayedReturnNotOpen(id: delayedReturn.id.rawValue)
    case .expired:
      throw UniversityLearningError.delayedReturnExpired(id: delayedReturn.id.rawValue)
    case .completed:
      throw UniversityLearningError.delayedReturnCompleted(id: delayedReturn.id.rawValue)
    case .open, .due: break
    }
    guard let origin = state.evidence.first(where: { $0.id == delayedReturn.originEvidenceID }),
      origin.activityKind == .proof, origin.validatorResult == .demonstrated
    else {
      throw UniversityLearningError.proofNotDemonstrated(
        id: delayedReturn.originEvidenceID.rawValue)
    }
    let receipt = try makeReceipt(context)
    let updatedReturn = try DelayedReturnRecord(
      id: delayedReturn.id,
      courseID: delayedReturn.courseID,
      activityID: delayedReturn.activityID,
      originEvidenceID: delayedReturn.originEvidenceID,
      opensAt: delayedReturn.opensAt,
      dueAt: delayedReturn.dueAt,
      completedAt: context.result == .demonstrated ? context.now : nil,
      completionEvidenceID: context.result == .demonstrated ? receipt.id : nil)
    let returns = state.delayedReturns.map { $0.id == updatedReturn.id ? updatedReturn : $0 }
    return try nextState(
      state, context, receipt: receipt, nextActivityID: context.activity.id,
      delayedReturns: returns)
  }

  private func requirePrerequisites(
    _ state: LocalLearnerState, activity: CatalogActivity, before now: Date
  ) throws {
    for prerequisiteID in activity.prerequisiteActivityIDs {
      guard
        state.evidence.contains(where: {
          $0.activityKind == .practice && $0.activityID == prerequisiteID
            && $0.capabilityID == activity.capabilityID && $0.validatorResult == .demonstrated
            && $0.recordedAt < now
        })
      else {
        throw UniversityLearningError.proofPrerequisiteMissing(
          activityID: activity.id.rawValue, prerequisiteID: prerequisiteID.rawValue)
      }
    }
  }

  private func makeAssistance(
    _ requests: [AssistanceRequest], for activity: CatalogActivity, now: Date
  ) throws -> [AssistanceFact] {
    try validateUnique(
      requests.map(\.id.rawValue), path: "transition.assistance",
      maximum: UniversityLearningLimits.maximumAssistance)
    try validateDate(now, path: "assistance.recordedAt")
    return try requests.map { request in
      if activity.kind == .proof || activity.kind == .delayedReturn {
        guard request.kind == .accessAccommodation, request.preservesConstruct else {
          throw UniversityLearningError.proofAssistanceBlocked(kind: request.kind)
        }
      }
      guard activity.aiBoundary.allows(request) else {
        throw UniversityLearningError.assistanceNotAllowed(kind: request.kind)
      }
      return try AssistanceFact(
        id: request.id,
        courseID: catalog.courseID,
        activityID: activity.id,
        kind: request.kind,
        aiAction: request.aiAction,
        retrievalMode: request.retrievalMode,
        modelIdentityRequirement: request.modelIdentityRequirement,
        preservesConstruct: request.preservesConstruct,
        recordedAt: now)
    }
  }

  private func makeReceipt(_ context: TransitionContext) throws -> LocalEvidenceReceipt {
    try LocalEvidenceReceipt(
      id: context.submission.evidenceID,
      scope: .local,
      courseID: catalog.courseID,
      capabilityID: context.activity.capabilityID,
      activityID: context.activity.id,
      activityKind: context.activity.kind,
      taskFamilyID: context.activity.taskFamilyID,
      proofClaimID: context.activity.proofClaimID,
      validatorID: context.activity.validatorID,
      validatorResult: context.result,
      catalogReleaseID: catalog.catalogReleaseID,
      package: catalog.package,
      limitations: catalog.limitations,
      assistanceIDs: context.assistance.map(\.id),
      recordedAt: context.now)
  }

  private func nextState(
    _ state: LocalLearnerState,
    _ context: TransitionContext,
    receipt: LocalEvidenceReceipt,
    nextActivityID: ActivityID,
    delayedReturns: [DelayedReturnRecord]
  ) throws -> LocalLearnerState {
    guard !state.evidence.contains(where: { $0.id == receipt.id }) else {
      throw UniversityLearningError.duplicateEvidenceID(id: receipt.id.rawValue)
    }
    var progress = state.progress
    if let index = progress.firstIndex(where: { $0.activityID == context.activity.id }) {
      let item = progress[index]
      progress[index] = try LocalActivityProgress(
        courseID: item.courseID,
        activityID: item.activityID,
        capabilityID: item.capabilityID,
        attempts: item.attempts + 1,
        lastResult: receipt.validatorResult,
        lastRecordedAt: context.now)
    } else {
      progress.append(
        try LocalActivityProgress(
          courseID: catalog.courseID,
          activityID: context.activity.id,
          capabilityID: context.activity.capabilityID,
          attempts: 1,
          lastResult: receipt.validatorResult,
          lastRecordedAt: context.now))
    }
    let next = try LocalLearnerState(
      activeCourseID: state.activeCourseID,
      activeActivityID: nextActivityID,
      progress: progress,
      assistance: state.assistance + context.assistance,
      evidence: state.evidence + [receipt],
      delayedReturns: delayedReturns,
      updatedAt: context.now)
    try next.validate(against: catalog)
    return next
  }
}

private func validateTransitionTime(_ now: Date, after state: LocalLearnerState) throws {
  try validateDate(now, path: "transition.now")
  guard now >= state.updatedAt else {
    throw UniversityLearningError.timeRegression(stateUpdatedAt: state.updatedAt, now: now)
  }
}

extension ActivityBoundary {
  fileprivate func allows(_ request: AssistanceRequest) -> Bool {
    guard allowedAIActions.contains(request.aiAction) else { return false }
    if request.kind == .accessAccommodation {
      return allowsConstructPreservingAccess && request.aiAction == .none
        && request.retrievalMode == .none && request.modelIdentityRequirement == .none
        && request.preservesConstruct
    }
    return (request.retrievalMode == .none || request.retrievalMode == retrievalMode)
      && (request.modelIdentityRequirement == .none
        || request.modelIdentityRequirement == modelIdentityRequirement)
  }
}
