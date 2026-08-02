import Foundation
import Testing

@testable import ForgeCore

struct UniversityLearningModelsTests {
  @Test
  func forceMotionFixtureStatesItsLimitsAndBindings() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    let delayedReturn = try UniversityLearningTestSupport.activity(.delayedReturn, in: catalog)

    #expect(catalog.sourceBindings.map(\.provenance) == [.provenanceIncomplete])
    #expect(catalog.limitations.map(\.kind) == [.provenance, .claimBoundary])
    #expect(proof.prerequisiteActivityIDs == [practice.id])
    #expect(proof.validatorID == .forceMotionTransferV1)
    #expect(delayedReturn.validatorID == .forceMotionDelayedReturnV1)
    #expect(proof.returnPolicy?.openDelay == 7.0 * 86_400)
    #expect(proof.returnPolicy?.dueWindow == 30.0 * 86_400)
    #expect(proof.taskFamilyID != delayedReturn.taskFamilyID)
    #expect(
      !catalog.activities.contains {
        $0.choices.contains("constant_positive_velocity") && $0.kind == .proof
      })
  }

  @Test
  func identifiersAndResponseTextUseUTF8ByteLimits() throws {
    UniversityLearningTestSupport.expectError(.blankValue(path: "learningID")) {
      _ = try CourseID(" \n")
    }
    UniversityLearningTestSupport.expectError(.invalidIdentifier(path: "learningID")) {
      _ = try ActivityID("contains whitespace")
    }
    let response = String(
      repeating: "😀", count: UniversityLearningLimits.maximumResponseBytes / 4 + 1)
    UniversityLearningTestSupport.expectError(
      .textTooLong(
        path: "submission.responseText",
        maximumBytes: UniversityLearningLimits.maximumResponseBytes)
    ) {
      _ = try LearnerSubmission(
        activityID: try ActivityID("activity.test"),
        evidenceID: try EvidenceID("evidence.test"),
        selectedChoice: "choice",
        responseText: response,
        delayedReturnID: nil,
        assistance: [])
    }
  }

  @Test
  func identifiersAllowOnlyInteriorPunctuation() throws {
    #expect(try CourseID("course_1.alpha-2").rawValue == "course_1.alpha-2")
    for value in [
      "😀", "bad/slash", "bad%percent", "bad:colon", "bad\u{0001}",
      ".leading", "-leading", "_leading", "trailing.", "trailing-", "trailing_",
    ] {
      UniversityLearningTestSupport.expectError(.invalidIdentifier(path: "learningID")) {
        _ = try CourseID(value)
      }
    }
  }

  @Test
  func boundedDecodeRejectsBeforeJSONDecoding() throws {
    let data = Data(repeating: 0x7B, count: UniversityLearningLimits.maximumDecodeBytes + 1)
    UniversityLearningTestSupport.expectError(
      .dataTooLarge(
        maximumBytes: UniversityLearningLimits.maximumDecodeBytes,
        actualBytes: data.count)
    ) {
      _ = try UniversityLearningData.decode(ReleasedCatalogSnapshot.self, from: data)
    }
  }

  @Test
  func rawRootUnknownKeysFailClosed() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let data = try UniversityLearningTestSupport.appendingRootMember(
      "\"unknown\":true",
      to: JSONEncoder().encode(catalog)
    )

    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningData.decode(ReleasedCatalogSnapshot.self, from: data)
    }
  }

  @Test
  func rawNestedUnknownKeysFailClosed() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    var object = try UniversityLearningTestSupport.catalogObject(catalog)
    var package = try #require(object["package"] as? [String: Any])
    package["unknown"] = true
    object["package"] = package
    let data = try JSONSerialization.data(withJSONObject: object)

    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningData.decode(ReleasedCatalogSnapshot.self, from: data)
    }
  }

  @Test(
    "Removed source-trust fields fail closed",
    arguments: ["catalogReleaseID", "decisionID", "digest"]
  )
  func rawRemovedSourceTrustFieldFailsClosed(member: String) throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    var object = try UniversityLearningTestSupport.catalogObject(catalog)
    var sourceBindings = try #require(object["sourceBindings"] as? [[String: Any]])
    var sourceBinding = try #require(sourceBindings.first)
    sourceBinding[member] = "fabricated"
    sourceBindings[0] = sourceBinding
    object["sourceBindings"] = sourceBindings

    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningData.decode(
        ReleasedCatalogSnapshot.self,
        from: JSONSerialization.data(withJSONObject: object)
      )
    }
  }

  @Test
  func rawReleasedSourceProvenanceFailsClosed() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    var object = try UniversityLearningTestSupport.catalogObject(catalog)
    var sourceBindings = try #require(object["sourceBindings"] as? [[String: Any]])
    var sourceBinding = try #require(sourceBindings.first)
    sourceBinding["provenance"] = "released"
    sourceBindings[0] = sourceBinding
    object["sourceBindings"] = sourceBindings

    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningData.decode(
        ReleasedCatalogSnapshot.self,
        from: JSONSerialization.data(withJSONObject: object)
      )
    }
  }

  @Test
  func rawObjectAtScalarFieldFailsBeforeJSONDecoding() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    var object = try UniversityLearningTestSupport.catalogObject(catalog)
    object["catalogReleaseID"] = ["unexpected": true]
    let data = try JSONSerialization.data(withJSONObject: object)

    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningData.decode(ReleasedCatalogSnapshot.self, from: data)
    }
  }

  @Test
  func rawArrayAtNestedScalarFieldFailsBeforeJSONDecoding() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    var object = try UniversityLearningTestSupport.catalogObject(catalog)
    var package = try #require(object["package"] as? [String: Any])
    package["version"] = ["unexpected"]
    object["package"] = package
    let data = try JSONSerialization.data(withJSONObject: object)

    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningData.decode(ReleasedCatalogSnapshot.self, from: data)
    }
  }

  @Test(
    "Raw duplicate keys fail closed",
    arguments: [
      "\"catalogReleaseID\":\"catalog.duplicate\"",
      "\"catalog\\u0052eleaseID\":\"catalog.duplicate\"",
    ]
  )
  func rawDuplicateKeysFailClosed(member: String) throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let data = try UniversityLearningTestSupport.appendingRootMember(
      member,
      to: JSONEncoder().encode(catalog)
    )

    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningData.decode(ReleasedCatalogSnapshot.self, from: data)
    }
  }

  @Test
  func rawSurrogatePairDuplicateKeysFailClosed() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let member = "\"\\uD83D\\uDE00\":1,\"😀\":2"
    let data = try UniversityLearningTestSupport.appendingRootMember(
      member,
      to: JSONEncoder().encode(catalog)
    )

    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningData.decode(ReleasedCatalogSnapshot.self, from: data)
    }
  }

  @Test(
    "Malformed JSON string escapes fail before schema validation",
    arguments: [
      #"{"catalogReleaseID":"\q"}"#,
      #"{"catalogReleaseID":"\u12"}"#,
    ]
  )
  func rawMalformedStringEscapesFailClosed(payload: String) {
    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningData.decode(
        ReleasedCatalogSnapshot.self,
        from: Data(payload.utf8)
      )
    }
  }

  @Test(
    "Malformed JSON number grammar fails before schema validation",
    arguments: [
      #"{"catalogReleaseID":1.}"#,
      #"{"catalogReleaseID":01}"#,
      #"{"catalogReleaseID":1e}"#,
    ]
  )
  func rawMalformedNumbersFailClosed(payload: String) {
    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningData.decode(
        ReleasedCatalogSnapshot.self,
        from: Data(payload.utf8)
      )
    }
  }

  @Test
  func rawTrailingBytesFailClosed() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    var data = try JSONEncoder().encode(catalog)
    data.append(contentsOf: [0x58])

    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningData.decode(ReleasedCatalogSnapshot.self, from: data)
    }
  }

  @Test
  func rawOverLimitArraysFailBeforeTypedDecoding() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    var object = try UniversityLearningTestSupport.catalogObject(catalog)
    let capability = try #require((object["capabilities"] as? [[String: Any]])?.first)
    object["capabilities"] = Array(
      repeating: capability,
      count: UniversityLearningLimits.maximumCapabilities + 1
    )
    let data = try JSONSerialization.data(withJSONObject: object)

    UniversityLearningTestSupport.expectError(
      .arrayTooLarge(
        path: "catalog.capabilities",
        maximum: UniversityLearningLimits.maximumCapabilities
      )
    ) {
      _ = try UniversityLearningData.decode(ReleasedCatalogSnapshot.self, from: data)
    }
  }

  @Test
  func rawDuplicateAllowedAIActionsFailClosed() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    var object = try UniversityLearningTestSupport.catalogObject(catalog)
    var activities = try #require(object["activities"] as? [[String: Any]])
    var activity = try #require(activities.first)
    var boundary = try #require(activity["aiBoundary"] as? [String: Any])
    boundary["allowedAIActions"] = [AIAction.none.rawValue, AIAction.none.rawValue]
    activity["aiBoundary"] = boundary
    activities[0] = activity
    object["activities"] = activities
    let data = try JSONSerialization.data(withJSONObject: object)

    UniversityLearningTestSupport.expectError(
      .duplicateID(
        path: "catalog.activity.aiBoundary.allowedAIActions",
        id: AIAction.none.rawValue
      )
    ) {
      _ = try UniversityLearningData.decode(ReleasedCatalogSnapshot.self, from: data)
    }
  }

  @Test
  func rawAllowedAIActionsUseTheFixedCaseLimit() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    var object = try UniversityLearningTestSupport.catalogObject(catalog)
    var activities = try #require(object["activities"] as? [[String: Any]])
    var activity = try #require(activities.first)
    var boundary = try #require(activity["aiBoundary"] as? [String: Any])
    boundary["allowedAIActions"] = AIAction.allCases.map(\.rawValue) + ["unknown"]
    activity["aiBoundary"] = boundary
    activities[0] = activity
    object["activities"] = activities
    let data = try JSONSerialization.data(withJSONObject: object)

    UniversityLearningTestSupport.expectError(
      .arrayTooLarge(
        path: "catalog.activity.aiBoundary.allowedAIActions",
        maximum: AIAction.allCases.count
      )
    ) {
      _ = try UniversityLearningData.decode(ReleasedCatalogSnapshot.self, from: data)
    }
  }

  @Test
  func rawExcessiveNestingFailsBeforeTypedDecoding() {
    let depth = BoundedJSONPreflight.maximumDepth
    let data = Data(
      (String(repeating: "[", count: depth) + "0" + String(repeating: "]", count: depth))
        .utf8
    )

    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningData.decode(ReleasedCatalogSnapshot.self, from: data)
    }
  }

  @Test
  func rawMaximumDepthParses() throws {
    let depth = BoundedJSONPreflight.maximumDepth - 1
    let data = Data(
      (String(repeating: "[", count: depth) + "0" + String(repeating: "]", count: depth))
        .utf8
    )

    _ = try BoundedJSONPreflight.parse(data)
  }

  @Test
  func rawExcessiveNodeCountFailsBeforeTypedDecoding() {
    let values = String(repeating: "0,", count: BoundedJSONPreflight.maximumNodeCount)
    let data = Data(("[" + values + "0]").utf8)

    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningData.decode(ReleasedCatalogSnapshot.self, from: data)
    }
  }

  @Test
  func stateRejectsCrossCourseProgress() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let otherCourse = try CourseID("course.other.v1")
    let progress = try LocalActivityProgress(
      courseID: otherCourse,
      activityID: practice.id,
      capabilityID: practice.capabilityID,
      attempts: 1,
      lastResult: .notDemonstrated,
      lastRecordedAt: UniversityLearningTestSupport.date(1))

    UniversityLearningTestSupport.expectError(
      .crossCourseReference(
        path: "state.progress.courseID",
        expected: catalog.courseID.rawValue,
        actual: otherCourse.rawValue)
    ) {
      _ = try LocalLearnerState(
        activeCourseID: catalog.courseID,
        activeActivityID: practice.id,
        progress: [progress],
        assistance: [],
        evidence: [],
        delayedReturns: [],
        updatedAt: UniversityLearningTestSupport.date(1))
    }
  }

  @Test
  func receiptDecodeRejectsNonLocalScope() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let state = try UniversityLearningTestSupport.practicedState(catalog: catalog)
    var object = try #require(
      JSONSerialization.jsonObject(
        with: JSONEncoder().encode(state), options: []) as? [String: Any])
    var receipts = try #require(object["evidence"] as? [[String: Any]])
    var receipt = try #require(receipts.first)
    receipt["scope"] = "provider"
    receipts[0] = receipt
    object["evidence"] = receipts
    let data = try JSONSerialization.data(withJSONObject: object)

    do {
      _ = try UniversityLearningData.decode(LocalLearnerState.self, from: data)
      Issue.record("Expected fabricated receipt decoding to fail")
    } catch {
      #expect(error is DecodingError)
    }
  }

  @Test
  func stateValidationRejectsFabricatedCatalogReceiptBinding() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let state = try UniversityLearningTestSupport.practicedState(catalog: catalog)
    var object = try #require(
      JSONSerialization.jsonObject(
        with: JSONEncoder().encode(state), options: []) as? [String: Any])
    var receipts = try #require(object["evidence"] as? [[String: Any]])
    var receipt = try #require(receipts.first)
    receipt["catalogReleaseID"] = "catalog.fabricated"
    receipts[0] = receipt
    object["evidence"] = receipts
    let data = try JSONSerialization.data(withJSONObject: object)
    let decoded = try UniversityLearningData.decode(LocalLearnerState.self, from: data)

    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.evidence.evidence.practice",
        reason: "Receipt bindings do not match the catalog.")
    ) {
      try decoded.validate(against: catalog)
    }
  }

  @Test
  func receiptAssistanceMustBeLocalSameActivityAndEarlier() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    let state = try UniversityLearningTestSupport.practicedState(catalog: catalog)
    let assistanceID = try AssistanceID("assistance.tampered")
    let expected = UniversityLearningError.invalidState(
      path: "state.evidence.evidence.practice.assistanceIDs",
      reason: "Receipt assistance bindings do not match local facts.")

    let missing = try UniversityLearningTestSupport.tamperedReceiptState(
      state: state, assistanceID: assistanceID, facts: [])
    UniversityLearningTestSupport.expectError(expected) {
      try missing.validate(against: catalog)
    }

    let crossActivity = try AssistanceFact(
      id: assistanceID, courseID: catalog.courseID, activityID: proof.id,
      kind: .accessAccommodation, aiAction: .none, retrievalMode: .none,
      modelIdentityRequirement: .none, preservesConstruct: true,
      recordedAt: UniversityLearningTestSupport.date(1))
    let crossActivityState = try UniversityLearningTestSupport.tamperedReceiptState(
      state: state, assistanceID: assistanceID, facts: [crossActivity])
    UniversityLearningTestSupport.expectError(expected) {
      try crossActivityState.validate(against: catalog)
    }

    let later = try AssistanceFact(
      id: assistanceID, courseID: catalog.courseID, activityID: practice.id,
      kind: .accessAccommodation, aiAction: .none, retrievalMode: .none,
      modelIdentityRequirement: .none, preservesConstruct: true,
      recordedAt: UniversityLearningTestSupport.date(2))
    let laterState = try UniversityLearningTestSupport.tamperedReceiptState(
      state: state, assistanceID: assistanceID, facts: [later],
      updatedAt: UniversityLearningTestSupport.date(2))
    UniversityLearningTestSupport.expectError(expected) {
      try laterState.validate(against: catalog)
    }
  }

  @Test
  func delayedReturnFactsRespectOriginAndInclusiveCompletionWindow() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let state = try UniversityLearningTestSupport.proofReadyState(catalog: catalog)
    let record = try #require(state.delayedReturns.first)
    let lateCompletion = try UniversityLearningTestSupport.tamperedReturnState(
      state: state, completedAt: record.dueAt.addingTimeInterval(1),
      completionEvidenceID: state.evidence.last?.id,
      updatedAt: record.dueAt.addingTimeInterval(1))
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.delayedReturns.\(record.id.rawValue).completedAt",
        reason: "Completion must be within the return window.")
    ) {
      try lateCompletion.validate(against: catalog)
    }

    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "delayedReturn.completionEvidenceID",
        reason: "Completion evidence is required exactly when completion is recorded.")
    ) {
      _ = try UniversityLearningTestSupport.tamperedReturnState(
        state: state, completedAt: nil, completionEvidenceID: state.evidence.last?.id)
    }
  }

  @Test
  func returnPoliciesAreRestrictedToProofActivities() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    let delayedReturn = try UniversityLearningTestSupport.activity(.delayedReturn, in: catalog)
    let policy = try ReturnPolicy(
      delayedReturnActivityID: delayedReturn.id, openDelay: 1, dueWindow: 1)

    let invalidPractice = try UniversityLearningTestSupport.copyActivity(
      practice, returnPolicy: policy)
    UniversityLearningTestSupport.expectError(
      .invalidCatalog(
        path: "catalog.activity.returnPolicy",
        reason: "Only proof activities may have a return policy.")
    ) {
      _ = try UniversityLearningTestSupport.catalogWithActivities(
        replacing: [invalidPractice, proof, delayedReturn])
    }

    let invalidReturn = try UniversityLearningTestSupport.copyActivity(
      delayedReturn, returnPolicy: policy)
    UniversityLearningTestSupport.expectError(
      .invalidCatalog(
        path: "catalog.activity.returnPolicy",
        reason: "Only proof activities may have a return policy.")
    ) {
      _ = try UniversityLearningTestSupport.catalogWithActivities(
        replacing: [practice, proof, invalidReturn])
    }

    let invalidProof = try UniversityLearningTestSupport.copyActivity(
      proof,
      returnPolicy: try ReturnPolicy(
        delayedReturnActivityID: practice.id, openDelay: 1, dueWindow: 1))
    UniversityLearningTestSupport.expectError(
      .invalidCatalog(
        path: "catalog.activity.returnPolicy",
        reason: "A delayed return needs the same capability and a different task family.")
    ) {
      _ = try UniversityLearningTestSupport.catalogWithActivities(
        replacing: [practice, invalidProof, delayedReturn])
    }
  }

  @Test
  func validatorRegistryIsClosedAndOwnsCorrectness() throws {
    #expect(
      ValidatorID.allCases == [
        .forceMotionTransferV1,
        .forceMotionDelayedReturnV1,
      ])
    #expect(ValidatorID(rawValue: "validator.custom.v1") == nil)
    let registry = ValidatorRegistry()
    #expect(
      registry.result(
        for: .forceMotionTransferV1,
        selectedChoice: "stays_constant_after_force") == .demonstrated)
    #expect(
      registry.result(
        for: .forceMotionDelayedReturnV1,
        selectedChoice: "constant_positive_velocity") == .demonstrated)
  }

  @Test
  func encodedReceiptsOmitResponseDerivedFields() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let secret = "raw learner response is never persisted"
    let state = try UniversityLearningTestSupport.practicedState(
      catalog: catalog, response: secret)
    let receipt = try #require(state.evidence.first)
    let persisted = String(decoding: try JSONEncoder().encode(receipt), as: UTF8.self)

    #expect(!persisted.contains(secret))
    for key in [
      "responseText",
      "selectedChoice",
      "responseDigest",
      "responseHash",
      "responseSalt",
      "responseBinding",
    ] {
      #expect(!persisted.contains("\"\(key)\""))
    }
    #expect(persisted.contains("\"scope\":\"local\""))
  }

  @Test(
    "Hostile response-derived receipt fields fail closed",
    arguments: [
      "responseText",
      "selectedChoice",
      "responseDigest",
      "responseHash",
      "responseSalt",
      "responseBinding",
    ]
  )
  func hostileResponseDerivedReceiptMemberFailsClosed(member: String) throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let state = try UniversityLearningTestSupport.practicedState(catalog: catalog)
    var object = try UniversityLearningTestSupport.stateObject(state)
    var receipts = try #require(object["evidence"] as? [[String: Any]])
    var receipt = try #require(receipts.first)
    receipt[member] = "hostile"
    receipts[0] = receipt
    object["evidence"] = receipts

    #expect(throws: DecodingError.self) {
      _ = try UniversityLearningTestSupport.decodeState(object)
    }
  }

  @Test
  func decodedCatalogReappliesNestedBoundsAndDuplicateChecks() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let sourceID = try #require(catalog.sourceBindings.first?.id.rawValue)
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)

    var oversizedCapability = try UniversityLearningTestSupport.catalogObject(catalog)
    var capabilities = try #require(oversizedCapability["capabilities"] as? [[String: Any]])
    var capability = try #require(capabilities.first)
    capability["sourceBindingIDs"] = Array(
      repeating: sourceID, count: UniversityLearningLimits.maximumSources + 1)
    capabilities[0] = capability
    oversizedCapability["capabilities"] = capabilities
    UniversityLearningTestSupport.expectError(
      .arrayTooLarge(
        path: "catalog.capability.sourceBindingIDs",
        maximum: UniversityLearningLimits.maximumSources)
    ) {
      _ = try UniversityLearningTestSupport.decodeCatalog(oversizedCapability)
    }

    var duplicateCapability = try UniversityLearningTestSupport.catalogObject(catalog)
    capabilities = try #require(duplicateCapability["capabilities"] as? [[String: Any]])
    capability = try #require(capabilities.first)
    capability["sourceBindingIDs"] = [sourceID, sourceID]
    capabilities[0] = capability
    duplicateCapability["capabilities"] = capabilities
    UniversityLearningTestSupport.expectError(
      .duplicateID(path: "catalog.capability.sourceBindingIDs", id: sourceID)
    ) {
      _ = try UniversityLearningTestSupport.decodeCatalog(duplicateCapability)
    }

    var duplicateActivitySource = try UniversityLearningTestSupport.catalogObject(catalog)
    var activities = try #require(duplicateActivitySource["activities"] as? [[String: Any]])
    var activity = try #require(activities.first)
    activity["sourceBindingIDs"] = [sourceID, sourceID]
    activities[0] = activity
    duplicateActivitySource["activities"] = activities
    UniversityLearningTestSupport.expectError(
      .duplicateID(path: "catalog.activity.sourceBindingIDs", id: sourceID)
    ) {
      _ = try UniversityLearningTestSupport.decodeCatalog(duplicateActivitySource)
    }

    var duplicatePrerequisites = try UniversityLearningTestSupport.catalogObject(catalog)
    activities = try #require(duplicatePrerequisites["activities"] as? [[String: Any]])
    let proofIndex = try #require(
      activities.firstIndex { $0["id"] as? String == proof.id.rawValue })
    activity = activities[proofIndex]
    activity["prerequisiteActivityIDs"] = [practice.id.rawValue, practice.id.rawValue]
    activities[proofIndex] = activity
    duplicatePrerequisites["activities"] = activities
    UniversityLearningTestSupport.expectError(
      .duplicateID(path: "catalog.activity.prerequisiteActivityIDs", id: practice.id.rawValue)
    ) {
      _ = try UniversityLearningTestSupport.decodeCatalog(duplicatePrerequisites)
    }
  }

  @Test
  func decodedReturnPoliciesRejectNonPositiveValues() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    for field in ["openDelay", "dueWindow"] {
      var object = try UniversityLearningTestSupport.catalogObject(catalog)
      var activities = try #require(object["activities"] as? [[String: Any]])
      let index = try #require(activities.firstIndex { $0["id"] as? String == proof.id.rawValue })
      var activity = activities[index]
      var policy = try #require(activity["returnPolicy"] as? [String: Any])
      policy[field] = field == "openDelay" ? 0.0 : -1.0
      activity["returnPolicy"] = policy
      activities[index] = activity
      object["activities"] = activities
      UniversityLearningTestSupport.expectError(.invalidDateOrder(path: "returnPolicy")) {
        _ = try UniversityLearningTestSupport.decodeCatalog(object)
      }
    }
  }

  @Test
  func catalogActivityKindsHaveExactReturnShape() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    let delayedReturn = try UniversityLearningTestSupport.activity(.delayedReturn, in: catalog)

    let missingProofPolicy = try UniversityLearningTestSupport.copyActivity(
      proof, returnPolicy: nil)
    UniversityLearningTestSupport.expectError(
      .invalidCatalog(
        path: "catalog.activity.returnPolicy",
        reason: "Every proof activity needs a return policy.")
    ) {
      _ = try UniversityLearningTestSupport.catalogWithActivities(
        replacing: [practice, missingProofPolicy, delayedReturn])
    }

    var practiceClaim = try UniversityLearningTestSupport.catalogObject(catalog)
    var activities = try #require(practiceClaim["activities"] as? [[String: Any]])
    let practiceIndex = try #require(
      activities.firstIndex { $0["id"] as? String == practice.id.rawValue })
    var practiceObject = activities[practiceIndex]
    practiceObject["proofClaimID"] = proof.proofClaimID?.rawValue
    practiceObject["prerequisiteActivityIDs"] = [practice.id.rawValue]
    activities[practiceIndex] = practiceObject
    practiceClaim["activities"] = activities
    UniversityLearningTestSupport.expectError(
      .invalidCatalog(
        path: "catalog.activity.\(practice.id.rawValue)",
        reason: "Practice activities cannot have a proof claim or prerequisites.")
    ) {
      _ = try UniversityLearningTestSupport.decodeCatalog(practiceClaim)
    }

    var delayedPrerequisite = try UniversityLearningTestSupport.catalogObject(catalog)
    activities = try #require(delayedPrerequisite["activities"] as? [[String: Any]])
    let delayedIndex = try #require(
      activities.firstIndex { $0["id"] as? String == delayedReturn.id.rawValue })
    var delayedObject = activities[delayedIndex]
    delayedObject["prerequisiteActivityIDs"] = [practice.id.rawValue]
    activities[delayedIndex] = delayedObject
    delayedPrerequisite["activities"] = activities
    UniversityLearningTestSupport.expectError(
      .invalidCatalog(
        path: "catalog.activity.\(delayedReturn.id.rawValue)",
        reason: "Delayed return activities need a claim and no prerequisites.")
    ) {
      _ = try UniversityLearningTestSupport.decodeCatalog(delayedPrerequisite)
    }
  }

  @Test
  func decodedAssistanceMustMatchProofAndReturnBoundaries() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let proof = try UniversityLearningTestSupport.activity(.proof, in: catalog)
    let delayedReturn = try UniversityLearningTestSupport.activity(.delayedReturn, in: catalog)
    let proofState = try UniversityLearningTestSupport.proofReadyState(catalog: catalog)
    let proofFact = try AssistanceFact(
      id: try AssistanceID("assistance.decoded.proof-ai"), courseID: catalog.courseID,
      activityID: proof.id, kind: .ai, aiAction: .explain, retrievalMode: .none,
      modelIdentityRequirement: .none, preservesConstruct: false,
      recordedAt: UniversityLearningTestSupport.date(1))
    var proofObject = try UniversityLearningTestSupport.stateObject(proofState)
    var proofEvidence = try #require(proofObject["evidence"] as? [[String: Any]])
    var proofReceipt = try #require(proofEvidence.last)
    proofReceipt["assistanceIDs"] = [proofFact.id.rawValue]
    proofEvidence[proofEvidence.count - 1] = proofReceipt
    proofObject["evidence"] = proofEvidence
    proofObject["assistance"] = [try UniversityLearningTestSupport.jsonObject(proofFact)]
    let decodedProof = try UniversityLearningTestSupport.decodeState(proofObject)
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.assistance.\(proofFact.id.rawValue)",
        reason: "Assistance does not match the activity boundary.")
    ) {
      try decodedProof.validate(against: catalog)
    }

    let engine = try UniversityLearningEngine(catalog: catalog, validators: ValidatorRegistry())
    let record = try #require(proofState.delayedReturns.first)
    let completed = try engine.transition(
      state: proofState,
      submission: try UniversityLearningTestSupport.submission(
        activityID: delayedReturn.id, evidenceID: try EvidenceID("evidence.return.boundary"),
        choice: "constant_positive_velocity", delayedReturnID: record.id),
      now: record.dueAt)
    let delayedFact = try AssistanceFact(
      id: try AssistanceID("assistance.decoded.return-ai"), courseID: catalog.courseID,
      activityID: delayedReturn.id, kind: .ai, aiAction: .none, retrievalMode: .none,
      modelIdentityRequirement: .none, preservesConstruct: false, recordedAt: record.dueAt)
    var delayedObject = try UniversityLearningTestSupport.stateObject(completed)
    var delayedEvidence = try #require(delayedObject["evidence"] as? [[String: Any]])
    var delayedReceipt = try #require(delayedEvidence.last)
    delayedReceipt["assistanceIDs"] = [delayedFact.id.rawValue]
    delayedEvidence[delayedEvidence.count - 1] = delayedReceipt
    delayedObject["evidence"] = delayedEvidence
    delayedObject["assistance"] = [try UniversityLearningTestSupport.jsonObject(delayedFact)]
    let decodedReturn = try UniversityLearningTestSupport.decodeState(delayedObject)
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.assistance.\(delayedFact.id.rawValue)",
        reason: "Assistance does not match the activity boundary.")
    ) {
      try decodedReturn.validate(against: catalog)
    }
  }

  @Test
  func completionEvidenceBindsReturnActivityTimeAndOriginChain() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let delayedReturn = try UniversityLearningTestSupport.activity(.delayedReturn, in: catalog)
    let proofState = try UniversityLearningTestSupport.proofReadyState(catalog: catalog)
    let record = try #require(proofState.delayedReturns.first)
    let engine = try UniversityLearningEngine(catalog: catalog, validators: ValidatorRegistry())
    let completed = try engine.transition(
      state: proofState,
      submission: try UniversityLearningTestSupport.submission(
        activityID: delayedReturn.id, evidenceID: try EvidenceID("evidence.return.completion"),
        choice: "constant_positive_velocity", delayedReturnID: record.id),
      now: record.dueAt)
    let finished = try #require(completed.delayedReturns.first)
    let completionID = try #require(finished.completionEvidenceID)
    #expect(completed.evidence.last?.id == completionID)

    let originID = try #require(completed.evidence.first?.id)
    let wrongOrigin = try UniversityLearningTestSupport.tamperedReturnState(
      state: completed, completedAt: finished.completedAt, completionEvidenceID: completionID,
      originEvidenceID: originID)
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.delayedReturns.\(finished.id.rawValue)",
        reason: "Return facts do not match the catalog.")
    ) {
      try wrongOrigin.validate(against: catalog)
    }

    let wrongEvidence = try UniversityLearningTestSupport.tamperedReturnState(
      state: completed, completedAt: finished.completedAt, completionEvidenceID: originID)
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.delayedReturns.\(finished.id.rawValue).completionEvidenceID",
        reason: "Completion evidence does not match the delayed return.")
    ) {
      try wrongEvidence.validate(against: catalog)
    }

    var timeMismatch = try UniversityLearningTestSupport.stateObject(completed)
    var evidence = try #require(timeMismatch["evidence"] as? [[String: Any]])
    var completion = try #require(evidence.last)
    completion["recordedAt"] = try UniversityLearningTestSupport.jsonObject(
      finished.dueAt.addingTimeInterval(-1))
    evidence[evidence.count - 1] = completion
    timeMismatch["evidence"] = evidence
    var timeProgress = try #require(timeMismatch["progress"] as? [[String: Any]])
    if let index = timeProgress.firstIndex(where: {
      $0["activityID"] as? String == finished.activityID.rawValue
    }) {
      timeProgress[index]["lastRecordedAt"] = try UniversityLearningTestSupport.jsonObject(
        finished.dueAt.addingTimeInterval(-1))
    }
    timeMismatch["progress"] = timeProgress
    let decodedTimeMismatch = try UniversityLearningTestSupport.decodeState(timeMismatch)
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.delayedReturns.\(finished.id.rawValue).completionEvidenceID",
        reason: "Completion evidence does not match the delayed return.")
    ) {
      try decodedTimeMismatch.validate(against: catalog)
    }
  }

  @Test
  func futureLocalFactsAreRejectedBeforeStateUse() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let practice = try UniversityLearningTestSupport.activity(.practice, in: catalog)
    let practiced = try UniversityLearningTestSupport.practicedState(catalog: catalog)

    var futureProgress = try UniversityLearningTestSupport.stateObject(practiced)
    var progress = try #require(futureProgress["progress"] as? [[String: Any]])
    progress[0]["lastRecordedAt"] = try UniversityLearningTestSupport.jsonObject(
      UniversityLearningTestSupport.date(2))
    futureProgress["progress"] = progress
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.progress.lastRecordedAt",
        reason: "Progress facts cannot be after state.updatedAt.")
    ) {
      _ = try UniversityLearningTestSupport.decodeState(futureProgress)
    }

    let futureAssistance = try AssistanceFact(
      id: try AssistanceID("assistance.future"), courseID: catalog.courseID,
      activityID: practice.id, kind: .accessAccommodation, aiAction: .none,
      retrievalMode: .none, modelIdentityRequirement: .none, preservesConstruct: true,
      recordedAt: UniversityLearningTestSupport.date(2))
    var assistanceObject = try UniversityLearningTestSupport.stateObject(
      try UniversityLearningTestSupport.initialState(catalog: catalog))
    assistanceObject["assistance"] = [
      try UniversityLearningTestSupport.jsonObject(futureAssistance)
    ]
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.assistance.recordedAt",
        reason: "Assistance facts cannot be after state.updatedAt.")
    ) {
      _ = try UniversityLearningTestSupport.decodeState(assistanceObject)
    }

    var futureEvidence = try UniversityLearningTestSupport.stateObject(practiced)
    var evidence = try #require(futureEvidence["evidence"] as? [[String: Any]])
    evidence[0]["recordedAt"] = try UniversityLearningTestSupport.jsonObject(
      UniversityLearningTestSupport.date(2))
    futureEvidence["evidence"] = evidence
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.evidence.recordedAt",
        reason: "Evidence facts cannot be after state.updatedAt.")
    ) {
      _ = try UniversityLearningTestSupport.decodeState(futureEvidence)
    }
  }

  @Test
  func completedReturnEventCannotBeAfterStateUpdatedAt() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let delayedReturn = try UniversityLearningTestSupport.activity(.delayedReturn, in: catalog)
    let proofState = try UniversityLearningTestSupport.proofReadyState(catalog: catalog)
    let record = try #require(proofState.delayedReturns.first)
    let completed = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry()
    ).transition(
      state: proofState,
      submission: try UniversityLearningTestSupport.submission(
        activityID: delayedReturn.id, evidenceID: try EvidenceID("evidence.return.future"),
        choice: "constant_positive_velocity", delayedReturnID: record.id),
      now: record.dueAt)

    var object = try UniversityLearningTestSupport.stateObject(completed)
    object["updatedAt"] = try UniversityLearningTestSupport.jsonObject(
      record.dueAt.addingTimeInterval(-1))
    var progress = try #require(object["progress"] as? [[String: Any]])
    if let index = progress.firstIndex(where: {
      $0["activityID"] as? String == delayedReturn.id.rawValue
    }) {
      progress[index]["lastRecordedAt"] = try UniversityLearningTestSupport.jsonObject(
        record.dueAt.addingTimeInterval(-2))
    }
    object["progress"] = progress
    var evidence = try #require(object["evidence"] as? [[String: Any]])
    evidence[evidence.count - 1]["recordedAt"] = try UniversityLearningTestSupport.jsonObject(
      record.dueAt.addingTimeInterval(-1))
    object["evidence"] = evidence
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.delayedReturns.completedAt",
        reason: "Completion facts cannot be after state.updatedAt.")
    ) {
      _ = try UniversityLearningTestSupport.decodeState(object)
    }
  }

  @Test
  func decodedProgressRejectsUnboundedAttemptsAndMissingResult() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let state = try UniversityLearningTestSupport.practicedState(catalog: catalog)

    var unbounded = try UniversityLearningTestSupport.stateObject(state)
    var progress = try #require(unbounded["progress"] as? [[String: Any]])
    progress[0]["attempts"] = Int.max
    unbounded["progress"] = progress
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.progress.attempts", reason: "Attempts exceed the evidence limit.")
    ) {
      _ = try UniversityLearningTestSupport.decodeState(unbounded)
    }

    var missingResult = try UniversityLearningTestSupport.stateObject(state)
    progress = try #require(missingResult["progress"] as? [[String: Any]])
    progress[0]["lastResult"] = NSNull()
    missingResult["progress"] = progress
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.progress.lastResult", reason: "Progress must have a last result.")
    ) {
      _ = try UniversityLearningTestSupport.decodeState(missingResult)
    }
  }

  @Test
  func progressMatchesExactReceiptsAndStableLatestTieBreak() throws {
    let catalog = try UniversityLearningTestSupport.catalog()
    let state = try UniversityLearningTestSupport.practicedState(catalog: catalog)

    var countMismatch = try UniversityLearningTestSupport.stateObject(state)
    var progress = try #require(countMismatch["progress"] as? [[String: Any]])
    let activityID = try #require(progress[0]["activityID"] as? String)
    progress[0]["attempts"] = 2
    countMismatch["progress"] = progress
    let decodedCountMismatch = try UniversityLearningTestSupport.decodeState(countMismatch)
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.progress.\(activityID).evidence",
        reason: "Progress attempts must match local evidence.")
    ) {
      try decodedCountMismatch.validate(against: catalog)
    }

    var tied = try UniversityLearningTestSupport.stateObject(state)
    var evidence = try #require(tied["evidence"] as? [[String: Any]])
    var second = try #require(evidence.first)
    second["id"] = "evidence.progress.tie.second"
    second["validatorResult"] = ValidatorResult.notDemonstrated.rawValue
    evidence.append(second)
    tied["evidence"] = evidence
    progress = try #require(tied["progress"] as? [[String: Any]])
    progress[0]["attempts"] = 2
    progress[0]["lastResult"] = ValidatorResult.notDemonstrated.rawValue
    tied["progress"] = progress
    let decodedTied = try UniversityLearningTestSupport.decodeState(tied)
    #expect(throws: Never.self) {
      try decodedTied.validate(against: catalog)
    }

    progress[0]["lastResult"] = ValidatorResult.demonstrated.rawValue
    tied["progress"] = progress
    let decodedUnstable = try UniversityLearningTestSupport.decodeState(tied)
    UniversityLearningTestSupport.expectError(
      .invalidState(
        path: "state.progress.\(activityID)",
        reason: "Progress must match the latest local evidence.")
    ) {
      try decodedUnstable.validate(against: catalog)
    }
  }
}

