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
  @Test("Round trips the complete private state envelope")
  func roundTrip() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let state = try makeState()
    _ = try await fixture.store.save(state)

    let attributes = try FileManager.default.attributesOfItem(
      atPath: fixture.fileURL.path
    )
    #if !targetEnvironment(simulator)
      #expect(
        (attributes[.protectionKey] as? FileProtectionType) == .complete
      )
    #endif

    let directoryValues = try fixture.directoryURL.resourceValues(
      forKeys: [.isExcludedFromBackupKey]
    )
    #expect(directoryValues.isExcludedFromBackup == true)
    let fileValues = try fixture.fileURL.resourceValues(
      forKeys: [.isExcludedFromBackupKey]
    )
    #expect(fileValues.isExcludedFromBackup == true)
    #expect(try await fixture.store.load() == state)
  }

  @Test("Allows trusted system ancestors for device paths")
  func allowsTrustedSystemAncestors() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    #if !targetEnvironment(simulator)
      #expect(fixture.fileURL.path.hasPrefix("/var/"))
    #endif

    let state = try makeState()
    _ = try await fixture.store.save(state)
    #expect(try await fixture.store.load() == state)
  }

  @Test("Returns nil when the private state file is missing")
  func missingFile() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let entriesBeforeLoad = try FileManager.default.contentsOfDirectory(
      atPath: fixture.directoryURL.path
    )
    #expect(try await fixture.store.load() == nil)
    let entriesAfterLoad = try FileManager.default.contentsOfDirectory(
      atPath: fixture.directoryURL.path
    )
    #expect(entriesAfterLoad.sorted() == entriesBeforeLoad.sorted())
  }

  @Test("Reports protected-data unavailability before it reads private state")
  func unavailableLoad() async throws {
    let availability = TestProtectedDataAvailability(isAvailable: false)
    let fixture = try makeFixture(protectedDataAvailability: availability)
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalData = Data([0x7B, 0x22])
    try originalData.write(to: fixture.fileURL)

    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .protectedDataUnavailable
    )
    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
  }

  @Test("Does not replace private state while protected data is unavailable")
  func unavailableSave() async throws {
    let availability = TestProtectedDataAvailability(isAvailable: false)
    let fixture = try makeFixture(protectedDataAvailability: availability)
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalData = try JSONEncoder().encode(try makeState())
    try originalData.write(to: fixture.fileURL)

    #expect(
      await storeError { _ = try await fixture.store.save(try makeReplacementState()) }
        == .protectedDataUnavailable
    )
    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
  }

  @Test("Recaptures protected-data availability after a failed transaction")
  func recapturesProtectedDataAfterFailure() async throws {
    let availability = TestProtectedDataAvailability(isAvailable: true)
    let fixture = try makeFixture(
      protectedDataAvailability: availability,
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .stageCreation,
        inspection: {
          availability.setAvailable(false)
        }
      )
    )
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    #expect(
      await storeError {
        _ = try await fixture.store.save(try makeState())
      } == .protectedDataUnavailable
    )
    #expect(!FileManager.default.fileExists(atPath: fixture.fileURL.path))
  }

  @Test("Loads private state after protected data becomes available")
  func retryLoadAfterProtectedDataBecomesAvailable() async throws {
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

  @Test("Does not delete private state while protected data is unavailable")
  func unavailableClear() async throws {
    let availability = TestProtectedDataAvailability(isAvailable: false)
    let fixture = try makeFixture(protectedDataAvailability: availability)
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalData = try JSONEncoder().encode(try makeState())
    try originalData.write(to: fixture.fileURL)

    #expect(
      await storeError { _ = try await fixture.store.clear() }
        == .protectedDataUnavailable
    )
    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
  }

  @Test("Rejects corrupt bytes")
  func corruptBytes() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    try Data([0x7B, 0x22]).write(to: fixture.fileURL)

    #expect(await storeError { _ = try await fixture.store.load() } == .corruptData)
  }

  #if DEBUG
    @Test("Seeds corrupt state through the DEBUG storage path")
    func seedCorruptStateForUITesting() async throws {
      let fixture = try makeFixture()
      defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

      _ = try await fixture.store.save(try makeState())
      try await fixture.store.seedCorruptStateForUITesting()

      #expect(
        await storeError { _ = try await fixture.store.load() } == .corruptData
      )
      #expect(try Data(contentsOf: fixture.fileURL) == Data("{".utf8))
      #expect(try stageURLs(in: fixture).isEmpty)
    }
  #endif

  @Test(
    "Rejects an unknown field at every state depth",
    arguments: StrictJSONFieldLocation.allCases
  )
  func rejectsUnknownJSONField(
    at location: StrictJSONFieldLocation
  ) async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    var object = try encodedJSONObject(try makeStateWithNestedRecords())
    try insertUnknownField(location, into: &object)
    let data = try JSONSerialization.data(withJSONObject: object)
    try data.write(to: fixture.fileURL)

    #expect(await storeError { _ = try await fixture.store.load() } == .corruptData)
  }

  @Test(
    "Rejects duplicate known fields at every state depth",
    arguments: StrictJSONFieldLocation.allCases
  )
  func rejectsDuplicateKnownJSONField(
    at location: StrictJSONFieldLocation
  ) async throws {
    try await assertDuplicateKnownJSONField(at: location, escapedKey: false)
  }

  @Test(
    "Rejects escaped duplicate known fields at every state depth",
    arguments: StrictJSONFieldLocation.allCases
  )
  func rejectsEscapedDuplicateKnownJSONField(
    at location: StrictJSONFieldLocation
  ) async throws {
    try await assertDuplicateKnownJSONField(at: location, escapedKey: true)
  }

  @Test(
    "Rejects arrays over state limits before decoding",
    arguments: PreflightArrayLimit.allCases
  )
  func rejectsArrayOverStateLimitBeforeDecoding(
    at location: PreflightArrayLimit
  ) {
    #expect(
      preflightError(location.json(count: location.maximumCount + 1))
        == .corruptData
    )
  }

  @Test(
    "Accepts arrays at state limits before decoding",
    arguments: PreflightArrayLimit.allCases
  )
  func acceptsArrayAtStateLimitBeforeDecoding(
    at location: PreflightArrayLimit
  ) {
    #expect(preflightError(location.json(count: location.maximumCount)) == nil)
  }

  @Test(
    "Rejects arrays in scalar and object fields before decoding",
    arguments: PreflightUnexpectedArrayLocation.allCases
  )
  func rejectsUnexpectedArrayBeforeDecoding(
    at location: PreflightUnexpectedArrayLocation
  ) {
    #expect(preflightError(location.json) == .corruptData)
  }

  @Test("Treats response digest as unknown and keeps package digest valid")
  func responseDigestPreflightIsUnknown() {
    #expect(
      preflightError(
        #"{"learnerState":{"evidence":[{"responseDigest":{"hex":[]}}]}}"#
      ) == nil
    )
    #expect(
      preflightError(
        #"{"learnerState":{"evidence":[{"package":{"digest":{"hex":"abc"}}}]}}"#
      ) == nil
    )
    #expect(
      preflightError(
        #"{"learnerState":{"evidence":[{"package":{"digest":{"hex":[]}}}]}}"#
      ) == .corruptData
    )
  }

  @Test(
    "Accepts one exponent sign before decoding",
    arguments: [
      #"{"value":1e2}"#,
      #"{"value":1e+2}"#,
      #"{"value":1e-2}"#,
    ]
  )
  func acceptsSingleNumberExponentSignBeforeDecoding(_ json: String) {
    #expect(preflightError(json) == nil)
  }

  @Test(
    "Rejects malformed number exponents before decoding",
    arguments: [
      #"{"value":1e+-2}"#,
      #"{"value":1e--2}"#,
      #"{"value":1e++2}"#,
    ]
  )
  func rejectsMalformedNumberExponentBeforeDecoding(_ json: String) {
    #expect(preflightError(json) == .corruptData)
  }

  @Test(
    "Rejects malformed value-string escapes before decoding",
    arguments: [
      #"{"value":"\q"}"#,
      #"{"value":"\u12"}"#,
      #"{"value":"\u12X4"}"#,
      #"{"value":"\uD800"}"#,
      #"{"value":"\uDC00"}"#,
      #"{"value":"\uD800\u0041"}"#,
    ]
  )
  func rejectsMalformedValueStringEscapeBeforeDecoding(_ json: String) {
    #expect(preflightError(json) == .corruptData)
  }

  @Test(
    "Rejects escaped semantic duplicate keys before decoding",
    arguments: [
      #"{"schemaVersion":5,"\u0073chemaVersion":5}"#,
      #"{"😀":1,"\uD83D\uDE00":2}"#,
    ]
  )
  func rejectsEscapedSemanticDuplicateKeyBeforeDecoding(_ json: String) {
    #expect(preflightError(json) == .corruptData)
  }

  @Test("Rejects trailing bytes before decoding")
  func rejectsTrailingBytesBeforeDecoding() {
    #expect(preflightError(#"{"schemaVersion":5}x"#) == .corruptData)
  }

  @Test(
    "Accepts JSON at depth 63 and 64 before decoding",
    arguments: [63, 64]
  )
  func acceptsJSONAtNestingDepthBeforeDecoding(_ depth: Int) {
    #expect(preflightError(nestedJSONObject(depth: depth)) == nil)
  }

  @Test("Rejects JSON at depth 65 before decoding")
  func rejectsJSONBeyondNestingDepthBeforeDecoding() {
    #expect(preflightError(nestedJSONObject(depth: 65)) == .corruptData)
  }

  @Test("Loads a reordered and whitespace-formatted valid state file")
  func reorderedWhitespaceFormattedState() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let state = try makeStateWithNestedRecords()
    let object = try encodedJSONObject(state)
    let data = try Data(reorderedWhitespaceFormattedJSON(object).utf8)
    try data.write(to: fixture.fileURL)

    #expect(try await fixture.store.load() == state)
  }

  @Test("Rejects the v3 schema from the v5 state file")
  func rejectsV3Schema() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    try Data(#"{"schemaVersion":3}"#.utf8).write(to: fixture.fileURL)

    #expect(
      await storeError { _ = try await fixture.store.load() } == .unsupportedSchema(3)
    )
  }

  @Test(
    "Reports old-only state and preserves bytes across a retry",
    arguments: LegacyPrivateStateVersion.allCases
  )
  func oldOnlyStatePreservesBytesAcrossRetry(
    version: LegacyPrivateStateVersion
  ) async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let legacyFileURL = fixture.legacyFileURL(for: version)
    let legacyData = Data("old-only-\(version.fileName)".utf8)
    try legacyData.write(to: legacyFileURL)

    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .legacyStatePresent
    )
    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .legacyStatePresent
    )
    #expect(try Data(contentsOf: legacyFileURL) == legacyData)
    #expect(!FileManager.default.fileExists(atPath: fixture.fileURL.path))
  }

  @Test(
    "Refuses a save beside an old state file",
    arguments: LegacyPrivateStateVersion.allCases
  )
  func saveRefusesOldStateFile(version: LegacyPrivateStateVersion) async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let legacyFileURL = fixture.legacyFileURL(for: version)
    let legacyData = Data("save-refusal-\(version.fileName)".utf8)
    try legacyData.write(to: legacyFileURL)

    #expect(
      await storeError { _ = try await fixture.store.save(try makeState()) }
        == .legacyStatePresent
    )
    #expect(try Data(contentsOf: legacyFileURL) == legacyData)
    #expect(!FileManager.default.fileExists(atPath: fixture.fileURL.path))
    #expect(try stageURLs(in: fixture).isEmpty)
  }

  @Test(
    "Refuses load and save beside an old stage file",
    arguments: LegacyPrivateStateVersion.allCases
  )
  func oldStageRefusesLoadAndSave(
    version: LegacyPrivateStateVersion
  ) async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let legacyStageURL = fixture.directoryURL.appendingPathComponent(
      version.stageFileNamePrefix + UUID().uuidString,
      isDirectory: false
    )
    let legacyData = Data("old-stage-\(version.fileName)".utf8)
    try legacyData.write(to: legacyStageURL)

    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .legacyStatePresent
    )
    #expect(
      await storeError { _ = try await fixture.store.save(try makeState()) }
        == .legacyStatePresent
    )
    #expect(try Data(contentsOf: legacyStageURL) == legacyData)
    #expect(!FileManager.default.fileExists(atPath: fixture.fileURL.path))
  }

  @Test(
    "Reports mixed v5 and old state without replacing bytes",
    arguments: LegacyPrivateStateVersion.allCases
  )
  func mixedV5AndOldStatePreservesBytes(
    version: LegacyPrivateStateVersion
  ) async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    _ = try await fixture.store.save(try makeState())
    let currentData = try Data(contentsOf: fixture.fileURL)
    let legacyFileURL = fixture.legacyFileURL(for: version)
    let legacyData = Data("mixed-\(version.fileName)".utf8)
    try legacyData.write(to: legacyFileURL)

    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .legacyStatePresent
    )
    #expect(
      await storeError {
        _ = try await fixture.store.save(try makeReplacementState())
      } == .legacyStatePresent
    )
    #expect(try Data(contentsOf: fixture.fileURL) == currentData)
    #expect(try Data(contentsOf: legacyFileURL) == legacyData)
  }

  @Test("Rechecks old-file absence before it installs v5 state")
  func saveRechecksOldFileBeforeFinalInstall() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalState = try makeState()
    _ = try await fixture.store.save(originalState)
    let originalData = try Data(contentsOf: fixture.fileURL)
    let legacyFileURL = fixture.v3FileURL
    let legacyData = Data("late-v3-state".utf8)
    let failingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .replacement,
        inspection: {
          do {
            try legacyData.write(to: legacyFileURL)
          } catch {
            Issue.record("Could not create controlled old state.")
          }
        },
        returnsFailure: false
      )
    )

    #expect(
      await storeError {
        _ = try await failingStore.save(try makeReplacementState())
      } == .legacyStatePresent
    )
    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
    #expect(try Data(contentsOf: legacyFileURL) == legacyData)
    #expect(try stageURLs(in: fixture).isEmpty)
  }

  @Test("Rejects data larger than one mebibyte")
  func oversizedData() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let data = Data(
      repeating: 0,
      count: PrivateStateStore.maximumDataByteCount + 1
    )
    try data.write(to: fixture.fileURL)

    #expect(await storeError { _ = try await fixture.store.load() } == .oversizedData)
  }

  @Test("Clears v5, v4, v3, v2, and all owned stages")
  func clear() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    _ = try await fixture.store.save(try makeState())
    try Data("v4".utf8).write(to: fixture.v4FileURL)
    try Data("v3".utf8).write(to: fixture.v3FileURL)
    try Data("v2".utf8).write(to: fixture.v2FileURL)
    let currentStageURL = fixture.directoryURL.appendingPathComponent(
      PrivateStateStore.stageFileNamePrefix + UUID().uuidString,
      isDirectory: false
    )
    let v4StageURL = fixture.directoryURL.appendingPathComponent(
      PrivateStateStore.v4StageFileNamePrefix + UUID().uuidString,
      isDirectory: false
    )
    let v3StageURL = fixture.directoryURL.appendingPathComponent(
      PrivateStateStore.v3StageFileNamePrefix + UUID().uuidString,
      isDirectory: false
    )
    let v2StageURL = fixture.directoryURL.appendingPathComponent(
      PrivateStateStore.v2StageFileNamePrefix + UUID().uuidString,
      isDirectory: false
    )
    for stageURL in [currentStageURL, v4StageURL, v3StageURL, v2StageURL] {
      try Data("private-stage-data".utf8).write(to: stageURL)
    }
    let unrelatedFileURL = fixture.directoryURL.appendingPathComponent(
      "unrelated-private-state.json",
      isDirectory: false
    )
    let unrelatedData = Data("keep".utf8)
    try unrelatedData.write(to: unrelatedFileURL)

    let result = try await fixture.store.clear()

    guard case .completed(let receipt) = result else {
      Issue.record("Expected a completed clear.")
      return
    }
    #expect(receipt.isComplete)
    #expect(receipt.current == .removed)
    #expect(receipt.v4 == .removed)
    #expect(receipt.v3 == .removed)
    #expect(receipt.v2 == .removed)
    #expect(receipt.stages == [.removed, .removed, .removed, .removed])
    #expect(try await fixture.store.load() == nil)
    #expect(!FileManager.default.fileExists(atPath: fixture.fileURL.path))
    #expect(!FileManager.default.fileExists(atPath: fixture.v4FileURL.path))
    #expect(!FileManager.default.fileExists(atPath: fixture.v3FileURL.path))
    #expect(!FileManager.default.fileExists(atPath: fixture.v2FileURL.path))
    #expect(!FileManager.default.fileExists(atPath: currentStageURL.path))
    #expect(!FileManager.default.fileExists(atPath: v4StageURL.path))
    #expect(!FileManager.default.fileExists(atPath: v3StageURL.path))
    #expect(!FileManager.default.fileExists(atPath: v2StageURL.path))
    #expect(try Data(contentsOf: unrelatedFileURL) == unrelatedData)
  }

  @Test("Clear removes an owned stage created before final verification")
  func clearRemovesLateOwnedStage() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    _ = try await fixture.store.save(try makeState())
    let lateStageURL = fixture.directoryURL.appendingPathComponent(
      PrivateStateStore.stageFileNamePrefix + UUID().uuidString,
      isDirectory: false
    )
    let clearingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .clearFinalVerification,
        inspection: {
          do {
            try Data("late-owned-stage".utf8).write(to: lateStageURL)
          } catch {
            Issue.record("Could not create the controlled late stage.")
          }
        },
        returnsFailure: false
      )
    )

    let result = try await clearingStore.clear()

    guard case .completed(let receipt) = result else {
      Issue.record("Expected a completed clear.")
      return
    }
    #expect(receipt.isComplete)
    #expect(receipt.current == .removed)
    #expect(receipt.stages == [.removed])
    #expect(!FileManager.default.fileExists(atPath: lateStageURL.path))
    #expect(try await fixture.store.load() == nil)
  }

  @Test("Rejects an unsafe old symlink before it deletes safe state")
  func clearReportsUnsafeOldSymlink() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    _ = try await fixture.store.save(try makeState())
    let currentData = try Data(contentsOf: fixture.fileURL)
    let v3Data = Data("safe-v3".utf8)
    try v3Data.write(to: fixture.v3FileURL)
    let legacyTargetURL = fixture.directoryURL.appendingPathComponent(
      "legacy-target.json",
      isDirectory: false
    )
    try Data("legacy".utf8).write(to: legacyTargetURL)
    try FileManager.default.createSymbolicLink(
      at: fixture.v2FileURL,
      withDestinationURL: legacyTargetURL
    )

    #expect(
      await storeError { _ = try await fixture.store.clear() }
        == .unsafePath
    )
    #expect(try Data(contentsOf: fixture.fileURL) == currentData)
    #expect(try Data(contentsOf: fixture.v3FileURL) == v3Data)
    #expect(
      try FileManager.default.destinationOfSymbolicLink(
        atPath: fixture.v2FileURL.path
      ) == legacyTargetURL.path
    )
  }

  @Test("Rejects an unsafe current entry before it clears old state")
  func clearReportsCurrentFileFailure() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let currentTargetURL = fixture.directoryURL.appendingPathComponent(
      "current-target.json",
      isDirectory: false
    )
    try Data("current".utf8).write(to: currentTargetURL)
    try FileManager.default.createSymbolicLink(
      at: fixture.fileURL,
      withDestinationURL: currentTargetURL
    )
    let v3Data = Data("v3".utf8)
    let v2Data = Data("v2".utf8)
    try v3Data.write(to: fixture.v3FileURL)
    try v2Data.write(to: fixture.v2FileURL)

    #expect(
      await storeError { _ = try await fixture.store.clear() }
        == .unsafePath
    )
    #expect(
      try FileManager.default.destinationOfSymbolicLink(
        atPath: fixture.fileURL.path
      ) == currentTargetURL.path
    )
    #expect(try Data(contentsOf: fixture.v3FileURL) == v3Data)
    #expect(try Data(contentsOf: fixture.v2FileURL) == v2Data)
  }

  @Test("Keeps private attributes when it replaces state")
  func replacementKeepsPrivateAttributes() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let firstState = try makeState()
    let replacementState = try makeReplacementState()

    _ = try await fixture.store.save(firstState)
    _ = try await fixture.store.save(replacementState)

    #expect(try await fixture.store.load() == replacementState)
    let fileValues = try fixture.fileURL.resourceValues(
      forKeys: [.isExcludedFromBackupKey]
    )
    #expect(fileValues.isExcludedFromBackup == true)

    #if !targetEnvironment(simulator)
      let attributes = try FileManager.default.attributesOfItem(
        atPath: fixture.fileURL.path
      )
      #expect(
        (attributes[.protectionKey] as? FileProtectionType) == .complete
      )
    #endif
  }

  @Test("Preserves previous bytes when stage creation fails")
  func stageCreationFailurePreservesPreviousState() async throws {
    try await assertFailedReplacementPreservesPreviousState(
      failingAt: .stageCreation
    )
  }

  @Test("Preserves previous bytes when stage attributes fail")
  func stageAttributeFailurePreservesPreviousState() async throws {
    try await assertFailedReplacementPreservesPreviousState(
      failingAt: .stageAttributes
    )
  }

  @Test("Applies private stage attributes before it writes data")
  func stageAttributeFailureLeavesStageEmpty() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let firstState = try makeState()
    _ = try await fixture.store.save(firstState)
    let directoryURL = fixture.directoryURL
    let injector = TestPrivateStateStoreFailureInjector(
      failurePoint: .stageAttributes,
      inspection: {
        let stageURLs =
          (try? FileManager.default.contentsOfDirectory(
            at: directoryURL,
            includingPropertiesForKeys: nil
          ).filter {
            $0.lastPathComponent.hasPrefix(
              PrivateStateStore.stageFileNamePrefix
            )
          }) ?? []
        #expect(stageURLs.count == 1)
        if let stageURL = stageURLs.first {
          #expect((try? Data(contentsOf: stageURL))?.isEmpty == true)
        }
      }
    )
    let failingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: injector
    )

    #expect(
      await storeError {
        _ = try await failingStore.save(try makeReplacementState())
      } == .writeVerification
    )
    #expect(try await fixture.store.load() == firstState)
    #expect(try stageURLs(in: fixture).isEmpty)
  }

  @Test("Rejects a stage pathname swap before attribute application")
  func stageAttributesRejectPathSwap() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalState = try makeState()
    _ = try await fixture.store.save(originalState)
    let originalData = try Data(contentsOf: fixture.fileURL)
    let displacedStageURL = fixture.directoryURL.appendingPathComponent(
      ".displaced-stage-attributes",
      isDirectory: false
    )
    let hostileData = Data("hostile-attribute-target".utf8)
    let directoryURL = fixture.directoryURL
    let injector = TestPrivateStateStoreFailureInjector(
      failurePoint: .stageAttributes,
      inspection: {
        let stageURLs =
          (try? FileManager.default.contentsOfDirectory(
            at: directoryURL,
            includingPropertiesForKeys: nil
          ).filter {
            $0.lastPathComponent.hasPrefix(
              PrivateStateStore.stageFileNamePrefix
            )
          }) ?? []
        #expect(stageURLs.count == 1)
        guard let stageURL = stageURLs.first else {
          return
        }
        do {
          try FileManager.default.moveItem(
            at: stageURL,
            to: displacedStageURL
          )
          try hostileData.write(to: stageURL)
        } catch {
          Issue.record("Could not install the controlled attribute swap.")
        }
      },
      returnsFailure: false
    )
    let swappingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: injector
    )

    #expect(
      await storeError {
        _ = try await swappingStore.save(try makeReplacementState())
      } == .stageCleanupUncertain
    )
    let hostileStageURL = try #require(
      try stageURLs(in: fixture).first
    )
    let hostileValues = try hostileStageURL.resourceValues(
      forKeys: [.isExcludedFromBackupKey]
    )
    let displacedValues = try displacedStageURL.resourceValues(
      forKeys: [.isExcludedFromBackupKey]
    )
    #expect(hostileValues.isExcludedFromBackup != true)
    #expect(displacedValues.isExcludedFromBackup != true)
    #expect(try Data(contentsOf: hostileStageURL) == hostileData)
    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
    #expect(try Data(contentsOf: fixture.fileURL) != hostileData)
  }

  @Test("Preserves previous bytes when stage verification fails")
  func stageVerificationFailurePreservesPreviousState() async throws {
    try await assertFailedReplacementPreservesPreviousState(
      failingAt: .stageAttributeVerification
    )
  }

  @Test("Preserves previous bytes when stage synchronization fails")
  func stageSynchronizationFailurePreservesPreviousState() async throws {
    try await assertFailedReplacementPreservesPreviousState(
      failingAt: .stageSynchronization
    )
  }

  @Test("Preserves previous bytes when replacement fails")
  func replacementFailurePreservesPreviousState() async throws {
    try await assertFailedReplacementPreservesPreviousState(
      failingAt: .replacement
    )
  }

  @Test("Rolls back changed bytes after stage installation")
  func changedInstalledStageRollsBackPreviousBytes() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalState = try makeState()
    _ = try await fixture.store.save(originalState)
    let originalData = try Data(contentsOf: fixture.fileURL)
    let changedData = Data("changed-after-validation".utf8)
    let fileURL = fixture.fileURL
    let failingStore = PrivateStateStore(
      fileURL: fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .installedVerification,
        inspection: {
          do {
            try changedData.write(to: fileURL)
          } catch {
            Issue.record("Could not change the installed stage bytes.")
          }
        },
        returnsFailure: false
      )
    )

    #expect(
      await storeError {
        _ = try await failingStore.save(try makeReplacementState())
      } == .writeVerification
    )
    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
    #expect(try stageURLs(in: fixture).isEmpty)
    #expect(try await fixture.store.load() == originalState)
  }

  @Test("Reports uncertainty when failed-save stage removal fails")
  func failedSaveStageRemovalFailureIsExplicit() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalState = try makeState()
    _ = try await fixture.store.save(originalState)
    let originalData = try Data(contentsOf: fixture.fileURL)
    let failingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoints: [.replacement, .stageCleanupRemoval]
      )
    )

    #expect(
      await storeError {
        _ = try await failingStore.save(try makeReplacementState())
      } == .stageCleanupUncertain
    )
    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
    #expect(try stageURLs(in: fixture).count == 1)

    #expect(try await fixture.store.load() == originalState)
    #expect(try stageURLs(in: fixture).isEmpty)
  }

  @Test("Reports uncertainty when failed-save cleanup sync fails")
  func failedSaveCleanupSynchronizationFailureIsExplicit() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalState = try makeState()
    _ = try await fixture.store.save(originalState)
    let originalData = try Data(contentsOf: fixture.fileURL)
    let failingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoints: [.replacement, .stageCleanupSynchronization]
      )
    )

    #expect(
      await storeError {
        _ = try await failingStore.save(try makeReplacementState())
      } == .stageCleanupUncertain
    )
    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
    #expect(try stageURLs(in: fixture).isEmpty)
    #expect(try await fixture.store.load() == originalState)
  }

  @Test("Rejects a stage pathname swap immediately before replacement")
  func rejectsStageSwapBeforeReplacement() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalState = try makeState()
    _ = try await fixture.store.save(originalState)
    let originalData = try Data(contentsOf: fixture.fileURL)
    let displacedStageURL = fixture.directoryURL.appendingPathComponent(
      ".displaced-private-stage",
      isDirectory: false
    )
    let hostileData = Data("hostile-stage".utf8)
    let directoryURL = fixture.directoryURL
    let injector = TestPrivateStateStoreFailureInjector(
      failurePoint: .replacement,
      inspection: {
        let stageURLs =
          (try? FileManager.default.contentsOfDirectory(
            at: directoryURL,
            includingPropertiesForKeys: nil
          ).filter {
            $0.lastPathComponent.hasPrefix(
              PrivateStateStore.stageFileNamePrefix
            )
          }) ?? []
        #expect(stageURLs.count == 1)
        guard let stageURL = stageURLs.first else {
          return
        }
        do {
          try FileManager.default.moveItem(
            at: stageURL,
            to: displacedStageURL
          )
          try hostileData.write(to: stageURL)
        } catch {
          Issue.record("Could not install the controlled stage swap.")
        }
      },
      returnsFailure: false
    )
    let swappingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: injector
    )

    #expect(
      await storeError {
        _ = try await swappingStore.save(try makeReplacementState())
      } == .stageCleanupUncertain
    )
    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
    #expect(try Data(contentsOf: fixture.fileURL) != hostileData)
    #expect(try Data(contentsOf: displacedStageURL) != hostileData)
  }

  @Test("Rejects a destination pathname swap immediately before replacement")
  func rejectsDestinationSwapBeforeReplacement() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalState = try makeState()
    _ = try await fixture.store.save(originalState)
    let originalData = try Data(contentsOf: fixture.fileURL)
    let displacedStateURL = fixture.directoryURL.appendingPathComponent(
      ".displaced-private-state",
      isDirectory: false
    )
    let hostileData = Data("hostile-destination".utf8)
    let fileURL = fixture.fileURL
    let injector = TestPrivateStateStoreFailureInjector(
      failurePoint: .replacement,
      inspection: {
        do {
          try FileManager.default.moveItem(
            at: fileURL,
            to: displacedStateURL
          )
          try hostileData.write(to: fileURL)
        } catch {
          Issue.record("Could not install the controlled destination swap.")
        }
      },
      returnsFailure: false
    )
    let swappingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: injector
    )

    #expect(
      await storeError {
        _ = try await swappingStore.save(try makeReplacementState())
      } == .unsafePath
    )
    #expect(try Data(contentsOf: fixture.fileURL) == hostileData)
    #expect(try Data(contentsOf: displacedStateURL) == originalData)
    #expect(try stageURLs(in: fixture).isEmpty)
  }

  @Test("Reports a directory synchronization failure after replacement")
  func directorySynchronizationFailureAfterReplacement() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let firstState = try makeState()
    let replacementState = try makeReplacementState()
    _ = try await fixture.store.save(firstState)
    let failingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .directorySynchronization
      )
    )

    #expect(
      try await failingStore.save(replacementState)
        == .installed(namespace: .synchronizationUncertain)
    )
    #expect(try await fixture.store.load() == replacementState)
    #expect(try stageURLs(in: fixture).isEmpty)
  }

  @Test("Reports a directory synchronization failure after clear")
  func directorySynchronizationFailureAfterClear() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    _ = try await fixture.store.save(try makeState())
    try Data("v3".utf8).write(to: fixture.v3FileURL)
    try Data("v2".utf8).write(to: fixture.v2FileURL)
    let failingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .directorySynchronization
      )
    )

    let result = try await failingStore.clear()
    guard case .completed(let receipt) = result else {
      Issue.record("Expected a completed clear.")
      return
    }
    #expect(receipt.current == .removed)
    #expect(receipt.v3 == .removed)
    #expect(receipt.v2 == .removed)
    #expect(
      receipt.namespace == .changed(.synchronizationUncertain)
    )
    #expect(!FileManager.default.fileExists(atPath: fixture.fileURL.path))
    #expect(!FileManager.default.fileExists(atPath: fixture.v3FileURL.path))
    #expect(!FileManager.default.fileExists(atPath: fixture.v2FileURL.path))
  }

  @Test("Serializes two stores through the shared directory lock")
  func sharedDirectoryLockSerializesStoreInstances() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    _ = try await fixture.store.save(try makeState())
    let gate = TestBlockingInspectionGate()
    let firstStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .installedVerification,
        inspection: {
          gate.block()
        },
        returnsFailure: false
      )
    )
    let timedStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      namespaceLockTimeoutNanoseconds: 0
    )
    let replacementState = try makeReplacementState()
    let firstSave = Task {
      try await firstStore.save(replacementState)
    }
    defer {
      gate.release()
      firstSave.cancel()
    }
    await gate.waitUntilBlocked()

    #expect(
      await storeError { _ = try await timedStore.load() }
        == .namespaceLockUnavailable
    )

    gate.release()
    #expect(
      try await firstSave.value
        == .installed(namespace: .synchronized)
    )
    #expect(try await timedStore.load() == replacementState)
  }

  @Test("Rejects a directory pathname change while the lock is held")
  func namespaceLockRejectsDirectoryPathChange() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalState = try makeState()
    _ = try await fixture.store.save(originalState)
    let originalData = try Data(contentsOf: fixture.fileURL)
    let displacedDirectoryURL =
      fixture.directoryURL.deletingLastPathComponent()
      .appendingPathComponent(
        "displaced-\(UUID().uuidString)",
        isDirectory: true
      )
    defer {
      try? FileManager.default.removeItem(at: displacedDirectoryURL)
    }
    let directoryURL = fixture.directoryURL
    let changingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .namespaceLockAcquired,
        inspection: {
          do {
            try FileManager.default.moveItem(
              at: directoryURL,
              to: displacedDirectoryURL
            )
            try FileManager.default.createDirectory(
              at: directoryURL,
              withIntermediateDirectories: false
            )
          } catch {
            Issue.record("Could not change the controlled lock pathname.")
          }
        },
        returnsFailure: false
      )
    )

    #expect(
      await storeError { _ = try await changingStore.load() }
        == .unsafePath
    )
    let displacedFileURL = displacedDirectoryURL.appendingPathComponent(
      fixture.fileURL.lastPathComponent,
      isDirectory: false
    )
    #expect(try Data(contentsOf: displacedFileURL) == originalData)
    #expect(
      !FileManager.default.fileExists(atPath: fixture.fileURL.path)
    )
  }

  @Test("A newer save sequence supersedes a blocked older save")
  func newerSaveSequenceSupersedesBlockedSave() async throws {
    let admission = TestPrivateStateStoreAdmission(blocking: .save)
    let fixture = try makeFixture(admissionController: admission)
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let olderState = try makeState()
    let newerState = try makeReplacementState()
    let olderTask = Task {
      try await fixture.store.save(
        olderState,
        token: PrivateStateSaveToken(resetEpoch: 0, sequence: 1)
      )
    }
    await admission.waitUntilBlocked()

    let newerResult = try await fixture.store.save(
      newerState,
      token: PrivateStateSaveToken(resetEpoch: 0, sequence: 2)
    )
    await admission.release()
    let olderResult = try await olderTask.value

    #expect(
      newerResult == .installed(namespace: .synchronized)
    )
    #expect(olderResult == .superseded)
    #expect(try await fixture.store.load() == newerState)
    #expect(try stageURLs(in: fixture).isEmpty)
  }

  @Test("A reset epoch supersedes a blocked older save")
  func resetEpochSupersedesBlockedSave() async throws {
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

    let clearResult = try await fixture.store.clear(resetEpoch: 1)
    await admission.release()
    let saveResult = try await saveTask.value

    guard case .completed(let receipt) = clearResult else {
      Issue.record("Expected a completed clear.")
      return
    }
    #expect(receipt.isComplete)
    #expect(saveResult == .superseded)
    #expect(try await fixture.store.load() == nil)
    #expect(try stageURLs(in: fixture).isEmpty)
  }

  @Test("A save cancelled before actor admission does not write")
  func cancelledBlockedSaveDoesNotWrite() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalState = try makeState()
    _ = try await fixture.store.save(
      originalState,
      token: PrivateStateSaveToken(resetEpoch: 0, sequence: 1)
    )
    let originalData = try Data(contentsOf: fixture.fileURL)
    let admission = TestPrivateStateStoreAdmission(blocking: .save)
    let gatedStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      admissionController: admission
    )
    let saveTask = Task {
      try await gatedStore.save(
        try makeReplacementState(),
        token: PrivateStateSaveToken(resetEpoch: 0, sequence: 1)
      )
    }
    await admission.waitUntilBlocked()

    saveTask.cancel()
    await admission.release()

    do {
      _ = try await saveTask.value
      Issue.record("Expected the blocked save to report cancellation.")
    } catch is CancellationError {
    } catch {
      Issue.record("Expected CancellationError, got \(error).")
    }
    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
    #expect(try await fixture.store.load() == originalState)
    #expect(try stageURLs(in: fixture).isEmpty)
  }

  @Test("A save cancelled in the actor queue does not write or consume its token")
  func cancelledActorQueuedSaveDoesNotWrite() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalState = try makeState()
    let replacementState = try makeReplacementState()
    _ = try await fixture.store.save(
      originalState,
      token: PrivateStateSaveToken(resetEpoch: 0, sequence: 1)
    )
    let originalData = try Data(contentsOf: fixture.fileURL)

    let saveTask = await fixture.store.enqueueCancelledSaveForTesting(
      replacementState,
      token: PrivateStateSaveToken(resetEpoch: 0, sequence: 2)
    )
    do {
      _ = try await saveTask.value
      Issue.record("Expected the actor-queued save to report cancellation.")
    } catch is CancellationError {
    } catch {
      Issue.record("Expected CancellationError, got \(error).")
    }

    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
    #expect(try await fixture.store.load() == originalState)
    #expect(try stageURLs(in: fixture).isEmpty)
    #expect(
      try await fixture.store.save(
        replacementState,
        token: PrivateStateSaveToken(resetEpoch: 0, sequence: 2)
      ) == .installed(namespace: .synchronized)
    )
    #expect(try await fixture.store.load() == replacementState)
  }

  @Test("A clear cancelled in the actor queue does not delete or consume its epoch")
  func cancelledActorQueuedClearDoesNotDelete() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalState = try makeState()
    _ = try await fixture.store.save(
      originalState,
      token: PrivateStateSaveToken(resetEpoch: 0, sequence: 1)
    )
    let originalData = try Data(contentsOf: fixture.fileURL)

    let clearTask = await fixture.store.enqueueCancelledClearForTesting(
      resetEpoch: 1
    )
    do {
      _ = try await clearTask.value
      Issue.record("Expected the actor-queued clear to report cancellation.")
    } catch is CancellationError {
    } catch {
      Issue.record("Expected CancellationError, got \(error).")
    }

    #expect(try Data(contentsOf: fixture.fileURL) == originalData)
    #expect(try await fixture.store.load() == originalState)
    let result = try await fixture.store.clear(resetEpoch: 1)
    guard case .completed(let receipt) = result else {
      Issue.record("Expected the same clear epoch to complete.")
      return
    }
    #expect(receipt.isComplete)
    #expect(try await fixture.store.load() == nil)
    #expect(try stageURLs(in: fixture).isEmpty)
  }

  @Test("A failed save does not consume its sequence")
  func failedSaveSequenceCanRetry() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let originalState = try makeState()
    _ = try await fixture.store.save(
      originalState,
      token: PrivateStateSaveToken(resetEpoch: 0, sequence: 1)
    )
    let originalData = try Data(contentsOf: fixture.fileURL)
    try Data("{".utf8).write(to: fixture.fileURL)
    let replacementState = try makeReplacementState()
    let retryToken = PrivateStateSaveToken(resetEpoch: 0, sequence: 2)

    #expect(
      await storeError {
        _ = try await fixture.store.save(
          replacementState,
          token: retryToken
        )
      } == .corruptData
    )

    try originalData.write(to: fixture.fileURL)
    #expect(
      try await fixture.store.save(
        replacementState,
        token: retryToken
      ) == .installed(namespace: .synchronized)
    )
    #expect(try await fixture.store.load() == replacementState)
  }

  @Test("A failed clear does not consume its epoch")
  func failedClearEpochCanRetry() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    _ = try await fixture.store.save(
      try makeState(),
      token: PrivateStateSaveToken(resetEpoch: 0, sequence: 1)
    )
    let symlinkTargetURL = fixture.directoryURL.appendingPathComponent(
      "legacy-symlink-target",
      isDirectory: false
    )
    try Data("legacy-target".utf8).write(to: symlinkTargetURL)
    try FileManager.default.createSymbolicLink(
      at: fixture.v3FileURL,
      withDestinationURL: symlinkTargetURL
    )

    #expect(
      await storeError {
        _ = try await fixture.store.clear(resetEpoch: 1)
      } == .unsafePath
    )

    try FileManager.default.removeItem(at: fixture.v3FileURL)
    let retry = try await fixture.store.clear(resetEpoch: 1)
    guard case .completed(let receipt) = retry else {
      Issue.record("Expected the same clear epoch to retry.")
      return
    }
    #expect(receipt.isComplete)
    #expect(try await fixture.store.load() == nil)
  }

  @Test("A repeated clear epoch cannot delete a later same-epoch save")
  func repeatedClearEpochIsSuperseded() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    _ = try await fixture.store.save(
      try makeState(),
      token: PrivateStateSaveToken(resetEpoch: 0, sequence: 1)
    )
    let firstClear = try await fixture.store.clear(resetEpoch: 1)
    let postResetState = try makeReplacementState()
    let postResetSave = try await fixture.store.save(
      postResetState,
      token: PrivateStateSaveToken(resetEpoch: 1, sequence: 1)
    )
    let repeatedClear = try await fixture.store.clear(resetEpoch: 1)

    guard case .completed(let receipt) = firstClear else {
      Issue.record("Expected the first clear to complete.")
      return
    }
    #expect(receipt.isComplete)
    #expect(postResetSave == .installed(namespace: .synchronized))
    #expect(repeatedClear == .superseded)
    #expect(try await fixture.store.load() == postResetState)
  }

  @Test("Clear removes owned stages and preserves unrelated files")
  func clearRemovesOwnedStages() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    _ = try await fixture.store.save(try makeState())
    let stageURL = fixture.directoryURL.appendingPathComponent(
      PrivateStateStore.stageFileNamePrefix + UUID().uuidString,
      isDirectory: false
    )
    try Data("private-stage-data".utf8).write(to: stageURL)
    let unrelatedURL = fixture.directoryURL.appendingPathComponent(
      ".unrelated-stage",
      isDirectory: false
    )
    try Data("keep".utf8).write(to: unrelatedURL)

    let result = try await fixture.store.clear()

    guard case .completed(let receipt) = result else {
      Issue.record("Expected a completed clear.")
      return
    }
    #expect(receipt.isComplete)
    #expect(receipt.stages == [.removed])
    #expect(!FileManager.default.fileExists(atPath: stageURL.path))
    #expect(try Data(contentsOf: unrelatedURL) == Data("keep".utf8))
  }

  @Test("Load purges an owned orphan stage")
  func loadPurgesOwnedOrphanStage() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let state = try makeState()
    _ = try await fixture.store.save(state)
    let stageURL = fixture.directoryURL.appendingPathComponent(
      PrivateStateStore.stageFileNamePrefix + UUID().uuidString,
      isDirectory: false
    )
    try Data("orphan-private-data".utf8).write(to: stageURL)

    #expect(try await fixture.store.load() == state)
    #expect(!FileManager.default.fileExists(atPath: stageURL.path))
  }

  @Test("Save purges an owned orphan stage before replacement")
  func savePurgesOwnedOrphanStage() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    _ = try await fixture.store.save(try makeState())
    let stageURL = fixture.directoryURL.appendingPathComponent(
      PrivateStateStore.stageFileNamePrefix + UUID().uuidString,
      isDirectory: false
    )
    try Data("orphan-private-data".utf8).write(to: stageURL)
    let replacement = try makeReplacementState()

    #expect(
      try await fixture.store.save(replacement)
        == .installed(namespace: .synchronized)
    )
    #expect(try await fixture.store.load() == replacement)
    #expect(!FileManager.default.fileExists(atPath: stageURL.path))
  }

  @Test("Unsafe owned stage preflight preserves canonical state")
  func unsafeOwnedStagePreflightPreservesState() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let state = try makeState()
    _ = try await fixture.store.save(state)
    let canonicalData = try Data(contentsOf: fixture.fileURL)
    let targetURL = fixture.directoryURL.appendingPathComponent(
      "stage-target",
      isDirectory: false
    )
    try Data("target".utf8).write(to: targetURL)
    let stageURL = fixture.directoryURL.appendingPathComponent(
      PrivateStateStore.stageFileNamePrefix + UUID().uuidString,
      isDirectory: false
    )
    try FileManager.default.createSymbolicLink(
      at: stageURL,
      withDestinationURL: targetURL
    )

    #expect(
      await storeError { _ = try await fixture.store.clear() } == .unsafePath
    )
    #expect(try Data(contentsOf: fixture.fileURL) == canonicalData)
    #expect(FileManager.default.fileExists(atPath: stageURL.path))
  }

  @Test("Fails closed when directory enumeration ends with EIO")
  func partialDirectoryEnumerationFailurePreservesNamespace() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let state = try makeState()
    _ = try await fixture.store.save(state)
    let canonicalData = try Data(contentsOf: fixture.fileURL)
    let stageURL = fixture.directoryURL.appendingPathComponent(
      PrivateStateStore.stageFileNamePrefix + UUID().uuidString,
      isDirectory: false
    )
    let stageData = Data("enumeration-stage".utf8)
    try stageData.write(to: stageURL)
    let failingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: .directoryEnumeration
      )
    )

    #expect(
      await storeError { _ = try await failingStore.load() }
        == .unsafePath
    )
    #expect(try Data(contentsOf: fixture.fileURL) == canonicalData)
    #expect(try Data(contentsOf: stageURL) == stageData)
  }

  @Test("Does not replace corrupt state")
  func doesNotReplaceCorruptState() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let corruptData = Data([0x7B, 0x22])
    try corruptData.write(to: fixture.fileURL)

    #expect(
      await storeError { _ = try await fixture.store.save(try makeState()) } == .corruptData
    )
    #expect(try Data(contentsOf: fixture.fileURL) == corruptData)
  }

  @Test("Encodes only v5 fields with no response-derived key")
  func encodesExactSchemaV5Fields() throws {
    let data = try JSONEncoder().encode(try makeStateWithNestedRecords())
    let object = try #require(
      JSONSerialization.jsonObject(with: data) as? [String: Any]
    )

    let expectedKeys: Set<String> = [
      "schemaVersion",
      "localProfileID",
      "learnerState",
      "isCourseStarted",
      "remindersEnabled",
      "semesterDesk",
    ]
    #expect(Set(object.keys) == expectedKeys)
    #expect(object["schemaVersion"] as? Int == 5)
    #expect(object["localProfileID"] as? String == "profile.local.default")
    #expect(object["semesterDesk"] is NSNull)
    #expect(!object.keys.contains("responseText"))
    #expect(!object.keys.contains("rawResponseText"))

    let serializedJSON = String(decoding: data, as: UTF8.self)
    #expect(!serializedJSON.contains("\"responseText\""))
    #expect(!serializedJSON.contains("\"rawResponseText\""))
    #expect(!serializedJSON.contains("\"responseDigest\""))
  }

  @Test("Round trips a matching profile-bound Semester Desk")
  func roundTripsProfileBoundSemesterDesk() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let state = try makeStateWithSemesterDesk(
      localProfileID: "profile.private-state"
    )

    _ = try await fixture.store.save(state)

    #expect(try await fixture.store.load() == state)
    let data = try Data(contentsOf: fixture.fileURL)
    let json = String(decoding: data, as: UTF8.self)
    #expect(json.contains("\"localProfileID\":\"profile.private-state\""))
    #expect(json.contains("\"semesterDesk\""))
    #expect(!json.contains("\"responseText\""))
    #expect(!json.contains("\"rawResponseText\""))
  }

  @Test("Rejects a Semester Desk from a different local profile")
  func rejectsSemesterDeskProfileMismatch() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    let desk = try makeSemesterDesk(profileID: "profile.other")
    let learnerState = try UniversityStarterCourse.initialState(
      updatedAt: Date(timeIntervalSince1970: 1_800_000_000)
    )
    let state = PrivateStateEnvelope(
      localProfileID: "profile.local",
      learnerState: learnerState,
      isCourseStarted: false,
      remindersEnabled: false,
      semesterDesk: desk
    )

    #expect(
      await storeError { _ = try await fixture.store.save(state) }
        == .profileMismatch
    )
    #expect(!FileManager.default.fileExists(atPath: fixture.fileURL.path))

    let hostileData = try JSONEncoder().encode(state)
    try hostileData.write(to: fixture.fileURL)
    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .profileMismatch
    )
    #expect(try Data(contentsOf: fixture.fileURL) == hostileData)
  }

  @Test("Rejects unknown Semester Desk fields without replacing bytes")
  func rejectsUnknownSemesterDeskField() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }
    var object = try encodedJSONObject(
      makeStateWithSemesterDesk(localProfileID: "profile.private-state")
    )
    var desk = try #require(object["semesterDesk"] as? [String: Any])
    desk["rawProofText"] = "must not enter private state"
    object["semesterDesk"] = desk
    let hostileData = try JSONSerialization.data(
      withJSONObject: object,
      options: [.sortedKeys]
    )
    try hostileData.write(to: fixture.fileURL)

    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .corruptData
    )
    #expect(try Data(contentsOf: fixture.fileURL) == hostileData)
  }

  @Test("Bounds Semester Desk arrays before decoding")
  func boundsSemesterDeskArraysBeforeDecoding() {
    let atLimit = Array(repeating: "{}", count: 64).joined(separator: ",")
    let overLimit = Array(repeating: "{}", count: 65).joined(separator: ",")

    #expect(
      preflightError(
        #"{"semesterDesk":{"courses":[\#(atLimit)]}}"#
      ) == nil
    )
    #expect(
      preflightError(
        #"{"semesterDesk":{"courses":[\#(overLimit)]}}"#
      ) == .corruptData
    )
  }

  @Test(
    "Rejects hard-linked recognized private entries",
    arguments: RecognizedPrivateStateEntry.allCases
  )
  func rejectsHardLinkedRecognizedEntry(
    _ entry: RecognizedPrivateStateEntry
  ) async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let entryURL = fixture.directoryURL.appendingPathComponent(
      entry.fileName,
      isDirectory: false
    )
    let entryData =
      entry == .currentState
      ? try JSONEncoder().encode(makeState())
      : Data("recognized-private-entry".utf8)
    try entryData.write(to: entryURL)
    let hardLinkURL = fixture.directoryURL.appendingPathComponent(
      "hard-link-\(UUID().uuidString)",
      isDirectory: false
    )
    try FileManager.default.linkItem(
      at: entryURL,
      to: hardLinkURL
    )

    #expect(
      await storeError { _ = try await fixture.store.load() }
        == .unsafePath
    )
    #expect(
      await storeError { _ = try await fixture.store.save(try makeState()) }
        == .unsafePath
    )
    #expect(
      await storeError { _ = try await fixture.store.clear() }
        == .unsafePath
    )
    #expect(try Data(contentsOf: entryURL) == entryData)
    #expect(try Data(contentsOf: hardLinkURL) == entryData)
  }

  @Test("Rejects an existing directory")
  func rejectsExistingDirectory() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    try FileManager.default.createDirectory(
      at: fixture.fileURL,
      withIntermediateDirectories: false
    )
    #expect(await storeError { _ = try await fixture.store.load() } == .unsafePath)
  }

  @Test("Rejects an existing symbolic link")
  func rejectsExistingSymbolicLink() async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let realFileURL = fixture.directoryURL.appendingPathComponent("real.json")
    try Data(#"{"schemaVersion":1}"#.utf8).write(to: realFileURL)
    try FileManager.default.createSymbolicLink(
      at: fixture.fileURL,
      withDestinationURL: realFileURL
    )

    #expect(await storeError { _ = try await fixture.store.load() } == .unsafePath)
    #expect(await storeError { _ = try await fixture.store.save(try makeState()) } == .unsafePath)
    #expect(
      await storeError { _ = try await fixture.store.clear() } == .unsafePath
    )
    #expect(
      try FileManager.default.destinationOfSymbolicLink(
        atPath: fixture.fileURL.path
      ) == realFileURL.path
    )
    #expect(try Data(contentsOf: realFileURL) == Data(#"{"schemaVersion":1}"#.utf8))

    let nestedRootURL = fixture.directoryURL.appendingPathComponent("nested")
    let realForgeURL = nestedRootURL.appendingPathComponent("real-forge")
    let forgeURL = nestedRootURL.appendingPathComponent("FORGE")
    try FileManager.default.createDirectory(
      at: realForgeURL,
      withIntermediateDirectories: true
    )
    try FileManager.default.createSymbolicLink(
      at: forgeURL,
      withDestinationURL: realForgeURL
    )

    let nestedFileURL = forgeURL.appendingPathComponent("private-state-v5.json")
    let nestedStore = PrivateStateStore(fileURL: nestedFileURL)
    #expect(await storeError { _ = try await nestedStore.load() } == .unsafePath)
  }

  #if canImport(Darwin)
    @Test("Rejects a FIFO swap without blocking the read open")
    func fifoSwapDoesNotBlockReadOpen() async throws {
      let fixture = try makeFixture()
      defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

      let state = try makeState()
      _ = try await fixture.store.save(state)
      let originalData = try Data(contentsOf: fixture.fileURL)
      let displacedURL = fixture.directoryURL.appendingPathComponent(
        "displaced-private-state",
        isDirectory: false
      )
      let fileURL = fixture.fileURL
      let swappingStore = PrivateStateStore(
        fileURL: fileURL,
        protectedDataAvailability: AvailableProtectedDataAvailability(),
        failureInjector: TestPrivateStateStoreFailureInjector(
          failurePoint: .regularFileOpen,
          inspection: {
            do {
              try FileManager.default.moveItem(
                at: fileURL,
                to: displacedURL
              )
              guard Darwin.mkfifo(fileURL.path, 0o600) == 0 else {
                Issue.record("Could not create the controlled FIFO.")
                return
              }
            } catch {
              Issue.record("Could not install the controlled FIFO swap.")
            }
          },
          returnsFailure: false
        )
      )

      #expect(
        await storeError { _ = try await swappingStore.load() }
          == .unsafePath
      )
      #expect(try Data(contentsOf: displacedURL) == originalData)
    }

    @Test("Rejects an existing special file")
    func rejectsExistingSpecialFile() async throws {
      let store = PrivateStateStore(
        fileURL: URL(fileURLWithPath: "/dev/null")
      )

      #expect(await storeError { _ = try await store.load() } == .unsafePath)
    }
  #endif

  private struct Fixture {
    let directoryURL: URL
    let fileURL: URL
    let v4FileURL: URL
    let v3FileURL: URL
    let v2FileURL: URL
    let store: PrivateStateStore

    func legacyFileURL(for version: LegacyPrivateStateVersion) -> URL {
      switch version {
      case .v4:
        return v4FileURL
      case .v3:
        return v3FileURL
      case .v2:
        return v2FileURL
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
    let directoryURL =
      applicationSupportURL.appendingPathComponent(
        "forge-private-state-\(UUID().uuidString)",
        isDirectory: true
      )
    try FileManager.default.createDirectory(
      at: directoryURL,
      withIntermediateDirectories: false
    )

    let fileURL = directoryURL.appendingPathComponent(
      "private-state-v5.json",
      isDirectory: false
    )
    let v4FileURL = directoryURL.appendingPathComponent(
      PrivateStateStore.v4StateFileName,
      isDirectory: false
    )
    let v3FileURL = directoryURL.appendingPathComponent(
      PrivateStateStore.v3StateFileName,
      isDirectory: false
    )
    let v2FileURL = directoryURL.appendingPathComponent(
      PrivateStateStore.v2StateFileName,
      isDirectory: false
    )
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
      v4FileURL: v4FileURL,
      v3FileURL: v3FileURL,
      v2FileURL: v2FileURL,
      store: store
    )
  }

  private func makeState() throws -> PrivateStateEnvelope {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let learnerState = try UniversityStarterCourse.initialState(updatedAt: now)

    return PrivateStateEnvelope(
      learnerState: learnerState,
      isCourseStarted: true,
      remindersEnabled: true
    )
  }

  private func makeReplacementState() throws -> PrivateStateEnvelope {
    let learnerState = try UniversityStarterCourse.initialState(
      updatedAt: Date(timeIntervalSince1970: 1_800_000_200)
    )

    return PrivateStateEnvelope(
      learnerState: learnerState,
      isCourseStarted: false,
      remindersEnabled: false
    )
  }

  private func makeStateWithNestedRecords() throws -> PrivateStateEnvelope {
    let start = Date(timeIntervalSince1970: 1_800_000_000)
    let catalog = try UniversityStarterCourse.catalog()
    let engine = try UniversityLearningEngine(
      catalog: catalog,
      validators: ValidatorRegistry()
    )
    let practice = try #require(
      catalog.activities.first(where: { $0.kind == .practice })
    )
    let proof = try #require(
      catalog.activities.first(where: { $0.kind == .proof })
    )
    let initialState = try UniversityStarterCourse.initialState(updatedAt: start)
    let practicedState = try engine.transition(
      state: initialState,
      submission: try LearnerSubmission(
        activityID: practice.id,
        evidenceID: try EvidenceID("evidence.private-state.practice"),
        selectedChoice: "stays_constant_after_force",
        responseText: "transient practice response",
        delayedReturnID: nil,
        assistance: []
      ),
      now: start.addingTimeInterval(60)
    )
    let proofedState = try engine.transition(
      state: practicedState,
      submission: try LearnerSubmission(
        activityID: proof.id,
        evidenceID: try EvidenceID("evidence.private-state.proof"),
        selectedChoice: "stays_constant_after_force",
        responseText: "transient proof response",
        delayedReturnID: nil,
        assistance: []
      ),
      now: start.addingTimeInterval(120)
    )

    return PrivateStateEnvelope(
      learnerState: proofedState,
      isCourseStarted: true,
      remindersEnabled: true
    )
  }

  private func makeStateWithSemesterDesk(
    localProfileID: String
  ) throws -> PrivateStateEnvelope {
    let learnerState = try UniversityStarterCourse.initialState(
      updatedAt: Date(timeIntervalSince1970: 1_800_000_000)
    )
    return PrivateStateEnvelope(
      localProfileID: localProfileID,
      learnerState: learnerState,
      isCourseStarted: false,
      remindersEnabled: false,
      semesterDesk: try makeSemesterDesk(profileID: localProfileID)
    )
  }

  private func makeSemesterDesk(
    profileID: String
  ) throws -> UniversitySemesterDeskState {
    try UniversitySemesterDeskEngine.create(
      input: .init(profileID: profileID, title: "Autumn 2026"),
      runtime: UniversitySemesterDeskRuntime(
        clock: PrivateStateSemesterDeskClock(),
        identifiers: PrivateStateSemesterDeskIdentifiers()
      )
    ).get()
  }

  private func encodedJSONObject(
    _ state: PrivateStateEnvelope
  ) throws -> [String: Any] {
    let data = try JSONEncoder().encode(state)
    return try #require(
      JSONSerialization.jsonObject(with: data) as? [String: Any]
    )
  }

  private func insertUnknownField(
    _ location: StrictJSONFieldLocation,
    into object: inout [String: Any]
  ) throws {
    var root: Any = object
    try insertUnknownField(
      location,
      into: &root,
      remainingPath: location.path[...]
    )

    guard let mutatedObject = root as? [String: Any] else {
      throw JSONShapeMutationError.expectedObject
    }
    object = mutatedObject
  }

  private func insertUnknownField(
    _ location: StrictJSONFieldLocation,
    into value: inout Any,
    remainingPath: ArraySlice<JSONPathComponent>
  ) throws {
    guard let component = remainingPath.first else {
      guard var object = value as? [String: Any] else {
        throw JSONShapeMutationError.expectedObject
      }
      object[location.fieldName] = location.fieldValue
      value = object
      return
    }

    switch component {
    case .key(let key):
      guard
        var object = value as? [String: Any],
        var nestedValue = object[key]
      else {
        throw JSONShapeMutationError.expectedObject
      }
      try insertUnknownField(
        location,
        into: &nestedValue,
        remainingPath: remainingPath.dropFirst()
      )
      object[key] = nestedValue
      value = object
    case .index(let index):
      guard
        var array = value as? [Any],
        array.indices.contains(index)
      else {
        throw JSONShapeMutationError.expectedArray
      }
      var nestedValue = array[index]
      try insertUnknownField(
        location,
        into: &nestedValue,
        remainingPath: remainingPath.dropFirst()
      )
      array[index] = nestedValue
      value = array
    }
  }

  private func assertDuplicateKnownJSONField(
    at location: StrictJSONFieldLocation,
    escapedKey: Bool
  ) async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let object = try encodedJSONObject(try makeStateWithNestedRecords())
    let json = try duplicateKnownFieldJSON(
      object,
      at: location,
      escapedKey: escapedKey
    )
    try Data(json.utf8).write(to: fixture.fileURL)

    #expect(await storeError { _ = try await fixture.store.load() } == .corruptData)
  }

  private func duplicateKnownFieldJSON(
    _ value: Any,
    at location: StrictJSONFieldLocation,
    escapedKey: Bool
  ) throws -> String {
    try duplicateKnownFieldJSON(
      value,
      remainingPath: location.path[...],
      escapedKey: escapedKey
    )
  }

  private func duplicateKnownFieldJSON(
    _ value: Any,
    remainingPath: ArraySlice<JSONPathComponent>,
    escapedKey: Bool
  ) throws -> String {
    if let object = value as? [String: Any] {
      if remainingPath.isEmpty {
        guard
          let duplicateKey = object.keys.sorted().first,
          let duplicateValue = object[duplicateKey]
        else {
          throw JSONShapeMutationError.missingValue
        }

        var fields: [String] = []
        for key in object.keys.sorted() {
          guard let nestedValue = object[key] else {
            throw JSONShapeMutationError.missingValue
          }
          fields.append(
            "  \(try jsonLiteral(key)): \(try reorderedWhitespaceFormattedJSON(nestedValue))"
          )
        }
        let duplicateKeyJSON =
          escapedKey
          ? try escapedJSONKey(duplicateKey)
          : try jsonLiteral(duplicateKey)
        fields.append(
          "  \(duplicateKeyJSON): \(try reorderedWhitespaceFormattedJSON(duplicateValue))"
        )
        return "{\n\(fields.joined(separator: ",\n"))\n}"
      }

      guard
        let component = remainingPath.first,
        case .key(let expectedKey) = component,
        object[expectedKey] != nil
      else {
        throw JSONShapeMutationError.expectedObject
      }

      var fields: [String] = []
      for key in object.keys.sorted() {
        guard let nestedValue = object[key] else {
          throw JSONShapeMutationError.missingValue
        }
        let renderedValue =
          key == expectedKey
          ? try duplicateKnownFieldJSON(
            nestedValue,
            remainingPath: remainingPath.dropFirst(),
            escapedKey: escapedKey
          )
          : try reorderedWhitespaceFormattedJSON(nestedValue)
        fields.append("  \(try jsonLiteral(key)): \(renderedValue)")
      }
      return "{\n\(fields.joined(separator: ",\n"))\n}"
    }

    guard
      let array = value as? [Any],
      let component = remainingPath.first,
      case .index(let expectedIndex) = component,
      array.indices.contains(expectedIndex)
    else {
      throw JSONShapeMutationError.expectedArray
    }

    let values = try array.indices.map { index in
      index == expectedIndex
        ? try duplicateKnownFieldJSON(
          array[index],
          remainingPath: remainingPath.dropFirst(),
          escapedKey: escapedKey
        )
        : try reorderedWhitespaceFormattedJSON(array[index])
    }
    return "[\n\(values.map { "  \($0)" }.joined(separator: ",\n"))\n]"
  }

  private func escapedJSONKey(_ key: String) throws -> String {
    guard let first = key.utf8.first, first < 0x80 else {
      throw JSONShapeMutationError.missingValue
    }
    let suffix = String(decoding: key.utf8.dropFirst(), as: UTF8.self)
    return "\"\\u00\(String(format: "%02X", first))\(suffix)\""
  }

  private func reorderedWhitespaceFormattedJSON(_ value: Any) throws -> String {
    if let object = value as? [String: Any] {
      guard !object.isEmpty else {
        return "{}"
      }

      let fields = try object.keys.sorted(by: >).map { key in
        guard let nestedValue = object[key] else {
          throw JSONShapeMutationError.missingValue
        }
        return "  \(try jsonLiteral(key)): \(try reorderedWhitespaceFormattedJSON(nestedValue))"
      }
      return "{\n\(fields.joined(separator: ",\n"))\n}"
    }

    if let array = value as? [Any] {
      guard !array.isEmpty else {
        return "[]"
      }

      let elements = try array.map { element in
        "  \(try reorderedWhitespaceFormattedJSON(element))"
      }
      return "[\n\(elements.joined(separator: ",\n"))\n]"
    }

    return try jsonLiteral(value)
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

  private func jsonLiteral(_ value: Any) throws -> String {
    let data = try JSONSerialization.data(withJSONObject: [value])
    let encoded = String(decoding: data, as: UTF8.self)

    guard encoded.first == "[", encoded.last == "]" else {
      throw JSONShapeMutationError.invalidFragment
    }

    return String(encoded.dropFirst().dropLast())
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

  private func assertFailedReplacementPreservesPreviousState(
    failingAt failurePoint: PrivateStateStoreFailurePoint
  ) async throws {
    let fixture = try makeFixture()
    defer { try? FileManager.default.removeItem(at: fixture.directoryURL) }

    let firstState = try makeState()
    _ = try await fixture.store.save(firstState)
    let previousData = try Data(contentsOf: fixture.fileURL)

    let failingStore = PrivateStateStore(
      fileURL: fixture.fileURL,
      protectedDataAvailability: AvailableProtectedDataAvailability(),
      failureInjector: TestPrivateStateStoreFailureInjector(
        failurePoint: failurePoint
      )
    )

    #expect(
      await storeError { _ = try await failingStore.save(try makeReplacementState()) }
        == .writeVerification
    )
    #expect(try Data(contentsOf: fixture.fileURL) == previousData)
    #expect(try stageURLs(in: fixture).isEmpty)
    #expect(try await fixture.store.load() == firstState)
  }

  private func stageURLs(in fixture: Fixture) throws -> [URL] {
    try FileManager.default.contentsOfDirectory(
      at: fixture.directoryURL,
      includingPropertiesForKeys: nil
    ).filter {
      $0.lastPathComponent.hasPrefix(PrivateStateStore.stageFileNamePrefix)
    }
  }
}

