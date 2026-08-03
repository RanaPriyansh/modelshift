import ForgeCore
import Foundation
import Testing

@Suite("Release source boundaries")
struct ReleaseSourceBoundaryTests {
  @Test("Keeps UI test launch switches in DEBUG source")
  func uiTestLaunchSwitchesRequireDebug() throws {
    let source = try SourceFile.forgeApp.read()

    for launchSwitch in [
      "-FORGEUITestingReset",
      "-FORGEUITestingCorruptPrivateState",
      "-FORGEUITestingClockStart",
    ] {
      let matches = source.lines(containing: launchSwitch)
      #expect(
        !matches.isEmpty,
        "Expected \(launchSwitch) in \(SourceFile.forgeApp.relativePath)."
      )
      expectDebugBoundary(for: matches, in: SourceFile.forgeApp)
    }
  }

  @Test("Keeps UI test clock and notification reset in DEBUG source")
  func uiTestClockAndNotificationResetRequireDebug() throws {
    let source = try SourceFile.forgeApp.read()
    let monotonicClockDeclarations = source.lines.filter { line in
      SourceLexicon.contains(
        ["monotonic", "clock"],
        in: SourceLexicon.words(in: line.code)
      )
    }

    #expect(
      !monotonicClockDeclarations.isEmpty,
      "Expected a monotonic clock declaration in \(SourceFile.forgeApp.relativePath)."
    )
    expectDebugBoundary(
      for: monotonicClockDeclarations,
      in: SourceFile.forgeApp
    )

    for notificationReset in [
      "removeAllPendingNotificationRequests",
      "removeAllDeliveredNotifications",
    ] {
      let matches = source.lines(containing: notificationReset)
      #expect(
        !matches.isEmpty,
        "Expected \(notificationReset) in \(SourceFile.forgeApp.relativePath)."
      )
      expectDebugBoundary(for: matches, in: SourceFile.forgeApp)
    }
  }

  @Test("Requires signed Simulator test evidence")
  func simulatorTestEvidenceRequiresSignedBuildProducts() throws {
    let script = try SourceFile.verificationScript.readRawText()
    let branchStartMarker =
      "  1)\n    step \"Build deterministic iOS Simulator test products\""
    let branchEndMarker =
      "\n  *)\n    printf 'FORGE_REQUIRE_SIMULATOR_TESTS must be 0 or 1."
    let branchStart = try #require(script.range(of: branchStartMarker))
    let branchEnd = try #require(
      script.range(
        of: branchEndMarker,
        range: branchStart.upperBound..<script.endIndex
      )
    )
    let simulatorBranch = String(
      script[branchStart.lowerBound..<branchEnd.lowerBound]
    )
    let outsideSimulatorBranch =
      String(script[..<branchStart.lowerBound])
      + String(script[branchEnd.lowerBound...])

    #expect(simulatorBranch.contains("build-for-testing"))
    #expect(simulatorBranch.contains("FORGE.app"))
    #expect(simulatorBranch.contains("FORGE.app-Simulated.xcent"))
    #expect(simulatorBranch.contains("[[ ! -d \"$simulator_app\" ]]"))
    #expect(
      simulatorBranch.contains(
        "[[ ! -s \"$simulator_app_simulated_entitlements\" ]]"
      )
    )
    #expect(
      simulatorBranch.contains("FORGE.app/PlugIns/FORGEWidgets.appex")
    )
    #expect(
      simulatorBranch.contains("FORGEWidgets.appex-Simulated.xcent")
    )
    #expect(simulatorBranch.contains("[[ ! -d \"$simulator_widget\" ]]"))
    #expect(
      simulatorBranch.contains(
        "[[ ! -s \"$simulator_widget_simulated_entitlements\" ]]"
      )
    )
    #expect(
      simulatorBranch.contains(
        "plutil -extract 'com\\.apple\\.security\\.application-groups.0' raw -o -"
      )
    )
    #expect(
      simulatorBranch.contains(
        "simulator_app_group_count\" != \"1\""
      )
    )
    #expect(
      simulatorBranch.contains(
        "simulator_app_group\" != \"group.com.forgelearning.shared\""
      )
    )
    #expect(
      simulatorBranch.contains(
        "simulator_widget_group_count\" != \"1\""
      )
    )
    #expect(
      simulatorBranch.contains(
        "simulator_widget_group\" != \"group.com.forgelearning.shared\""
      )
    )
    #expect(!simulatorBranch.contains("CODE_SIGNING_ALLOWED=NO"))
    #expect(simulatorBranch.contains("test-without-building"))
    #expect(outsideSimulatorBranch.contains("CODE_SIGNING_ALLOWED=NO"))
  }

  @Test("Detects only #if DEBUG source")
  func debugDetectorSeparatesDebugAndReleaseBranches() throws {
    let source = try SourceText(
      "#if DEBUG\nlet debugMarker = true\n#else\nlet releaseMarker = true\n#endif",
      relativePath: "Sources/App/DebugFixture.swift"
    )
    let debugMarker = try #require(
      source.lines(containing: "debugMarker").first
    )
    let releaseMarker = try #require(
      source.lines(containing: "releaseMarker").first
    )

    #expect(debugMarker.isInsideDebugSection)
    #expect(!releaseMarker.isInsideDebugSection)
  }

  @Test("Keeps corrupt-state setup in DEBUG source")
  func corruptStateSetupRequiresDebug() throws {
    let appSource = try SourceFile.forgeApp.read()
    let storeSource = try SourceFile.privateStateStore.read()

    let appSetup = appSource.lines(
      containing: "seedCorruptStateForUITesting"
    )
    #expect(
      !appSetup.isEmpty,
      "Expected corrupt-state setup in \(SourceFile.forgeApp.relativePath)."
    )
    expectDebugBoundary(for: appSetup, in: SourceFile.forgeApp)

    let writerDeclarations = storeSource.lines(
      containing: "func seedCorruptStateForUITesting"
    )
    #expect(
      !writerDeclarations.isEmpty,
      "Expected a corrupt-state writer in \(SourceFile.privateStateStore.relativePath)."
    )
    expectDebugBoundary(for: writerDeclarations, in: SourceFile.privateStateStore)

    let corruptWrites = storeSource.lines(containing: "invalidJSONData")
    #expect(
      !corruptWrites.isEmpty,
      "Expected corrupt-state write data in \(SourceFile.privateStateStore.relativePath)."
    )
    expectDebugBoundary(for: corruptWrites, in: SourceFile.privateStateStore)
  }

  @Test("Keeps Semester Desk v2 product source boundaries")
  func semesterDeskV2ProductSourceBoundaries() throws {
    let sources = try ProductSwiftSources.read()
    let violations = ProductSourceBoundary.violations(in: sources)

    #expect(
      violations.isEmpty,
      "Product source boundary violations:\n\(violations.joined(separator: "\n"))"
    )
  }

  @Test("Rejects UserDefaults and standard storage shortcuts")
  func userDefaultsAndStandardStorageAreRejected() throws {
    try expectProductBoundaryViolation(
      code: "let store = UserDefaults.standard",
      expectedViolation: "contains prohibited identifier UserDefaults."
    )
    try expectProductBoundaryViolation(
      code: "let store = FileManager.standard",
      expectedViolation: "contains prohibited raw member .standard."
    )
  }

  @Test("Private state persistence contains no V1 envelope fields")
  func privateStatePersistenceContainsNoV1EnvelopeFields() throws {
    let source = try SourceFile.privateStateStore.read()
    let rawCode = SourceLexicon.codeWithoutStringLiterals(
      in: source.lines.map(\.code).joined(separator: "\n")
    )
    let identifiers = Set(SourceLexicon.identifiers(in: rawCode))

    for identifier in [
      "LocalLearnerState",
      "UniversityExperienceProjection",
      "learnerState",
      "isCourseStarted",
      "remindersEnabled",
    ] {
      #expect(
        !identifiers.contains(identifier),
        "\(SourceFile.privateStateStore.relativePath) contains retired private-state identifier \(identifier)."
      )
    }
  }

  @Test("Archived V1 sources are excluded from the application target")
  func archivedV1SourcesAreExcludedFromApplicationTarget() throws {
    let project = try SourceFile.project.readRawText()

    for archivedSource in [
      "PathView.swift",
      "EvidenceView.swift",
      "UniversityActivityView.swift",
      "SettingsView.swift",
      "PrivacySupportView.swift",
      "UniversitySurfaceComponents.swift",
    ] {
      #expect(
        !project.contains("/* \(archivedSource) */"),
        "Project still contains archived source \(archivedSource)."
      )
    }

    #expect(project.contains("SemesterDeskLocalExport.swift in Sources"))
    #expect(project.contains("SemesterDeskSettingsView.swift in Sources"))
  }

  @Test("Rejects source-review and source-trust code but allows limitation prose")
  func sourceReviewAndTrustCodeFormsAreRejected() throws {
    try expectProductBoundaryViolation(
      code: "let review = SourceReview()",
      expectedViolation: "contains prohibited identifier SourceReview."
    )
    try expectProductBoundaryViolation(
      code: "let source = CatalogSource()",
      expectedViolation: "contains prohibited identifier CatalogSource."
    )
    try expectProductBoundaryViolation(
      code: "let state = record.reviewed",
      expectedViolation: "contains prohibited raw member .reviewed."
    )
    try expectProductBoundaryViolation(
      code: "let review = CatalogSource.review",
      expectedViolation: "contains prohibited raw member CatalogSource.review."
    )
    try expectProductBoundaryViolation(
      code: "let decision = SourceDecisionID(\"source.decision\")",
      expectedViolation: "contains prohibited identifier SourceDecisionID."
    )
    try expectProductBoundaryViolation(
      code: "let provenance = SourceProvenance.released",
      expectedViolation: "contains prohibited raw member SourceProvenance.released."
    )
    try expectProductBoundaryViolation(
      code: "let decision = sourceBinding.decisionID",
      expectedViolation: "contains prohibited raw member .decisionID."
    )

    let limitationProse = try productBoundaryViolations(
      relativePath: "Sources/App/PrivacySupport.swift",
      code: "let limitation = \"This catalog is not source-reviewed.\""
    )
    #expect(limitationProse.isEmpty)
  }

  @Test("Rejects retired product language and FocusPreview")
  func retiredProductLanguageIsRejected() throws {
    for (text, violation) in [
      ("child", "child language"),
      ("teen", "teen language"),
      ("teenager", "teenager language"),
      ("grown-up", "grown-up language"),
      ("hackathon", "hackathon language"),
      ("demo", "demo language"),
      ("sample", "sample language"),
      ("fixture", "fixture language"),
      ("FocusPreview", "FocusPreview surface"),
    ] {
      try expectProductBoundaryViolation(
        code: "let retiredProductText = \"\(text)\"",
        expectedViolation: "contains prohibited \(violation)."
      )
    }
  }

  @Test("Rejects V1 root URLs and product surfaces from application sources")
  func v1RootURLsAndProductSurfacesAreRejected() throws {
    try expectProductBoundaryViolation(
      code: "let url = \"forge://path\"",
      expectedViolation: "contains prohibited V1 root URL forge://path."
    )
    try expectProductBoundaryViolation(
      code: "let view = PathView()",
      expectedViolation: "contains prohibited V1 product surface PathView."
    )
  }

  @Test("Rejects retired cancellation domains only")
  func retiredCancellationDomainsAreRejected() throws {
    try expectProductBoundaryViolation(
      code: "let status = DelayedReturnStatus.cancelled",
      expectedViolation: "contains prohibited delayed-return cancellation surface."
    )
    try expectProductBoundaryViolation(
      code: "enum DelayedReturnStatus {\ncase cancelled\n}",
      expectedViolation: "contains prohibited delayed-return cancellation surface."
    )
    try expectProductBoundaryViolation(
      code: "enum DelayedReturnStatus\n{\ncase cancelled\n}",
      expectedViolation: "contains prohibited delayed-return cancellation surface."
    )
    try expectProductBoundaryViolation(
      code: "let role = FocusPreviewView.cancel",
      expectedViolation: "contains prohibited FocusPreview cancellation surface."
    )
    try expectProductBoundaryViolation(
      code: "struct FocusPreviewView {\nlet placement = ToolbarItemPlacement.cancellationAction\n}",
      expectedViolation: "contains prohibited FocusPreview cancellation surface."
    )

    for supportedCancellation in [
      "let taskWasCancelled = Task.isCancelled",
      "let role = ButtonRole.cancel",
      "let placement = ToolbarItemPlacement.cancellationAction",
      "let reason = ReminderReconciliationReason.cancelled",
    ] {
      let violations = try productBoundaryViolations(
        relativePath: "Sources/App/SupportedCancellation.swift",
        code: supportedCancellation
      )
      #expect(
        violations.isEmpty,
        "Unexpected cancellation violation for \(supportedCancellation): \(violations)."
      )
    }
  }

  @Test("Rejects network, analytics, and production AI services")
  func externalProductServicesAreRejected() throws {
    try expectProductBoundaryViolation(
      code: "let session = URLSession.shared",
      expectedViolation: "contains prohibited identifier URLSession."
    )
    try expectProductBoundaryViolation(
      code: "import Alamofire",
      expectedViolation: "imports production network client Alamofire."
    )
    try expectProductBoundaryViolation(
      code: "import PostHog",
      expectedViolation: "imports analytics SDK PostHog."
    )
    try expectProductBoundaryViolation(
      code: "let session = LanguageModelSession()",
      expectedViolation: "contains prohibited identifier LanguageModelSession."
    )
    try expectProductBoundaryViolation(
      code: "import OpenAI",
      expectedViolation: "imports production AI or model API OpenAI."
    )
  }

  @Test("States starter catalog limitations")
  func starterCatalogStatesRequiredLimitations() throws {
    let catalog = try UniversityStarterCourse.catalog()
    let statements = catalog.limitations.map(\.statement)

    for requirement in StarterCatalogBoundaryRequirement.allCases {
      #expect(
        requirement.isSatisfied(by: statements),
        "Starter catalog limitations must state \(requirement.label)."
      )
    }
  }

  private func expectDebugBoundary(
    for matches: [SourceText.Line],
    in sourceFile: SourceFile
  ) {
    for match in matches {
      #expect(
        match.isInsideDebugSection,
        "\(sourceFile.relativePath):\(match.number) is outside #if DEBUG."
      )
    }
  }

  private func productBoundaryViolations(
    relativePath: String,
    code: String
  ) throws -> [String] {
    let source = ProductSwiftSource(
      relativePath: relativePath,
      text: try SourceText(code, relativePath: relativePath)
    )
    return ProductSourceBoundary.violations(in: [source])
  }

  private func expectProductBoundaryViolation(
    code: String,
    expectedViolation: String
  ) throws {
    let violations = try productBoundaryViolations(
      relativePath: "Sources/App/UniversityBoundary.swift",
      code: code
    )
    #expect(
      violations.contains(where: { $0.hasSuffix(expectedViolation) }),
      "Expected \(expectedViolation) in \(violations)."
    )
  }
}