enum UniversityLearningTestSupport {
  static func catalog() throws -> ReleasedCatalogSnapshot {
    try UniversityStarterCourse.catalog()
  }

  static func date(_ seconds: TimeInterval) -> Date {
    Date(timeIntervalSinceReferenceDate: 1_800_000_000 + seconds)
  }

  static func activity(
    _ kind: ActivityKind,
    in catalog: ReleasedCatalogSnapshot
  ) throws -> CatalogActivity {
    guard let activity = catalog.activities.first(where: { $0.kind == kind }) else {
      throw UniversityLearningError.activityNotFound(id: kind.rawValue)
    }
    return activity
  }

  static func initialState(
    catalog: ReleasedCatalogSnapshot,
    activeActivityID: ActivityID? = nil
  ) throws -> LocalLearnerState {
    let practice = try activity(.practice, in: catalog)
    return try LocalLearnerState(
      activeCourseID: catalog.courseID,
      activeActivityID: activeActivityID ?? practice.id,
      progress: [],
      assistance: [],
      evidence: [],
      delayedReturns: [],
      updatedAt: date(0))
  }

  static func submission(
    activityID: ActivityID,
    evidenceID: EvidenceID,
    choice: String,
    response: String = "response",
    delayedReturnID: DelayedReturnID? = nil,
    assistance: [AssistanceRequest] = []
  ) throws -> LearnerSubmission {
    try LearnerSubmission(
      activityID: activityID,
      evidenceID: evidenceID,
      selectedChoice: choice,
      responseText: response,
      delayedReturnID: delayedReturnID,
      assistance: assistance)
  }

