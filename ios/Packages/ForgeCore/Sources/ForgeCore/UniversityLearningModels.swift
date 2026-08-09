import CryptoKit
import Foundation

public enum UniversityLearningLimits {
  public static let maximumDecodeBytes = 512 * 1024, maximumIdentifierBytes = 128
  public static let maximumShortTextBytes = 512, maximumLongTextBytes = 4_096
  public static let maximumResponseBytes = 16_384, maximumCapabilities = 64
  public static let maximumActivities = 128, maximumSources = 64, maximumClaims = 128
  public static let maximumLimitations = 32, maximumProgress = 256, maximumAssistance = 256
  public static let maximumEvidence = 256, maximumReturns = 64, maximumChoices = 8
  public static let maximumPrerequisites = 16
}
public enum UniversityLearningError: Error, Equatable, Sendable {
  case dataTooLarge(maximumBytes: Int, actualBytes: Int)
  case blankValue(path: String)
  case textTooLong(path: String, maximumBytes: Int)
  case invalidIdentifier(path: String)
  case invalidDate(path: String)
  case invalidDateOrder(path: String)
  case timeRegression(stateUpdatedAt: Date, now: Date)
  case arrayTooLarge(path: String, maximum: Int)
  case duplicateID(path: String, id: String)
  case missingReference(path: String, id: String)
  case crossCourseReference(path: String, expected: String, actual: String)
  case invalidCatalog(path: String, reason: String)
  case invalidState(path: String, reason: String)
  case invalidChoice(activityID: String, choice: String)
  case invalidAssistance(path: String, reason: String)
  case activeActivityMismatch(expected: String, actual: String)
  case activityNotFound(id: String)
  case proofPrerequisiteMissing(activityID: String, prerequisiteID: String)
  case proofAssistanceBlocked(kind: AssistanceKind)
  case assistanceNotAllowed(kind: AssistanceKind)
  case duplicateEvidenceID(id: String)
  case proofNotDemonstrated(id: String)
  case delayedReturnNotFound(id: String)
  case delayedReturnNotOpen(id: String)
  case delayedReturnExpired(id: String)
  case delayedReturnCompleted(id: String)
}
public enum LearningIDNamespace: Sendable {
  public enum Course: Sendable {}
  public enum CatalogRelease: Sendable {}
  public enum Package: Sendable {}
  public enum SourceBinding: Sendable {}
  public enum Capability: Sendable {}
  public enum Activity: Sendable {}
  public enum TaskFamily: Sendable {}
  public enum ProofClaim: Sendable {}
  public enum Limitation: Sendable {}
  public enum Evidence: Sendable {}
  public enum Assistance: Sendable {}
  public enum DelayedReturn: Sendable {}
}
public struct LearningID<Namespace: Sendable>: Codable, Equatable, Hashable, Sendable {
  public let rawValue: String
  public init(_ rawValue: String) throws {
    let bytes = Array(rawValue.utf8)
    guard !rawValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw UniversityLearningError.blankValue(path: "learningID")
    }
    guard bytes.count <= UniversityLearningLimits.maximumIdentifierBytes else {
      throw UniversityLearningError.textTooLong(
        path: "learningID", maximumBytes: UniversityLearningLimits.maximumIdentifierBytes)
    }
    guard bytes.allSatisfy(universityIsIdentifierByte), let first = bytes.first,
      let last = bytes.last, universityIsASCIIAlphaNumeric(first),
      universityIsASCIIAlphaNumeric(last)
    else {
      throw UniversityLearningError.invalidIdentifier(path: "learningID")
    }
    self.rawValue = rawValue
  }
  public init(from decoder: Decoder) throws {
    try self.init(decoder.singleValueContainer().decode(String.self))
  }
  public func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()
    try container.encode(rawValue)
  }
}

public typealias CourseID = LearningID<LearningIDNamespace.Course>
public typealias CatalogReleaseID = LearningID<LearningIDNamespace.CatalogRelease>
public typealias PackageID = LearningID<LearningIDNamespace.Package>
public typealias SourceBindingID = LearningID<LearningIDNamespace.SourceBinding>
public typealias CapabilityID = LearningID<LearningIDNamespace.Capability>
public typealias ActivityID = LearningID<LearningIDNamespace.Activity>
public typealias TaskFamilyID = LearningID<LearningIDNamespace.TaskFamily>
public typealias ProofClaimID = LearningID<LearningIDNamespace.ProofClaim>
public typealias LimitationID = LearningID<LearningIDNamespace.Limitation>
public typealias EvidenceID = LearningID<LearningIDNamespace.Evidence>
public typealias AssistanceID = LearningID<LearningIDNamespace.Assistance>
public typealias DelayedReturnID = LearningID<LearningIDNamespace.DelayedReturn>
public struct SHA256Digest: Codable, Equatable, Hashable, Sendable {
  public let hex: String
  public init(hex: String) throws {
    let bytes = Array(hex.utf8)
    guard bytes.count == 64, bytes.allSatisfy(universityIsHexByte) else {
      throw UniversityLearningError.invalidIdentifier(path: "sha256Digest")
    }
    self.hex = hex.lowercased()
  }
  internal init(data: Data) {
    hex = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
  }
  public init(from decoder: Decoder) throws {
    try self.init(hex: decoder.singleValueContainer().decode(String.self))
  }
  public func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()
    try container.encode(hex)
  }
}
public enum ValidatorID: String, Codable, CaseIterable, Equatable, Hashable, Sendable {
  case forceMotionTransferV1 = "validator.force-motion-transfer.v1"
  case forceMotionDelayedReturnV1 = "validator.force-motion-delayed-return.v1"
}
public enum ValidatorResult: String, Codable, Equatable, Sendable {
  case demonstrated, notDemonstrated
}
public enum SourceProvenance: String, Codable, Equatable, Sendable {
  case provenanceIncomplete
}
public enum LimitationKind: String, Codable, Equatable, Sendable { case provenance, claimBoundary }
public enum ActivityKind: String, Codable, Equatable, Sendable {
  case practice, proof, delayedReturn
}
public enum AIAction: String, Codable, CaseIterable, Equatable, Hashable, Sendable {
  case none, retrieve, explain, instruct, solution, replay, answerChanging
}
public enum RetrievalMode: String, Codable, CaseIterable, Equatable, Sendable {
  case none, catalogOnly, sourceBindingsOnly, external
}
public enum ModelIdentityRequirement: String, Codable, CaseIterable, Equatable, Sendable {
  case none, optional, required
}
public enum AssistanceKind: String, Codable, CaseIterable, Equatable, Hashable, Sendable {
  case accessAccommodation, ai, instructionalHelp, solution, replay, answerChanging
}
public enum EvidenceScope: String, Codable, Equatable, Sendable { case local }
public struct CatalogPackageIdentity: Codable, Equatable, Sendable {
  public let packageID: PackageID, version: String, digest: SHA256Digest
  public init(packageID: PackageID, version: String, digest: SHA256Digest) throws {
    self.packageID = packageID
    self.version = try validatedText(
      version, path: "package.version", maximumBytes: UniversityLearningLimits.maximumShortTextBytes
    )
    self.digest = digest
  }
}
public struct CatalogLimitation: Codable, Equatable, Sendable {
  public let id: LimitationID, kind: LimitationKind, statement: String
  public init(id: LimitationID, kind: LimitationKind, statement: String) throws {
    self.id = id
    self.kind = kind
    self.statement = try validatedText(
      statement, path: "limitation.statement",
      maximumBytes: UniversityLearningLimits.maximumLongTextBytes)
  }
}
public struct SourceBinding: Codable, Equatable, Sendable {
  public let id: SourceBindingID, courseID: CourseID, title: String
  public let provenance: SourceProvenance
  public init(
    id: SourceBindingID, courseID: CourseID, title: String, provenance: SourceProvenance
  ) throws {
    self.id = id
    self.courseID = courseID
    self.title = try validatedText(
      title, path: "sourceBinding.title",
      maximumBytes: UniversityLearningLimits.maximumShortTextBytes)
    self.provenance = provenance
  }
}
public struct CatalogCapability: Codable, Equatable, Sendable {
  public let id: CapabilityID, courseID: CourseID, title: String
  public let sourceBindingIDs: [SourceBindingID]
  public init(
    id: CapabilityID, courseID: CourseID, title: String, sourceBindingIDs: [SourceBindingID]
  ) throws {
    self.id = id
    self.courseID = courseID
    self.title = try validatedText(
      title, path: "capability.title", maximumBytes: UniversityLearningLimits.maximumShortTextBytes)
    self.sourceBindingIDs = sourceBindingIDs
    try validateUnique(
      sourceBindingIDs.map(\.rawValue), path: "capability.sourceBindingIDs",
      maximum: UniversityLearningLimits.maximumSources)
  }
}

