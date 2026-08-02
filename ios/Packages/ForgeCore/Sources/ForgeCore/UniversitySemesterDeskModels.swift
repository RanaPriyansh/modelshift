import Foundation

/// The stable local state version for the university-first Semester Desk.
public enum UniversitySemesterDeskSchema {
  public static let version = "forge-semester-desk-v2"
}

/// Names each deterministic identifier requested by the Semester Desk engine.
public enum UniversitySemesterDeskIdentifierKind: String, Codable, CaseIterable, Equatable, Sendable
{
  case semester
  case course
  case courseFact = "course-fact"
  case factConflict = "fact-conflict"
  case capacityDraft = "capacity-draft"
  case planItem = "plan-item"
  case recoveryDraft = "recovery-draft"
  case recoveryChange = "recovery-change"
  case studySession = "study-session"
  case proof
  case delayedReturn = "delayed-return"
  case progressEvidence = "progress-evidence"
}

/// Supplies a canonical UTC timestamp for one state transition.
public protocol UniversitySemesterDeskClock: Sendable {
  func now() -> String
}

/// Supplies deterministic identifiers for one state transition.
public protocol UniversitySemesterDeskIdentifierFactory: Sendable {
  func next(kind: UniversitySemesterDeskIdentifierKind) -> String
}

/// Dependencies that make Semester Desk transitions deterministic and testable.
public struct UniversitySemesterDeskRuntime: Sendable {
  public let clock: any UniversitySemesterDeskClock
  public let identifiers: any UniversitySemesterDeskIdentifierFactory

  public init(
    clock: any UniversitySemesterDeskClock,
    identifiers: any UniversitySemesterDeskIdentifierFactory
  ) {
    self.clock = clock
    self.identifiers = identifiers
  }
}

public enum UniversitySemesterDeskErrorCode: String, Codable, CaseIterable, Equatable, Sendable {
  case invalidInput = "invalid-input"
  case profileMismatch = "profile-mismatch"
  case notFound = "not-found"
  case alreadyExists = "already-exists"
  case invalidTransition = "invalid-transition"
  case courseReviewRequired = "course-review-required"
  case capacityDraftMissing = "capacity-draft-missing"
  case recoveryDraftMissing = "recovery-draft-missing"
  case recoveryDecisionInvalid = "recovery-decision-invalid"
  case nextActionRequired = "next-action-required"
  case practiceRequired = "practice-required"
  case proofRequired = "proof-required"
  case returnNotDue = "return-not-due"
  case returnNotOpen = "return-not-open"
}

/// A user-actionable domain failure.
public struct UniversitySemesterDeskError: Error, Codable, Equatable, Sendable, LocalizedError {
  public let code: UniversitySemesterDeskErrorCode
  public let message: String

  public init(code: UniversitySemesterDeskErrorCode, message: String) {
    self.code = code
    self.message = message
  }

  public var errorDescription: String? { message }
}

public enum UniversitySemesterDeskCourseFactStatus: String, Codable, CaseIterable, Equatable,
  Sendable
{
  case checked
  case needsReview = "needs-review"
  case notConfirmed = "not-confirmed"
  case changedSinceLastCheck = "changed-since-last-check"
}

public struct UniversitySemesterDeskCourseFact: Codable, Equatable, Sendable {
  public let id: String
  public let label: String
  public let value: String
  public let status: UniversitySemesterDeskCourseFactStatus
  public let sourceLabel: String
  public let checkedAt: String?
}

public enum UniversitySemesterDeskFactConflictStatus: String, Codable, CaseIterable, Equatable,
  Sendable
{
  case open
  case resolved
}

public struct UniversitySemesterDeskFactConflict: Codable, Equatable, Sendable {
  public let id: String
  public let factIDs: [String]
  public let summary: String
  public let status: UniversitySemesterDeskFactConflictStatus
  public let detectedAt: String
  public let reviewedAt: String?
}

public struct UniversitySemesterDeskCourse: Codable, Equatable, Sendable {
  public let id: String
  public let code: String
  public let title: String
  public let facts: [UniversitySemesterDeskCourseFact]
  public let factConflicts: [UniversitySemesterDeskFactConflict]
}

public struct UniversitySemesterDeskConfirmedCapacity: Codable, Equatable, Sendable {
  public let availableMinutes: Int
  public let declaredAt: String
}

public struct UniversitySemesterDeskCapacityDraft: Codable, Equatable, Sendable {
  public let id: String
  public let availableMinutes: Int
  public let draftedAt: String
}

public enum UniversitySemesterDeskPlanItemStatus: String, Codable, CaseIterable, Equatable, Sendable
{
  case planned
  case deferred
  case inProgress = "in-progress"
  case practiceComplete = "practice-complete"
  case proofComplete = "proof-complete"
  case returnComplete = "return-complete"
}

