import Foundation
import Testing

@testable import ForgeCore

struct UniversitySemesterDeskEngineTests {
  @Test
  func validatesDecodedStateBeforeUse() throws {
    let controlled = SemesterDeskTestRuntime()
    let state = try UniversitySemesterDeskEngine.create(
      input: .init(profileID: SemesterDeskTestRuntime.profileID, title: "Autumn 2026"),
      runtime: controlled.runtime
    ).get()

    try UniversitySemesterDeskEngine.validate(state: state).get()

    let invalid = UniversitySemesterDeskState(
      schemaVersion: state.schemaVersion,
      id: state.id,
      profileID: "",
      title: state.title,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      courses: state.courses,
      capacity: state.capacity,
      capacityDraft: state.capacityDraft,
      planItems: state.planItems,
      recoveryDraft: state.recoveryDraft,
      recoveryChanges: state.recoveryChanges,
      selectedNextActionID: state.selectedNextActionID,
      protectedStudySessions: state.protectedStudySessions,
      independentProofs: state.independentProofs,
      delayedReturns: state.delayedReturns,
      progressEvidence: state.progressEvidence
    )

    let error = try failure(from: UniversitySemesterDeskEngine.validate(state: invalid))
    #expect(error.code == .invalidInput)
  }

  @Test
  func createsProfileBoundDeskAndRejectsAnotherProfile() throws {
    let controlled = SemesterDeskTestRuntime()
    let state = try UniversitySemesterDeskEngine.create(
      input: .init(profileID: "profile.pri", title: " Autumn 2026 "),
      runtime: controlled.runtime
    ).get()

    #expect(state.schemaVersion == UniversitySemesterDeskSchema.version)
    #expect(state.profileID == "profile.pri")
    #expect(state.title == "Autumn 2026")
    #expect(state.planItems.isEmpty)

    let result = UniversitySemesterDeskEngine.transition(
      state: state,
      command: .addCourse(profileID: "profile.other", code: "MAT220", title: "Linear algebra"),
      runtime: controlled.runtime
    )

    let error = try failure(from: result)
    #expect(error.code == .profileMismatch)
    #expect(state.courses.isEmpty)
  }

  @Test
  func factsAndConflictsRequireExplicitCheckingBeforeWorkStarts() throws {
    let controlled = SemesterDeskTestRuntime()
    var state = try UniversitySemesterDeskEngine.create(
      input: .init(profileID: SemesterDeskTestRuntime.profileID, title: "Autumn 2026"),
      runtime: controlled.runtime
    ).get()
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .addCourse(
        profileID: SemesterDeskTestRuntime.profileID,
        code: "HIS122",
        title: "Modern history"
      ),
      runtime: controlled.runtime
    ).get()
    let courseID = try #require(state.courses.first?.id)

