import Foundation

indirect enum BoundedJSONValue: Equatable {
  case object([String: BoundedJSONValue])
  case array([BoundedJSONValue])
  case string(String)
  case number(String)
  case boolean(Bool)
  case null
}

enum BoundedJSONPreflight {
  static let maximumDepth = 64
  static let maximumNodeCount = 32_768

  static func validate<T: UniversityLearningValidating>(
    _ type: T.Type,
    data: Data
  ) throws -> BoundedJSONValue {
    let value = try parse(data)
    try schema(for: type).validate(value, at: "$")
    return value
  }

  static func parse(_ data: Data) throws -> BoundedJSONValue {
    var parser = Parser(data: data)
    return try parser.parse()
  }

  static func verifyCanonicalEncoding(
    _ value: any UniversityLearningValidating,
    matches rawValue: BoundedJSONValue
  ) throws {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    let data: Data
    switch value {
    case let catalog as ReleasedCatalogSnapshot:
      data = try encoder.encode(catalog)
    case let state as LocalLearnerState:
      data = try encoder.encode(state)
    default:
      throw corrupt("The decoded type has no canonical encoder.")
    }
    var parser = Parser(data: data)
    let canonicalValue = try parser.parse()
    guard canonicalValue == rawValue else {
      throw corrupt("The JSON does not match the decoded schema.")
    }
  }

  private static func schema<T: UniversityLearningValidating>(
    for type: T.Type
  ) throws -> Schema {
    if type == ReleasedCatalogSnapshot.self {
      return releasedCatalogSchema()
    }
    if type == LocalLearnerState.self {
      return localLearnerStateSchema()
    }
    throw corrupt("The decoded type has no bounded JSON schema.")
  }

  private static func releasedCatalogSchema() -> Schema {
    .object(
      required: [
        "catalogReleaseID": .scalar,
        "package": packageSchema(),
        "courseID": .scalar,
        "capabilities": .array(
          maximum: UniversityLearningLimits.maximumCapabilities,
          path: "catalog.capabilities",
          element: capabilitySchema()
        ),
        "activities": .array(
          maximum: UniversityLearningLimits.maximumActivities,
          path: "catalog.activities",
          element: activitySchema()
        ),
        "sourceBindings": .array(
          maximum: UniversityLearningLimits.maximumSources,
          path: "catalog.sourceBindings",
          element: sourceBindingSchema()
        ),
        "proofClaimIDs": .array(
          maximum: UniversityLearningLimits.maximumClaims,
          path: "catalog.proofClaimIDs",
          element: .scalar
        ),
        "limitations": .array(
          maximum: UniversityLearningLimits.maximumLimitations,
          path: "catalog.limitations",
          element: limitationSchema()
        ),
      ],
      optional: [:]
    )
  }

  private static func localLearnerStateSchema() -> Schema {
    .object(
      required: [
        "activeCourseID": .scalar,
        "activeActivityID": .scalar,
        "progress": .array(
          maximum: UniversityLearningLimits.maximumProgress,
          path: "state.progress",
          element: progressSchema()
        ),
        "assistance": .array(
          maximum: UniversityLearningLimits.maximumAssistance,
          path: "state.assistance",
          element: assistanceSchema()
        ),
        "evidence": .array(
          maximum: UniversityLearningLimits.maximumEvidence,
          path: "state.evidence",
          element: evidenceSchema()
        ),
        "delayedReturns": .array(
          maximum: UniversityLearningLimits.maximumReturns,
          path: "state.delayedReturns",
          element: delayedReturnSchema()
        ),
        "updatedAt": .scalar,
      ],
      optional: [:]
    )
  }

  private static func packageSchema() -> Schema {
    .object(
      required: [
        "packageID": .scalar,
        "version": .scalar,
        "digest": .scalar,
      ],
      optional: [:]
    )
  }

  private static func limitationSchema() -> Schema {
    .object(
      required: [
        "id": .scalar,
        "kind": .scalar,
        "statement": .scalar,
      ],
      optional: [:]
    )
  }

  private static func sourceBindingSchema() -> Schema {
    .object(
      required: [
        "id": .scalar,
        "courseID": .scalar,
        "title": .scalar,
        "provenance": .scalar,
      ],
      optional: [:]
    )
  }

  private static func capabilitySchema() -> Schema {
    .object(
      required: [
        "id": .scalar,
        "courseID": .scalar,
        "title": .scalar,
        "sourceBindingIDs": .array(
          maximum: UniversityLearningLimits.maximumSources,
          path: "catalog.capability.sourceBindingIDs",
          element: .scalar
        ),
      ],
      optional: [:]
    )
  }

