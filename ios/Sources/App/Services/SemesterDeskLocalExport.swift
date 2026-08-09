import CoreTransferable
import ForgeCore
import Foundation
import SwiftUI
import UniformTypeIdentifiers

enum SemesterDeskLocalExportError: Error, Equatable {
  case invalidState
  case invalidProfile
  case invalidExportTime
  case oversized
}

struct SemesterDeskLocalExport: Equatable, Transferable {
  static let schemaLabel = "forge-semester-desk-export-v1"
  static let maximumByteCount = 1_048_576

  let data: Data
  let filename: String

  static var transferRepresentation: some TransferRepresentation {
    DataRepresentation(exportedContentType: .json) { export in
      export.data
    }
    .suggestedFileName { export in
      export.filename
    }
  }

  static func make(
    semesterDesk: UniversitySemesterDeskState,
    profileID: String,
    returnRemindersEnabled: Bool,
    exportedAt: Date
  ) throws -> SemesterDeskLocalExport {
    guard exportedAt.timeIntervalSinceReferenceDate.isFinite else {
      throw SemesterDeskLocalExportError.invalidExportTime
    }
    guard
      !profileID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
      profileID == semesterDesk.profileID
    else {
      throw SemesterDeskLocalExportError.invalidProfile
    }
    guard case .success = UniversitySemesterDeskEngine.validate(state: semesterDesk) else {
      throw SemesterDeskLocalExportError.invalidState
    }

    let exportedAtTimestamp = Date.ISO8601FormatStyle(
      includingFractionalSeconds: true
    ).format(exportedAt)
    let payload = Payload(
      schemaLabel: schemaLabel,
      exportedAt: exportedAtTimestamp,
      profileID: profileID,
      returnRemindersEnabled: returnRemindersEnabled,
      semesterDesk: semesterDesk
    )
    let encoder = JSONEncoder()
    encoder.outputFormatting = [
      .sortedKeys,
      .withoutEscapingSlashes,
    ]
    var data = try encoder.encode(payload)
    data.append(0x0A)
    guard data.count <= maximumByteCount else {
      throw SemesterDeskLocalExportError.oversized
    }
    let dateLabel = String(exportedAtTimestamp.prefix(10))
    return SemesterDeskLocalExport(
      data: data,
      filename: "FORGE-Semester-Desk-\(dateLabel).json"
    )
  }

  private struct Payload: Encodable {
    let schemaLabel: String
    let exportedAt: String
    let profileID: String
    let returnRemindersEnabled: Bool
    let semesterDesk: UniversitySemesterDeskState
  }
}

struct SemesterDeskExportDocument: FileDocument {
  static let readableContentTypes: [UTType] = [.json]

  let export: SemesterDeskLocalExport

  init(export: SemesterDeskLocalExport) {
    self.export = export
  }

  init(configuration: ReadConfiguration) throws {
    guard
      let data = configuration.file.regularFileContents,
      data.count <= SemesterDeskLocalExport.maximumByteCount
    else {
      throw SemesterDeskLocalExportError.oversized
    }
    export = SemesterDeskLocalExport(
      data: data,
      filename: "FORGE-Semester-Desk.json"
    )
  }

  func fileWrapper(
    configuration: WriteConfiguration
  ) throws -> FileWrapper {
    FileWrapper(regularFileWithContents: export.data)
  }
}