private enum SourceFile: String {
  case forgeApp = "Sources/App/FORGEApp.swift"
  case privateStateStore = "Sources/App/Services/PrivateStateStore.swift"
  case project = "FORGE.xcodeproj/project.pbxproj"
  case verificationScript = "Scripts/verify.sh"

  static let maximumByteCount = 256 * 1024

  var relativePath: String {
    rawValue
  }

  func read() throws -> SourceText {
    try SourceText(readRawText(), relativePath: relativePath)
  }

  func readRawText() throws -> String {
    let sourceURL = try Self.iosRootURL().appendingPathComponent(relativePath)
    let handle = try FileHandle(forReadingFrom: sourceURL)
    defer { try? handle.close() }

    let data = try handle.read(upToCount: Self.maximumByteCount + 1) ?? Data()
    guard data.count <= Self.maximumByteCount else {
      throw SourceBoundaryError.sourceIsTooLarge(relativePath)
    }
    guard let text = String(data: data, encoding: .utf8) else {
      throw SourceBoundaryError.sourceIsNotUTF8(relativePath)
    }

    return text
  }

  static func iosRootURL() throws -> URL {
    let testFileURL = URL(fileURLWithPath: #filePath).standardizedFileURL
    let testDirectoryURL = testFileURL.deletingLastPathComponent()
    let testsDirectoryURL = testDirectoryURL.deletingLastPathComponent()
    let iosRootURL = testsDirectoryURL.deletingLastPathComponent()

    guard
      testDirectoryURL.lastPathComponent == "FORGEAppTests",
      testsDirectoryURL.lastPathComponent == "Tests",
      iosRootURL.lastPathComponent == "ios"
    else {
      throw SourceBoundaryError.unexpectedTestPath(testFileURL.path)
    }

    return iosRootURL
  }
}

private struct ProductSwiftSource {
  let relativePath: String
  let text: SourceText
}

private enum ProductSwiftSources {
  private struct Candidate {
    let relativePath: String
    let url: URL
  }

