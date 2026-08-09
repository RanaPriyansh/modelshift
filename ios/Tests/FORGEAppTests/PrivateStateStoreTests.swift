import Darwin
import Dispatch
import ForgeCore
import Foundation
import Synchronization
import Testing

@testable import FORGE

@MainActor
@Suite("Private state store")
struct PrivateStateStoreTests {
  @Test("Round trips the exact Semester Desk private-state schema")
  func roundTripsExactSemesterDeskSchema() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let state = try makeState()

    _ = try await fixture.store.save(state)

    let data = try Data(contentsOf: fixture.fileURL)
    let object = try #require(
      JSONSerialization.jsonObject(with: data) as? [String: Any]
    )
    #expect(
      Set(object.keys)
        == [
          "schemaVersion",
          "localProfileID",
          "semesterDesk",
          "returnRemindersEnabled",
        ]
    )
    #expect(object["schemaVersion"] as? Int == 1)
    #expect(object["localProfileID"] as? String == "profile.local.default")
    #expect(object["semesterDesk"] is [String: Any])
    #expect(object["returnRemindersEnabled"] as? Bool == true)
    let json = String(decoding: data, as: UTF8.self)
    #expect(!json.contains("\"learnerState\""))
    #expect(!json.contains("\"isCourseStarted\""))
    #expect(!json.contains("\"remindersEnabled\""))
    #expect(!json.contains("\"responseText\""))
    #expect(!json.contains("\"rawResponseText\""))
    #expect(try await fixture.store.load() == state)

    let attributes = try FileManager.default.attributesOfItem(
      atPath: fixture.fileURL.path
    )
    #if !targetEnvironment(simulator)
      #expect(
        (attributes[.protectionKey] as? FileProtectionType) == .complete
      )
    #endif
    let fileValues = try fixture.fileURL.resourceValues(
      forKeys: [.isExcludedFromBackupKey]
    )
    #expect(fileValues.isExcludedFromBackup == true)
  }

  @Test("Load and clear do not create an absent private state file")
  func absentFileDoesNotCreateState() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let entriesBefore = try fileNames(in: fixture.directoryURL)

    #expect(try await fixture.store.load() == nil)
    let clear = try await fixture.store.clear()
    guard case .completed(let receipt) = clear else {
      Issue.record("Expected a completed clear.")
      return
    }

    #expect(receipt.isComplete)
    #expect(receipt.removedCurrentState)
    #expect(receipt.namespace == .notRequired)
    #expect(
      receipt.files
        == expectedFileRecords(disposition: .alreadyAbsent)
    )
    let intent = try #require(try await fixture.store.pendingResetIntent())
    #expect(intent.resetEpoch == 1)
    #expect(
      try fileNames(in: fixture.directoryURL)
        == (entriesBefore + [PrivateStateStore.resetIntentFileName]).sorted()
    )
    #expect(!FileManager.default.fileExists(atPath: fixture.fileURL.path))
    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .resetIntentPresent
    )

    #expect(
      try await fixture.store.completeReset(resetEpoch: intent.resetEpoch)
        == .completed(namespace: .changed(.synchronized))
    )
    #expect(try await fixture.store.pendingResetIntent() == nil)
    #expect(try fileNames(in: fixture.directoryURL) == entriesBefore)
    #expect(try await fixture.store.load() == nil)
  }

  @Test("Protected-data denial preserves private bytes")
  func protectedDataDenialPreservesBytes() async throws {
    let availability = TestProtectedDataAvailability(isAvailable: false)
    let fixture = try makeFixture(protectedDataAvailability: availability)
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let originalData = try JSONEncoder().encode(try makeState())
    try originalData.write(to: fixture.fileURL)

    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .protectedDataUnavailable
    )
    #expect(
      await storeError { _ = try await fixture.store.save(try makeReplacementState()) }
        == .protectedDataUnavailable
    )
    #expect(
      await storeError { _ = try await fixture.store.clear() }
        == .protectedDataUnavailable
    )
    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
  }

  @Test("A protected-data retry loads the unmodified state")
  func protectedDataRetryLoadsState() async throws {
    let availability = TestProtectedDataAvailability(isAvailable: false)
    let fixture = try makeFixture(protectedDataAvailability: availability)
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let state = try makeState()
    try JSONEncoder().encode(state).write(to: fixture.fileURL)

    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .protectedDataUnavailable
    )
    availability.setAvailable(true)
    #expect(try await fixture.store.load() == state)
  }

  @Test("Rejects corrupt private bytes without changing them")
  func corruptBytesAreRetained() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let data = Data([0x7B, 0x22])
    try data.write(to: fixture.fileURL)

    #expect(await storeError { _ = try await fixture.store.load() } == .corruptData)
    #expect(try Data(contentsOf: fixture.fileURL) == data)
  }

  @Test(
    "Rejects a missing or null Semester Desk",
    arguments: [PrivateStateSchemaFault.missingDesk, .nullDesk]
  )
  fileprivate func rejectsMissingOrNullSemesterDesk(
    _ fault: PrivateStateSchemaFault
  ) async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    var object = try encodedJSONObject(try makeState())
    switch fault {
    case .missingDesk:
      object.removeValue(forKey: "semesterDesk")
    case .nullDesk:
      object["semesterDesk"] = NSNull()
    }
    let data = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    try data.write(to: fixture.fileURL)

    #expect(await storeError { _ = try await fixture.store.load() } == .corruptData)
    #expect(try Data(contentsOf: fixture.fileURL) == data)
  }

  @Test(
    "Rejects legacy and raw-draft fields",
    arguments: ["learnerState", "isCourseStarted", "remindersEnabled", "rawDraft"]
  )
  func rejectsLegacyAndRawDraftFields(_ field: String) async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    var object = try encodedJSONObject(try makeState())
    object[field] = field == "rawDraft" ? "private draft text" : ["obsolete": true]
    let data = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    try data.write(to: fixture.fileURL)

    #expect(await storeError { _ = try await fixture.store.load() } == .corruptData)
    #expect(try Data(contentsOf: fixture.fileURL) == data)
  }

  @Test("Rejects raw study text inside the Semester Desk")
  func rejectsRawStudyTextInSemesterDesk() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    var object = try encodedJSONObject(try makeState())
    var desk = try #require(object["semesterDesk"] as? [String: Any])
    desk["rawStudyDraft"] = "answer text must stay in process memory"
    object["semesterDesk"] = desk
    let data = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    try data.write(to: fixture.fileURL)

    #expect(await storeError { _ = try await fixture.store.load() } == .corruptData)
    #expect(try Data(contentsOf: fixture.fileURL) == data)
  }

  @Test("Rejects a profile-mismatched Semester Desk")
  func rejectsProfileMismatch() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let mismatch = PrivateStateEnvelope(
      localProfileID: "profile.local",
      semesterDesk: try makeSemesterDesk(profileID: "profile.other", title: "Autumn"),
      returnRemindersEnabled: true
    )
    let data = try JSONEncoder().encode(mismatch)
    try data.write(to: fixture.fileURL)

    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .profileMismatch
    )
    #expect(try Data(contentsOf: fixture.fileURL) == data)
  }

  @Test("Rejects an unsupported state schema")
  func rejectsUnsupportedSchema() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    var object = try encodedJSONObject(try makeState())
    object["schemaVersion"] = 2
    let data = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    try data.write(to: fixture.fileURL)

    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .unsupportedSchema(2)
    )
    #expect(try Data(contentsOf: fixture.fileURL) == data)
  }

  @Test("Rejects duplicate semantic JSON keys before decoding")
  func rejectsDuplicateSemanticKeys() {
    #expect(
      preflightError(#"{"schemaVersion":1,"\u0073chemaVersion":1}"#)
        == .corruptData
    )
  }

  @Test("Bounds Semester Desk arrays before decoding")
  func boundsSemesterDeskArrays() {
    let atLimit = Array(repeating: "{}", count: 64).joined(separator: ",")
    let overLimit = Array(repeating: "{}", count: 65).joined(separator: ",")
    #expect(
      preflightError(#"{"semesterDesk":{"courses":[\#(atLimit)]}}"#)
        == nil
    )
    #expect(
      preflightError(#"{"semesterDesk":{"courses":[\#(overLimit)]}}"#)
        == .corruptData
    )
    #expect(
      preflightError(#"{"returnRemindersEnabled":[]}"#)
        == .corruptData
    )
  }

  @Test(
    "Rejects malformed JSON values before decoding",
    arguments: [
      #"{"value":"\q"}"#,
      #"{"value":"\uD800"}"#,
      #"{"value":1e+-2}"#,
      #"{"value":1e--2}"#,
      #"{"value":1e++2}"#,
      #"{"value":1}x"#,
    ]
  )
  func rejectsMalformedJSONValues(_ json: String) {
    #expect(preflightError(json) == .corruptData)
  }

  @Test("Enforces the private JSON nesting limit")
  func enforcesJSONNestingLimit() {
    #expect(preflightError(nestedJSONObject(depth: 64)) == nil)
    #expect(preflightError(nestedJSONObject(depth: 65)) == .corruptData)
  }

  @Test(
    "Each old state file blocks load and save without byte changes",
    arguments: LegacyStateFile.allCases
  )
  fileprivate func everyOldStateFileBlocksLoadAndSave(
    _ legacy: LegacyStateFile
  ) async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let fileURL = fixture.url(for: legacy)
    let data = Data("old-state-\(legacy.fileName)".utf8)
    try data.write(to: fileURL)
    let expectedError = PrivateStateStoreError.stalePrivateStatePresent(
      entries: [legacy.fileName]
    )

    #expect(await storeError { _ = try await fixture.store.load() } == expectedError)
    #expect(
      await storeError { _ = try await fixture.store.save(try makeState()) }
        == expectedError
    )
    #expect(try Data(contentsOf: fileURL) == data)
    #expect(!FileManager.default.fileExists(atPath: fixture.fileURL.path))
    #expect(try recognizedStageURLs(in: fixture).isEmpty)
  }

  @Test(
    "Every pre-existing recognized stage blocks load and save",
    arguments: RecognizedStagePrefix.allCases
  )
  fileprivate func everyRecognizedStageBlocksLoadAndSave(
    _ stagePrefix: RecognizedStagePrefix
  ) async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let stageURL = fixture.directoryURL.appendingPathComponent(
      stagePrefix.value + "persisted-stage",
      isDirectory: false
    )
    let data = Data("stale-stage-\(stagePrefix.value)".utf8)
    try data.write(to: stageURL)
    let expectedError = PrivateStateStoreError.stalePrivateStatePresent(
      entries: [stageURL.lastPathComponent]
    )

    #expect(await storeError { _ = try await fixture.store.load() } == expectedError)
    #expect(
      await storeError { _ = try await fixture.store.save(try makeState()) }
        == expectedError
    )
    #expect(try Data(contentsOf: stageURL) == data)
    #expect(!FileManager.default.fileExists(atPath: fixture.fileURL.path))
  }

  @Test("Mixed current and stale private state blocks without replacement")
  func mixedCurrentAndStaleStateBlocksWithoutReplacement() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    _ = try await fixture.store.save(try makeState())
    let currentData = try Data(contentsOf: fixture.fileURL)
    let oldData = Data("mixed-v5-state".utf8)
    try oldData.write(to: fixture.v5FileURL)
    let expectedError = PrivateStateStoreError.stalePrivateStatePresent(
      entries: [PrivateStateStore.v5StateFileName]
    )

    #expect(await storeError { _ = try await fixture.store.load() } == expectedError)
    #expect(
      await storeError { _ = try await fixture.store.save(try makeReplacementState()) }
        == expectedError
    )
    #expect(try Data(contentsOf: fixture.fileURL) == currentData)
    #expect(try Data(contentsOf: fixture.v5FileURL) == oldData)
  }

  @Test("A late stale file stops installation and preserves both byte sets")
  func lateOldFileBlocksFinalInstall() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let original = try makeState()
    _ = try await fixture.store.save(original)
    let originalData = try Data(contentsOf: fixture.fileURL)
    let oldData = Data("late-private-state-v5".utf8)
    let oldFileURL = fixture.v5FileURL
    let failingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .replacement,
        inspection: {
          try? oldData.write(to: oldFileURL)
        },
        returnsFailure: false
      )
    )

    #expect(
      await storeError { _ = try await failingStore.save(try makeReplacementState()) }
        == .stalePrivateStatePresent(entries: [PrivateStateStore.v5StateFileName])
    )
    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
    #expect(try Data(contentsOf: oldFileURL) == oldData)
    #expect(try recognizedStageURLs(in: fixture).isEmpty)
  }

  @Test("Clear removes all recognized entries and preserves unrelated files")
  func clearRemovesRecognizedEntriesWithNamedReceipt() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    _ = try await fixture.store.save(try makeState())
    for legacy in LegacyStateFile.allCases {
      try Data("old-\(legacy.fileName)".utf8).write(to: fixture.url(for: legacy))
    }
    let stageNames = RecognizedStagePrefix.allCases.map { prefix in
      prefix.value + "clear-stage-\(prefix.ordinal)"
    }
    for stageName in stageNames {
      try Data("stage-\(stageName)".utf8).write(
        to: fixture.directoryURL.appendingPathComponent(stageName)
      )
    }
    let unrelatedURL = fixture.directoryURL.appendingPathComponent("unrelated.json")
    try Data("keep-this-file".utf8).write(to: unrelatedURL)

    let result = try await fixture.store.clear()
    guard case .completed(let receipt) = result else {
      Issue.record("Expected a completed clear.")
      return
    }

    #expect(receipt.isComplete)
    #expect(receipt.removedCurrentState)
    #expect(!receipt.namespaceSynchronizationUncertain)
    #expect(receipt.files == expectedFileRecords(disposition: .removed))
    #expect(
      receipt.stages
        == stageNames.sorted().map {
          PrivateStateRemovalRecord(name: $0, disposition: .removed)
        }
    )
    #expect(!FileManager.default.fileExists(atPath: fixture.fileURL.path))
    for legacy in LegacyStateFile.allCases {
      #expect(!FileManager.default.fileExists(atPath: fixture.url(for: legacy).path))
    }
    #expect(try recognizedStageURLs(in: fixture).isEmpty)
    #expect(try Data(contentsOf: unrelatedURL) == Data("keep-this-file".utf8))
    let intent = try #require(try await fixture.store.pendingResetIntent())
    #expect(
      FileManager.default.fileExists(atPath: fixture.resetIntentURL.path)
    )
    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .resetIntentPresent
    )
    #expect(
      try await fixture.store.completeReset(resetEpoch: intent.resetEpoch)
        == .completed(namespace: .changed(.synchronized))
    )
    #expect(
      !FileManager.default.fileExists(atPath: fixture.resetIntentURL.path)
    )
  }

  @Test("A new store replays a durable reset intent with the same epoch")
  func newStoreReplaysDurableResetIntent() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    _ = try await fixture.store.save(try makeState())
    let clear = try await fixture.store.clear(resetEpoch: 31)
    guard case .completed(let initialReceipt) = clear else {
      Issue.record("Expected a completed initial clear.")
      return
    }

    #expect(initialReceipt.isComplete)
    #expect(
      FileManager.default.fileExists(atPath: fixture.resetIntentURL.path)
    )
    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .resetIntentPresent
    )

    let replayStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability()
    )
    let intent = try #require(try await replayStore.pendingResetIntent())
    #expect(intent.resetEpoch == 31)
    let replay = try await replayStore.clear(resetEpoch: intent.resetEpoch)
    guard case .completed(let replayReceipt) = replay else {
      Issue.record("Expected a completed replay clear.")
      return
    }

    #expect(replayReceipt.isComplete)
    #expect(replayReceipt.namespace == .notRequired)
    #expect(
      try await replayStore.pendingResetIntent()
        == PrivateStateResetIntent(resetEpoch: 31)
    )
    #expect(
      try await replayStore.completeReset(resetEpoch: intent.resetEpoch)
        == .completed(namespace: .changed(.synchronized))
    )
    #expect(try await replayStore.pendingResetIntent() == nil)
    #expect(try await replayStore.load() == nil)
  }

  @Test("A confirmed clear replaces a corrupt regular reset marker")
  func confirmedClearReplacesCorruptResetMarker() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    _ = try await fixture.store.save(try makeState())
    try Data("not-an-epoch".utf8).write(to: fixture.resetIntentURL)

    #expect(
      await storeError { _ = try await fixture.store.pendingResetIntent() }
        == .resetIntentMismatch
    )

    let result = try await fixture.store.clear(resetEpoch: 1)
    guard case .completed(let receipt) = result else {
      Issue.record("Expected a completed confirmed clear.")
      return
    }

    #expect(receipt.isComplete)
    #expect(
      try await fixture.store.pendingResetIntent()
        == PrivateStateResetIntent(resetEpoch: 1)
    )
    #expect(
      try await fixture.store.completeReset(resetEpoch: 1)
        == .completed(namespace: .changed(.synchronized))
    )
    #expect(try await fixture.store.load() == nil)
  }

  @Test(
    "Reset marker uncertainty prevents private deletion",
    arguments: [
      PrivateStateStoreFailurePoint.resetIntentFileSynchronization,
      .resetIntentNamespaceSynchronization,
    ]
  )
  func resetMarkerUncertaintyPreventsPrivateDeletion(
    _ failurePoint: PrivateStateStoreFailurePoint
  ) async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    _ = try await fixture.store.save(try makeState())
    let currentData = try Data(contentsOf: fixture.fileURL)
    let legacyData = Data("retained-private-v5".utf8)
    try legacyData.write(to: fixture.v5FileURL)
    let stageURL = fixture.directoryURL.appendingPathComponent(
      PrivateStateStore.stageFileNamePrefix + "retained"
    )
    let stageData = Data("retained-private-stage".utf8)
    try stageData.write(to: stageURL)
    let failingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: failurePoint
      )
    )

    let error = await storeError {
      _ = try await failingStore.clear(resetEpoch: 41)
    }
    guard case .clearVerification(receipt: let receipt)? = error else {
      Issue.record("Expected a receipt-bearing marker synchronization error.")
      return
    }

    #expect(receipt.namespace == .changed(.synchronizationUncertain))
    #expect(
      disposition(in: receipt.files, named: PrivateStateStore.stateFileName)
        == .retained
    )
    #expect(
      disposition(in: receipt.files, named: PrivateStateStore.v5StateFileName)
        == .retained
    )
    #expect(
      disposition(in: receipt.stages, named: stageURL.lastPathComponent)
        == .retained
    )
    #expect(try Data(contentsOf: fixture.fileURL) == currentData)
    #expect(try Data(contentsOf: fixture.v5FileURL) == legacyData)
    #expect(try Data(contentsOf: stageURL) == stageData)
    #expect(
      FileManager.default.fileExists(atPath: fixture.resetIntentURL.path)
    )
    let intent = try #require(try await failingStore.pendingResetIntent())
    #expect(intent.resetEpoch == 41)
    #expect(
      await storeError { _ = try await failingStore.load() }
        == .resetIntentPresent
    )

    let replayStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability()
    )
    let replay = try await replayStore.clear(resetEpoch: intent.resetEpoch)
    guard case .completed(let replayReceipt) = replay else {
      Issue.record("Expected a completed marker replay.")
      return
    }
    #expect(replayReceipt.isComplete)
    #expect(!FileManager.default.fileExists(atPath: fixture.fileURL.path))
    #expect(!FileManager.default.fileExists(atPath: fixture.v5FileURL.path))
    #expect(!FileManager.default.fileExists(atPath: stageURL.path))
    #expect(
      try await replayStore.pendingResetIntent()
        == PrivateStateResetIntent(resetEpoch: 41)
    )
    #expect(
      try await replayStore.completeReset(resetEpoch: intent.resetEpoch)
        == .completed(namespace: .changed(.synchronized))
    )
    #expect(try await replayStore.pendingResetIntent() == nil)
  }

  @Test("Reset completion uncertainty restores the marker for retry")
  func resetCompletionUncertaintyRestoresMarker() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    _ = try await fixture.store.save(try makeState())
    let clear = try await fixture.store.clear(resetEpoch: 51)
    guard case .completed(let receipt) = clear else {
      Issue.record("Expected a completed clear.")
      return
    }
    #expect(receipt.isComplete)
    #expect(
      try await fixture.store.pendingResetIntent()
        == PrivateStateResetIntent(resetEpoch: 51)
    )

    let failingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .resetIntentRemovalSynchronization
      )
    )
    #expect(
      await storeError {
        _ = try await failingStore.completeReset(resetEpoch: 51)
      } == .resetIntentSynchronizationUncertain
    )
    #expect(
      FileManager.default.fileExists(atPath: fixture.resetIntentURL.path)
    )
    #expect(
      try await failingStore.pendingResetIntent()
        == PrivateStateResetIntent(resetEpoch: 51)
    )
    #expect(
      await storeError { _ = try await failingStore.load() }
        == .resetIntentPresent
    )

    let retryStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability()
    )
    #expect(
      try await retryStore.completeReset(resetEpoch: 51)
        == .completed(namespace: .changed(.synchronized))
    )
    #expect(
      !FileManager.default.fileExists(atPath: fixture.resetIntentURL.path)
    )
    #expect(try await retryStore.pendingResetIntent() == nil)
    #expect(try await retryStore.load() == nil)
  }

  @Test("A partial clear returns sorted named retained records")
  func partialClearReturnsNamedReceipt() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    _ = try await fixture.store.save(try makeState())
    let retainedData = Data("late-retained-v5".utf8)
    let retainedURL = fixture.v5FileURL
    let store = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .directorySynchronization,
        inspection: {
          try? retainedData.write(to: retainedURL)
        },
        returnsFailure: false
      )
    )

    let error = await storeError { _ = try await store.clear() }
    guard case .clearVerification(receipt: let receipt)? = error else {
      Issue.record("Expected a receipt-bearing clear verification error.")
      return
    }

    #expect(!receipt.isComplete)
    #expect(receipt.removedCurrentState)
    #expect(receipt.files == receipt.files.sorted { $0.name < $1.name })
    #expect(
      disposition(
        in: receipt.files,
        named: PrivateStateStore.v5StateFileName
      ) == .retained
    )
    #expect(
      disposition(in: receipt.files, named: PrivateStateStore.stateFileName)
        == .removed
    )
    #expect(try Data(contentsOf: retainedURL) == retainedData)
  }

  @Test("Clear rejects an unsafe recognized entry before removal")
  func unsafeRecognizedEntryPreventsClear() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    _ = try await fixture.store.save(try makeState())
    let currentData = try Data(contentsOf: fixture.fileURL)
    let targetURL = fixture.directoryURL.appendingPathComponent("safe-target")
    try Data("target".utf8).write(to: targetURL)
    let oldStageURL = fixture.directoryURL.appendingPathComponent(
      PrivateStateStore.v5StageFileNamePrefix + "unsafe",
      isDirectory: false
    )
    try FileManager.default.createSymbolicLink(
      at: oldStageURL,
      withDestinationURL: targetURL
    )

    #expect(
      await storeError { _ = try await fixture.store.clear() }
        == .unsafePath
    )
    #expect(try Data(contentsOf: fixture.fileURL) == currentData)
    #expect(FileManager.default.fileExists(atPath: oldStageURL.path))
  }

  @Test("Rejects hard-linked recognized state entries")
  func rejectsHardLinkedRecognizedState() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let data = try JSONEncoder().encode(try makeState())
    try data.write(to: fixture.fileURL)
    let linkURL = fixture.directoryURL.appendingPathComponent("private-state-hard-link")
    try FileManager.default.linkItem(at: fixture.fileURL, to: linkURL)

    #expect(await storeError { _ = try await fixture.store.load() } == .unsafePath)
    #expect(
      await storeError { _ = try await fixture.store.save(try makeReplacementState()) }
        == .unsafePath
    )
    #expect(
      await storeError { _ = try await fixture.store.clear() }
        == .unsafePath
    )
    #expect(try Data(contentsOf: fixture.fileURL) == data)
    #expect(try Data(contentsOf: linkURL) == data)
  }

  @Test("Rejects a symbolic-link state entry")
  func rejectsSymbolicLinkStateEntry() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let targetURL = fixture.directoryURL.appendingPathComponent("state-target")
    let data = try JSONEncoder().encode(try makeState())
    try data.write(to: targetURL)
    try FileManager.default.createSymbolicLink(
      at: fixture.fileURL,
      withDestinationURL: targetURL
    )

    #expect(await storeError { _ = try await fixture.store.load() } == .unsafePath)
    #expect(
      await storeError { _ = try await fixture.store.save(try makeReplacementState()) }
        == .unsafePath
    )
    #expect(
      await storeError { _ = try await fixture.store.clear() }
        == .unsafePath
    )
    #expect(try Data(contentsOf: targetURL) == data)
  }

  @Test("Fails closed on partial recognized-stage enumeration")
  func partialDirectoryEnumerationPreservesBytes() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let state = try makeState()
    _ = try await fixture.store.save(state)
    let currentData = try Data(contentsOf: fixture.fileURL)
    let stageURL = fixture.directoryURL.appendingPathComponent(
      PrivateStateStore.stageFileNamePrefix + "enumeration"
    )
    let stageData = Data("stage-data".utf8)
    try stageData.write(to: stageURL)
    let store = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .directoryEnumeration
      )
    )

    #expect(await storeError { _ = try await store.load() } == .unsafePath)
    #expect(try Data(contentsOf: fixture.fileURL) == currentData)
    #expect(try Data(contentsOf: stageURL) == stageData)
  }

  @Test("A failed stage creation preserves the previous state")
  func failedStageCreationPreservesState() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let state = try makeState()
    _ = try await fixture.store.save(state)
    let data = try Data(contentsOf: fixture.fileURL)
    let store = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .stageCreation
      )
    )

    #expect(
      await storeError { _ = try await store.save(try makeReplacementState()) }
        == .writeVerification
    )
    #expect(try Data(contentsOf: fixture.fileURL) == data)
    #expect(try await fixture.store.load() == state)
    #expect(try recognizedStageURLs(in: fixture).isEmpty)
  }

  @Test("A directory-sync uncertainty keeps verified saved state")
  func directorySynchronizationUncertaintyIsReported() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let replacement = try makeReplacementState()
    let store = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .directorySynchronization
      )
    )

    #expect(
      try await store.save(replacement)
        == .installed(namespace: .synchronizationUncertain)
    )
    #expect(try await fixture.store.load() == replacement)
  }

  @Test("A newer save sequence supersedes a blocked older save")
  func newerSaveSupersedesBlockedOlderSave() async throws {
    let admission = TestPrivateStateStoreAdmission(blocking: .save)
    let fixture = try makeFixture(admissionController: admission)
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let older = try makeState()
    let newer = try makeReplacementState()
    let olderTask = Task {
      try await fixture.store.save(
        older,
        token: PrivateStateSaveToken(resetEpoch: 0, sequence: 1)
      )
    }
    await admission.waitUntilBlocked()

    let newerResult = try await fixture.store.save(
      newer,
      token: PrivateStateSaveToken(resetEpoch: 0, sequence: 2)
    )
    await admission.release()
    let olderResult = try await olderTask.value

    #expect(newerResult == .installed(namespace: .synchronized))
    #expect(olderResult == .superseded)
    #expect(try await fixture.store.load() == newer)
  }

  @Test("A reset epoch supersedes a blocked save")
  func resetSupersedesBlockedSave() async throws {
    let admission = TestPrivateStateStoreAdmission(blocking: .save)
    let fixture = try makeFixture(admissionController: admission)
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let saveTask = Task {
      try await fixture.store.save(
        try makeState(),
        token: PrivateStateSaveToken(resetEpoch: 0, sequence: 1)
      )
    }
    await admission.waitUntilBlocked()

    let clear = try await fixture.store.clear(resetEpoch: 1)
    await admission.release()
    let save = try await saveTask.value

    guard case .completed(let receipt) = clear else {
      Issue.record("Expected a completed reset.")
      return
    }
    #expect(receipt.isComplete)
    #expect(save == .superseded)
    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .resetIntentPresent
    )
    #expect(
      try await fixture.store.completeReset(resetEpoch: 1)
        == .completed(namespace: .changed(.synchronized))
    )
    #expect(try await fixture.store.load() == nil)
  }

  @Test("Cancellation before actor admission does not write")
  func cancelledBlockedSaveDoesNotWrite() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let original = try makeState()
    _ = try await fixture.store.save(
      original,
      token: PrivateStateSaveToken(resetEpoch: 0, sequence: 1)
    )
    let originalData = try Data(contentsOf: fixture.fileURL)
    let admission = TestPrivateStateStoreAdmission(blocking: .save)
    let store = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      admissionController: admission
    )
    let task = Task {
      try await store.save(
        try makeReplacementState(),
        token: PrivateStateSaveToken(resetEpoch: 0, sequence: 2)
      )
    }
    await admission.waitUntilBlocked()
    task.cancel()
    await admission.release()

    do {
      _ = try await task.value
      Issue.record("Expected cancellation.")
    } catch is CancellationError {
    } catch {
      Issue.record("Expected CancellationError, got \(error).")
    }
    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
    #expect(try await fixture.store.load() == original)
  }

  @Test("A shared directory lock serializes store instances")
  func sharedDirectoryLockSerializesStoreInstances() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    _ = try await fixture.store.save(try makeState())
    let gate = TestBlockingInspectionGate()
    let blockingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .installedVerification,
        inspection: { gate.block() },
        returnsFailure: false
      )
    )
    let timedStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      namespaceLockTimeoutNanoseconds: 0
    )
    let replacement = try makeReplacementState()
    let saveTask = Task { try await blockingStore.save(replacement) }
    defer {
      gate.release()
      saveTask.cancel()
    }
    await gate.waitUntilBlocked()

    #expect(
      await storeError { _ = try await timedStore.load() }
        == .namespaceLockUnavailable
    )
    gate.release()
    #expect(
      try await saveTask.value == .installed(namespace: .synchronized)
    )
    #expect(try await timedStore.load() == replacement)
  }

  private struct Fixture {
    let directoryURL: URL
    let fileURL: URL
    let resetIntentURL: URL
    let v5FileURL: URL
    let v4FileURL: URL
    let v3FileURL: URL
    let v2FileURL: URL
    let store: PrivateStateStore

    func url(for legacy: LegacyStateFile) -> URL {
      switch legacy {
      case .v5:
        v5FileURL
      case .v4:
        v4FileURL
      case .v3:
        v3FileURL
      case .v2:
        v2FileURL
      }
    }
  }

  private func makeFixture(
    protectedDataAvailability: any ProtectedDataAvailability =
      AvailableProtectedDataAvailability(),
    failureInjector: (any PrivateStateStoreFailureInjecting)? = nil,
    admissionController: (any PrivateStateStoreAdmissionControlling)? = nil
  ) throws -> Fixture {
    let applicationSupportURL = try FileManager.default.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    let directoryURL = applicationSupportURL.appendingPathComponent(
      "forge-private-state-v1-\(UUID().uuidString)",
      isDirectory: true
    )
    try FileManager.default.createDirectory(
      at: directoryURL,
      withIntermediateDirectories: false
    )
    let fileURL = directoryURL.appendingPathComponent(PrivateStateStore.stateFileName)
    let store: PrivateStateStore
    if let admissionController {
      store = PrivateStateStore(
        fileURL: fileURL,
        protectedDataAvailability: protectedDataAvailability,
        admissionController: admissionController
      )
    } else if let failureInjector {
      store = PrivateStateStore(
        fileURL: fileURL,
        protectedDataAvailability: protectedDataAvailability,
        failureInjector: failureInjector
      )
    } else {
      store = PrivateStateStore(
        fileURL: fileURL,
        protectedDataAvailability: protectedDataAvailability
      )
    }
    return Fixture(
      directoryURL: directoryURL,
      fileURL: fileURL,
      resetIntentURL: directoryURL.appendingPathComponent(
        PrivateStateStore.resetIntentFileName
      ),
      v5FileURL: directoryURL.appendingPathComponent(PrivateStateStore.v5StateFileName),
      v4FileURL: directoryURL.appendingPathComponent(PrivateStateStore.v4StateFileName),
      v3FileURL: directoryURL.appendingPathComponent(PrivateStateStore.v3StateFileName),
      v2FileURL: directoryURL.appendingPathComponent(PrivateStateStore.v2StateFileName),
      store: store
    )
  }

  private func makeState(
    profileID: String = "profile.local.default",
    title: String = "Autumn 2026",
    remindersEnabled: Bool = true
  ) throws -> PrivateStateEnvelope {
    PrivateStateEnvelope(
      localProfileID: profileID,
      semesterDesk: try makeSemesterDesk(profileID: profileID, title: title),
      returnRemindersEnabled: remindersEnabled
    )
  }

  private func makeReplacementState() throws -> PrivateStateEnvelope {
    try makeState(title: "Winter 2026", remindersEnabled: false)
  }

  private func makeSemesterDesk(
    profileID: String,
    title: String
  ) throws -> UniversitySemesterDeskState {
    try UniversitySemesterDeskEngine.create(
      input: .init(profileID: profileID, title: title),
      runtime: UniversitySemesterDeskRuntime(
        clock: PrivateStateSemesterDeskClock(),
        identifiers: PrivateStateSemesterDeskIdentifiers()
      )
    ).get()
  }

  private func encodedJSONObject(
    _ state: PrivateStateEnvelope
  ) throws -> [String: Any] {
    try #require(
      JSONSerialization.jsonObject(with: JSONEncoder().encode(state))
        as? [String: Any]
    )
  }

  private func expectedFileRecords(
    disposition: PrivateStateRemovalDisposition
  ) -> [PrivateStateRemovalRecord] {
    ([PrivateStateStore.stateFileName] + PrivateStateStore.legacyStateFileNames)
      .sorted()
      .map { PrivateStateRemovalRecord(name: $0, disposition: disposition) }
  }

  private func disposition(
    in records: [PrivateStateRemovalRecord],
    named name: String
  ) -> PrivateStateRemovalDisposition? {
    records.first(where: { $0.name == name })?.disposition
  }

  private func fileNames(in directoryURL: URL) throws -> [String] {
    try FileManager.default.contentsOfDirectory(atPath: directoryURL.path).sorted()
  }

  private func recognizedStageURLs(in fixture: Fixture) throws -> [URL] {
    let prefixes = RecognizedStagePrefix.allCases.map(\.value)
    return try FileManager.default.contentsOfDirectory(
      at: fixture.directoryURL,
      includingPropertiesForKeys: nil
    ).filter { url in
      prefixes.contains { url.lastPathComponent.hasPrefix($0) }
    }
  }

  private func preflightError(
    _ json: String,
    maximumNestingDepth: Int = PrivateStateStore.maximumJSONNestingDepth
  ) -> PrivateStateStoreError? {
    do {
      try PrivateJSONPreflight.validate(
        Data(json.utf8),
        maximumByteCount: PrivateStateStore.maximumDataByteCount,
        maximumNestingDepth: maximumNestingDepth
      )
      return nil
    } catch let error as PrivateStateStoreError {
      return error
    } catch {
      return .corruptData
    }
  }

  private func nestedJSONObject(depth: Int) -> String {
    var json = "0"
    for _ in 0..<depth {
      json = "{\"value\":\(json)}"
    }
    return json
  }

  private func storeError(
    _ operation: () async throws -> Void
  ) async -> PrivateStateStoreError? {
    do {
      try await operation()
      return nil
    } catch let error as PrivateStateStoreError {
      return error
    } catch {
      return nil
    }
  }
}