    let missingCheckTime = UniversitySemesterDeskEngine.transition(
      state: state,
      command: .addCourseFact(
        profileID: SemesterDeskTestRuntime.profileID,
        courseID: courseID,
        label: "Essay deadline",
        value: "2026-08-20",
        status: .checked,
        sourceLabel: "Portal",
        checkedAt: nil
      ),
      runtime: controlled.runtime
    )
    #expect(try failure(from: missingCheckTime).code == .invalidInput)

    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .addCourseFact(
        profileID: SemesterDeskTestRuntime.profileID,
        courseID: courseID,
        label: "Essay deadline",
        value: "2026-08-20",
        status: .changedSinceLastCheck,
        sourceLabel: "Portal",
        checkedAt: nil
      ),
      runtime: controlled.runtime
    ).get()
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .addCourseFact(
        profileID: SemesterDeskTestRuntime.profileID,
        courseID: courseID,
        label: "Essay deadline",
        value: "2026-08-22",
        status: .checked,
        sourceLabel: "Course outline",
        checkedAt: controlled.clock.now()
      ),
      runtime: controlled.runtime
    ).get()
    let changedFactID = try #require(state.courses.first?.facts.first?.id)
    let checkedFactID = try #require(state.courses.first?.facts.last?.id)
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .recordFactConflict(
        profileID: SemesterDeskTestRuntime.profileID,
        courseID: courseID,
        factIDs: [changedFactID, checkedFactID],
        summary: "The two dates do not match."
      ),
      runtime: controlled.runtime
    ).get()
    state = try addPlanItem(
      to: state,
      courseID: courseID,
      title: "Write essay outline",
      date: "2026-08-07",
      minutes: 60,
      runtime: controlled
    )
    let planItemID = try #require(state.planItems.first?.id)

    let blockedByFact = UniversitySemesterDeskEngine.transition(
      state: state,
      command: .chooseNextAction(
        profileID: SemesterDeskTestRuntime.profileID,
        planItemID: planItemID
      ),
      runtime: controlled.runtime
    )
    #expect(try failure(from: blockedByFact).code == .courseReviewRequired)

    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .setCourseFactStatus(
        profileID: SemesterDeskTestRuntime.profileID,
        courseID: courseID,
        factID: changedFactID,
        status: .checked,
        checkedAt: controlled.clock.now()
      ),
      runtime: controlled.runtime
    ).get()
    let blockedByConflict = UniversitySemesterDeskEngine.transition(
      state: state,
      command: .chooseNextAction(
        profileID: SemesterDeskTestRuntime.profileID,
        planItemID: planItemID
      ),
      runtime: controlled.runtime
    )
    #expect(try failure(from: blockedByConflict).code == .courseReviewRequired)

    let conflictID = try #require(state.courses.first?.factConflicts.first?.id)
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .reviewFactConflict(
        profileID: SemesterDeskTestRuntime.profileID,
        courseID: courseID,
        conflictID: conflictID
      ),
      runtime: controlled.runtime
    ).get()
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .chooseNextAction(
        profileID: SemesterDeskTestRuntime.profileID,
        planItemID: planItemID
      ),
      runtime: controlled.runtime
    ).get()

    #expect(state.selectedNextActionID == planItemID)
    #expect(state.courses.first?.factConflicts.first?.status == .resolved)
  }

  @Test
  func capacityStaysDraftUntilTheStudentConfirmsIt() throws {
    let controlled = SemesterDeskTestRuntime()
    var state = try emptyDesk(controlled)

    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .draftCapacity(
        profileID: SemesterDeskTestRuntime.profileID,
        availableMinutes: 180
      ),
      runtime: controlled.runtime
    ).get()
    #expect(state.capacity == nil)
    #expect(state.capacityDraft?.availableMinutes == 180)

    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .confirmCapacity(profileID: SemesterDeskTestRuntime.profileID),
      runtime: controlled.runtime
    ).get()
    #expect(state.capacity?.availableMinutes == 180)
    #expect(state.capacityDraft == nil)

    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .draftCapacity(
        profileID: SemesterDeskTestRuntime.profileID,
        availableMinutes: 45
      ),
      runtime: controlled.runtime
    ).get()
    #expect(state.capacity?.availableMinutes == 180)
    #expect(state.capacityDraft?.availableMinutes == 45)
  }

  @Test
  func recoveryRequiresEveryDecisionAndPreservesAuthoredOrder() throws {
    let controlled = SemesterDeskTestRuntime()
    let prepared = try deskWithCheckedCourseAndPlans(
      controlled,
      plans: [
        ("Problem set", "2026-08-05", 90),
        ("Lecture review", "2026-08-06", 60),
        ("Office hour notes", "2026-08-07", 45),
        ("Optional extension", "2026-08-08", 30),
      ]
    )
    var state = prepared.state
    let planIDs = state.planItems.map(\.id)
    let before = UniversitySemesterDeskEngine.orderedPlanItems(in: state)

    let missingDecision = UniversitySemesterDeskEngine.transition(
      state: state,
      command: .prepareRecovery(
        profileID: SemesterDeskTestRuntime.profileID,
        summary: "Two missed days changed this week.",
        decisions: [
          .init(planItemID: planIDs[0], outcome: .kept, reason: "Keep this work."),
          .init(planItemID: planIDs[1], outcome: .kept, reason: "Keep this work."),
          .init(planItemID: planIDs[2], outcome: .kept, reason: "Keep this work."),
        ]
      ),
      runtime: controlled.runtime
    )
    #expect(try failure(from: missingDecision).code == .recoveryDecisionInvalid)

    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .prepareRecovery(
        profileID: SemesterDeskTestRuntime.profileID,
        summary: "Two missed days changed this week.",
        decisions: [
          .init(
            planItemID: planIDs[0],
            outcome: .moved,
            nextDate: "2026-08-11",
            reason: "Keep the full practice block."
          ),
          .init(
            planItemID: planIDs[1],
            outcome: .reduced,
            nextMinutes: 30,
            reason: "Use the available capacity."
          ),
          .init(
            planItemID: planIDs[2],
            outcome: .kept,
            reason: "It is still manageable."
          ),
          .init(
            planItemID: planIDs[3],
            outcome: .deferred,
            nextDate: "2026-08-20",
            reason: "It is optional this week."
          ),
        ]
      ),
      runtime: controlled.runtime
    ).get()

    #expect(UniversitySemesterDeskEngine.orderedPlanItems(in: state) == before)
    #expect(state.recoveryDraft?.decisions.map(\.outcome) == [.moved, .reduced, .kept, .deferred])

    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .confirmRecovery(profileID: SemesterDeskTestRuntime.profileID),
      runtime: controlled.runtime
    ).get()

    #expect(UniversitySemesterDeskEngine.orderedPlanItems(in: state).map(\.id) == planIDs)
    #expect(
      state.planItems.map(\.currentDate) == [
        "2026-08-11", "2026-08-06", "2026-08-07", "2026-08-20",
      ])
    #expect(state.planItems.map(\.currentMinutes) == [90, 30, 45, 30])
    #expect(state.planItems.map(\.status) == [.planned, .planned, .planned, .deferred])
    #expect(state.recoveryChanges.map(\.outcome) == [.moved, .reduced, .kept, .deferred])
    #expect(state.recoveryChanges.map(\.previousDate) == before.map(\.currentDate))
  }

  @Test
  func recoveryClearsDeferredSelectionAndRequiresExplicitResume() throws {
    let controlled = SemesterDeskTestRuntime()
    let prepared = try deskWithCheckedCourseAndPlans(
      controlled,
      plans: [
        ("Revise thesis", "2026-08-05", 45),
        ("Read feedback", "2026-08-06", 45),
      ]
    )
    var state = prepared.state
    let selectedID = state.planItems[0].id
    let keptID = state.planItems[1].id
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .chooseNextAction(
        profileID: SemesterDeskTestRuntime.profileID,
        planItemID: selectedID
      ),
      runtime: controlled.runtime
    ).get()
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .prepareRecovery(
        profileID: SemesterDeskTestRuntime.profileID,
        summary: "Study time changed.",
        decisions: [
          .init(
            planItemID: selectedID,
            outcome: .deferred,
            nextDate: "2026-08-15",
            reason: "The deadline is later."
          ),
          .init(planItemID: keptID, outcome: .kept, reason: "This work still fits today."),
        ]
      ),
      runtime: controlled.runtime
    ).get()
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .confirmRecovery(profileID: SemesterDeskTestRuntime.profileID),
      runtime: controlled.runtime
    ).get()

    #expect(state.selectedNextActionID == nil)
    #expect(state.planItems[0].status == .deferred)

    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .resumeDeferredItem(
        profileID: SemesterDeskTestRuntime.profileID,
        planItemID: selectedID
      ),
      runtime: controlled.runtime
    ).get()

    #expect(state.planItems[0].status == .planned)
    #expect(state.planItems[0].currentDate == "2026-08-15")
  }

  @Test
  func needsMoreWorkKeepsPracticeActiveAndBlocksIndependentProof() throws {
    let controlled = SemesterDeskTestRuntime()
    let prepared = try deskWithCheckedCourseAndPlans(
      controlled,
      plans: [("Graph proof practice", "2026-08-05", 75)]
    )
    var state = try chooseAndStart(
      planID: prepared.state.planItems[0].id, from: prepared.state, runtime: controlled)
    let sessionID = try #require(state.protectedStudySessions.first?.id)

    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .completePractice(
        profileID: SemesterDeskTestRuntime.profileID,
        studySessionID: sessionID,
        outcome: .needsMoreWork
      ),
      runtime: controlled.runtime
    ).get()

    #expect(state.planItems[0].status == .inProgress)
    #expect(state.protectedStudySessions[0].status == .active)
    #expect(state.protectedStudySessions[0].practiceCompletedAt == nil)
    #expect(state.protectedStudySessions[0].practiceOutcome == .needsMoreWork)
    #expect(state.progressEvidence.last?.outcome == .needsMoreWork)

    let blocked = UniversitySemesterDeskEngine.transition(
      state: state,
      command: .submitIndependentProof(
        profileID: SemesterDeskTestRuntime.profileID,
        planItemID: state.planItems[0].id,
        outcome: .demonstrated
      ),
      runtime: controlled.runtime
    )
    #expect(try failure(from: blocked).code == .practiceRequired)

    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .completePractice(
        profileID: SemesterDeskTestRuntime.profileID,
        studySessionID: sessionID,
        outcome: .completed
      ),
      runtime: controlled.runtime
    ).get()
    #expect(state.planItems[0].status == .practiceComplete)
    #expect(state.protectedStudySessions[0].status == .practiceComplete)
  }

  @Test
  func proofAndProgressRecordsRemainAnswerFree() throws {
    let controlled = SemesterDeskTestRuntime()
    let prepared = try deskWithCheckedCourseAndPlans(
      controlled,
      plans: [("Graph proof practice", "2026-08-05", 75)]
    )
    let state = try completePracticeAndProof(
      planID: prepared.state.planItems[0].id,
      from: prepared.state,
      runtime: controlled
    )

    #expect(state.planItems[0].status == .proofComplete)
    #expect(state.independentProofs.first?.outcome == .demonstrated)
    #expect(state.progressEvidence.map(\.kind) == [.practiceCompleted, .independentProofCompleted])
    let encoded = try JSONEncoder().encode(state)
    let text = try #require(String(data: encoded, encoding: .utf8))
    #expect(!text.localizedCaseInsensitiveContains("answer"))
  }

  @Test
  func delayedReturnWaitsUntilDueAndNeedsMoreWorkRestoresPlannedWork() throws {
    let controlled = SemesterDeskTestRuntime()
    let prepared = try deskWithCheckedCourseAndPlans(
      controlled,
      plans: [("Graph proof practice", "2026-08-05", 75)]
    )
    let planID = prepared.state.planItems[0].id
    var state = try completePracticeAndProof(
      planID: planID, from: prepared.state, runtime: controlled)

    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .scheduleDelayedReturn(
        profileID: SemesterDeskTestRuntime.profileID,
        planItemID: planID,
        dueAt: "2026-08-10T09:00:00.000Z"
      ),
      runtime: controlled.runtime
    ).get()
    let delayedReturnID = try #require(state.delayedReturns.first?.id)
    let early = UniversitySemesterDeskEngine.transition(
      state: state,
      command: .openDelayedReturn(
        profileID: SemesterDeskTestRuntime.profileID,
        delayedReturnID: delayedReturnID
      ),
      runtime: controlled.runtime
    )
    #expect(try failure(from: early).code == .returnNotDue)

    controlled.clock.set("2026-08-10T09:00:00.000Z")
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .openDelayedReturn(
        profileID: SemesterDeskTestRuntime.profileID,
        delayedReturnID: delayedReturnID
      ),
      runtime: controlled.runtime
    ).get()
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .completeDelayedReturn(
        profileID: SemesterDeskTestRuntime.profileID,
        delayedReturnID: delayedReturnID,
        outcome: .needsMoreWork
      ),
      runtime: controlled.runtime
    ).get()

    #expect(state.delayedReturns[0].status == .completed)
    #expect(state.delayedReturns[0].retentionOutcome == .needsMoreWork)
    #expect(state.planItems[0].status == .planned)
    #expect(state.selectedNextActionID == planID)
    #expect(state.progressEvidence.last?.kind == .delayedReturnCompleted)
    #expect(state.progressEvidence.last?.outcome == .needsMoreWork)
  }

  @Test
  func completingOneReturnDoesNotClearAnotherSelectedAction() throws {
    let controlled = SemesterDeskTestRuntime()
    let prepared = try deskWithCheckedCourseAndPlans(
      controlled,
      plans: [
        ("First proof practice", "2026-08-05", 75),
        ("Second proof practice", "2026-08-06", 75),
      ]
    )
    let firstID = prepared.state.planItems[0].id
    let secondID = prepared.state.planItems[1].id
    var state = try completePracticeAndProof(
      planID: firstID, from: prepared.state, runtime: controlled)
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .scheduleDelayedReturn(
        profileID: SemesterDeskTestRuntime.profileID,
        planItemID: firstID,
        dueAt: "2026-08-10T09:00:00.000Z"
      ),
      runtime: controlled.runtime
    ).get()
    let firstReturnID = try #require(state.delayedReturns.first?.id)
    state = try completePracticeAndProof(planID: secondID, from: state, runtime: controlled)
    #expect(state.selectedNextActionID == secondID)

    controlled.clock.set("2026-08-10T09:00:00.000Z")
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .openDelayedReturn(
        profileID: SemesterDeskTestRuntime.profileID,
        delayedReturnID: firstReturnID
      ),
      runtime: controlled.runtime
    ).get()
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .completeDelayedReturn(
        profileID: SemesterDeskTestRuntime.profileID,
        delayedReturnID: firstReturnID,
        outcome: .retained
      ),
      runtime: controlled.runtime
    ).get()

    #expect(state.planItems.first(where: { $0.id == firstID })?.status == .returnComplete)
    #expect(state.selectedNextActionID == secondID)
  }

  @Test
  func invalidRuntimeTimestampAndInvalidPlanDateFailClosed() throws {
    let invalidRuntime = UniversitySemesterDeskRuntime(
      clock: InvalidClock(),
      identifiers: SemesterDeskIdentifierFactory()
    )
    let failedCreate = UniversitySemesterDeskEngine.create(
      input: .init(profileID: SemesterDeskTestRuntime.profileID, title: "Autumn 2026"),
      runtime: invalidRuntime
    )
    #expect(try failure(from: failedCreate).code == .invalidInput)

    let controlled = SemesterDeskTestRuntime()
    let prepared = try deskWithCheckedCourseAndPlans(
      controlled,
      plans: [("Valid plan", "2026-08-05", 60)]
    )
    let invalidDate = UniversitySemesterDeskEngine.transition(
      state: prepared.state,
      command: .addPlanItem(
        profileID: SemesterDeskTestRuntime.profileID,
        courseID: prepared.courseID,
        title: "Impossible date",
        date: "2026-02-30",
        minutes: 45
      ),
      runtime: controlled.runtime
    )
    #expect(try failure(from: invalidDate).code == .invalidInput)
  }

  @Test
  func directInputsUseExactUTF8ScalarBoundaries() throws {
    let controlled = SemesterDeskTestRuntime()
    let identifierAtLimit = String(
      repeating: "🙂",
      count: UniversitySemesterDeskLimits.maximumIdentifierUTF8ByteCount / 4
    )
    let shortTextAtLimit = String(
      repeating: "🙂",
      count: UniversitySemesterDeskLimits.maximumShortTextUTF8ByteCount / 4
    )
    let longTextAtLimit = String(
      repeating: "🙂",
      count: UniversitySemesterDeskLimits.maximumLongTextUTF8ByteCount / 4
    )

    #expect(
      UniversitySemesterDeskLimits.utf8ByteCount(of: identifierAtLimit)
        == UniversitySemesterDeskLimits.maximumIdentifierUTF8ByteCount
    )
    #expect(
      UniversitySemesterDeskLimits.utf8ByteCount(of: shortTextAtLimit)
        == UniversitySemesterDeskLimits.maximumShortTextUTF8ByteCount
    )
    #expect(
      UniversitySemesterDeskLimits.utf8ByteCount(of: longTextAtLimit)
        == UniversitySemesterDeskLimits.maximumLongTextUTF8ByteCount
    )

    var state = try UniversitySemesterDeskEngine.create(
      input: .init(profileID: identifierAtLimit, title: shortTextAtLimit),
      runtime: controlled.runtime
    ).get()
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .addCourse(
        profileID: identifierAtLimit,
        code: shortTextAtLimit,
        title: shortTextAtLimit
      ),
      runtime: controlled.runtime
    ).get()
    let courseID = try #require(state.courses.first?.id)
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .addCourseFact(
        profileID: identifierAtLimit,
        courseID: courseID,
        label: shortTextAtLimit,
        value: longTextAtLimit,
        status: .checked,
        sourceLabel: shortTextAtLimit,
        checkedAt: controlled.clock.now()
      ),
      runtime: controlled.runtime
    ).get()
    try UniversitySemesterDeskEngine.validate(state: state).get()

    let identifierOverLimit = String(
      repeating: "🙂",
      count: UniversitySemesterDeskLimits.maximumIdentifierUTF8ByteCount / 4 + 1
    )
    let shortTextOverLimit = String(
      repeating: "🙂",
      count: UniversitySemesterDeskLimits.maximumShortTextUTF8ByteCount / 4 + 1
    )
    let longTextOverLimit = String(
      repeating: "🙂",
      count: UniversitySemesterDeskLimits.maximumLongTextUTF8ByteCount / 4 + 1
    )

    let invalidCreate = UniversitySemesterDeskEngine.create(
      input: .init(profileID: identifierOverLimit, title: "Autumn 2026"),
      runtime: controlled.runtime
    )
    #expect(try failure(from: invalidCreate).code == .invalidInput)

    let invalidCourse = UniversitySemesterDeskEngine.transition(
      state: state,
      command: .addCourse(
        profileID: identifierAtLimit,
        code: "MAT220",
        title: shortTextOverLimit
      ),
      runtime: controlled.runtime
    )
    #expect(try failure(from: invalidCourse).code == .invalidInput)

    let invalidFact = UniversitySemesterDeskEngine.transition(
      state: state,
      command: .addCourseFact(
        profileID: identifierAtLimit,
        courseID: courseID,
        label: "Deadline",
        value: longTextOverLimit,
        status: .checked,
        sourceLabel: "Course outline",
        checkedAt: controlled.clock.now()
      ),
      runtime: controlled.runtime
    )
    #expect(try failure(from: invalidFact).code == .invalidInput)

    let prepared = try deskWithCheckedCourseAndPlans(
      controlled,
      plans: [("Recovery plan", "2026-08-05", 60)]
    )
    let recoveryPlanID = try #require(prepared.state.planItems.first?.id)
    let invalidRecovery = UniversitySemesterDeskEngine.transition(
      state: prepared.state,
      command: .prepareRecovery(
        profileID: SemesterDeskTestRuntime.profileID,
        summary: "Rebuild this week.",
        decisions: [
          .init(
            planItemID: recoveryPlanID,
            outcome: .kept,
            reason: longTextOverLimit
          )
        ]
      ),
      runtime: controlled.runtime
    )
    #expect(try failure(from: invalidRecovery).code == .recoveryDecisionInvalid)

    let oversizedRuntime = UniversitySemesterDeskRuntime(
      clock: controlled.clock,
      identifiers: FixedSemesterDeskIdentifierFactory(value: identifierOverLimit)
    )
    let invalidGeneratedIdentifier = UniversitySemesterDeskEngine.create(
      input: .init(profileID: SemesterDeskTestRuntime.profileID, title: "Autumn 2026"),
      runtime: oversizedRuntime
    )
    #expect(try failure(from: invalidGeneratedIdentifier).code == .invalidInput)
  }

  @Test
  func decodedStateRejectsMultibyteOversizedScalars() throws {
    let controlled = SemesterDeskTestRuntime()
    let identifierAtLimit = String(
      repeating: "🙂",
      count: UniversitySemesterDeskLimits.maximumIdentifierUTF8ByteCount / 4
    )
    let shortTextAtLimit = String(
      repeating: "🙂",
      count: UniversitySemesterDeskLimits.maximumShortTextUTF8ByteCount / 4
    )
    let longTextAtLimit = String(
      repeating: "🙂",
      count: UniversitySemesterDeskLimits.maximumLongTextUTF8ByteCount / 4
    )
    let identifierOverLimit = identifierAtLimit + "🙂"
    let shortTextOverLimit = shortTextAtLimit + "🙂"
    let longTextOverLimit = longTextAtLimit + "🙂"

    var state = try emptyDesk(controlled)
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .addCourse(
        profileID: SemesterDeskTestRuntime.profileID,
        code: "MAT220",
        title: shortTextAtLimit
      ),
      runtime: controlled.runtime
    ).get()
    let courseID = try #require(state.courses.first?.id)
    state = try UniversitySemesterDeskEngine.transition(
      state: state,
      command: .addCourseFact(
        profileID: SemesterDeskTestRuntime.profileID,
        courseID: courseID,
        label: "Exam scope",
        value: longTextAtLimit,
        status: .checked,
        sourceLabel: "Course outline",
        checkedAt: controlled.clock.now()
      ),
      runtime: controlled.runtime
    ).get()

    let exactBoundaryState = replacingSemesterDeskState(
      state,
      id: identifierAtLimit,
      profileID: identifierAtLimit,
      title: shortTextAtLimit
    )
    try UniversitySemesterDeskEngine.validate(state: exactBoundaryState).get()

    let invalidIdentifierState = replacingSemesterDeskState(
      exactBoundaryState,
      id: identifierOverLimit
    )
    #expect(
      try failure(from: UniversitySemesterDeskEngine.validate(state: invalidIdentifierState)).code
        == .invalidInput
    )

    let invalidShortTextState = replacingSemesterDeskState(
      exactBoundaryState,
      title: shortTextOverLimit
    )
    #expect(
      try failure(from: UniversitySemesterDeskEngine.validate(state: invalidShortTextState)).code
        == .invalidInput
    )

    let course = try #require(state.courses.first)
    let fact = try #require(course.facts.first)
    let oversizedFact = UniversitySemesterDeskCourseFact(
      id: fact.id,
      label: fact.label,
      value: longTextOverLimit,
      status: fact.status,
      sourceLabel: fact.sourceLabel,
      checkedAt: fact.checkedAt
    )
    let oversizedCourse = UniversitySemesterDeskCourse(
      id: course.id,
      code: course.code,
      title: course.title,
      facts: [oversizedFact],
      factConflicts: course.factConflicts
    )
    let invalidLongTextState = replacingSemesterDeskState(
      state,
      courses: [oversizedCourse]
    )
    #expect(
      try failure(from: UniversitySemesterDeskEngine.validate(state: invalidLongTextState)).code
        == .invalidInput
    )
  }
}

