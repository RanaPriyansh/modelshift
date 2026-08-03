import ForgeCore
import Foundation

enum PrivateJSONPreflight {
  static func validate(
    _ data: Data,
    maximumByteCount: Int,
    maximumNestingDepth: Int
  ) throws {
    guard data.count <= maximumByteCount else {
      throw PrivateStateStoreError.oversizedData
    }

    var scanner = Scanner(
      bytes: Array(data),
      maximumNestingDepth: maximumNestingDepth
    )
    try scanner.validate()
  }

  private struct Scanner {
    private enum ObjectKind {
      case unknown
      case envelope
      case semesterDesk
      case semesterDeskCourse
      case semesterDeskFact
      case semesterDeskConflict
      case semesterDeskCapacity
      case semesterDeskCapacityDraft
      case semesterDeskPlanItem
      case semesterDeskRecoveryDraft
      case semesterDeskRecoveryDecision
      case semesterDeskRecoveryChange
      case semesterDeskStudySession
      case semesterDeskProof
      case semesterDeskDelayedReturn
      case semesterDeskProgressEvidence

      func expectation(for key: String) -> ValueExpectation {
        switch self {
        case .unknown:
          .unknown
        case .envelope:
          switch key {
          case "semesterDesk":
            .object(.semesterDesk)
          default:
            .noArray
          }
        case .semesterDesk:
          switch key {
          case "courses":
            .array(maximumCount: 64, elementObject: .semesterDeskCourse)
          case "capacity":
            .object(.semesterDeskCapacity)
          case "capacityDraft":
            .object(.semesterDeskCapacityDraft)
          case "planItems":
            .array(maximumCount: 2_048, elementObject: .semesterDeskPlanItem)
          case "recoveryDraft":
            .object(.semesterDeskRecoveryDraft)
          case "recoveryChanges":
            .array(maximumCount: 4_096, elementObject: .semesterDeskRecoveryChange)
          case "protectedStudySessions":
            .array(maximumCount: 4_096, elementObject: .semesterDeskStudySession)
          case "independentProofs":
            .array(maximumCount: 4_096, elementObject: .semesterDeskProof)
          case "delayedReturns":
            .array(maximumCount: 4_096, elementObject: .semesterDeskDelayedReturn)
          case "progressEvidence":
            .array(maximumCount: 4_096, elementObject: .semesterDeskProgressEvidence)
          default:
            .noArray
          }
        case .semesterDeskCourse:
          switch key {
          case "facts":
            .array(maximumCount: 256, elementObject: .semesterDeskFact)
          case "factConflicts":
            .array(maximumCount: 128, elementObject: .semesterDeskConflict)
          default:
            .noArray
          }
        case .semesterDeskConflict:
          key == "factIDs"
            ? .array(maximumCount: 256, elementObject: nil)
            : .noArray
        case .semesterDeskRecoveryDraft:
          key == "decisions"
            ? .array(maximumCount: 2_048, elementObject: .semesterDeskRecoveryDecision)
            : .noArray
        case .semesterDeskFact,
          .semesterDeskCapacity,
          .semesterDeskCapacityDraft,
          .semesterDeskPlanItem,
          .semesterDeskRecoveryDecision,
          .semesterDeskRecoveryChange,
          .semesterDeskStudySession,
          .semesterDeskProof,
          .semesterDeskDelayedReturn,
          .semesterDeskProgressEvidence:
          .noArray
        }
      }
    }

    private enum ValueExpectation {
      case unknown
      case noArray
      case object(ObjectKind)
      case array(maximumCount: Int, elementObject: ObjectKind?)
    }

    private let bytes: [UInt8]
    private let maximumNestingDepth: Int
    private var index = 0

    init(bytes: [UInt8], maximumNestingDepth: Int) {
      self.bytes = bytes
      self.maximumNestingDepth = maximumNestingDepth
    }