public struct ActivityBoundary: Codable, Equatable, Sendable {
  public let allowedAIActions: Set<AIAction>, retrievalMode: RetrievalMode
  public let modelIdentityRequirement: ModelIdentityRequirement
  public let allowsConstructPreservingAccess: Bool
  public init(
    allowedAIActions: Set<AIAction>, retrievalMode: RetrievalMode,
    modelIdentityRequirement: ModelIdentityRequirement, allowsConstructPreservingAccess: Bool
  ) {
    self.allowedAIActions = allowedAIActions
    self.retrievalMode = retrievalMode
    self.modelIdentityRequirement = modelIdentityRequirement
    self.allowsConstructPreservingAccess = allowsConstructPreservingAccess
  }

  private enum CodingKeys: String, CodingKey {
    case allowedAIActions, retrievalMode, modelIdentityRequirement
    case allowsConstructPreservingAccess
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    var actionContainer = try container.nestedUnkeyedContainer(forKey: .allowedAIActions)
    let path = "catalog.activity.aiBoundary.allowedAIActions"
    guard let actionCount = actionContainer.count,
      actionCount <= AIAction.allCases.count
    else {
      throw UniversityLearningError.arrayTooLarge(
        path: path,
        maximum: AIAction.allCases.count
      )
    }
    var actions = [AIAction]()
    actions.reserveCapacity(actionCount)
    var seen = Set<String>()
    while !actionContainer.isAtEnd {
      let action = try actionContainer.decode(AIAction.self)
      guard seen.insert(action.rawValue).inserted else {
        throw UniversityLearningError.duplicateID(path: path, id: action.rawValue)
      }
      actions.append(action)
    }
    self.init(
      allowedAIActions: Set(actions),
      retrievalMode: try container.decode(RetrievalMode.self, forKey: .retrievalMode),
      modelIdentityRequirement: try container.decode(
        ModelIdentityRequirement.self,
        forKey: .modelIdentityRequirement
      ),
      allowsConstructPreservingAccess: try container.decode(
        Bool.self,
        forKey: .allowsConstructPreservingAccess
      )
    )
  }

  public func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(
      allowedAIActions.sorted { $0.rawValue < $1.rawValue },
      forKey: .allowedAIActions
    )
    try container.encode(retrievalMode, forKey: .retrievalMode)
    try container.encode(modelIdentityRequirement, forKey: .modelIdentityRequirement)
    try container.encode(
      allowsConstructPreservingAccess,
      forKey: .allowsConstructPreservingAccess
    )
  }
}

public struct ReturnPolicy: Codable, Equatable, Sendable {
  public let delayedReturnActivityID: ActivityID, openDelay: TimeInterval, dueWindow: TimeInterval
  public init(
    delayedReturnActivityID: ActivityID, openDelay: TimeInterval, dueWindow: TimeInterval
  ) throws {
    self.delayedReturnActivityID = delayedReturnActivityID
    self.openDelay = openDelay
    self.dueWindow = dueWindow
    try validate()
  }
  internal func validate() throws {
    guard openDelay.isFinite, dueWindow.isFinite, openDelay > 0, dueWindow > 0 else {
      throw UniversityLearningError.invalidDateOrder(path: "returnPolicy")
    }
  }
  private enum CodingKeys: String, CodingKey {
    case delayedReturnActivityID, openDelay, dueWindow
  }
  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    try self.init(
      delayedReturnActivityID: c.decode(ActivityID.self, forKey: .delayedReturnActivityID),
      openDelay: c.decode(TimeInterval.self, forKey: .openDelay),
      dueWindow: c.decode(TimeInterval.self, forKey: .dueWindow))
  }
}

