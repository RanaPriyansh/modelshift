import Foundation
import Testing

@testable import ForgeCore

struct UniversityExperienceProjectionTests {
  @Test
  func capabilityProgressIncludesStartedAndNotStartedActivitiesInCatalogOrder() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let state = try UniversityLearningTestSupport.practicedState(catalog: catalog)

    let projection = try project(
      catalog: catalog,
      state: state,
      now: UniversityLearningTestSupport.date(10)
    )
    let capability = try #require(projection.capabilityProgress.first)
    let rows = capability.activities
    let expectedActivityIDs = catalog.activities
      .filter { $0.capabilityID == capability.capabilityID }
      .map(\.id)

    #expect(projection.capabilityProgress.map(\.capabilityID) == catalog.capabilities.map(\.id))
    #expect(rows.map(\.activityID) == expectedActivityIDs)
    #expect(rows.map(\.kind) == catalog.activities.map(\.kind))
    #expect(rows[0].activityID == practice.id)
    #expect(rows[0].attempts == 1)
    #expect(rows[0].lastValidatorResult == .demonstrated)
    #expect(rows[0].lastRecordedAt == state.progress.first?.lastRecordedAt)
    #expect(rows.dropFirst().allSatisfy { $0.attempts == 0 })
    #expect(rows.dropFirst().allSatisfy { $0.lastValidatorResult == nil })
    #expect(rows.dropFirst().allSatisfy { $0.lastRecordedAt == nil })
  }

  @Test
  func emptyLocalStateProjectsEveryActivityAsNotStarted() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let state = try UniversityLearningTestSupport.initialState(catalog: catalog)

    let projection = try project(
      catalog: catalog,
      state: state,
      now: UniversityLearningTestSupport.date(1)
    )
    let capability = try #require(projection.capabilityProgress.first)

    #expect(projection.evidenceRows.isEmpty)
    #expect(capability.activities.map(\.activityID) == catalog.activities.map(\.id))
    #expect(capability.activities.allSatisfy { $0.attempts == 0 })
    #expect(capability.activities.allSatisfy { $0.lastValidatorResult == nil })
    #expect(capability.activities.allSatisfy { $0.lastRecordedAt == nil })
  }

  @Test(
    "Delayed return status follows explicit record boundaries",
    arguments: [
      (ReturnMoment.opensAt, -1.0, DelayedReturnStatus.scheduled),
      (ReturnMoment.opensAt, 0.0, DelayedReturnStatus.open),
      (ReturnMoment.opensAt, 1.0, DelayedReturnStatus.open),
      (ReturnMoment.dueAt, -1.0, DelayedReturnStatus.open),
      (ReturnMoment.dueAt, 0.0, DelayedReturnStatus.due),
      (ReturnMoment.dueAt, 1.0, DelayedReturnStatus.expired),
    ]
  )
  func delayedReturnStatuses(
    moment: ReturnMoment,
    offset: TimeInterval,
    expectedStatus: DelayedReturnStatus
  ) throws {
    let catalog = try UniversityStarterCourse.catalog()
    let state = try UniversityLearningTestSupport.proofReadyState(catalog: catalog)
    let record = try #require(state.delayedReturns.first)
    let boundary: Date
    switch moment {
    case .opensAt:
      boundary = record.opensAt
    case .dueAt:
      boundary = record.dueAt
    }
    let now = boundary.addingTimeInterval(offset)
    let calendar = try utcCalendar()

    let projection = try UniversityExperienceProjection.project(
      catalog: catalog,
      state: state,
      now: now,
      calendar: calendar
    )
    let delayedReturn = try #require(projection.delayedReturns.first)

    #expect(projection.activeActivity.kind == .delayedReturn)
    #expect(delayedReturn.status == expectedStatus)
    #expect(delayedReturn.opensAt == record.opensAt)
    #expect(delayedReturn.dueAt == record.dueAt)
    #expect(delayedReturn.completionEvidenceID == nil)
    #expect(
      delayedReturn.isDueOnCurrentCalendarDay
        == calendar.isDate(record.dueAt, inSameDayAs: now)
    )
    #expect(
      projection.nextActionState
        == UniversityExperienceProjection.NextActionState.delayedReturn(expectedStatus)
    )
  }

  @Test
  func completedDelayedReturnPropagatesCompletionEvidence() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let activity = try UniversityLearningTestSupport.activity(.delayedReturn, in: catalog)
    let state = try UniversityLearningTestSupport.proofReadyState(catalog: catalog)
    let record = try #require(state.delayedReturns.first)
    let engine = try UniversityLearningEngine(
      catalog: catalog,
      validators: ValidatorRegistry()
    )
    let completed = try engine.transition(
      state: state,
      submission: try UniversityLearningTestSupport.submission(
        activityID: activity.id,
        evidenceID: try EvidenceID("evidence.return.complete"),
        choice: "constant_positive_velocity",
        delayedReturnID: record.id
      ),
      now: record.opensAt
    )

    let projection = try project(
      catalog: catalog,
      state: completed,
      now: record.opensAt
    )
    let delayedReturn = try #require(projection.delayedReturns.first)
    let completionEvidence = try #require(completed.evidence.last)

    #expect(delayedReturn.status == .completed)
    #expect(delayedReturn.completedAt == record.opensAt)
    #expect(delayedReturn.completionEvidenceID == completionEvidence.id)
    #expect(projection.nextActionState == .delayedReturn(.completed))
  }

  @Test
  func delayedReturnRowSchemaExcludesCancellationFields() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let state = try UniversityLearningTestSupport.proofReadyState(catalog: catalog)
    let projection = try project(
      catalog: catalog,
      state: state,
      now: UniversityLearningTestSupport.date(10)
    )
    let delayedReturn = try #require(projection.delayedReturns.first)
    let labels = Set(Mirror(reflecting: delayedReturn).children.compactMap(\.label))

    #expect(
      labels
        == Set<String>([
          "id",
          "activityID",
          "status",
          "opensAt",
          "dueAt",
          "completedAt",
          "completionEvidenceID",
          "isDueOnCurrentCalendarDay",
        ])
    )
    #expect(!labels.contains("cancelledAt"))
  }

  @Test
  func dueDayUsesTheProvidedCalendarTimeZone() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let state = try UniversityLearningTestSupport.proofReadyState(catalog: catalog)
    let record = try #require(state.delayedReturns.first)
    let utc = try calendar(secondsFromGMT: 0)
    let plusFourteen = try calendar(secondsFromGMT: 14 * 60 * 60)
    let candidateInstants = (-36...36).map {
      record.dueAt.addingTimeInterval(TimeInterval($0 * 3_600))
    }
    let now = try #require(
      candidateInstants.first { instant in
        utc.isDate(record.dueAt, inSameDayAs: instant)
          != plusFourteen.isDate(record.dueAt, inSameDayAs: instant)
      }
    )

    let utcProjection = try UniversityExperienceProjection.project(
      catalog: catalog,
      state: state,
      now: now,
      calendar: utc
    )
    let plusFourteenProjection = try UniversityExperienceProjection.project(
      catalog: catalog,
      state: state,
      now: now,
      calendar: plusFourteen
    )
    let utcRow = try #require(utcProjection.delayedReturns.first)
    let plusFourteenRow = try #require(plusFourteenProjection.delayedReturns.first)

    #expect(
      utcRow.isDueOnCurrentCalendarDay
        == utc.isDate(record.dueAt, inSameDayAs: now)
    )
    #expect(
      plusFourteenRow.isDueOnCurrentCalendarDay
        == plusFourteen.isDate(record.dueAt, inSameDayAs: now)
    )
    #expect(utcRow.isDueOnCurrentCalendarDay != plusFourteenRow.isDueOnCurrentCalendarDay)
  }

  @Test
  func projectionRejectsInvalidAndRegressingNowAfterStateValidation() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let state = try UniversityLearningTestSupport.initialState(catalog: catalog)

    UniversityLearningTestSupport.expectError(.invalidDate(path: "projection.now")) {
      _ = try self.project(
        catalog: catalog,
        state: state,
        now: Date(timeIntervalSinceReferenceDate: .infinity)
      )
    }
    UniversityLearningTestSupport.expectError(
      .timeRegression(
        stateUpdatedAt: state.updatedAt,
        now: state.updatedAt.addingTimeInterval(-1)
      )
    ) {
      _ = try self.project(
        catalog: catalog,
        state: state,
        now: state.updatedAt.addingTimeInterval(-1)
      )
    }
  }

  @Test
  func activeDelayedReturnRequiresOneMatchingRecord() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let state = try UniversityLearningTestSupport.proofReadyState(catalog: catalog)
    let record = try #require(state.delayedReturns.first)
    let missing = try LocalLearnerState(
      activeCourseID: state.activeCourseID,
      activeActivityID: state.activeActivityID,
      progress: state.progress,
      assistance: state.assistance,
      evidence: state.evidence,
      delayedReturns: [],
      updatedAt: state.updatedAt
    )
    let duplicate = try DelayedReturnRecord(
      id: try DelayedReturnID("return.projection.duplicate"),
      courseID: record.courseID,
      activityID: record.activityID,
      originEvidenceID: record.originEvidenceID,
      opensAt: record.opensAt,
      dueAt: record.dueAt,
      completedAt: nil,
      completionEvidenceID: nil
    )
    let ambiguous = try LocalLearnerState(
      activeCourseID: state.activeCourseID,
      activeActivityID: state.activeActivityID,
      progress: state.progress,
      assistance: state.assistance,
      evidence: state.evidence,
      delayedReturns: [record, duplicate],
      updatedAt: state.updatedAt
    )

    UniversityLearningTestSupport.expectError(
      .missingReference(
        path: "projection.activeDelayedReturn",
        id: state.activeActivityID.rawValue
      )
    ) {
      _ = try self.project(
        catalog: catalog,
        state: missing,
        now: state.updatedAt
      )
    }
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "projection.activeDelayedReturn",
        reason: "Active delayed return is ambiguous."
      )
    ) {
      _ = try self.project(
        catalog: catalog,
        state: ambiguous,
        now: state.updatedAt
      )
    }
  }

  @Test
  func capabilityAndActivityRowsPreserveFullCatalogOrder() throws {
    let catalog = try catalogWithLeadingCapability()
    let state = try UniversityLearningTestSupport.initialState(catalog: catalog)

    let projection = try project(
      catalog: catalog,
      state: state,
      now: UniversityLearningTestSupport.date(1)
    )

    #expect(projection.capabilityProgress.map(\.capabilityID) == catalog.capabilities.map(\.id))
    for capability in projection.capabilityProgress {
      let expected = catalog.activities
        .filter { $0.capabilityID == capability.capabilityID }
        .map(\.id)
      #expect(capability.activities.map(\.activityID) == expected)
    }
  }

  @Test
  func projectionUsesTheDomainArrayBounds() throws {
    let atLimit = try catalogWithAdditionalCapabilities(
      UniversityLearningLimits.maximumCapabilities - 1
    )
    let state = try UniversityLearningTestSupport.initialState(catalog: atLimit)
    let projection = try project(
      catalog: atLimit,
      state: state,
      now: UniversityLearningTestSupport.date(1)
    )

    #expect(projection.capabilityProgress.count == UniversityLearningLimits.maximumCapabilities)
    #expect(
      projection.capabilityProgress.allSatisfy {
        $0.activities.count <= UniversityLearningLimits.maximumActivities
      }
    )
    UniversityLearningTestSupport.expectError(
      .arrayTooLarge(
        path: "catalog.capabilities",
        maximum: UniversityLearningLimits.maximumCapabilities
      )
    ) {
      _ = try self.catalogWithAdditionalCapabilities(
        UniversityLearningLimits.maximumCapabilities
      )
    }
  }

  @Test
  func evidenceRowsSortNewestFirstWithStableEqualTimestampOrder() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let activity = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog,
      validators: ValidatorRegistry()
    )
    let timestamp = UniversityLearningTestSupport.date(5)
    let older = try engine.transition(
      state: UniversityLearningTestSupport.initialState(catalog: catalog),
      submission: try UniversityLearningTestSupport.submission(
        activityID: activity.id,
        evidenceID: try EvidenceID("evidence.older"),
        choice: "changes_direction"
      ),
      now: UniversityLearningTestSupport.date(4)
    )
    let first = try engine.transition(
      state: older,
      submission: try UniversityLearningTestSupport.submission(
        activityID: activity.id,
        evidenceID: try EvidenceID("evidence.zulu"),
        choice: "changes_direction"
      ),
      now: timestamp
    )
    let second = try engine.transition(
      state: first,
      submission: try UniversityLearningTestSupport.submission(
        activityID: activity.id,
        evidenceID: try EvidenceID("evidence.alpha"),
        choice: "changes_direction"
      ),
      now: timestamp
    )

    let projection = try project(
      catalog: catalog,
      state: second,
      now: timestamp
    )

    #expect(
      projection.evidenceRows.map(\.id.rawValue)
        == ["evidence.alpha", "evidence.zulu", "evidence.older"]
    )
    #expect(projection.evidenceRows[0].recordedAt == timestamp)
    #expect(projection.evidenceRows[1].recordedAt == timestamp)
    #expect(projection.evidenceRows[2].recordedAt == UniversityLearningTestSupport.date(4))
  }

  @Test
  func delayedReturnRowsSortByDueAtThenIDFromReverseInput() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog,
      validators: ValidatorRegistry()
    )
    let firstReturnState = try UniversityLearningTestSupport.proofReadyState(catalog: catalog)
    let firstReturn = try #require(firstReturnState.delayedReturns.first)
    let secondProofState = try LocalLearnerState(
      activeCourseID: firstReturnState.activeCourseID,
      activeActivityID: proof.id,
      progress: firstReturnState.progress,
      assistance: firstReturnState.assistance,
      evidence: firstReturnState.evidence,
      delayedReturns: firstReturnState.delayedReturns,
      updatedAt: firstReturnState.updatedAt
    )
    let secondReturnState = try engine.transition(
      state: secondProofState,
      submission: try UniversityLearningTestSupport.submission(
        activityID: proof.id,
        evidenceID: try EvidenceID("evidence.projection.order.second-proof"),
        choice: "stays_constant_after_force"
      ),
      now: firstReturnState.updatedAt.addingTimeInterval(1)
    )
    let laterReturn = try #require(secondReturnState.delayedReturns.last)
    let alphaReturn = try DelayedReturnRecord(
      id: try DelayedReturnID("return.projection.order.alpha"),
      courseID: firstReturn.courseID,
      activityID: firstReturn.activityID,
      originEvidenceID: firstReturn.originEvidenceID,
      opensAt: firstReturn.opensAt,
      dueAt: firstReturn.dueAt,
      completedAt: nil,
      completionEvidenceID: nil
    )
    let zuluReturn = try DelayedReturnRecord(
      id: try DelayedReturnID("return.projection.order.zulu"),
      courseID: firstReturn.courseID,
      activityID: firstReturn.activityID,
      originEvidenceID: firstReturn.originEvidenceID,
      opensAt: firstReturn.opensAt,
      dueAt: firstReturn.dueAt,
      completedAt: nil,
      completionEvidenceID: nil
    )
    let state = try LocalLearnerState(
      activeCourseID: secondReturnState.activeCourseID,
      activeActivityID: practice.id,
      progress: secondReturnState.progress,
      assistance: secondReturnState.assistance,
      evidence: secondReturnState.evidence,
      delayedReturns: [laterReturn, zuluReturn, alphaReturn],
      updatedAt: secondReturnState.updatedAt
    )

    let projection = try project(
      catalog: catalog,
      state: state,
      now: state.updatedAt
    )

    #expect(
      projection.delayedReturns.map(\.id.rawValue)
        == [
          "return.projection.order.alpha",
          "return.projection.order.zulu",
          laterReturn.id.rawValue,
        ]
    )
    #expect(projection.delayedReturns[0].dueAt == projection.delayedReturns[1].dueAt)
    #expect(projection.delayedReturns[1].dueAt < projection.delayedReturns[2].dueAt)
  }

  @Test
  func projectionValidatesStateBeforeBuildingRows() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let progress = try LocalActivityProgress(
      courseID: catalog.courseID,
      activityID: practice.id,
      capabilityID: try CapabilityID("capability.inconsistent"),
      attempts: 1,
      lastResult: .demonstrated,
      lastRecordedAt: UniversityLearningTestSupport.date(1)
    )
    let state = try LocalLearnerState(
      activeCourseID: catalog.courseID,
      activeActivityID: practice.id,
      progress: [progress],
      assistance: [],
      evidence: [],
      delayedReturns: [],
      updatedAt: UniversityLearningTestSupport.date(1)
    )

    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.progress.capabilityID",
        reason: "Progress does not match the catalog."
      )
    ) {
      _ = try self.project(
        catalog: catalog,
        state: state,
        now: UniversityLearningTestSupport.date(2)
      )
    }
  }

  private func project(
    catalog: ReleasedCatalogSnapshot,
    state: LocalLearnerState,
    now: Date
  ) throws -> UniversityExperienceProjection.Projection {
    try UniversityExperienceProjection.project(
      catalog: catalog,
      state: state,
      now: now,
      calendar: try utcCalendar()
    )
  }

  private func utcCalendar() throws -> Calendar {
    try calendar(secondsFromGMT: 0)
  }

  private func calendar(secondsFromGMT: Int) throws -> Calendar {
    let timeZone = try #require(TimeZone(secondsFromGMT: secondsFromGMT))
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    return calendar
  }

  private func catalogWithLeadingCapability() throws -> ReleasedCatalogSnapshot {
    let catalog = try UniversityStarterCourse.catalog()
    let sourceBinding = try #require(catalog.sourceBindings.first)
    let templateActivity = try #require(catalog.activities.first)
    let capability = try CatalogCapability(
      id: try CapabilityID("capability.projection.leading"),
      courseID: catalog.courseID,
      title: "Projection leading capability",
      sourceBindingIDs: [sourceBinding.id]
    )
    let activity = try CatalogActivity(
      id: try ActivityID("activity.projection.leading.practice"),
      courseID: catalog.courseID,
      capabilityID: capability.id,
      taskFamilyID: try TaskFamilyID("task-family.projection.leading.practice"),
      kind: .practice,
      prompt: "Projection ordering practice",
      choices: ["stays_constant_after_force", "changes_direction"],
      sourceBindingIDs: [sourceBinding.id],
      proofClaimID: nil,
      validatorID: .forceMotionTransferV1,
      prerequisiteActivityIDs: [],
      aiBoundary: templateActivity.aiBoundary,
      returnPolicy: nil
    )
    return try ReleasedCatalogSnapshot(
      catalogReleaseID: catalog.catalogReleaseID,
      package: catalog.package,
      courseID: catalog.courseID,
      capabilities: [capability] + catalog.capabilities,
      activities: [activity] + catalog.activities,
      sourceBindings: catalog.sourceBindings,
      proofClaimIDs: catalog.proofClaimIDs,
      limitations: catalog.limitations
    )
  }

  private func catalogWithAdditionalCapabilities(
    _ additionalCapabilities: Int
  ) throws -> ReleasedCatalogSnapshot {
    let catalog = try UniversityStarterCourse.catalog()
    let sourceBinding = try #require(catalog.sourceBindings.first)
    var capabilities = catalog.capabilities
    for index in 0..<additionalCapabilities {
      capabilities.append(
        try CatalogCapability(
          id: try CapabilityID("capability.projection.bound.\(index)"),
          courseID: catalog.courseID,
          title: "Projection bound capability \(index)",
          sourceBindingIDs: [sourceBinding.id]
        )
      )
    }
    return try ReleasedCatalogSnapshot(
      catalogReleaseID: catalog.catalogReleaseID,
      package: catalog.package,
      courseID: catalog.courseID,
      capabilities: capabilities,
      activities: catalog.activities,
      sourceBindings: catalog.sourceBindings,
      proofClaimIDs: catalog.proofClaimIDs,
      limitations: catalog.limitations
    )
  }
}

enum ReturnMoment: Sendable {
  case opensAt
  case dueAt
}