    mutating func validate() throws {
      try parseValue(at: 0, expecting: .object(.envelope))
      skipWhitespace()
      guard index == bytes.count else {
        throw PrivateStateStoreError.corruptData
      }
    }

    private mutating func parseValue(
      at depth: Int,
      expecting expectation: ValueExpectation
    ) throws {
      skipWhitespace()
      guard index < bytes.count else {
        throw PrivateStateStoreError.corruptData
      }

      switch bytes[index] {
      case 34:
        _ = try parseString()
      case 123:
        let objectKind: ObjectKind
        if case .object(let expectedKind) = expectation {
          objectKind = expectedKind
        } else {
          objectKind = .unknown
        }
        try parseObject(at: depth + 1, kind: objectKind)
      case 91:
        switch expectation {
        case .array(let maximumCount, let elementObject):
          try parseArray(
            at: depth + 1,
            maximumCount: maximumCount,
            elementObject: elementObject
          )
        case .unknown:
          try parseArray(
            at: depth + 1,
            maximumCount: nil,
            elementObject: nil
          )
        case .noArray, .object:
          throw PrivateStateStoreError.corruptData
        }
      case 116:
        try parseLiteral("true")
      case 102:
        try parseLiteral("false")
      case 110:
        try parseLiteral("null")
      case 45, 48...57:
        try parseNumber()
      default:
        throw PrivateStateStoreError.corruptData
      }
    }

    private mutating func parseObject(
      at depth: Int,
      kind: ObjectKind
    ) throws {
      guard depth <= maximumNestingDepth else {
        throw PrivateStateStoreError.corruptData
      }

      index += 1
      skipWhitespace()
      if consume(125) {
        return
      }

      var keys = Set<String>()
      while true {
        let key = try parseString()
        guard keys.insert(key).inserted else {
          throw PrivateStateStoreError.corruptData
        }

        skipWhitespace()
        try require(58)
        try parseValue(at: depth, expecting: kind.expectation(for: key))
        skipWhitespace()

        if consume(125) {
          return
        }
        try require(44)
        skipWhitespace()
      }
    }

    private mutating func parseArray(
      at depth: Int,
      maximumCount: Int?,
      elementObject: ObjectKind?
    ) throws {
      guard depth <= maximumNestingDepth else {
        throw PrivateStateStoreError.corruptData
      }

      index += 1
      skipWhitespace()
      if consume(93) {
        return
      }

      var count = 0
      while true {
        if let maximumCount, count >= maximumCount {
          throw PrivateStateStoreError.corruptData
        }
        count += 1
        let expectation = elementObject.map(ValueExpectation.object) ?? .unknown
        try parseValue(at: depth, expecting: expectation)
        skipWhitespace()

        if consume(93) {
          return
        }
        try require(44)
        skipWhitespace()
      }
    }

    private mutating func parseString() throws -> String {
      guard consume(34) else {
        throw PrivateStateStoreError.corruptData
      }

      var scalars = String.UnicodeScalarView()
      var rawStart = index
      while index < bytes.count {
        let byte = bytes[index]
        guard byte >= 32 else {
          throw PrivateStateStoreError.corruptData
        }

        switch byte {
        case 34:
          try appendRawString(from: rawStart, to: index, into: &scalars)
          index += 1
          return String(scalars)
        case 92:
          try appendRawString(from: rawStart, to: index, into: &scalars)
          index += 1
          try parseEscape(into: &scalars)
          rawStart = index
        default:
          index += 1
        }
      }

      throw PrivateStateStoreError.corruptData
    }

    private func appendRawString(
      from start: Int,
      to end: Int,
      into scalars: inout String.UnicodeScalarView
    ) throws {
      guard let string = String(bytes: bytes[start..<end], encoding: .utf8) else {
        throw PrivateStateStoreError.corruptData
      }
      scalars.append(contentsOf: string.unicodeScalars)
    }

