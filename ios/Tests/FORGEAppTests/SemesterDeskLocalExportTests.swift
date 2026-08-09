import Foundation
import Testing

@testable import FORGE
@testable import ForgeCore

struct SemesterDeskLocalExportTests {
  @Test("Export JSON has the exact Semester Desk boundary")
  func exactBoundary() throws {
    let desk = try makeDesk()
    let export = try SemesterDeskLocalExport.make(
      semesterDesk: desk,
      profileID: "profile.local",
      returnRemindersEnabled: true,
      exportedAt: Date(timeIntervalSince1970: 1_800_000_000)
    )
    let object = try #require(
      JSONSerialization.jsonObject(with: export.data)
        as? [String: Any]
    )

    #expect(
      Set(object.keys)
        == [
          "schemaLabel",
          "exportedAt",
          "profileID",
          "returnRemindersEnabled",
          "semesterDesk",
        ]
    )
    #expect(
      object["schemaLabel"] as? String
        == SemesterDeskLocalExport.schemaLabel
    )
    #expect(object["profileID"] as? String == "profile.local")
    #expect(object["returnRemindersEnabled"] as? Bool == true)
    #expect(object["remindersEnabled"] == nil)
    #expect(object["schemaVersion"] == nil)
    #expect(
      (object["semesterDesk"] as? [String: Any])?["schemaVersion"]
        as? String == UniversitySemesterDeskSchema.version
    )
    #expect(export.filename == "FORGE-Semester-Desk-2027-01-15.json")
    #expect(export.data.last == 0x0A)
  }

  @Test("Export encoding is deterministic")
  func deterministicEncoding() throws {
    let desk = try makeDesk()
    let date = Date(timeIntervalSince1970: 1_800_000_000)

    let first = try SemesterDeskLocalExport.make(
      semesterDesk: desk,
      profileID: "profile.local",
      returnRemindersEnabled: false,
      exportedAt: date
    )
    let second = try SemesterDeskLocalExport.make(
      semesterDesk: desk,
      profileID: "profile.local",
      returnRemindersEnabled: false,
      exportedAt: date
    )

    #expect(first == second)
  }

  @Test("Export excludes private and integration state")
  func privacyExclusions() throws {
    let export = try SemesterDeskLocalExport.make(
      semesterDesk: makeDesk(),
      profileID: "profile.local",
      returnRemindersEnabled: false,
      exportedAt: Date(timeIntervalSince1970: 1_800_000_000)
    )
    let text = try #require(String(data: export.data, encoding: .utf8))

    for forbidden in [
      "practiceText",
      "independentCheckText",
      "delayedReturnText",
      "learnerState",
      "isCourseStarted",
      "privateStateSchemaVersion",
      "remindersEnabled",
      "notificationAuthorizationStatus",
      "notificationCoordinator",
      "recoveryState",
      "sharedProjection",
      "widgetProjection",
      "integrationState",
    ] {
      #expect(!text.contains(forbidden))
    }
  }

  @Test("Export rejects a different profile")
  func rejectsProfileMismatch() throws {
    let desk = try makeDesk()

    #expect(throws: SemesterDeskLocalExportError.invalidProfile) {
      _ = try SemesterDeskLocalExport.make(
        semesterDesk: desk,
        profileID: "profile.other",
        returnRemindersEnabled: false,
        exportedAt: Date(timeIntervalSince1970: 1_800_000_000)
      )
    }
  }

  @Test("Export rejects an invalid state and time")
  func rejectsInvalidStateAndTime() throws {
    let desk = try makeDesk()
    #expect(throws: SemesterDeskLocalExportError.invalidExportTime) {
      _ = try SemesterDeskLocalExport.make(
        semesterDesk: desk,
        profileID: "profile.local",
        returnRemindersEnabled: false,
        exportedAt: Date(timeIntervalSinceReferenceDate: .infinity)
      )
    }

    let invalidDesk = try state(
      from: desk,
      applying: { object in
        object["title"] = " "
      }
    )
    #expect(throws: SemesterDeskLocalExportError.invalidState) {
      _ = try SemesterDeskLocalExport.make(
        semesterDesk: invalidDesk,
        profileID: "profile.local",
        returnRemindersEnabled: false,
        exportedAt: Date(timeIntervalSince1970: 1_800_000_000)
      )
    }
  }

  @Test("Export accepts a valid multi-byte text boundary")
  func acceptsMultiByteTextBoundary() throws {
    let emoji = "🧠"
    let title = String(
      repeating: emoji,
      count: UniversitySemesterDeskLimits.maximumShortTextUTF8ByteCount / emoji.utf8.count
    )
    #expect(
      UniversitySemesterDeskLimits.utf8ByteCount(of: title)
        == UniversitySemesterDeskLimits.maximumShortTextUTF8ByteCount
    )

    let export = try SemesterDeskLocalExport.make(
      semesterDesk: makeDesk(title: title),
      profileID: "profile.local",
      returnRemindersEnabled: true,
      exportedAt: Date(timeIntervalSince1970: 1_800_000_000)
    )
    #expect(export.data.count <= SemesterDeskLocalExport.maximumByteCount)
  }

  @Test("Export rejects a valid state that exceeds the byte limit")
  func rejectsOversizedValidatedState() throws {
    let oversizedDesk = try oversizedValidatedDesk()
    let stateData = try JSONEncoder().encode(oversizedDesk)
    #expect(stateData.count > SemesterDeskLocalExport.maximumByteCount)

    #expect(throws: SemesterDeskLocalExportError.oversized) {
      _ = try SemesterDeskLocalExport.make(
        semesterDesk: oversizedDesk,
        profileID: "profile.local",
        returnRemindersEnabled: false,
        exportedAt: Date(timeIntervalSince1970: 1_800_000_000)
      )
    }
  }

  private func makeDesk(
    title: String = "Autumn 2027"
  ) throws -> UniversitySemesterDeskState {
    let result = UniversitySemesterDeskEngine.create(
      input: UniversitySemesterDeskCreateInput(
        profileID: "profile.local",
        title: title
      ),
      runtime: UniversitySemesterDeskRuntime(
        clock: ExportTestClock(),
        identifiers: ExportTestIdentifiers()
      )
    )
    switch result {
    case .success(let state):
      return state
    case .failure(let error):
      throw error
    }
  }

  private func state(
    from desk: UniversitySemesterDeskState,
    applying change: (inout [String: Any]) -> Void
  ) throws -> UniversitySemesterDeskState {
    let data = try JSONEncoder().encode(desk)
    var object = try #require(
      JSONSerialization.jsonObject(with: data) as? [String: Any]
    )
    change(&object)
    let changedData = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    return try JSONDecoder().decode(UniversitySemesterDeskState.self, from: changedData)
  }

  private func oversizedValidatedDesk() throws -> UniversitySemesterDeskState {
    let seed = try UniversitySemesterDeskEngine.transition(
      state: makeDesk(),
      command: .addCourse(
        profileID: "profile.local",
        code: "SEED",
        title: "Seed course"
      ),
      runtime: UniversitySemesterDeskRuntime(
        clock: ExportTestClock(),
        identifiers: ExportTestIdentifiers()
      )
    ).get()
    let data = try JSONEncoder().encode(seed)
    var object = try #require(
      JSONSerialization.jsonObject(with: data) as? [String: Any]
    )
    let courseTemplate = try #require(
      (object["courses"] as? [[String: Any]])?.first
    )
    let multiByteTitle = String(repeating: "🧠", count: 128)
    var courses = [[String: Any]]()
    courses.reserveCapacity(2_300)

    for index in 0..<2_300 {
      var course = courseTemplate
      course["id"] = "course.export.\(index)"
      course["code"] = "EXP\(index)"
      course["title"] = multiByteTitle
      courses.append(course)
    }
    object["courses"] = courses

    let oversizedData = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    let oversizedDesk = try JSONDecoder().decode(
      UniversitySemesterDeskState.self,
      from: oversizedData
    )
    try UniversitySemesterDeskEngine.validate(state: oversizedDesk).get()
    return oversizedDesk
  }
}

private struct ExportTestClock: UniversitySemesterDeskClock {
  func now() -> String {
    "2027-01-15T08:00:00.000Z"
  }
}

private struct ExportTestIdentifiers:
  UniversitySemesterDeskIdentifierFactory
{
  func next(kind: UniversitySemesterDeskIdentifierKind) -> String {
    "\(kind.rawValue).export"
  }
}