private enum PrivateStateSchemaFault: CaseIterable, Sendable {
  case missingDesk
  case nullDesk
}

private enum LegacyStateFile: CaseIterable, Sendable {
  case v5
  case v4
  case v3
  case v2

  var fileName: String {
    switch self {
    case .v5:
      PrivateStateStore.v5StateFileName
    case .v4:
      PrivateStateStore.v4StateFileName
    case .v3:
      PrivateStateStore.v3StateFileName
    case .v2:
      PrivateStateStore.v2StateFileName
    }
  }
}

private enum RecognizedStagePrefix: CaseIterable, Sendable {
  case current
  case v5
  case v4
  case v3
  case v2

  var value: String {
    switch self {
    case .current:
      PrivateStateStore.stageFileNamePrefix
    case .v5:
      PrivateStateStore.v5StageFileNamePrefix
    case .v4:
      PrivateStateStore.v4StageFileNamePrefix
    case .v3:
      PrivateStateStore.v3StageFileNamePrefix
    case .v2:
      PrivateStateStore.v2StageFileNamePrefix
    }
  }

  var ordinal: Int {
    switch self {
    case .current:
      0
    case .v5:
      1
    case .v4:
      2
    case .v3:
      3
    case .v2:
      4
    }
  }
}

private struct PrivateStateSemesterDeskClock: UniversitySemesterDeskClock, Sendable {
  func now() -> String {
    "2033-05-18T03:33:20.000Z"
  }
}

