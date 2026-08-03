import Foundation
import Synchronization
import Testing

@testable import ForgeCore

struct SharedProjectionStoreTests {
  @Test("The store saves one redacted Semester Desk projection")
  func savesAndLoadsProjection() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let projection = try SharedStoreTestSupport.projection()

    try fixture.store.saveProjection(projection)

    #expect(try fixture.store.loadProjection() == projection)
    let data = try Data(contentsOf: fixture.projectionURL)
    let object = try #require(
      JSONSerialization.jsonObject(with: data) as? [String: Any]
    )
    #expect(
      Set(object.keys)
        == [
          "status",
          "dueAt",
          "generatedAt",
          "validUntil",
        ]
    )
    let text = try #require(String(data: data, encoding: .utf8))
    for forbidden in [
      "courseLabel",
      "planItemLabel",
      "activityLabel",
      "selectedChoiceLabel",
      "practiceText",
      "independentCheckText",
      "delayedReturnText",
      "answer",
      "sourceLabel",
      "factConflicts",
      "semesterDesk",
      "learnerState",
    ] {
      #expect(!text.contains(forbidden))
    }
  }

  @Test("Projection states enforce action-safe fields")
  func projectionValidationFailsClosed() {
    let generatedAt = Date(timeIntervalSinceReferenceDate: 100)
    let validUntil = generatedAt.addingTimeInterval(3_600)

    #expect(throws: ForgeSharedStateStoreError.corruptProjection) {
      _ = try ForgeSemesterDeskProjection(
        status: .needsReview,
        dueAt: generatedAt.addingTimeInterval(1),
        generatedAt: generatedAt,
        validUntil: validUntil
      )
    }
    #expect(throws: ForgeSharedStateStoreError.corruptProjection) {
      _ = try ForgeSemesterDeskProjection(
        status: .comeBack,
        dueAt: generatedAt,
        generatedAt: generatedAt,
        validUntil: validUntil
      )
    }
    #expect(throws: ForgeSharedStateStoreError.corruptProjection) {
      _ = try ForgeSemesterDeskProjection(
        status: .readyToWork,
        dueAt: generatedAt.addingTimeInterval(1),
        generatedAt: generatedAt,
        validUntil: validUntil
      )
    }
    #expect(throws: ForgeSharedStateStoreError.corruptProjection) {
      _ = try ForgeSemesterDeskProjection(
        status: .comeBack,
        dueAt: nil,
        generatedAt: generatedAt,
        validUntil: validUntil
      )
    }
  }

  @Test("A pending v2 destination is consumed once")
  func pendingDestinationIsConsumedOnce() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }

    try fixture.store.setPendingDestination(.today)

    #expect(try fixture.store.consumePendingDestination() == .today)
    #expect(try fixture.store.consumePendingDestination() == nil)
    #expect(
      !FileManager.default.fileExists(
        atPath: fixture.pendingDestinationURL.path
      )
    )
  }

  @Test("A corrupt pending destination is removed")
  func corruptPendingDestinationFailsClosed() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try Data("focus".utf8).write(to: fixture.pendingDestinationURL)

    #expect(throws: ForgeSharedStateStoreError.corruptPendingDestination) {
      _ = try fixture.store.consumePendingDestination()
    }
    #expect(
      !FileManager.default.fileExists(
        atPath: fixture.pendingDestinationURL.path
      )
    )
  }

  @Test("Unknown, missing, and duplicate JSON keys are rejected")
  func rejectsNoncanonicalJSON() throws {
    for rawJSON in [
      #"{"status":"ready-to-work","dueAt":null,"generatedAt":100,"validUntil":200,"private":"text"}"#,
      #"{"status":"ready-to-work","generatedAt":100,"validUntil":200}"#,
      #"{"status":"ready-to-work","status":"come-back","dueAt":null,"generatedAt":100,"validUntil":200}"#,
    ] {
      let fixture = try SharedStoreTestSupport.fixture()
      defer { SharedStoreTestSupport.clean(fixture) }
      try Data(rawJSON.utf8).write(to: fixture.projectionURL)

      #expect(throws: ForgeSharedStateStoreError.corruptProjection) {
        _ = try fixture.store.loadProjection()
      }
      #expect(!FileManager.default.fileExists(atPath: fixture.projectionURL.path))
    }
  }

  @Test("An oversized projection is removed")
  func rejectsOversizedProjection() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    try Data(repeating: 0x61, count: 4_097).write(to: fixture.projectionURL)

    #expect(throws: ForgeSharedStateStoreError.oversizedProjection) {
      _ = try fixture.store.loadProjection()
    }
    #expect(!FileManager.default.fileExists(atPath: fixture.projectionURL.path))
  }

  @Test("A staging symlink is never followed")
  func rejectsStagingSymlink() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let outsideURL = fixture.root.deletingLastPathComponent()
      .appendingPathComponent("outside-\(UUID().uuidString)")
    defer { try? FileManager.default.removeItem(at: outsideURL) }
    try Data("preserve".utf8).write(to: outsideURL)
    try FileManager.default.createSymbolicLink(
      at: fixture.projectionStagingURL,
      withDestinationURL: outsideURL
    )

    #expect(throws: ForgeSharedStateStoreError.writeVerificationFailed) {
      try fixture.store.saveProjection(
        SharedStoreTestSupport.projection()
      )
    }
    #expect(try Data(contentsOf: outsideURL) == Data("preserve".utf8))
  }

  @Test("Legacy integration data is purged without changing unrelated defaults")
  func purgesLegacyState() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    fixture.defaults.set("preserve", forKey: "unrelated")
    for key in SharedStoreTestSupport.legacyKeys {
      fixture.defaults.set("legacy", forKey: key)
    }
    for fileName in SharedStoreTestSupport.obsoleteFileNames {
      try Data("legacy".utf8).write(
        to: fixture.root.appendingPathComponent(fileName)
      )
    }

    #expect(try fixture.store.purgeLegacyState())
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

  @Test("Concurrent projection writes stay decodable")
  func serializesConcurrentWrites() throws {
    let fixture = try SharedStoreTestSupport.fixture()
    defer { SharedStoreTestSupport.clean(fixture) }
    let first = try SharedStoreTestSupport.projection(
      status: .readyToWork,
      dueAt: nil
    )
    let second = try SharedStoreTestSupport.projection(
      status: .comeBack,
      dueAt: Date(timeIntervalSinceReferenceDate: 7_200)
    )
    let errors = Mutex<[String]>([])
    let stores = [
      SharedStoreFixture(
        root: fixture.root,
        defaults: fixture.defaults,
        store: ForgeSharedStateStore(
          sharedRootDirectory: fixture.root,
          legacyDefaults: fixture.defaults
        )
      ),
      SharedStoreFixture(
        root: fixture.root,
        defaults: fixture.defaults,
        store: ForgeSharedStateStore(
          sharedRootDirectory: fixture.root,
          legacyDefaults: fixture.defaults
        )
      ),
    ]

    for iteration in 0..<100 {
      let queue = DispatchQueue(
        label: "forge.shared-store-tests.\(iteration)",
        attributes: .concurrent
      )
      let ready = DispatchGroup()
      let completed = DispatchGroup()
      let start = DispatchSemaphore(value: 0)

      for (index, projection) in [first, second].enumerated() {
        ready.enter()
        completed.enter()
        queue.async {
          ready.leave()
          start.wait()
          defer { completed.leave() }
          do {
            try stores[index].store.saveProjection(projection)
          } catch {
            errors.withLock {
              $0.append("\(iteration):\(String(describing: error))")
            }
          }
        }
      }
      #expect(ready.wait(timeout: .now() + 5) == .success)
      start.signal()
      start.signal()
      #expect(completed.wait(timeout: .now() + 5) == .success)
    }

    let capturedErrors = errors.withLock { $0 }
    #expect(capturedErrors.isEmpty)
    let loadedProjection = try fixture.store.loadProjection()
    let loaded = try #require(loadedProjection)
    #expect(loaded == first || loaded == second)
    #expect(!FileManager.default.fileExists(atPath: fixture.projectionStagingURL.path))
  }
}

