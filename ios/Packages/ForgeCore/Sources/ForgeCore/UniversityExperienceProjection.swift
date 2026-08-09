import Foundation

public enum UniversityExperienceProjection: Sendable {
  public static let maximumCapabilityRows = UniversityLearningLimits.maximumCapabilities
  public static let maximumEvidenceRows = UniversityLearningLimits.maximumEvidence
  public static let maximumDelayedReturnRows = UniversityLearningLimits.maximumReturns

  public struct Projection: Equatable, Sendable {
    public let activeActivity: ActiveActivity
    public let capabilityProgress: [CapabilityProgress]
    public let nextActionState: NextActionState
    public let delayedReturns: [DelayedReturnRow]
    public let evidenceRows: [EvidenceRow]
  }

  public struct ActiveActivity: Equatable, Sendable {
    public let id: ActivityID
    public let capabilityID: CapabilityID
    public let kind: ActivityKind
    public let prompt: String
    public let validatorID: ValidatorID
  }

  public struct CapabilityProgress: Equatable, Sendable {
    public let capabilityID: CapabilityID
    public let title: String
    public let activities: [ActivityProgress]
  }

  public struct ActivityProgress: Equatable, Sendable {
    public let activityID: ActivityID
    public let kind: ActivityKind
    public let attempts: Int
    public let lastValidatorResult: ValidatorResult?
    public let lastRecordedAt: Date?
  }

  public enum NextActionState: Equatable, Sendable {
    case activeActivity
    case delayedReturn(DelayedReturnStatus)
  }

  public struct DelayedReturnRow: Equatable, Sendable {
    public let id: DelayedReturnID
    public let activityID: ActivityID
    public let status: DelayedReturnStatus
    public let opensAt: Date
    public let dueAt: Date
    public let completedAt: Date?
    public let completionEvidenceID: EvidenceID?
    public let isDueOnCurrentCalendarDay: Bool
  }

  public struct EvidenceRow: Equatable, Sendable {
    public let id: EvidenceID
    public let activityID: ActivityID
    public let capabilityID: CapabilityID
    public let activityKind: ActivityKind
    public let validatorResult: ValidatorResult
    public let recordedAt: Date
  }

  public static func project(
    catalog: ReleasedCatalogSnapshot,
    state: LocalLearnerState,
    now: Date,
    calendar: Calendar
  ) throws -> Projection {
    try catalog.validate()
    try state.validate(against: catalog)
    guard now.timeIntervalSinceReferenceDate.isFinite else {
      throw UniversityLearningError.invalidDate(path: "projection.now")
    }
    guard now >= state.updatedAt else {
      throw UniversityLearningError.timeRegression(stateUpdatedAt: state.updatedAt, now: now)
    }

    let activitiesByID = Dictionary(
      uniqueKeysWithValues: catalog.activities.map { ($0.id, $0) }
    )
    guard let active = activitiesByID[state.activeActivityID] else {
      throw UniversityLearningError.missingReference(
        path: "projection.activeActivity", id: state.activeActivityID.rawValue)
    }

    let activeActivity = ActiveActivity(
      id: active.id,
      capabilityID: active.capabilityID,
      kind: active.kind,
      prompt: active.prompt,
      validatorID: active.validatorID
    )
    let delayedReturns = try boundedRows(
      state.delayedReturns
        .sorted(by: delayedReturnOrder)
        .map { record in
          DelayedReturnRow(
            id: record.id,
            activityID: record.activityID,
            status: record.status(at: now),
            opensAt: record.opensAt,
            dueAt: record.dueAt,
            completedAt: record.completedAt,
            completionEvidenceID: record.completionEvidenceID,
            isDueOnCurrentCalendarDay: calendar.isDate(
              record.dueAt,
              inSameDayAs: now
            )
          )
        },
      path: "projection.delayedReturns",
      maximum: maximumDelayedReturnRows
    )
    let progressByActivityID = Dictionary(
      uniqueKeysWithValues: state.progress.map { ($0.activityID, $0) }
    )
    let capabilityProgress = try boundedRows(
      catalog.capabilities
        .map { capability in
          let activities = try boundedRows(
            catalog.activities
              .filter { $0.capabilityID == capability.id }
              .map { activity in
                if let item = progressByActivityID[activity.id] {
                  return ActivityProgress(
                    activityID: activity.id,
                    kind: activity.kind,
                    attempts: item.attempts,
                    lastValidatorResult: item.lastResult,
                    lastRecordedAt: item.lastRecordedAt
                  )
                }
                return ActivityProgress(
                  activityID: activity.id,
                  kind: activity.kind,
                  attempts: 0,
                  lastValidatorResult: nil,
                  lastRecordedAt: nil
                )
              },
            path: "projection.capabilityProgress.activities",
            maximum: UniversityLearningLimits.maximumActivities
          )
          return CapabilityProgress(
            capabilityID: capability.id,
            title: capability.title,
            activities: activities
          )
        },
      path: "projection.capabilityProgress",
      maximum: maximumCapabilityRows
    )
    let evidenceRows = try boundedRows(
      state.evidence
        .sorted(by: evidenceOrder)
        .map {
          EvidenceRow(
            id: $0.id,
            activityID: $0.activityID,
            capabilityID: $0.capabilityID,
            activityKind: $0.activityKind,
            validatorResult: $0.validatorResult,
            recordedAt: $0.recordedAt
          )
        },
      path: "projection.evidenceRows",
      maximum: maximumEvidenceRows
    )

    return Projection(
      activeActivity: activeActivity,
      capabilityProgress: capabilityProgress,
      nextActionState: try nextActionState(
        for: active,
        delayedReturns: state.delayedReturns,
        now: now
      ),
      delayedReturns: delayedReturns,
      evidenceRows: evidenceRows
    )
  }

  private static func nextActionState(
    for activeActivity: CatalogActivity,
    delayedReturns: [DelayedReturnRecord],
    now: Date
  ) throws -> NextActionState {
    guard activeActivity.kind == .delayedReturn else {
      return .activeActivity
    }

    let matchingReturns = delayedReturns.filter { $0.activityID == activeActivity.id }
    guard matchingReturns.count == 1, let delayedReturn = matchingReturns.first else {
      if matchingReturns.isEmpty {
        throw UniversityLearningError.missingReference(
          path: "projection.activeDelayedReturn",
          id: activeActivity.id.rawValue
        )
      }
      throw UniversityLearningError.invalidState(
        path: "projection.activeDelayedReturn",
        reason: "Active delayed return is ambiguous."
      )
    }
    return .delayedReturn(delayedReturn.status(at: now))
  }

  private static func boundedRows<Element>(
    _ rows: [Element],
    path: String,
    maximum: Int
  ) throws -> [Element] {
    guard rows.count <= maximum else {
      throw UniversityLearningError.arrayTooLarge(
        path: path,
        maximum: maximum
      )
    }
    return rows
  }

  private static func delayedReturnOrder(
    _ left: DelayedReturnRecord,
    _ right: DelayedReturnRecord
  ) -> Bool {
    left.dueAt == right.dueAt
      ? left.id.rawValue < right.id.rawValue
      : left.dueAt < right.dueAt
  }

  private static func evidenceOrder(
    _ left: LocalEvidenceReceipt,
    _ right: LocalEvidenceReceipt
  ) -> Bool {
    left.recordedAt == right.recordedAt
      ? left.id.rawValue < right.id.rawValue
      : left.recordedAt > right.recordedAt
  }
}