enum StrictJSONFieldLocation: String, CaseIterable, Sendable {
  case topLevel = "top level"
  case learnerState = "learner state"
  case progress = "progress"
  case evidence = "evidence"
  case delayedReturn = "delayed return"
  case limitation = "limitation"
  case package = "package"
  case nestedRawResponse = "nested raw response"
  case responseDigest = "response digest"

  var path: [JSONPathComponent] {
    return switch self {
    case .topLevel:
      []
    case .learnerState:
      [.key("learnerState")]
    case .progress:
      [.key("learnerState"), .key("progress"), .index(0)]
    case .evidence, .nestedRawResponse, .responseDigest:
      [.key("learnerState"), .key("evidence"), .index(0)]
    case .delayedReturn:
      [.key("learnerState"), .key("delayedReturns"), .index(0)]
    case .limitation:
      [
        .key("learnerState"),
        .key("evidence"),
        .index(0),
        .key("limitations"),
        .index(0),
      ]
    case .package:
      [
        .key("learnerState"),
        .key("evidence"),
        .index(0),
        .key("package"),
      ]
    }
  }

  var fieldName: String {
    switch self {
    case .nestedRawResponse:
      return "rawResponse"
    case .responseDigest:
      return "responseDigest"
    default:
      return "unexpectedField"
    }
  }