private func emptyDesk(_ controlled: SemesterDeskTestRuntime) throws -> UniversitySemesterDeskState
{
  try UniversitySemesterDeskEngine.create(
    input: .init(profileID: SemesterDeskTestRuntime.profileID, title: "Autumn 2026"),
    runtime: controlled.runtime
  ).get()
}

private func addPlanItem(
  to state: UniversitySemesterDeskState,
  courseID: String,
  title: String,
  date: String,
  minutes: Int,
  runtime: SemesterDeskTestRuntime
) throws -> UniversitySemesterDeskState {
  try UniversitySemesterDeskEngine.transition(
    state: state,
    command: .addPlanItem(
      profileID: SemesterDeskTestRuntime.profileID,
      courseID: courseID,
      title: title,
      date: date,
      minutes: minutes
    ),
    runtime: runtime.runtime
  ).get()
}

private func deskWithCheckedCourseAndPlans(
  _ controlled: SemesterDeskTestRuntime,
  plans: [(String, String, Int)]
) throws -> (state: UniversitySemesterDeskState, courseID: String) {
  var state = try emptyDesk(controlled)
  state = try UniversitySemesterDeskEngine.transition(
    state: state,
    command: .addCourse(
      profileID: SemesterDeskTestRuntime.profileID,
      code: "MAT220",
      title: "Linear algebra"
    ),
    runtime: controlled.runtime
  ).get()
  let courseID = try #require(state.courses.first?.id)
  state = try UniversitySemesterDeskEngine.transition(
    state: state,
    command: .addCourseFact(
      profileID: SemesterDeskTestRuntime.profileID,
      courseID: courseID,
      label: "Problem set deadline",
      value: "2026-08-12",
      status: .checked,
      sourceLabel: "Course outline",
      checkedAt: controlled.clock.now()
    ),
    runtime: controlled.runtime
  ).get()
  for plan in plans {
    state = try addPlanItem(
      to: state,
      courseID: courseID,
      title: plan.0,
      date: plan.1,
      minutes: plan.2,
      runtime: controlled
    )
  }
  return (state, courseID)
}

