import Darwin
import Dispatch
import Foundation

struct ForgeSharedStateStoreTestHooks: Sendable {
  var beforeLockBinding: (@Sendable () -> Void)? = nil
  var beforeStagingRename: (@Sendable (String) -> Void)? = nil
  var failDirectorySync = false
  var lockAcquisitionTimeoutNanoseconds: UInt64 = 250_000_000
  var lockRetryIntervalNanoseconds: UInt64 = 5_000_000
  var monotonicTimeNanoseconds: @Sendable () -> UInt64 = {
    DispatchTime.now().uptimeNanoseconds
  }
  var waitForLockRetry: @Sendable (UInt64) -> Void = { nanoseconds in
    Thread.sleep(forTimeInterval: TimeInterval(nanoseconds) / 1_000_000_000)
  }
  var lockDescriptorOpened: (@Sendable (Int32) -> Void)? = nil
}

public enum ForgeSharedStateStoreError: Error, Equatable, Sendable {
  case appGroupUnavailable, coordinationUnavailable, corruptPendingDestination, corruptProjection
  case lockAcquisitionTimedOut
  case oversizedProjection, removalVerificationFailed, writeVerificationFailed
}

public enum ForgeSharedStateMutation: Equatable, Sendable {
  case unchanged
  case changed
}

public enum ForgeSharedStateNamespaceSynchronization: Equatable, Sendable {
  case notRequired
  case synchronized
  case synchronizationUncertain
}

public struct ForgeSharedStateMutationReceipt: Equatable, Sendable {
  public let mutation: ForgeSharedStateMutation
  public let namespace: ForgeSharedStateNamespaceSynchronization

  public init(
    mutation: ForgeSharedStateMutation,
    namespace: ForgeSharedStateNamespaceSynchronization
  ) {
    self.mutation = mutation
    self.namespace = namespace
  }
}

public struct ForgeSharedStateClearReceipt: Equatable, Sendable {
  public let mutation: ForgeSharedStateMutation
  public let projectionMutation: ForgeSharedStateMutation
  public let namespace: ForgeSharedStateNamespaceSynchronization

  public init(
    mutation: ForgeSharedStateMutation,
    projectionMutation: ForgeSharedStateMutation,
    namespace: ForgeSharedStateNamespaceSynchronization
  ) {
    self.mutation = mutation
    self.projectionMutation = projectionMutation
    self.namespace = namespace
  }
}

public struct ForgePendingDestinationConsumption: Equatable, Sendable {
  public let destination: ForgeDestination?
  public let namespace: ForgeSharedStateNamespaceSynchronization

  public init(
    destination: ForgeDestination?,
    namespace: ForgeSharedStateNamespaceSynchronization
  ) {
    self.destination = destination
    self.namespace = namespace
  }
}

public enum ForgeSemesterDeskProjectionStatus: String, Codable, Equatable, Sendable {
  case needsReview = "needs-review"
  case readyToWork = "ready-to-work"
  case comeBack = "come-back"
}

public struct ForgeSemesterDeskProjection: Codable, Equatable, Sendable {
  public let status: ForgeSemesterDeskProjectionStatus
  public let dueAt: Date?
  public let generatedAt: Date
  public let validUntil: Date

  public init(
    status: ForgeSemesterDeskProjectionStatus,
    dueAt: Date?,
    generatedAt: Date,
    validUntil: Date
  ) throws {
    try Self.validate(
      status: status,
      dueAt: dueAt,
      generatedAt: generatedAt,
      validUntil: validUntil
    )
    self.status = status
    self.dueAt = dueAt
    self.generatedAt = generatedAt
    self.validUntil = validUntil
  }

  private enum CodingKeys: String, CodingKey, CaseIterable {
    case status, dueAt, generatedAt, validUntil
  }

  private struct AnyCodingKey: CodingKey {
    let stringValue: String
    let intValue: Int?

    init(_ stringValue: String) {
      self.stringValue = stringValue
      intValue = nil
    }
    init?(stringValue: String) { self.init(stringValue) }
    init?(intValue: Int) {
      stringValue = String(intValue)
      self.intValue = intValue
    }
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: AnyCodingKey.self)
    guard Set(container.allKeys.map(\.stringValue)) == Set(CodingKeys.allCases.map(\.rawValue))
    else {
      throw Self.corrupt(decoder, "The Semester Desk projection has unknown or missing values.")
    }
    do {
      try self.init(
        status: container.decode(
          ForgeSemesterDeskProjectionStatus.self,
          forKey: AnyCodingKey(CodingKeys.status.rawValue)
        ),
        dueAt: container.decodeIfPresent(
          Date.self, forKey: AnyCodingKey(CodingKeys.dueAt.rawValue)
        ),
        generatedAt: container.decode(
          Date.self, forKey: AnyCodingKey(CodingKeys.generatedAt.rawValue)),
        validUntil: container.decode(
          Date.self, forKey: AnyCodingKey(CodingKeys.validUntil.rawValue))
      )
    } catch {
      throw Self.corrupt(decoder, "The Semester Desk projection values are invalid.")
    }
  }

  public func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(status, forKey: .status)
    try container.encode(dueAt, forKey: .dueAt)
    try container.encode(generatedAt, forKey: .generatedAt)
    try container.encode(validUntil, forKey: .validUntil)
  }

  func validate() throws {
    try Self.validate(
      status: status,
      dueAt: dueAt,
      generatedAt: generatedAt,
      validUntil: validUntil
    )
  }

  private static func corrupt(_ decoder: Decoder, _ description: String) -> DecodingError {
    .dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: description))
  }

  private static func validate(
    status: ForgeSemesterDeskProjectionStatus,
    dueAt: Date?,
    generatedAt: Date,
    validUntil: Date
  ) throws {
    guard
      [generatedAt, validUntil].allSatisfy({
        $0.timeIntervalSinceReferenceDate.isFinite
      }),
      generatedAt < validUntil,
      validUntil.timeIntervalSince(generatedAt) <= 24 * 60 * 60,
      dueAt?.timeIntervalSinceReferenceDate.isFinite ?? true
    else {
      throw ForgeSharedStateStoreError.corruptProjection
    }

    switch status {
    case .needsReview, .readyToWork:
      guard dueAt == nil else {
        throw ForgeSharedStateStoreError.corruptProjection
      }
    case .comeBack:
      guard let dueAt, dueAt > generatedAt else {
        throw ForgeSharedStateStoreError.corruptProjection
      }
    }
  }
}