  private static func activitySchema() -> Schema {
    .object(
      required: [
        "id": .scalar,
        "courseID": .scalar,
        "capabilityID": .scalar,
        "taskFamilyID": .scalar,
        "kind": .scalar,
        "prompt": .scalar,
        "choices": .array(
          maximum: UniversityLearningLimits.maximumChoices,
          path: "activity.choices",
          element: .scalar
        ),
        "sourceBindingIDs": .array(
          maximum: UniversityLearningLimits.maximumSources,
          path: "catalog.activity.sourceBindingIDs",
          element: .scalar
        ),
        "validatorID": .scalar,
        "prerequisiteActivityIDs": .array(
          maximum: UniversityLearningLimits.maximumPrerequisites,
          path: "catalog.activity.prerequisiteActivityIDs",
          element: .scalar
        ),
        "aiBoundary": activityBoundarySchema(),
      ],
      optional: [
        "proofClaimID": .scalar,
        "returnPolicy": returnPolicySchema(),
      ]
    )
  }

  private static func activityBoundarySchema() -> Schema {
    .object(
      required: [
        "allowedAIActions": .array(
          maximum: AIAction.allCases.count,
          path: "catalog.activity.aiBoundary.allowedAIActions",
          element: .scalar,
          uniqueStrings: true
        ),
        "retrievalMode": .scalar,
        "modelIdentityRequirement": .scalar,
        "allowsConstructPreservingAccess": .scalar,
      ],
      optional: [:]
    )
  }

  private static func returnPolicySchema() -> Schema {
    .object(
      required: [
        "delayedReturnActivityID": .scalar,
        "openDelay": .scalar,
        "dueWindow": .scalar,
      ],
      optional: [:]
    )
  }

  private static func progressSchema() -> Schema {
    .object(
      required: [
        "courseID": .scalar,
        "activityID": .scalar,
        "capabilityID": .scalar,
        "attempts": .scalar,
        "lastRecordedAt": .scalar,
      ],
      optional: ["lastResult": .scalar]
    )
  }

  private static func assistanceSchema() -> Schema {
    .object(
      required: [
        "id": .scalar,
        "courseID": .scalar,
        "activityID": .scalar,
        "kind": .scalar,
        "aiAction": .scalar,
        "retrievalMode": .scalar,
        "modelIdentityRequirement": .scalar,
        "preservesConstruct": .scalar,
        "recordedAt": .scalar,
      ],
      optional: [:]
    )
  }

  private static func evidenceSchema() -> Schema {
    .object(
      required: [
        "id": .scalar,
        "scope": .scalar,
        "courseID": .scalar,
        "capabilityID": .scalar,
        "activityID": .scalar,
        "activityKind": .scalar,
        "taskFamilyID": .scalar,
        "validatorID": .scalar,
        "validatorResult": .scalar,
        "catalogReleaseID": .scalar,
        "package": packageSchema(),
        "limitations": .array(
          maximum: UniversityLearningLimits.maximumLimitations,
          path: "evidence.limitations",
          element: limitationSchema()
        ),
        "assistanceIDs": .array(
          maximum: UniversityLearningLimits.maximumAssistance,
          path: "evidence.assistanceIDs",
          element: .scalar
        ),
        "recordedAt": .scalar,
      ],
      optional: ["proofClaimID": .scalar]
    )
  }

  private static func delayedReturnSchema() -> Schema {
    .object(
      required: [
        "id": .scalar,
        "courseID": .scalar,
        "activityID": .scalar,
        "originEvidenceID": .scalar,
        "opensAt": .scalar,
        "dueAt": .scalar,
      ],
      optional: [
        "completedAt": .scalar,
        "completionEvidenceID": .scalar,
      ]
    )
  }

  private static func corrupt(_ description: String) -> DecodingError {
    DecodingError.dataCorrupted(
      .init(codingPath: [], debugDescription: description)
    )
  }

  private indirect enum Schema {
    case scalar
    case object(required: [String: Schema], optional: [String: Schema])
    case array(
      maximum: Int,
      path: String,
      element: Schema,
      uniqueStrings: Bool = false
    )

    func validate(_ value: BoundedJSONValue, at path: String) throws {
      switch self {
      case .scalar:
        switch value {
        case .object, .array:
          throw BoundedJSONPreflight.corrupt("Expected a scalar at \(path).")
        case .string, .number, .boolean, .null:
          return
        }
      case .object(let required, let optional):
        guard case .object(let object) = value else {
          throw BoundedJSONPreflight.corrupt("Expected an object at \(path).")
        }
        let allowed = Set(required.keys).union(optional.keys)
        for key in object.keys where !allowed.contains(key) {
          throw BoundedJSONPreflight.corrupt("Unknown key \(key) at \(path).")
        }
        for (key, schema) in required {
          guard let nested = object[key] else {
            throw BoundedJSONPreflight.corrupt("Missing key \(key) at \(path).")
          }
          try schema.validate(nested, at: "\(path).\(key)")
        }
        for (key, schema) in optional {
          if let nested = object[key] {
            try schema.validate(nested, at: "\(path).\(key)")
          }
        }
      case .array(let maximum, let limitPath, let element, let uniqueStrings):
        guard case .array(let values) = value else {
          throw BoundedJSONPreflight.corrupt("Expected an array at \(path).")
        }
        guard values.count <= maximum else {
          throw UniversityLearningError.arrayTooLarge(path: limitPath, maximum: maximum)
        }
        var seen = Set<String>()
        for (index, nested) in values.enumerated() {
          if uniqueStrings, case .string(let string) = nested,
            !seen.insert(string).inserted
          {
            throw UniversityLearningError.duplicateID(path: limitPath, id: string)
          }
          try element.validate(nested, at: "\(path)[\(index)]")
        }
      }
    }
  }