private func chooseAndStart(
  planID: String,
  from state: UniversitySemesterDeskState,
  runtime: SemesterDeskTestRuntime
) throws -> UniversitySemesterDeskState {
  var next = try UniversitySemesterDeskEngine.transition(
    state: state,
    command: .chooseNextAction(profileID: SemesterDeskTestRuntime.profileID, planItemID: planID),
    runtime: runtime.runtime
  ).get()
  next = try UniversitySemesterDeskEngine.transition(
    state: next,
    command: .startProtectedStudy(profileID: SemesterDeskTestRuntime.profileID, planItemID: planID),
    runtime: runtime.runtime
  ).get()
  return next
}

private func completePracticeAndProof(
  planID: String,
  from state: UniversitySemesterDeskState,
  runtime: SemesterDeskTestRuntime
) throws -> UniversitySemesterDeskState {
  var next = try chooseAndStart(planID: planID, from: state, runtime: runtime)
  let sessionID = try #require(next.protectedStudySessions.last?.id)
  next = try UniversitySemesterDeskEngine.transition(
    state: next,
    command: .completePractice(
      profileID: SemesterDeskTestRuntime.profileID,
      studySessionID: sessionID,
      outcome: .completed
    ),
    runtime: runtime.runtime
  ).get()
  next = try UniversitySemesterDeskEngine.transition(
    state: next,
    command: .submitIndependentProof(
      profileID: SemesterDeskTestRuntime.profileID,
      planItemID: planID,
      outcome: .demonstrated
    ),
    runtime: runtime.runtime
  ).get()
  return next
}