public struct CatalogActivity: Codable, Equatable, Sendable {
  public let id: ActivityID, courseID: CourseID, capabilityID: CapabilityID
  public let taskFamilyID: TaskFamilyID, kind: ActivityKind, prompt: String
  public let choices: [String], sourceBindingIDs: [SourceBindingID]
  public let proofClaimID: ProofClaimID?, validatorID: ValidatorID
  public let prerequisiteActivityIDs: [ActivityID], aiBoundary: ActivityBoundary
  public let returnPolicy: ReturnPolicy?
  public init(
    id: ActivityID, courseID: CourseID, capabilityID: CapabilityID, taskFamilyID: TaskFamilyID,
    kind: ActivityKind, prompt: String, choices: [String], sourceBindingIDs: [SourceBindingID],
    proofClaimID: ProofClaimID?, validatorID: ValidatorID, prerequisiteActivityIDs: [ActivityID],
    aiBoundary: ActivityBoundary, returnPolicy: ReturnPolicy?
  ) throws {
    self.id = id
    self.courseID = courseID
    self.capabilityID = capabilityID
    self.taskFamilyID = taskFamilyID
    self.kind = kind
    self.prompt = try validatedText(
      prompt, path: "activity.prompt", maximumBytes: UniversityLearningLimits.maximumLongTextBytes)
    self.choices = try validatedChoices(choices, path: "activity.choices")
    self.sourceBindingIDs = sourceBindingIDs
    self.proofClaimID = proofClaimID
    self.validatorID = validatorID
    self.prerequisiteActivityIDs = prerequisiteActivityIDs
    self.aiBoundary = aiBoundary
    self.returnPolicy = returnPolicy
    try validateUnique(
      sourceBindingIDs.map(\.rawValue), path: "activity.sourceBindingIDs",
      maximum: UniversityLearningLimits.maximumSources)
    try validateUnique(
      prerequisiteActivityIDs.map(\.rawValue), path: "activity.prerequisiteActivityIDs",
      maximum: UniversityLearningLimits.maximumPrerequisites)
  }
}

public struct ReleasedCatalogSnapshot: Codable, Equatable, Sendable, UniversityLearningValidating {
  public let catalogReleaseID: CatalogReleaseID, package: CatalogPackageIdentity
  public let courseID: CourseID, capabilities: [CatalogCapability]
  public let activities: [CatalogActivity], sourceBindings: [SourceBinding]
  public let proofClaimIDs: [ProofClaimID], limitations: [CatalogLimitation]
  public init(
    catalogReleaseID: CatalogReleaseID, package: CatalogPackageIdentity, courseID: CourseID,
    capabilities: [CatalogCapability], activities: [CatalogActivity],
    sourceBindings: [SourceBinding],
    proofClaimIDs: [ProofClaimID], limitations: [CatalogLimitation]
  ) throws {
    self.catalogReleaseID = catalogReleaseID
    self.package = package
    self.courseID = courseID
    self.capabilities = capabilities
    self.activities = activities
    self.sourceBindings = sourceBindings
    self.proofClaimIDs = proofClaimIDs
    self.limitations = limitations
    try validate()
  }
  public func validate() throws {
    _ = try validatedText(
      package.version, path: "package.version",
      maximumBytes: UniversityLearningLimits.maximumShortTextBytes)
    try validateUnique(
      capabilities.map(\.id.rawValue), path: "catalog.capabilities",
      maximum: UniversityLearningLimits.maximumCapabilities)
    try validateUnique(
      activities.map(\.id.rawValue), path: "catalog.activities",
      maximum: UniversityLearningLimits.maximumActivities)
    try validateUnique(
      sourceBindings.map(\.id.rawValue), path: "catalog.sourceBindings",
      maximum: UniversityLearningLimits.maximumSources)
    try validateUnique(
      proofClaimIDs.map(\.rawValue), path: "catalog.proofClaimIDs",
      maximum: UniversityLearningLimits.maximumClaims)
    try validateUnique(
      limitations.map(\.id.rawValue), path: "catalog.limitations",
      maximum: UniversityLearningLimits.maximumLimitations)
    guard !capabilities.isEmpty, !activities.isEmpty else {
      throw UniversityLearningError.invalidCatalog(
        path: "catalog", reason: "A released course needs capabilities and activities.")
    }
    for limitation in limitations {
      _ = try validatedText(
        limitation.statement, path: "limitation.statement",
        maximumBytes: UniversityLearningLimits.maximumLongTextBytes)
    }
    let sourceIDs = Set(sourceBindings.map(\.id))
    let capabilityIDs = Set(capabilities.map(\.id))
    let activityByID = Dictionary(uniqueKeysWithValues: activities.map { ($0.id, $0) })
    let claimIDs = Set(proofClaimIDs)
    for source in sourceBindings {
      _ = try validatedText(
        source.title, path: "sourceBinding.title",
        maximumBytes: UniversityLearningLimits.maximumShortTextBytes)
      try requireCourse(source.courseID, expected: courseID, path: "catalog.sourceBinding.courseID")
    }
    for capability in capabilities {
      _ = try validatedText(
        capability.title, path: "capability.title",
        maximumBytes: UniversityLearningLimits.maximumShortTextBytes)
      try requireCourse(
        capability.courseID, expected: courseID, path: "catalog.capability.courseID")
      try validateUnique(
        capability.sourceBindingIDs.map(\.rawValue), path: "catalog.capability.sourceBindingIDs",
        maximum: UniversityLearningLimits.maximumSources)
      for sourceID in capability.sourceBindingIDs where !sourceIDs.contains(sourceID) {
        throw UniversityLearningError.missingReference(
          path: "catalog.capability.sourceBindingIDs", id: sourceID.rawValue)
      }
    }
    for activity in activities {
      _ = try validatedText(
        activity.prompt, path: "activity.prompt",
        maximumBytes: UniversityLearningLimits.maximumLongTextBytes)
      _ = try validatedChoices(activity.choices, path: "activity.choices")
      try requireCourse(activity.courseID, expected: courseID, path: "catalog.activity.courseID")
      guard capabilityIDs.contains(activity.capabilityID) else {
        throw UniversityLearningError.missingReference(
          path: "catalog.activity.capabilityID", id: activity.capabilityID.rawValue)
      }
      try validateUnique(
        activity.sourceBindingIDs.map(\.rawValue), path: "catalog.activity.sourceBindingIDs",
        maximum: UniversityLearningLimits.maximumSources)
      try validateUnique(
        activity.prerequisiteActivityIDs.map(\.rawValue),
        path: "catalog.activity.prerequisiteActivityIDs",
        maximum: UniversityLearningLimits.maximumPrerequisites)
      for sourceID in activity.sourceBindingIDs where !sourceIDs.contains(sourceID) {
        throw UniversityLearningError.missingReference(
          path: "catalog.activity.sourceBindingIDs", id: sourceID.rawValue)
      }
      if let claimID = activity.proofClaimID, !claimIDs.contains(claimID) {
        throw UniversityLearningError.missingReference(
          path: "catalog.activity.proofClaimID", id: claimID.rawValue)
      }
      for prerequisiteID in activity.prerequisiteActivityIDs {
        guard let prerequisite = activityByID[prerequisiteID] else {
          throw UniversityLearningError.missingReference(
            path: "catalog.activity.prerequisiteActivityIDs", id: prerequisiteID.rawValue)
        }
        guard prerequisite.kind == .practice, prerequisite.courseID == courseID,
          prerequisite.capabilityID == activity.capabilityID
        else {
          throw UniversityLearningError.invalidCatalog(
            path: "catalog.activity.prerequisiteActivityIDs",
            reason: "Proof prerequisites must be same-capability practice activities.")
        }
      }
      switch activity.kind {
      case .practice:
        guard activity.proofClaimID == nil, activity.prerequisiteActivityIDs.isEmpty else {
          throw UniversityLearningError.invalidCatalog(
            path: "catalog.activity.\(activity.id.rawValue)",
            reason: "Practice activities cannot have a proof claim or prerequisites.")
        }
        guard activity.returnPolicy == nil else {
          throw UniversityLearningError.invalidCatalog(
            path: "catalog.activity.returnPolicy",
            reason: "Only proof activities may have a return policy.")
        }
      case .proof:
        guard activity.proofClaimID != nil, !activity.prerequisiteActivityIDs.isEmpty else {
          throw UniversityLearningError.invalidCatalog(
            path: "catalog.activity.\(activity.id.rawValue)",
            reason: "Proof activities need a claim and exact prerequisites.")
        }
        guard let policy = activity.returnPolicy else {
          throw UniversityLearningError.invalidCatalog(
            path: "catalog.activity.returnPolicy",
            reason: "Every proof activity needs a return policy.")
        }
        try requireProofBoundary(activity)
        try policy.validate()
        guard let target = activityByID[policy.delayedReturnActivityID],
          target.kind == .delayedReturn, target.courseID == activity.courseID,
          target.capabilityID == activity.capabilityID,
          target.taskFamilyID != activity.taskFamilyID
        else {
          throw UniversityLearningError.invalidCatalog(
            path: "catalog.activity.returnPolicy",
            reason: "A delayed return needs the same capability and a different task family.")
        }
      case .delayedReturn:
        guard activity.proofClaimID != nil, activity.prerequisiteActivityIDs.isEmpty else {
          throw UniversityLearningError.invalidCatalog(
            path: "catalog.activity.\(activity.id.rawValue)",
            reason: "Delayed return activities need a claim and no prerequisites.")
        }
        guard activity.returnPolicy == nil else {
          throw UniversityLearningError.invalidCatalog(
            path: "catalog.activity.returnPolicy",
            reason: "Only proof activities may have a return policy.")
        }
        try requireProofBoundary(activity)
      }
    }
    guard Set(activities.compactMap(\.proofClaimID)) == claimIDs else {
      throw UniversityLearningError.invalidCatalog(
        path: "catalog.proofClaimIDs", reason: "Proof claim IDs must match activity bindings.")
    }
  }

