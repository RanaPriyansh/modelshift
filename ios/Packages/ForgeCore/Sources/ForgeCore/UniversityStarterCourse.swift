import Foundation

public enum UniversityStarterCourse {
  public static let courseTitle = "Mechanics: Force and motion"
  public static let courseSummary = "A local-only adult starter course for force and motion."
  private static let pinnedPackageDigestHex =
    "cfd71c2bd907def9b472c0d45f5b206d9725cdb2ba148a9d9d2f85287d656cf6"

  public static func choiceLabel(for choice: String) -> String {
    switch choice {
    case "stays_constant_after_force":
      "Velocity stays constant after the force is removed."
    case "changes_direction":
      "Velocity changes direction after the force is removed."
    case "constant_positive_velocity":
      "Velocity remains constant and positive."
    case "increasing_velocity":
      "Velocity continues to increase."
    default:
      "No choice label is available."
    }
  }

  public static func catalog() throws -> ReleasedCatalogSnapshot {
    let placeholderDigest = try SHA256Digest(hex: String(repeating: "0", count: 64))
    let unsignedCatalog = try makeCatalog(packageDigest: placeholderDigest)
    let digest = packageDigest(for: unsignedCatalog)
    guard digest.hex == pinnedPackageDigestHex else {
      throw UniversityLearningError.invalidCatalog(
        path: "starterCourse.packageDigest",
        reason: "The starter course package digest does not match the pinned digest."
      )
    }

    return try makeCatalog(packageDigest: digest)
  }

  public static func initialState(updatedAt: Date) throws -> LocalLearnerState {
    guard updatedAt.timeIntervalSinceReferenceDate.isFinite else {
      throw UniversityLearningError.invalidDate(path: "starterCourse.initialState.updatedAt")
    }

    let starterCatalog = try catalog()
    guard let practice = starterCatalog.activities.first(where: { $0.kind == .practice }) else {
      throw UniversityLearningError.activityNotFound(id: "starter-course.practice")
    }

    return try LocalLearnerState(
      activeCourseID: starterCatalog.courseID,
      activeActivityID: practice.id,
      progress: [],
      assistance: [],
      evidence: [],
      delayedReturns: [],
      updatedAt: updatedAt
    )
  }

  static func packageDigest(for catalog: ReleasedCatalogSnapshot) -> SHA256Digest {
    SHA256Digest(data: canonicalPackageManifest(for: catalog))
  }

  private static func makeCatalog(packageDigest: SHA256Digest) throws -> ReleasedCatalogSnapshot {
    let courseID = try CourseID("course.adult-mechanics.force-motion.v1")
    let sourceBindingID = try SourceBindingID("source.adult-mechanics.local-starter")
    let capabilityID = try CapabilityID("capability.adult-mechanics.force-motion")
    let practiceID = try ActivityID("activity.adult-mechanics.force-motion.practice")
    let proofID = try ActivityID("activity.adult-mechanics.force-motion.proof")
    let delayedReturnID = try ActivityID(
      "activity.adult-mechanics.force-motion.delayed-return"
    )
    let proofClaimID = try ProofClaimID("claim.adult-mechanics.force-motion.proof")
    let delayedReturnClaimID = try ProofClaimID(
      "claim.adult-mechanics.force-motion.delayed-return"
    )
    let protectedBoundary = ActivityBoundary(
      allowedAIActions: [.none],
      retrievalMode: .none,
      modelIdentityRequirement: .none,
      allowsConstructPreservingAccess: true
    )
    let sourceBinding = try SourceBinding(
      id: sourceBindingID,
      courseID: courseID,
      title: "Local-only starter mechanics source. Incomplete provenance.",
      provenance: .provenanceIncomplete
    )
    let capability = try CatalogCapability(
      id: capabilityID,
      courseID: courseID,
      title: courseTitle,
      sourceBindingIDs: [sourceBindingID]
    )
    let practice = try CatalogActivity(
      id: practiceID,
      courseID: courseID,
      capabilityID: capabilityID,
      taskFamilyID: try TaskFamilyID("task-family.adult-mechanics.force-motion.practice"),
      kind: .practice,
      prompt: "On a frictionless surface, during the interval after a constant force is removed, "
        + "which velocity result follows?",
      choices: ["stays_constant_after_force", "changes_direction"],
      sourceBindingIDs: [sourceBindingID],
      proofClaimID: nil,
      validatorID: .forceMotionTransferV1,
      prerequisiteActivityIDs: [],
      aiBoundary: protectedBoundary,
      returnPolicy: nil
    )
    let proof = try CatalogActivity(
      id: proofID,
      courseID: courseID,
      capabilityID: capabilityID,
      taskFamilyID: try TaskFamilyID("task-family.adult-mechanics.force-motion.proof"),
      kind: .proof,
      prompt: "On a frictionless surface in an unfamiliar mechanics case, "
        + "during the interval after a constant force is removed, "
        + "which velocity result follows?",
      choices: ["stays_constant_after_force", "changes_direction"],
      sourceBindingIDs: [sourceBindingID],
      proofClaimID: proofClaimID,
      validatorID: .forceMotionTransferV1,
      prerequisiteActivityIDs: [practiceID],
      aiBoundary: protectedBoundary,
      returnPolicy: try ReturnPolicy(
        delayedReturnActivityID: delayedReturnID,
        openDelay: 7 * 86_400,
        dueWindow: 30 * 86_400
      )
    )
    let delayedReturn = try CatalogActivity(
      id: delayedReturnID,
      courseID: courseID,
      capabilityID: capabilityID,
      taskFamilyID: try TaskFamilyID(
        "task-family.adult-mechanics.force-motion.delayed-return"
      ),
      kind: .delayedReturn,
      prompt: "After a delay, which velocity result follows after the force stops?",
      choices: ["constant_positive_velocity", "increasing_velocity"],
      sourceBindingIDs: [sourceBindingID],
      proofClaimID: delayedReturnClaimID,
      validatorID: .forceMotionDelayedReturnV1,
      prerequisiteActivityIDs: [],
      aiBoundary: protectedBoundary,
      returnPolicy: nil
    )

    return try ReleasedCatalogSnapshot(
      catalogReleaseID: try CatalogReleaseID("catalog.adult-mechanics.local-starter.v1"),
      package: try CatalogPackageIdentity(
        packageID: try PackageID("package.forge.adult-mechanics.local-starter"),
        version: "1.0.0",
        digest: packageDigest
      ),
      courseID: courseID,
      capabilities: [capability],
      activities: [practice, proof, delayedReturn],
      sourceBindings: [sourceBinding],
      proofClaimIDs: [proofClaimID, delayedReturnClaimID],
      limitations: [
        try CatalogLimitation(
          id: try LimitationID("limitation.adult-mechanics.source-provenance"),
          kind: .provenance,
          statement: "This local-only starter course has incomplete provenance."
        ),
        try CatalogLimitation(
          id: try LimitationID("limitation.adult-mechanics.claim-boundary"),
          kind: .claimBoundary,
          statement: "This starter course has no university authority and makes no credential, "
            + "efficacy, mastery, retention, or outcome claim."
        ),
      ]
    )
  }