private func failure<T>(
  from result: Result<T, UniversitySemesterDeskError>
) throws -> UniversitySemesterDeskError {
  switch result {
  case .success:
    throw SemesterDeskTestFailure.expectedFailure
  case .failure(let error):
    return error
  }
}

private func replacingSemesterDeskState(
  _ state: UniversitySemesterDeskState,
  id: String? = nil,
  profileID: String? = nil,
  title: String? = nil,
  courses: [UniversitySemesterDeskCourse]? = nil
) -> UniversitySemesterDeskState {
  UniversitySemesterDeskState(
    schemaVersion: state.schemaVersion,
    id: id ?? state.id,
    profileID: profileID ?? state.profileID,
    title: title ?? state.title,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    courses: courses ?? state.courses,
    capacity: state.capacity,
    capacityDraft: state.capacityDraft,
    planItems: state.planItems,
    recoveryDraft: state.recoveryDraft,
    recoveryChanges: state.recoveryChanges,
    selectedNextActionID: state.selectedNextActionID,
    protectedStudySessions: state.protectedStudySessions,
    independentProofs: state.independentProofs,
    delayedReturns: state.delayedReturns,
    progressEvidence: state.progressEvidence
  )
}

private enum SemesterDeskTestFailure: Error {
  case expectedFailure
}

