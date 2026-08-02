import Darwin
import Dispatch
import Foundation
import Synchronization
import Testing

@testable import ForgeCore

struct SharedProjectionReaderTests {
  @Test
  func emptyExistingRootReturnsNilWithoutCreatingFiles() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let reader = ForgeSharedProjectionReader(sharedRootDirectory: fixture.root)

    #expect(try reader.readProjection() == nil)
    #expect(try FileManager.default.contentsOfDirectory(atPath: fixture.root.path).isEmpty)
  }

  @Test
  func missingRootFailsWithoutCreatingTheRoot() {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent(
      "ForgeCoreTests.SharedProjectionReader.Missing.\(UUID().uuidString)",
      isDirectory: true
    )
    let reader = ForgeSharedProjectionReader(sharedRootDirectory: root)

    expectReaderError(.coordinationUnavailable) {
      _ = try reader.readProjection()
    }

    #expect(!FileManager.default.fileExists(atPath: root.path))
  }

  @Test
  func validProjectionRoundTripsExactly() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let projection = try makeProjection(
      lifecycle: .open,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 10,
      validUntil: 30
    )
    try fixture.store.saveProjection(projection)

    let reader = ForgeSharedProjectionReader(sharedRootDirectory: fixture.root)

    #expect(try reader.readProjection() == projection)
  }

  @Test
  func missingLockWithProjectionFailsWithoutChangingProjectionBytes() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let data = try projectionData(
      makeProjection(
        lifecycle: .scheduled,
        opensAt: 10,
        dueAt: 20,
        generatedAt: 0,
        validUntil: 30
      )
    )
    try data.write(to: fixture.projectionURL)

    let reader = ForgeSharedProjectionReader(sharedRootDirectory: fixture.root)

    expectReaderError(.coordinationUnavailable) {
      _ = try reader.readProjection()
    }

    #expect(try Data(contentsOf: fixture.projectionURL) == data)
  }

  @Test
  func corruptDuplicateAndOversizedProjectionBytesRemainUntouched() throws {
    try assertPreservedReaderFailure(
      data: Data("not-json".utf8),
      expectedError: .corruptProjection
    )
    try assertPreservedReaderFailure(
      data: Data(
        "{\"lifecycle\":\"scheduled\",\"opensAt\":10,\"dueAt\":20,\"generatedAt\":0,\"validUntil\":30,\"l\\u0069fecycle\":\"scheduled\"}"
          .utf8
      ),
      expectedError: .corruptProjection
    )
    try assertPreservedReaderFailure(
      data: Data(repeating: 0x61, count: 4_097),
      expectedError: .oversizedProjection
    )
  }

  @Test
  func projectionAndLockSymbolicLinksFailWithoutChangingTargets() throws {
    let lockFixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(lockFixture) }
    let lockTarget = lockFixture.root.appendingPathComponent("lock-target")
    let lockData = Data("preserve lock target".utf8)
    try lockData.write(to: lockTarget)
    try FileManager.default.createSymbolicLink(
      at: lockFixture.root.appendingPathComponent(SharedStoreTestSupport.lockFileName),
      withDestinationURL: lockTarget
    )

    expectReaderError(.coordinationUnavailable) {
      _ = try ForgeSharedProjectionReader(sharedRootDirectory: lockFixture.root).readProjection()
    }
    #expect(try Data(contentsOf: lockTarget) == lockData)

    let projectionFixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(projectionFixture) }
    try createExistingLock(in: projectionFixture.root)
    let projectionTarget = projectionFixture.root.appendingPathComponent("projection-target")
    let projectionData = Data("preserve projection target".utf8)
    try projectionData.write(to: projectionTarget)
    try FileManager.default.createSymbolicLink(
      at: projectionFixture.projectionURL,
      withDestinationURL: projectionTarget
    )

    expectReaderError(.coordinationUnavailable) {
      _ = try ForgeSharedProjectionReader(sharedRootDirectory: projectionFixture.root)
        .readProjection()
    }
    #expect(try Data(contentsOf: projectionTarget) == projectionData)
  }

  @Test
  func hardLinkedProjectionFailsWithoutReadingIt() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let projection = try makeProjection(
      lifecycle: .scheduled,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 0,
      validUntil: 30
    )
    try fixture.store.saveProjection(projection)
    let alias = fixture.root.appendingPathComponent("projection-alias")
    let result = fixture.projectionURL.withUnsafeFileSystemRepresentation { sourcePath in
      alias.withUnsafeFileSystemRepresentation { aliasPath in
        guard let sourcePath, let aliasPath else { return -1 }
        return Int(link(sourcePath, aliasPath))
      }
    }
    #expect(result == 0)
    let bytes = try Data(contentsOf: fixture.projectionURL)

    expectReaderError(.coordinationUnavailable) {
      _ = try ForgeSharedProjectionReader(sharedRootDirectory: fixture.root).readProjection()
    }

    #expect(try Data(contentsOf: fixture.projectionURL) == bytes)
  }

  @Test
  func fifoAndReplacementRacesFailWithoutBlockingOrReadingReplacement() throws {
    let fifoFixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fifoFixture) }
    try fifoFixture.store.saveProjection(
      try makeProjection(
        lifecycle: .scheduled,
        opensAt: 10,
        dueAt: 20,
        generatedAt: 0,
        validUntil: 30
      )
    )
    let fifoURL = fifoFixture.projectionURL
    var fifoHooks = ForgeSharedProjectionReaderTestHooks()
    fifoHooks.beforeProjectionOpen = {
      try? FileManager.default.removeItem(at: fifoURL)
      _ = fifoURL.withUnsafeFileSystemRepresentation { path in
        guard let path else { return -1 }
        return Int(mkfifo(path, S_IRUSR | S_IWUSR))
      }
    }

    expectReaderError(.coordinationUnavailable) {
      _ = try ForgeSharedProjectionReader(
        sharedRootDirectory: fifoFixture.root,
        testHooks: fifoHooks
      ).readProjection()
    }
    #expect(isFIFO(at: fifoURL))

    let replacementFixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(replacementFixture) }
    try replacementFixture.store.saveProjection(
      try makeProjection(
        lifecycle: .scheduled,
        opensAt: 10,
        dueAt: 20,
        generatedAt: 0,
        validUntil: 30
      )
    )
    let replacement = Data("replacement bytes".utf8)
    let projectionURL = replacementFixture.projectionURL
    var replacementHooks = ForgeSharedProjectionReaderTestHooks()
    replacementHooks.beforeProjectionBinding = {
      try? FileManager.default.removeItem(at: projectionURL)
      try? replacement.write(to: projectionURL)
    }

    expectReaderError(.coordinationUnavailable) {
      _ = try ForgeSharedProjectionReader(
        sharedRootDirectory: replacementFixture.root,
        testHooks: replacementHooks
      ).readProjection()
    }
    #expect(try Data(contentsOf: projectionURL) == replacement)
  }

  @Test
  func regularProjectionReplacementBeforeOpenFailsWhenReplacementIsStable() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try fixture.store.saveProjection(
      try makeProjection(
        lifecycle: .scheduled,
        opensAt: 10,
        dueAt: 20,
        generatedAt: 0,
        validUntil: 30
      )
    )
    let replacement = try projectionData(
      makeProjection(
        lifecycle: .open,
        opensAt: 40,
        dueAt: 50,
        generatedAt: 40,
        validUntil: 60
      )
    )
    let projectionURL = fixture.projectionURL
    var hooks = ForgeSharedProjectionReaderTestHooks()
    hooks.beforeProjectionOpen = {
      try? FileManager.default.removeItem(at: projectionURL)
      try? replacement.write(to: projectionURL)
    }

    expectReaderError(.coordinationUnavailable) {
      _ = try ForgeSharedProjectionReader(
        sharedRootDirectory: fixture.root,
        testHooks: hooks
      ).readProjection()
    }

    #expect(try Data(contentsOf: projectionURL) == replacement)
  }

  @Test
  func lockReplacementRaceFailsBeforeReadingProjection() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let projection = try makeProjection(
      lifecycle: .scheduled,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 0,
      validUntil: 30
    )
    try fixture.store.saveProjection(projection)
    let originalBytes = try Data(contentsOf: fixture.projectionURL)
    let lockURL = fixture.root.appendingPathComponent(SharedStoreTestSupport.lockFileName)
    var hooks = ForgeSharedProjectionReaderTestHooks()
    hooks.beforeLockBinding = {
      try? FileManager.default.removeItem(at: lockURL)
      try? Data("replacement lock".utf8).write(to: lockURL)
    }

    expectReaderError(.coordinationUnavailable) {
      _ = try ForgeSharedProjectionReader(
        sharedRootDirectory: fixture.root,
        testHooks: hooks
      ).readProjection()
    }

    #expect(try Data(contentsOf: fixture.projectionURL) == originalBytes)
  }

  @Test
  func regularLockReplacementBeforeOpenFailsBeforeAcquiringTheReplacement() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try fixture.store.saveProjection(
      try makeProjection(
        lifecycle: .scheduled,
        opensAt: 10,
        dueAt: 20,
        generatedAt: 0,
        validUntil: 30
      )
    )
    let originalProjection = try Data(contentsOf: fixture.projectionURL)
    let lockURL = fixture.root.appendingPathComponent(SharedStoreTestSupport.lockFileName)
    let replacement = Data("replacement lock".utf8)
    var hooks = ForgeSharedProjectionReaderTestHooks()
    hooks.beforeLockOpen = {
      try? FileManager.default.removeItem(at: lockURL)
      try? replacement.write(to: lockURL)
    }

    expectReaderError(.coordinationUnavailable) {
      _ = try ForgeSharedProjectionReader(
        sharedRootDirectory: fixture.root,
        testHooks: hooks
      ).readProjection()
    }

    #expect(try Data(contentsOf: lockURL) == replacement)
    #expect(try Data(contentsOf: fixture.projectionURL) == originalProjection)
  }

  @Test
  func rootReplacementRaceFailsWhenPathAndDescriptorDiverge() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try fixture.store.saveProjection(
      try makeProjection(
        lifecycle: .scheduled,
        opensAt: 10,
        dueAt: 20,
        generatedAt: 0,
        validUntil: 30
      )
    )
    let root = fixture.root
    let replacement = root.deletingLastPathComponent().appendingPathComponent(
      "ForgeCoreTests.SharedProjectionReader.Replaced.\(UUID().uuidString)",
      isDirectory: true
    )
    defer { try? FileManager.default.removeItem(at: replacement) }
    var hooks = ForgeSharedProjectionReaderTestHooks()
    hooks.beforeLockBinding = {
      try? FileManager.default.moveItem(at: root, to: replacement)
      try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    }

    expectReaderError(.coordinationUnavailable) {
      _ = try ForgeSharedProjectionReader(
        sharedRootDirectory: root,
        testHooks: hooks
      ).readProjection()
    }

    #expect(FileManager.default.fileExists(atPath: replacement.path))
  }

  @Test
  func lockTimeoutUsesTheBoundedSharedLockRetry() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try fixture.store.saveProjection(
      try makeProjection(
        lifecycle: .scheduled,
        opensAt: 10,
        dueAt: 20,
        generatedAt: 0,
        validUntil: 30
      )
    )
    let heldDescriptor = try SharedStoreTestSupport.holdExclusiveLock(in: fixture.root)
    defer { SharedStoreTestSupport.releaseAndCloseLock(heldDescriptor) }
    let timing = SharedProjectionReaderLockTiming()
    let reader = ForgeSharedProjectionReader(
      sharedRootDirectory: fixture.root,
      testHooks: readerLockHooks(timing: timing)
    )

    expectReaderError(.lockAcquisitionTimedOut) {
      _ = try reader.readProjection()
    }

    #expect(timing.waitCount == 3)
    #expect(timing.now == 10)
    let descriptor = try #require(timing.openedDescriptor)
    #expect(SharedStoreTestSupport.isDescriptorClosed(descriptor))
  }

  @Test
  func readerFirstReturnsOldProjectionBeforeWriterCommitsNewProjection() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let oldProjection = try makeProjection(
      lifecycle: .scheduled,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 0,
      validUntil: 30
    )
    let newProjection = try makeProjection(
      lifecycle: .open,
      opensAt: 40,
      dueAt: 50,
      generatedAt: 40,
      validUntil: 60
    )
    try fixture.store.saveProjection(oldProjection)

    let writerWaiting = ProjectionReaderGate()
    let writerMayRetry = ProjectionReaderGate()
    let writerFinished = ProjectionReaderGate()
    let writerSucceeded = Mutex(false)
    var writerHooks = ForgeSharedStateStoreTestHooks()
    writerHooks.monotonicTimeNanoseconds = { 0 }
    writerHooks.waitForLockRetry = { _ in
      writerWaiting.signal()
      writerMayRetry.wait()
    }
    let lockedWriterHooks = writerHooks
    let root = fixture.root
    var readerHooks = ForgeSharedProjectionReaderTestHooks()
    readerHooks.beforeProjectionRead = {
      DispatchQueue.global(qos: .userInitiated).async {
        let writer = ForgeSharedStateStore(
          sharedRootDirectory: root,
          testHooks: lockedWriterHooks
        )
        do {
          try writer.saveProjection(newProjection)
          writerSucceeded.withLock { $0 = true }
        } catch {}
        writerFinished.signal()
      }
      writerWaiting.wait()
    }
    let reader = ForgeSharedProjectionReader(
      sharedRootDirectory: fixture.root,
      testHooks: readerHooks
    )

    #expect(try reader.readProjection() == oldProjection)
    writerMayRetry.signal()
    writerFinished.wait()

    #expect(writerSucceeded.withLock { $0 })
    #expect(
      try ForgeSharedProjectionReader(sharedRootDirectory: fixture.root).readProjection()
        == newProjection
    )
  }

  @Test
  func writerFirstCommitsNewProjectionBeforeReaderReturns() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let oldProjection = try makeProjection(
      lifecycle: .scheduled,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 0,
      validUntil: 30
    )
    let newProjection = try makeProjection(
      lifecycle: .open,
      opensAt: 40,
      dueAt: 50,
      generatedAt: 40,
      validUntil: 60
    )
    try fixture.store.saveProjection(oldProjection)

    let readerWaiting = ProjectionReaderGate()
    let readerMayRetry = ProjectionReaderGate()
    let readerFinished = ProjectionReaderGate()
    let readerResult = Mutex<ForgeReturnProjection?>(nil)
    let readerSucceeded = Mutex(false)
    var readerHooks = ForgeSharedProjectionReaderTestHooks()
    readerHooks.monotonicTimeNanoseconds = { 0 }
    readerHooks.waitForLockRetry = { _ in
      readerWaiting.signal()
      readerMayRetry.wait()
    }
    let lockedReaderHooks = readerHooks
    let root = fixture.root
    var writerHooks = ForgeSharedStateStoreTestHooks()
    writerHooks.beforeStagingRename = { _ in
      DispatchQueue.global(qos: .userInitiated).async {
        let reader = ForgeSharedProjectionReader(
          sharedRootDirectory: root,
          testHooks: lockedReaderHooks
        )
        do {
          let projection = try reader.readProjection()
          readerResult.withLock { $0 = projection }
          readerSucceeded.withLock { $0 = true }
        } catch {}
        readerFinished.signal()
      }
      readerWaiting.wait()
    }
    let writer = ForgeSharedStateStore(
      sharedRootDirectory: fixture.root,
      testHooks: writerHooks
    )

    try writer.saveProjection(newProjection)
    readerMayRetry.signal()
    readerFinished.wait()

    #expect(readerSucceeded.withLock { $0 })
    #expect(readerResult.withLock { $0 } == newProjection)
  }

  @Test
  func readerPreservesCorruptBytesWhileAppStoreRepairsThem() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try createExistingLock(in: fixture.root)
    let corruptData = Data("corrupt local projection".utf8)
    try corruptData.write(to: fixture.projectionURL)
    let reader = ForgeSharedProjectionReader(sharedRootDirectory: fixture.root)

    expectReaderError(.corruptProjection) {
      _ = try reader.readProjection()
    }
    #expect(try Data(contentsOf: fixture.projectionURL) == corruptData)

    expectReaderError(.corruptProjection) {
      _ = try fixture.store.loadProjection()
    }
    #expect(!FileManager.default.fileExists(atPath: fixture.projectionURL.path))
  }

  private func assertPreservedReaderFailure(
    data: Data,
    expectedError: ForgeSharedStateStoreError
  ) throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try createExistingLock(in: fixture.root)
    try data.write(to: fixture.projectionURL)

    expectReaderError(expectedError) {
      _ = try ForgeSharedProjectionReader(sharedRootDirectory: fixture.root).readProjection()
    }

    #expect(try Data(contentsOf: fixture.projectionURL) == data)
  }

  private func createExistingLock(in root: URL) throws {
    let descriptor = try SharedStoreTestSupport.holdExclusiveLock(in: root)
    SharedStoreTestSupport.releaseAndCloseLock(descriptor)
  }

  private func makeProjection(
    lifecycle: ForgeReturnProjectionLifecycle,
    opensAt: TimeInterval,
    dueAt: TimeInterval,
    generatedAt: TimeInterval,
    validUntil: TimeInterval
  ) throws -> ForgeReturnProjection {
    try SharedStoreTestSupport.projection(
      lifecycle: lifecycle,
      opensAt: opensAt,
      dueAt: dueAt,
      generatedAt: generatedAt,
      validUntil: validUntil
    )
  }

  private func projectionData(_ projection: ForgeReturnProjection) throws -> Data {
    try JSONEncoder().encode(projection)
  }

  private func isFIFO(at url: URL) -> Bool {
    var metadata = stat()
    let result = url.withUnsafeFileSystemRepresentation { path in
      guard let path else { return -1 }
      return Int(lstat(path, &metadata))
    }
    return result == 0 && metadata.st_mode & S_IFMT == S_IFIFO
  }

  private func readerLockHooks(
    timing: SharedProjectionReaderLockTiming,
    timeoutNanoseconds: UInt64 = 10,
    retryIntervalNanoseconds: UInt64 = 4
  ) -> ForgeSharedProjectionReaderTestHooks {
    var hooks = ForgeSharedProjectionReaderTestHooks()
    hooks.lockAcquisitionTimeoutNanoseconds = timeoutNanoseconds
    hooks.lockRetryIntervalNanoseconds = retryIntervalNanoseconds
    hooks.monotonicTimeNanoseconds = { timing.now }
    hooks.waitForLockRetry = { timing.wait($0) }
    hooks.lockDescriptorOpened = { timing.recordOpenedDescriptor($0) }
    return hooks
  }

  private func expectReaderError(
    _ expected: ForgeSharedStateStoreError,
    _ operation: () throws -> Void
  ) {
    do {
      try operation()
      Issue.record("Expected \(expected) error.")
    } catch let error as ForgeSharedStateStoreError {
      #expect(error == expected)
    } catch {
      Issue.record("Unexpected error: \(error)")
    }
  }
}

final class ProjectionReaderGate: @unchecked Sendable {
  private let semaphore = DispatchSemaphore(value: 0)

  func signal() {
    semaphore.signal()
  }

  func wait() {
    semaphore.wait()
  }
}

final class SharedProjectionReaderLockTiming: Sendable {
  private struct State: Sendable {
    var now: UInt64 = 0
    var waitCount = 0
    var openedDescriptor: Int32?
  }

  private let state = Mutex(State())

  var now: UInt64 {
    state.withLock { $0.now }
  }

  var waitCount: Int {
    state.withLock { $0.waitCount }
  }

  var openedDescriptor: Int32? {
    state.withLock { $0.openedDescriptor }
  }

  func wait(_ nanoseconds: UInt64) {
    state.withLock {
      $0.now += nanoseconds
      $0.waitCount += 1
    }
  }

  func recordOpenedDescriptor(_ descriptor: Int32) {
    state.withLock { $0.openedDescriptor = descriptor }
  }
}