  private struct Parser {
    private let bytes: [UInt8]
    private var index = 0
    private var nodeCount = 0

    init(data: Data) {
      bytes = Array(data)
    }

    mutating func parse() throws -> BoundedJSONValue {
      skipWhitespace()
      let value = try parseValue(depth: 1, path: "$")
      skipWhitespace()
      guard index == bytes.count else {
        throw BoundedJSONPreflight.corrupt("Unexpected bytes after the JSON value.")
      }
      return value
    }

    private mutating func parseValue(
      depth: Int,
      path: String
    ) throws -> BoundedJSONValue {
      guard depth <= BoundedJSONPreflight.maximumDepth else {
        throw BoundedJSONPreflight.corrupt("The JSON nesting depth exceeds the limit.")
      }
      nodeCount += 1
      guard nodeCount <= BoundedJSONPreflight.maximumNodeCount else {
        throw BoundedJSONPreflight.corrupt("The JSON node count exceeds the limit.")
      }
      guard let byte = currentByte else {
        throw BoundedJSONPreflight.corrupt("The JSON value is incomplete at \(path).")
      }

      switch byte {
      case 123:
        return try parseObject(depth: depth, path: path)
      case 91:
        return try parseArray(depth: depth, path: path)
      case 34:
        return .string(try parseString())
      case 45, 48...57:
        return .number(try parseNumber())
      case 116:
        try parseLiteral([116, 114, 117, 101])
        return .boolean(true)
      case 102:
        try parseLiteral([102, 97, 108, 115, 101])
        return .boolean(false)
      case 110:
        try parseLiteral([110, 117, 108, 108])
        return .null
      default:
        throw BoundedJSONPreflight.corrupt("The JSON value is invalid at \(path).")
      }
    }

    private mutating func parseObject(
      depth: Int,
      path: String
    ) throws -> BoundedJSONValue {
      try consume(123)
      skipWhitespace()
      if try consumeIfPresent(125) {
        return .object([:])
      }

      var object: [String: BoundedJSONValue] = [:]
      var keys = Set<String>()
      while true {
        guard currentByte == 34 else {
          throw BoundedJSONPreflight.corrupt("The JSON object key is invalid at \(path).")
        }
        let key = try parseString()
        guard keys.insert(key).inserted else {
          throw BoundedJSONPreflight.corrupt(
            "The JSON object has a duplicate key \(key) at \(path)."
          )
        }
        skipWhitespace()
        try consume(58)
        skipWhitespace()
        object[key] = try parseValue(depth: depth + 1, path: "\(path).\(key)")
        skipWhitespace()
        if try consumeIfPresent(125) {
          return .object(object)
        }
        try consume(44)
        skipWhitespace()
      }
    }

    private mutating func parseArray(
      depth: Int,
      path: String
    ) throws -> BoundedJSONValue {
      try consume(91)
      skipWhitespace()
      if try consumeIfPresent(93) {
        return .array([])
      }

      var values: [BoundedJSONValue] = []
      while true {
        values.append(try parseValue(depth: depth + 1, path: "\(path)[\(values.count)]"))
        skipWhitespace()
        if try consumeIfPresent(93) {
          return .array(values)
        }
        try consume(44)
        skipWhitespace()
      }
    }

    private mutating func parseString() throws -> String {
      try consume(34)
      var result = ""
      var segmentStart = index

      while let byte = currentByte {
        index += 1
        switch byte {
        case 34:
          try appendUTF8(from: segmentStart, to: index - 1, into: &result)
          return result
        case 92:
          try appendUTF8(from: segmentStart, to: index - 1, into: &result)
          guard let escape = currentByte else {
            throw BoundedJSONPreflight.corrupt("The JSON string escape is incomplete.")
          }
          index += 1
          switch escape {
          case 34:
            result.append("\"")
          case 92:
            result.append("\\")
          case 47:
            result.append("/")
          case 98:
            result.append("\u{0008}")
          case 102:
            result.append("\u{000C}")
          case 110:
            result.append("\n")
          case 114:
            result.append("\r")
          case 116:
            result.append("\t")
          case 117:
            try appendUnicodeEscape(into: &result)
          default:
            throw BoundedJSONPreflight.corrupt("The JSON string escape is invalid.")
          }
          segmentStart = index
        case 0...31:
          throw BoundedJSONPreflight.corrupt("The JSON string has a control character.")
        default:
          continue
        }
      }
      throw BoundedJSONPreflight.corrupt("The JSON string is incomplete.")
    }

