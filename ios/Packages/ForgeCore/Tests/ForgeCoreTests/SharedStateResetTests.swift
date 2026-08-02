import Foundation
import Testing

@testable import ForgeCore

struct SharedStateResetTests {
  @Test
  func purgeLegacyStateRemovesV1AndV2ValuesOnly() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    let projection = try SharedStoreTestSupport.projection(
      lifecycle: .scheduled,
      opensAt: 1_800_000_010,
      dueAt: 1_800_000_020,
      generatedAt: 1_800_000_000,
      validUntil: 1_800_000_030
    )
    try fixture.store.saveProjection(projection)
    try fixture.store.setPendingFocus()
    for key in SharedStoreTestSupport.legacyV1Keys + SharedStoreTestSupport.legacyV2Keys {
      fixture.defaults.set("legacy", forKey: key)
    }
    fixture.defaults.set("preserve", forKey: "unrelated")

    #expect(try fixture.store.purgeLegacyState())

    for key in SharedStoreTestSupport.legacyV1Keys + SharedStoreTestSupport.legacyV2Keys {
      #expect(fixture.defaults.object(forKey: key) == nil)
    }
    #expect(try fixture.store.loadProjection() == projection)
    #expect(try fixture.store.consumePendingFocus())
    #expect(fixture.defaults.string(forKey: "unrelated") == "preserve")
  }

  @Test
  func clearAllRemovesV3FilesAndLegacyValues() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    try fixture.store.saveProjection(
      try SharedStoreTestSupport.projection(
        lifecycle: .scheduled,
        opensAt: 1_800_000_010,
        dueAt: 1_800_000_020,
        generatedAt: 1_800_000_000,
        validUntil: 1_800_000_030
      )
    )
    try fixture.store.setPendingFocus()
    try Data("projection staging".utf8).write(to: fixture.projectionStagingURL)
    let pendingFocusStagingURL = fixture.root.appendingPathComponent(
      "\(SharedStoreTestSupport.pendingFocusFileName).staging"
    )
    try Data("focus staging".utf8).write(to: pendingFocusStagingURL)
    for key in SharedStoreTestSupport.legacyV1Keys + SharedStoreTestSupport.legacyV2Keys {
      fixture.defaults.set("legacy", forKey: key)
    }
    fixture.defaults.set("preserve", forKey: "unrelated")

    try fixture.store.clearAll()

    #expect(!FileManager.default.fileExists(atPath: fixture.projectionURL.path))
    #expect(!FileManager.default.fileExists(atPath: fixture.projectionStagingURL.path))
    #expect(!FileManager.default.fileExists(atPath: fixture.pendingFocusURL.path))
    #expect(!FileManager.default.fileExists(atPath: pendingFocusStagingURL.path))
    for key in SharedStoreTestSupport.legacyV1Keys + SharedStoreTestSupport.legacyV2Keys {
      #expect(fixture.defaults.object(forKey: key) == nil)
    }
    #expect(fixture.defaults.string(forKey: "unrelated") == "preserve")
  }

  @Test
  func clearAllDoesNotMutateStateAfterLockTimeout() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    try fixture.store.saveProjection(
      try SharedStoreTestSupport.projection(
        lifecycle: .scheduled,
        opensAt: 1_800_000_010,
        dueAt: 1_800_000_020,
        generatedAt: 1_800_000_000,
        validUntil: 1_800_000_030
      )
    )
    try fixture.store.setPendingFocus()
    let projectionData = try Data(contentsOf: fixture.projectionURL)
    let projectionStagingData = Data("projection staging".utf8)
    try projectionStagingData.write(to: fixture.projectionStagingURL)
    let pendingFocusStagingURL = fixture.root.appendingPathComponent(
      "\(SharedStoreTestSupport.pendingFocusFileName).staging"
    )
    let pendingFocusStagingData = Data("focus staging".utf8)
    try pendingFocusStagingData.write(to: pendingFocusStagingURL)
    for key in SharedStoreTestSupport.legacyV1Keys + SharedStoreTestSupport.legacyV2Keys {
      fixture.defaults.set("legacy", forKey: key)
    }

    let heldDescriptor = try SharedStoreTestSupport.holdExclusiveLock(in: fixture.root)
    defer { SharedStoreTestSupport.releaseAndCloseLock(heldDescriptor) }
    let timing = SharedStoreTestLockTiming()
    let store = ForgeSharedStateStore(
      sharedRootDirectory: fixture.root,
      legacyDefaults: fixture.defaults,
      testHooks: SharedStoreTestSupport.lockHooks(timing: timing)
    )

    do {
      try store.clearAll()
      Issue.record("Clear must report a lock acquisition timeout.")
    } catch let error as ForgeSharedStateStoreError {
      #expect(error == .lockAcquisitionTimedOut)
    } catch {
      Issue.record("Unexpected error: \(error)")
    }

    #expect(timing.waitCount == 3)
    let openedDescriptor = try #require(timing.openedDescriptor)
    #expect(SharedStoreTestSupport.isDescriptorClosed(openedDescriptor))
    #expect(try Data(contentsOf: fixture.projectionURL) == projectionData)
    #expect(try Data(contentsOf: fixture.projectionStagingURL) == projectionStagingData)
    #expect(try Data(contentsOf: fixture.pendingFocusURL) == Data("focus".utf8))
    #expect(try Data(contentsOf: pendingFocusStagingURL) == pendingFocusStagingData)
    for key in SharedStoreTestSupport.legacyV1Keys + SharedStoreTestSupport.legacyV2Keys {
      #expect(fixture.defaults.string(forKey: key) == "legacy")
    }
  }

  @Test
  func directorySyncFailureReportsRemovalFailure() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    try fixture.store.saveProjection(
      try SharedStoreTestSupport.projection(
        lifecycle: .scheduled,
        opensAt: 1_800_000_010,
        dueAt: 1_800_000_020,
        generatedAt: 1_800_000_000,
        validUntil: 1_800_000_030
      )
    )
    var hooks = ForgeSharedStateStoreTestHooks()
    hooks.failDirectorySync = true
    let failingStore = ForgeSharedStateStore(
      sharedRootDirectory: fixture.root,
      legacyDefaults: fixture.defaults,
      testHooks: hooks
    )

    do {
      try failingStore.clearProjection()
      Issue.record("Clear must report a directory sync failure.")
    } catch let error as ForgeSharedStateStoreError {
      #expect(error == .removalVerificationFailed)
    } catch {
      Issue.record("Unexpected error: \(error)")
    }

    #expect(!FileManager.default.fileExists(atPath: fixture.projectionURL.path))
  }

  @Test
  func clearAllAttemptsV3AndEveryLegacyValueBeforeFailure() throws {
    let suiteName = "ForgeCoreTests.SharedStateResetFailure.\(UUID().uuidString)"
    let defaults = try #require(RemovalResistantDefaults(suiteName: suiteName))
    let fixture = try SharedStoreTestSupport.makeFixture(
      defaults: defaults,
      suiteName: suiteName
    )
    defer { SharedStoreTestSupport.clean(fixture) }

    let protectedKey = SharedStoreTestSupport.legacyV1Keys[0]
    defaults.protectedKey = protectedKey
    try fixture.store.saveProjection(
      try SharedStoreTestSupport.projection(
        lifecycle: .scheduled,
        opensAt: 1_800_000_010,
        dueAt: 1_800_000_020,
        generatedAt: 1_800_000_000,
        validUntil: 1_800_000_030
      )
    )
    try fixture.store.setPendingFocus()
    for key in SharedStoreTestSupport.legacyV1Keys + SharedStoreTestSupport.legacyV2Keys {
      defaults.set("owned", forKey: key)
    }
    defaults.set("preserve", forKey: "unrelated")

    do {
      try fixture.store.clearAll()
      Issue.record("Clear must report a value that remains after removal.")
    } catch let error as ForgeSharedStateStoreError {
      #expect(error == .removalVerificationFailed)
    } catch {
      Issue.record("Unexpected error: \(error)")
    }

    #expect(defaults.string(forKey: protectedKey) == "owned")
    for key in SharedStoreTestSupport.legacyV1Keys + SharedStoreTestSupport.legacyV2Keys
    where key != protectedKey {
      #expect(defaults.object(forKey: key) == nil)
    }
    #expect(!FileManager.default.fileExists(atPath: fixture.projectionURL.path))
    #expect(!FileManager.default.fileExists(atPath: fixture.pendingFocusURL.path))
    #expect(defaults.string(forKey: "unrelated") == "preserve")
  }

  @Test
  func clearAllRemovesLegacyValuesWhenAV3PathIsUnsafe() throws {
    let fixture = try SharedStoreTestSupport.makeFixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    try fixture.store.setPendingFocus()
    let destinationURL = fixture.root.appendingPathComponent("preserved-data")
    try Data("preserve".utf8).write(to: destinationURL)
    try FileManager.default.createSymbolicLink(
      at: fixture.projectionURL,
      withDestinationURL: destinationURL
    )
    for key in SharedStoreTestSupport.legacyV1Keys + SharedStoreTestSupport.legacyV2Keys {
      fixture.defaults.set("legacy", forKey: key)
    }

    do {
      try fixture.store.clearAll()
      Issue.record("Clear must report an unsafe v3 state path.")
    } catch let error as ForgeSharedStateStoreError {
      #expect(error == .removalVerificationFailed)
    } catch {
      Issue.record("Unexpected error: \(error)")
    }

    for key in SharedStoreTestSupport.legacyV1Keys + SharedStoreTestSupport.legacyV2Keys {
      #expect(fixture.defaults.object(forKey: key) == nil)
    }
    #expect(!FileManager.default.fileExists(atPath: fixture.pendingFocusURL.path))
    #expect(try Data(contentsOf: destinationURL) == Data("preserve".utf8))
  }
}