  private enum CodingKeys: String, CodingKey {
    case catalogReleaseID, package, courseID, capabilities, activities
    case sourceBindings, proofClaimIDs, limitations
  }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    try self.init(
      catalogReleaseID: c.decode(CatalogReleaseID.self, forKey: .catalogReleaseID),
      package: c.decode(CatalogPackageIdentity.self, forKey: .package),
      courseID: c.decode(CourseID.self, forKey: .courseID),
      capabilities: c.decode([CatalogCapability].self, forKey: .capabilities),
      activities: c.decode([CatalogActivity].self, forKey: .activities),
      sourceBindings: c.decode([SourceBinding].self, forKey: .sourceBindings),
      proofClaimIDs: c.decode([ProofClaimID].self, forKey: .proofClaimIDs),
      limitations: c.decode([CatalogLimitation].self, forKey: .limitations))
  }
}

public struct LocalActivityProgress: Codable, Equatable, Sendable {
  public let courseID: CourseID, activityID: ActivityID, capabilityID: CapabilityID
  public let attempts: Int, lastResult: ValidatorResult?, lastRecordedAt: Date

  internal init(
    courseID: CourseID, activityID: ActivityID, capabilityID: CapabilityID,
    attempts: Int, lastResult: ValidatorResult?, lastRecordedAt: Date
  ) throws {
    guard attempts > 0 else {
      throw UniversityLearningError.invalidState(
        path: "progress.attempts", reason: "Attempts must be positive.")
    }
    try validateDate(lastRecordedAt, path: "progress.lastRecordedAt")
    self.courseID = courseID
    self.activityID = activityID
    self.capabilityID = capabilityID
    self.attempts = attempts
    self.lastResult = lastResult
    self.lastRecordedAt = lastRecordedAt
  }
}

public struct AssistanceRequest: Equatable, Sendable {
  public let id: AssistanceID, kind: AssistanceKind, aiAction: AIAction
  public let retrievalMode: RetrievalMode, modelIdentityRequirement: ModelIdentityRequirement
  public let preservesConstruct: Bool

  public init(
    id: AssistanceID, kind: AssistanceKind, aiAction: AIAction,
    retrievalMode: RetrievalMode, modelIdentityRequirement: ModelIdentityRequirement,
    preservesConstruct: Bool
  ) throws {
    self.id = id
    self.kind = kind
    self.aiAction = aiAction
    self.retrievalMode = retrievalMode
    self.modelIdentityRequirement = modelIdentityRequirement
    self.preservesConstruct = preservesConstruct
    if kind == .accessAccommodation
      && (aiAction != .none || retrievalMode != .none || modelIdentityRequirement != .none
        || !preservesConstruct)
    {
      throw UniversityLearningError.invalidAssistance(
        path: "assistanceRequest",
        reason: "Access accommodation must preserve the construct and use no AI.")
    }
  }
}

public struct AssistanceFact: Codable, Equatable, Sendable {
  public let id: AssistanceID, courseID: CourseID, activityID: ActivityID
  public let kind: AssistanceKind, aiAction: AIAction, retrievalMode: RetrievalMode
  public let modelIdentityRequirement: ModelIdentityRequirement, preservesConstruct: Bool
  public let recordedAt: Date