  private static let sourceRootRelativePaths = [
    "Sources",
    "Packages/ForgeCore/Sources",
  ]
  private static let maximumEntryCount = 512
  private static let maximumSourceCount = 64
  private static let maximumTotalByteCount = 2 * 1024 * 1024
  private static let resourceKeys: Set<URLResourceKey> = [
    .isDirectoryKey,
    .isRegularFileKey,
    .isSymbolicLinkKey,
  ]

  static func read() throws -> [ProductSwiftSource] {
    let iosRootURL = try SourceFile.iosRootURL()
    var candidates: [Candidate] = []
    var entryCount = 0

    for rootRelativePath in sourceRootRelativePaths {
      let rootURL = iosRootURL.appendingPathComponent(
        rootRelativePath,
        isDirectory: true
      )
      let rootValues = try rootURL.resourceValues(forKeys: resourceKeys)
      guard rootValues.isDirectory == true, rootValues.isSymbolicLink != true else {
        throw SourceBoundaryError.invalidProductSourceRoot(rootRelativePath)
      }

      try collectSwiftFiles(
        in: rootURL,
        relativeDirectoryPath: rootRelativePath,
        candidates: &candidates,
        entryCount: &entryCount
      )
    }

    guard !candidates.isEmpty else {
      throw SourceBoundaryError.productSourceSetIsEmpty
    }

    var totalByteCount = 0
    var sources: [ProductSwiftSource] = []

    for candidate in candidates.sorted(by: { $0.relativePath < $1.relativePath }) {
      sources.append(
        ProductSwiftSource(
          relativePath: candidate.relativePath,
          text: try readSource(
            at: candidate.url,
            relativePath: candidate.relativePath,
            totalByteCount: &totalByteCount
          )
        )
      )
    }

    return sources
  }