private struct PrivateStateSemesterDeskIdentifiers:
  UniversitySemesterDeskIdentifierFactory,
  Sendable
{
  func next(kind: UniversitySemesterDeskIdentifierKind) -> String {
    "\(kind.rawValue).private-state"
  }
}

@MainActor
private struct AvailableProtectedDataAvailability: ProtectedDataAvailability {
  var isAvailable: Bool {
    true
  }
}

private final class TestProtectedDataAvailability:
  ProtectedDataAvailability,
  Sendable
{
  private let value: Mutex<Bool>

  init(isAvailable: Bool) {
    value = Mutex(isAvailable)
  }

  @MainActor
  var isAvailable: Bool {
    value.withLock { $0 }
  }

  nonisolated func setAvailable(_ isAvailable: Bool) {
    value.withLock { $0 = isAvailable }
  }
}

private final class TestBlockingInspectionGate: @unchecked Sendable {
  private let blocked = Mutex(false)
  private let releaseSemaphore = DispatchSemaphore(value: 0)

  func block() {
    blocked.withLock { $0 = true }
    releaseSemaphore.wait()
  }

  func waitUntilBlocked() async {
    while !blocked.withLock({ $0 }) {
      await Task.yield()
    }
  }

  func release() {
    releaseSemaphore.signal()
  }
}