    private mutating func parseEscape(
      into scalars: inout String.UnicodeScalarView
    ) throws {
      guard index < bytes.count else {
        throw PrivateStateStoreError.corruptData
      }

      let escapedByte = bytes[index]
      index += 1
      switch escapedByte {
      case 34, 47, 92:
        try appendUnicodeScalar(UInt32(escapedByte), into: &scalars)
      case 98:
        try appendUnicodeScalar(0x08, into: &scalars)
      case 102:
        try appendUnicodeScalar(0x0C, into: &scalars)
      case 110:
        try appendUnicodeScalar(0x0A, into: &scalars)
      case 114:
        try appendUnicodeScalar(0x0D, into: &scalars)
      case 116:
        try appendUnicodeScalar(0x09, into: &scalars)
      case 117:
        let firstCodeUnit = try parseUnicodeEscape()
        switch firstCodeUnit {
        case 0xD800...0xDBFF:
          try require(92)
          try require(117)
          let secondCodeUnit = try parseUnicodeEscape()
          guard (0xDC00...0xDFFF).contains(secondCodeUnit) else {
            throw PrivateStateStoreError.corruptData
          }
          let scalarValue =
            0x1_0000
            + ((firstCodeUnit - 0xD800) << 10)
            + (secondCodeUnit - 0xDC00)
          try appendUnicodeScalar(scalarValue, into: &scalars)
        case 0xDC00...0xDFFF:
          throw PrivateStateStoreError.corruptData
        default:
          try appendUnicodeScalar(firstCodeUnit, into: &scalars)
        }
      default:
        throw PrivateStateStoreError.corruptData
      }
    }

    private mutating func parseUnicodeEscape() throws -> UInt32 {
      guard index + 4 <= bytes.count else {
        throw PrivateStateStoreError.corruptData
      }

      var codeUnit: UInt32 = 0
      for _ in 0..<4 {
        guard let value = hexadecimalValue(for: bytes[index]) else {
          throw PrivateStateStoreError.corruptData
        }
        codeUnit = (codeUnit << 4) | value
        index += 1
      }
      return codeUnit
    }

    private func hexadecimalValue(for byte: UInt8) -> UInt32? {
      switch byte {
      case 48...57:
        UInt32(byte - 48)
      case 65...70:
        UInt32(byte - 65 + 10)
      case 97...102:
        UInt32(byte - 97 + 10)
      default:
        nil
      }
    }

    private func appendUnicodeScalar(
      _ value: UInt32,
      into scalars: inout String.UnicodeScalarView
    ) throws {
      guard let scalar = UnicodeScalar(value) else {
        throw PrivateStateStoreError.corruptData
      }
      scalars.append(scalar)
    }

    private mutating func parseLiteral(_ literal: String) throws {
      let literalBytes = literal.utf8
      let end = index + literalBytes.count
      guard
        end <= bytes.count,
        bytes[index..<end].elementsEqual(literalBytes)
      else {
        throw PrivateStateStoreError.corruptData
      }
      index = end
    }

    private mutating func parseNumber() throws {
      _ = consume(45)
      if !consume(48) {
        try consumeDigits()
      }
      if consume(46) {
        try consumeDigits()
      }
      if consume(69) || consume(101) {
        _ = consume(43) || consume(45)
        try consumeDigits()
      }
    }

    private mutating func consumeDigits() throws {
      let start = index
      while index < bytes.count, (48...57).contains(bytes[index]) {
        index += 1
      }
      guard start < index else {
        throw PrivateStateStoreError.corruptData
      }
    }

    private mutating func skipWhitespace() {
      while index < bytes.count {
        switch bytes[index] {
        case 9, 10, 13, 32:
          index += 1
        default:
          return
        }
      }
    }

    private mutating func consume(_ byte: UInt8) -> Bool {
      guard index < bytes.count, bytes[index] == byte else {
        return false
      }
      index += 1
      return true
    }

    private mutating func require(_ byte: UInt8) throws {
      guard consume(byte) else {
        throw PrivateStateStoreError.corruptData
      }
    }
  }
}