  internal init(
    id: AssistanceID, courseID: CourseID, activityID: ActivityID, kind: AssistanceKind,
    aiAction: AIAction, retrievalMode: RetrievalMode,
    modelIdentityRequirement: ModelIdentityRequirement, preservesConstruct: Bool,
    recordedAt: Date
  ) throws {
    self.id = id
    self.courseID = courseID
    self.activityID = activityID
    self.kind = kind
    self.aiAction = aiAction
    self.retrievalMode = retrievalMode
    self.modelIdentityRequirement = modelIdentityRequirement
    self.preservesConstruct = preservesConstruct
    self.recordedAt = recordedAt
    try validateDate(recordedAt, path: "assistance.recordedAt")
    if kind == .accessAccommodation
      && (aiAction != .none || retrievalMode != .none || modelIdentityRequirement != .none
        || !preservesConstruct)
    {
      throw UniversityLearningError.invalidAssistance(
        path: "assistance",
        reason: "Access accommodation must preserve the construct and use no AI.")
    }
  }
}

extension ActivityBoundary {
  internal func allows(_ fact: AssistanceFact) -> Bool {
    guard allowedAIActions.contains(fact.aiAction) else { return false }
    if fact.kind == .accessAccommodation {
      return allowsConstructPreservingAccess && fact.aiAction == .none
        && fact.retrievalMode == .none && fact.modelIdentityRequirement == .none
        && fact.preservesConstruct
    }
    return (fact.retrievalMode == .none || fact.retrievalMode == retrievalMode)
      && (fact.modelIdentityRequirement == .none
        || fact.modelIdentityRequirement == modelIdentityRequirement)
  }
}

public struct LocalEvidenceReceipt: Codable, Equatable, Sendable {
  public let id: EvidenceID, scope: EvidenceScope, courseID: CourseID
  public let capabilityID: CapabilityID, activityID: ActivityID, activityKind: ActivityKind
  public let taskFamilyID: TaskFamilyID, proofClaimID: ProofClaimID?
  public let validatorID: ValidatorID, validatorResult: ValidatorResult
  public let catalogReleaseID: CatalogReleaseID, package: CatalogPackageIdentity
  public let limitations: [CatalogLimitation], assistanceIDs: [AssistanceID]
  public let recordedAt: Date

  internal init(
    id: EvidenceID, scope: EvidenceScope, courseID: CourseID, capabilityID: CapabilityID,
    activityID: ActivityID, activityKind: ActivityKind, taskFamilyID: TaskFamilyID,
    proofClaimID: ProofClaimID?, validatorID: ValidatorID, validatorResult: ValidatorResult,
    catalogReleaseID: CatalogReleaseID, package: CatalogPackageIdentity,
    limitations: [CatalogLimitation], assistanceIDs: [AssistanceID], recordedAt: Date
  ) throws {
    guard scope == .local else {
      throw UniversityLearningError.invalidState(
        path: "evidence.scope", reason: "Evidence must be labeled local.")
    }
    self.id = id
    self.scope = scope
    self.courseID = courseID
    self.capabilityID = capabilityID
    self.activityID = activityID
    self.activityKind = activityKind
    self.taskFamilyID = taskFamilyID
    self.proofClaimID = proofClaimID
    self.validatorID = validatorID
    self.validatorResult = validatorResult
    self.catalogReleaseID = catalogReleaseID
    self.package = package
    self.limitations = limitations
    self.assistanceIDs = assistanceIDs
    self.recordedAt = recordedAt
    try validateUnique(
      limitations.map(\.id.rawValue), path: "evidence.limitations",
      maximum: UniversityLearningLimits.maximumLimitations)
    try validateUnique(
      assistanceIDs.map(\.rawValue), path: "evidence.assistanceIDs",
      maximum: UniversityLearningLimits.maximumAssistance)
    try validateDate(recordedAt, path: "evidence.recordedAt")
  }

  private enum CodingKeys: String, CodingKey {
    case id, scope, courseID, capabilityID, activityID, activityKind
    case taskFamilyID, proofClaimID, validatorID, validatorResult
    case catalogReleaseID, package, limitations, assistanceIDs, recordedAt
  }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    try self.init(
      id: c.decode(EvidenceID.self, forKey: .id),
      scope: c.decode(EvidenceScope.self, forKey: .scope),
      courseID: c.decode(CourseID.self, forKey: .courseID),
      capabilityID: c.decode(CapabilityID.self, forKey: .capabilityID),
      activityID: c.decode(ActivityID.self, forKey: .activityID),
      activityKind: c.decode(ActivityKind.self, forKey: .activityKind),
      taskFamilyID: c.decode(TaskFamilyID.self, forKey: .taskFamilyID),
      proofClaimID: c.decodeIfPresent(ProofClaimID.self, forKey: .proofClaimID),
      validatorID: c.decode(ValidatorID.self, forKey: .validatorID),
      validatorResult: c.decode(ValidatorResult.self, forKey: .validatorResult),
      catalogReleaseID: c.decode(CatalogReleaseID.self, forKey: .catalogReleaseID),
      package: c.decode(CatalogPackageIdentity.self, forKey: .package),
      limitations: c.decode([CatalogLimitation].self, forKey: .limitations),
      assistanceIDs: c.decode([AssistanceID].self, forKey: .assistanceIDs),
      recordedAt: c.decode(Date.self, forKey: .recordedAt))
  }
}

public enum DelayedReturnStatus: String, Codable, Equatable, Sendable {
  case scheduled, open, due, expired, completed
}

public struct DelayedReturnRecord: Codable, Equatable, Sendable {
  public let id: DelayedReturnID, courseID: CourseID, activityID: ActivityID
  public let originEvidenceID: EvidenceID, opensAt: Date, dueAt: Date
  public let completedAt: Date?, completionEvidenceID: EvidenceID?

  internal init(
    id: DelayedReturnID, courseID: CourseID, activityID: ActivityID,
    originEvidenceID: EvidenceID, opensAt: Date, dueAt: Date,
    completedAt: Date?, completionEvidenceID: EvidenceID?
  ) throws {
    guard opensAt < dueAt else {
      throw UniversityLearningError.invalidDateOrder(path: "delayedReturn")
    }
    guard (completedAt == nil) == (completionEvidenceID == nil) else {
      throw UniversityLearningError.invalidState(
        path: "delayedReturn.completionEvidenceID",
        reason: "Completion evidence is required exactly when completion is recorded.")
    }
    try validateDate(opensAt, path: "delayedReturn.opensAt")
    try validateDate(dueAt, path: "delayedReturn.dueAt")
    if let completedAt { try validateDate(completedAt, path: "delayedReturn.completedAt") }
    self.id = id
    self.courseID = courseID
    self.activityID = activityID
    self.originEvidenceID = originEvidenceID
    self.opensAt = opensAt
    self.dueAt = dueAt
    self.completedAt = completedAt
    self.completionEvidenceID = completionEvidenceID
  }