  static func practicedState(
    catalog: ReleasedCatalogSnapshot,
    response: String = "practice response",
    choice: String = "stays_constant_after_force",
    at now: Date = date(1)
  ) throws -> LocalLearnerState {
    let practice = try activity(.practice, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry())
    let state = try initialState(catalog: catalog)
    return try engine.transition(
      state: state,
      submission: try submission(
        activityID: practice.id,
        evidenceID: try EvidenceID("evidence.practice"),
        choice: choice,
        response: response),
      now: now)
  }

  static func maximumAttemptState(catalog: ReleasedCatalogSnapshot) throws -> LocalLearnerState {
    let practice = try activity(.practice, in: catalog)
    var object = try stateObject(try practicedState(catalog: catalog))
    var evidence = try #require(object["evidence"] as? [[String: Any]])
    let template = try #require(evidence.first)
    evidence = (0..<UniversityLearningLimits.maximumEvidence).map { index in
      var receipt = template
      receipt["id"] = "evidence.progress.limit.\(index)"
      return receipt
    }
    object["evidence"] = evidence
    var progress = try #require(object["progress"] as? [[String: Any]])
    progress[0]["attempts"] = UniversityLearningLimits.maximumEvidence
    object["progress"] = progress
    object["activeActivityID"] = practice.id.rawValue
    return try decodeState(object)
  }