public struct UniversitySemesterDeskPlanItem: Codable, Equatable, Sendable {
  public let id: String
  public let courseID: String
  public let title: String
  public let originalDate: String
  public let currentDate: String
  public let originalMinutes: Int
  public let currentMinutes: Int
  public let status: UniversitySemesterDeskPlanItemStatus
}

public enum UniversitySemesterDeskRecoveryOutcome: String, Codable, CaseIterable, Equatable,
  Sendable
{
  case moved
  case reduced
  case kept
  case deferred
}

public struct UniversitySemesterDeskRecoveryDecisionInput: Codable, Equatable, Sendable {
  public let planItemID: String
  public let outcome: UniversitySemesterDeskRecoveryOutcome
  public let nextDate: String?
  public let nextMinutes: Int?
  public let reason: String

  public init(
    planItemID: String,
    outcome: UniversitySemesterDeskRecoveryOutcome,
    nextDate: String? = nil,
    nextMinutes: Int? = nil,
    reason: String
  ) {
    self.planItemID = planItemID
    self.outcome = outcome
    self.nextDate = nextDate
    self.nextMinutes = nextMinutes
    self.reason = reason
  }
}

public struct UniversitySemesterDeskRecoveryDecision: Codable, Equatable, Sendable {
  public let planItemID: String
  public let outcome: UniversitySemesterDeskRecoveryOutcome
  public let nextDate: String?
  public let nextMinutes: Int?
  public let reason: String
}

public struct UniversitySemesterDeskRecoveryDraft: Codable, Equatable, Sendable {
  public let id: String
  public let summary: String
  public let createdAt: String
  public let decisions: [UniversitySemesterDeskRecoveryDecision]
}

public struct UniversitySemesterDeskRecoveryChange: Codable, Equatable, Sendable {
  public let id: String
  public let recoveryDraftID: String
  public let planItemID: String
  public let outcome: UniversitySemesterDeskRecoveryOutcome
  public let reason: String
  public let previousDate: String
  public let currentDate: String
  public let previousMinutes: Int
  public let currentMinutes: Int
  public let recordedAt: String
}

public enum UniversitySemesterDeskStudySessionStatus: String, Codable, CaseIterable, Equatable,
  Sendable
{
  case active
  case practiceComplete = "practice-complete"
}

public enum UniversitySemesterDeskPracticeOutcome: String, Codable, CaseIterable, Equatable,
  Sendable
{
  case completed
  case needsMoreWork = "needs-more-work"
}

public struct UniversitySemesterDeskProtectedStudySession: Codable, Equatable, Sendable {
  public let id: String
  public let planItemID: String
  public let status: UniversitySemesterDeskStudySessionStatus
  public let startedAt: String
  public let practiceCompletedAt: String?
  public let practiceOutcome: UniversitySemesterDeskPracticeOutcome?
}

public enum UniversitySemesterDeskProofOutcome: String, Codable, CaseIterable, Equatable, Sendable {
  case demonstrated
  case needsReturn = "needs-return"
}

public struct UniversitySemesterDeskIndependentProof: Codable, Equatable, Sendable {
  public let id: String
  public let planItemID: String
  public let outcome: UniversitySemesterDeskProofOutcome
  public let completedAt: String
}

public enum UniversitySemesterDeskDelayedReturnStatus: String, Codable, CaseIterable, Equatable,
  Sendable
{
  case due
  case open
  case completed
}

public enum UniversitySemesterDeskRetentionOutcome: String, Codable, CaseIterable, Equatable,
  Sendable
{
  case retained
  case needsMoreWork = "needs-more-work"
}

public struct UniversitySemesterDeskDelayedReturn: Codable, Equatable, Sendable {
  public let id: String
  public let planItemID: String
  public let dueAt: String
  public let status: UniversitySemesterDeskDelayedReturnStatus
  public let openedAt: String?
  public let completedAt: String?
  public let retentionOutcome: UniversitySemesterDeskRetentionOutcome?
}

public enum UniversitySemesterDeskProgressEvidenceKind: String, Codable, CaseIterable, Equatable,
  Sendable
{
  case practiceCompleted = "practice-completed"
  case independentProofCompleted = "independent-proof-completed"
  case delayedReturnCompleted = "delayed-return-completed"
}

public enum UniversitySemesterDeskProgressEvidenceOutcome: String, Codable, CaseIterable, Equatable,
  Sendable
{
  case completed
  case needsMoreWork = "needs-more-work"
  case demonstrated
  case needsReturn = "needs-return"
  case retained
}

