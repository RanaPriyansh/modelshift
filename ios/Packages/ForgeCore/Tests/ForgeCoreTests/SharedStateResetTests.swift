import Foundation
import Testing

@testable import ForgeCore

struct SharedStateResetTests {
  @Test("Clear all removes current and obsolete shared-state files")
  func clearAllRemovesManagedState() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try fixture.store.saveProjection(
      SharedStoreTestSupport.projection()
    )
    try fixture.store.setPendingDestination(.settings)
    for fileName in SharedStoreTestSupport.obsoleteFileNames {
      try Data("legacy".utf8).write(
        to: fixture.root.appendingPathComponent(fileName)
      )
    }

    try fixture.store.clearAll()

    #expect(try fixture.store.loadProjection() == nil)
    #expect(
      !FileManager.default.fileExists(
        atPath: fixture.pendingDestinationURL.path
      )
    )
    for fileName in SharedStoreTestSupport.obsoleteFileNames {
      #expect(
        !FileManager.default.fileExists(
          atPath: fixture.root.appendingPathComponent(fileName).path
        )
      )
    }
  }

  @Test("Clear all does not remove unrelated files")
  func clearAllPreservesUnrelatedFile() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let unrelatedURL = fixture.root.appendingPathComponent("student-note.txt")
    try Data("preserve".utf8).write(to: unrelatedURL)
    try fixture.store.saveProjection(
      SharedStoreTestSupport.projection()
    )

    try fixture.store.clearAll()

    #expect(try Data(contentsOf: unrelatedURL) == Data("preserve".utf8))
  }

  @Test("Clear all fails when a managed path is not a regular file")
  func clearAllRejectsManagedDirectory() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let managedURL = fixture.root.appendingPathComponent(
      "forge.pending-focus.v3"
    )
    try FileManager.default.createDirectory(
      at: managedURL,
      withIntermediateDirectories: false
    )

    #expect(throws: ForgeSharedStateStoreError.removalVerificationFailed) {
      try fixture.store.clearAll()
    }
    var isDirectory: ObjCBool = false
    #expect(
      FileManager.default.fileExists(
        atPath: managedURL.path,
        isDirectory: &isDirectory
      )
    )
    #expect(isDirectory.boolValue)
  }
}