  private static func collectSwiftFiles(
    in directoryURL: URL,
    relativeDirectoryPath: String,
    candidates: inout [Candidate],
    entryCount: inout Int
  ) throws {
    let children = try FileManager.default.contentsOfDirectory(
      at: directoryURL,
      includingPropertiesForKeys: Array(resourceKeys),
      options: []
    )
    .sorted { $0.lastPathComponent < $1.lastPathComponent }

    for childURL in children {
      entryCount += 1
      guard entryCount <= maximumEntryCount else {
        throw SourceBoundaryError.productSourceTreeTooLarge(relativeDirectoryPath)
      }

      let relativePath = relativeDirectoryPath + "/" + childURL.lastPathComponent
      let values = try childURL.resourceValues(forKeys: resourceKeys)
      guard values.isSymbolicLink != true else {
        throw SourceBoundaryError.symbolicLinkInProductSourceTree(relativePath)
      }

      if values.isDirectory == true {
        try collectSwiftFiles(
          in: childURL,
          relativeDirectoryPath: relativePath,
          candidates: &candidates,
          entryCount: &entryCount
        )
        continue
      }

      guard values.isRegularFile == true else {
        if childURL.pathExtension == "swift" {
          throw SourceBoundaryError.nonRegularProductSource(relativePath)
        }
        continue
      }

      guard childURL.pathExtension == "swift" else {
        continue
      }
      guard candidates.count < maximumSourceCount else {
        throw SourceBoundaryError.productSourceCountTooLarge(maximumSourceCount)
      }

      candidates.append(Candidate(relativePath: relativePath, url: childURL))
    }
  }

  private static func readSource(
    at sourceURL: URL,
    relativePath: String,
    totalByteCount: inout Int
  ) throws -> SourceText {
    let handle = try FileHandle(forReadingFrom: sourceURL)
    defer { try? handle.close() }

    let data = try handle.read(upToCount: SourceFile.maximumByteCount + 1) ?? Data()
    guard data.count <= SourceFile.maximumByteCount else {
      throw SourceBoundaryError.sourceIsTooLarge(relativePath)
    }
    guard data.count <= maximumTotalByteCount - totalByteCount else {
      throw SourceBoundaryError.productSourcesAreTooLarge
    }
    guard let text = String(data: data, encoding: .utf8) else {
      throw SourceBoundaryError.sourceIsNotUTF8(relativePath)
    }

    totalByteCount += data.count
    return try SourceText(text, relativePath: relativePath)
  }
}

private enum ProductSourceBoundary {
  private struct ProhibitedProductPhrase {
    let label: String
    let words: [String]
  }

  private struct ProhibitedCancellationDomain {
    let label: String
    let words: [String]
    let cancellationIdentifiers: [String]
  }

  private struct CancellationDomainScope {
    let domain: ProhibitedCancellationDomain
    let depth: Int
  }

  private static let compiledApplicationSourcePrefixes = [
    "Sources/App/",
    "Sources/SystemIntegration/",
    "Sources/Widgets/",
  ]
  private static let prohibitedApplicationProductPhrases = [
    ProhibitedProductPhrase(label: "child language", words: ["child"]),
    ProhibitedProductPhrase(label: "teen language", words: ["teen"]),
    ProhibitedProductPhrase(label: "teenager language", words: ["teenager"]),
    ProhibitedProductPhrase(label: "grown-up language", words: ["grown", "up"]),
    ProhibitedProductPhrase(label: "hackathon language", words: ["hackathon"]),
    ProhibitedProductPhrase(label: "demo language", words: ["demo"]),
    ProhibitedProductPhrase(label: "sample language", words: ["sample"]),
    ProhibitedProductPhrase(label: "fixture language", words: ["fixture"]),
    ProhibitedProductPhrase(
      label: "FocusPreview surface",
      words: ["focus", "preview"]
    ),
  ]
  private static let prohibitedCancellationDomains = [
    ProhibitedCancellationDomain(
      label: "delayed-return cancellation surface",
      words: ["delayed", "return"],
      cancellationIdentifiers: ["cancelled", "canceled"]
    ),
    ProhibitedCancellationDomain(
      label: "FocusPreview cancellation surface",
      words: ["focus", "preview"],
      cancellationIdentifiers: [
        "cancel",
        "cancelled",
        "canceled",
        "cancellationAction",
      ]
    ),
  ]
  private static let prohibitedV1ProductSurfaceIdentifiers = [
    "EvidenceView",
    "PathView",
    "PrivacySupportView",
    "SettingsView",
    "UniversityActivityView",
    "UniversitySurfaceComponents",
  ].sorted()
  private static let prohibitedV1RootURLs = [
    "forge://activity",
    "forge://evidence",
    "forge://focus",
    "forge://path",
    "forge://returns",
  ].sorted()
  private static let prohibitedCodeIdentifiers = [
    "CatalogSource",
    "SourceReview",
    "SourceDecisionID",
  ]
  private static let prohibitedIdentifiers = [
    "UserDefaults",
    "URLSession",
    "URLSessionConfiguration",
    "URLSessionWebSocketTask",
    "NSURLConnection",
    "NWConnection",
    "NWListener",
    "HTTPClient",
    "GRPCClient",
    "LanguageModelSession",
    "SystemLanguageModel",
    "GenerativeModel",
    "MLModel",
    "MLModelConfiguration",
    "OpenAI",
    "OpenAIClient",
    "Anthropic",
    "AnthropicClient",
    "OpenRouter",
    "Ollama",
    "Mistral",
    "Cohere",
  ].sorted()
  private static let analyticsSDKImports = [
    "Amplitude",
    "Countly",
    "FirebaseAnalytics",
    "Heap",
    "Mixpanel",
    "Pendo",
    "PostHog",
    "Segment",
    "SegmentAnalytics",
    "TelemetryDeck",
  ].sorted()
  private static let productionNetworkImports = [
    "Alamofire",
    "Apollo",
    "ApolloAPI",
    "AsyncHTTPClient",
    "GRPC",
    "Moya",
    "NIO",
    "NIOHTTP1",
    "Network",
    "OpenAPIRuntime",
    "OpenAPIURLSession",
  ].sorted()
  private static let productionAIImports = [
    "Anthropic",
    "Cohere",
    "CoreML",
    "FoundationModels",
    "GenerativeAI",
    "GoogleGenerativeAI",
    "Mistral",
    "Ollama",
    "OpenAI",
    "OpenRouter",
  ].sorted()
  private static let maximumViolationCount = 128

