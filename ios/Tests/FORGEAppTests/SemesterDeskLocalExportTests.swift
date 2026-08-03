import Foundation
import Testing

@testable import FORGE
@testable import ForgeCore

struct SemesterDeskLocalExportTests {
  @Test("Export JSON has the exact v2 metadata and state boundary")
  func exactBoundary() throws {
    let desk = try makeDesk()
    let export = try SemesterDeskLocalExport.make(
      semesterDesk: desk,
      profileID: "profile.local",
      remindersEnabled: true,
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
          "remindersEnabled",
          "semesterDesk",
        ]
    )
    #expect(
      object["schemaLabel"] as? String
        == SemesterDeskLocalExport.schemaLabel
    )
    #expect(object["profileID"] as? String == "profile.local")
    #expect(object["remindersEnabled"] as? Bool == true)
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
      remindersEnabled: false,
      exportedAt: date
    )
    let second = try SemesterDeskLocalExport.make(
      semesterDesk: desk,
      profileID: "profile.local",
      remindersEnabled: false,
      exportedAt: date
    )

    #expect(first == second)
  }

  @Test("Export excludes process, legacy, notification, and widget state")
  func privacyExclusions() throws {
    let export = try SemesterDeskLocalExport.make(
      semesterDesk: makeDesk(),
      profileID: "profile.local",
      remindersEnabled: false,
      exportedAt: Date(timeIntervalSince1970: 1_800_000_000)
    )
    let text = try #require(String(data: export.data, encoding: .utf8))

    for forbidden in [
      "practiceText",
      "independentCheckText",
      "delayedReturnText",
      "learnerState",
      "isCourseStarted",
      "notificationAuthorizationStatus",
      "recoveryState",
      "sharedProjection",
      "widget",
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
        remindersEnabled: false,
        exportedAt: Date(timeIntervalSince1970: 1_800_000_000)
      )
    }
  }

  @Test("Export rejects invalid and oversized input")
  func rejectsInvalidAndOversizedInput() throws {
    let desk = try makeDesk()
    #expect(throws: SemesterDeskLocalExportError.invalidExportTime) {
      _ = try SemesterDeskLocalExport.make(
        semesterDesk: desk,
        profileID: "profile.local",
        remindersEnabled: false,
        exportedAt: Date(timeIntervalSinceReferenceDate: .infinity)
      )
    }

    let oversizedDesk = try makeDesk(
      title: String(repeating: "S", count: 1_100_000)
    )
    #expect(throws: SemesterDeskLocalExportError.oversized) {
      _ = try SemesterDeskLocalExport.make(
        semesterDesk: oversizedDesk,
        profileID: "profile.local",
        remindersEnabled: false,
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