  private static func canonicalPackageManifest(for catalog: ReleasedCatalogSnapshot) -> Data {
    var encoder = CanonicalManifestEncoder()
    encoder.append("forge.university.starter-course.package-manifest.v1")

    encoder.append("catalogReleaseID")
    encoder.append(catalog.catalogReleaseID.rawValue)
    encoder.append("package.packageID")
    encoder.append(catalog.package.packageID.rawValue)
    encoder.append("package.version")
    encoder.append(catalog.package.version)
    encodeCapabilities(catalog.capabilities, into: &encoder)
    encodeActivities(catalog.activities, into: &encoder)
    encodeSourceBindings(catalog.sourceBindings, into: &encoder)
    encodeProofClaimIDs(catalog.proofClaimIDs, into: &encoder)
    encodeLimitations(catalog.limitations, into: &encoder)
    encoder.append("courseID")
    encoder.append(catalog.courseID.rawValue)

    return encoder.data
  }

  private static func encodeCapabilities(
    _ capabilities: [CatalogCapability],
    into encoder: inout CanonicalManifestEncoder
  ) {
    encoder.append("capabilities")
    encoder.append(UInt64(capabilities.count))
    for capability in capabilities {
      encoder.append("capability")
      encoder.append("id")
      encoder.append(capability.id.rawValue)
      encoder.append("courseID")
      encoder.append(capability.courseID.rawValue)
      encoder.append("title")
      encoder.append(capability.title)
      encodeSourceBindingIDs(capability.sourceBindingIDs, into: &encoder)
    }
  }

  private static func encodeActivities(
    _ activities: [CatalogActivity],
    into encoder: inout CanonicalManifestEncoder
  ) {
    encoder.append("activities")
    encoder.append(UInt64(activities.count))
    for activity in activities {
      encoder.append("activity")
      encoder.append("id")
      encoder.append(activity.id.rawValue)
      encoder.append("courseID")
      encoder.append(activity.courseID.rawValue)
      encoder.append("capabilityID")
      encoder.append(activity.capabilityID.rawValue)
      encoder.append("taskFamilyID")
      encoder.append(activity.taskFamilyID.rawValue)
      encoder.append("kind")
      encoder.append(activity.kind.rawValue)
      encoder.append("prompt")
      encoder.append(activity.prompt)
      encoder.append("choices")
      encoder.append(UInt64(activity.choices.count))
      for choice in activity.choices {
        encoder.append(choice)
      }
      encodeSourceBindingIDs(activity.sourceBindingIDs, into: &encoder)
      encoder.append("proofClaimID")
      appendOptional(activity.proofClaimID?.rawValue, into: &encoder)
      encoder.append("validatorID")
      encoder.append(activity.validatorID.rawValue)
      encodePrerequisiteActivityIDs(activity.prerequisiteActivityIDs, into: &encoder)
      encodeBoundary(activity.aiBoundary, into: &encoder)
      encodeReturnPolicy(activity.returnPolicy, into: &encoder)
    }
  }