  static func violations(in sources: [ProductSwiftSource]) -> [String] {
    var violations: [String] = []
    var isTruncated = false

    for source in sources {
      appendCancellationDomainViolations(
        in: source,
        violations: &violations,
        isTruncated: &isTruncated
      )
      appendTextViolations(
        for: source.relativePath,
        at: source.relativePath,
        sourceRelativePath: source.relativePath,
        violations: &violations,
        isTruncated: &isTruncated
      )

      for line in source.text.lines {
        let location = "\(source.relativePath):\(line.number)"
        appendTextViolations(
          for: line.code,
          at: location,
          sourceRelativePath: source.relativePath,
          violations: &violations,
          isTruncated: &isTruncated
        )

        if let importedModule = ImportDirective.module(in: line.code) {
          appendImportViolation(
            for: importedModule,
            at: location,
            violations: &violations,
            isTruncated: &isTruncated
          )
        }
      }
    }

    if isTruncated {
      violations.append("Additional product source boundary violations were omitted.")
    }

    return violations
  }

  private static func appendCancellationDomainViolations(
    in source: ProductSwiftSource,
    violations: inout [String],
    isTruncated: inout Bool
  ) {
    guard isCompiledApplicationSource(source.relativePath) else {
      return
    }
    var braceDepth = 0
    var activeScopes: [CancellationDomainScope] = []
    var pendingDeclarationDomains: [ProhibitedCancellationDomain] = []

    for line in source.text.lines {
      let rawCode = SourceLexicon.codeWithoutStringLiterals(in: line.code)
      let words = SourceLexicon.words(in: rawCode)
      let identifiers = SourceLexicon.identifiers(in: rawCode)
      let declarationDomains = prohibitedCancellationDomains.filter {
        SourceLexicon.declaresDomain($0.words, in: rawCode)
      }
      let lineDomains = prohibitedCancellationDomains.filter {
        SourceLexicon.contains($0.words, in: words)
      }
      let domains = activeScopes.map(\.domain) + declarationDomains + lineDomains
      let location = "\(source.relativePath):\(line.number)"
      var checkedLabels = Set<String>()

      for domain in domains
      where checkedLabels.insert(domain.label).inserted
        && identifiers.contains(where: domain.cancellationIdentifiers.contains)
      {
        record(
          "\(location) contains prohibited \(domain.label).",
          violations: &violations,
          isTruncated: &isTruncated
        )
      }

      let depthBeforeLine = braceDepth
      let braceDelta = SourceLexicon.braceDelta(in: rawCode)
      braceDepth += braceDelta

      if braceDelta > 0 {
        let scopeDomains = pendingDeclarationDomains + declarationDomains
        var openedLabels = Set<String>()
        for domain in scopeDomains where openedLabels.insert(domain.label).inserted {
          activeScopes.append(
            CancellationDomainScope(
              domain: domain,
              depth: depthBeforeLine + 1
            )
          )
        }
        pendingDeclarationDomains.removeAll()
      } else {
        for domain in declarationDomains
        where !pendingDeclarationDomains.contains(where: { $0.label == domain.label }) {
          pendingDeclarationDomains.append(domain)
        }
      }
      activeScopes.removeAll { braceDepth < $0.depth }
    }
  }

  private static func appendTextViolations(
    for text: String,
    at location: String,
    sourceRelativePath: String,
    violations: inout [String],
    isTruncated: inout Bool
  ) {
    if isCompiledApplicationSource(sourceRelativePath) {
      let words = SourceLexicon.words(in: text)
      for phrase in prohibitedApplicationProductPhrases
      where SourceLexicon.contains(phrase.words, in: words) {
        record(
          "\(location) contains prohibited \(phrase.label).",
          violations: &violations,
          isTruncated: &isTruncated
        )
      }

      let identifiers = SourceLexicon.identifiers(in: text)
      for identifier in prohibitedV1ProductSurfaceIdentifiers
      where identifiers.contains(identifier) {
        record(
          "\(location) contains prohibited V1 product surface \(identifier).",
          violations: &violations,
          isTruncated: &isTruncated
        )
      }

      for rootURL in prohibitedV1RootURLs where text.contains(rootURL) {
        record(
          "\(location) contains prohibited V1 root URL \(rootURL).",
          violations: &violations,
          isTruncated: &isTruncated
        )
      }
    }

    let identifiers = SourceLexicon.identifiers(in: text)
    for identifier in prohibitedIdentifiers where identifiers.contains(identifier) {
      record(
        "\(location) contains prohibited identifier \(identifier).",
        violations: &violations,
        isTruncated: &isTruncated
      )
    }

    let rawCode = SourceLexicon.codeWithoutStringLiterals(in: text)
    let rawIdentifiers = SourceLexicon.identifiers(in: rawCode)
    for identifier in prohibitedCodeIdentifiers where rawIdentifiers.contains(identifier) {
      record(
        "\(location) contains prohibited identifier \(identifier).",
        violations: &violations,
        isTruncated: &isTruncated
      )
    }
    if SourceLexicon.containsMemberUse("standard", in: rawCode) {
      record(
        "\(location) contains prohibited raw member .standard.",
        violations: &violations,
        isTruncated: &isTruncated
      )
    }
    if SourceLexicon.containsMemberUse("reviewed", in: rawCode) {
      record(
        "\(location) contains prohibited raw member .reviewed.",
        violations: &violations,
        isTruncated: &isTruncated
      )
    }
    if SourceLexicon.containsQualifiedMemberUse(
      base: "CatalogSource",
      member: "review",
      in: rawCode
    ) {
      record(
        "\(location) contains prohibited raw member CatalogSource.review.",
        violations: &violations,
        isTruncated: &isTruncated
      )
    }
    if SourceLexicon.containsQualifiedMemberUse(
      base: "SourceProvenance",
      member: "released",
      in: rawCode
    ) {
      record(
        "\(location) contains prohibited raw member SourceProvenance.released.",
        violations: &violations,
        isTruncated: &isTruncated
      )
    }
    if SourceLexicon.containsMemberUse("decisionID", in: rawCode) {
      record(
        "\(location) contains prohibited raw member .decisionID.",
        violations: &violations,
        isTruncated: &isTruncated
      )
    }
  }