  static func proofReadyState(
    catalog: ReleasedCatalogSnapshot,
    proofTime: Date = date(2)
  ) throws -> LocalLearnerState {
    let proof = try activity(.proof, in: catalog)
    let engine = try UniversityLearningEngine(
      catalog: catalog, validators: ValidatorRegistry())
    let practiced = try practicedState(catalog: catalog)
    return try engine.transition(
      state: practiced,
      submission: try submission(
        activityID: proof.id,
        evidenceID: try EvidenceID("evidence.proof"),
        choice: "stays_constant_after_force"),
      now: proofTime)
  }

  static func tamperedReceiptState(
    state: LocalLearnerState, assistanceID: AssistanceID, facts: [AssistanceFact],
    updatedAt: Date? = nil
  ) throws -> LocalLearnerState {
    var object = try stateObject(state)
    guard var evidence = object["evidence"] as? [[String: Any]], var receipt = evidence.first else {
      throw UniversityLearningError.invalidState(path: "test", reason: "Missing evidence.")
    }
    receipt["assistanceIDs"] = [assistanceID.rawValue]
    evidence[0] = receipt
    object["evidence"] = evidence
    var encodedFacts: [Any] = []
    for fact in facts { encodedFacts.append(try jsonObject(fact)) }
    object["assistance"] = encodedFacts
    if let updatedAt { object["updatedAt"] = try jsonObject(updatedAt) }
    return try decodeState(object)
  }

