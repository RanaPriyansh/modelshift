import Foundation

/// Applies the private, deterministic university Semester Desk state machine.
public enum UniversitySemesterDeskEngine {
  /// Validate a decoded Semester Desk before an application accepts it.
  public static func validate(
    state: UniversitySemesterDeskState
  ) -> Result<Void, UniversitySemesterDeskError> {
    if let error = stateValidationError(for: state) {
      return .failure(error)
    }
    return .success(())
  }

  /// Create one profile-bound Semester Desk.
  public static func create(
    input: UniversitySemesterDeskCreateInput,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedIdentifier(input.profileID), isBoundedShortText(input.title) else {
      return failure(.invalidInput, "A Semester Desk needs a profile and a title.")
    }
    switch timestamp(from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let createdAt):
      switch identifier(.semester, from: runtime) {
      case .failure(let error):
        return .failure(error)
      case .success(let id):
        let state = UniversitySemesterDeskState(
          schemaVersion: UniversitySemesterDeskSchema.version,
          id: id,
          profileID: input.profileID,
          title: input.title.trimmed,
          createdAt: createdAt,
          updatedAt: createdAt,
          courses: [],
          capacity: nil,
          capacityDraft: nil,
          planItems: [],
          recoveryDraft: nil,
          recoveryChanges: [],
          selectedNextActionID: nil,
          protectedStudySessions: [],
          independentProofs: [],
          delayedReturns: [],
          progressEvidence: []
        )
        return validated(state)
      }
    }
  }

  /// Apply one explicit student action without changing the supplied state.
  public static func transition(
    state: UniversitySemesterDeskState,
    command: UniversitySemesterDeskCommand,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedIdentifier(command.profileID), state.profileID == command.profileID else {
      return failure(.profileMismatch, "This action belongs to a different profile.")
    }
    if let error = stateValidationError(for: state) {
      return .failure(error)
    }
    let now: String
    switch timestamp(from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      now = value
    }

    switch command {
    case .addCourse(_, let code, let title):
      return addCourse(state: state, code: code, title: title, now: now, runtime: runtime)
    case .addCourseFact(
      _, let courseID, let label, let value, let status, let sourceLabel, let checkedAt):
      return addCourseFact(
        state: state,
        courseID: courseID,
        label: label,
        value: value,
        status: status,
        sourceLabel: sourceLabel,
        checkedAt: checkedAt,
        now: now,
        runtime: runtime
      )
    case .setCourseFactStatus(_, let courseID, let factID, let status, let checkedAt):
      return setCourseFactStatus(
        state: state,
        courseID: courseID,
        factID: factID,
        status: status,
        checkedAt: checkedAt,
        now: now
      )
    case .recordFactConflict(_, let courseID, let factIDs, let summary):
      return recordFactConflict(
        state: state,
        courseID: courseID,
        factIDs: factIDs,
        summary: summary,
        now: now,
        runtime: runtime
      )
    case .reviewFactConflict(_, let courseID, let conflictID):
      return reviewFactConflict(
        state: state,
        courseID: courseID,
        conflictID: conflictID,
        now: now
      )
    case .draftCapacity(_, let availableMinutes):
      return draftCapacity(
        state: state,
        availableMinutes: availableMinutes,
        now: now,
        runtime: runtime
      )
    case .confirmCapacity:
      return confirmCapacity(state: state, now: now)
    case .addPlanItem(_, let courseID, let title, let date, let minutes):
      return addPlanItem(
        state: state,
        courseID: courseID,
        title: title,
        date: date,
        minutes: minutes,
        now: now,
        runtime: runtime
      )
    case .prepareRecovery(_, let summary, let decisions):
      return prepareRecovery(
        state: state,
        summary: summary,
        decisions: decisions,
        now: now,
        runtime: runtime
      )
    case .confirmRecovery:
      return confirmRecovery(state: state, now: now, runtime: runtime)
    case .chooseNextAction(_, let planItemID):
      return chooseNextAction(state: state, planItemID: planItemID, now: now)
    case .resumeDeferredItem(_, let planItemID):
      return resumeDeferredItem(state: state, planItemID: planItemID, now: now)
    case .startProtectedStudy(_, let planItemID):
      return startProtectedStudy(state: state, planItemID: planItemID, now: now, runtime: runtime)
    case .completePractice(_, let studySessionID, let outcome):
      return completePractice(
        state: state,
        studySessionID: studySessionID,
        outcome: outcome,
        now: now,
        runtime: runtime
      )
    case .submitIndependentProof(_, let planItemID, let outcome):
      return submitIndependentProof(
        state: state,
        planItemID: planItemID,
        outcome: outcome,
        now: now,
        runtime: runtime
      )
    case .scheduleDelayedReturn(_, let planItemID, let dueAt):
      return scheduleDelayedReturn(
        state: state,
        planItemID: planItemID,
        dueAt: dueAt,
        now: now,
        runtime: runtime
      )
    case .openDelayedReturn(_, let delayedReturnID):
      return openDelayedReturn(state: state, delayedReturnID: delayedReturnID, now: now)
    case .completeDelayedReturn(_, let delayedReturnID, let outcome):
      return completeDelayedReturn(
        state: state,
        delayedReturnID: delayedReturnID,
        outcome: outcome,
        now: now,
        runtime: runtime
      )
    }
  }

  /// Return plan items in their authored order.
  public static func orderedPlanItems(
    in state: UniversitySemesterDeskState
  ) -> [UniversitySemesterDeskPlanItem] {
    state.planItems.map { $0 }
  }

  /// Return answer-free progress evidence for a learner-facing progress view.
  public static func progressEvidence(
    in state: UniversitySemesterDeskState
  ) -> [UniversitySemesterDeskProgressEvidence] {
    state.progressEvidence.map { $0 }
  }

  private static func addCourse(
    state: UniversitySemesterDeskState,
    code: String,
    title: String,
    now: String,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedShortText(code), isBoundedShortText(title) else {
      return failure(.invalidInput, "A course needs a code and a title.")
    }
    let cleanCode = code.trimmed
    guard !state.courses.contains(where: { $0.code == cleanCode }) else {
      return failure(.alreadyExists, "A course with this code already exists in the Semester Desk.")
    }
    switch identifier(.course, from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let id):
      let course = UniversitySemesterDeskCourse(
        id: id,
        code: cleanCode,
        title: title.trimmed,
        facts: [],
        factConflicts: []
      )
      return validated(
        copying(state) { draft in
          draft.updatedAt = now
          draft.courses.append(course)
        })
    }
  }

  private static func addCourseFact(
    state: UniversitySemesterDeskState,
    courseID: String,
    label: String,
    value: String,
    status: UniversitySemesterDeskCourseFactStatus,
    sourceLabel: String,
    checkedAt: String?,
    now: String,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedShortText(label), isBoundedLongText(value), isBoundedShortText(sourceLabel)
    else {
      return failure(.invalidInput, "A course fact needs text and a source label.")
    }
    if status == .checked && (checkedAt == nil || !isValidTimestamp(checkedAt ?? "")) {
      return failure(.invalidInput, "A checked course fact needs a valid check time.")
    }
    if let checkedAt, !isValidTimestamp(checkedAt) {
      return failure(.invalidInput, "The course fact check time is invalid.")
    }
    let course: UniversitySemesterDeskCourse
    switch courseFor(courseID, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      course = value
    }
    switch identifier(.courseFact, from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let id):
      let fact = UniversitySemesterDeskCourseFact(
        id: id,
        label: label.trimmed,
        value: value.trimmed,
        status: status,
        sourceLabel: sourceLabel.trimmed,
        checkedAt: checkedAt
      )
      let updatedCourse = UniversitySemesterDeskCourse(
        id: course.id,
        code: course.code,
        title: course.title,
        facts: course.facts + [fact],
        factConflicts: course.factConflicts
      )
      return validated(replacingCourse(in: state, with: updatedCourse, now: now))
    }
  }

  private static func setCourseFactStatus(
    state: UniversitySemesterDeskState,
    courseID: String,
    factID: String,
    status: UniversitySemesterDeskCourseFactStatus,
    checkedAt: String?,
    now: String
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    if status == .checked && (checkedAt == nil || !isValidTimestamp(checkedAt ?? "")) {
      return failure(.invalidInput, "A checked course fact needs a valid check time.")
    }
    if let checkedAt, !isValidTimestamp(checkedAt) {
      return failure(.invalidInput, "The course fact check time is invalid.")
    }
    let course: UniversitySemesterDeskCourse
    switch courseFor(courseID, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      course = value
    }
    guard isBoundedIdentifier(factID), course.facts.contains(where: { $0.id == factID }) else {
      return failure(.notFound, "The course fact does not exist in this course.")
    }
    let facts = course.facts.map { fact in
      guard fact.id == factID else { return fact }
      return UniversitySemesterDeskCourseFact(
        id: fact.id,
        label: fact.label,
        value: fact.value,
        status: status,
        sourceLabel: fact.sourceLabel,
        checkedAt: checkedAt ?? fact.checkedAt
      )
    }
    let updatedCourse = UniversitySemesterDeskCourse(
      id: course.id,
      code: course.code,
      title: course.title,
      facts: facts,
      factConflicts: course.factConflicts
    )
    return validated(replacingCourse(in: state, with: updatedCourse, now: now))
  }

  private static func recordFactConflict(
    state: UniversitySemesterDeskState,
    courseID: String,
    factIDs: [String],
    summary: String,
    now: String,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedLongText(summary), factIDs.count >= 2 else {
      return failure(.invalidInput, "A fact conflict needs two facts and a summary.")
    }
    let course: UniversitySemesterDeskCourse
    switch courseFor(courseID, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      course = value
    }
    let factIDSet = Set(factIDs)
    guard factIDs.allSatisfy(isBoundedIdentifier), factIDSet.count == factIDs.count,
      factIDs.allSatisfy({ factID in course.facts.contains(where: { $0.id == factID }) })
    else {
      return failure(
        .invalidInput, "A fact conflict must reference distinct facts from this course.")
    }
    switch identifier(.factConflict, from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let id):
      let conflict = UniversitySemesterDeskFactConflict(
        id: id,
        factIDs: factIDs,
        summary: summary.trimmed,
        status: .open,
        detectedAt: now,
        reviewedAt: nil
      )
      let updatedCourse = UniversitySemesterDeskCourse(
        id: course.id,
        code: course.code,
        title: course.title,
        facts: course.facts,
        factConflicts: course.factConflicts + [conflict]
      )
      return validated(replacingCourse(in: state, with: updatedCourse, now: now))
    }
  }

  private static func reviewFactConflict(
    state: UniversitySemesterDeskState,
    courseID: String,
    conflictID: String,
    now: String
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    let course: UniversitySemesterDeskCourse
    switch courseFor(courseID, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      course = value
    }
    guard isBoundedIdentifier(conflictID),
      let conflict = course.factConflicts.first(where: { $0.id == conflictID })
    else {
      return failure(.notFound, "The fact conflict does not exist in this course.")
    }
    guard conflict.status == .open else {
      return failure(.invalidTransition, "The fact conflict is already resolved.")
    }
    let conflicts = course.factConflicts.map { entry in
      guard entry.id == conflictID else { return entry }
      return UniversitySemesterDeskFactConflict(
        id: entry.id,
        factIDs: entry.factIDs,
        summary: entry.summary,
        status: .resolved,
        detectedAt: entry.detectedAt,
        reviewedAt: now
      )
    }
    let updatedCourse = UniversitySemesterDeskCourse(
      id: course.id,
      code: course.code,
      title: course.title,
      facts: course.facts,
      factConflicts: conflicts
    )
    return validated(replacingCourse(in: state, with: updatedCourse, now: now))
  }

  private static func draftCapacity(
    state: UniversitySemesterDeskState,
    availableMinutes: Int,
    now: String,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard availableMinutes >= 0 else {
      return failure(.invalidInput, "Capacity must be zero or more whole minutes.")
    }
    switch identifier(.capacityDraft, from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let id):
      let draft = UniversitySemesterDeskCapacityDraft(
        id: id,
        availableMinutes: availableMinutes,
        draftedAt: now
      )
      return validated(
        copying(state) { next in
          next.updatedAt = now
          next.capacityDraft = draft
        })
    }
  }

  private static func confirmCapacity(
    state: UniversitySemesterDeskState,
    now: String
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard let draft = state.capacityDraft else {
      return failure(.capacityDraftMissing, "Draft capacity before confirmation.")
    }
    let capacity = UniversitySemesterDeskConfirmedCapacity(
      availableMinutes: draft.availableMinutes,
      declaredAt: now
    )
    return validated(
      copying(state) { next in
        next.updatedAt = now
        next.capacity = capacity
        next.capacityDraft = nil
      })
  }

  private static func addPlanItem(
    state: UniversitySemesterDeskState,
    courseID: String,
    title: String,
    date: String,
    minutes: Int,
    now: String,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedShortText(title), isValidDateOnly(date), minutes > 0
    else {
      return failure(.invalidInput, "A plan item needs a title, date, and positive whole minutes.")
    }
    let course: UniversitySemesterDeskCourse
    switch courseFor(courseID, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      course = value
    }
    switch identifier(.planItem, from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let id):
      let item = UniversitySemesterDeskPlanItem(
        id: id,
        courseID: course.id,
        title: title.trimmed,
        originalDate: date,
        currentDate: date,
        originalMinutes: minutes,
        currentMinutes: minutes,
        status: .planned
      )
      return validated(
        copying(state) { next in
          next.updatedAt = now
          next.planItems.append(item)
        })
    }
  }

  private static func prepareRecovery(
    state: UniversitySemesterDeskState,
    summary: String,
    decisions: [UniversitySemesterDeskRecoveryDecisionInput],
    now: String,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedLongText(summary) else {
      return failure(.invalidInput, "A recovery draft needs a summary.")
    }
    guard state.recoveryDraft == nil else {
      return failure(.invalidTransition, "Confirm or replace the current recovery draft first.")
    }
    let recoverableItems = state.planItems.filter { $0.status == .planned }
    guard !recoverableItems.isEmpty else {
      return failure(.invalidTransition, "There is no planned work to recover.")
    }
    let decisionIDs = decisions.map(\.planItemID)
    guard Set(decisionIDs).count == decisions.count,
      decisionIDs.count == recoverableItems.count,
      recoverableItems.allSatisfy({ decisionIDs.contains($0.id) })
    else {
      return failure(
        .recoveryDecisionInvalid,
        "Recovery must state one explicit decision for every planned item."
      )
    }
    var checkedDecisions = [UniversitySemesterDeskRecoveryDecision]()
    checkedDecisions.reserveCapacity(decisions.count)
    for input in decisions {
      guard isBoundedIdentifier(input.planItemID), isBoundedLongText(input.reason) else {
        return failure(.recoveryDecisionInvalid, "Each recovery decision needs a reason.")
      }
      guard let item = recoverableItems.first(where: { $0.id == input.planItemID }) else {
        return failure(
          .recoveryDecisionInvalid, "Recovery cannot include work that is not currently planned.")
      }
      switch checkedRecoveryDecision(for: item, input: input) {
      case .failure(let error):
        return .failure(error)
      case .success(let decision):
        checkedDecisions.append(decision)
      }
    }
    switch identifier(.recoveryDraft, from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let id):
      let draft = UniversitySemesterDeskRecoveryDraft(
        id: id,
        summary: summary.trimmed,
        createdAt: now,
        decisions: checkedDecisions
      )
      return validated(
        copying(state) { next in
          next.updatedAt = now
          next.recoveryDraft = draft
        })
    }
  }

  private static func confirmRecovery(
    state: UniversitySemesterDeskState,
    now: String,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard let draft = state.recoveryDraft else {
      return failure(.recoveryDraftMissing, "Prepare a recovery draft before confirmation.")
    }
    let decisionsByPlanItemID = Dictionary(
      uniqueKeysWithValues: draft.decisions.map { ($0.planItemID, $0) }
    )
    var planItems = [UniversitySemesterDeskPlanItem]()
    var changes = [UniversitySemesterDeskRecoveryChange]()
    planItems.reserveCapacity(state.planItems.count)
    changes.reserveCapacity(draft.decisions.count)
    for item in state.planItems {
      guard let decision = decisionsByPlanItemID[item.id] else {
        planItems.append(item)
        continue
      }
      let nextItem = applying(decision, to: item)
      let changeID: String
      switch identifier(.recoveryChange, from: runtime) {
      case .failure(let error):
        return .failure(error)
      case .success(let id):
        changeID = id
      }
      changes.append(
        UniversitySemesterDeskRecoveryChange(
          id: changeID,
          recoveryDraftID: draft.id,
          planItemID: item.id,
          outcome: decision.outcome,
          reason: decision.reason,
          previousDate: item.currentDate,
          currentDate: nextItem.currentDate,
          previousMinutes: item.currentMinutes,
          currentMinutes: nextItem.currentMinutes,
          recordedAt: now
        )
      )
      planItems.append(nextItem)
    }
    let recoveredState = copying(state) { next in
      next.planItems = planItems
    }
    let selectedNextActionID: String?
    if let selectedID = state.selectedNextActionID,
      let selectedItem = planItems.first(where: { $0.id == selectedID }),
      case .success = actionable(item: selectedItem, in: recoveredState)
    {
      selectedNextActionID = selectedID
    } else {
      selectedNextActionID = nil
    }
    return validated(
      copying(state) { next in
        next.updatedAt = now
        next.planItems = planItems
        next.recoveryChanges += changes
        next.recoveryDraft = nil
        next.selectedNextActionID = selectedNextActionID
      })
  }

  private static func chooseNextAction(
    state: UniversitySemesterDeskState,
    planItemID: String,
    now: String
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedIdentifier(planItemID) else {
      return failure(.notFound, "The plan item does not exist in this Semester Desk.")
    }
    let item: UniversitySemesterDeskPlanItem
    switch planItem(for: planItemID, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      item = value
    }
    switch actionable(item: item, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      return validated(
        copying(state) { next in
          next.updatedAt = now
          next.selectedNextActionID = value.id
        })
    }
  }

  private static func resumeDeferredItem(
    state: UniversitySemesterDeskState,
    planItemID: String,
    now: String
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedIdentifier(planItemID) else {
      return failure(.notFound, "The plan item does not exist in this Semester Desk.")
    }
    let item: UniversitySemesterDeskPlanItem
    switch planItem(for: planItemID, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      item = value
    }
    guard item.status == .deferred else {
      return failure(
        .invalidTransition, "Only deferred work can return to the active semester plan.")
    }
    let resumed = planItem(item, status: .planned)
    return validated(replacingPlanItem(in: state, with: resumed, now: now))
  }

  private static func startProtectedStudy(
    state: UniversitySemesterDeskState,
    planItemID: String,
    now: String,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedIdentifier(planItemID) else {
      return failure(
        .nextActionRequired, "Choose this item as the next action before protected study.")
    }
    guard state.selectedNextActionID == planItemID else {
      return failure(
        .nextActionRequired, "Choose this item as the next action before protected study.")
    }
    guard !state.protectedStudySessions.contains(where: { $0.status == .active }) else {
      return failure(
        .invalidTransition, "Complete the active protected study before starting another one.")
    }
    let item: UniversitySemesterDeskPlanItem
    switch planItem(for: planItemID, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      item = value
    }
    let action: UniversitySemesterDeskPlanItem
    switch actionable(item: item, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      action = value
    }
    switch identifier(.studySession, from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let id):
      let activeItem = planItem(action, status: .inProgress)
      let session = UniversitySemesterDeskProtectedStudySession(
        id: id,
        planItemID: activeItem.id,
        status: .active,
        startedAt: now,
        practiceCompletedAt: nil,
        practiceOutcome: nil
      )
      return validated(
        copying(state) { next in
          next.updatedAt = now
          next.planItems = next.planItems.map { $0.id == activeItem.id ? activeItem : $0 }
          next.protectedStudySessions.append(session)
        })
    }
  }

  private static func completePractice(
    state: UniversitySemesterDeskState,
    studySessionID: String,
    outcome: UniversitySemesterDeskPracticeOutcome,
    now: String,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedIdentifier(studySessionID) else {
      return failure(.notFound, "The protected study session does not exist.")
    }
    guard let session = state.protectedStudySessions.first(where: { $0.id == studySessionID })
    else {
      return failure(.notFound, "The protected study session does not exist.")
    }
    guard session.status == .active else {
      return failure(.invalidTransition, "Practice is already complete for this protected study.")
    }
    let item: UniversitySemesterDeskPlanItem
    switch planItem(for: session.planItemID, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      item = value
    }
    guard item.status == .inProgress else {
      return failure(.invalidTransition, "This plan item is not in protected study.")
    }
    let evidenceID: String
    switch identifier(.progressEvidence, from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let id):
      evidenceID = id
    }
    let isComplete = outcome == .completed
    let updatedItem = planItem(item, status: isComplete ? .practiceComplete : .inProgress)
    let updatedSession = UniversitySemesterDeskProtectedStudySession(
      id: session.id,
      planItemID: session.planItemID,
      status: isComplete ? .practiceComplete : .active,
      startedAt: session.startedAt,
      practiceCompletedAt: isComplete ? now : nil,
      practiceOutcome: outcome
    )
    let evidence = UniversitySemesterDeskProgressEvidence(
      id: evidenceID,
      planItemID: item.id,
      kind: .practiceCompleted,
      outcome: isComplete ? .completed : .needsMoreWork,
      occurredAt: now
    )
    return validated(
      copying(state) { next in
        next.updatedAt = now
        next.planItems = next.planItems.map { $0.id == updatedItem.id ? updatedItem : $0 }
        next.protectedStudySessions = next.protectedStudySessions.map {
          $0.id == updatedSession.id ? updatedSession : $0
        }
        next.progressEvidence.append(evidence)
      })
  }

  private static func submitIndependentProof(
    state: UniversitySemesterDeskState,
    planItemID: String,
    outcome: UniversitySemesterDeskProofOutcome,
    now: String,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedIdentifier(planItemID) else {
      return failure(.notFound, "The plan item does not exist in this Semester Desk.")
    }
    let item: UniversitySemesterDeskPlanItem
    switch planItem(for: planItemID, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      item = value
    }
    guard item.status == .practiceComplete else {
      return failure(.practiceRequired, "Complete protected practice before independent proof.")
    }
    let proofID: String
    switch identifier(.proof, from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let id):
      proofID = id
    }
    let evidenceID: String
    switch identifier(.progressEvidence, from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let id):
      evidenceID = id
    }
    let proof = UniversitySemesterDeskIndependentProof(
      id: proofID,
      planItemID: item.id,
      outcome: outcome,
      completedAt: now
    )
    let evidence = UniversitySemesterDeskProgressEvidence(
      id: evidenceID,
      planItemID: item.id,
      kind: .independentProofCompleted,
      outcome: outcome == .demonstrated ? .demonstrated : .needsReturn,
      occurredAt: now
    )
    let updatedItem = planItem(item, status: .proofComplete)
    return validated(
      copying(state) { next in
        next.updatedAt = now
        next.planItems = next.planItems.map { $0.id == updatedItem.id ? updatedItem : $0 }
        next.independentProofs.append(proof)
        next.progressEvidence.append(evidence)
      })
  }

  private static func scheduleDelayedReturn(
    state: UniversitySemesterDeskState,
    planItemID: String,
    dueAt: String,
    now: String,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isValidTimestamp(dueAt), dueAt > now else {
      return failure(.invalidInput, "A delayed return needs a future due time.")
    }
    let item: UniversitySemesterDeskPlanItem
    switch planItem(for: planItemID, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      item = value
    }
    guard item.status == .proofComplete else {
      return failure(.proofRequired, "Complete independent proof before a delayed return.")
    }
    guard
      !state.delayedReturns.contains(where: {
        $0.planItemID == item.id && $0.status != .completed
      })
    else {
      return failure(.invalidTransition, "This plan item already has an unfinished delayed return.")
    }
    switch identifier(.delayedReturn, from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let id):
      let delayedReturn = UniversitySemesterDeskDelayedReturn(
        id: id,
        planItemID: item.id,
        dueAt: dueAt,
        status: .due,
        openedAt: nil,
        completedAt: nil,
        retentionOutcome: nil
      )
      return validated(
        copying(state) { next in
          next.updatedAt = now
          next.delayedReturns.append(delayedReturn)
        })
    }
  }

  private static func openDelayedReturn(
    state: UniversitySemesterDeskState,
    delayedReturnID: String,
    now: String
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedIdentifier(delayedReturnID) else {
      return failure(.notFound, "The delayed return does not exist.")
    }
    guard let delayedReturn = state.delayedReturns.first(where: { $0.id == delayedReturnID }) else {
      return failure(.notFound, "The delayed return does not exist.")
    }
    guard delayedReturn.status == .due else {
      return failure(.invalidTransition, "Only a due delayed return can open.")
    }
    guard now >= delayedReturn.dueAt else {
      return failure(.returnNotDue, "This delayed return is not due yet.")
    }
    let opened = UniversitySemesterDeskDelayedReturn(
      id: delayedReturn.id,
      planItemID: delayedReturn.planItemID,
      dueAt: delayedReturn.dueAt,
      status: .open,
      openedAt: now,
      completedAt: nil,
      retentionOutcome: nil
    )
    return validated(
      copying(state) { next in
        next.updatedAt = now
        next.delayedReturns = next.delayedReturns.map { $0.id == opened.id ? opened : $0 }
      })
  }

  private static func completeDelayedReturn(
    state: UniversitySemesterDeskState,
    delayedReturnID: String,
    outcome: UniversitySemesterDeskRetentionOutcome,
    now: String,
    runtime: UniversitySemesterDeskRuntime
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    guard isBoundedIdentifier(delayedReturnID) else {
      return failure(.notFound, "The delayed return does not exist.")
    }
    guard let delayedReturn = state.delayedReturns.first(where: { $0.id == delayedReturnID }) else {
      return failure(.notFound, "The delayed return does not exist.")
    }
    guard delayedReturn.status == .open else {
      return failure(.returnNotOpen, "Open the delayed return before completion.")
    }
    let item: UniversitySemesterDeskPlanItem
    switch planItem(for: delayedReturn.planItemID, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      item = value
    }
    let evidenceID: String
    switch identifier(.progressEvidence, from: runtime) {
    case .failure(let error):
      return .failure(error)
    case .success(let id):
      evidenceID = id
    }
    let retained = outcome == .retained
    let updatedItem = planItem(item, status: retained ? .returnComplete : .planned)
    let completedReturn = UniversitySemesterDeskDelayedReturn(
      id: delayedReturn.id,
      planItemID: delayedReturn.planItemID,
      dueAt: delayedReturn.dueAt,
      status: .completed,
      openedAt: delayedReturn.openedAt,
      completedAt: now,
      retentionOutcome: outcome
    )
    let evidence = UniversitySemesterDeskProgressEvidence(
      id: evidenceID,
      planItemID: item.id,
      kind: .delayedReturnCompleted,
      outcome: retained ? .retained : .needsMoreWork,
      occurredAt: now
    )
    return validated(
      copying(state) { next in
        next.updatedAt = now
        next.planItems = next.planItems.map { $0.id == updatedItem.id ? updatedItem : $0 }
        next.selectedNextActionID =
          retained && state.selectedNextActionID == item.id
          ? nil
          : state.selectedNextActionID
        next.delayedReturns = next.delayedReturns.map {
          $0.id == completedReturn.id ? completedReturn : $0
        }
        next.progressEvidence.append(evidence)
      })
  }

  private static func checkedRecoveryDecision(
    for item: UniversitySemesterDeskPlanItem,
    input: UniversitySemesterDeskRecoveryDecisionInput
  ) -> Result<UniversitySemesterDeskRecoveryDecision, UniversitySemesterDeskError> {
    guard isBoundedIdentifier(input.planItemID), isBoundedLongText(input.reason) else {
      return failure(.recoveryDecisionInvalid, "Each recovery decision needs a reason.")
    }
    switch input.outcome {
    case .moved:
      guard let nextDate = input.nextDate,
        isValidDateOnly(nextDate),
        nextDate != item.currentDate,
        input.nextMinutes == nil
      else {
        return failure(
          .recoveryDecisionInvalid,
          "A moved item needs a different valid current date and unchanged minutes."
        )
      }
      return .success(
        UniversitySemesterDeskRecoveryDecision(
          planItemID: item.id,
          outcome: .moved,
          nextDate: nextDate,
          nextMinutes: nil,
          reason: input.reason.trimmed
        )
      )
    case .reduced:
      guard let nextMinutes = input.nextMinutes,
        nextMinutes > 0,
        nextMinutes < item.currentMinutes,
        input.nextDate == nil
      else {
        return failure(
          .recoveryDecisionInvalid,
          "A reduced item needs fewer positive minutes and an unchanged date."
        )
      }
      return .success(
        UniversitySemesterDeskRecoveryDecision(
          planItemID: item.id,
          outcome: .reduced,
          nextDate: nil,
          nextMinutes: nextMinutes,
          reason: input.reason.trimmed
        )
      )
    case .kept:
      guard input.nextDate == nil, input.nextMinutes == nil else {
        return failure(
          .recoveryDecisionInvalid,
          "A kept item cannot change its date or minutes."
        )
      }
      return .success(
        UniversitySemesterDeskRecoveryDecision(
          planItemID: item.id,
          outcome: .kept,
          nextDate: nil,
          nextMinutes: nil,
          reason: input.reason.trimmed
        )
      )
    case .deferred:
      guard let nextDate = input.nextDate,
        isValidDateOnly(nextDate),
        nextDate != item.currentDate,
        input.nextMinutes == nil
      else {
        return failure(
          .recoveryDecisionInvalid,
          "A deferred item needs a different valid current date and unchanged minutes."
        )
      }
      return .success(
        UniversitySemesterDeskRecoveryDecision(
          planItemID: item.id,
          outcome: .deferred,
          nextDate: nextDate,
          nextMinutes: nil,
          reason: input.reason.trimmed
        )
      )
    }
  }

  private static func applying(
    _ decision: UniversitySemesterDeskRecoveryDecision,
    to item: UniversitySemesterDeskPlanItem
  ) -> UniversitySemesterDeskPlanItem {
    switch decision.outcome {
    case .moved:
      return planItem(item, currentDate: decision.nextDate ?? item.currentDate, status: .planned)
    case .reduced:
      return planItem(
        item, currentMinutes: decision.nextMinutes ?? item.currentMinutes, status: .planned)
    case .kept:
      return planItem(item, status: .planned)
    case .deferred:
      return planItem(item, currentDate: decision.nextDate ?? item.currentDate, status: .deferred)
    }
  }

  private static func actionable(
    item: UniversitySemesterDeskPlanItem,
    in state: UniversitySemesterDeskState
  ) -> Result<UniversitySemesterDeskPlanItem, UniversitySemesterDeskError> {
    guard item.status == .planned else {
      return failure(.invalidTransition, "Only planned work can become the next action.")
    }
    let course: UniversitySemesterDeskCourse
    switch courseFor(item.courseID, in: state) {
    case .failure(let error):
      return .failure(error)
    case .success(let value):
      course = value
    }
    guard !courseNeedsReview(course) else {
      return failure(
        .courseReviewRequired,
        "Check changed, unconfirmed, or conflicting course facts before this action."
      )
    }
    return .success(item)
  }

  private static func courseNeedsReview(_ course: UniversitySemesterDeskCourse) -> Bool {
    course.factConflicts.contains(where: { $0.status == .open })
      || course.facts.contains(where: { $0.status != .checked })
  }

  private static func courseFor(
    _ courseID: String,
    in state: UniversitySemesterDeskState
  ) -> Result<UniversitySemesterDeskCourse, UniversitySemesterDeskError> {
    guard isBoundedIdentifier(courseID),
      let course = state.courses.first(where: { $0.id == courseID })
    else {
      return failure(.notFound, "The course does not exist in this Semester Desk.")
    }
    return .success(course)
  }

  private static func planItem(
    for planItemID: String,
    in state: UniversitySemesterDeskState
  ) -> Result<UniversitySemesterDeskPlanItem, UniversitySemesterDeskError> {
    guard isBoundedIdentifier(planItemID),
      let item = state.planItems.first(where: { $0.id == planItemID })
    else {
      return failure(.notFound, "The plan item does not exist in this Semester Desk.")
    }
    return .success(item)
  }

  private static func planItem(
    _ item: UniversitySemesterDeskPlanItem,
    currentDate: String? = nil,
    currentMinutes: Int? = nil,
    status: UniversitySemesterDeskPlanItemStatus
  ) -> UniversitySemesterDeskPlanItem {
    UniversitySemesterDeskPlanItem(
      id: item.id,
      courseID: item.courseID,
      title: item.title,
      originalDate: item.originalDate,
      currentDate: currentDate ?? item.currentDate,
      originalMinutes: item.originalMinutes,
      currentMinutes: currentMinutes ?? item.currentMinutes,
      status: status
    )
  }

  private static func replacingCourse(
    in state: UniversitySemesterDeskState,
    with course: UniversitySemesterDeskCourse,
    now: String
  ) -> UniversitySemesterDeskState {
    copying(state) { next in
      next.updatedAt = now
      next.courses = next.courses.map { $0.id == course.id ? course : $0 }
    }
  }

  private static func replacingPlanItem(
    in state: UniversitySemesterDeskState,
    with item: UniversitySemesterDeskPlanItem,
    now: String
  ) -> UniversitySemesterDeskState {
    copying(state) { next in
      next.updatedAt = now
      next.planItems = next.planItems.map { $0.id == item.id ? item : $0 }
    }
  }

  private static func timestamp(
    from runtime: UniversitySemesterDeskRuntime
  ) -> Result<String, UniversitySemesterDeskError> {
    let value = runtime.clock.now()
    guard isValidTimestamp(value) else {
      return failure(.invalidInput, "The injected clock must return an ISO timestamp.")
    }
    return .success(value)
  }

  private static func identifier(
    _ kind: UniversitySemesterDeskIdentifierKind,
    from runtime: UniversitySemesterDeskRuntime
  ) -> Result<String, UniversitySemesterDeskError> {
    let value = runtime.identifiers.next(kind: kind)
    guard isBoundedIdentifier(value) else {
      return failure(.invalidInput, "The identifier factory returned an empty identifier.")
    }
    return .success(value)
  }

  private static func failure<T>(
    _ code: UniversitySemesterDeskErrorCode,
    _ message: String
  ) -> Result<T, UniversitySemesterDeskError> {
    .failure(UniversitySemesterDeskError(code: code, message: message))
  }

  private static func validated(
    _ state: UniversitySemesterDeskState
  ) -> Result<UniversitySemesterDeskState, UniversitySemesterDeskError> {
    if let error = stateValidationError(for: state) {
      return .failure(error)
    }
    return .success(state)
  }

  private static func stateValidationError(
    for state: UniversitySemesterDeskState
  ) -> UniversitySemesterDeskError? {
    guard state.schemaVersion == UniversitySemesterDeskSchema.version else {
      return invalidState("The Semester Desk version is not supported.")
    }
    guard isBoundedIdentifier(state.id), isBoundedIdentifier(state.profileID),
      isBoundedShortText(state.title),
      isValidTimestamp(state.createdAt), isValidTimestamp(state.updatedAt)
    else {
      return invalidState("The Semester Desk identity or time is invalid.")
    }
    guard uniqueIdentifiers(state.courses.map(\.id)),
      unique(state.courses.map(\.code)),
      uniqueIdentifiers(state.planItems.map(\.id)),
      uniqueIdentifiers(state.recoveryChanges.map(\.id)),
      uniqueIdentifiers(state.protectedStudySessions.map(\.id)),
      uniqueIdentifiers(state.independentProofs.map(\.id)),
      uniqueIdentifiers(state.delayedReturns.map(\.id)),
      uniqueIdentifiers(state.progressEvidence.map(\.id))
    else {
      return invalidState("The Semester Desk contains duplicate identifiers.")
    }
    let courseIDs = Set(state.courses.map(\.id))
    let planItemIDs = Set(state.planItems.map(\.id))
    for course in state.courses {
      if let error = courseValidationError(for: course) {
        return error
      }
    }
    for item in state.planItems {
      guard isBoundedIdentifier(item.id), isBoundedIdentifier(item.courseID),
        courseIDs.contains(item.courseID), isBoundedShortText(item.title),
        isValidDateOnly(item.originalDate), isValidDateOnly(item.currentDate),
        item.originalMinutes > 0, item.currentMinutes > 0
      else {
        return invalidState("A plan item is invalid.")
      }
    }
    if let capacity = state.capacity,
      capacity.availableMinutes < 0 || !isValidTimestamp(capacity.declaredAt)
    {
      return invalidState("Confirmed capacity is invalid.")
    }
    if let capacityDraft = state.capacityDraft,
      capacityDraft.availableMinutes < 0 || !isBoundedIdentifier(capacityDraft.id)
        || !isValidTimestamp(capacityDraft.draftedAt)
    {
      return invalidState("Draft capacity is invalid.")
    }
    if let selectedNextActionID = state.selectedNextActionID,
      !isBoundedIdentifier(selectedNextActionID) || !planItemIDs.contains(selectedNextActionID)
    {
      return invalidState("The selected action does not exist.")
    }
    if let draft = state.recoveryDraft,
      let error = recoveryDraftValidationError(draft, in: state)
    {
      return error
    }
    for change in state.recoveryChanges {
      guard isBoundedIdentifier(change.id), isBoundedIdentifier(change.recoveryDraftID),
        isBoundedIdentifier(change.planItemID), planItemIDs.contains(change.planItemID),
        isBoundedLongText(change.reason), isValidDateOnly(change.previousDate),
        isValidDateOnly(change.currentDate), change.previousMinutes > 0,
        change.currentMinutes > 0, isValidTimestamp(change.recordedAt)
      else {
        return invalidState("A recovery change is invalid.")
      }
    }
    let activeSessionCount = state.protectedStudySessions.filter { $0.status == .active }.count
    guard activeSessionCount <= 1 else {
      return invalidState("More than one protected study session is active.")
    }
    for session in state.protectedStudySessions {
      guard isBoundedIdentifier(session.id), isBoundedIdentifier(session.planItemID),
        planItemIDs.contains(session.planItemID),
        isValidTimestamp(session.startedAt)
      else {
        return invalidState("A protected study session is invalid.")
      }
      if session.status == .active {
        guard session.practiceCompletedAt == nil,
          state.planItems.first(where: { $0.id == session.planItemID })?.status == .inProgress
        else {
          return invalidState("An active protected study session is invalid.")
        }
      } else {
        guard let completedAt = session.practiceCompletedAt,
          isValidTimestamp(completedAt), session.practiceOutcome == .completed
        else {
          return invalidState("A completed protected study session is invalid.")
        }
      }
    }
    for proof in state.independentProofs {
      guard isBoundedIdentifier(proof.id), isBoundedIdentifier(proof.planItemID),
        planItemIDs.contains(proof.planItemID),
        isValidTimestamp(proof.completedAt)
      else {
        return invalidState("An independent proof record is invalid.")
      }
    }
    for delayedReturn in state.delayedReturns {
      guard isBoundedIdentifier(delayedReturn.id), isBoundedIdentifier(delayedReturn.planItemID),
        planItemIDs.contains(delayedReturn.planItemID),
        isValidTimestamp(delayedReturn.dueAt)
      else {
        return invalidState("A delayed return is invalid.")
      }
      switch delayedReturn.status {
      case .due:
        guard delayedReturn.openedAt == nil, delayedReturn.completedAt == nil,
          delayedReturn.retentionOutcome == nil
        else {
          return invalidState("A due delayed return is invalid.")
        }
      case .open:
        guard let openedAt = delayedReturn.openedAt,
          isValidTimestamp(openedAt), delayedReturn.completedAt == nil,
          delayedReturn.retentionOutcome == nil
        else {
          return invalidState("An open delayed return is invalid.")
        }
      case .completed:
        guard let openedAt = delayedReturn.openedAt,
          let completedAt = delayedReturn.completedAt,
          isValidTimestamp(openedAt), isValidTimestamp(completedAt),
          delayedReturn.retentionOutcome != nil
        else {
          return invalidState("A completed delayed return is invalid.")
        }
      }
    }
    for evidence in state.progressEvidence {
      guard isBoundedIdentifier(evidence.id), isBoundedIdentifier(evidence.planItemID),
        planItemIDs.contains(evidence.planItemID),
        isValidTimestamp(evidence.occurredAt)
      else {
        return invalidState("A progress record is invalid.")
      }
    }
    return nil
  }

  private static func courseValidationError(
    for course: UniversitySemesterDeskCourse
  ) -> UniversitySemesterDeskError? {
    guard isBoundedIdentifier(course.id), isBoundedShortText(course.code),
      isBoundedShortText(course.title), uniqueIdentifiers(course.facts.map(\.id)),
      uniqueIdentifiers(course.factConflicts.map(\.id))
    else {
      return invalidState("A course is invalid.")
    }
    let factIDs = Set(course.facts.map(\.id))
    for fact in course.facts {
      guard isBoundedIdentifier(fact.id), isBoundedShortText(fact.label),
        isBoundedLongText(fact.value), isBoundedShortText(fact.sourceLabel),
        fact.checkedAt.map(isValidTimestamp) ?? true
      else {
        return invalidState("A course fact is invalid.")
      }
      if fact.status == .checked && fact.checkedAt == nil {
        return invalidState("A checked course fact has no check time.")
      }
    }
    for conflict in course.factConflicts {
      guard isBoundedIdentifier(conflict.id), conflict.factIDs.count >= 2,
        conflict.factIDs.allSatisfy(isBoundedIdentifier),
        Set(conflict.factIDs).count == conflict.factIDs.count,
        conflict.factIDs.allSatisfy(factIDs.contains), isBoundedLongText(conflict.summary),
        isValidTimestamp(conflict.detectedAt)
      else {
        return invalidState("A fact conflict is invalid.")
      }
      switch conflict.status {
      case .open:
        guard conflict.reviewedAt == nil else {
          return invalidState("An open fact conflict has a review time.")
        }
      case .resolved:
        guard let reviewedAt = conflict.reviewedAt, isValidTimestamp(reviewedAt) else {
          return invalidState("A resolved fact conflict has no valid review time.")
        }
      }
    }
    return nil
  }

  private static func recoveryDraftValidationError(
    _ draft: UniversitySemesterDeskRecoveryDraft,
    in state: UniversitySemesterDeskState
  ) -> UniversitySemesterDeskError? {
    guard isBoundedIdentifier(draft.id), isBoundedLongText(draft.summary),
      isValidTimestamp(draft.createdAt)
    else {
      return invalidState("A recovery draft is invalid.")
    }
    let recoverableItems = state.planItems.filter { $0.status == .planned }
    let decisionIDs = draft.decisions.map(\.planItemID)
    guard !recoverableItems.isEmpty, decisionIDs.allSatisfy(isBoundedIdentifier),
      Set(decisionIDs).count == decisionIDs.count,
      decisionIDs.count == recoverableItems.count,
      recoverableItems.allSatisfy({ decisionIDs.contains($0.id) })
    else {
      return invalidState("A recovery draft must cover all planned work.")
    }
    for decision in draft.decisions {
      guard let item = recoverableItems.first(where: { $0.id == decision.planItemID }) else {
        return invalidState("A recovery decision references unavailable work.")
      }
      let input = UniversitySemesterDeskRecoveryDecisionInput(
        planItemID: decision.planItemID,
        outcome: decision.outcome,
        nextDate: decision.nextDate,
        nextMinutes: decision.nextMinutes,
        reason: decision.reason
      )
      if case .failure = checkedRecoveryDecision(for: item, input: input) {
        return invalidState("A recovery decision is invalid.")
      }
    }
    return nil
  }

  private static func invalidState(_ message: String) -> UniversitySemesterDeskError {
    UniversitySemesterDeskError(code: .invalidInput, message: message)
  }

  private static func unique(_ values: [String]) -> Bool {
    values.allSatisfy(nonBlank) && Set(values).count == values.count
  }

  private static func uniqueIdentifiers(_ values: [String]) -> Bool {
    values.allSatisfy(isBoundedIdentifier) && Set(values).count == values.count
  }

  private static func nonBlank(_ value: String) -> Bool {
    !value.trimmed.isEmpty
  }

  private static func isBoundedIdentifier(_ value: String) -> Bool {
    nonBlank(value)
      && UniversitySemesterDeskLimits.utf8ByteCount(of: value)
        <= UniversitySemesterDeskLimits.maximumIdentifierUTF8ByteCount
  }

  private static func isBoundedShortText(_ value: String) -> Bool {
    nonBlank(value)
      && UniversitySemesterDeskLimits.utf8ByteCount(of: value)
        <= UniversitySemesterDeskLimits.maximumShortTextUTF8ByteCount
  }

  private static func isBoundedLongText(_ value: String) -> Bool {
    nonBlank(value)
      && UniversitySemesterDeskLimits.utf8ByteCount(of: value)
        <= UniversitySemesterDeskLimits.maximumLongTextUTF8ByteCount
  }

  private static func isValidDateOnly(_ value: String) -> Bool {
    let bytes = Array(value.utf8)
    guard bytes.count == 10, bytes[4] == 45, bytes[7] == 45,
      let year = decimal(in: bytes, start: 0, length: 4),
      let month = decimal(in: bytes, start: 5, length: 2),
      let day = decimal(in: bytes, start: 8, length: 2)
    else {
      return false
    }
    return utcDate(
      year: year, month: month, day: day, hour: 0, minute: 0, second: 0, millisecond: 0)
      != nil
  }

  private static func isValidTimestamp(_ value: String) -> Bool {
    let bytes = Array(value.utf8)
    guard bytes.count == 24, bytes[4] == 45, bytes[7] == 45, bytes[10] == 84,
      bytes[13] == 58, bytes[16] == 58, bytes[19] == 46, bytes[23] == 90,
      let year = decimal(in: bytes, start: 0, length: 4),
      let month = decimal(in: bytes, start: 5, length: 2),
      let day = decimal(in: bytes, start: 8, length: 2),
      let hour = decimal(in: bytes, start: 11, length: 2),
      let minute = decimal(in: bytes, start: 14, length: 2),
      let second = decimal(in: bytes, start: 17, length: 2),
      let millisecond = decimal(in: bytes, start: 20, length: 3)
    else {
      return false
    }
    return utcDate(
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      second: second,
      millisecond: millisecond
    ) != nil
  }

  private static func decimal(in bytes: [UInt8], start: Int, length: Int) -> Int? {
    guard start >= 0, length > 0, start + length <= bytes.count else { return nil }
    var value = 0
    for index in start..<(start + length) {
      let byte = bytes[index]
      guard byte >= 48, byte <= 57 else { return nil }
      value = value * 10 + Int(byte - 48)
    }
    return value
  }

  private static func utcDate(
    year: Int,
    month: Int,
    day: Int,
    hour: Int,
    minute: Int,
    second: Int,
    millisecond: Int
  ) -> Date? {
    guard year >= 1, let utc = TimeZone(secondsFromGMT: 0) else { return nil }
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = utc
    var components = DateComponents()
    components.calendar = calendar
    components.timeZone = utc
    components.year = year
    components.month = month
    components.day = day
    components.hour = hour
    components.minute = minute
    components.second = second
    components.nanosecond = millisecond * 1_000_000
    guard let date = calendar.date(from: components) else { return nil }
    let checked = calendar.dateComponents(
      [.year, .month, .day, .hour, .minute, .second, .nanosecond],
      from: date
    )
    guard checked.year == year, checked.month == month, checked.day == day,
      checked.hour == hour, checked.minute == minute, checked.second == second,
      checked.nanosecond == millisecond * 1_000_000
    else {
      return nil
    }
    return date
  }

  private static func copying(
    _ state: UniversitySemesterDeskState,
    _ mutate: (inout StateDraft) -> Void
  ) -> UniversitySemesterDeskState {
    var draft = StateDraft(state)
    mutate(&draft)
    return draft.value
  }
}