  public func status(at now: Date) -> DelayedReturnStatus {
    if completedAt != nil { return .completed }
    if now < opensAt { return .scheduled }
    if now == dueAt { return .due }
    if now > dueAt { return .expired }
    return .open
  }

  private enum CodingKeys: String, CodingKey {
    case id, courseID, activityID, originEvidenceID, opensAt, dueAt
    case completedAt, completionEvidenceID
  }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    try self.init(
      id: c.decode(DelayedReturnID.self, forKey: .id),
      courseID: c.decode(CourseID.self, forKey: .courseID),
      activityID: c.decode(ActivityID.self, forKey: .activityID),
      originEvidenceID: c.decode(EvidenceID.self, forKey: .originEvidenceID),
      opensAt: c.decode(Date.self, forKey: .opensAt),
      dueAt: c.decode(Date.self, forKey: .dueAt),
      completedAt: c.decodeIfPresent(Date.self, forKey: .completedAt),
      completionEvidenceID: c.decodeIfPresent(EvidenceID.self, forKey: .completionEvidenceID))
  }
}

public struct LocalLearnerState: Codable, Equatable, Sendable, UniversityLearningValidating {
  public let activeCourseID: CourseID, activeActivityID: ActivityID
  public let progress: [LocalActivityProgress], assistance: [AssistanceFact]
  public let evidence: [LocalEvidenceReceipt], delayedReturns: [DelayedReturnRecord]
  public let updatedAt: Date

  public init(
    activeCourseID: CourseID, activeActivityID: ActivityID,
    progress: [LocalActivityProgress], assistance: [AssistanceFact],
    evidence: [LocalEvidenceReceipt], delayedReturns: [DelayedReturnRecord], updatedAt: Date
  ) throws {
    self.activeCourseID = activeCourseID
    self.activeActivityID = activeActivityID
    self.progress = progress
    self.assistance = assistance
    self.evidence = evidence
    self.delayedReturns = delayedReturns
    self.updatedAt = updatedAt
    try validate()
  }

  public func validate() throws {
    try validateUnique(
      progress.map(\.activityID.rawValue), path: "state.progress",
      maximum: UniversityLearningLimits.maximumProgress)
    try validateUnique(
      assistance.map(\.id.rawValue), path: "state.assistance",
      maximum: UniversityLearningLimits.maximumAssistance)
    try validateUnique(
      evidence.map(\.id.rawValue), path: "state.evidence",
      maximum: UniversityLearningLimits.maximumEvidence)
    try validateUnique(
      delayedReturns.map(\.id.rawValue), path: "state.delayedReturns",
      maximum: UniversityLearningLimits.maximumReturns)
    try validateDate(updatedAt, path: "state.updatedAt")
    for item in progress {
      guard item.attempts > 0 else {
        throw UniversityLearningError.invalidState(
          path: "state.progress.attempts", reason: "Attempts must be positive.")
      }
      guard item.attempts <= UniversityLearningLimits.maximumEvidence else {
        throw UniversityLearningError.invalidState(
          path: "state.progress.attempts", reason: "Attempts exceed the evidence limit.")
      }
      guard item.lastResult != nil else {
        throw UniversityLearningError.invalidState(
          path: "state.progress.lastResult", reason: "Progress must have a last result.")
      }
      try validateDate(item.lastRecordedAt, path: "state.progress.lastRecordedAt")
      guard item.lastRecordedAt <= updatedAt else {
        throw UniversityLearningError.invalidState(
          path: "state.progress.lastRecordedAt",
          reason: "Progress facts cannot be after state.updatedAt.")
      }
      try requireCourse(item.courseID, expected: activeCourseID, path: "state.progress.courseID")
    }
    for item in assistance {
      try validateDate(item.recordedAt, path: "state.assistance.recordedAt")
      guard item.recordedAt <= updatedAt else {
        throw UniversityLearningError.invalidState(
          path: "state.assistance.recordedAt",
          reason: "Assistance facts cannot be after state.updatedAt.")
      }
      try requireCourse(item.courseID, expected: activeCourseID, path: "state.assistance.courseID")
      if item.kind == .accessAccommodation
        && (item.aiAction != .none || item.retrievalMode != .none
          || item.modelIdentityRequirement != .none || !item.preservesConstruct)
      {
        throw UniversityLearningError.invalidAssistance(
          path: "state.assistance", reason: "Access accommodation must preserve the construct.")
      }
    }
    for item in evidence {
      guard item.scope == .local else {
        throw UniversityLearningError.invalidState(
          path: "state.evidence.scope", reason: "Evidence must be labeled local.")
      }
      try requireCourse(item.courseID, expected: activeCourseID, path: "state.evidence.courseID")
      guard item.recordedAt <= updatedAt else {
        throw UniversityLearningError.invalidState(
          path: "state.evidence.recordedAt",
          reason: "Evidence facts cannot be after state.updatedAt.")
      }
    }
    let evidenceIDs = Set(evidence.map(\.id))
    for item in delayedReturns {
      guard item.opensAt < item.dueAt else {
        throw UniversityLearningError.invalidState(
          path: "state.delayedReturns", reason: "Return facts are invalid.")
      }
      try requireCourse(
        item.courseID, expected: activeCourseID, path: "state.delayedReturns.courseID")
      try validateDate(item.opensAt, path: "state.delayedReturns.opensAt")
      try validateDate(item.dueAt, path: "state.delayedReturns.dueAt")
      if let completedAt = item.completedAt {
        try validateDate(completedAt, path: "state.delayedReturns.completedAt")
        guard completedAt <= updatedAt else {
          throw UniversityLearningError.invalidState(
            path: "state.delayedReturns.completedAt",
            reason: "Completion facts cannot be after state.updatedAt.")
        }
      }
      guard (item.completedAt == nil) == (item.completionEvidenceID == nil) else {
        throw UniversityLearningError.invalidState(
          path: "state.delayedReturns.\(item.id.rawValue).completionEvidenceID",
          reason: "Completion evidence is required exactly when completion is recorded.")
      }
      guard evidenceIDs.contains(item.originEvidenceID) else {
        throw UniversityLearningError.missingReference(
          path: "state.delayedReturns.originEvidenceID", id: item.originEvidenceID.rawValue)
      }
      if let completionEvidenceID = item.completionEvidenceID {
        guard evidenceIDs.contains(completionEvidenceID) else {
          throw UniversityLearningError.missingReference(
            path: "state.delayedReturns.completionEvidenceID", id: completionEvidenceID.rawValue)
        }
      }
    }
  }

