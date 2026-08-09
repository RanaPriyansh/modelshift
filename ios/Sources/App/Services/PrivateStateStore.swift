import ForgeCore
import Foundation

#if canImport(Darwin)
  import Darwin

  @_silgen_name("flock")
  private func forgeSystemFlock(
    _ fileDescriptor: Int32,
    _ operation: Int32
  ) -> Int32
#endif
#if canImport(UIKit)
  import UIKit
#endif
struct PrivateStateEnvelope: Codable, Equatable, Sendable {
  static let currentSchemaVersion = 1
  let schemaVersion: Int
  let localProfileID: String
  let semesterDesk: UniversitySemesterDeskState
  let returnRemindersEnabled: Bool

  private enum CodingKeys: String, CodingKey {
    case schemaVersion
    case localProfileID
    case semesterDesk
    case returnRemindersEnabled
  }

  init(
    localProfileID: String = "profile.local.default",
    semesterDesk: UniversitySemesterDeskState,
    returnRemindersEnabled: Bool
  ) {
    self.schemaVersion = Self.currentSchemaVersion
    self.localProfileID = localProfileID
    self.semesterDesk = semesterDesk
    self.returnRemindersEnabled = returnRemindersEnabled
  }

  init(from decoder: any Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    schemaVersion = try container.decode(Int.self, forKey: .schemaVersion)
    localProfileID = try container.decode(String.self, forKey: .localProfileID)
    semesterDesk = try container.decode(
      UniversitySemesterDeskState.self,
      forKey: .semesterDesk
    )
    returnRemindersEnabled = try container.decode(
      Bool.self,
      forKey: .returnRemindersEnabled
    )
  }

  func encode(to encoder: any Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(schemaVersion, forKey: .schemaVersion)
    try container.encode(localProfileID, forKey: .localProfileID)
    try container.encode(semesterDesk, forKey: .semesterDesk)
    try container.encode(
      returnRemindersEnabled,
      forKey: .returnRemindersEnabled
    )
  }
}
protocol ProtectedDataAvailability: Sendable {
  @MainActor
  var isAvailable: Bool { get }
}

private struct SystemProtectedDataAvailability:
  ProtectedDataAvailability,
  Sendable
{
  @MainActor
  var isAvailable: Bool {
    #if canImport(UIKit)
      UIApplication.shared.isProtectedDataAvailable
    #else
      true
    #endif
  }
}
struct PrivateStateSaveToken: Equatable, Sendable {
  let resetEpoch: UInt64
  let sequence: UInt64
}

enum PrivateStateNamespaceSynchronization: Equatable, Sendable {
  case synchronized
  case synchronizationUncertain
}

enum PrivateStateSaveResult: Equatable, Sendable {
  case installed(namespace: PrivateStateNamespaceSynchronization)
  case superseded
}

struct PrivateStateResetIntent: Equatable, Sendable {
  let resetEpoch: UInt64
}

enum PrivateStateRemovalDisposition: Equatable, Sendable {
  case alreadyAbsent
  case removed
  case retained
}

struct PrivateStateRemovalRecord: Equatable, Sendable {
  let name: String
  let disposition: PrivateStateRemovalDisposition
}

enum PrivateStateClearNamespaceResult: Equatable, Sendable {
  case notRequired
  case changed(PrivateStateNamespaceSynchronization)
}

struct PrivateStateClearReceipt: Equatable, Sendable {
  let files: [PrivateStateRemovalRecord]
  let stages: [PrivateStateRemovalRecord]
  let namespace: PrivateStateClearNamespaceResult

  var removedCurrentState: Bool {
    guard
      let current = files.first(where: {
        $0.name == PrivateStateStore.stateFileName
      })
    else {
      return false
    }
    return current.disposition == .alreadyAbsent
      || current.disposition == .removed
  }

  var isComplete: Bool {
    removedCurrentState
      && files.allSatisfy { record in
        record.disposition == .alreadyAbsent || record.disposition == .removed
      }
      && stages.allSatisfy { record in
        record.disposition == .alreadyAbsent || record.disposition == .removed
      }
  }

  var namespaceSynchronizationUncertain: Bool {
    namespace == .changed(.synchronizationUncertain)
  }
}

enum PrivateStateClearResult: Equatable, Sendable {
  case completed(PrivateStateClearReceipt)
  case superseded
}

enum PrivateStateResetCompletionResult: Equatable, Sendable {
  case completed(namespace: PrivateStateClearNamespaceResult)
  case superseded
}

protocol PrivateStateStoring: Sendable {
  func pendingResetIntent() async throws -> PrivateStateResetIntent?
  func load() async throws -> PrivateStateEnvelope?
  func save(
    _ state: PrivateStateEnvelope,
    token: PrivateStateSaveToken
  ) async throws -> PrivateStateSaveResult
  func clear(resetEpoch: UInt64) async throws -> PrivateStateClearResult
  func completeReset(
    resetEpoch: UInt64
  ) async throws -> PrivateStateResetCompletionResult
}
enum PrivateStateStoreFailurePoint: Sendable, Equatable {
  case namespaceLockAttempt
  case namespaceLockAcquired
  case stageCreation
  case stageAttributes
  case stageAttributeVerification
  case stageSynchronization
  case replacement
  case installedVerification
  case stageCleanupRemoval
  case stageCleanupSynchronization
  case directoryEnumeration
  case regularFileOpen
  case clearFinalVerification
  case directorySynchronization
  case resetIntentFileSynchronization
  case resetIntentNamespaceSynchronization
  case resetIntentRemovalSynchronization
}

enum PrivateStateStoreOperation: Equatable, Sendable {
  case pendingResetIntent
  case load
  case save
  case clear
  case completeReset
}

protocol PrivateStateStoreAdmissionControlling: Sendable {
  func waitBeforeAdmission(
    to operation: PrivateStateStoreOperation
  ) async
}

private struct ImmediatePrivateStateStoreAdmission:
  PrivateStateStoreAdmissionControlling,
  Sendable
{
  func waitBeforeAdmission(
    to operation: PrivateStateStoreOperation
  ) async {}
}

protocol PrivateStateStoreFailureInjecting: Sendable {
  func shouldFail(at point: PrivateStateStoreFailurePoint) -> Bool
}