  static func tamperedReturnState(
    state: LocalLearnerState, completedAt: Date?, completionEvidenceID: EvidenceID?,
    originEvidenceID: EvidenceID? = nil, updatedAt: Date? = nil
  ) throws -> LocalLearnerState {
    var object = try stateObject(state)
    guard var returns = object["delayedReturns"] as? [[String: Any]], var record = returns.first
    else {
      throw UniversityLearningError.invalidState(path: "test", reason: "Missing return.")
    }
    record["completedAt"] = try completedAt.map { try jsonObject($0) } ?? NSNull()
    record["completionEvidenceID"] = completionEvidenceID?.rawValue ?? NSNull()
    if let originEvidenceID { record["originEvidenceID"] = originEvidenceID.rawValue }
    returns[0] = record
    object["delayedReturns"] = returns
    if let updatedAt { object["updatedAt"] = try jsonObject(updatedAt) }
    return try decodeState(object)
  }

  static func copyActivity(
    _ activity: CatalogActivity, returnPolicy: ReturnPolicy?
  ) throws -> CatalogActivity {
    try CatalogActivity(
      id: activity.id, courseID: activity.courseID, capabilityID: activity.capabilityID,
      taskFamilyID: activity.taskFamilyID, kind: activity.kind, prompt: activity.prompt,
      choices: activity.choices, sourceBindingIDs: activity.sourceBindingIDs,
      proofClaimID: activity.proofClaimID, validatorID: activity.validatorID,
      prerequisiteActivityIDs: activity.prerequisiteActivityIDs,
      aiBoundary: activity.aiBoundary, returnPolicy: returnPolicy)
  }