extension String {
  fileprivate var trimmed: String {
    trimmingCharacters(in: .whitespacesAndNewlines)
  }
}

private struct StateDraft {
  var schemaVersion: String
  var id: String
  var profileID: String
  var title: String
  var createdAt: String
  var updatedAt: String
  var courses: [UniversitySemesterDeskCourse]
  var capacity: UniversitySemesterDeskConfirmedCapacity?
  var capacityDraft: UniversitySemesterDeskCapacityDraft?
  var planItems: [UniversitySemesterDeskPlanItem]
  var recoveryDraft: UniversitySemesterDeskRecoveryDraft?
  var recoveryChanges: [UniversitySemesterDeskRecoveryChange]
  var selectedNextActionID: String?
  var protectedStudySessions: [UniversitySemesterDeskProtectedStudySession]
  var independentProofs: [UniversitySemesterDeskIndependentProof]
  var delayedReturns: [UniversitySemesterDeskDelayedReturn]
  var progressEvidence: [UniversitySemesterDeskProgressEvidence]

  init(_ state: UniversitySemesterDeskState) {
    schemaVersion = state.schemaVersion
    id = state.id
    profileID = state.profileID
    title = state.title
    createdAt = state.createdAt
    updatedAt = state.updatedAt
    courses = state.courses
    capacity = state.capacity
    capacityDraft = state.capacityDraft
    planItems = state.planItems
    recoveryDraft = state.recoveryDraft
    recoveryChanges = state.recoveryChanges
    selectedNextActionID = state.selectedNextActionID
    protectedStudySessions = state.protectedStudySessions
    independentProofs = state.independentProofs
    delayedReturns = state.delayedReturns
    progressEvidence = state.progressEvidence
  }

  var value: UniversitySemesterDeskState {
    UniversitySemesterDeskState(
      schemaVersion: schemaVersion,
      id: id,
      profileID: profileID,
      title: title,
      createdAt: createdAt,
      updatedAt: updatedAt,
      courses: courses,
      capacity: capacity,
      capacityDraft: capacityDraft,
      planItems: planItems,
      recoveryDraft: recoveryDraft,
      recoveryChanges: recoveryChanges,
      selectedNextActionID: selectedNextActionID,
      protectedStudySessions: protectedStudySessions,
      independentProofs: independentProofs,
      delayedReturns: delayedReturns,
      progressEvidence: progressEvidence
    )
  }
}