  private static func isCompiledApplicationSource(_ relativePath: String) -> Bool {
    compiledApplicationSourcePrefixes.contains { relativePath.hasPrefix($0) }
  }

  private static func appendImportViolation(
    for module: String,
    at location: String,
    violations: inout [String],
    isTruncated: inout Bool
  ) {
    if analyticsSDKImports.contains(module) {
      record(
        "\(location) imports analytics SDK \(module).",
        violations: &violations,
        isTruncated: &isTruncated
      )
    }
    if productionNetworkImports.contains(module) {
      record(
        "\(location) imports production network client \(module).",
        violations: &violations,
        isTruncated: &isTruncated
      )
    }
    if productionAIImports.contains(module) {
      record(
        "\(location) imports production AI or model API \(module).",
        violations: &violations,
        isTruncated: &isTruncated
      )
    }
  }

  private static func record(
    _ violation: String,
    violations: inout [String],
    isTruncated: inout Bool
  ) {
    guard violations.count < maximumViolationCount else {
      isTruncated = true
      return
    }

    violations.append(violation)
  }
}

private enum StarterCatalogBoundaryRequirement: CaseIterable {
  case localOnly
  case incompleteProvenance
  case noAuthority
  case noOutcomeClaim

  var label: String {
    switch self {
    case .localOnly:
      "local-only scope"
    case .incompleteProvenance:
      "incomplete provenance"
    case .noAuthority:
      "no authority"
    case .noOutcomeClaim:
      "no outcome claim"
    }
  }

  func isSatisfied(by statements: [String]) -> Bool {
    statements.contains { statement in
      let words = Set(SourceLexicon.words(in: statement))
      return requiredWordSets.contains { requiredWords in
        requiredWords.isSubset(of: words)
      }
    }
  }

  private var requiredWordSets: [Set<String>] {
    switch self {
    case .localOnly:
      [["local", "only"]]
    case .incompleteProvenance:
      [["incomplete", "provenance"], ["not", "complete", "provenance"]]
    case .noAuthority:
      [["no", "authority"], ["not", "authority"], ["not", "authoritative"]]
    case .noOutcomeClaim:
      [
        ["no", "outcome", "claim"],
        ["no", "outcome", "claims"],
        ["not", "outcome", "claim"],
        ["not", "outcome", "claims"],
      ]
    }
  }
}

private enum ImportDirective {
  private static let declarationKinds: Set<String> = [
    "class",
    "enum",
    "func",
    "let",
    "protocol",
    "struct",
    "typealias",
    "var",
  ]

  static func module(in code: String) -> String? {
    let components = code.trimmingCharacters(in: .whitespaces).split(
      whereSeparator: { $0.isWhitespace }
    )
    guard let importIndex = components.firstIndex(where: { $0 == "import" }) else {
      return nil
    }
    guard
      importIndex == components.startIndex
        || (importIndex == components.index(after: components.startIndex)
          && components[components.startIndex] == "@_exported")
    else {
      return nil
    }

    var moduleIndex = components.index(after: importIndex)
    if moduleIndex < components.endIndex,
      declarationKinds.contains(String(components[moduleIndex]))
    {
      moduleIndex = components.index(after: moduleIndex)
    }
    guard moduleIndex < components.endIndex else {
      return nil
    }

    return components[moduleIndex].split(separator: ".").first.map(String.init)
  }
}

private enum SourceLexicon {
  private static let typeDeclarationKeywords: Set<String> = [
    "actor",
    "class",
    "enum",
    "extension",
    "struct",
  ]

  static func identifiers(in text: String) -> [String] {
    var identifiers: [String] = []
    var current = ""

    func appendCurrent() {
      guard !current.isEmpty else {
        return
      }
      identifiers.append(current)
      current = ""
    }

    for scalar in text.unicodeScalars {
      if isIdentifierScalar(scalar) {
        current.unicodeScalars.append(scalar)
      } else {
        appendCurrent()
      }
    }
    appendCurrent()

    return identifiers
  }

  static func words(in text: String) -> [String] {
    identifiers(in: text).flatMap(words(inIdentifier:))
  }

  static func contains(_ phrase: [String], in words: [String]) -> Bool {
    guard !phrase.isEmpty, phrase.count <= words.count else {
      return false
    }

    for index in words.indices where words[index] == phrase[0] {
      guard
        let endIndex = words.index(
          index,
          offsetBy: phrase.count,
          limitedBy: words.endIndex
        )
      else {
        continue
      }
      if Array(words[index..<endIndex]) == phrase {
        return true
      }
    }

    return false
  }

  static func declaresDomain(_ domainWords: [String], in code: String) -> Bool {
    let codeIdentifiers = identifiers(in: code)

    for index in codeIdentifiers.indices
    where typeDeclarationKeywords.contains(codeIdentifiers[index]) {
      let candidateIdentifiers = codeIdentifiers.dropFirst(index + 1).prefix(3)
      if candidateIdentifiers.contains(where: {
        contains(domainWords, in: words(inIdentifier: $0))
      }) {
        return true
      }
    }

    return false
  }