private struct NoPrivateStateStoreFailure:
  PrivateStateStoreFailureInjecting,
  Sendable
{
  func shouldFail(at point: PrivateStateStoreFailurePoint) -> Bool {
    false
  }
}
enum PrivateStateStoreError: Error, Equatable, Sendable {
  case unavailableDirectory
  case unsafePath
  case stalePrivateStatePresent(entries: [String])
  case protectedDataUnavailable
  case oversizedData
  case corruptData
  case unsupportedSchema(Int)
  case invalidProfile
  case profileMismatch
  case invalidSemesterDesk
  case writeVerification
  case stageCleanupUncertain
  case namespaceLockUnavailable
  case resetIntentPresent
  case resetIntentMismatch
  case resetIntentSynchronizationUncertain
  case clearVerification(receipt: PrivateStateClearReceipt)
}
actor PrivateStateStore: PrivateStateStoring {
  static let maximumDataByteCount = 1_048_576
  static let maximumJSONNestingDepth = 64
  private static let stateDirectoryName = "FORGE"
  static let stateFileName = "semester-desk-private-state-v1.json"
  static let resetIntentFileName = ".private-state-reset-intent-v1"
  static let v5StateFileName = "private-state-v5.json"
  static let v4StateFileName = "private-state-v4.json"
  static let v3StateFileName = "private-state-v3.json"
  static let v2StateFileName = "private-state-v2.json"
  static var legacyStateFileNames: [String] {
    [
      Self.v5StateFileName,
      Self.v4StateFileName,
      Self.v3StateFileName,
      Self.v2StateFileName,
    ]
  }
  static let stageFileNamePrefix = ".semester-desk-private-state-v1.json.stage-"
  static let v5StageFileNamePrefix = ".private-state-v5.json.stage-"
  static let v4StageFileNamePrefix = ".private-state-v4.json.stage-"
  static let v3StageFileNamePrefix = ".private-state-v3.json.stage-"
  static let v2StageFileNamePrefix = ".private-state-v2.json.stage-"
  static var legacyStageFileNamePrefixes: [String] {
    [
      Self.v4StageFileNamePrefix,
      Self.v3StageFileNamePrefix,
      Self.v2StageFileNamePrefix,
      Self.v5StageFileNamePrefix,
    ]
  }
  private static var recognizedStageFileNamePrefixes: [String] {
    [Self.stageFileNamePrefix] + Self.legacyStageFileNamePrefixes
  }
  private static let maximumDirectoryEntryCount = 256
  private static let maximumDirectoryEntryNameByteCount = 255
  private static let completeFileProtectionClass: Int32 = 1
  private static let trustedSystemAncestorPaths: Set<String> = ["/var"]
  static let defaultNamespaceLockTimeoutNanoseconds: UInt64 =
    250_000_000
  private static let namespaceLockRetryNanoseconds: UInt64 = 1_000_000
  nonisolated private let injectedFileURL: URL?
  nonisolated private let protectedDataAvailability: any ProtectedDataAvailability
  nonisolated private let failureInjector: any PrivateStateStoreFailureInjecting
  nonisolated private let admissionController: any PrivateStateStoreAdmissionControlling
  nonisolated private let namespaceLockTimeoutNanoseconds: UInt64
  private var transactionProtectedDataIsAvailable = true
  private var latestResetEpoch: UInt64 = 0
  private var highestObservedClearEpoch: UInt64 = 0
  private var highestObservedSaveSequence: UInt64 = 0
  private var convenienceSaveSequence: UInt64 = 0
  private var convenienceResetEpoch: UInt64 = 0
  private var pendingConvenienceClearEpoch: UInt64?
  init() {
    injectedFileURL = nil
    protectedDataAvailability = SystemProtectedDataAvailability()
    failureInjector = NoPrivateStateStoreFailure()
    admissionController = ImmediatePrivateStateStoreAdmission()
    namespaceLockTimeoutNanoseconds =
      Self.defaultNamespaceLockTimeoutNanoseconds
  }
  init(protectedDataAvailability: any ProtectedDataAvailability) {
    injectedFileURL = nil
    self.protectedDataAvailability = protectedDataAvailability
    failureInjector = NoPrivateStateStoreFailure()
    admissionController = ImmediatePrivateStateStoreAdmission()
    namespaceLockTimeoutNanoseconds =
      Self.defaultNamespaceLockTimeoutNanoseconds
  }
  init(fileURL: URL) {
    injectedFileURL = fileURL
    protectedDataAvailability = SystemProtectedDataAvailability()
    failureInjector = NoPrivateStateStoreFailure()
    admissionController = ImmediatePrivateStateStoreAdmission()
    namespaceLockTimeoutNanoseconds =
      Self.defaultNamespaceLockTimeoutNanoseconds
  }
  init(
    fileURL: URL,
    protectedDataAvailability: any ProtectedDataAvailability
  ) {
    injectedFileURL = fileURL
    self.protectedDataAvailability = protectedDataAvailability
    failureInjector = NoPrivateStateStoreFailure()
    admissionController = ImmediatePrivateStateStoreAdmission()
    namespaceLockTimeoutNanoseconds =
      Self.defaultNamespaceLockTimeoutNanoseconds
  }
  init(
    fileURL: URL,
    protectedDataAvailability: any ProtectedDataAvailability,
    failureInjector: any PrivateStateStoreFailureInjecting,
    namespaceLockTimeoutNanoseconds: UInt64 =
      PrivateStateStore.defaultNamespaceLockTimeoutNanoseconds
  ) {
    injectedFileURL = fileURL
    self.protectedDataAvailability = protectedDataAvailability
    self.failureInjector = failureInjector
    admissionController = ImmediatePrivateStateStoreAdmission()
    self.namespaceLockTimeoutNanoseconds = namespaceLockTimeoutNanoseconds
  }
  init(
    fileURL: URL,
    protectedDataAvailability: any ProtectedDataAvailability,
    admissionController: any PrivateStateStoreAdmissionControlling
  ) {
    injectedFileURL = fileURL
    self.protectedDataAvailability = protectedDataAvailability
    failureInjector = NoPrivateStateStoreFailure()
    self.admissionController = admissionController
    namespaceLockTimeoutNanoseconds =
      Self.defaultNamespaceLockTimeoutNanoseconds
  }
  init(
    fileURL: URL,
    protectedDataAvailability: any ProtectedDataAvailability,
    namespaceLockTimeoutNanoseconds: UInt64
  ) {
    injectedFileURL = fileURL
    self.protectedDataAvailability = protectedDataAvailability
    failureInjector = NoPrivateStateStoreFailure()
    admissionController = ImmediatePrivateStateStoreAdmission()
    self.namespaceLockTimeoutNanoseconds = namespaceLockTimeoutNanoseconds
  }
  nonisolated static func defaultFileURL(
    fileManager: FileManager = .default
  ) throws -> URL {
    let applicationSupportURL: URL
    do {
      applicationSupportURL = try fileManager.url(
        for: .applicationSupportDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
    } catch {
      throw PrivateStateStoreError.unavailableDirectory
    }
    return
      applicationSupportURL
      .appendingPathComponent(Self.stateDirectoryName, isDirectory: true)
      .appendingPathComponent(Self.stateFileName, isDirectory: false)
  }

  nonisolated func pendingResetIntent() async throws -> PrivateStateResetIntent? {
    await admissionController.waitBeforeAdmission(to: .pendingResetIntent)
    try Task.checkCancellation()
    let isProtectedDataAvailable = await protectedDataAvailability.isAvailable
    try Task.checkCancellation()
    do {
      return try await pendingResetIntentTransaction(
        isProtectedDataAvailable: isProtectedDataAvailable
      )
    } catch let error as CancellationError {
      throw error
    } catch {
      guard await protectedDataAvailability.isAvailable else {
        throw PrivateStateStoreError.protectedDataUnavailable
      }
      throw error
    }
  }

  nonisolated func load() async throws -> PrivateStateEnvelope? {
    await admissionController.waitBeforeAdmission(to: .load)
    try Task.checkCancellation()
    let isProtectedDataAvailable = await protectedDataAvailability.isAvailable
    try Task.checkCancellation()
    do {
      return try await loadTransaction(
        isProtectedDataAvailable: isProtectedDataAvailable
      )
    } catch let error as CancellationError {
      throw error
    } catch {
      guard await protectedDataAvailability.isAvailable else {
        throw PrivateStateStoreError.protectedDataUnavailable
      }
      throw error
    }
  }

  nonisolated func save(
    _ state: PrivateStateEnvelope,
    token: PrivateStateSaveToken
  ) async throws -> PrivateStateSaveResult {
    await admissionController.waitBeforeAdmission(to: .save)
    try Task.checkCancellation()
    let isProtectedDataAvailable = await protectedDataAvailability.isAvailable
    try Task.checkCancellation()
    do {
      return try await saveTransaction(
        state,
        token: token,
        isProtectedDataAvailable: isProtectedDataAvailable
      )
    } catch let error as CancellationError {
      throw error
    } catch {
      guard await protectedDataAvailability.isAvailable else {
        throw PrivateStateStoreError.protectedDataUnavailable
      }
      throw error
    }
  }

  nonisolated func clear(
    resetEpoch: UInt64
  ) async throws -> PrivateStateClearResult {
    await admissionController.waitBeforeAdmission(to: .clear)
    try Task.checkCancellation()
    let isProtectedDataAvailable = await protectedDataAvailability.isAvailable
    try Task.checkCancellation()
    do {
      return try await clearTransaction(
        resetEpoch: resetEpoch,
        isProtectedDataAvailable: isProtectedDataAvailable
      )
    } catch let error as CancellationError {
      throw error
    } catch {
      guard await protectedDataAvailability.isAvailable else {
        throw PrivateStateStoreError.protectedDataUnavailable
      }
      throw error
    }
  }

  nonisolated func completeReset(
    resetEpoch: UInt64
  ) async throws -> PrivateStateResetCompletionResult {
    await admissionController.waitBeforeAdmission(to: .completeReset)
    try Task.checkCancellation()
    let isProtectedDataAvailable = await protectedDataAvailability.isAvailable
    try Task.checkCancellation()
    do {
      return try await completeResetTransaction(
        resetEpoch: resetEpoch,
        isProtectedDataAvailable: isProtectedDataAvailable
      )
    } catch let error as CancellationError {
      throw error
    } catch {
      guard await protectedDataAvailability.isAvailable else {
        throw PrivateStateStoreError.protectedDataUnavailable
      }
      throw error
    }
  }

  func save(
    _ state: PrivateStateEnvelope
  ) async throws -> PrivateStateSaveResult {
    try Task.checkCancellation()
    let latestSequence = max(
      convenienceSaveSequence,
      highestObservedSaveSequence
    )
    guard latestSequence < UInt64.max else {
      throw PrivateStateStoreError.writeVerification
    }
    let sequence = latestSequence + 1
    let token = PrivateStateSaveToken(
      resetEpoch: max(convenienceResetEpoch, latestResetEpoch),
      sequence: sequence
    )
    let isProtectedDataAvailable = await protectedDataAvailability.isAvailable
    do {
      let result = try saveTransaction(
        state,
        token: token,
        isProtectedDataAvailable: isProtectedDataAvailable
      )
      convenienceSaveSequence = sequence
      return result
    } catch let error as CancellationError {
      throw error
    } catch {
      guard await protectedDataAvailability.isAvailable else {
        throw PrivateStateStoreError.protectedDataUnavailable
      }
      throw error
    }
  }

  func clear() async throws -> PrivateStateClearResult {
    try Task.checkCancellation()
    let resetEpoch: UInt64
    if let pendingConvenienceClearEpoch,
      pendingConvenienceClearEpoch >= latestResetEpoch,
      pendingConvenienceClearEpoch > highestObservedClearEpoch
    {
      resetEpoch = pendingConvenienceClearEpoch
    } else {
      self.pendingConvenienceClearEpoch = nil
      let latestEpoch = max(convenienceResetEpoch, latestResetEpoch)
      guard latestEpoch < UInt64.max else {
        throw PrivateStateStoreError.writeVerification
      }
      resetEpoch = latestEpoch + 1
      pendingConvenienceClearEpoch = resetEpoch
    }
    let isProtectedDataAvailable = await protectedDataAvailability.isAvailable
    do {
      let result = try clearTransaction(
        resetEpoch: resetEpoch,
        isProtectedDataAvailable: isProtectedDataAvailable
      )
      convenienceResetEpoch = max(convenienceResetEpoch, resetEpoch)
      pendingConvenienceClearEpoch = nil
      return result
    } catch let error as CancellationError {
      throw error
    } catch {
      guard await protectedDataAvailability.isAvailable else {
        throw PrivateStateStoreError.protectedDataUnavailable
      }
      throw error
    }
  }

  #if DEBUG
    func enqueueCancelledSaveForTesting(
      _ state: PrivateStateEnvelope,
      token: PrivateStateSaveToken,
      isProtectedDataAvailable: Bool = true
    ) -> Task<PrivateStateSaveResult, Error> {
      let task = Task {
        try saveTransaction(
          state,
          token: token,
          isProtectedDataAvailable: isProtectedDataAvailable
        )
      }
      task.cancel()
      return task
    }

    func enqueueCancelledClearForTesting(
      resetEpoch: UInt64,
      isProtectedDataAvailable: Bool = true
    ) -> Task<PrivateStateClearResult, Error> {
      let task = Task {
        try clearTransaction(
          resetEpoch: resetEpoch,
          isProtectedDataAvailable: isProtectedDataAvailable
        )
      }
      task.cancel()
      return task
    }
  #endif

  private func pendingResetIntentTransaction(
    isProtectedDataAvailable: Bool
  ) throws -> PrivateStateResetIntent? {
    try Task.checkCancellation()
    let intent = try withProtectedDataSnapshot(isProtectedDataAvailable) {
      try pendingResetIntentSynchronous()
    }
    if let intent, intent.resetEpoch > latestResetEpoch {
      latestResetEpoch = intent.resetEpoch
      highestObservedSaveSequence = 0
    }
    return intent
  }

  private func loadTransaction(
    isProtectedDataAvailable: Bool
  ) throws -> PrivateStateEnvelope? {
    try Task.checkCancellation()
    return try withProtectedDataSnapshot(isProtectedDataAvailable) {
      try loadSynchronous()
    }
  }

  private func loadSynchronous() throws -> PrivateStateEnvelope? {
    try requireProtectedData()
    let fileURL = try validatedFileURL()
    guard
      let parentDirectory = try openParentDirectory(
        for: fileURL,
        createIfMissing: false
      )
    else {
      try requireProtectedData()
      return nil
    }
    defer { closeDescriptor(parentDirectory) }
    return try withNamespaceLock(
      in: parentDirectory,
      at: fileURL.deletingLastPathComponent()
    ) {
      guard try readResetIntent(in: parentDirectory) == nil else {
        throw PrivateStateStoreError.resetIntentPresent
      }
      let fileName = try fileName(for: fileURL)
      try preflightNoStalePrivateState(
        in: parentDirectory,
        currentFileName: fileName
      )
      guard
        let entry = try entryMetadata(
          in: parentDirectory,
          named: fileName
        )
      else {
        try requireProtectedData()
        return nil
      }
      try requireExclusiveRegularFile(entry)
      let data = try boundedRead(
        in: parentDirectory,
        named: fileName,
        expectedIdentity: entry.identity
      )
      let state = try decode(data)
      try verifyExpectedEntry(
        in: parentDirectory,
        named: fileName,
        expectedIdentity: entry.identity
      )
      try preflightNoStalePrivateState(
        in: parentDirectory,
        currentFileName: fileName
      )
      return state
    }
  }
  private func saveTransaction(
    _ state: PrivateStateEnvelope,
    token: PrivateStateSaveToken,
    isProtectedDataAvailable: Bool
  ) throws -> PrivateStateSaveResult {
    try Task.checkCancellation()
    guard token.resetEpoch >= latestResetEpoch else {
      return .superseded
    }
    if token.resetEpoch > latestResetEpoch {
      latestResetEpoch = token.resetEpoch
      highestObservedSaveSequence = 0
    }
    guard token.sequence > highestObservedSaveSequence else {
      return .superseded
    }

    let result = try withProtectedDataSnapshot(isProtectedDataAvailable) {
      try saveSynchronous(state)
    }
    highestObservedSaveSequence = token.sequence
    return result
  }

  private func saveSynchronous(
    _ state: PrivateStateEnvelope
  ) throws -> PrivateStateSaveResult {
    try requireProtectedData()
    guard state.schemaVersion == PrivateStateEnvelope.currentSchemaVersion else {
      throw PrivateStateStoreError.unsupportedSchema(state.schemaVersion)
    }
    try validateEnvelope(state)
    let fileURL = try validatedFileURL()
    let fileName = try fileName(for: fileURL)
    let parentDirectory = try prepareParentDirectory(for: fileURL)
    defer { closeDescriptor(parentDirectory) }
    return try withNamespaceLock(
      in: parentDirectory,
      at: fileURL.deletingLastPathComponent()
    ) {
      guard try readResetIntent(in: parentDirectory) == nil else {
        throw PrivateStateStoreError.resetIntentPresent
      }
      try preflightNoStalePrivateState(
        in: parentDirectory,
        currentFileName: fileName
      )
      let existingState = try validatedExistingState(
        in: parentDirectory,
        named: fileName
      )
      let directoryMetadata = try fileMetadata(for: parentDirectory)
      guard directoryMetadata.kind == .directory else {
        throw PrivateStateStoreError.unavailableDirectory
      }
      try applyPrivateAttributes(
        to: parentDirectory,
        at: fileURL.deletingLastPathComponent(),
        failure: .unavailableDirectory,
        expectedIdentity: directoryMetadata.identity
      )
      let data: Data
      do {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        data = try encoder.encode(state)
      } catch {
        throw PrivateStateStoreError.writeVerification
      }
      guard data.count <= Self.maximumDataByteCount else {
        throw PrivateStateStoreError.oversizedData
      }
      let namespace = try replaceDataAtomically(
        data,
        in: parentDirectory,
        parentURL: fileURL.deletingLastPathComponent(),
        replacing: fileName,
        expectedExistingState: existingState,
        verifyStagedData: { stagedData in
          guard stagedData == data else {
            throw PrivateStateStoreError.writeVerification
          }
          guard try decode(stagedData) == state else {
            throw PrivateStateStoreError.writeVerification
          }
        }
      )
      return .installed(namespace: namespace)
    }
  }
  #if DEBUG
    func seedCorruptStateForUITesting() async throws {
      let isProtectedDataAvailable = await protectedDataAvailability.isAvailable
      do {
        try withProtectedDataSnapshot(isProtectedDataAvailable) {
          try seedCorruptStateForUITestingSynchronous()
        }
      } catch {
        guard await protectedDataAvailability.isAvailable else {
          throw PrivateStateStoreError.protectedDataUnavailable
        }
        throw error
      }
    }

    private func seedCorruptStateForUITestingSynchronous() throws {
      try requireProtectedData()
      if let intent = try pendingResetIntentSynchronous() {
        _ = try completeResetSynchronous(resetEpoch: intent.resetEpoch)
      }
      let fileURL = try validatedFileURL()
      let fileName = try fileName(for: fileURL)
      let parentDirectory = try prepareParentDirectory(for: fileURL)
      defer { closeDescriptor(parentDirectory) }
      try withNamespaceLock(
        in: parentDirectory,
        at: fileURL.deletingLastPathComponent()
      ) {
        try preflightNoStalePrivateState(
          in: parentDirectory,
          currentFileName: fileName
        )
        let existingState = try validatedExistingState(
          in: parentDirectory,
          named: fileName
        )
        let directoryMetadata = try fileMetadata(for: parentDirectory)
        guard directoryMetadata.kind == .directory else {
          throw PrivateStateStoreError.unavailableDirectory
        }
        try applyPrivateAttributes(
          to: parentDirectory,
          at: fileURL.deletingLastPathComponent(),
          failure: .unavailableDirectory,
          expectedIdentity: directoryMetadata.identity
        )
        let invalidJSONData = Data("{".utf8)
        guard invalidJSONData.count <= Self.maximumDataByteCount else {
          throw PrivateStateStoreError.oversizedData
        }
        _ = try replaceDataAtomically(
          invalidJSONData,
          in: parentDirectory,
          parentURL: fileURL.deletingLastPathComponent(),
          replacing: fileName,
          expectedExistingState: existingState,
          verifyStagedData: { stagedData in
            guard stagedData == invalidJSONData else {
              throw PrivateStateStoreError.writeVerification
            }
          }
        )
        guard
          let installedEntry = try entryMetadata(
            in: parentDirectory,
            named: fileName
          )
        else {
          throw PrivateStateStoreError.writeVerification
        }
        let installedData = try boundedRead(
          in: parentDirectory,
          named: fileName,
          expectedIdentity: installedEntry.identity
        )
        do {
          _ = try decode(installedData)
          throw PrivateStateStoreError.writeVerification
        } catch PrivateStateStoreError.corruptData {
          return
        } catch PrivateStateStoreError.protectedDataUnavailable {
          throw PrivateStateStoreError.protectedDataUnavailable
        } catch {
          throw PrivateStateStoreError.writeVerification
        }
      }
    }
  #endif

  private func clearTransaction(
    resetEpoch: UInt64,
    isProtectedDataAvailable: Bool
  ) throws -> PrivateStateClearResult {
    try Task.checkCancellation()
    guard resetEpoch >= latestResetEpoch else {
      return .superseded
    }
    if resetEpoch == highestObservedClearEpoch {
      let intent = try withProtectedDataSnapshot(isProtectedDataAvailable) {
        try pendingResetIntentSynchronous()
      }
      guard intent?.resetEpoch == resetEpoch else {
        return .superseded
      }
    } else if resetEpoch < highestObservedClearEpoch {
      return .superseded
    }
    latestResetEpoch = resetEpoch
    highestObservedSaveSequence = 0

    let result: PrivateStateClearResult = try withProtectedDataSnapshot(
      isProtectedDataAvailable
    ) {
      PrivateStateClearResult.completed(
        try clearSynchronous(resetEpoch: resetEpoch)
      )
    }
    highestObservedClearEpoch = resetEpoch
    return result
  }

  private func completeResetTransaction(
    resetEpoch: UInt64,
    isProtectedDataAvailable: Bool
  ) throws -> PrivateStateResetCompletionResult {
    try Task.checkCancellation()
    guard resetEpoch >= latestResetEpoch else {
      return .superseded
    }
    latestResetEpoch = resetEpoch
    highestObservedSaveSequence = 0
    let namespace = try withProtectedDataSnapshot(
      isProtectedDataAvailable
    ) {
      try completeResetSynchronous(resetEpoch: resetEpoch)
    }
    return .completed(namespace: namespace)
  }

  private func clearSynchronous(
    resetEpoch: UInt64
  ) throws -> PrivateStateClearReceipt {
    try requireProtectedData()
    let fileURL = try validatedFileURL()
    let parentDirectory = try prepareParentDirectory(for: fileURL)
    defer { closeDescriptor(parentDirectory) }
    return try withNamespaceLock(
      in: parentDirectory,
      at: fileURL.deletingLastPathComponent()
    ) {
      try clearLocked(
        in: parentDirectory,
        fileURL: fileURL,
        resetEpoch: resetEpoch
      )
    }
  }

  private func clearLocked(
    in parentDirectory: Int32,
    fileURL: URL,
    resetEpoch: UInt64
  ) throws -> PrivateStateClearReceipt {
    let fileName = try fileName(for: fileURL)
    let fileNames = recognizedStateFileNames(currentFileName: fileName)
    let initialFileEntries = try fileNames.map { name in
      (name, try preflightClearEntry(in: parentDirectory, named: name))
    }
    let initialStageEntries = try preflightStages(
      in: parentDirectory,
      matching: Self.recognizedStageFileNamePrefixes
    )

    var fileDispositions: [String: PrivateStateRemovalDisposition] = Dictionary(
      uniqueKeysWithValues: initialFileEntries.map { name, metadata in
        (
          name,
          metadata == nil
            ? PrivateStateRemovalDisposition.alreadyAbsent
            : PrivateStateRemovalDisposition.retained
        )
      }
    )
    var stageDispositions: [String: PrivateStateRemovalDisposition] = Dictionary(
      uniqueKeysWithValues: initialStageEntries.map {
        ($0.name, PrivateStateRemovalDisposition.retained)
      }
    )

    do {
      try ensureResetIntent(
        resetEpoch: resetEpoch,
        in: parentDirectory,
        parentURL: fileURL.deletingLastPathComponent()
      )
    } catch PrivateStateStoreError.resetIntentSynchronizationUncertain {
      throw PrivateStateStoreError.clearVerification(
        receipt: makeClearReceipt(
          fileDispositions: fileDispositions,
          stageDispositions: stageDispositions,
          namespace: .changed(.synchronizationUncertain)
        )
      )
    }

    for (name, metadata) in initialFileEntries {
      fileDispositions[name] = removePreflightedEntry(
        metadata,
        in: parentDirectory,
        named: name
      )
    }
    for entry in initialStageEntries {
      stageDispositions[entry.name] = removePreflightedEntry(
        entry.metadata,
        in: parentDirectory,
        named: entry.name
      )
    }

    do {
      try failIfInjected(at: .clearFinalVerification)
    } catch {
      throw PrivateStateStoreError.clearVerification(
        receipt: makeClearReceipt(
          fileDispositions: fileDispositions,
          stageDispositions: stageDispositions,
          namespace: .notRequired
        )
      )
    }

    let lateFileEntries = try fileNames.map { name in
      (name, try preflightClearEntry(in: parentDirectory, named: name))
    }
    for (name, metadata) in lateFileEntries where metadata != nil {
      fileDispositions[name] = removePreflightedEntry(
        metadata,
        in: parentDirectory,
        named: name
      )
    }
    let lateStageEntries = try preflightStages(
      in: parentDirectory,
      matching: Self.recognizedStageFileNamePrefixes
    )
    for entry in lateStageEntries {
      stageDispositions[entry.name] = removePreflightedEntry(
        entry.metadata,
        in: parentDirectory,
        named: entry.name
      )
    }

    let didChangeNamespace =
      fileDispositions.values.contains(PrivateStateRemovalDisposition.removed)
      || stageDispositions.values.contains(PrivateStateRemovalDisposition.removed)
    let namespace: PrivateStateClearNamespaceResult =
      didChangeNamespace
      ? .changed(synchronizeNamespace(parentDirectory))
      : .notRequired

    let finalFileEntries = try fileNames.map { name in
      (name, try preflightClearEntry(in: parentDirectory, named: name))
    }
    for (name, metadata) in finalFileEntries where metadata != nil {
      fileDispositions[name] = PrivateStateRemovalDisposition.retained
    }
    let finalStageEntries = try preflightStages(
      in: parentDirectory,
      matching: Self.recognizedStageFileNamePrefixes
    )
    for entry in finalStageEntries {
      stageDispositions[entry.name] = PrivateStateRemovalDisposition.retained
    }

    let receipt = makeClearReceipt(
      fileDispositions: fileDispositions,
      stageDispositions: stageDispositions,
      namespace: namespace
    )
    guard receipt.isComplete else {
      throw PrivateStateStoreError.clearVerification(receipt: receipt)
    }
    return receipt
  }

  private func pendingResetIntentSynchronous() throws
    -> PrivateStateResetIntent?
  {
    try requireProtectedData()
    let fileURL = try validatedFileURL()
    guard
      let parentDirectory = try openParentDirectory(
        for: fileURL,
        createIfMissing: false
      )
    else {
      return nil
    }
    defer { closeDescriptor(parentDirectory) }
    return try withNamespaceLock(
      in: parentDirectory,
      at: fileURL.deletingLastPathComponent()
    ) {
      try readResetIntent(in: parentDirectory)
    }
  }

  private func completeResetSynchronous(
    resetEpoch: UInt64
  ) throws -> PrivateStateClearNamespaceResult {
    try requireProtectedData()
    let fileURL = try validatedFileURL()
    guard
      let parentDirectory = try openParentDirectory(
        for: fileURL,
        createIfMissing: false
      )
    else {
      return .notRequired
    }
    defer { closeDescriptor(parentDirectory) }
    return try withNamespaceLock(
      in: parentDirectory,
      at: fileURL.deletingLastPathComponent()
    ) {
      let fileName = try fileName(for: fileURL)
      let fileRecords = try recognizedStateFileNames(
        currentFileName: fileName
      ).map { name in
        PrivateStateRemovalRecord(
          name: name,
          disposition:
            try preflightClearEntry(in: parentDirectory, named: name) == nil
            ? .alreadyAbsent
            : .retained
        )
      }
      let stageRecords = try preflightStages(
        in: parentDirectory,
        matching: Self.recognizedStageFileNamePrefixes
      ).map {
        PrivateStateRemovalRecord(
          name: $0.name,
          disposition: .retained
        )
      }
      let cleanupReceipt = PrivateStateClearReceipt(
        files: fileRecords,
        stages: stageRecords,
        namespace: .notRequired
      )
      guard cleanupReceipt.isComplete else {
        throw PrivateStateStoreError.clearVerification(
          receipt: cleanupReceipt
        )
      }
      guard let intent = try readResetIntent(in: parentDirectory) else {
        return .notRequired
      }
      guard intent.resetEpoch == resetEpoch else {
        throw PrivateStateStoreError.resetIntentMismatch
      }
      guard
        let marker = try preflightClearEntry(
          in: parentDirectory,
          named: Self.resetIntentFileName
        )
      else {
        throw PrivateStateStoreError.resetIntentMismatch
      }
      try removeRegularEntry(
        in: parentDirectory,
        named: Self.resetIntentFileName,
        expectedIdentity: marker.identity,
        failure: .writeVerification
      )
      guard
        try entryMetadata(
          in: parentDirectory,
          named: Self.resetIntentFileName
        ) == nil
      else {
        throw PrivateStateStoreError.resetIntentSynchronizationUncertain
      }
      let namespace = synchronizeNamespace(
        parentDirectory,
        at: .resetIntentRemovalSynchronization
      )
      guard namespace == .synchronized else {
        try? ensureResetIntent(
          resetEpoch: resetEpoch,
          in: parentDirectory,
          parentURL: fileURL.deletingLastPathComponent()
        )
        throw PrivateStateStoreError.resetIntentSynchronizationUncertain
      }
      return .changed(.synchronized)
    }
  }

  private func readResetIntent(
    in parentDirectory: Int32
  ) throws -> PrivateStateResetIntent? {
    guard
      let entry = try entryMetadata(
        in: parentDirectory,
        named: Self.resetIntentFileName
      )
    else {
      return nil
    }
    try requireExclusiveRegularFile(entry)
    let data = try boundedRead(
      in: parentDirectory,
      named: Self.resetIntentFileName,
      expectedIdentity: entry.identity
    )
    guard
      let value = String(data: data, encoding: .utf8),
      let resetEpoch = UInt64(value),
      resetEpoch > 0,
      value == String(resetEpoch)
    else {
      throw PrivateStateStoreError.resetIntentMismatch
    }
    try verifyExpectedEntry(
      in: parentDirectory,
      named: Self.resetIntentFileName,
      expectedIdentity: entry.identity
    )
    return PrivateStateResetIntent(resetEpoch: resetEpoch)
  }

  private func ensureResetIntent(
    resetEpoch: UInt64,
    in parentDirectory: Int32,
    parentURL: URL
  ) throws {
    guard resetEpoch > 0 else {
      throw PrivateStateStoreError.resetIntentMismatch
    }
    let existingIntent: PrivateStateResetIntent?
    do {
      existingIntent = try readResetIntent(in: parentDirectory)
    } catch PrivateStateStoreError.resetIntentMismatch {
      guard
        let corruptMarker = try preflightClearEntry(
          in: parentDirectory,
          named: Self.resetIntentFileName
        )
      else {
        throw PrivateStateStoreError.resetIntentMismatch
      }
      try removeRegularEntry(
        in: parentDirectory,
        named: Self.resetIntentFileName,
        expectedIdentity: corruptMarker.identity,
        failure: .writeVerification
      )
      guard
        try entryMetadata(
          in: parentDirectory,
          named: Self.resetIntentFileName
        ) == nil
      else {
        throw PrivateStateStoreError.resetIntentSynchronizationUncertain
      }
      existingIntent = nil
    }
    if let intent = existingIntent {
      guard intent.resetEpoch == resetEpoch else {
        throw PrivateStateStoreError.resetIntentMismatch
      }
      guard
        let marker = try preflightClearEntry(
          in: parentDirectory,
          named: Self.resetIntentFileName
        )
      else {
        throw PrivateStateStoreError.resetIntentMismatch
      }
      let markerDescriptor = try openRegularFile(
        in: parentDirectory,
        named: Self.resetIntentFileName,
        expectedIdentity: marker.identity
      )
      defer { closeDescriptor(markerDescriptor) }
      do {
        try synchronize(
          markerDescriptor,
          at: .resetIntentFileSynchronization
        )
        try verifyExpectedEntry(
          in: parentDirectory,
          named: Self.resetIntentFileName,
          expectedIdentity: marker.identity
        )
        guard
          synchronizeNamespace(
            parentDirectory,
            at: .resetIntentNamespaceSynchronization
          ) == .synchronized
        else {
          throw PrivateStateStoreError.resetIntentSynchronizationUncertain
        }
      } catch PrivateStateStoreError.protectedDataUnavailable {
        throw PrivateStateStoreError.protectedDataUnavailable
      } catch {
        throw PrivateStateStoreError.resetIntentSynchronizationUncertain
      }
      return
    }
    try requireProtectedData()
    #if canImport(Darwin)
      var markerDescriptor = Self.resetIntentFileName.withCString {
        Darwin.openat(
          parentDirectory,
          $0,
          O_RDWR | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW,
          0o600
        )
      }
      guard markerDescriptor >= 0 else {
        throw protectedDataError(or: .writeVerification)
      }
      let markerURL = parentURL.appendingPathComponent(
        Self.resetIntentFileName,
        isDirectory: false
      )
      do {
        let metadata = try fileMetadata(for: markerDescriptor)
        try requireExclusiveRegularFile(metadata)
        try applyPrivateAttributes(
          to: markerDescriptor,
          at: markerURL,
          failure: .writeVerification,
          expectedIdentity: metadata.identity
        )
        let data = Data(String(resetEpoch).utf8)
        try writeData(data, to: markerDescriptor)
        try synchronize(
          markerDescriptor,
          at: .resetIntentFileSynchronization
        )
        let storedData = try boundedRead(
          from: markerDescriptor,
          expectedIdentity: metadata.identity
        )
        guard storedData == data else {
          throw PrivateStateStoreError.writeVerification
        }
        try verifyExpectedEntry(
          in: parentDirectory,
          named: Self.resetIntentFileName,
          expectedIdentity: metadata.identity
        )
        closeDescriptor(markerDescriptor)
        markerDescriptor = -1
        guard
          synchronizeNamespace(
            parentDirectory,
            at: .resetIntentNamespaceSynchronization
          ) == .synchronized
        else {
          throw PrivateStateStoreError.resetIntentSynchronizationUncertain
        }
      } catch let error as PrivateStateStoreError {
        if markerDescriptor >= 0 {
          closeDescriptor(markerDescriptor)
        }
        if error == .protectedDataUnavailable {
          throw error
        }
        throw PrivateStateStoreError.resetIntentSynchronizationUncertain
      } catch {
        if markerDescriptor >= 0 {
          closeDescriptor(markerDescriptor)
        }
        throw PrivateStateStoreError.resetIntentSynchronizationUncertain
      }
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
  }

  private func recognizedStateFileNames(
    currentFileName: String
  ) -> [String] {
    Array(Set([currentFileName] + Self.legacyStateFileNames)).sorted()
  }

  private func emptyClearReceipt(
    currentFileName: String
  ) -> PrivateStateClearReceipt {
    PrivateStateClearReceipt(
      files: recognizedStateFileNames(currentFileName: currentFileName).map {
        PrivateStateRemovalRecord(name: $0, disposition: .alreadyAbsent)
      },
      stages: [],
      namespace: .notRequired
    )
  }

  private func makeClearReceipt(
    fileDispositions: [String: PrivateStateRemovalDisposition],
    stageDispositions: [String: PrivateStateRemovalDisposition],
    namespace: PrivateStateClearNamespaceResult
  ) -> PrivateStateClearReceipt {
    PrivateStateClearReceipt(
      files: fileDispositions.keys.sorted().map { name in
        PrivateStateRemovalRecord(
          name: name,
          disposition: fileDispositions[name] ?? .retained
        )
      },
      stages: stageDispositions.keys.sorted().map { name in
        PrivateStateRemovalRecord(
          name: name,
          disposition: stageDispositions[name] ?? .retained
        )
      },
      namespace: namespace
    )
  }
  private func resolvedFileURL() throws -> URL {
    if let injectedFileURL {
      return injectedFileURL
    }
    return try Self.defaultFileURL()
  }
  private func validatedFileURL() throws -> URL {
    try requireProtectedData()
    let fileURL = try resolvedFileURL()
    guard fileURL.isFileURL, fileURL.path.hasPrefix("/") else {
      throw PrivateStateStoreError.unsafePath
    }
    let standardizedFileURL = fileURL.standardizedFileURL
    try validateParentDirectory(
      at: standardizedFileURL.deletingLastPathComponent()
    )
    _ = try fileName(for: standardizedFileURL)
    return standardizedFileURL
  }
  private func validateParentDirectory(at directoryURL: URL) throws {
    var currentURL = URL(fileURLWithPath: "/", isDirectory: true)
    let components = directoryURL.standardizedFileURL.pathComponents
    for component in components.dropFirst() {
      currentURL.appendPathComponent(component, isDirectory: true)
      switch try pathKind(at: currentURL) {
      case .missing:
        return
      case .directory:
        continue
      case .regularFile:
        throw PrivateStateStoreError.unavailableDirectory
      case .symbolicLink
      where Self.trustedSystemAncestorPaths.contains(currentURL.path):
        continue
      case .symbolicLink, .specialFile:
        throw PrivateStateStoreError.unsafePath
      }
    }
  }
  private func fileName(for fileURL: URL) throws -> String {
    let fileName = fileURL.lastPathComponent
    guard
      !fileName.isEmpty,
      fileName != ".",
      fileName != "..",
      !fileName.contains("/")
    else {
      throw PrivateStateStoreError.unsafePath
    }
    return fileName
  }
  private func staleStateFileNames(
    excluding currentFileName: String
  ) -> [String] {
    Self.legacyStateFileNames
      .filter { $0 != currentFileName }
      .sorted()
  }

  private func preflightNoStalePrivateState(
    in parentDirectory: Int32,
    currentFileName: String,
    allowingStageNamed allowedStageName: String? = nil
  ) throws {
    _ = try preflightClearEntry(
      in: parentDirectory,
      named: currentFileName
    )
    let staleFileNames = try staleStateFileNames(
      excluding: currentFileName
    ).compactMap { name in
      try preflightClearEntry(in: parentDirectory, named: name) == nil
        ? nil
        : name
    }
    let staleStageNames = try preflightStages(
      in: parentDirectory,
      matching: Self.recognizedStageFileNamePrefixes
    )
    .map(\.name)
    .filter { $0 != allowedStageName }
    .sorted()
    let entries = (staleFileNames + staleStageNames).sorted()
    guard entries.isEmpty else {
      throw PrivateStateStoreError.stalePrivateStatePresent(entries: entries)
    }
  }
  private func prepareParentDirectory(for fileURL: URL) throws -> Int32 {
    guard
      let directoryDescriptor = try openParentDirectory(
        for: fileURL,
        createIfMissing: true
      )
    else {
      throw PrivateStateStoreError.unavailableDirectory
    }
    return directoryDescriptor
  }
  private func openParentDirectory(
    for fileURL: URL,
    createIfMissing: Bool
  ) throws -> Int32? {
    try requireProtectedData()
    #if canImport(Darwin)
      let rootDescriptor = "/".withCString {
        Darwin.open($0, O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW)
      }
      guard rootDescriptor >= 0 else {
        throw protectedDataError(or: .unavailableDirectory)
      }
      var currentDescriptor = rootDescriptor
      defer {
        if currentDescriptor >= 0 {
          closeDescriptor(currentDescriptor)
        }
      }
      for component in secureDirectoryComponents(
        for: fileURL.deletingLastPathComponent()
      ) {
        guard
          let nextDescriptor = try openDirectoryComponent(
            named: component,
            in: currentDescriptor,
            createIfMissing: createIfMissing
          )
        else {
          return nil
        }
        closeDescriptor(currentDescriptor)
        currentDescriptor = nextDescriptor
      }
      let parentDirectory = currentDescriptor
      currentDescriptor = -1
      return parentDirectory
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
  }
  private func withNamespaceLock<T>(
    in parentDirectory: Int32,
    at directoryURL: URL,
    operation: () throws -> T
  ) throws -> T {
    try requireProtectedData()
    let expectedIdentity = try namespaceDirectoryIdentity(
      for: parentDirectory,
      at: directoryURL
    )
    try failIfInjected(at: .namespaceLockAttempt)
    try acquireNamespaceLock(parentDirectory)

    let operationResult: NamespaceOperationResult<T>
    do {
      try verifyNamespaceDirectoryIdentity(
        expectedIdentity,
        for: parentDirectory,
        at: directoryURL
      )
      try failIfInjected(at: .namespaceLockAcquired)
      try verifyNamespaceDirectoryIdentity(
        expectedIdentity,
        for: parentDirectory,
        at: directoryURL
      )
      let value = try operation()
      try verifyNamespaceDirectoryIdentity(
        expectedIdentity,
        for: parentDirectory,
        at: directoryURL
      )
      operationResult = .success(value)
    } catch {
      do {
        try verifyNamespaceDirectoryIdentity(
          expectedIdentity,
          for: parentDirectory,
          at: directoryURL
        )
        operationResult = .failure(error)
      } catch {
        operationResult = .failure(error)
      }
    }

    #if canImport(Darwin)
      guard forgeSystemFlock(parentDirectory, LOCK_UN) == 0 else {
        throw protectedDataError(or: .namespaceLockUnavailable)
      }
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
    switch operationResult {
    case .success(let value):
      return value
    case .failure(let error):
      throw error
    }
  }

  private func acquireNamespaceLock(
    _ parentDirectory: Int32
  ) throws {
    #if canImport(Darwin)
      let start = try monotonicNanoseconds()
      let deadline: UInt64
      let addition = start.addingReportingOverflow(
        namespaceLockTimeoutNanoseconds
      )
      deadline = addition.overflow ? UInt64.max : addition.partialValue

      while true {
        try Task.checkCancellation()
        try requireProtectedData()
        if forgeSystemFlock(
          parentDirectory,
          LOCK_EX | LOCK_NB
        ) == 0 {
          return
        }
        let lockError = errno
        guard
          lockError == EWOULDBLOCK
            || lockError == EAGAIN
            || lockError == EINTR
        else {
          throw protectedDataError(or: .namespaceLockUnavailable)
        }
        let now = try monotonicNanoseconds()
        guard now < deadline else {
          throw protectedDataError(or: .namespaceLockUnavailable)
        }
        let retryNanoseconds = min(
          Self.namespaceLockRetryNanoseconds,
          deadline - now
        )
        var requestedSleep = timespec(
          tv_sec: 0,
          tv_nsec: Int(retryNanoseconds)
        )
        var remainingSleep = timespec()
        while Darwin.nanosleep(
          &requestedSleep,
          &remainingSleep
        ) != 0 {
          guard errno == EINTR else {
            throw protectedDataError(or: .namespaceLockUnavailable)
          }
          try Task.checkCancellation()
          try requireProtectedData()
          requestedSleep = remainingSleep
        }
      }
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
  }

  private func monotonicNanoseconds() throws -> UInt64 {
    #if canImport(Darwin)
      var time = timespec()
      guard Darwin.clock_gettime(CLOCK_MONOTONIC, &time) == 0 else {
        throw protectedDataError(or: .namespaceLockUnavailable)
      }
      guard time.tv_sec >= 0, time.tv_nsec >= 0 else {
        throw PrivateStateStoreError.namespaceLockUnavailable
      }
      let seconds = UInt64(time.tv_sec)
      let nanoseconds = UInt64(time.tv_nsec)
      let product = seconds.multipliedReportingOverflow(by: 1_000_000_000)
      guard !product.overflow else {
        throw PrivateStateStoreError.namespaceLockUnavailable
      }
      let total = product.partialValue.addingReportingOverflow(nanoseconds)
      guard !total.overflow else {
        throw PrivateStateStoreError.namespaceLockUnavailable
      }
      return total.partialValue
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
  }

  private func namespaceDirectoryIdentity(
    for parentDirectory: Int32,
    at directoryURL: URL
  ) throws -> FileIdentity {
    let descriptorMetadata = try fileMetadata(for: parentDirectory)
    guard descriptorMetadata.kind == .directory else {
      throw PrivateStateStoreError.unsafePath
    }
    try verifyNamespaceDirectoryIdentity(
      descriptorMetadata.identity,
      for: parentDirectory,
      at: directoryURL
    )
    return descriptorMetadata.identity
  }

  private func verifyNamespaceDirectoryIdentity(
    _ expectedIdentity: FileIdentity,
    for parentDirectory: Int32,
    at directoryURL: URL
  ) throws {
    let descriptorMetadata = try fileMetadata(for: parentDirectory)
    guard
      descriptorMetadata.kind == .directory,
      descriptorMetadata.identity == expectedIdentity,
      let pathMetadata = try fileMetadata(at: directoryURL),
      pathMetadata.kind == .directory,
      pathMetadata.identity == expectedIdentity
    else {
      throw PrivateStateStoreError.unsafePath
    }
  }
  private func secureDirectoryComponents(for directoryURL: URL) -> [String] {
    var components = Array(
      directoryURL.standardizedFileURL.pathComponents.dropFirst()
    )
    if components.first == "var" {
      components = ["private", "var"] + Array(components.dropFirst())
    }
    return components
  }
  private func openDirectoryComponent(
    named name: String,
    in parentDescriptor: Int32,
    createIfMissing: Bool
  ) throws -> Int32? {
    try requireProtectedData()
    #if canImport(Darwin)
      let flags = O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW
      for _ in 0..<3 {
        let directoryDescriptor = name.withCString {
          Darwin.openat(parentDescriptor, $0, flags)
        }
        if directoryDescriptor >= 0 {
          return directoryDescriptor
        }
        let openError = errno
        guard createIfMissing, openError == ENOENT else {
          if openError == ENOENT {
            return nil
          }
          throw protectedDataError(or: .unsafePath)
        }
        try requireProtectedData()
        let makeDirectoryResult = name.withCString {
          Darwin.mkdirat(parentDescriptor, $0, 0o700)
        }
        if makeDirectoryResult == 0 {
          try synchronize(
            parentDescriptor,
            at: .directorySynchronization
          )
          continue
        }
        if errno == EEXIST {
          continue
        }
        throw protectedDataError(or: .unavailableDirectory)
      }
      throw protectedDataError(or: .unavailableDirectory)
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
  }
  private func validatedExistingState(
    in parentDirectory: Int32,
    named fileName: String
  ) throws -> ValidatedExistingState? {
    guard
      let entry = try entryMetadata(
        in: parentDirectory,
        named: fileName
      )
    else {
      return nil
    }
    try requireExclusiveRegularFile(entry)
    let data = try boundedRead(
      in: parentDirectory,
      named: fileName,
      expectedIdentity: entry.identity
    )
    _ = try decode(data)
    try verifyExpectedEntry(
      in: parentDirectory,
      named: fileName,
      expectedIdentity: entry.identity
    )
    return ValidatedExistingState(metadata: entry, data: data)
  }
  private func boundedRead(
    in parentDirectory: Int32,
    named fileName: String,
    expectedIdentity: FileIdentity
  ) throws -> Data {
    try requireProtectedData()
    let fileDescriptor = try openRegularFile(
      in: parentDirectory,
      named: fileName,
      expectedIdentity: expectedIdentity
    )
    defer { closeDescriptor(fileDescriptor) }
    return try boundedRead(
      from: fileDescriptor,
      expectedIdentity: expectedIdentity
    )
  }
  private func boundedRead(
    from fileDescriptor: Int32,
    expectedIdentity: FileIdentity
  ) throws -> Data {
    try requireProtectedData()
    let metadataBeforeRead = try fileMetadata(for: fileDescriptor)
    guard
      metadataBeforeRead.kind == .regularFile,
      metadataBeforeRead.identity == expectedIdentity,
      metadataBeforeRead.linkCount == 1
    else {
      throw PrivateStateStoreError.unsafePath
    }
    #if canImport(Darwin)
      guard Darwin.lseek(fileDescriptor, 0, SEEK_SET) == 0 else {
        throw protectedDataError(or: .corruptData)
      }
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
    let handle = FileHandle(
      fileDescriptor: fileDescriptor,
      closeOnDealloc: false
    )
    let data: Data
    do {
      data = try handle.read(upToCount: Self.maximumDataByteCount + 1) ?? Data()
    } catch {
      throw protectedDataError(or: .corruptData)
    }
    try requireProtectedData()
    guard data.count <= Self.maximumDataByteCount else {
      throw PrivateStateStoreError.oversizedData
    }
    let metadataAfterRead = try fileMetadata(for: fileDescriptor)
    guard
      metadataAfterRead.kind == .regularFile,
      metadataAfterRead.identity == expectedIdentity,
      metadataAfterRead.linkCount == 1
    else {
      throw PrivateStateStoreError.unsafePath
    }
    return data
  }
  private func decode(_ data: Data) throws -> PrivateStateEnvelope {
    try requireProtectedData()
    guard data.count <= Self.maximumDataByteCount else {
      throw PrivateStateStoreError.oversizedData
    }
    do {
      try PrivateJSONPreflight.validate(
        data,
        maximumByteCount: Self.maximumDataByteCount,
        maximumNestingDepth: Self.maximumJSONNestingDepth
      )
    } catch {
      throw protectedDataError(or: .corruptData)
    }
    try requireProtectedData()
    struct SchemaProbe: Decodable {
      let schemaVersion: Int
    }
    let schemaVersion: Int
    do {
      schemaVersion = try JSONDecoder().decode(SchemaProbe.self, from: data)
        .schemaVersion
    } catch {
      throw protectedDataError(or: .corruptData)
    }
    try requireProtectedData()
    guard schemaVersion == PrivateStateEnvelope.currentSchemaVersion else {
      throw PrivateStateStoreError.unsupportedSchema(schemaVersion)
    }
    let state: PrivateStateEnvelope
    do {
      state = try JSONDecoder().decode(PrivateStateEnvelope.self, from: data)
    } catch {
      throw protectedDataError(or: .corruptData)
    }
    try requireProtectedData()
    try validateEnvelope(state)
    try validateExactJSONStructure(of: data, matching: state)
    return state
  }

  private func validateEnvelope(
    _ state: PrivateStateEnvelope
  ) throws {
    guard !state.localProfileID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw PrivateStateStoreError.invalidProfile
    }
    let semesterDesk = state.semesterDesk
    guard semesterDesk.profileID == state.localProfileID else {
      throw PrivateStateStoreError.profileMismatch
    }
    if case .failure = UniversitySemesterDeskEngine.validate(state: semesterDesk) {
      throw PrivateStateStoreError.invalidSemesterDesk
    }
  }
  private func validateExactJSONStructure(
    of data: Data,
    matching state: PrivateStateEnvelope
  ) throws {
    let originalObject: Any
    let canonicalObject: Any
    do {
      originalObject = try JSONSerialization.jsonObject(with: data)
      let encoder = JSONEncoder()
      encoder.outputFormatting = [.sortedKeys]
      let canonicalData = try encoder.encode(state)
      canonicalObject = try JSONSerialization.jsonObject(with: canonicalData)
    } catch {
      throw protectedDataError(or: .corruptData)
    }
    try requireProtectedData()
    let canonicalOriginalData: Data
    let canonicalDecodedData: Data
    do {
      canonicalOriginalData = try JSONSerialization.data(
        withJSONObject: originalObject,
        options: [.sortedKeys]
      )
      canonicalDecodedData = try JSONSerialization.data(
        withJSONObject: canonicalObject,
        options: [.sortedKeys]
      )
    } catch {
      throw protectedDataError(or: .corruptData)
    }
    guard canonicalOriginalData == canonicalDecodedData else {
      throw protectedDataError(or: .corruptData)
    }
  }
  private func applyPrivateAttributes(
    to fileDescriptor: Int32,
    at url: URL,
    failure: PrivateStateStoreError,
    expectedIdentity: FileIdentity? = nil,
    failurePoint: PrivateStateStoreFailurePoint? = nil,
    verificationFailurePoint: PrivateStateStoreFailurePoint? = nil
  ) throws {
    try requireProtectedData()
    do {
      if let expectedIdentity {
        guard
          try fileMetadata(for: fileDescriptor).identity
            == expectedIdentity
        else {
          throw PrivateStateStoreError.unsafePath
        }
      }
      if let failurePoint {
        try failIfInjected(at: failurePoint)
      }
      if let expectedIdentity {
        try verifyIdentity(expectedIdentity, at: url)
      }
      #if !targetEnvironment(simulator)
        guard
          Darwin.fcntl(
            fileDescriptor,
            F_SETPROTECTIONCLASS,
            Self.completeFileProtectionClass
          ) == 0
        else {
          throw failure
        }
      #endif
      var resourceValues = URLResourceValues()
      resourceValues.isExcludedFromBackup = true
      var mutableURL = url
      try mutableURL.setResourceValues(resourceValues)
      if let verificationFailurePoint {
        try failIfInjected(at: verificationFailurePoint)
      }
      let verifiedValues = try mutableURL.resourceValues(
        forKeys: [.isExcludedFromBackupKey]
      )
      guard verifiedValues.isExcludedFromBackup == true else {
        throw failure
      }
      #if !targetEnvironment(simulator)
        guard
          Darwin.fcntl(fileDescriptor, F_GETPROTECTIONCLASS)
            == Self.completeFileProtectionClass
        else {
          throw failure
        }
      #endif
      if let expectedIdentity {
        try verifyIdentity(expectedIdentity, at: url)
        guard
          try fileMetadata(for: fileDescriptor).identity
            == expectedIdentity
        else {
          throw PrivateStateStoreError.unsafePath
        }
      }
    } catch let error as PrivateStateStoreError {
      throw protectedDataError(or: error)
    } catch {
      throw protectedDataError(or: failure)
    }
  }
  private func replaceDataAtomically(
    _ data: Data,
    in parentDirectory: Int32,
    parentURL: URL,
    replacing fileName: String,
    expectedExistingState: ValidatedExistingState?,
    verifyStagedData: (Data) throws -> Void
  ) throws -> PrivateStateNamespaceSynchronization {
    try requireProtectedData()
    let expectedExistingIdentity = expectedExistingState?.metadata.identity
    try verifyExpectedEntry(
      in: parentDirectory,
      named: fileName,
      expectedIdentity: expectedExistingIdentity
    )
    let stage = try createStage(in: parentDirectory)
    let stageDescriptor = stage.descriptor
    var candidateIsAtStagePath = true
    do {
      try applyPrivateAttributes(
        to: stageDescriptor,
        at: parentURL.appendingPathComponent(stage.name, isDirectory: false),
        failure: .writeVerification,
        expectedIdentity: stage.identity,
        failurePoint: .stageAttributes,
        verificationFailurePoint: .stageAttributeVerification
      )
      try verifyStage(
        named: stage.name,
        in: parentDirectory,
        expectedIdentity: stage.identity
      )
      try requireExclusiveRegularFile(
        fileMetadata(for: stageDescriptor)
      )
      try writeData(data, to: stageDescriptor)
      try synchronize(stageDescriptor, at: .stageSynchronization)
      let stagedData = try boundedRead(
        from: stageDescriptor,
        expectedIdentity: stage.identity
      )
      try verifyStagedDataForInstallation(
        stagedData,
        verification: verifyStagedData
      )
      try verifyExpectedEntry(
        in: parentDirectory,
        named: fileName,
        expectedIdentity: expectedExistingIdentity
      )
      try verifyStage(
        named: stage.name,
        in: parentDirectory,
        expectedIdentity: stage.identity
      )
      try failIfInjected(at: .replacement)
      try verifyExpectedEntry(
        in: parentDirectory,
        named: fileName,
        expectedIdentity: expectedExistingIdentity
      )
      try verifyStage(
        named: stage.name,
        in: parentDirectory,
        expectedIdentity: stage.identity
      )
      let finalStagedData = try boundedRead(
        from: stageDescriptor,
        expectedIdentity: stage.identity
      )
      try verifyStagedDataForInstallation(
        finalStagedData,
        verification: verifyStagedData
      )
      try preflightNoStalePrivateState(
        in: parentDirectory,
        currentFileName: fileName,
        allowingStageNamed: stage.name
      )
      try verifyExpectedEntry(
        in: parentDirectory,
        named: fileName,
        expectedIdentity: expectedExistingIdentity
      )
      try verifyStage(
        named: stage.name,
        in: parentDirectory,
        expectedIdentity: stage.identity
      )
      try requireProtectedData()
      let installation = try installStage(
        stage,
        in: parentDirectory,
        replacing: fileName,
        existingState: expectedExistingState
      )
      candidateIsAtStagePath = false
      do {
        try failIfInjected(at: .installedVerification)
        try verifyInstalledStage(
          stage,
          installation: installation,
          in: parentDirectory,
          replacing: fileName,
          verifyStagedData: verifyStagedData
        )
      } catch {
        do {
          try rollbackStageInstallation(
            stage,
            installation: installation,
            in: parentDirectory,
            replacing: fileName
          )
          candidateIsAtStagePath = true
        } catch {
          throw PrivateStateStoreError.stageCleanupUncertain
        }
        throw error
      }
      if case .swappedExisting(let existingState) = installation {
        do {
          try removeRegularEntry(
            in: parentDirectory,
            named: stage.name,
            expectedIdentity: existingState.metadata.identity,
            failure: .writeVerification
          )
        } catch {
          do {
            try rollbackStageInstallation(
              stage,
              installation: installation,
              in: parentDirectory,
              replacing: fileName
            )
            candidateIsAtStagePath = true
          } catch {
            throw PrivateStateStoreError.stageCleanupUncertain
          }
          throw error
        }
      }
      try verifyExpectedEntry(
        in: parentDirectory,
        named: fileName,
        expectedIdentity: stage.identity
      )
      guard
        try entryMetadata(
          in: parentDirectory,
          named: stage.name
        ) == nil
      else {
        throw PrivateStateStoreError.stageCleanupUncertain
      }
      try preflightNoStalePrivateState(
        in: parentDirectory,
        currentFileName: fileName
      )
      closeDescriptor(stageDescriptor)
      return synchronizeNamespace(parentDirectory)
    } catch let error as PrivateStateStoreError {
      closeDescriptor(stageDescriptor)
      guard candidateIsAtStagePath else {
        throw PrivateStateStoreError.stageCleanupUncertain
      }
      do {
        try removeFailedStage(
          named: stage.name,
          in: parentDirectory,
          expectedIdentity: stage.identity
        )
      } catch {
        throw PrivateStateStoreError.stageCleanupUncertain
      }
      throw error
    } catch {
      closeDescriptor(stageDescriptor)
      guard candidateIsAtStagePath else {
        throw PrivateStateStoreError.stageCleanupUncertain
      }
      do {
        try removeFailedStage(
          named: stage.name,
          in: parentDirectory,
          expectedIdentity: stage.identity
        )
      } catch {
        throw PrivateStateStoreError.stageCleanupUncertain
      }
      throw protectedDataError(or: .writeVerification)
    }
  }
  private func verifyStagedDataForInstallation(
    _ data: Data,
    verification: (Data) throws -> Void
  ) throws {
    do {
      try verification(data)
    } catch PrivateStateStoreError.protectedDataUnavailable {
      throw PrivateStateStoreError.protectedDataUnavailable
    } catch {
      throw protectedDataError(or: .writeVerification)
    }
  }
  private func installStage(
    _ stage: StagedFile,
    in parentDirectory: Int32,
    replacing fileName: String,
    existingState: ValidatedExistingState?
  ) throws -> StageInstallation {
    #if canImport(Darwin)
      let result: Int32
      if let existingState {
        result = stage.name.withCString { stageName in
          fileName.withCString { destinationName in
            Darwin.renameatx_np(
              parentDirectory,
              stageName,
              parentDirectory,
              destinationName,
              UInt32(RENAME_SWAP)
            )
          }
        }
        guard result == 0 else {
          throw protectedDataError(or: .writeVerification)
        }
        return .swappedExisting(existingState)
      }
      result = stage.name.withCString { stageName in
        fileName.withCString { destinationName in
          Darwin.renameat(
            parentDirectory,
            stageName,
            parentDirectory,
            destinationName
          )
        }
      }
      guard result == 0 else {
        throw protectedDataError(or: .writeVerification)
      }
      return .createdNew
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
  }
  private func verifyInstalledStage(
    _ stage: StagedFile,
    installation: StageInstallation,
    in parentDirectory: Int32,
    replacing fileName: String,
    verifyStagedData: (Data) throws -> Void
  ) throws {
    try verifyExpectedEntry(
      in: parentDirectory,
      named: fileName,
      expectedIdentity: stage.identity
    )
    try requireExclusiveRegularFile(
      fileMetadata(for: stage.descriptor)
    )
    let installedData = try boundedRead(
      from: stage.descriptor,
      expectedIdentity: stage.identity
    )
    try verifyStagedDataForInstallation(
      installedData,
      verification: verifyStagedData
    )
    let currentStages = try preflightStages(
      in: parentDirectory,
      matching: [Self.stageFileNamePrefix]
    )
    switch installation {
    case .createdNew:
      guard currentStages.isEmpty else {
        throw PrivateStateStoreError.unsafePath
      }
    case .swappedExisting(let existingState):
      guard
        currentStages.count == 1,
        currentStages[0].name == stage.name,
        currentStages[0].metadata.identity
          == existingState.metadata.identity,
        currentStages[0].metadata.linkCount == 1
      else {
        throw PrivateStateStoreError.unsafePath
      }
    }
  }
  private func rollbackStageInstallation(
    _ stage: StagedFile,
    installation: StageInstallation,
    in parentDirectory: Int32,
    replacing fileName: String
  ) throws {
    try verifyExpectedEntry(
      in: parentDirectory,
      named: fileName,
      expectedIdentity: stage.identity
    )
    #if canImport(Darwin)
      switch installation {
      case .createdNew:
        guard
          stage.name.withCString({ stageName in
            fileName.withCString { destinationName in
              Darwin.renameat(
                parentDirectory,
                destinationName,
                parentDirectory,
                stageName
              )
            }
          }) == 0
        else {
          throw PrivateStateStoreError.stageCleanupUncertain
        }
        try verifyExpectedEntry(
          in: parentDirectory,
          named: fileName,
          expectedIdentity: nil
        )
      case .swappedExisting(let existingState):
        try verifyExpectedEntry(
          in: parentDirectory,
          named: stage.name,
          expectedIdentity: existingState.metadata.identity
        )
        guard
          stage.name.withCString({ stageName in
            fileName.withCString { destinationName in
              Darwin.renameatx_np(
                parentDirectory,
                stageName,
                parentDirectory,
                destinationName,
                UInt32(RENAME_SWAP)
              )
            }
          }) == 0
        else {
          throw PrivateStateStoreError.stageCleanupUncertain
        }
        try verifyExpectedEntry(
          in: parentDirectory,
          named: fileName,
          expectedIdentity: existingState.metadata.identity
        )
        let restoredData = try boundedRead(
          in: parentDirectory,
          named: fileName,
          expectedIdentity: existingState.metadata.identity
        )
        guard restoredData == existingState.data else {
          throw PrivateStateStoreError.stageCleanupUncertain
        }
      }
      try verifyStage(
        named: stage.name,
        in: parentDirectory,
        expectedIdentity: stage.identity
      )
    #else
      throw PrivateStateStoreError.stageCleanupUncertain
    #endif
  }
  private func createStage(in parentDirectory: Int32) throws -> StagedFile {
    try failIfInjected(at: .stageCreation)
    #if canImport(Darwin)
      let flags = O_RDWR | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW
      for _ in 0..<3 {
        let stageName = Self.stageFileNamePrefix + UUID().uuidString
        let stageDescriptor = stageName.withCString {
          Darwin.openat(parentDirectory, $0, flags, 0o600)
        }
        if stageDescriptor < 0 {
          guard errno == EEXIST else {
            throw protectedDataError(or: .writeVerification)
          }
          continue
        }
        do {
          let metadata = try fileMetadata(for: stageDescriptor)
          guard
            metadata.kind == .regularFile,
            metadata.linkCount == 1
          else {
            closeDescriptor(stageDescriptor)
            throw PrivateStateStoreError.unsafePath
          }
          return StagedFile(
            name: stageName,
            descriptor: stageDescriptor,
            identity: metadata.identity
          )
        } catch {
          closeDescriptor(stageDescriptor)
          throw error
        }
      }
      throw protectedDataError(or: .writeVerification)
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
  }
  private func writeData(_ data: Data, to fileDescriptor: Int32) throws {
    try requireProtectedData()
    do {
      let handle = FileHandle(
        fileDescriptor: fileDescriptor,
        closeOnDealloc: false
      )
      try handle.write(contentsOf: data)
    } catch {
      throw protectedDataError(or: .writeVerification)
    }
    try requireProtectedData()
  }
  private func synchronize(
    _ fileDescriptor: Int32,
    at failurePoint: PrivateStateStoreFailurePoint
  ) throws {
    try failIfInjected(at: failurePoint)
    try requireProtectedData()
    #if canImport(Darwin)
      guard Darwin.fsync(fileDescriptor) == 0 else {
        throw protectedDataError(or: .writeVerification)
      }
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
    try requireProtectedData()
  }
  private func verifyExpectedEntry(
    in parentDirectory: Int32,
    named fileName: String,
    expectedIdentity: FileIdentity?
  ) throws {
    let currentEntry = try entryMetadata(
      in: parentDirectory,
      named: fileName
    )
    if let expectedIdentity {
      guard
        let currentEntry,
        currentEntry.kind == .regularFile,
        currentEntry.identity == expectedIdentity,
        currentEntry.linkCount == 1
      else {
        throw PrivateStateStoreError.unsafePath
      }
      return
    }
    guard currentEntry == nil else {
      throw PrivateStateStoreError.unsafePath
    }
  }
  private func verifyStage(
    named stageName: String,
    in parentDirectory: Int32,
    expectedIdentity: FileIdentity
  ) throws {
    guard
      let stageEntry = try entryMetadata(
        in: parentDirectory,
        named: stageName
      ),
      stageEntry.kind == .regularFile,
      stageEntry.identity == expectedIdentity,
      stageEntry.linkCount == 1
    else {
      throw PrivateStateStoreError.unsafePath
    }
  }
  private func removeRegularEntry(
    in parentDirectory: Int32,
    named fileName: String,
    expectedIdentity: FileIdentity,
    failure: PrivateStateStoreError
  ) throws {
    try verifyStage(
      named: fileName,
      in: parentDirectory,
      expectedIdentity: expectedIdentity
    )
    try requireProtectedData()
    #if canImport(Darwin)
      let removeResult = fileName.withCString {
        Darwin.unlinkat(parentDirectory, $0, 0)
      }
      guard removeResult == 0 else {
        throw protectedDataError(or: failure)
      }
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
  }

  private struct NamedEntry {
    let name: String
    let metadata: FileMetadata
  }

  private func preflightClearEntry(
    in parentDirectory: Int32,
    named fileName: String
  ) throws -> FileMetadata? {
    guard let entry = try entryMetadata(in: parentDirectory, named: fileName) else {
      return nil
    }
    try requireExclusiveRegularFile(entry)
    return entry
  }

  private func preflightStages(
    in parentDirectory: Int32,
    matching prefixes: [String]
  ) throws -> [NamedEntry] {
    let names = try directoryEntryNames(in: parentDirectory)
    return
      try names
      .filter { name in
        prefixes.contains { name.hasPrefix($0) }
      }
      .sorted()
      .map { name in
        guard
          let metadata = try entryMetadata(
            in: parentDirectory,
            named: name
          ),
          metadata.kind == .regularFile,
          metadata.linkCount == 1
        else {
          throw PrivateStateStoreError.unsafePath
        }
        return NamedEntry(name: name, metadata: metadata)
      }
  }

  private func directoryEntryNames(
    in parentDirectory: Int32
  ) throws -> [String] {
    #if canImport(Darwin)
      let duplicatedDescriptor = Darwin.dup(parentDirectory)
      guard duplicatedDescriptor >= 0 else {
        throw protectedDataError(or: .unsafePath)
      }
      guard Darwin.lseek(duplicatedDescriptor, 0, SEEK_SET) >= 0 else {
        closeDescriptor(duplicatedDescriptor)
        throw protectedDataError(or: .unsafePath)
      }
      guard let directory = Darwin.fdopendir(duplicatedDescriptor) else {
        closeDescriptor(duplicatedDescriptor)
        throw protectedDataError(or: .unsafePath)
      }
      defer { Darwin.closedir(directory) }

      var names: [String] = []
      var injectedEnumerationError = false
      while true {
        errno = 0
        let entry: UnsafeMutablePointer<dirent>?
        if injectedEnumerationError {
          errno = EIO
          entry = nil
        } else {
          entry = Darwin.readdir(directory)
        }
        guard let entry else {
          guard errno == 0 else {
            throw protectedDataError(or: .unsafePath)
          }
          break
        }
        let capacity = MemoryLayout.size(ofValue: entry.pointee.d_name)
        let name = withUnsafePointer(to: &entry.pointee.d_name) { pointer in
          pointer.withMemoryRebound(
            to: CChar.self,
            capacity: capacity
          ) {
            String(cString: $0)
          }
        }
        guard name != ".", name != ".." else {
          continue
        }
        guard
          name.utf8.count <= Self.maximumDirectoryEntryNameByteCount,
          names.count < Self.maximumDirectoryEntryCount
        else {
          throw PrivateStateStoreError.unsafePath
        }
        names.append(name)
        injectedEnumerationError =
          failureInjector.shouldFail(at: .directoryEnumeration)
      }
      return names
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
  }

  private func removePreflightedEntry(
    _ entry: FileMetadata?,
    in parentDirectory: Int32,
    named fileName: String
  ) -> PrivateStateRemovalDisposition {
    guard let entry else {
      return .alreadyAbsent
    }
    do {
      try removeRegularEntry(
        in: parentDirectory,
        named: fileName,
        expectedIdentity: entry.identity,
        failure: .writeVerification
      )
      guard try entryMetadata(in: parentDirectory, named: fileName) == nil else {
        return .retained
      }
      return .removed
    } catch {
      return .retained
    }
  }

  private func synchronizeNamespace(
    _ parentDirectory: Int32,
    at failurePoint: PrivateStateStoreFailurePoint = .directorySynchronization
  ) -> PrivateStateNamespaceSynchronization {
    do {
      try synchronize(parentDirectory, at: failurePoint)
      return .synchronized
    } catch {
      return .synchronizationUncertain
    }
  }
  private func removeFailedStage(
    named stageName: String,
    in parentDirectory: Int32,
    expectedIdentity: FileIdentity
  ) throws {
    try failIfInjected(at: .stageCleanupRemoval)
    try verifyStage(
      named: stageName,
      in: parentDirectory,
      expectedIdentity: expectedIdentity
    )
    #if canImport(Darwin)
      let removalResult = stageName.withCString {
        Darwin.unlinkat(parentDirectory, $0, 0)
      }
      guard removalResult == 0 else {
        throw protectedDataError(or: .stageCleanupUncertain)
      }
    #else
      throw protectedDataError(or: .stageCleanupUncertain)
    #endif
    guard try entryMetadata(in: parentDirectory, named: stageName) == nil else {
      throw PrivateStateStoreError.stageCleanupUncertain
    }
    try synchronize(
      parentDirectory,
      at: .stageCleanupSynchronization
    )
  }
  private func failIfInjected(
    at point: PrivateStateStoreFailurePoint
  ) throws {
    try requireProtectedData()
    guard !failureInjector.shouldFail(at: point) else {
      throw PrivateStateStoreError.writeVerification
    }
  }
  private enum PathKind: Equatable {
    case missing
    case directory
    case regularFile
    case symbolicLink
    case specialFile
  }
  private enum NamespaceOperationResult<T> {
    case success(T)
    case failure(any Error)
  }
  private struct FileIdentity: Equatable {
    let device: Int64
    let inode: UInt64
  }
  private struct FileMetadata: Equatable {
    let kind: PathKind
    let identity: FileIdentity
    let linkCount: UInt64
  }
  private struct StagedFile {
    let name: String
    let descriptor: Int32
    let identity: FileIdentity
  }
  private struct ValidatedExistingState {
    let metadata: FileMetadata
    let data: Data
  }
  private enum StageInstallation {
    case createdNew
    case swappedExisting(ValidatedExistingState)
  }
  private func verifyIdentity(
    _ expectedIdentity: FileIdentity,
    at url: URL
  ) throws {
    guard
      let metadata = try fileMetadata(at: url),
      metadata.identity == expectedIdentity
    else {
      throw PrivateStateStoreError.unsafePath
    }
  }

  private func openRegularFile(
    in parentDirectory: Int32,
    named fileName: String,
    expectedIdentity: FileIdentity
  ) throws -> Int32 {
    try verifyStage(
      named: fileName,
      in: parentDirectory,
      expectedIdentity: expectedIdentity
    )
    try requireProtectedData()
    try failIfInjected(at: .regularFileOpen)
    #if canImport(Darwin)
      let fileDescriptor = fileName.withCString {
        Darwin.openat(
          parentDirectory,
          $0,
          O_RDONLY | O_NONBLOCK | O_CLOEXEC | O_NOFOLLOW
        )
      }
      guard fileDescriptor >= 0 else {
        throw protectedDataError(or: .unsafePath)
      }
      do {
        let metadata = try fileMetadata(for: fileDescriptor)
        guard
          metadata.kind == .regularFile,
          metadata.identity == expectedIdentity,
          metadata.linkCount == 1
        else {
          throw PrivateStateStoreError.unsafePath
        }
        return fileDescriptor
      } catch {
        closeDescriptor(fileDescriptor)
        throw error
      }
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
  }
  private func requireExclusiveRegularFile(
    _ metadata: FileMetadata
  ) throws {
    guard
      metadata.kind == .regularFile,
      metadata.linkCount == 1
    else {
      throw PrivateStateStoreError.unsafePath
    }
  }
  private func entryMetadata(
    in parentDirectory: Int32,
    named fileName: String
  ) throws -> FileMetadata? {
    #if canImport(Darwin)
      var metadata = stat()
      let status = fileName.withCString {
        Darwin.fstatat(
          parentDirectory,
          $0,
          &metadata,
          AT_SYMLINK_NOFOLLOW
        )
      }
      guard status == 0 else {
        guard errno == ENOENT else {
          throw protectedDataError(or: .unsafePath)
        }
        return nil
      }
      return FileMetadata(
        kind: pathKind(for: metadata),
        identity: fileIdentity(for: metadata),
        linkCount: UInt64(metadata.st_nlink)
      )
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
  }
  private func fileMetadata(for fileDescriptor: Int32) throws -> FileMetadata {
    #if canImport(Darwin)
      var metadata = stat()
      guard Darwin.fstat(fileDescriptor, &metadata) == 0 else {
        throw protectedDataError(or: .unsafePath)
      }
      return FileMetadata(
        kind: pathKind(for: metadata),
        identity: fileIdentity(for: metadata),
        linkCount: UInt64(metadata.st_nlink)
      )
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
  }
  private func fileMetadata(at url: URL) throws -> FileMetadata? {
    #if canImport(Darwin)
      var metadata = stat()
      guard Darwin.lstat(url.path, &metadata) == 0 else {
        guard errno == ENOENT else {
          throw protectedDataError(or: .unsafePath)
        }
        return nil
      }
      return FileMetadata(
        kind: pathKind(for: metadata),
        identity: fileIdentity(for: metadata),
        linkCount: UInt64(metadata.st_nlink)
      )
    #else
      throw protectedDataError(or: .unsafePath)
    #endif
  }
  #if canImport(Darwin)
    private func pathKind(for metadata: stat) -> PathKind {
      switch metadata.st_mode & S_IFMT {
      case S_IFREG:
        .regularFile
      case S_IFDIR:
        .directory
      case S_IFLNK:
        .symbolicLink
      default:
        .specialFile
      }
    }
    private func fileIdentity(for metadata: stat) -> FileIdentity {
      FileIdentity(
        device: Int64(metadata.st_dev),
        inode: UInt64(metadata.st_ino)
      )
    }
  #endif
  private func closeDescriptor(_ fileDescriptor: Int32) {
    guard fileDescriptor >= 0 else {
      return
    }
    #if canImport(Darwin)
      _ = Darwin.close(fileDescriptor)
    #endif
  }
  private func pathKind(at url: URL) throws -> PathKind {
    try requireProtectedData()
    guard let metadata = try fileMetadata(at: url) else {
      return .missing
    }
    return metadata.kind
  }
  private func requireProtectedData() throws {
    guard transactionProtectedDataIsAvailable else {
      throw PrivateStateStoreError.protectedDataUnavailable
    }
  }
  private func protectedDataError(
    or fallback: PrivateStateStoreError
  ) -> PrivateStateStoreError {
    transactionProtectedDataIsAvailable
      ? fallback
      : .protectedDataUnavailable
  }

  private func withProtectedDataSnapshot<T>(
    _ isAvailable: Bool,
    operation: () throws -> T
  ) rethrows -> T {
    let previousAvailability = transactionProtectedDataIsAvailable
    transactionProtectedDataIsAvailable = isAvailable
    defer {
      transactionProtectedDataIsAvailable = previousAvailability
    }
    return try operation()
  }
}