  var fieldValue: String {
    switch self {
    case .nestedRawResponse:
      return "hostile raw response"
    case .responseDigest:
      return "deprecated response digest"
    default:
      return "unexpected"
    }
  }
}

enum JSONPathComponent: Sendable {
  case key(String)
  case index(Int)
}

enum LegacyPrivateStateVersion: CaseIterable, Sendable {
  case v4
  case v3
  case v2

  var fileName: String {
    switch self {
    case .v4:
      return PrivateStateStore.v4StateFileName
    case .v3:
      return PrivateStateStore.v3StateFileName
    case .v2:
      return PrivateStateStore.v2StateFileName
    }
  }

  var stageFileNamePrefix: String {
    switch self {
    case .v4:
      return PrivateStateStore.v4StageFileNamePrefix
    case .v3:
      return PrivateStateStore.v3StageFileNamePrefix
    case .v2:
      return PrivateStateStore.v2StageFileNamePrefix
    }
  }
}

enum RecognizedPrivateStateEntry: CaseIterable, Equatable, Sendable {
  case currentState
  case v4State
  case v3State
  case v2State
  case currentStage
  case v4Stage
  case v3Stage
  case v2Stage

  var fileName: String {
    switch self {
    case .currentState:
      return "private-state-v5.json"
    case .v4State:
      return PrivateStateStore.v4StateFileName
    case .v3State:
      return PrivateStateStore.v3StateFileName
    case .v2State:
      return PrivateStateStore.v2StateFileName
    case .currentStage:
      return PrivateStateStore.stageFileNamePrefix + UUID().uuidString
    case .v4Stage:
      return PrivateStateStore.v4StageFileNamePrefix + UUID().uuidString
    case .v3Stage:
      return PrivateStateStore.v3StageFileNamePrefix + UUID().uuidString
    case .v2Stage:
      return PrivateStateStore.v2StageFileNamePrefix + UUID().uuidString
    }
  }
}