private struct TestPrivateStateStoreFailureInjector:
  PrivateStateStoreFailureInjecting,
  Sendable
{
  let failurePoints: [PrivateStateStoreFailurePoint]
  let inspection: @Sendable () -> Void
  let returnsFailure: Bool

  init(
    failurePoint: PrivateStateStoreFailurePoint,
    inspection: @escaping @Sendable () -> Void = {},
    returnsFailure: Bool = true
  ) {
    failurePoints = [failurePoint]
    self.inspection = inspection
    self.returnsFailure = returnsFailure
  }

  func shouldFail(at point: PrivateStateStoreFailurePoint) -> Bool {
    guard failurePoints.contains(point) else {
      return false
    }
    inspection()
    return returnsFailure
  }
}

private actor TestPrivateStateStoreAdmission:
  PrivateStateStoreAdmissionControlling
{
  private let blockedOperation: PrivateStateStoreOperation
  private var mustBlock = true
  private var isBlocked = false
  private var releaseContinuation: CheckedContinuation<Void, Never>?
  private var blockedWaiters: [CheckedContinuation<Void, Never>] = []

  init(blocking operation: PrivateStateStoreOperation) {
    blockedOperation = operation
  }

  func waitBeforeAdmission(to operation: PrivateStateStoreOperation) async {
    guard operation == blockedOperation, mustBlock else {
      return
    }
    mustBlock = false
    isBlocked = true
    let waiters = blockedWaiters
    blockedWaiters.removeAll()
    for waiter in waiters {
      waiter.resume()
    }
    await withCheckedContinuation { continuation in
      releaseContinuation = continuation
    }
  }

  func waitUntilBlocked() async {
    guard !isBlocked else {
      return
    }
    await withCheckedContinuation { continuation in
      blockedWaiters.append(continuation)
    }
  }

  func release() {
    releaseContinuation?.resume()
    releaseContinuation = nil
  }
}