  private static func encodeSourceBindings(
    _ sourceBindings: [SourceBinding],
    into encoder: inout CanonicalManifestEncoder
  ) {
    encoder.append("sourceBindings")
    encoder.append(UInt64(sourceBindings.count))
    for sourceBinding in sourceBindings {
      encoder.append("sourceBinding")
      encoder.append("id")
      encoder.append(sourceBinding.id.rawValue)
      encoder.append("courseID")
      encoder.append(sourceBinding.courseID.rawValue)
      encoder.append("title")
      encoder.append(sourceBinding.title)
      encoder.append("provenance")
      encoder.append(sourceBinding.provenance.rawValue)
    }
  }

  private static func encodeProofClaimIDs(
    _ proofClaimIDs: [ProofClaimID],
    into encoder: inout CanonicalManifestEncoder
  ) {
    encoder.append("proofClaimIDs")
    encoder.append(UInt64(proofClaimIDs.count))
    for proofClaimID in proofClaimIDs {
      encoder.append(proofClaimID.rawValue)
    }
  }

  private static func encodeLimitations(
    _ limitations: [CatalogLimitation],
    into encoder: inout CanonicalManifestEncoder
  ) {
    encoder.append("limitations")
    encoder.append(UInt64(limitations.count))
    for limitation in limitations {
      encoder.append("limitation")
      encoder.append("id")
      encoder.append(limitation.id.rawValue)
      encoder.append("kind")
      encoder.append(limitation.kind.rawValue)
      encoder.append("statement")
      encoder.append(limitation.statement)
    }
  }

  private static func encodeSourceBindingIDs(
    _ sourceBindingIDs: [SourceBindingID],
    into encoder: inout CanonicalManifestEncoder
  ) {
    encoder.append("sourceBindingIDs")
    encoder.append(UInt64(sourceBindingIDs.count))
    for sourceBindingID in sourceBindingIDs {
      encoder.append(sourceBindingID.rawValue)
    }
  }

  private static func encodePrerequisiteActivityIDs(
    _ prerequisiteActivityIDs: [ActivityID],
    into encoder: inout CanonicalManifestEncoder
  ) {
    encoder.append("prerequisiteActivityIDs")
    encoder.append(UInt64(prerequisiteActivityIDs.count))
    for prerequisiteActivityID in prerequisiteActivityIDs {
      encoder.append(prerequisiteActivityID.rawValue)
    }
  }

  private static func encodeBoundary(
    _ boundary: ActivityBoundary,
    into encoder: inout CanonicalManifestEncoder
  ) {
    encoder.append("aiBoundary")
    encoder.append("allowedAIActions")
    let actions = boundary.allowedAIActions.map(\.rawValue).sorted()
    encoder.append(UInt64(actions.count))
    for action in actions {
      encoder.append(action)
    }
    encoder.append("retrievalMode")
    encoder.append(boundary.retrievalMode.rawValue)
    encoder.append("modelIdentityRequirement")
    encoder.append(boundary.modelIdentityRequirement.rawValue)
    encoder.append("allowsConstructPreservingAccess")
    encoder.append(boundary.allowsConstructPreservingAccess)
  }

  private static func encodeReturnPolicy(
    _ returnPolicy: ReturnPolicy?,
    into encoder: inout CanonicalManifestEncoder
  ) {
    encoder.append("returnPolicy")
    encoder.append(returnPolicy != nil)
    guard let returnPolicy else {
      return
    }

    encoder.append("delayedReturnActivityID")
    encoder.append(returnPolicy.delayedReturnActivityID.rawValue)
    encoder.append("openDelay")
    encoder.append(returnPolicy.openDelay)
    encoder.append("dueWindow")
    encoder.append(returnPolicy.dueWindow)
  }

  private static func appendOptional(
    _ value: String?,
    into encoder: inout CanonicalManifestEncoder
  ) {
    encoder.append(value != nil)
    if let value {
      encoder.append(value)
    }
  }
}

private struct CanonicalManifestEncoder {
  private(set) var data = Data()

  mutating func append(_ value: String) {
    appendField(Data(value.utf8))
  }

  mutating func append(_ value: Bool) {
    appendField(Data([value ? 1 : 0]))
  }

  mutating func append(_ value: UInt64) {
    var bigEndianValue = value.bigEndian
    withUnsafeBytes(of: &bigEndianValue) { bytes in
      appendField(Data(bytes))
    }
  }

  mutating func append(_ value: Double) {
    append(value.bitPattern)
  }

  private mutating func appendField(_ field: Data) {
    var length = UInt64(field.count).bigEndian
    withUnsafeBytes(of: &length) { bytes in
      data.append(contentsOf: bytes)
    }
    data.append(field)
  }
}