private enum JSONShapeMutationError: Error {
  case expectedObject
  case expectedArray
  case invalidFragment
  case missingValue
}

private struct PrivateStateSemesterDeskClock:
  UniversitySemesterDeskClock,
  Sendable
{
  func now() -> String {
    "2033-05-18T03:33:20.000Z"
  }
}

private final class PrivateStateSemesterDeskIdentifiers:
  UniversitySemesterDeskIdentifierFactory,
  Sendable
{
  private let count = Mutex(0)

  func next(kind: UniversitySemesterDeskIdentifierKind) -> String {
    let ordinal = count.withLock { count in
      count += 1
      return count
    }
    return "\(kind.rawValue).private-state.\(ordinal)"
  }
}

enum PreflightArrayLimit: CaseIterable, Sendable {
  case progress
  case assistance
  case evidence
  case delayedReturns
  case limitations
  case assistanceIDs

  var maximumCount: Int {
    switch self {
    case .progress, .assistance, .evidence, .assistanceIDs:
      256
    case .delayedReturns:
      64
    case .limitations:
      32
    }
  }

  func json(count: Int) -> String {
    let values = Array(repeating: "0", count: count).joined(separator: ",")
    let array = "[\(values)]"
    return switch self {
    case .progress:
      "{\"learnerState\":{\"progress\":\(array)}}"
    case .assistance:
      "{\"learnerState\":{\"assistance\":\(array)}}"
    case .evidence:
      "{\"learnerState\":{\"evidence\":\(array)}}"
    case .delayedReturns:
      "{\"learnerState\":{\"delayedReturns\":\(array)}}"
    case .limitations:
      "{\"learnerState\":{\"evidence\":[{\"limitations\":\(array)}]}}"
    case .assistanceIDs:
      "{\"learnerState\":{\"evidence\":[{\"assistanceIDs\":\(array)}]}}"
    }
  }
}