  public func validate(against catalog: ReleasedCatalogSnapshot) throws {
    try validate()
    try requireCourse(activeCourseID, expected: catalog.courseID, path: "state.activeCourseID")
    let activities = Dictionary(uniqueKeysWithValues: catalog.activities.map { ($0.id, $0) })
    guard let active = activities[activeActivityID] else {
      throw UniversityLearningError.missingReference(
        path: "state.activeActivityID", id: activeActivityID.rawValue)
    }
    try requireCourse(
      active.courseID, expected: activeCourseID, path: "state.activeActivityID.courseID")
    for item in progress {
      guard let activity = activities[item.activityID] else {
        throw UniversityLearningError.missingReference(
          path: "state.progress.activityID", id: item.activityID.rawValue)
      }
      guard item.capabilityID == activity.capabilityID else {
        throw UniversityLearningError.invalidState(
          path: "state.progress.capabilityID", reason: "Progress does not match the catalog.")
      }
    }
    for item in assistance {
      guard let activity = activities[item.activityID], activity.courseID == item.courseID else {
        throw UniversityLearningError.missingReference(
          path: "state.assistance.activityID", id: item.activityID.rawValue)
      }
      let proofActivity = activity.kind == .proof || activity.kind == .delayedReturn
      guard
        (!proofActivity || item.kind == .accessAccommodation)
          && activity.aiBoundary.allows(item)
      else {
        throw UniversityLearningError.invalidState(
          path: "state.assistance.\(item.id.rawValue)",
          reason: "Assistance does not match the activity boundary.")
      }
    }
    for receipt in evidence {
      guard let activity = activities[receipt.activityID] else {
        throw UniversityLearningError.missingReference(
          path: "state.evidence.activityID", id: receipt.activityID.rawValue)
      }
      guard receipt.activityKind == activity.kind,
        receipt.courseID == catalog.courseID,
        receipt.capabilityID == activity.capabilityID,
        receipt.taskFamilyID == activity.taskFamilyID,
        receipt.validatorID == activity.validatorID,
        receipt.proofClaimID == activity.proofClaimID,
        receipt.catalogReleaseID == catalog.catalogReleaseID,
        receipt.package == catalog.package,
        receipt.limitations == catalog.limitations
      else {
        throw UniversityLearningError.invalidState(
          path: "state.evidence.\(receipt.id.rawValue)",
          reason: "Receipt bindings do not match the catalog.")
      }
    }
    let assistanceByID = Dictionary(uniqueKeysWithValues: assistance.map { ($0.id, $0) })
    for receipt in evidence {
      for assistanceID in receipt.assistanceIDs {
        guard let fact = assistanceByID[assistanceID], fact.courseID == receipt.courseID,
          fact.activityID == receipt.activityID, fact.recordedAt <= receipt.recordedAt
        else {
          throw UniversityLearningError.invalidState(
            path: "state.evidence.\(receipt.id.rawValue).assistanceIDs",
            reason: "Receipt assistance bindings do not match local facts.")
        }
      }
    }
    let receiptsByActivity = Dictionary(grouping: evidence, by: \.activityID)
    for item in progress {
      guard let receipts = receiptsByActivity[item.activityID], receipts.count == item.attempts,
        receipts.allSatisfy({ $0.capabilityID == item.capabilityID })
      else {
        throw UniversityLearningError.invalidState(
          path: "state.progress.\(item.activityID.rawValue).evidence",
          reason: "Progress attempts must match local evidence.")
      }
      guard
        let latest = receipts.enumerated().max(by: {
          $0.element.recordedAt == $1.element.recordedAt
            ? $0.offset < $1.offset : $0.element.recordedAt < $1.element.recordedAt
        })?.element,
        item.lastRecordedAt == latest.recordedAt, item.lastResult == latest.validatorResult
      else {
        throw UniversityLearningError.invalidState(
          path: "state.progress.\(item.activityID.rawValue)",
          reason: "Progress must match the latest local evidence.")
      }
    }
    let evidenceByID = Dictionary(uniqueKeysWithValues: evidence.map { ($0.id, $0) })
    for receipt in evidence where receipt.activityKind == .proof {
      guard let proof = activities[receipt.activityID] else { continue }
      for prerequisiteID in proof.prerequisiteActivityIDs {
        guard
          evidence.contains(where: {
            $0.activityKind == .practice && $0.activityID == prerequisiteID
              && $0.capabilityID == proof.capabilityID && $0.validatorResult == .demonstrated
              && $0.recordedAt < receipt.recordedAt
          })
        else {
          throw UniversityLearningError.invalidState(
            path: "state.evidence.\(receipt.id.rawValue).prerequisiteActivityIDs",
            reason: "Proof prerequisites must be demonstrated strictly earlier.")
        }
      }
    }
    for item in delayedReturns {
      guard let activity = activities[item.activityID], activity.kind == .delayedReturn,
        activity.courseID == item.courseID
      else {
        throw UniversityLearningError.missingReference(
          path: "state.delayedReturns.activityID", id: item.activityID.rawValue)
      }
      guard let origin = evidenceByID[item.originEvidenceID],
        origin.courseID == item.courseID, origin.activityKind == .proof,
        let proof = activities[origin.activityID], proof.kind == .proof,
        origin.validatorResult == .demonstrated,
        let policy = proof.returnPolicy, policy.delayedReturnActivityID == item.activityID,
        item.opensAt == origin.recordedAt.addingTimeInterval(policy.openDelay),
        item.dueAt == item.opensAt.addingTimeInterval(policy.dueWindow)
      else {
        throw UniversityLearningError.invalidState(
          path: "state.delayedReturns.\(item.id.rawValue)",
          reason: "Return facts do not match the catalog.")
      }
      if let completedAt = item.completedAt,
        !(item.opensAt...item.dueAt).contains(completedAt)
      {
        throw UniversityLearningError.invalidState(
          path: "state.delayedReturns.\(item.id.rawValue).completedAt",
          reason: "Completion must be within the return window.")
      }
      if let completedAt = item.completedAt, let completionEvidenceID = item.completionEvidenceID {
        guard let completion = evidenceByID[completionEvidenceID],
          completion.courseID == item.courseID,
          completion.activityID == item.activityID,
          completion.activityKind == .delayedReturn,
          completion.capabilityID == activity.capabilityID,
          completion.taskFamilyID == activity.taskFamilyID,
          completion.proofClaimID == activity.proofClaimID,
          completion.validatorID == activity.validatorID,
          completion.validatorResult == .demonstrated,
          completion.catalogReleaseID == catalog.catalogReleaseID,
          completion.package == catalog.package,
          completion.limitations == catalog.limitations,
          completion.recordedAt == completedAt
        else {
          throw UniversityLearningError.invalidState(
            path: "state.delayedReturns.\(item.id.rawValue).completionEvidenceID",
            reason: "Completion evidence does not match the delayed return.")
        }
      }
    }
  }