/// This record is answer-free. The Semester Desk state never accepts answer text.
public struct UniversitySemesterDeskProgressEvidence: Codable, Equatable, Sendable {
  public let id: String
  public let planItemID: String
  public let kind: UniversitySemesterDeskProgressEvidenceKind
  public let outcome: UniversitySemesterDeskProgressEvidenceOutcome
  public let occurredAt: String
}

/// A complete profile-bound Semester Desk. Array order is authored order.
public struct UniversitySemesterDeskState: Codable, Equatable, Sendable {
  public let schemaVersion: String
  public let id: String
  public let profileID: String
  public let title: String
  public let createdAt: String
  public let updatedAt: String
  public let courses: [UniversitySemesterDeskCourse]
  public let capacity: UniversitySemesterDeskConfirmedCapacity?
  public let capacityDraft: UniversitySemesterDeskCapacityDraft?
  public let planItems: [UniversitySemesterDeskPlanItem]
  public let recoveryDraft: UniversitySemesterDeskRecoveryDraft?
  public let recoveryChanges: [UniversitySemesterDeskRecoveryChange]
  public let selectedNextActionID: String?
  public let protectedStudySessions: [UniversitySemesterDeskProtectedStudySession]
  public let independentProofs: [UniversitySemesterDeskIndependentProof]
  public let delayedReturns: [UniversitySemesterDeskDelayedReturn]
  public let progressEvidence: [UniversitySemesterDeskProgressEvidence]
}

public struct UniversitySemesterDeskCreateInput: Codable, Equatable, Sendable {
  public let profileID: String
  public let title: String

  public init(profileID: String, title: String) {
    self.profileID = profileID
    self.title = title
  }
}

/// Each case is a direct student action. There is no answer text command.
public enum UniversitySemesterDeskCommand: Codable, Equatable, Sendable {
  case addCourse(profileID: String, code: String, title: String)
  case addCourseFact(
    profileID: String,
    courseID: String,
    label: String,
    value: String,
    status: UniversitySemesterDeskCourseFactStatus,
    sourceLabel: String,
    checkedAt: String?
  )
  case setCourseFactStatus(
    profileID: String,
    courseID: String,
    factID: String,
    status: UniversitySemesterDeskCourseFactStatus,
    checkedAt: String?
  )
  case recordFactConflict(
    profileID: String,
    courseID: String,
    factIDs: [String],
    summary: String
  )
  case reviewFactConflict(profileID: String, courseID: String, conflictID: String)
  case draftCapacity(profileID: String, availableMinutes: Int)
  case confirmCapacity(profileID: String)
  case addPlanItem(
    profileID: String,
    courseID: String,
    title: String,
    date: String,
    minutes: Int
  )
  case prepareRecovery(
    profileID: String,
    summary: String,
    decisions: [UniversitySemesterDeskRecoveryDecisionInput]
  )
  case confirmRecovery(profileID: String)
  case chooseNextAction(profileID: String, planItemID: String)
  case resumeDeferredItem(profileID: String, planItemID: String)
  case startProtectedStudy(profileID: String, planItemID: String)
  case completePractice(
    profileID: String,
    studySessionID: String,
    outcome: UniversitySemesterDeskPracticeOutcome
  )
  case submitIndependentProof(
    profileID: String,
    planItemID: String,
    outcome: UniversitySemesterDeskProofOutcome
  )
  case scheduleDelayedReturn(profileID: String, planItemID: String, dueAt: String)
  case openDelayedReturn(profileID: String, delayedReturnID: String)
  case completeDelayedReturn(
    profileID: String,
    delayedReturnID: String,
    outcome: UniversitySemesterDeskRetentionOutcome
  )

  public var profileID: String {
    switch self {
    case .addCourse(let profileID, _, _),
      .addCourseFact(let profileID, _, _, _, _, _, _),
      .setCourseFactStatus(let profileID, _, _, _, _),
      .recordFactConflict(let profileID, _, _, _),
      .reviewFactConflict(let profileID, _, _),
      .draftCapacity(let profileID, _),
      .confirmCapacity(let profileID),
      .addPlanItem(let profileID, _, _, _, _),
      .prepareRecovery(let profileID, _, _),
      .confirmRecovery(let profileID),
      .chooseNextAction(let profileID, _),
      .resumeDeferredItem(let profileID, _),
      .startProtectedStudy(let profileID, _),
      .completePractice(let profileID, _, _),
      .submitIndependentProof(let profileID, _, _),
      .scheduleDelayedReturn(let profileID, _, _),
      .openDelayedReturn(let profileID, _),
      .completeDelayedReturn(let profileID, _, _):
      profileID
    }
  }
}