private final class SemesterDeskTestClock: UniversitySemesterDeskClock, @unchecked Sendable {
  private let lock = NSLock()
  private var timestamp: String

  init(timestamp: String) {
    self.timestamp = timestamp
  }

  func now() -> String {
    lock.lock()
    defer { lock.unlock() }
    return timestamp
  }

  func set(_ timestamp: String) {
    lock.lock()
    self.timestamp = timestamp
    lock.unlock()
  }
}

private final class SemesterDeskIdentifierFactory: UniversitySemesterDeskIdentifierFactory,
  @unchecked Sendable
{
  private let lock = NSLock()
  private var counts = [UniversitySemesterDeskIdentifierKind: Int]()

  func next(kind: UniversitySemesterDeskIdentifierKind) -> String {
    lock.lock()
    defer { lock.unlock() }
    let next = (counts[kind] ?? 0) + 1
    counts[kind] = next
    return "\(kind.rawValue).\(next)"
  }
}

private struct FixedSemesterDeskIdentifierFactory: UniversitySemesterDeskIdentifierFactory {
  let value: String

  func next(kind _: UniversitySemesterDeskIdentifierKind) -> String {
    value
  }
}

private struct InvalidClock: UniversitySemesterDeskClock {
  func now() -> String { "not-a-time" }
}

private final class SemesterDeskTestRuntime {
  static let profileID = "profile.pri"

  let clock: SemesterDeskTestClock
  let identifiers: SemesterDeskIdentifierFactory
  let runtime: UniversitySemesterDeskRuntime

  init(timestamp: String = "2026-08-03T09:00:00.000Z") {
    let clock = SemesterDeskTestClock(timestamp: timestamp)
    let identifiers = SemesterDeskIdentifierFactory()
    self.clock = clock
    self.identifiers = identifiers
    runtime = UniversitySemesterDeskRuntime(clock: clock, identifiers: identifiers)
  }
}