    private mutating func appendUnicodeEscape(into result: inout String) throws {
      let first = try parseUnicodeCodeUnit()
      let scalar: UInt32
      if (0xD800...0xDBFF).contains(first) {
        try consume(92)
        try consume(117)
        let second = try parseUnicodeCodeUnit()
        guard (0xDC00...0xDFFF).contains(second) else {
          throw BoundedJSONPreflight.corrupt("The JSON string has an invalid surrogate pair.")
        }
        scalar = 0x1_0000 + ((first - 0xD800) << 10) + (second - 0xDC00)
      } else {
        guard !(0xDC00...0xDFFF).contains(first) else {
          throw BoundedJSONPreflight.corrupt("The JSON string has an invalid surrogate pair.")
        }
        scalar = first
      }
      guard let unicodeScalar = UnicodeScalar(scalar) else {
        throw BoundedJSONPreflight.corrupt("The JSON string has an invalid unicode scalar.")
      }
      result.unicodeScalars.append(unicodeScalar)
    }

    private mutating func parseUnicodeCodeUnit() throws -> UInt32 {
      var value: UInt32 = 0
      for _ in 0..<4 {
        guard let byte = currentByte else {
          throw BoundedJSONPreflight.corrupt("The JSON unicode escape is incomplete.")
        }
        index += 1
        let digit: UInt32
        switch byte {
        case 48...57:
          digit = UInt32(byte - 48)
        case 65...70:
          digit = UInt32(byte - 65 + 10)
        case 97...102:
          digit = UInt32(byte - 97 + 10)
        default:
          throw BoundedJSONPreflight.corrupt("The JSON unicode escape is invalid.")
        }
        value = value * 16 + digit
      }
      return value
    }

    private mutating func parseNumber() throws -> String {
      let start = index
      _ = try consumeIfPresent(45)
      guard let first = currentByte else {
        throw BoundedJSONPreflight.corrupt("The JSON number is incomplete.")
      }
      if first == 48 {
        index += 1
      } else if (49...57).contains(first) {
        index += 1
        while let byte = currentByte, (48...57).contains(byte) {
          index += 1
        }
      } else {
        throw BoundedJSONPreflight.corrupt("The JSON number is invalid.")
      }
      if try consumeIfPresent(46) {
        try consumeDigits()
      }
      if currentByte == 69 || currentByte == 101 {
        index += 1
        if currentByte == 43 || currentByte == 45 {
          index += 1
        }
        try consumeDigits()
      }
      let literal = String(decoding: bytes[start..<index], as: UTF8.self)
      guard let value = Double(literal), value.isFinite else {
        throw BoundedJSONPreflight.corrupt("The JSON number is not finite.")
      }
      return literal
    }

    private mutating func consumeDigits() throws {
      guard let first = currentByte, (48...57).contains(first) else {
        throw BoundedJSONPreflight.corrupt("The JSON number is invalid.")
      }
      index += 1
      while let byte = currentByte, (48...57).contains(byte) {
        index += 1
      }
    }

    private mutating func parseLiteral(_ literal: [UInt8]) throws {
      for expected in literal {
        guard currentByte == expected else {
          throw BoundedJSONPreflight.corrupt("The JSON literal is invalid.")
        }
        index += 1
      }
    }

    private mutating func appendUTF8(
      from start: Int,
      to end: Int,
      into result: inout String
    ) throws {
      guard start < end else {
        return
      }
      guard let text = String(bytes: bytes[start..<end], encoding: .utf8) else {
        throw BoundedJSONPreflight.corrupt("The JSON string is not UTF-8.")
      }
      result.append(contentsOf: text)
    }

    private mutating func consume(_ expected: UInt8) throws {
      guard currentByte == expected else {
        throw BoundedJSONPreflight.corrupt("The JSON syntax is invalid.")
      }
      index += 1
    }

    private mutating func consumeIfPresent(_ expected: UInt8) throws -> Bool {
      guard currentByte == expected else {
        return false
      }
      index += 1
      return true
    }

    private mutating func skipWhitespace() {
      while let byte = currentByte, byte == 9 || byte == 10 || byte == 13 || byte == 32 {
        index += 1
      }
    }

    private var currentByte: UInt8? {
      guard index < bytes.count else {
        return nil
      }
      return bytes[index]
    }
  }
}