  static func catalogWithActivities(
    replacing activities: [CatalogActivity]
  ) throws -> ReleasedCatalogSnapshot {
    let base = try catalog()
    return try ReleasedCatalogSnapshot(
      catalogReleaseID: base.catalogReleaseID, package: base.package, courseID: base.courseID,
      capabilities: base.capabilities, activities: activities,
      sourceBindings: base.sourceBindings, proofClaimIDs: base.proofClaimIDs,
      limitations: base.limitations)
  }

  static func catalogWithMultiplePrerequisites() throws -> ReleasedCatalogSnapshot {
    let courseID = try CourseID("course.force-motion.multi")
    let sourceID = try SourceBindingID("source.force-motion.multi")
    let capabilityID = try CapabilityID("capability.force-motion.multi")
    let firstID = try ActivityID("activity.force-motion.practice-a")
    let secondID = try ActivityID("activity.force-motion.practice-b")
    let proofID = try ActivityID("activity.force-motion.multi-proof")
    let claimID = try ProofClaimID("claim.force-motion.multi")
    let practiceBoundary = ActivityBoundary(
      allowedAIActions: [.none], retrievalMode: .none,
      modelIdentityRequirement: .none, allowsConstructPreservingAccess: true)
    let proofBoundary = practiceBoundary
    let source = try SourceBinding(
      id: sourceID, courseID: courseID, title: "Local authored multi-prerequisite fixture",
      provenance: .provenanceIncomplete)
    let capability = try CatalogCapability(
      id: capabilityID, courseID: courseID, title: "Force and Motion multi-prerequisite",
      sourceBindingIDs: [sourceID])
    let first = try CatalogActivity(
      id: firstID, courseID: courseID, capabilityID: capabilityID,
      taskFamilyID: try TaskFamilyID("force-motion.practice-a"), kind: .practice,
      prompt: "First prerequisite", choices: ["stays_constant_after_force", "changes_direction"],
      sourceBindingIDs: [sourceID], proofClaimID: nil,
      validatorID: .forceMotionTransferV1, prerequisiteActivityIDs: [],
      aiBoundary: practiceBoundary, returnPolicy: nil)
    let second = try CatalogActivity(
      id: secondID, courseID: courseID, capabilityID: capabilityID,
      taskFamilyID: try TaskFamilyID("force-motion.practice-b"), kind: .practice,
      prompt: "Second prerequisite", choices: ["stays_constant_after_force", "changes_direction"],
      sourceBindingIDs: [sourceID], proofClaimID: nil,
      validatorID: .forceMotionTransferV1, prerequisiteActivityIDs: [],
      aiBoundary: practiceBoundary, returnPolicy: nil)
    let proof = try CatalogActivity(
      id: proofID, courseID: courseID, capabilityID: capabilityID,
      taskFamilyID: try TaskFamilyID("force-motion.multi-proof"), kind: .proof,
      prompt: "Apply both prerequisites",
      choices: ["stays_constant_after_force", "changes_direction"],
      sourceBindingIDs: [sourceID], proofClaimID: claimID,
      validatorID: .forceMotionTransferV1, prerequisiteActivityIDs: [secondID, firstID],
      aiBoundary: proofBoundary,
      returnPolicy: try ReturnPolicy(
        delayedReturnActivityID: try ActivityID("activity.force-motion.multi-return"),
        openDelay: 7 * 86_400, dueWindow: 30 * 86_400))
    let delayedReturn = try CatalogActivity(
      id: try ActivityID("activity.force-motion.multi-return"), courseID: courseID,
      capabilityID: capabilityID, taskFamilyID: try TaskFamilyID("force-motion.multi-return"),
      kind: .delayedReturn, prompt: "Return task",
      choices: ["constant_positive_velocity", "increasing_velocity"],
      sourceBindingIDs: [sourceID],
      proofClaimID: try ProofClaimID("claim.force-motion.multi-return"),
      validatorID: .forceMotionDelayedReturnV1, prerequisiteActivityIDs: [],
      aiBoundary: proofBoundary, returnPolicy: nil)
    return try ReleasedCatalogSnapshot(
      catalogReleaseID: try CatalogReleaseID("catalog.force-motion.multi.v1"),
      package: try CatalogPackageIdentity(
        packageID: try PackageID("package.forge.force-motion.multi"), version: "1.0.0",
        digest: try SHA256Digest(hex: String(repeating: "0", count: 63) + "2")),
      courseID: courseID, capabilities: [capability],
      activities: [first, second, proof, delayedReturn], sourceBindings: [source],
      proofClaimIDs: [claimID, try #require(delayedReturn.proofClaimID)], limitations: [])
  }

  static func catalogObject(_ catalog: ReleasedCatalogSnapshot) throws -> [String: Any] {
    guard
      let object = try JSONSerialization.jsonObject(
        with: JSONEncoder().encode(catalog), options: []) as? [String: Any]
    else {
      throw UniversityLearningError.invalidCatalog(path: "test", reason: "Invalid catalog JSON.")
    }
    return object
  }

  static func decodeCatalog(_ object: [String: Any]) throws -> ReleasedCatalogSnapshot {
    try UniversityLearningData.decode(
      ReleasedCatalogSnapshot.self, from: JSONSerialization.data(withJSONObject: object))
  }

  static func appendingRootMember(_ member: String, to data: Data) throws -> Data {
    guard var json = String(data: data, encoding: .utf8), json.last == "}" else {
      throw UniversityLearningError.invalidCatalog(path: "test", reason: "Invalid catalog JSON.")
    }
    json.removeLast()
    return Data((json + "," + member + "}").utf8)
  }

  static func stateObject(_ state: LocalLearnerState) throws -> [String: Any] {
    guard
      let object = try JSONSerialization.jsonObject(
        with: JSONEncoder().encode(state), options: []) as? [String: Any]
    else {
      throw UniversityLearningError.invalidState(path: "test", reason: "Invalid state JSON.")
    }
    return object
  }

  static func decodeState(_ object: [String: Any]) throws -> LocalLearnerState {
    try UniversityLearningData.decode(
      LocalLearnerState.self, from: JSONSerialization.data(withJSONObject: object))
  }

  static func jsonObject<T: Encodable>(_ value: T) throws -> Any {
    try JSONSerialization.jsonObject(
      with: JSONEncoder().encode(value), options: [.fragmentsAllowed])
  }

  static func expectError(
    _ expected: UniversityLearningError,
    operation: () throws -> Void
  ) {
    do {
      try operation()
      Issue.record("Expected error \(expected)")
    } catch let actual as UniversityLearningError {
      #expect(actual == expected)
    } catch {
      Issue.record("Unexpected error \(error)")
    }
  }
}