  private enum CodingKeys: String, CodingKey {
    case activeCourseID, activeActivityID, progress, assistance, evidence, delayedReturns, updatedAt
  }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    try self.init(
      activeCourseID: c.decode(CourseID.self, forKey: .activeCourseID),
      activeActivityID: c.decode(ActivityID.self, forKey: .activeActivityID),
      progress: c.decode([LocalActivityProgress].self, forKey: .progress),
      assistance: c.decode([AssistanceFact].self, forKey: .assistance),
      evidence: c.decode([LocalEvidenceReceipt].self, forKey: .evidence),
      delayedReturns: c.decode([DelayedReturnRecord].self, forKey: .delayedReturns),
      updatedAt: c.decode(Date.self, forKey: .updatedAt))
  }
}

public struct LearnerSubmission: Equatable, Sendable {
  public let activityID: ActivityID, evidenceID: EvidenceID, selectedChoice: String
  public let responseText: String, delayedReturnID: DelayedReturnID?
  public let assistance: [AssistanceRequest]

  public init(
    activityID: ActivityID, evidenceID: EvidenceID, selectedChoice: String,
    responseText: String, delayedReturnID: DelayedReturnID?, assistance: [AssistanceRequest]
  ) throws {
    self.activityID = activityID
    self.evidenceID = evidenceID
    self.selectedChoice = try validatedText(
      selectedChoice, path: "submission.selectedChoice",
      maximumBytes: UniversityLearningLimits.maximumShortTextBytes)
    self.responseText = try validatedText(
      responseText, path: "submission.responseText",
      maximumBytes: UniversityLearningLimits.maximumResponseBytes)
    self.delayedReturnID = delayedReturnID
    self.assistance = assistance
    try validateUnique(
      assistance.map(\.id.rawValue), path: "submission.assistance",
      maximum: UniversityLearningLimits.maximumAssistance)
  }
}

public protocol UniversityLearningValidating: Decodable {
  func validate() throws
}

public enum UniversityLearningData {
  public static func decode<T: UniversityLearningValidating>(
    _ type: T.Type, from data: Data
  ) throws -> T {
    guard data.count <= UniversityLearningLimits.maximumDecodeBytes else {
      throw UniversityLearningError.dataTooLarge(
        maximumBytes: UniversityLearningLimits.maximumDecodeBytes, actualBytes: data.count)
    }
    let rawValue = try BoundedJSONPreflight.validate(type, data: data)
    let value = try JSONDecoder().decode(type, from: data)
    try value.validate()
    try BoundedJSONPreflight.verifyCanonicalEncoding(value, matches: rawValue)
    return value
  }
}

public struct ValidatorRegistry: Equatable, Sendable {
  public init() {}

  public func result(for validatorID: ValidatorID, selectedChoice: String) -> ValidatorResult {
    switch validatorID {
    case .forceMotionTransferV1:
      return selectedChoice == "stays_constant_after_force" ? .demonstrated : .notDemonstrated
    case .forceMotionDelayedReturnV1:
      return selectedChoice == "constant_positive_velocity" ? .demonstrated : .notDemonstrated
    }
  }
}

internal func validateDate(_ value: Date, path: String) throws {
  guard value.timeIntervalSinceReferenceDate.isFinite else {
    throw UniversityLearningError.invalidDate(path: path)
  }
}

internal func validateUnique(_ values: [String], path: String, maximum: Int) throws {
  guard values.count <= maximum else {
    throw UniversityLearningError.arrayTooLarge(path: path, maximum: maximum)
  }
  var seen = Set<String>()
  for value in values where !seen.insert(value).inserted {
    throw UniversityLearningError.duplicateID(path: path, id: value)
  }
}

private func universityIsHexByte(_ byte: UInt8) -> Bool {
  (48...57).contains(byte) || (65...70).contains(byte) || (97...102).contains(byte)
}

private func universityIsIdentifierByte(_ byte: UInt8) -> Bool {
  universityIsASCIIAlphaNumeric(byte) || byte == 46 || byte == 45 || byte == 95
}

private func universityIsASCIIAlphaNumeric(_ byte: UInt8) -> Bool {
  (48...57).contains(byte) || (65...90).contains(byte) || (97...122).contains(byte)
}

private func validatedText(_ value: String, path: String, maximumBytes: Int) throws -> String {
  guard !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
    throw UniversityLearningError.blankValue(path: path)
  }
  guard value.utf8.count <= maximumBytes else {
    throw UniversityLearningError.textTooLong(path: path, maximumBytes: maximumBytes)
  }
  return value
}

private func validatedChoices(_ values: [String], path: String) throws -> [String] {
  guard !values.isEmpty, values.count <= UniversityLearningLimits.maximumChoices else {
    throw UniversityLearningError.arrayTooLarge(
      path: path, maximum: UniversityLearningLimits.maximumChoices)
  }
  var seen = Set<String>()
  for value in values {
    _ = try validatedText(
      value, path: "\(path).value", maximumBytes: UniversityLearningLimits.maximumShortTextBytes)
    guard seen.insert(value).inserted else {
      throw UniversityLearningError.duplicateID(path: path, id: value)
    }
  }
  return values
}

private func requireCourse(_ actual: CourseID, expected: CourseID, path: String) throws {
  guard actual == expected else {
    throw UniversityLearningError.crossCourseReference(
      path: path, expected: expected.rawValue, actual: actual.rawValue)
  }
}

private func requireProofBoundary(_ activity: CatalogActivity) throws {
  guard activity.aiBoundary.allowedAIActions == [.none],
    activity.aiBoundary.retrievalMode == .none,
    activity.aiBoundary.modelIdentityRequirement == .none
  else {
    throw UniversityLearningError.invalidCatalog(
      path: "activity.\(activity.id.rawValue).aiBoundary",
      reason: "Proof boundaries must disable AI and retrieval.")
  }
}
