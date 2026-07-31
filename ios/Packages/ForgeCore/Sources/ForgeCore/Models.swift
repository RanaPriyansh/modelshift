import Foundation

public enum LearnerMode: String, Codable, CaseIterable, Identifiable, Sendable {
  case childWithAdult
  case teen
  case adult

  public var id: Self { self }

  public var title: String {
    switch self {
    case .childWithAdult:
      "With a grown-up"
    case .teen:
      "Teen"
    case .adult:
      "Adult"
    }
  }

  public var dataBoundary: String {
    switch self {
    case .childWithAdult:
      "Device-only. A grown-up manages reminders."
    case .teen:
      "Device-only by default."
    case .adult:
      "Device-only until you choose another approved option."
    }
  }
}

public enum StudyDepth: String, Codable, CaseIterable, Identifiable, Sendable {
  case orient
  case build
  case prove

  public var id: Self { self }

  public var title: String {
    switch self {
    case .orient:
      "Find my starting point"
    case .build:
      "Build working capability"
    case .prove:
      "Prepare independent proof"
    }
  }
}

public struct OnboardingDraft: Codable, Equatable, Sendable {
  public var goal: String
  public var mode: LearnerMode
  public var availableMinutes: Int
  public var depth: StudyDepth
  public var grownUpPresent: Bool

  public init(
    goal: String = "",
    mode: LearnerMode = .adult,
    availableMinutes: Int = 25,
    depth: StudyDepth = .build,
    grownUpPresent: Bool = false
  ) {
    self.goal = goal
    self.mode = mode
    self.availableMinutes = availableMinutes
    self.depth = depth
    self.grownUpPresent = grownUpPresent
  }

  public var normalizedGoal: String {
    goal.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  public var isReady: Bool {
    normalizedGoal.count >= 8
      && [15, 25, 45].contains(availableMinutes)
      && (mode != .childWithAdult || grownUpPresent)
  }
}

public enum ForgeDestination: String, Codable, CaseIterable, Sendable {
  case today
  case path
  case evidence
  case returns
  case focus
  case settings
}

public enum ActionState: String, Codable, Sendable {
  case ready
  case dueReturn
  case unavailable
}

public struct ForgeNextAction: Codable, Equatable, Identifiable, Sendable {
  public let id: String
  public let title: String
  public let rationale: String
  public let durationMinutes: Int
  public let state: ActionState
  public let destination: ForgeDestination

  public init(
    id: String,
    title: String,
    rationale: String,
    durationMinutes: Int,
    state: ActionState,
    destination: ForgeDestination
  ) {
    self.id = id
    self.title = title
    self.rationale = rationale
    self.durationMinutes = durationMinutes
    self.state = state
    self.destination = destination
  }
}

public struct ForgeMilestone: Codable, Equatable, Identifiable, Sendable {
  public enum State: String, Codable, Sendable {
    case complete
    case active
    case next
    case reviewGap
  }

  public let id: String
  public let title: String
  public let detail: String
  public let state: State

  public init(id: String, title: String, detail: String, state: State) {
    self.id = id
    self.title = title
    self.detail = detail
    self.state = state
  }
}

public struct ForgeEvidenceRecord: Codable, Equatable, Identifiable, Sendable {
  public let id: String
  public let title: String
  public let status: String
  public let limitation: String
  public let recordedAt: Date

  public init(
    id: String,
    title: String,
    status: String,
    limitation: String,
    recordedAt: Date
  ) {
    self.id = id
    self.title = title
    self.status = status
    self.limitation = limitation
    self.recordedAt = recordedAt
  }
}

public struct ForgeDueReturn: Codable, Equatable, Identifiable, Sendable {
  public let id: String
  public let dueAt: Date
  public let status: String

  public init(id: String, dueAt: Date, status: String) {
    self.id = id
    self.dueAt = dueAt
    self.status = status
  }
}

public struct ForgeSnapshot: Codable, Equatable, Sendable {
  public let goal: String
  public let mode: LearnerMode
  public let nextAction: ForgeNextAction
  public let milestones: [ForgeMilestone]
  public let evidence: [ForgeEvidenceRecord]
  public let dueReturn: ForgeDueReturn?
  public let updatedAt: Date

  public init(
    goal: String,
    mode: LearnerMode,
    nextAction: ForgeNextAction,
    milestones: [ForgeMilestone],
    evidence: [ForgeEvidenceRecord],
    dueReturn: ForgeDueReturn?,
    updatedAt: Date
  ) {
    self.goal = goal
    self.mode = mode
    self.nextAction = nextAction
    self.milestones = milestones
    self.evidence = evidence
    self.dueReturn = dueReturn
    self.updatedAt = updatedAt
  }
}