enum PreflightUnexpectedArrayLocation: CaseIterable, Sendable {
  case envelopeScalar
  case envelopeObject
  case learnerStateScalar
  case progressScalar
  case assistanceScalar
  case evidenceScalar
  case evidencePackage
  case packageScalar
  case packageDigest
  case limitationScalar
  case delayedReturnScalar

  var json: String {
    switch self {
    case .envelopeScalar:
      #"{"schemaVersion":[]}"#
    case .envelopeObject:
      #"{"learnerState":[]}"#
    case .learnerStateScalar:
      #"{"learnerState":{"activeCourseID":[]}}"#
    case .progressScalar:
      #"{"learnerState":{"progress":[{"activityID":[]}]}}"#
    case .assistanceScalar:
      #"{"learnerState":{"assistance":[{"id":[]}]}}"#
    case .evidenceScalar:
      #"{"learnerState":{"evidence":[{"id":[]}]}}"#
    case .evidencePackage:
      #"{"learnerState":{"evidence":[{"package":[]}]}}"#
    case .packageScalar:
      #"{"learnerState":{"evidence":[{"package":{"packageID":[]}}]}}"#
    case .packageDigest:
      #"{"learnerState":{"evidence":[{"package":{"digest":[]}}]}}"#
    case .limitationScalar:
      #"{"learnerState":{"evidence":[{"limitations":[{"id":[]}]}]}}"#
    case .delayedReturnScalar:
      #"{"learnerState":{"delayedReturns":[{"id":[]}]}}"#
    }
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
  PrivateStateStoreFailureInjecting
{
  let failurePoints: [PrivateStateStoreFailurePoint]
  let inspection: @Sendable () -> Void
  let returnsFailure: Bool

  init(
    failurePoint: PrivateStateStoreFailurePoint,
    inspection: @escaping @Sendable () -> Void = {},
    returnsFailure: Bool = true
  ) {
    self.failurePoints = [failurePoint]
    self.inspection = inspection
    self.returnsFailure = returnsFailure
  }

  init(
    failurePoints: [PrivateStateStoreFailurePoint],
    inspection: @escaping @Sendable () -> Void = {},
    returnsFailure: Bool = true
  ) {
    self.failurePoints = failurePoints
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

  func waitBeforeAdmission(
    to operation: PrivateStateStoreOperation
  ) async {
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