  static func braceDelta(in code: String) -> Int {
    code.unicodeScalars.reduce(into: 0) { delta, scalar in
      switch scalar.value {
      case 123:
        delta += 1
      case 125:
        delta -= 1
      default:
        break
      }
    }
  }

  static func codeWithoutStringLiterals(in text: String) -> String {
    var result = ""
    var isInString = false
    var isEscaped = false

    for character in text {
      if isInString {
        result.append(" ")
        if isEscaped {
          isEscaped = false
        } else if character == "\\" {
          isEscaped = true
        } else if character == "\"" {
          isInString = false
        }
      } else if character == "\"" {
        isInString = true
        result.append(" ")
      } else {
        result.append(character)
      }
    }

    return result
  }

  static func containsMemberUse(_ member: String, in code: String) -> Bool {
    let scalars = Array(code.unicodeScalars)
    var index = 0

    while index < scalars.count {
      guard scalars[index].value == 46 else {
        index += 1
        continue
      }

      var memberIndex = index + 1
      skipWhitespace(in: scalars, from: &memberIndex)
      if let identifier = identifier(at: memberIndex, in: scalars),
        identifier.value == member
      {
        return true
      }

      index += 1
    }

    return false
  }

  static func containsQualifiedMemberUse(
    base: String,
    member: String,
    in code: String
  ) -> Bool {
    let scalars = Array(code.unicodeScalars)
    var index = 0

    while index < scalars.count {
      guard let baseIdentifier = identifier(at: index, in: scalars) else {
        index += 1
        continue
      }
      index = baseIdentifier.nextIndex

      guard baseIdentifier.value == base else {
        continue
      }

      var separatorIndex = baseIdentifier.nextIndex
      skipWhitespace(in: scalars, from: &separatorIndex)
      guard separatorIndex < scalars.count, scalars[separatorIndex].value == 46 else {
        continue
      }

      var memberIndex = separatorIndex + 1
      skipWhitespace(in: scalars, from: &memberIndex)
      guard let memberIdentifier = identifier(at: memberIndex, in: scalars),
        memberIdentifier.value == member
      else {
        continue
      }

      return true
    }

    return false
  }

  private static func identifier(
    at index: Int,
    in scalars: [UnicodeScalar]
  ) -> (value: String, nextIndex: Int)? {
    guard index < scalars.count, isIdentifierScalar(scalars[index]) else {
      return nil
    }

    var value = ""
    var nextIndex = index
    while nextIndex < scalars.count, isIdentifierScalar(scalars[nextIndex]) {
      value.unicodeScalars.append(scalars[nextIndex])
      nextIndex += 1
    }

    return (value, nextIndex)
  }

  private static func skipWhitespace(
    in scalars: [UnicodeScalar],
    from index: inout Int
  ) {
    while index < scalars.count, scalars[index].properties.isWhitespace {
      index += 1
    }
  }

  private static func words(inIdentifier identifier: String) -> [String] {
    var words: [String] = []
    var current = ""
    var previousWasLowercaseOrDigit = false

    func appendCurrent() {
      guard !current.isEmpty else {
        return
      }
      words.append(current)
      current = ""
    }

    for scalar in identifier.unicodeScalars {
      if scalar.value == 95 {
        appendCurrent()
        previousWasLowercaseOrDigit = false
        continue
      }

      if isUppercaseASCII(scalar), previousWasLowercaseOrDigit {
        appendCurrent()
      }

      current.append(contentsOf: String(scalar).lowercased())
      previousWasLowercaseOrDigit = isLowercaseASCII(scalar) || isDigitASCII(scalar)
    }
    appendCurrent()

    return words
  }

  private static func isIdentifierScalar(_ scalar: UnicodeScalar) -> Bool {
    isASCIIAlphaNumeric(scalar) || scalar.value == 95
  }

  private static func isUppercaseASCII(_ scalar: UnicodeScalar) -> Bool {
    (65...90).contains(scalar.value)
  }

  private static func isLowercaseASCII(_ scalar: UnicodeScalar) -> Bool {
    (97...122).contains(scalar.value)
  }

  private static func isDigitASCII(_ scalar: UnicodeScalar) -> Bool {
    (48...57).contains(scalar.value)
  }

  private static func isASCIIAlphaNumeric(_ scalar: UnicodeScalar) -> Bool {
    isUppercaseASCII(scalar) || isLowercaseASCII(scalar) || isDigitASCII(scalar)
  }
}

private struct SourceText {
  struct Line {
    let code: String
    let number: Int
    let isInsideDebugSection: Bool
  }

  let lines: [Line]

  init(_ text: String, relativePath: String) throws {
    var conditionalSections: [ConditionalSection] = []
    var commentFilter = CommentFilter()
    var parsedLines: [Line] = []

    for (offset, rawLine) in text.components(separatedBy: .newlines).enumerated() {
      let lineNumber = offset + 1
      let code = try commentFilter.code(from: rawLine)

      if let directive = PreprocessorDirective(code: code) {
        try Self.update(
          conditionalSections: &conditionalSections,
          with: directive,
          relativePath: relativePath,
          lineNumber: lineNumber
        )
        continue
      }

      parsedLines.append(
        Line(
          code: code,
          number: lineNumber,
          isInsideDebugSection: conditionalSections.contains(
            where: \.currentBranchIsDebugOnly
          )
        )
      )
    }

    guard commentFilter.isComplete else {
      throw SourceBoundaryError.unterminatedBlockComment(relativePath)
    }
    guard conditionalSections.isEmpty else {
      throw SourceBoundaryError.unterminatedConditional(relativePath)
    }

    lines = parsedLines
  }

  func lines(containing text: String) -> [Line] {
    lines.filter { $0.code.contains(text) }
  }

