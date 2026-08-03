import Foundation
import Testing

@testable import ForgeCore

struct SharedStateResetTests {
  @Test("Clear all removes v2 shared state and obsolete integration files")
  func clearAllRemovesManagedState() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try fixture.store.saveProjection(
      SharedStoreTestSupport.projection()
    )
    for fileName in SharedStoreTestSupport.obsoleteFileNames {
      try Data("legacy".utf8).write(
        to: fixture.root.appendingPathComponent(fileName)
      )
    }
    fixture.defaults.set("preserve", forKey: "unrelated")
    for key in SharedStoreTestSupport.legacyKeys {
      fixture.defaults.set("legacy", forKey: key)
    }

    try fixture.store.clearAll()

    #expect(try fixture.store.loadProjection() == nil)
    #expect(fixture.defaults.string(forKey: "unrelated") == "preserve")
    for key in SharedStoreTestSupport.legacyKeys {
      #expect(fixture.defaults.object(forKey: key) == nil)
    }
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
