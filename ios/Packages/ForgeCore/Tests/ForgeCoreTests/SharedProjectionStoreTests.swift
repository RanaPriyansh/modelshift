import Darwin
import Dispatch
import Foundation
import Synchronization
import Testing

@testable import ForgeCore

struct SharedProjectionStoreTests {
  private let unrelatedKey = "unrelated"

  @Test
  func returnProjectionRoundTripsWithExactV3Fields() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let projection = try SharedStoreTestSupport.projection(
      lifecycle: .scheduled,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 0,
      validUntil: 30
    )
    try fixture.store.saveProjection(projection)

    #expect(try fixture.store.loadProjection() == projection)
    #expect(fixture.projectionURL.lastPathComponent == "forge.return-projection.v3.json")
    let data = try Data(contentsOf: fixture.projectionURL)
    let object = try #require(
      JSONSerialization.jsonObject(with: data) as? [String: Any]
    )
    #expect(
      Set(object.keys)
        == Set(["lifecycle", "opensAt", "dueAt", "generatedAt", "validUntil"])
    )
    #expect(object["lifecycle"] as? String == "scheduled")
    #expect(
      fixture.defaults.object(forKey: SharedStoreTestSupport.projectionV2Key)
        == nil
    )
  }

  @Test(
    "Projection lifecycle matches generatedAt",
    arguments: [
      (ForgeReturnProjectionLifecycle.scheduled, 10.0, 20.0, 0.0, 30.0),
      (ForgeReturnProjectionLifecycle.open, 10.0, 20.0, 10.0, 30.0),
      (ForgeReturnProjectionLifecycle.due, 10.0, 20.0, 20.0, 30.0),
    ]
  )
  func validLifecycleMatchesGeneratedAt(
    lifecycle: ForgeReturnProjectionLifecycle,
    opensAt: TimeInterval,
    dueAt: TimeInterval,
    generatedAt: TimeInterval,
    validUntil: TimeInterval
  ) throws {
    let projection = try SharedStoreTestSupport.projection(
      lifecycle: lifecycle,
      opensAt: opensAt,
      dueAt: dueAt,
      generatedAt: generatedAt,
      validUntil: validUntil
    )

    #expect(projection.lifecycle == lifecycle)
    #expect(projection.opensAt.timeIntervalSinceReferenceDate == opensAt)
    #expect(projection.dueAt.timeIntervalSinceReferenceDate == dueAt)
    #expect(projection.generatedAt.timeIntervalSinceReferenceDate == generatedAt)
    #expect(projection.validUntil.timeIntervalSinceReferenceDate == validUntil)
  }

  @Test(
    "Invalid lifecycle and date combinations are rejected",
    arguments: [
      (ForgeReturnProjectionLifecycle.scheduled, 10.0, 20.0, 10.0, 30.0),
      (ForgeReturnProjectionLifecycle.open, 10.0, 20.0, 0.0, 30.0),
      (ForgeReturnProjectionLifecycle.due, 10.0, 20.0, 19.0, 30.0),
      (ForgeReturnProjectionLifecycle.open, 20.0, 20.0, 20.0, 30.0),
      (ForgeReturnProjectionLifecycle.open, 10.0, 20.0, 21.0, 30.0),
      (ForgeReturnProjectionLifecycle.scheduled, 10.0, 20.0, 0.0, -1.0),
    ]
  )
  func invalidLifecycleAndDateCombinationsAreRejected(
    lifecycle: ForgeReturnProjectionLifecycle,
    opensAt: TimeInterval,
    dueAt: TimeInterval,
    generatedAt: TimeInterval,
    validUntil: TimeInterval
  ) {
    expectProjectionError {
      _ = try SharedStoreTestSupport.projection(
        lifecycle: lifecycle,
        opensAt: opensAt,
        dueAt: dueAt,
        generatedAt: generatedAt,
        validUntil: validUntil
      )
    }
  }

  @Test(arguments: [Double.infinity, -Double.infinity, Double.nan])
  func nonfiniteProjectionDatesAreRejected(nonfiniteDate: Double) {
    expectProjectionError {
      _ = try ForgeReturnProjection(
        lifecycle: .scheduled,
        opensAt: Date(timeIntervalSinceReferenceDate: nonfiniteDate),
        dueAt: Date(timeIntervalSinceReferenceDate: 20),
        generatedAt: Date(timeIntervalSinceReferenceDate: 0),
        validUntil: Date(timeIntervalSinceReferenceDate: 30)
      )
    }
  }

  @Test(
    "Hostile projection files fail closed",
    arguments: [
      "{\"lifecycle\":\"scheduled\",\"opensAt\":10,\"dueAt\":20,\"generatedAt\":0,\"validUntil\":30,\"courseID\":\"must-not-persist\"}",
      "{\"lifecycle\":\"scheduled\",\"opensAt\":10,\"dueAt\":20,\"generatedAt\":0,\"validUntil\":30,\"response\":\"must-not-persist\"}",
      "{\"lifecycle\":\"scheduled\",\"opensAt\":10,\"dueAt\":10,\"generatedAt\":0,\"validUntil\":30}",
      "{\"lifecycle\":\"open\",\"opensAt\":10,\"dueAt\":20,\"generatedAt\":0,\"validUntil\":30}",
      "{\"lifecycle\":\"due\",\"opensAt\":10,\"dueAt\":20,\"generatedAt\":19,\"validUntil\":30}",
      "{\"lifecycle\":\"completed\",\"opensAt\":10,\"dueAt\":20,\"generatedAt\":0,\"validUntil\":30}",
      "{\"lifecycle\":\"scheduled\",\"opensAt\":10,\"dueAt\":20,\"generatedAt\":31,\"validUntil\":30}",
      "{\"lifecycle\":\"scheduled\",\"opensAt\":1e999,\"dueAt\":20,\"generatedAt\":0,\"validUntil\":30}",
      "{\"lifecycle\":\"scheduled\",\"opensAt\":10,\"dueAt\":20,\"generatedAt\":0}",
    ]
  )
  func hostileProjectionFilesAreRemoved(payload: String) throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    try Data(payload.utf8).write(to: fixture.projectionURL)

    expectStoreError(.corruptProjection) {
      _ = try fixture.store.loadProjection()
    }

    #expect(!FileManager.default.fileExists(atPath: fixture.projectionURL.path))
  }

  @Test(
    "Duplicate projection field keys fail closed",
    arguments: [
      ("l\\u0069fecycle", "\"scheduled\""),
      ("opensAt", "10"),
      ("dueAt", "20"),
      ("generatedAt", "0"),
      ("validUntil", "30"),
    ]
  )
  func duplicateProjectionFieldKeysAreRejected(
    encodedDuplicateKey: String,
    duplicateValue: String
  ) throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let payload =
      "{\"lifecycle\":\"scheduled\",\"opensAt\":10,\"dueAt\":20,\"generatedAt\":0,\"validUntil\":30,\"\(encodedDuplicateKey)\":\(duplicateValue)}"
    try Data(payload.utf8).write(to: fixture.projectionURL)

    expectStoreError(.corruptProjection) {
      _ = try fixture.store.loadProjection()
    }

    #expect(!FileManager.default.fileExists(atPath: fixture.projectionURL.path))
  }

  @Test
  func oversizedProjectionFilesAreRemovedAndRejected() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    try Data(repeating: 0, count: 4_097).write(to: fixture.projectionURL)

    expectStoreError(.oversizedProjection) {
      _ = try fixture.store.loadProjection()
    }

    #expect(!FileManager.default.fileExists(atPath: fixture.projectionURL.path))
  }

  @Test
  func separateInstancesReadCurrentSharedFiles() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let writer = ForgeSharedStateStore(sharedRootDirectory: fixture.root)
    let reader = ForgeSharedStateStore(sharedRootDirectory: fixture.root)
    let projection = try SharedStoreTestSupport.projection(
      lifecycle: .scheduled,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 0,
      validUntil: 30
    )

    fixture.defaults.set("old v2 projection", forKey: SharedStoreTestSupport.projectionV2Key)
    fixture.defaults.set("preserve", forKey: unrelatedKey)
    try writer.saveProjection(projection)
    try writer.setPendingFocus()

    #expect(try reader.loadProjection() == projection)
    #expect(try reader.consumePendingFocus())
    #expect(!(try writer.consumePendingFocus()))
    #expect(
      fixture.defaults.string(forKey: SharedStoreTestSupport.projectionV2Key)
        == "old v2 projection"
    )
    #expect(fixture.defaults.string(forKey: unrelatedKey) == "preserve")
  }

  @Test
  func stateFileSymbolicLinksFailClosedWithoutReadingTargets() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let destinationURL = fixture.root.appendingPathComponent("unrelated-data")
    try Data("preserve".utf8).write(to: destinationURL)
    try FileManager.default.createSymbolicLink(
      at: fixture.projectionURL,
      withDestinationURL: destinationURL
    )

    expectStoreError(.coordinationUnavailable) {
      _ = try fixture.store.loadProjection()
    }

    #expect(try Data(contentsOf: destinationURL) == Data("preserve".utf8))
  }

  @Test
  func projectionWritesDoNotReplaceSymbolicLinkTargets() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let destinationURL = fixture.root.appendingPathComponent("unrelated-data")
    try Data("preserve".utf8).write(to: destinationURL)
    try FileManager.default.createSymbolicLink(
      at: fixture.projectionURL,
      withDestinationURL: destinationURL
    )

    expectStoreError(.coordinationUnavailable) {
      try fixture.store.saveProjection(
        try SharedStoreTestSupport.projection(
          lifecycle: .scheduled,
          opensAt: 10,
          dueAt: 20,
          generatedAt: 0,
          validUntil: 30
        )
      )
    }

    #expect(try Data(contentsOf: destinationURL) == Data("preserve".utf8))
    #expect(
      !FileManager.default.fileExists(atPath: fixture.projectionStagingURL.path)
    )
  }

  @Test
  func stagingReplacementRaceFailsWithoutReplacingProjection() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let first = try SharedStoreTestSupport.projection(
      lifecycle: .scheduled,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 0,
      validUntil: 30
    )
    let second = try SharedStoreTestSupport.projection(
      lifecycle: .scheduled,
      opensAt: 40,
      dueAt: 50,
      generatedAt: 0,
      validUntil: 60
    )
    try fixture.store.saveProjection(first)
    let projectionStagingURL = fixture.projectionStagingURL
    var hooks = ForgeSharedStateStoreTestHooks()
    hooks.beforeStagingRename = { _ in
      try? FileManager.default.removeItem(at: projectionStagingURL)
      try? Data("foreign staging".utf8).write(to: projectionStagingURL)
    }
    let racingStore = ForgeSharedStateStore(
      sharedRootDirectory: fixture.root,
      legacyDefaults: fixture.defaults,
      testHooks: hooks
    )

    expectStoreError(.writeVerificationFailed) {
      try racingStore.saveProjection(second)
    }

    #expect(try fixture.store.loadProjection() == first)
    #expect(try Data(contentsOf: fixture.projectionStagingURL) == Data("foreign staging".utf8))
  }

  @Test
  func targetReplacementRaceFailsWithoutWritingSymlinkDestination() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let destinationURL = fixture.root.appendingPathComponent("unrelated-data")
    try Data("preserve".utf8).write(to: destinationURL)
    let projectionURL = fixture.projectionURL
    var hooks = ForgeSharedStateStoreTestHooks()
    hooks.beforeStagingRename = { _ in
      try? FileManager.default.removeItem(at: projectionURL)
      try? FileManager.default.createSymbolicLink(
        at: projectionURL,
        withDestinationURL: destinationURL
      )
    }
    let racingStore = ForgeSharedStateStore(
      sharedRootDirectory: fixture.root,
      legacyDefaults: fixture.defaults,
      testHooks: hooks
    )

    expectStoreError(.coordinationUnavailable) {
      try racingStore.saveProjection(
        try SharedStoreTestSupport.projection(
          lifecycle: .scheduled,
          opensAt: 10,
          dueAt: 20,
          generatedAt: 0,
          validUntil: 30
        )
      )
    }

    #expect(try Data(contentsOf: destinationURL) == Data("preserve".utf8))
    #expect(!FileManager.default.fileExists(atPath: fixture.projectionStagingURL.path))
  }

  @Test
  func lockReplacementRaceFailsBeforeProjectionWrite() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let lockURL = fixture.root.appendingPathComponent("forge-shared-state-v3.lock")
    var hooks = ForgeSharedStateStoreTestHooks()
    hooks.beforeLockBinding = {
      try? FileManager.default.removeItem(at: lockURL)
      try? Data("replacement lock".utf8).write(to: lockURL)
    }
    let racingStore = ForgeSharedStateStore(
      sharedRootDirectory: fixture.root,
      legacyDefaults: fixture.defaults,
      testHooks: hooks
    )

    expectStoreError(.coordinationUnavailable) {
      try racingStore.saveProjection(
        try SharedStoreTestSupport.projection(
          lifecycle: .scheduled,
          opensAt: 10,
          dueAt: 20,
          generatedAt: 0,
          validUntil: 30
        )
      )
    }

    #expect(!FileManager.default.fileExists(atPath: fixture.projectionURL.path))
  }

  @Test
  func lockAcquiresImmediatelyWithoutWaitingAndClosesDescriptor() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let timing = SharedStoreTestLockTiming()
    let store = ForgeSharedStateStore(
      sharedRootDirectory: fixture.root,
      legacyDefaults: fixture.defaults,
      testHooks: SharedStoreTestSupport.lockHooks(timing: timing)
    )
    let projection = try SharedStoreTestSupport.projection(
      lifecycle: .scheduled,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 0,
      validUntil: 30
    )

    try store.saveProjection(projection)

    #expect(timing.waitCount == 0)
    let openedDescriptor = try #require(timing.openedDescriptor)
    #expect(SharedStoreTestSupport.isDescriptorClosed(openedDescriptor))
    #expect(try store.loadProjection() == projection)
  }

  @Test
  func contendedLockRetriesAndAcquiresAfterRelease() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let heldDescriptor = try SharedStoreTestSupport.holdExclusiveLock(in: fixture.root)
    defer { SharedStoreTestSupport.releaseAndCloseLock(heldDescriptor) }
    let timing = SharedStoreTestLockTiming()
    var hooks = SharedStoreTestSupport.lockHooks(timing: timing)
    hooks.waitForLockRetry = { nanoseconds in
      timing.wait(nanoseconds)
      _ = flock(heldDescriptor, LOCK_UN)
    }
    let store = ForgeSharedStateStore(
      sharedRootDirectory: fixture.root,
      legacyDefaults: fixture.defaults,
      testHooks: hooks
    )
    let projection = try SharedStoreTestSupport.projection(
      lifecycle: .scheduled,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 0,
      validUntil: 30
    )

    try store.saveProjection(projection)

    #expect(timing.waitCount == 1)
    let openedDescriptor = try #require(timing.openedDescriptor)
    #expect(SharedStoreTestSupport.isDescriptorClosed(openedDescriptor))
    #expect(try store.loadProjection() == projection)
  }

  @Test
  func contendedLockReportsDeadlineTimeoutAndClosesDescriptor() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let firstProjection = try SharedStoreTestSupport.projection(
      lifecycle: .scheduled,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 0,
      validUntil: 30
    )
    let secondProjection = try SharedStoreTestSupport.projection(
      lifecycle: .scheduled,
      opensAt: 40,
      dueAt: 50,
      generatedAt: 0,
      validUntil: 60
    )
    try fixture.store.saveProjection(firstProjection)
    let initialData = try Data(contentsOf: fixture.projectionURL)
    let heldDescriptor = try SharedStoreTestSupport.holdExclusiveLock(in: fixture.root)
    defer { SharedStoreTestSupport.releaseAndCloseLock(heldDescriptor) }
    let timing = SharedStoreTestLockTiming()
    let store = ForgeSharedStateStore(
      sharedRootDirectory: fixture.root,
      legacyDefaults: fixture.defaults,
      testHooks: SharedStoreTestSupport.lockHooks(timing: timing)
    )

    expectStoreError(.lockAcquisitionTimedOut) {
      try store.saveProjection(secondProjection)
    }

    #expect(timing.waitCount == 3)
    #expect(timing.now == 10)
    let openedDescriptor = try #require(timing.openedDescriptor)
    #expect(SharedStoreTestSupport.isDescriptorClosed(openedDescriptor))
    #expect(try Data(contentsOf: fixture.projectionURL) == initialData)
    #expect(!FileManager.default.fileExists(atPath: fixture.projectionStagingURL.path))
  }

  @Test
  func directorySyncFailureReportsWriteFailure() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let projection = try SharedStoreTestSupport.projection(
      lifecycle: .scheduled,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 0,
      validUntil: 30
    )
    var hooks = ForgeSharedStateStoreTestHooks()
    hooks.failDirectorySync = true
    let failingStore = ForgeSharedStateStore(
      sharedRootDirectory: fixture.root,
      legacyDefaults: fixture.defaults,
      testHooks: hooks
    )

    expectStoreError(.writeVerificationFailed) {
      try failingStore.saveProjection(projection)
    }

    #expect(try fixture.store.loadProjection() == projection)
  }

  @Test
  func projectionReplacementIsAtomicAndRemovesStagingFiles() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let first = try SharedStoreTestSupport.projection(
      lifecycle: .scheduled,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 0,
      validUntil: 30
    )
    let second = try SharedStoreTestSupport.projection(
      lifecycle: .scheduled,
      opensAt: 40,
      dueAt: 50,
      generatedAt: 0,
      validUntil: 60
    )
    try fixture.store.saveProjection(first)
    try Data("partial write".utf8).write(to: fixture.projectionStagingURL)

    try fixture.store.saveProjection(second)

    #expect(try fixture.store.loadProjection() == second)
    #expect(
      try JSONDecoder().decode(
        ForgeReturnProjection.self,
        from: Data(contentsOf: fixture.projectionURL)
      ) == second
    )
    #expect(!FileManager.default.fileExists(atPath: fixture.projectionStagingURL.path))
  }

  @Test
  func pendingFocusIsRestrictedAndConsumedOnce() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    try fixture.store.setPendingFocus()
    #expect(try Data(contentsOf: fixture.pendingFocusURL) == Data("focus".utf8))
    #expect(try fixture.store.consumePendingFocus())
    #expect(!(try fixture.store.consumePendingFocus()))
    #expect(!FileManager.default.fileExists(atPath: fixture.pendingFocusURL.path))

    try Data("returns".utf8).write(to: fixture.pendingFocusURL)
    fixture.defaults.set("preserve", forKey: unrelatedKey)

    expectStoreError(.corruptPendingFocus) {
      _ = try fixture.store.consumePendingFocus()
    }

    #expect(!FileManager.default.fileExists(atPath: fixture.pendingFocusURL.path))
    #expect(fixture.defaults.string(forKey: unrelatedKey) == "preserve")
  }

  @Test
  func concurrentInstancesConsumeFocusOnce() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let root = fixture.root
    let start = DispatchSemaphore(value: 0)
    let finished = DispatchGroup()
    let results = Mutex<[Bool]>([])

    try fixture.store.setPendingFocus()

    for _ in 0..<2 {
      finished.enter()
      DispatchQueue.global(qos: .userInitiated).async {
        _ = start.wait(timeout: .now() + 2)
        let store = ForgeSharedStateStore(sharedRootDirectory: root)
        let result = (try? store.consumePendingFocus()) ?? false
        results.withLock { $0.append(result) }
        finished.leave()
      }
    }

    start.signal()
    start.signal()

    #expect(finished.wait(timeout: .now() + 2) == .success)
    #expect(results.withLock { $0.filter { $0 }.count } == 1)
    #expect(!FileManager.default.fileExists(atPath: fixture.pendingFocusURL.path))
  }

  @Test
  func clearProjectionDeletesTargetAndStagingFiles() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    try fixture.store.saveProjection(
      try SharedStoreTestSupport.projection(
        lifecycle: .scheduled,
        opensAt: 10,
        dueAt: 20,
        generatedAt: 0,
        validUntil: 30
      )
    )
    try Data("stale".utf8).write(to: fixture.projectionStagingURL)

    try fixture.store.clearProjection()

    #expect(!FileManager.default.fileExists(atPath: fixture.projectionURL.path))
    #expect(!FileManager.default.fileExists(atPath: fixture.projectionStagingURL.path))
    #expect(try fixture.store.loadProjection() == nil)
  }

  @Test
  func legacyCleanupFailureDoesNotSkipProjectionWrite() throws {
    let suiteName = "ForgeCoreTests.LegacyRemovalFailure.\(UUID().uuidString)"
    let defaults = try #require(RemovalResistantDefaults(suiteName: suiteName))
    let fixture = try SharedStoreTestSupport.makeFixture(
      defaults: defaults,
      suiteName: suiteName
    )
    defer { SharedStoreTestSupport.clean(fixture) }

    defaults.protectedKey = SharedStoreTestSupport.legacyV1Keys[0]
    for key in SharedStoreTestSupport.legacyV1Keys + SharedStoreTestSupport.legacyV2Keys {
      defaults.set("legacy", forKey: key)
    }
    defaults.set("preserve", forKey: unrelatedKey)
    let projection = try SharedStoreTestSupport.projection(
      lifecycle: .scheduled,
      opensAt: 10,
      dueAt: 20,
      generatedAt: 0,
      validUntil: 30
    )

    #expect(try !fixture.store.purgeLegacyState())
    try fixture.store.saveProjection(projection)

    #expect(defaults.string(forKey: defaults.protectedKey ?? "") == "legacy")
    for key in (SharedStoreTestSupport.legacyV1Keys + SharedStoreTestSupport.legacyV2Keys)
      .dropFirst()
    {
      #expect(defaults.object(forKey: key) == nil)
    }
    #expect(try fixture.store.loadProjection() == projection)
    #expect(defaults.string(forKey: unrelatedKey) == "preserve")
  }

  #if os(macOS)
    @Test
    func forkedProcessReadsFreshProjection() throws {
      let fixture = try SharedStoreTestSupport.makeFixture()
      defer { SharedStoreTestSupport.clean(fixture) }

      let projection = try SharedStoreTestSupport.projection(
        lifecycle: .scheduled,
        opensAt: 10,
        dueAt: 20,
        generatedAt: 0,
        validUntil: 30
      )
      try fixture.store.saveProjection(projection)

      let processID = try forkProcess()
      if processID == 0 {
        let childStore = ForgeSharedStateStore(sharedRootDirectory: fixture.root)
        do {
          _exit(try childStore.loadProjection() == projection ? 0 : 1)
        } catch {
          _exit(2)
        }
      }

      #expect(try waitForChildExit(processID) == 0)
    }

    @Test
    func forkedProcessesConsumeFocusExactlyOnce() throws {
      let fixture = try SharedStoreTestSupport.makeFixture()
      defer { SharedStoreTestSupport.clean(fixture) }

      try fixture.store.setPendingFocus()
      var gate = [Int32](repeating: 0, count: 2)
      guard pipe(&gate) == 0 else {
        throw SharedStoreTestError.pipeCreationFailed
      }
      defer {
        _ = close(gate[0])
        _ = close(gate[1])
      }

      let firstProcessID = try forkFocusConsumer(
        root: fixture.root,
        readDescriptor: gate[0],
        writeDescriptor: gate[1]
      )
      let secondProcessID = try forkFocusConsumer(
        root: fixture.root,
        readDescriptor: gate[0],
        writeDescriptor: gate[1]
      )
      _ = close(gate[0])
      gate[0] = -1

      try releaseForkedConsumers(on: gate[1])
      _ = close(gate[1])
      gate[1] = -1

      let exitCodes = [
        try waitForChildExit(firstProcessID),
        try waitForChildExit(secondProcessID),
      ]
      #expect(exitCodes.filter { $0 == 0 }.count == 1)
      #expect(exitCodes.filter { $0 == 10 }.count == 1)
      #expect(!FileManager.default.fileExists(atPath: fixture.pendingFocusURL.path))
    }
  #endif

  private func expectProjectionError(_ operation: () throws -> Void) {
    expectStoreError(.corruptProjection, operation)
  }

  private func expectStoreError(
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

struct SharedStoreFixture {
  let root: URL
  let defaults: UserDefaults
  let suiteName: String?
  let store: ForgeSharedStateStore

  var projectionURL: URL {
    root.appendingPathComponent(SharedStoreTestSupport.projectionFileName)
  }

  var projectionStagingURL: URL {
    root.appendingPathComponent("\(SharedStoreTestSupport.projectionFileName).staging")
  }

  var pendingFocusURL: URL {
    root.appendingPathComponent(SharedStoreTestSupport.pendingFocusFileName)
  }
}

enum SharedStoreTestSupport {
  static let projectionFileName = "forge.return-projection.v3.json"
  static let pendingFocusFileName = "forge.pending-focus.v3"
  static let lockFileName = "forge-shared-state-v3.lock"
  static let projectionV2Key = "forge.due-return-projection.v2"
  static let legacyV1Keys = [
    "forge.snapshot.v1",
    "forge.onboarding.v1",
    "forge.onboarding-dismissed.v1",
    "forge.pending-destination.v1",
    "forge.reminders-enabled.v1",
    "forge.grown-up-manages-reminders.v1",
  ]
  static let legacyV2Keys = [
    projectionV2Key,
    "forge.pending-focus.v2",
  ]

  static func projection(
    lifecycle: ForgeReturnProjectionLifecycle,
    opensAt: TimeInterval,
    dueAt: TimeInterval,
    generatedAt: TimeInterval,
    validUntil: TimeInterval
  ) throws -> ForgeReturnProjection {
    try ForgeReturnProjection(
      lifecycle: lifecycle,
      opensAt: Date(timeIntervalSinceReferenceDate: opensAt),
      dueAt: Date(timeIntervalSinceReferenceDate: dueAt),
      generatedAt: Date(timeIntervalSinceReferenceDate: generatedAt),
      validUntil: Date(timeIntervalSinceReferenceDate: validUntil)
    )
  }

  static func makeFixture() throws -> SharedStoreFixture {
    let suiteName = "ForgeCoreTests.SharedProjection.\(UUID().uuidString)"
    let defaults = try #require(UserDefaults(suiteName: suiteName))
    return try makeFixture(defaults: defaults, suiteName: suiteName)
  }

  static func makeFixture(
    defaults: UserDefaults,
    suiteName: String? = nil
  ) throws -> SharedStoreFixture {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent(
      "ForgeCoreTests.SharedProjection.\(UUID().uuidString)",
      isDirectory: true
    )
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    return SharedStoreFixture(
      root: root,
      defaults: defaults,
      suiteName: suiteName,
      store: ForgeSharedStateStore(
        sharedRootDirectory: root,
        legacyDefaults: defaults
      )
    )
  }

  static func clean(_ fixture: SharedStoreFixture) {
    try? FileManager.default.removeItem(at: fixture.root)
    if let suiteName = fixture.suiteName {
      fixture.defaults.removePersistentDomain(forName: suiteName)
    }
  }

  static func lockHooks(
    timing: SharedStoreTestLockTiming,
    timeoutNanoseconds: UInt64 = 10,
    retryIntervalNanoseconds: UInt64 = 4
  ) -> ForgeSharedStateStoreTestHooks {
    var hooks = ForgeSharedStateStoreTestHooks()
    hooks.lockAcquisitionTimeoutNanoseconds = timeoutNanoseconds
    hooks.lockRetryIntervalNanoseconds = retryIntervalNanoseconds
    hooks.monotonicTimeNanoseconds = { timing.now }
    hooks.waitForLockRetry = { timing.wait($0) }
    hooks.lockDescriptorOpened = { timing.recordOpenedDescriptor($0) }
    return hooks
  }

  static func holdExclusiveLock(in root: URL) throws -> Int32 {
    let lockURL = root.appendingPathComponent(lockFileName)
    let descriptor = lockURL.withUnsafeFileSystemRepresentation { path -> Int32 in
      guard let path else { return -1 }
      return open(path, O_CREAT | O_RDWR | O_CLOEXEC | O_NOFOLLOW, S_IRUSR | S_IWUSR)
    }
    guard descriptor >= 0 else {
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    guard flock(descriptor, LOCK_EX | LOCK_NB) == 0 else {
      _ = close(descriptor)
      throw ForgeSharedStateStoreError.coordinationUnavailable
    }
    return descriptor
  }

  static func releaseAndCloseLock(_ descriptor: Int32) {
    _ = flock(descriptor, LOCK_UN)
    _ = close(descriptor)
  }

  static func isDescriptorClosed(_ descriptor: Int32) -> Bool {
    errno = 0
    return fcntl(descriptor, F_GETFD) == -1 && errno == EBADF
  }
}

final class RemovalResistantDefaults: UserDefaults {
  var protectedKey: String?

  override func removeObject(forKey defaultName: String) {
    guard defaultName != protectedKey else {
      return
    }
    super.removeObject(forKey: defaultName)
  }
}

final class SharedStoreTestLockTiming: Sendable {
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
    state.withLock {
      $0.openedDescriptor = descriptor
    }
  }
}

#if os(macOS)
  private enum SharedStoreTestError: Error {
    case pipeCreationFailed
    case processCreationFailed
    case processExitFailed
  }

  private func forkFocusConsumer(
    root: URL,
    readDescriptor: Int32,
    writeDescriptor: Int32
  ) throws -> pid_t {
    let processID = try forkProcess()
    guard processID != 0 else {
      _ = close(writeDescriptor)
      var startByte: UInt8 = 0
      let byteCount = Darwin.read(readDescriptor, &startByte, 1)
      _ = close(readDescriptor)
      guard byteCount == 1 else {
        _exit(20)
      }

      let store = ForgeSharedStateStore(sharedRootDirectory: root)
      do {
        _exit(try store.consumePendingFocus() ? 0 : 10)
      } catch {
        _exit(11)
      }
    }
    return processID
  }

  private func releaseForkedConsumers(on descriptor: Int32) throws {
    let startBytes: [UInt8] = [1, 1]
    var writtenByteCount = 0

    while writtenByteCount < startBytes.count {
      let result = startBytes.withUnsafeBytes { rawBuffer -> Int in
        guard let baseAddress = rawBuffer.baseAddress else {
          return -1
        }
        return Darwin.write(
          descriptor,
          baseAddress.advanced(by: writtenByteCount),
          startBytes.count - writtenByteCount
        )
      }
      guard result >= 0 else {
        guard errno == EINTR else {
          throw SharedStoreTestError.processExitFailed
        }
        continue
      }
      guard result > 0 else {
        throw SharedStoreTestError.processExitFailed
      }
      writtenByteCount += result
    }
  }

  private func waitForChildExit(_ processID: pid_t) throws -> Int32 {
    var status: Int32 = 0
    while waitpid(processID, &status, 0) == -1 {
      guard errno == EINTR else {
        throw SharedStoreTestError.processExitFailed
      }
    }
    guard status & 0x7F == 0 else {
      throw SharedStoreTestError.processExitFailed
    }
    return (status >> 8) & 0xFF
  }

  private func forkProcess() throws -> pid_t {
    guard let handle = dlopen(nil, RTLD_NOW) else {
      throw SharedStoreTestError.processCreationFailed
    }
    guard let symbol = "fork".withCString({ dlsym(handle, $0) }) else {
      throw SharedStoreTestError.processCreationFailed
    }

    typealias ForkFunction = @convention(c) () -> pid_t
    let function = unsafeBitCast(symbol, to: ForkFunction.self)
    let processID = function()
    guard processID >= 0 else {
      throw SharedStoreTestError.processCreationFailed
    }
    return processID
  }
#endif