  private static func update(
    conditionalSections: inout [ConditionalSection],
    with directive: PreprocessorDirective,
    relativePath: String,
    lineNumber: Int
  ) throws {
    switch directive {
    case .ifCondition(let condition):
      conditionalSections.append(
        ConditionalSection(currentBranchIsDebugOnly: condition == "DEBUG")
      )
    case .elseifCondition(let condition):
      guard !conditionalSections.isEmpty else {
        throw SourceBoundaryError.unexpectedConditionalDirective(
          relativePath,
          lineNumber
        )
      }
      conditionalSections[conditionalSections.index(before: conditionalSections.endIndex)]
        .currentBranchIsDebugOnly = condition == "DEBUG"
    case .elseBranch:
      guard !conditionalSections.isEmpty else {
        throw SourceBoundaryError.unexpectedConditionalDirective(
          relativePath,
          lineNumber
        )
      }
      conditionalSections[conditionalSections.index(before: conditionalSections.endIndex)]
        .currentBranchIsDebugOnly = false
    case .end:
      guard !conditionalSections.isEmpty else {
        throw SourceBoundaryError.unexpectedConditionalDirective(
          relativePath,
          lineNumber
        )
      }
      conditionalSections.removeLast()
    }
  }

  private struct ConditionalSection {
    var currentBranchIsDebugOnly: Bool
  }
}

private enum PreprocessorDirective {
  case ifCondition(String)
  case elseifCondition(String)
  case elseBranch
  case end

  init?(code: String) {
    let trimmed = code.trimmingCharacters(in: .whitespaces)

    if trimmed == "#else" {
      self = .elseBranch
      return
    }
    if trimmed == "#endif" {
      self = .end
      return
    }
    if let condition = Self.condition(after: "#if", in: trimmed) {
      self = .ifCondition(condition)
      return
    }
    if let condition = Self.condition(after: "#elseif", in: trimmed) {
      self = .elseifCondition(condition)
      return
    }

    return nil
  }

  private static func condition(after directive: String, in text: String) -> String? {
    guard text.hasPrefix(directive) else {
      return nil
    }

    let conditionStart = text.index(text.startIndex, offsetBy: directive.count)
    guard
      conditionStart < text.endIndex,
      text[conditionStart].isWhitespace
    else {
      return nil
    }

    return text[conditionStart...].trimmingCharacters(in: .whitespaces)
  }
}

private struct CommentFilter {
  private var blockCommentDepth = 0

  var isComplete: Bool {
    blockCommentDepth == 0
  }

  mutating func code(from line: String) throws -> String {
    var result = ""
    var index = line.startIndex
    var isInString = false
    var isEscaped = false

    while index < line.endIndex {
      let character = line[index]
      let nextIndex = line.index(after: index)
      let nextCharacter = nextIndex < line.endIndex ? line[nextIndex] : nil

      if blockCommentDepth > 0 {
        if character == "/", nextCharacter == "*" {
          blockCommentDepth += 1
          result.append(contentsOf: "  ")
          index = line.index(after: nextIndex)
        } else if character == "*", nextCharacter == "/" {
          blockCommentDepth -= 1
          result.append(contentsOf: "  ")
          index = line.index(after: nextIndex)
        } else {
          result.append(" ")
          index = nextIndex
        }
        continue
      }

      if isInString {
        result.append(character)
        if isEscaped {
          isEscaped = false
        } else if character == "\\" {
          isEscaped = true
        } else if character == "\"" {
          isInString = false
        }
        index = nextIndex
        continue
      }

      if line[index...].hasPrefix("\"\"\"") {
        throw SourceBoundaryError.unsupportedMultilineString
      } else if character == "#", nextCharacter == "\"" {
        throw SourceBoundaryError.unsupportedRawString
      } else if character == "\"" {
        isInString = true
        result.append(character)
        index = nextIndex
      } else if character == "/", nextCharacter == "/" {
        break
      } else if character == "/", nextCharacter == "*" {
        blockCommentDepth += 1
        result.append(contentsOf: "  ")
        index = line.index(after: nextIndex)
      } else {
        result.append(character)
        index = nextIndex
      }
    }

    guard !isInString else {
      throw SourceBoundaryError.unterminatedString
    }

    return result
  }
}

private enum SourceBoundaryError: Error, CustomStringConvertible {
  case sourceIsTooLarge(String)
  case sourceIsNotUTF8(String)
  case invalidProductSourceRoot(String)
  case productSourceTreeTooLarge(String)
  case productSourceCountTooLarge(Int)
  case symbolicLinkInProductSourceTree(String)
  case nonRegularProductSource(String)
  case productSourceSetIsEmpty
  case productSourcesAreTooLarge
  case unexpectedTestPath(String)
  case unexpectedConditionalDirective(String, Int)
  case unterminatedBlockComment(String)
  case unterminatedConditional(String)
  case unsupportedMultilineString
  case unsupportedRawString
  case unterminatedString

  var description: String {
    switch self {
    case .sourceIsTooLarge(let path):
      "The source file is too large to scan safely: \(path)."
    case .sourceIsNotUTF8(let path):
      "The source file is not UTF-8: \(path)."
    case .invalidProductSourceRoot(let path):
      "The product source root is not a directory: \(path)."
    case .productSourceTreeTooLarge(let path):
      "The product source tree has too many entries near: \(path)."
    case .productSourceCountTooLarge(let maximum):
      "The product source set has more than \(maximum) Swift files."
    case .symbolicLinkInProductSourceTree(let path):
      "The product source tree contains a symbolic link: \(path)."
    case .nonRegularProductSource(let path):
      "The product source path is not a regular Swift file: \(path)."
    case .productSourceSetIsEmpty:
      "The product source set is empty."
    case .productSourcesAreTooLarge:
      "The product source set is too large to scan safely."
    case .unexpectedTestPath(let path):
      "The test source path does not have the expected repository layout: \(path)."
    case .unexpectedConditionalDirective(let path, let lineNumber):
      "The conditional directive is not balanced: \(path):\(lineNumber)."
    case .unterminatedBlockComment(let path):
      "The source file has an unterminated block comment: \(path)."
    case .unterminatedConditional(let path):
      "The source file has an unterminated conditional directive: \(path)."
    case .unsupportedMultilineString:
      "The source scanner does not support multiline strings."
    case .unsupportedRawString:
      "The source scanner does not support raw strings."
    case .unterminatedString:
      "The source scanner found an unterminated string."
    }
  }
}