struct SharedStoreFixture: @unchecked Sendable {
  let root: URL
  let defaults: UserDefaults
  let store: ForgeSharedStateStore

  var projectionURL: URL {
    root.appendingPathComponent("forge.semester-desk-projection.v2.json")
  }

  var pendingDestinationURL: URL {
    root.appendingPathComponent("forge.pending-destination.v2")
  }

  var projectionStagingURL: URL {
    root.appendingPathComponent("forge.semester-desk-projection.v2.json.staging")
  }

  var lockURL: URL {
    root.appendingPathComponent("forge-shared-state-v4.lock")
  }
}

enum SharedStoreTestSupport {
  static let legacyKeys = [
    "forge.snapshot.v1",
    "forge.onboarding.v1",
    "forge.onboarding-dismissed.v1",
    "forge.pending-destination.v1",
    "forge.reminders-enabled.v1",
    "forge.grown-up-manages-reminders.v1",
    "forge.due-return-projection.v2",
    "forge.pending-focus.v2",
  ]

  static let obsoleteFileNames = [
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

  static func fixture() throws -> SharedStoreFixture {
    let root = FileManager.default.temporaryDirectory
      .appendingPathComponent("forge-shared-\(UUID().uuidString)")
    try FileManager.default.createDirectory(
      at: root,
      withIntermediateDirectories: true
    )
    let suiteName = "forge-shared-tests-\(UUID().uuidString)"
    let defaults = try #require(UserDefaults(suiteName: suiteName))
    defaults.removePersistentDomain(forName: suiteName)
    return SharedStoreFixture(
      root: root,
      defaults: defaults,
      store: ForgeSharedStateStore(
        sharedRootDirectory: root,
        legacyDefaults: defaults
      )
    )
  }

  static func clean(_ fixture: SharedStoreFixture) {
    try? FileManager.default.removeItem(at: fixture.root)
    for key in legacyKeys + ["unrelated"] {
      fixture.defaults.removeObject(forKey: key)
    }
  }

  static func projection(
    status: ForgeSemesterDeskProjectionStatus = .comeBack,
    dueAt: Date? = Date(timeIntervalSinceReferenceDate: 3_600),
    generatedAt: Date = Date(timeIntervalSinceReferenceDate: 0),
    validUntil: Date = Date(timeIntervalSinceReferenceDate: 6 * 60 * 60)
  ) throws -> ForgeSemesterDeskProjection {
    try ForgeSemesterDeskProjection(
      status: status,
      dueAt: dueAt,
      generatedAt: generatedAt,
      validUntil: validUntil
    )
  }
}