private struct ProjectionJSONKeyScanner {
  private let bytes: [UInt8]
  private var index = 0
  private static let maximumDepth = 32

  init(_ data: Data) { bytes = Array(data) }

  mutating func rejectDuplicateTopLevelKeys() throws {
    skipWhitespace()
    try expect(0x7B)
    skipWhitespace()
    if consume(0x7D) {
      try requireEnd()
      return
    }
    var keys = Set<String>()
    while true {
      guard keys.insert(try readString()).inserted else {
        throw invalid()
      }
      skipWhitespace()
      try expect(0x3A)
      try skipValue()
      skipWhitespace()
      if consume(0x7D) {
        try requireEnd()
        return
      }
      try expect(0x2C)
      skipWhitespace()
    }
  }

  private mutating func skipValue() throws {
    skipWhitespace()
    let start = index
    var depth = 0
    var isString = false
    var isEscaped = false
    while index < bytes.count {
      let byte = bytes[index]
      if isString {
        if isEscaped {
          isEscaped = false
        } else if byte == 0x5C {
          isEscaped = true
        } else if byte == 0x22 {
          isString = false
        } else if byte < 0x20 {
          throw invalid()
        }
      } else if byte == 0x22 {
        isString = true
      } else if byte == 0x7B || byte == 0x5B {
        depth += 1
        guard depth <= Self.maximumDepth else { throw invalid() }
      } else if byte == 0x7D || byte == 0x5D {
        guard depth > 0 else {
          guard byte == 0x7D, index > start else { throw invalid() }
          return
        }
        depth -= 1
      } else if byte == 0x2C, depth == 0 {
        guard index > start else { throw invalid() }
        return
      } else if byte < 0x20 {
        throw invalid()
      }
      index += 1
    }
    throw invalid()
  }

  private mutating func readString() throws -> String {
    skipWhitespace()
    let start = index
    try expect(0x22)
    var isEscaped = false
    while index < bytes.count {
      let byte = bytes[index]
      index += 1
      if isEscaped {
        isEscaped = false
      } else if byte == 0x5C {
        isEscaped = true
      } else if byte == 0x22 {
        return try JSONDecoder().decode(String.self, from: Data(bytes[start..<index]))
      } else if byte < 0x20 {
        throw invalid()
      }
    }
    throw invalid()
  }

  private mutating func expect(_ byte: UInt8) throws {
    guard consume(byte) else { throw invalid() }
  }

  private mutating func consume(_ byte: UInt8) -> Bool {
    guard index < bytes.count, bytes[index] == byte else { return false }
    index += 1
    return true
  }

  private mutating func requireEnd() throws {
    skipWhitespace()
    guard index == bytes.count else { throw invalid() }
  }

  private mutating func skipWhitespace() {
    while index < bytes.count, isWhitespace(bytes[index]) { index += 1 }
  }

  private func isWhitespace(_ byte: UInt8) -> Bool {
    byte == 0x09 || byte == 0x0A || byte == 0x0D || byte == 0x20
  }

  private func invalid() -> ForgeSharedStateStoreError { .corruptProjection }
}

private enum ForgeSemesterDeskProjectionDecoder {
  static func decode(_ data: Data) throws -> ForgeSemesterDeskProjection {
    do {
      var scanner = ProjectionJSONKeyScanner(data)
      try scanner.rejectDuplicateTopLevelKeys()
      return try JSONDecoder().decode(ForgeSemesterDeskProjection.self, from: data)
    } catch {
      throw ForgeSharedStateStoreError.corruptProjection
    }
  }
}

public struct ForgeSharedStateStore {
  private enum StateFile: CaseIterable {
    case pendingDestination
    case projection

    var name: String {
      switch self {
      case .pendingDestination: "forge.pending-destination.v2"
      case .projection: "forge.semester-desk-projection.v2.json"
      }
    }

    var stagingName: String { "\(name).staging" }
  }

  private enum BoundedData {
    case absent
    case data(Data)
    case oversized
  }
  private enum RemovalResult { case absent, removed, failed }
  private struct RemovalReceipt {
    let removedNames: Set<String>
    let namespace: ForgeSharedStateNamespaceSynchronization
  }

  private struct FileIdentity: Equatable {
    let device: dev_t
    let inode: ino_t

    init(_ metadata: stat) {
      device = metadata.st_dev
      inode = metadata.st_ino
    }
  }

  private struct LockedDirectory {
    let descriptor: Int32
    let lock: FileIdentity
  }

  private final class InProcessLockRegistry: @unchecked Sendable {
    private let accessLock = NSLock()
    private var locks: [String: NSLock] = [:]

    func lock(for directory: URL) -> NSLock {
      accessLock.lock()
      defer { accessLock.unlock() }
      let key = directory.path
      if let lock = locks[key] {
        return lock
      }
      let lock = NSLock()
      locks[key] = lock
      return lock
    }
  }

