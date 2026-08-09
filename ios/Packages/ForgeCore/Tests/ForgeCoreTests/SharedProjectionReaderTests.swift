import Foundation
import Testing

@testable import ForgeCore

struct SharedProjectionReaderTests {
  @Test("The widget reader returns the exact redacted projection")
  func readsProjection() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let projection = try SharedStoreTestSupport.projection()
    try fixture.store.saveProjection(projection)

    let reader = ForgeSharedProjectionReader(
      sharedRootDirectory: fixture.root
    )

    #expect(try reader.readProjection() == projection)
  }

  @Test("The widget reader returns no data when the store is empty")
  func emptyStoreReturnsNil() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let reader = ForgeSharedProjectionReader(
      sharedRootDirectory: fixture.root
    )

    #expect(try reader.readProjection() == nil)
  }

  @Test("A projection without its coordination lock fails closed")
  func requiresCoordinationLock() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try JSONEncoder().encode(
      SharedStoreTestSupport.projection()
    ).write(to: fixture.projectionURL)
    let reader = ForgeSharedProjectionReader(
      sharedRootDirectory: fixture.root
    )

    #expect(throws: ForgeSharedStateStoreError.coordinationUnavailable) {
      _ = try reader.readProjection()
    }
  }

  @Test("The widget reader rejects projection symlinks")
  func rejectsProjectionSymlink() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try fixture.store.saveProjection(
      SharedStoreTestSupport.projection()
    )
    try FileManager.default.removeItem(at: fixture.projectionURL)
    let outsideURL = fixture.root.deletingLastPathComponent()
      .appendingPathComponent("outside-\(UUID().uuidString)")
    defer { try? FileManager.default.removeItem(at: outsideURL) }
    try JSONEncoder().encode(
      SharedStoreTestSupport.projection()
    ).write(to: outsideURL)
    try FileManager.default.createSymbolicLink(
      at: fixture.projectionURL,
      withDestinationURL: outsideURL
    )
    let reader = ForgeSharedProjectionReader(
      sharedRootDirectory: fixture.root
    )

    #expect(throws: ForgeSharedStateStoreError.coordinationUnavailable) {
      _ = try reader.readProjection()
    }
  }

  @Test("The widget reader rejects oversized content")
  func rejectsOversizedProjection() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try fixture.store.saveProjection(
      SharedStoreTestSupport.projection()
    )
    try Data(repeating: 0x61, count: 4_097).write(
      to: fixture.projectionURL
    )
    let reader = ForgeSharedProjectionReader(
      sharedRootDirectory: fixture.root
    )

    #expect(throws: ForgeSharedStateStoreError.oversizedProjection) {
      _ = try reader.readProjection()
    }
  }

  @Test("The widget reader rejects unknown private fields")
  func rejectsPrivateFieldInjection() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try fixture.store.saveProjection(
      SharedStoreTestSupport.projection()
    )
    let rawJSON =
      #"{"status":"ready-to-work","dueAt":null,"generatedAt":0,"validUntil":21600,"practiceText":"private"}"#
    try Data(rawJSON.utf8).write(to: fixture.projectionURL)
    let reader = ForgeSharedProjectionReader(
      sharedRootDirectory: fixture.root
    )

    #expect(throws: ForgeSharedStateStoreError.corruptProjection) {
      _ = try reader.readProjection()
    }
  }
}