  private static let appGroupIdentifier = "group.com.forgelearning.shared"
  private static let inProcessLockRegistry = InProcessLockRegistry()
  private static let lockFileName = "forge-shared-state-v4.lock"
  private static let maximumPendingDestinationByteCount = 32
  private static let maximumProjectionByteCount = 4_096
  private static let ioBufferByteCount = 1_024
  private static let obsoleteStateFileNames = [
    "forge.return-projection.v3.json",
    "forge.return-projection.v3.json.staging",
    "forge.pending-destination.v1",
    "forge.pending-destination.v1.staging",
    "forge.pending-focus.v3",
    "forge.pending-focus.v3.staging",
    "forge.due-return-projection.v2",
    "forge.due-return-projection.v2.staging",
    "forge.pending-focus.v2",
    "forge.pending-focus.v2.staging",
  ]

  private let sharedRootDirectory: URL
  private let inProcessLock: NSLock
  private let testHooks: ForgeSharedStateStoreTestHooks

  public init() throws {
    guard
      let sharedRootDirectory = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: Self.appGroupIdentifier
      )
    else { throw ForgeSharedStateStoreError.appGroupUnavailable }
    self.init(sharedRootDirectory: sharedRootDirectory)
  }

  init(
    sharedRootDirectory: URL,
    testHooks: ForgeSharedStateStoreTestHooks = .init()
  ) {
    self.sharedRootDirectory = sharedRootDirectory.standardizedFileURL
    inProcessLock = Self.inProcessLockRegistry.lock(for: self.sharedRootDirectory)
    self.testHooks = testHooks
  }

  @discardableResult
  public func saveProjection(
    _ projection: ForgeSemesterDeskProjection
  ) throws -> ForgeSharedStateMutationReceipt {
    try projection.validate()
    let data: Data
    do { data = try JSONEncoder().encode(projection) } catch {
      throw ForgeSharedStateStoreError.corruptProjection
    }
    guard data.count <= Self.maximumProjectionByteCount else {
      throw ForgeSharedStateStoreError.oversizedProjection
    }
    return try withExclusiveLock {
      try replace(data, for: .projection, in: $0)
    }
  }

  public func loadProjection() throws -> ForgeSemesterDeskProjection? {
    try withExclusiveLock { directory in
      switch try read(.projection, maximumByteCount: Self.maximumProjectionByteCount, in: directory)
      {
      case .absent:
        return nil
      case .oversized:
        _ = try removeStateFiles(for: .projection, in: directory)
        throw ForgeSharedStateStoreError.oversizedProjection
      case .data(let data):
        do {
          return try ForgeSemesterDeskProjectionDecoder.decode(data)
        } catch {
          _ = try removeStateFiles(for: .projection, in: directory)
          throw ForgeSharedStateStoreError.corruptProjection
        }
      }
    }
  }

  @discardableResult
  public func clearProjection() throws -> ForgeSharedStateMutationReceipt {
    try withExclusiveLock {
      try removeStateFiles(for: .projection, in: $0)
    }
  }

  public func setPendingDestination(_ destination: ForgeDestination) throws {
    let data = Data(destination.rawValue.utf8)
    guard data.count <= Self.maximumPendingDestinationByteCount else {
      throw ForgeSharedStateStoreError.corruptPendingDestination
    }
    try withExclusiveLock {
      _ = try replace(data, for: .pendingDestination, in: $0)
    }
  }

  public func consumePendingDestination() throws -> ForgePendingDestinationConsumption {
    try withExclusiveLock { directory in
      switch try read(
        .pendingDestination,
        maximumByteCount: Self.maximumPendingDestinationByteCount,
        in: directory
      ) {
      case .absent:
        return ForgePendingDestinationConsumption(
          destination: nil,
          namespace: .notRequired
        )
      case .oversized:
        _ = try removeStateFiles(for: .pendingDestination, in: directory)
        throw ForgeSharedStateStoreError.corruptPendingDestination
      case .data(let data):
        guard
          let value = String(data: data, encoding: .utf8),
          let destination = ForgeDestination(rawValue: value)
        else {
          _ = try removeStateFiles(for: .pendingDestination, in: directory)
          throw ForgeSharedStateStoreError.corruptPendingDestination
        }
        let receipt = try removeStateFiles(
          for: .pendingDestination,
          in: directory
        )
        guard receipt.mutation == .changed else {
          throw ForgeSharedStateStoreError.removalVerificationFailed
        }
        return ForgePendingDestinationConsumption(
          destination: destination,
          namespace: receipt.namespace
        )
      }
    }
  }

  @discardableResult
  public func purgeLegacyState() throws -> Bool {
    try withExclusiveLock { directory in
      removeFiles(Self.obsoleteStateFileNames, in: directory)
    }
  }

  @discardableResult
  public func clearAll() throws -> ForgeSharedStateClearReceipt {
    try withExclusiveLock { directory in
      let receipt = try removeFilesWithReceipt(
        allStateFileNames + Self.obsoleteStateFileNames,
        in: directory
      )
      let projectionNames = Set([
        StateFile.projection.name,
        StateFile.projection.stagingName,
      ])
      return ForgeSharedStateClearReceipt(
        mutation: receipt.removedNames.isEmpty ? .unchanged : .changed,
        projectionMutation:
          receipt.removedNames.isDisjoint(with: projectionNames)
          ? .unchanged
          : .changed,
        namespace: receipt.namespace
      )
    }
  }

  private var allStateFileNames: [String] {
    StateFile.allCases.flatMap { [$0.name, $0.stagingName] }
  }

  private func replace(
    _ data: Data,
    for stateFile: StateFile,
    in directory: LockedDirectory
  ) throws -> ForgeSharedStateMutationReceipt {
    guard removeFiles([stateFile.stagingName], in: directory) else {
      throw ForgeSharedStateStoreError.writeVerificationFailed
    }
    guard
      let staging = try openRegularFile(
        named: stateFile.stagingName,
        in: directory.descriptor,
        flags: O_CREAT | O_EXCL | O_WRONLY | O_CLOEXEC | O_NOFOLLOW
      )
    else { throw ForgeSharedStateStoreError.writeVerificationFailed }
    var descriptor = staging.descriptor
    var shouldRemoveStaging = true
    defer {
      if descriptor >= 0 { _ = close(descriptor) }
      if shouldRemoveStaging,
        (try? entryMatches(
          stateFile.stagingName,
          identity: staging.identity,
          in: directory.descriptor
        )) == true
      {
        _ = removeFiles([stateFile.stagingName], in: directory)
      }
    }
    try write(data, to: descriptor)
    try syncFile(descriptor)
    testHooks.beforeStagingRename?(stateFile.stagingName)
    try requireBoundLock(directory)
    guard
      try entryMatches(stateFile.stagingName, identity: staging.identity, in: directory.descriptor)
    else {
      throw ForgeSharedStateStoreError.writeVerificationFailed
    }
    if let target = try entryMetadata(named: stateFile.name, in: directory.descriptor),
      !isRegular(target)
    {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    guard renameEntry(from: stateFile.stagingName, to: stateFile.name, in: directory.descriptor)
    else {
      throw ForgeSharedStateStoreError.writeVerificationFailed
    }
    shouldRemoveStaging = false
    let didClose = close(descriptor) == 0
    descriptor = -1
    let didSyncDirectory = syncDirectory(directory.descriptor)
    guard didClose else {
      throw ForgeSharedStateStoreError.writeVerificationFailed
    }
    guard case .data(let actual) = try read(stateFile, maximumByteCount: data.count, in: directory),
      actual == data
    else {
      throw ForgeSharedStateStoreError.writeVerificationFailed
    }
    return ForgeSharedStateMutationReceipt(
      mutation: .changed,
      namespace: didSyncDirectory ? .synchronized : .synchronizationUncertain
    )
  }

  private func read(
    _ stateFile: StateFile,
    maximumByteCount: Int,
    in directory: LockedDirectory
  ) throws -> BoundedData {
    try requireBoundLock(directory)
    guard
      let file = try openRegularFile(
        named: stateFile.name,
        in: directory.descriptor,
        flags: O_RDONLY | O_CLOEXEC | O_NOFOLLOW,
        absentIsNil: true
      )
    else { return .absent }
    defer { _ = close(file.descriptor) }
    let byteCount = try regularFileByteCount(for: file.descriptor)
    guard byteCount <= maximumByteCount else { return .oversized }
    return .data(try readExactly(byteCount, from: file.descriptor))
  }

  private func removeStateFiles(
    for stateFile: StateFile,
    in directory: LockedDirectory
  ) throws -> ForgeSharedStateMutationReceipt {
    let receipt = try removeFilesWithReceipt(
      [stateFile.name, stateFile.stagingName],
      in: directory
    )
    return ForgeSharedStateMutationReceipt(
      mutation: receipt.removedNames.isEmpty ? .unchanged : .changed,
      namespace: receipt.namespace
    )
  }

  private func removeFiles(_ names: [String], in directory: LockedDirectory) -> Bool {
    guard let receipt = try? removeFilesWithReceipt(names, in: directory) else {
      return false
    }
    return receipt.namespace != .synchronizationUncertain
  }

  private func removeFilesWithReceipt(
    _ names: [String],
    in directory: LockedDirectory
  ) throws -> RemovalReceipt {
    try requireBoundLock(directory)
    let entries = try names.map { name -> (name: String, identity: FileIdentity?) in
      guard let metadata = try entryMetadata(named: name, in: directory.descriptor) else {
        return (name, nil)
      }
      guard isRegular(metadata) else {
        throw ForgeSharedStateStoreError.removalVerificationFailed
      }
      return (name, FileIdentity(metadata))
    }
    var removedNames = Set<String>()
    for entry in entries {
      switch removePreflightedFile(
        named: entry.name,
        expectedIdentity: entry.identity,
        in: directory.descriptor
      ) {
      case .absent:
        break
      case .removed:
        removedNames.insert(entry.name)
      case .failed:
        throw ForgeSharedStateStoreError.removalVerificationFailed
      }
    }
    let namespace: ForgeSharedStateNamespaceSynchronization
    if removedNames.isEmpty {
      namespace = .notRequired
    } else {
      namespace =
        syncDirectory(directory.descriptor)
        ? .synchronized
        : .synchronizationUncertain
    }
    return RemovalReceipt(
      removedNames: removedNames,
      namespace: namespace
    )
  }

  private func removePreflightedFile(
    named name: String,
    expectedIdentity: FileIdentity?,
    in directory: Int32
  ) -> RemovalResult {
    do {
      guard let expectedIdentity else {
        return try entryMetadata(named: name, in: directory) == nil ? .absent : .failed
      }
      guard try entryMatches(name, identity: expectedIdentity, in: directory) else {
        return .failed
      }
      guard unlinkEntry(named: name, in: directory) else { return .failed }
      return try entryMetadata(named: name, in: directory) == nil ? .removed : .failed
    } catch { return .failed }
  }

  private func withExclusiveLock<T>(_ operation: (LockedDirectory) throws -> T) throws -> T {
    try acquireInProcessLock()
    defer { inProcessLock.unlock() }
    let descriptor = try openVerifiedRootDirectory()
    defer { _ = close(descriptor) }
    guard
      let lock = try openRegularFile(
        named: Self.lockFileName,
        in: descriptor,
        flags: O_CREAT | O_RDWR | O_CLOEXEC | O_NOFOLLOW
      )
    else { throw ForgeSharedStateStoreError.coordinationUnavailable }
    defer { _ = close(lock.descriptor) }
    testHooks.lockDescriptorOpened?(lock.descriptor)
    try acquireExclusiveLock(on: lock.descriptor)
    defer { _ = flock(lock.descriptor, LOCK_UN) }
    testHooks.beforeLockBinding?()
    let directory = LockedDirectory(descriptor: descriptor, lock: lock.identity)
    try requireBoundLock(directory)
    let result = try operation(directory)
    try requireBoundLock(directory)
    return result
  }

  private func acquireInProcessLock() throws {
    let timeout = testHooks.lockAcquisitionTimeoutNanoseconds
    let retryInterval = testHooks.lockRetryIntervalNanoseconds
    guard retryInterval > 0 else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    var lastObservedTime = testHooks.monotonicTimeNanoseconds()
    let (calculatedDeadline, overflowed) = lastObservedTime.addingReportingOverflow(timeout)
    let deadline = overflowed ? UInt64.max : calculatedDeadline

    while !inProcessLock.try() {
      let now = testHooks.monotonicTimeNanoseconds()
      guard now >= lastObservedTime else {
        throw ForgeSharedStateStoreError.coordinationUnavailable
      }
      lastObservedTime = now
      guard now < deadline else {
        throw ForgeSharedStateStoreError.lockAcquisitionTimedOut
      }
      testHooks.waitForLockRetry(min(retryInterval, deadline - now))
    }
  }

  private func openVerifiedRootDirectory() throws -> Int32 {
    do {
      try FileManager.default.createDirectory(
        at: sharedRootDirectory, withIntermediateDirectories: true)
    } catch { throw ForgeSharedStateStoreError.coordinationUnavailable }
    let descriptor = try sharedRootDirectory.withUnsafeFileSystemRepresentation { path -> Int32 in
      guard let path else { throw ForgeSharedStateStoreError.coordinationUnavailable }
      return open(path, O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW)
    }
    guard descriptor >= 0 else { throw ForgeSharedStateStoreError.coordinationUnavailable }
    var metadata = stat()
    guard fstat(descriptor, &metadata) == 0, metadata.st_mode & S_IFMT == S_IFDIR else {
      _ = close(descriptor)
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    return descriptor
  }

  private func openRegularFile(
    named name: String,
    in directory: Int32,
    flags: Int32,
    absentIsNil: Bool = false
  ) throws -> (descriptor: Int32, identity: FileIdentity)? {
    let descriptor = name.withCString { openat(directory, $0, flags, S_IRUSR | S_IWUSR) }
    guard descriptor >= 0 else {
      guard absentIsNil, errno == ENOENT else {
        throw ForgeSharedStateStoreError.coordinationUnavailable
      }
      return nil
    }
    do {
      var metadata = stat()
      guard fstat(descriptor, &metadata) == 0, isRegular(metadata) else {
        throw ForgeSharedStateStoreError.coordinationUnavailable
      }
      let identity = FileIdentity(metadata)
      guard try entryMatches(name, identity: identity, in: directory) else {
        throw ForgeSharedStateStoreError.coordinationUnavailable
      }
      return (descriptor, identity)
    } catch {
      _ = close(descriptor)
      throw error
    }
  }

  private func requireBoundLock(_ directory: LockedDirectory) throws {
    guard try entryMatches(Self.lockFileName, identity: directory.lock, in: directory.descriptor)
    else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
  }

  private func entryMatches(_ name: String, identity: FileIdentity, in directory: Int32) throws
    -> Bool
  {
    guard let metadata = try entryMetadata(named: name, in: directory) else { return false }
    return isRegular(metadata) && FileIdentity(metadata) == identity
  }

  private func entryMetadata(named name: String, in directory: Int32) throws -> stat? {
    try name.withCString { path in
      var metadata = stat()
      guard fstatat(directory, path, &metadata, AT_SYMLINK_NOFOLLOW) == 0 else {
        guard errno == ENOENT else { throw ForgeSharedStateStoreError.coordinationUnavailable }
        return nil
      }
      return metadata
    }
  }

  private func regularFileByteCount(for descriptor: Int32) throws -> Int {
    var metadata = stat()
    guard fstat(descriptor, &metadata) == 0, metadata.st_size >= 0 else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    let byteCount = Int(metadata.st_size)
    guard byteCount >= 0 else { throw ForgeSharedStateStoreError.coordinationUnavailable }
    return byteCount
  }

  private func isRegular(_ metadata: stat) -> Bool { metadata.st_mode & S_IFMT == S_IFREG }

  private func renameEntry(from source: String, to target: String, in directory: Int32) -> Bool {
    source.withCString { sourcePath in
      target.withCString { renameat(directory, sourcePath, directory, $0) == 0 }
    }
  }

  private func unlinkEntry(named name: String, in directory: Int32) -> Bool {
    name.withCString { unlinkat(directory, $0, 0) == 0 }
  }

  private func readExactly(_ byteCount: Int, from descriptor: Int32) throws -> Data {
    guard byteCount <= Self.maximumProjectionByteCount else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    var data = Data()
    data.reserveCapacity(byteCount)
    var remaining = byteCount
    var buffer = [UInt8](repeating: 0, count: Self.ioBufferByteCount)
    while remaining > 0 {
      let count = min(remaining, buffer.count)
      let result = buffer.withUnsafeMutableBytes { rawBuffer -> Int in
        guard let baseAddress = rawBuffer.baseAddress else { return -1 }
        return Darwin.read(descriptor, baseAddress, count)
      }
      guard result >= 0 else {
        guard errno == EINTR else { throw ForgeSharedStateStoreError.coordinationUnavailable }
        continue
      }
      guard result > 0 else { throw ForgeSharedStateStoreError.coordinationUnavailable }
      data.append(contentsOf: buffer.prefix(result))
      remaining -= result
    }
    return data
  }

  private func write(_ data: Data, to descriptor: Int32) throws {
    var written = 0
    while written < data.count {
      let result = data.withUnsafeBytes { rawBuffer -> Int in
        guard let baseAddress = rawBuffer.baseAddress else { return -1 }
        return Darwin.write(descriptor, baseAddress.advanced(by: written), data.count - written)
      }
      guard result >= 0 else {
        guard errno == EINTR else { throw ForgeSharedStateStoreError.writeVerificationFailed }
        continue
      }
      guard result > 0 else { throw ForgeSharedStateStoreError.writeVerificationFailed }
      written += result
    }
  }

  private func syncFile(_ descriptor: Int32) throws {
    while fsync(descriptor) != 0 {
      guard errno == EINTR else { throw ForgeSharedStateStoreError.writeVerificationFailed }
    }
  }

  private func syncDirectory(_ descriptor: Int32) -> Bool {
    guard !testHooks.failDirectorySync else { return false }
    while fsync(descriptor) != 0 { guard errno == EINTR else { return false } }
    return true
  }

  private func acquireExclusiveLock(on descriptor: Int32) throws {
    let timeout = testHooks.lockAcquisitionTimeoutNanoseconds
    let retryInterval = testHooks.lockRetryIntervalNanoseconds
    guard retryInterval > 0 else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    var lastObservedTime = testHooks.monotonicTimeNanoseconds()
    let (calculatedDeadline, overflowed) = lastObservedTime.addingReportingOverflow(timeout)
    let deadline = overflowed ? UInt64.max : calculatedDeadline
    var attempted = false

    while true {
      if attempted {
        let now = testHooks.monotonicTimeNanoseconds()
        guard now >= lastObservedTime else {
          throw ForgeSharedStateStoreError.coordinationUnavailable
        }
        lastObservedTime = now
        guard now < deadline else {
          throw ForgeSharedStateStoreError.lockAcquisitionTimedOut
        }
      }
      attempted = true

      if flock(descriptor, LOCK_EX | LOCK_NB) == 0 {
        return
      }
      let lockError = errno
      guard lockError == EINTR || lockError == EWOULDBLOCK || lockError == EAGAIN else {
        throw ForgeSharedStateStoreError.coordinationUnavailable
      }

      let now = testHooks.monotonicTimeNanoseconds()
      guard now >= lastObservedTime else {
        throw ForgeSharedStateStoreError.coordinationUnavailable
      }
      lastObservedTime = now
      guard now < deadline else {
        throw ForgeSharedStateStoreError.lockAcquisitionTimedOut
      }
      guard lockError != EINTR else {
        continue
      }

      testHooks.waitForLockRetry(min(retryInterval, deadline - now))
    }
  }
}

struct ForgeSharedProjectionReaderTestHooks: Sendable {
  var beforeLockOpen: (@Sendable () -> Void)? = nil
  var beforeLockBinding: (@Sendable () -> Void)? = nil
  var beforeProjectionOpen: (@Sendable () -> Void)? = nil
  var beforeProjectionBinding: (@Sendable () -> Void)? = nil
  var beforeProjectionRead: (@Sendable () -> Void)? = nil
  var afterProjectionRead: (@Sendable () -> Void)? = nil
  var lockAcquisitionTimeoutNanoseconds: UInt64 = 250_000_000
  var lockRetryIntervalNanoseconds: UInt64 = 5_000_000
  var monotonicTimeNanoseconds: @Sendable () -> UInt64 = {
    DispatchTime.now().uptimeNanoseconds
  }
  var waitForLockRetry: @Sendable (UInt64) -> Void = { nanoseconds in
    Thread.sleep(forTimeInterval: TimeInterval(nanoseconds) / 1_000_000_000)
  }
  var lockDescriptorOpened: (@Sendable (Int32) -> Void)? = nil
}

public struct ForgeSharedProjectionReader: Sendable {
  private struct FileIdentity: Equatable {
    let device: dev_t
    let inode: ino_t

    init(_ metadata: stat) {
      device = metadata.st_dev
      inode = metadata.st_ino
    }
  }

  private struct FileSnapshot: Equatable {
    let identity: FileIdentity
    let byteCount: Int64
    let linkCount: UInt64
    let modificationSeconds: Int64
    let modificationNanoseconds: Int64
    let changeSeconds: Int64
    let changeNanoseconds: Int64

    init?(_ metadata: stat) {
      guard metadata.st_size >= 0 else { return nil }
      identity = FileIdentity(metadata)
      byteCount = Int64(metadata.st_size)
      linkCount = UInt64(metadata.st_nlink)
      modificationSeconds = Int64(metadata.st_mtimespec.tv_sec)
      modificationNanoseconds = Int64(metadata.st_mtimespec.tv_nsec)
      changeSeconds = Int64(metadata.st_ctimespec.tv_sec)
      changeNanoseconds = Int64(metadata.st_ctimespec.tv_nsec)
    }
  }

  private struct RootDirectory {
    let descriptor: Int32
    let identity: FileIdentity
  }

  private struct OpenFile {
    let descriptor: Int32
    let snapshot: FileSnapshot
  }

  private static let appGroupIdentifier = "group.com.forgelearning.shared"
  private static let lockFileName = "forge-shared-state-v4.lock"
  private static let projectionFileName = "forge.semester-desk-projection.v2.json"
  private static let maximumProjectionByteCount = 4_096
  private static let maximumReadByteCount = maximumProjectionByteCount + 1
  private static let ioBufferByteCount = 1_024

  private let sharedRootDirectory: URL
  private let testHooks: ForgeSharedProjectionReaderTestHooks

  public init() throws {
    guard
      let sharedRootDirectory = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: Self.appGroupIdentifier
      )
    else { throw ForgeSharedStateStoreError.appGroupUnavailable }
    self.init(sharedRootDirectory: sharedRootDirectory, testHooks: .init())
  }

  init(
    sharedRootDirectory: URL,
    testHooks: ForgeSharedProjectionReaderTestHooks = .init()
  ) {
    self.sharedRootDirectory = sharedRootDirectory.standardizedFileURL
    self.testHooks = testHooks
  }

  public func readProjection() throws -> ForgeSemesterDeskProjection? {
    let root = try openVerifiedRootDirectory()
    defer { _ = close(root.descriptor) }
    try requireBoundRoot(root)

    guard let lockMetadata = try entryMetadata(named: Self.lockFileName, in: root.descriptor)
    else {
      guard try entryMetadata(named: Self.projectionFileName, in: root.descriptor) == nil else {
        throw ForgeSharedStateStoreError.coordinationUnavailable
      }
      try requireBoundRoot(root)
      return nil
    }
    guard isRegular(lockMetadata) else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    let lockIdentity = FileIdentity(lockMetadata)
    testHooks.beforeLockOpen?()
    guard let lock = try openExistingRegularFile(named: Self.lockFileName, in: root.descriptor)
    else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    defer { _ = close(lock.descriptor) }
    guard lock.snapshot.identity == lockIdentity else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    testHooks.lockDescriptorOpened?(lock.descriptor)
    try acquireSharedLock(on: lock.descriptor)
    defer { _ = flock(lock.descriptor, LOCK_UN) }
    testHooks.beforeLockBinding?()
    try requireBoundRoot(root)
    try requireBoundLock(lock.snapshot.identity, in: root)

    guard
      let projectionMetadata = try entryMetadata(
        named: Self.projectionFileName,
        in: root.descriptor
      )
    else {
      try requireBoundRoot(root)
      try requireBoundLock(lock.snapshot.identity, in: root)
      return nil
    }
    guard
      isRegular(projectionMetadata),
      let projectionSnapshot = FileSnapshot(projectionMetadata),
      projectionSnapshot.linkCount == 1
    else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    testHooks.beforeProjectionOpen?()
    guard
      let projection = try openExistingRegularFile(
        named: Self.projectionFileName,
        in: root.descriptor
      )
    else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    defer { _ = close(projection.descriptor) }
    guard projection.snapshot == projectionSnapshot else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    testHooks.beforeProjectionBinding?()
    try requireBoundRoot(root)
    try requireBoundLock(lock.snapshot.identity, in: root)
    try requireBoundProjection(projection, in: root)
    testHooks.beforeProjectionRead?()
    let data = try readBoundedProjection(
      from: projection.descriptor,
      declaredByteCount: projection.snapshot.byteCount
    )
    testHooks.afterProjectionRead?()
    try requireBoundRoot(root)
    try requireBoundLock(lock.snapshot.identity, in: root)
    try requireBoundProjection(projection, in: root)
    return try ForgeSemesterDeskProjectionDecoder.decode(data)
  }

  private func openVerifiedRootDirectory() throws -> RootDirectory {
    let pathMetadata = try rootPathMetadata()
    guard isDirectory(pathMetadata) else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    let descriptor = try sharedRootDirectory.withUnsafeFileSystemRepresentation { path -> Int32 in
      guard let path else { throw ForgeSharedStateStoreError.coordinationUnavailable }
      return open(path, O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW)
    }
    guard descriptor >= 0 else { throw ForgeSharedStateStoreError.coordinationUnavailable }
    do {
      var descriptorMetadata = stat()
      guard
        fstat(descriptor, &descriptorMetadata) == 0,
        isDirectory(descriptorMetadata),
        FileIdentity(pathMetadata) == FileIdentity(descriptorMetadata)
      else {
        throw ForgeSharedStateStoreError.coordinationUnavailable
      }
      return RootDirectory(descriptor: descriptor, identity: FileIdentity(descriptorMetadata))
    } catch {
      _ = close(descriptor)
      throw error
    }
  }

  private func requireBoundRoot(_ root: RootDirectory) throws {
    var descriptorMetadata = stat()
    guard
      fstat(root.descriptor, &descriptorMetadata) == 0,
      isDirectory(descriptorMetadata),
      FileIdentity(descriptorMetadata) == root.identity
    else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    let pathMetadata = try rootPathMetadata()
    guard
      isDirectory(pathMetadata),
      FileIdentity(pathMetadata) == root.identity
    else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
  }

  private func rootPathMetadata() throws -> stat {
    try sharedRootDirectory.withUnsafeFileSystemRepresentation { path in
      guard let path else { throw ForgeSharedStateStoreError.coordinationUnavailable }
      var metadata = stat()
      guard fstatat(AT_FDCWD, path, &metadata, AT_SYMLINK_NOFOLLOW) == 0 else {
        throw ForgeSharedStateStoreError.coordinationUnavailable
      }
      return metadata
    }
  }

  private func openExistingRegularFile(
    named name: String,
    in directory: Int32
  ) throws -> OpenFile? {
    let descriptor = name.withCString {
      openat(directory, $0, O_RDONLY | O_NONBLOCK | O_CLOEXEC | O_NOFOLLOW)
    }
    guard descriptor >= 0 else {
      guard errno == ENOENT else { throw ForgeSharedStateStoreError.coordinationUnavailable }
      return nil
    }
    do {
      let snapshot = try snapshot(for: descriptor)
      guard
        isRegularDescriptor(descriptor),
        let entry = try entryMetadata(named: name, in: directory),
        isRegular(entry),
        FileIdentity(entry) == snapshot.identity
      else {
        throw ForgeSharedStateStoreError.coordinationUnavailable
      }
      return OpenFile(descriptor: descriptor, snapshot: snapshot)
    } catch {
      _ = close(descriptor)
      throw error
    }
  }

  private func requireBoundLock(
    _ identity: FileIdentity,
    in root: RootDirectory
  ) throws {
    guard
      let metadata = try entryMetadata(named: Self.lockFileName, in: root.descriptor),
      isRegular(metadata),
      FileIdentity(metadata) == identity
    else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
  }

  private func requireBoundProjection(
    _ projection: OpenFile,
    in root: RootDirectory
  ) throws {
    let descriptorSnapshot = try snapshot(for: projection.descriptor)
    guard
      descriptorSnapshot == projection.snapshot,
      projection.snapshot.linkCount == 1,
      let pathMetadata = try entryMetadata(
        named: Self.projectionFileName,
        in: root.descriptor
      ),
      let pathSnapshot = FileSnapshot(pathMetadata),
      isRegular(pathMetadata),
      pathSnapshot == projection.snapshot
    else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
  }

  private func entryMetadata(named name: String, in directory: Int32) throws -> stat? {
    try name.withCString { path in
      var metadata = stat()
      guard fstatat(directory, path, &metadata, AT_SYMLINK_NOFOLLOW) == 0 else {
        guard errno == ENOENT else { throw ForgeSharedStateStoreError.coordinationUnavailable }
        return nil
      }
      return metadata
    }
  }

  private func snapshot(for descriptor: Int32) throws -> FileSnapshot {
    var metadata = stat()
    guard fstat(descriptor, &metadata) == 0, let snapshot = FileSnapshot(metadata) else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    return snapshot
  }

  private func isRegularDescriptor(_ descriptor: Int32) -> Bool {
    var metadata = stat()
    return fstat(descriptor, &metadata) == 0 && isRegular(metadata)
  }

  private func isRegular(_ metadata: stat) -> Bool {
    metadata.st_mode & S_IFMT == S_IFREG
  }

  private func isDirectory(_ metadata: stat) -> Bool {
    metadata.st_mode & S_IFMT == S_IFDIR
  }

  private func readBoundedProjection(
    from descriptor: Int32,
    declaredByteCount: Int64
  ) throws -> Data {
    guard declaredByteCount >= 0 else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    guard declaredByteCount <= Int64(Self.maximumProjectionByteCount) else {
      throw ForgeSharedStateStoreError.oversizedProjection
    }
    let declaredCount = Int(declaredByteCount)
    var data = Data()
    data.reserveCapacity(Self.maximumReadByteCount)
    var buffer = [UInt8](repeating: 0, count: Self.ioBufferByteCount)

    while data.count < Self.maximumReadByteCount {
      let byteCount = min(buffer.count, Self.maximumReadByteCount - data.count)
      let result = buffer.withUnsafeMutableBytes { rawBuffer -> Int in
        guard let baseAddress = rawBuffer.baseAddress else { return -1 }
        return Darwin.read(descriptor, baseAddress, byteCount)
      }
      guard result >= 0 else {
        guard errno == EINTR else {
          throw ForgeSharedStateStoreError.coordinationUnavailable
        }
        continue
      }
      guard result > 0 else { break }
      data.append(contentsOf: buffer.prefix(result))
    }

    guard data.count <= Self.maximumProjectionByteCount else {
      throw ForgeSharedStateStoreError.oversizedProjection
    }
    guard data.count == declaredCount else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    return data
  }

  private func acquireSharedLock(on descriptor: Int32) throws {
    let timeout = testHooks.lockAcquisitionTimeoutNanoseconds
    let retryInterval = testHooks.lockRetryIntervalNanoseconds
    guard retryInterval > 0 else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    var lastObservedTime = testHooks.monotonicTimeNanoseconds()
    let (calculatedDeadline, overflowed) = lastObservedTime.addingReportingOverflow(timeout)
    let deadline = overflowed ? UInt64.max : calculatedDeadline
    var attempted = false

    while true {
      if attempted {
        let now = testHooks.monotonicTimeNanoseconds()
        guard now >= lastObservedTime else {
          throw ForgeSharedStateStoreError.coordinationUnavailable
        }
        lastObservedTime = now
        guard now < deadline else {
          throw ForgeSharedStateStoreError.lockAcquisitionTimedOut
        }
      }
      attempted = true

      if flock(descriptor, LOCK_SH | LOCK_NB) == 0 {
        return
      }
      let lockError = errno
      guard lockError == EINTR || lockError == EWOULDBLOCK || lockError == EAGAIN else {
        throw ForgeSharedStateStoreError.coordinationUnavailable
      }

      let now = testHooks.monotonicTimeNanoseconds()
      guard now >= lastObservedTime else {
        throw ForgeSharedStateStoreError.coordinationUnavailable
      }
      lastObservedTime = now
      guard now < deadline else {
        throw ForgeSharedStateStoreError.lockAcquisitionTimedOut
      }
      guard lockError != EINTR else { continue }

      testHooks.waitForLockRetry(min(retryInterval, deadline - now))
    }
  }
}
