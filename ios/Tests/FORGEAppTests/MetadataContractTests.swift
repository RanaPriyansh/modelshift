import ForgeCore
import Foundation
import Testing

#if DEBUG
  @testable import FORGE
#endif

@Suite("Apple metadata contracts")
struct MetadataContractTests {
  #if DEBUG
    @MainActor
    @Test("UI-test clock returns one deterministic second per request")
    func uiTestClockValues() {
      let clock = FORGEApp.UITestMonotonicClock(
        unixStart: 1_800_000_000.25
      )

      let values = [
        clock.now().timeIntervalSince1970,
        clock.now().timeIntervalSince1970,
        clock.now().timeIntervalSince1970,
      ]

      #expect(
        values == [1_800_000_000.25, 1_800_000_001.25, 1_800_000_002.25]
      )
    }

    @Test("Response policy preserves normal text")
    func responsePolicyNormalText() {
      let result = UniversityActivityResponsePolicy.evaluate("Reasoning: café")

      #expect(result.boundedText == "Reasoning: café")
      #expect(result.utf8ByteCount == 16)
      #expect(result.hasNonWhitespace)
      #expect(!result.isTruncated)
    }

    @Test("Response policy rejects whitespace-only text for submission")
    func responsePolicyWhitespaceOnlyText() {
      let result = UniversityActivityResponsePolicy.evaluate(" \n\t\r")

      #expect(result.boundedText == " \n\t\r")
      #expect(result.utf8ByteCount == 4)
      #expect(!result.hasNonWhitespace)
      #expect(!result.isTruncated)
    }

    @Test("Response policy keeps exact ASCII byte limit")
    func responsePolicyExactASCIILimit() {
      let maximumByteCount = UniversityLearningLimits.maximumResponseBytes
      let text = String(repeating: "a", count: maximumByteCount)
      let result = UniversityActivityResponsePolicy.evaluate(text)

      #expect(result.boundedText == text)
      #expect(result.utf8ByteCount == maximumByteCount)
      #expect(result.hasNonWhitespace)
      #expect(!result.isTruncated)
    }

    @Test("Response policy truncates ASCII overflow")
    func responsePolicyASCIIOverflow() {
      let maximumByteCount = UniversityLearningLimits.maximumResponseBytes
      let text = String(repeating: "a", count: maximumByteCount + 1)
      let expectedText = String(repeating: "a", count: maximumByteCount)
      let result = UniversityActivityResponsePolicy.evaluate(text)

      #expect(result.boundedText == expectedText)
      #expect(result.utf8ByteCount == maximumByteCount)
      #expect(result.hasNonWhitespace)
      #expect(result.isTruncated)
    }

    @Test("Response policy does not break multi-byte characters on overflow")
    func responsePolicyMultiByteOverflow() {
      let maximumByteCount = UniversityLearningLimits.maximumResponseBytes
      let character = "👩🏽‍🚀"
      let expectedText = String(
        repeating: "a",
        count: maximumByteCount - character.utf8.count + 1
      )
      let result = UniversityActivityResponsePolicy.evaluate(expectedText + character)

      #expect(character.count == 1)
      #expect(result.boundedText == expectedText)
      #expect(result.utf8ByteCount == expectedText.utf8.count)
      #expect(result.hasNonWhitespace)
      #expect(result.isTruncated)
    }
  #endif

  @Test("UI-test clock remains inside the DEBUG source boundary")
  func uiTestClockDebugBoundary() throws {
    let source = try MetadataContractFiles.text(
      at: "ios/Sources/App/FORGEApp.swift"
    )
    let debugStart = try #require(
      source.range(
        of: "  #if DEBUG\n    private static func configureUITestLaunch()"
      )?.lowerBound
    )
    let debugEnd = try #require(
      source.range(
        of: "\n  #endif\n}",
        range: debugStart..<source.endIndex
      )?.lowerBound
    )
    let debugSource = String(source[debugStart..<debugEnd])
    let nonDebugSource =
      String(source[..<debugStart]) + String(source[debugEnd..<source.endIndex])

    #expect(debugSource.contains("final class UITestMonotonicClock"))
    #expect(debugSource.contains("-FORGEUITestingClockStart"))
    #expect(!nonDebugSource.contains("UITestMonotonicClock"))
    #expect(!nonDebugSource.contains("-FORGEUITestingClockStart"))
    #expect(
      nonDebugSource.contains(
        "@State private var model: AppModel = AppComposition.makeAppModel()"
      )
    )
  }

  @Test("Application and widget bundle identifiers match project settings")
  func bundleIdentifiers() throws {
    let applicationInfo = try MetadataContractFiles.plist(
      at: "ios/Config/FORGE-Info.plist"
    )
    let widgetInfo = try MetadataContractFiles.plist(
      at: "ios/Config/FORGEWidgets-Info.plist"
    )
    let project = try ProjectYAML.load()

    #expect(
      try requiredString("CFBundleIdentifier", in: applicationInfo)
        == "$(PRODUCT_BUNDLE_IDENTIFIER)"
    )
    #expect(
      try requiredString("CFBundleIdentifier", in: widgetInfo)
        == "$(PRODUCT_BUNDLE_IDENTIFIER)"
    )
    #expect(
      try project.targetBuildSetting(
        target: "FORGE",
        named: "PRODUCT_BUNDLE_IDENTIFIER"
      ) == "com.forgelearning.app"
    )
    #expect(
      try project.targetBuildSetting(
        target: "FORGEWidgets",
        named: "PRODUCT_BUNDLE_IDENTIFIER"
      ) == "com.forgelearning.app.widgets"
    )
  }

  @Test("Application URL scheme is stable")
  func urlScheme() throws {
    let applicationInfo = try MetadataContractFiles.plist(
      at: "ios/Config/FORGE-Info.plist"
    )
    let urlTypes = try requiredDictionaryArray(
      "CFBundleURLTypes",
      in: applicationInfo
    )
    let urlType = try #require(urlTypes.first)
    let schemes = try requiredStringArray("CFBundleURLSchemes", in: urlType)

    #expect(urlTypes.count == 1)
    #expect(
      try requiredString("CFBundleURLName", in: urlType)
        == "com.forgelearning.app"
    )
    #expect(schemes == ["forge"])
  }

  @Test("Application metadata declares education and non-exempt encryption")
  func storeMetadataDeclarations() throws {
    let applicationInfo = try MetadataContractFiles.plist(
      at: "ios/Config/FORGE-Info.plist"
    )

    #expect(
      try requiredString("LSApplicationCategoryType", in: applicationInfo)
        == "public.app-category.education"
    )
    #expect(
      try requiredBool("ITSAppUsesNonExemptEncryption", in: applicationInfo)
        == false
    )
  }

  @Test("Application and widget use the same App Group")
  func appGroups() throws {
    let applicationEntitlements = try MetadataContractFiles.plist(
      at: "ios/Config/FORGE.entitlements"
    )
    let widgetEntitlements = try MetadataContractFiles.plist(
      at: "ios/Config/FORGEWidgets.entitlements"
    )
    let applicationGroups = try requiredStringArray(
      "com.apple.security.application-groups",
      in: applicationEntitlements
    )
    let widgetGroups = try requiredStringArray(
      "com.apple.security.application-groups",
      in: widgetEntitlements
    )

    #expect(applicationGroups == ["group.com.forgelearning.shared"])
    #expect(widgetGroups == applicationGroups)
  }

  @Test("Privacy manifest declares no tracking and required file metadata reason")
  func privacyManifest() throws {
    let privacyManifest = try MetadataContractFiles.plist(
      at: "ios/Resources/PrivacyInfo.xcprivacy"
    )
    let categories = try privacyReasonCategories(in: privacyManifest)
    let requiredCategories: [String: Set<String>] = [
      "NSPrivacyAccessedAPICategoryFileTimestamp": Set(["C617.1"])
    ]
    let requiredKeys: Set<String> = [
      "NSPrivacyTracking",
      "NSPrivacyAccessedAPITypes",
    ]

    #expect(try requiredBool("NSPrivacyTracking", in: privacyManifest) == false)
    #expect(Set(privacyManifest.keys) == requiredKeys)
    #expect(categories == requiredCategories)
  }

  @Test("File-metadata calls stay inside application containers")
  func fileMetadataAPIContainerScope() throws {
    let sourcePaths = try MetadataContractFiles.swiftRelativePaths(
      at: FileMetadataSourceContract.productionSourceDirectories
    )
    var sourceCallCounts: [String: [String: Int]] = [:]

    for sourcePath in sourcePaths {
      let source = try MetadataContractFiles.text(at: sourcePath)
      let callCounts = try fileMetadataCallCounts(in: source)
      if !callCounts.isEmpty {
        sourceCallCounts[sourcePath] = callCounts
      }
    }

    #expect(
      Set(sourceCallCounts.keys)
        == Set(FileMetadataSourceContract.all.map(\.relativePath))
    )

    for contract in FileMetadataSourceContract.all {
      let source = try MetadataContractFiles.text(at: contract.relativePath)
      let callCounts = try #require(sourceCallCounts[contract.relativePath])

      #expect(callCounts == contract.expectedCallCounts)
      for containerScopeAnchor in contract.containerScopeAnchors {
        #expect(source.contains(containerScopeAnchor))
      }
    }
  }

  @Test("App icon manifest contains the universal 1024 point slot")
  func appIconManifest() throws {
    let manifest = try MetadataContractFiles.json(
      at: "ios/Resources/Assets.xcassets/AppIcon.appiconset/Contents.json"
    )
    let images = try requiredDictionaryArray("images", in: manifest)
    let universalSlots = images.filter {
      (try? requiredString("idiom", in: $0)) == "universal"
        && (try? requiredString("platform", in: $0)) == "ios"
        && (try? requiredString("size", in: $0)) == "1024x1024"
    }
    let universalSlot = try #require(universalSlots.first)

    #expect(universalSlots.count == 1)
    #expect(try requiredString("filename", in: universalSlot) == "AppIcon.png")
  }

  @Test("Public-link values are source placeholders or HTTPS values")
  func publicLinkValues() throws {
    let applicationInfo = try MetadataContractFiles.plist(
      at: "ios/Config/FORGE-Info.plist"
    )
    let project = try ProjectYAML.load()
    let contracts = [
      ("FORGEPrivacyPolicyURL", "FORGE_PRIVACY_POLICY_URL"),
      ("FORGESupportURL", "FORGE_SUPPORT_URL"),
    ]

    for (plistKey, buildSetting) in contracts {
      let plistValue = try requiredString(plistKey, in: applicationInfo)
      let projectValue = try project.targetInfoProperty(
        target: "FORGE",
        named: plistKey
      )

      #expect(
        isSourcePublicLinkValue(plistValue, buildSetting: buildSetting)
      )
      #expect(
        isSourcePublicLinkValue(projectValue, buildSetting: buildSetting)
      )
      #expect(projectValue == plistValue)
    }
  }

  @Test("Application and widget share version and build settings")
  func versionAndBuildSettings() throws {
    let applicationInfo = try MetadataContractFiles.plist(
      at: "ios/Config/FORGE-Info.plist"
    )
    let widgetInfo = try MetadataContractFiles.plist(
      at: "ios/Config/FORGEWidgets-Info.plist"
    )
    let project = try ProjectYAML.load()
    let marketingVersion = try project.baseBuildSetting(named: "MARKETING_VERSION")
    let buildVersion = try project.baseBuildSetting(named: "CURRENT_PROJECT_VERSION")

    #expect(isMarketingVersion(marketingVersion))
    #expect(isBuildVersion(buildVersion))

    for info in [applicationInfo, widgetInfo] {
      #expect(
        try requiredString("CFBundleShortVersionString", in: info)
          == "$(MARKETING_VERSION)"
      )
      #expect(
        try requiredString("CFBundleVersion", in: info)
          == "$(CURRENT_PROJECT_VERSION)"
      )
    }

    for target in ["FORGE", "FORGEWidgets"] {
      #expect(
        try project.targetInfoProperty(
          target: target,
          named: "CFBundleShortVersionString"
        ) == "$(MARKETING_VERSION)"
      )
      #expect(
        try project.targetInfoProperty(
          target: target,
          named: "CFBundleVersion"
        ) == "$(CURRENT_PROJECT_VERSION)"
      )
    }
  }

  @Test("Application declares the configured launch-screen assets")
  func launchScreenKeys() throws {
    let applicationInfo = try MetadataContractFiles.plist(
      at: "ios/Config/FORGE-Info.plist"
    )
    let project = try ProjectYAML.load()
    let launchScreen = try requiredDictionary("UILaunchScreen", in: applicationInfo)
    let projectLaunchScreen = try project.targetInfoDictionary(
      target: "FORGE",
      named: "UILaunchScreen"
    )
    let expectedKeys: Set<String> = [
      "UIColorName",
      "UIImageName",
      "UIImageRespectsSafeAreaInsets",
    ]

    #expect(Set(launchScreen.keys) == expectedKeys)
    #expect(Set(projectLaunchScreen.keys) == expectedKeys)
    #expect(try requiredString("UIColorName", in: launchScreen) == "LaunchBackground")
    #expect(try requiredString("UIImageName", in: launchScreen) == "LaunchMark")
    #expect(
      try requiredBool("UIImageRespectsSafeAreaInsets", in: launchScreen) == true
    )
    #expect(projectLaunchScreen["UIColorName"] == "LaunchBackground")
    #expect(projectLaunchScreen["UIImageName"] == "LaunchMark")
    #expect(projectLaunchScreen["UIImageRespectsSafeAreaInsets"] == "true")
    #expect(applicationInfo["UILaunchStoryboardName"] == nil)
  }

  @Test("Checked-in project includes every current Swift source")
  func sourceMembership() throws {
    let project = try PBXProject.load()

    for contract in SourceDirectoryContract.all {
      let sourcePhase = try project.sourcePhase(forTarget: contract.target)
      let sourceFileNames = try MetadataContractFiles.swiftBasenames(
        at: contract.relativePath
      )

      #expect(!sourceFileNames.isEmpty)
      for sourceFileName in sourceFileNames {
        #expect(try project.hasSwiftFileReference(named: sourceFileName))
        #expect(
          project.sourcePhase(sourcePhase, contains: sourceFileName)
        )
      }
    }
  }
}

private enum MetadataContractFiles {
  private static let maximumFileByteCount = 128 * 1024
  private static let maximumDirectoryEntryCount = 512
  private static let maximumSwiftFileCount = 256

  static func plist(at relativePath: String) throws -> [String: Any] {
    let data = try boundedData(at: relativePath)
    let propertyList = try PropertyListSerialization.propertyList(
      from: data,
      options: [],
      format: nil
    )
    return try requiredDictionary(propertyList, context: relativePath)
  }

  static func json(at relativePath: String) throws -> [String: Any] {
    let data = try boundedData(at: relativePath)
    let json = try JSONSerialization.jsonObject(with: data)
    return try requiredDictionary(json, context: relativePath)
  }

  static func text(at relativePath: String) throws -> String {
    let data = try boundedData(at: relativePath)
    guard let text = String(data: data, encoding: .utf8) else {
      throw MetadataContractFailure("Expected UTF-8 text in \(relativePath).")
    }
    return text
  }

  static func swiftBasenames(at relativePath: String) throws -> [String] {
    let basenames = try swiftRelativePaths(at: [relativePath]).map {
      URL(fileURLWithPath: $0).lastPathComponent
    }.sorted()

    guard Set(basenames).count == basenames.count else {
      throw MetadataContractFailure(
        "Swift basenames must be unique in \(relativePath)."
      )
    }
    return basenames
  }

  static func swiftRelativePaths(
    at relativePaths: [String]
  ) throws -> [String] {
    guard !relativePaths.isEmpty else {
      throw MetadataContractFailure("A source directory contract is required.")
    }

    var sourcePaths: [String] = []
    for relativePath in relativePaths {
      sourcePaths.append(
        contentsOf: try swiftRelativePaths(in: relativePath)
      )
      guard sourcePaths.count <= maximumSwiftFileCount else {
        throw MetadataContractFailure(
          "Source contracts exceed \(maximumSwiftFileCount) Swift files."
        )
      }
    }

    let sortedPaths = sourcePaths.sorted()
    guard Set(sortedPaths).count == sortedPaths.count else {
      throw MetadataContractFailure("Source contract paths must be unique.")
    }
    return sortedPaths
  }

  private static func swiftRelativePaths(
    in relativePath: String
  ) throws -> [String] {
    let rootURL = try repositoryRoot()
    let directoryURL = try repositoryFileURL(relativePath)
    let resourceKeys: [URLResourceKey] = [
      .isDirectoryKey,
      .isRegularFileKey,
      .isSymbolicLinkKey,
    ]
    let directoryValues = try directoryURL.resourceValues(
      forKeys: Set(resourceKeys)
    )

    guard directoryValues.isDirectory == true,
      directoryValues.isSymbolicLink != true
    else {
      throw MetadataContractFailure("Expected a directory at \(relativePath).")
    }
    guard
      let enumerator = FileManager.default.enumerator(
        at: directoryURL,
        includingPropertiesForKeys: resourceKeys,
        options: [.skipsHiddenFiles, .skipsPackageDescendants]
      )
    else {
      throw MetadataContractFailure("Cannot enumerate \(relativePath).")
    }

    var entryCount = 0
    var sourcePaths: [String] = []

    while let item = enumerator.nextObject() {
      guard let fileURL = item as? URL else {
        throw MetadataContractFailure("Unexpected directory entry in \(relativePath).")
      }
      entryCount += 1
      guard entryCount <= maximumDirectoryEntryCount else {
        throw MetadataContractFailure(
          "\(relativePath) exceeds \(maximumDirectoryEntryCount) directory entries."
        )
      }

      let values = try fileURL.resourceValues(forKeys: Set(resourceKeys))
      if values.isSymbolicLink == true {
        if values.isDirectory == true {
          enumerator.skipDescendants()
        }
        continue
      }
      guard values.isRegularFile == true,
        fileURL.pathExtension == "swift"
      else {
        continue
      }

      let fileComponents = fileURL.standardizedFileURL.pathComponents
      let rootComponents = rootURL.pathComponents
      guard fileComponents.starts(with: rootComponents) else {
        throw MetadataContractFailure(
          "Swift source is outside the repository: \(fileURL.path)."
        )
      }
      let sourcePath = fileComponents.dropFirst(rootComponents.count)
        .joined(separator: "/")
      guard !sourcePath.isEmpty else {
        throw MetadataContractFailure("Swift source path is empty.")
      }

      sourcePaths.append(sourcePath)
      guard sourcePaths.count <= maximumSwiftFileCount else {
        throw MetadataContractFailure(
          "\(relativePath) exceeds \(maximumSwiftFileCount) Swift files."
        )
      }
    }

    let sortedPaths = sourcePaths.sorted()
    guard !sortedPaths.isEmpty else {
      throw MetadataContractFailure("No Swift files exist in \(relativePath).")
    }
    return sortedPaths
  }

  private static func boundedData(at relativePath: String) throws -> Data {
    let fileURL = try repositoryFileURL(relativePath)
    let handle = try FileHandle(forReadingFrom: fileURL)
    defer { try? handle.close() }

    guard let data = try handle.read(upToCount: maximumFileByteCount + 1) else {
      throw MetadataContractFailure("Cannot read \(relativePath).")
    }
    guard data.count <= maximumFileByteCount else {
      throw MetadataContractFailure(
        "\(relativePath) exceeds \(maximumFileByteCount) bytes."
      )
    }
    return data
  }

  private static func repositoryFileURL(_ relativePath: String) throws -> URL {
    let pathComponents = relativePath.split(separator: "/").map(String.init)
    guard !pathComponents.isEmpty,
      !relativePath.hasPrefix("/"),
      pathComponents.allSatisfy({ $0 != "." && $0 != ".." })
    else {
      throw MetadataContractFailure("Invalid repository-relative path: \(relativePath).")
    }

    return pathComponents.reduce(try repositoryRoot()) { partialURL, component in
      partialURL.appendingPathComponent(component, isDirectory: false)
    }
  }

  private static func repositoryRoot() throws -> URL {
    let sourceFileURL = URL(fileURLWithPath: #filePath)
      .resolvingSymlinksInPath()
      .standardizedFileURL
    let appTestsURL = sourceFileURL.deletingLastPathComponent()
    let testsURL = appTestsURL.deletingLastPathComponent()
    let iosURL = testsURL.deletingLastPathComponent()
    let rootURL = iosURL.deletingLastPathComponent()
    let expectedSourceURL =
      rootURL
      .appendingPathComponent("ios", isDirectory: true)
      .appendingPathComponent("Tests", isDirectory: true)
      .appendingPathComponent("FORGEAppTests", isDirectory: true)
      .appendingPathComponent("MetadataContractTests.swift", isDirectory: false)
      .standardizedFileURL

    guard appTestsURL.lastPathComponent == "FORGEAppTests",
      testsURL.lastPathComponent == "Tests",
      iosURL.lastPathComponent == "ios",
      expectedSourceURL.path == sourceFileURL.path
    else {
      throw MetadataContractFailure(
        "Cannot derive the repository root from MetadataContractTests.swift."
      )
    }
    return rootURL
  }
}

private struct ProjectYAML {
  private let lines: [Line]

  static func load() throws -> ProjectYAML {
    try ProjectYAML(text: MetadataContractFiles.text(at: "ios/project.yml"))
  }

  func baseBuildSetting(named name: String) throws -> String {
    let settings = try block(named: "settings", indentation: 0, in: lines)
    let base = try block(named: "base", indentation: 2, in: settings)
    return try scalar(named: name, indentation: 4, in: base)
  }

  func targetBuildSetting(target: String, named name: String) throws -> String {
    let settings = try targetSettings(target: target)
    let base = try block(named: "base", indentation: 6, in: settings)
    return try scalar(named: name, indentation: 8, in: base)
  }

  func targetInfoProperty(target: String, named name: String) throws -> String {
    let targets = try block(named: "targets", indentation: 0, in: lines)
    let targetBlock = try block(named: target, indentation: 2, in: targets)
    let info = try block(named: "info", indentation: 4, in: targetBlock)
    let properties = try block(named: "properties", indentation: 6, in: info)
    return try scalar(named: name, indentation: 8, in: properties)
  }

  func targetInfoDictionary(
    target: String,
    named name: String
  ) throws -> [String: String] {
    let targets = try block(named: "targets", indentation: 0, in: lines)
    let targetBlock = try block(named: target, indentation: 2, in: targets)
    let info = try block(named: "info", indentation: 4, in: targetBlock)
    let properties = try block(named: "properties", indentation: 6, in: info)
    let dictionary = try block(named: name, indentation: 8, in: properties)
    return try scalarDictionary(indentation: 10, in: dictionary)
  }

  private init(text: String) {
    lines = text.split(separator: "\n", omittingEmptySubsequences: false).map {
      Line(raw: String($0))
    }
  }

  private func targetSettings(target: String) throws -> [Line] {
    let targets = try block(named: "targets", indentation: 0, in: lines)
    let targetBlock = try block(named: target, indentation: 2, in: targets)
    return try block(named: "settings", indentation: 4, in: targetBlock)
  }

  private func block(
    named name: String,
    indentation: Int,
    in source: [Line]
  ) throws -> [Line] {
    guard
      let index = source.firstIndex(where: {
        $0.indentation == indentation && $0.content == "\(name):"
      })
    else {
      throw MetadataContractFailure("Cannot find YAML block \(name).")
    }

    var result: [Line] = []
    for line in source.dropFirst(index + 1) {
      if !line.content.isEmpty && line.indentation <= indentation {
        break
      }
      result.append(line)
    }
    return result
  }

  private func scalar(
    named name: String,
    indentation: Int,
    in source: [Line]
  ) throws -> String {
    let prefix = "\(name):"
    guard
      let line = source.first(where: {
        $0.indentation == indentation && $0.content.hasPrefix(prefix)
      })
    else {
      throw MetadataContractFailure("Cannot find YAML value \(name).")
    }

    let rawValue = String(line.content.dropFirst(prefix.count))
      .trimmingCharacters(in: .whitespaces)
    guard !rawValue.isEmpty else {
      throw MetadataContractFailure("YAML value \(name) is empty.")
    }
    return unquoted(rawValue)
  }

  private func scalarDictionary(
    indentation: Int,
    in source: [Line]
  ) throws -> [String: String] {
    var values: [String: String] = [:]

    for line in source where !line.content.isEmpty {
      guard line.indentation == indentation,
        let separator = line.content.firstIndex(of: ":")
      else {
        throw MetadataContractFailure("Expected a scalar YAML dictionary entry.")
      }

      let name = String(line.content[..<separator])
        .trimmingCharacters(in: .whitespaces)
      let rawValue = String(line.content[line.content.index(after: separator)...])
        .trimmingCharacters(in: .whitespaces)
      guard !name.isEmpty, !rawValue.isEmpty else {
        throw MetadataContractFailure("YAML dictionary entry is empty.")
      }
      guard values[name] == nil else {
        throw MetadataContractFailure("YAML dictionary key \(name) is duplicated.")
      }
      values[name] = unquoted(rawValue)
    }

    guard !values.isEmpty else {
      throw MetadataContractFailure("YAML dictionary is empty.")
    }
    return values
  }

  private func unquoted(_ value: String) -> String {
    guard value.count >= 2,
      let first = value.first,
      let last = value.last,
      (first == "\"" && last == "\"") || (first == "'" && last == "'")
    else {
      return value
    }
    return String(value.dropFirst().dropLast())
  }

  private struct Line {
    let indentation: Int
    let content: String

    init(raw: String) {
      indentation = raw.prefix(while: { $0 == " " }).count
      content = String(raw.dropFirst(indentation))
    }
  }
}

private struct FileMetadataSourceContract {
  let relativePath: String
  let expectedCallCounts: [String: Int]
  let containerScopeAnchors: [String]

  static let productionSourceDirectories = [
    "ios/Sources/App",
    "ios/Sources/SystemIntegration",
    "ios/Sources/Widgets",
    "ios/Packages/ForgeCore/Sources/ForgeCore",
  ]

  static let all = [
    FileMetadataSourceContract(
      relativePath: "ios/Sources/App/Services/PrivateStateStore.swift",
      expectedCallCounts: [
        "stat": 3,
        "fstat": 1,
        "fstatat": 1,
        "lstat": 1,
      ],
      containerScopeAnchors: [
        "init() {\n    injectedFileURL = nil",
        "for: .applicationSupportDirectory,\n        in: .userDomainMask",
        "return try Self.defaultFileURL()",
        "let fileURL = try validatedFileURL()",
        "Darwin.fstatat(\n          parentDirectory",
        "guard Darwin.fstat(fileDescriptor, &metadata) == 0",
        "guard Darwin.lstat(url.path, &metadata) == 0",
      ]
    ),
    FileMetadataSourceContract(
      relativePath:
        "ios/Packages/ForgeCore/Sources/ForgeCore/SharedStateStore.swift",
      expectedCallCounts: [
        "stat": 10,
        "fstat": 7,
        "fstatat": 3,
      ],
      containerScopeAnchors: [
        "FileManager.default.containerURL(\n"
          + "        forSecurityApplicationGroupIdentifier: Self.appGroupIdentifier",
        "self.sharedRootDirectory = sharedRootDirectory.standardizedFileURL",
        "open(path, O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW)",
        "openat(directory, $0, flags, S_IRUSR | S_IWUSR)",
        "guard fstat(descriptor, &metadata) == 0",
        "fstatat(directory, path, &metadata, AT_SYMLINK_NOFOLLOW)",
      ]
    ),
  ]
}

private struct SourceDirectoryContract {
  let relativePath: String
  let target: String

  static let all = [
    SourceDirectoryContract(relativePath: "ios/Sources/App", target: "FORGE"),
    SourceDirectoryContract(
      relativePath: "ios/Sources/SystemIntegration",
      target: "FORGE"
    ),
    SourceDirectoryContract(
      relativePath: "ios/Tests/FORGEAppTests",
      target: "FORGEAppTests"
    ),
    SourceDirectoryContract(
      relativePath: "ios/Tests/FORGEUITests",
      target: "FORGEUITests"
    ),
  ]
}

private struct PBXProject {
  private let text: String

  static func load() throws -> PBXProject {
    try PBXProject(
      text: MetadataContractFiles.text(
        at: "ios/FORGE.xcodeproj/project.pbxproj"
      )
    )
  }

  func hasSwiftFileReference(named basename: String) throws -> Bool {
    let marker = "/* \(basename) */ = {"
    var searchRange = text.startIndex..<text.endIndex

    while let range = text.range(of: marker, range: searchRange) {
      let block = try projectBlock(
        startingAt: range.lowerBound,
        context: "file reference \(basename)"
      )
      if block.contains("isa = PBXFileReference;")
        && block.contains("sourcecode.swift")
      {
        return true
      }
      searchRange = range.upperBound..<text.endIndex
    }
    return false
  }

  func sourcePhase(forTarget target: String) throws -> String {
    let targetBlock = try nativeTargetBlock(named: target)
    let identifier = try sourcePhaseIdentifier(
      in: targetBlock,
      target: target
    )
    let sourcePhase = try projectBlock(
      beginningWith: "\(identifier) /* Sources */ = {",
      context: "Sources phase for \(target)"
    )

    guard sourcePhase.contains("isa = PBXSourcesBuildPhase;") else {
      throw MetadataContractFailure(
        "Expected a Sources build phase for \(target)."
      )
    }
    return sourcePhase
  }

  func sourcePhase(_ sourcePhase: String, contains basename: String) -> Bool {
    sourcePhase.contains("/* \(basename) in Sources */")
  }

  private func nativeTargetBlock(named target: String) throws -> String {
    let marker = "/* \(target) */ = {"
    var searchRange = text.startIndex..<text.endIndex

    while let range = text.range(of: marker, range: searchRange) {
      let block = try projectBlock(
        startingAt: range.lowerBound,
        context: "target \(target)"
      )
      if block.contains("isa = PBXNativeTarget;") {
        return block
      }
      searchRange = range.upperBound..<text.endIndex
    }
    throw MetadataContractFailure("Cannot find PBX target \(target).")
  }

  private func sourcePhaseIdentifier(
    in targetBlock: String,
    target: String
  ) throws -> String {
    guard let buildPhasesRange = targetBlock.range(of: "buildPhases = (") else {
      throw MetadataContractFailure("Cannot find build phases for \(target).")
    }
    let phaseListStart = buildPhasesRange.upperBound
    guard
      let phaseListEnd = targetBlock[phaseListStart...]
        .range(of: ");")?
        .lowerBound
    else {
      throw MetadataContractFailure("Cannot end build phases for \(target).")
    }

    let identifiers = targetBlock[phaseListStart..<phaseListEnd]
      .split(separator: "\n")
      .compactMap { rawLine -> String? in
        let line = rawLine.trimmingCharacters(in: .whitespaces)
        let suffix = " /* Sources */,"
        guard line.hasSuffix(suffix) else {
          return nil
        }
        let identifier = String(line.dropLast(suffix.count))
        return isPBXIdentifier(identifier) ? identifier : nil
      }

    guard identifiers.count == 1, let identifier = identifiers.first else {
      throw MetadataContractFailure(
        "Expected one Sources build phase for \(target)."
      )
    }
    return identifier
  }

  private func projectBlock(
    beginningWith marker: String,
    context: String
  ) throws -> String {
    guard let range = text.range(of: marker) else {
      throw MetadataContractFailure("Cannot find \(context) in project.pbxproj.")
    }
    return try projectBlock(startingAt: range.lowerBound, context: context)
  }

  private func projectBlock(
    startingAt start: String.Index,
    context: String
  ) throws -> String {
    guard let openingBrace = text[start...].firstIndex(of: "{") else {
      throw MetadataContractFailure("Cannot open \(context) in project.pbxproj.")
    }

    var braceDepth = 0
    var index = openingBrace
    while index < text.endIndex {
      switch text[index] {
      case "{":
        braceDepth += 1
      case "}":
        braceDepth -= 1
        if braceDepth == 0 {
          return String(text[start...index])
        }
      default:
        break
      }
      index = text.index(after: index)
    }
    throw MetadataContractFailure("Cannot close \(context) in project.pbxproj.")
  }

  private func isPBXIdentifier(_ value: String) -> Bool {
    value.count == 24
      && value.utf8.allSatisfy {
        ($0 >= 48 && $0 <= 57)
          || ($0 >= 65 && $0 <= 70)
          || ($0 >= 97 && $0 <= 102)
      }
  }
}

private struct MetadataContractFailure: Error, CustomStringConvertible {
  let description: String

  init(_ description: String) {
    self.description = description
  }
}

private func requiredDictionary(
  _ key: String,
  in dictionary: [String: Any]
) throws -> [String: Any] {
  try requiredDictionary(dictionary[key] as Any, context: key)
}

private func requiredDictionary(
  _ value: Any,
  context: String
) throws -> [String: Any] {
  guard let dictionary = value as? [String: Any] else {
    throw MetadataContractFailure("Expected a dictionary for \(context).")
  }
  return dictionary
}

private func requiredDictionaryArray(
  _ key: String,
  in dictionary: [String: Any]
) throws -> [[String: Any]] {
  guard let array = dictionary[key] as? [[String: Any]] else {
    throw MetadataContractFailure("Expected a dictionary array for \(key).")
  }
  return array
}

private func requiredString(
  _ key: String,
  in dictionary: [String: Any]
) throws -> String {
  guard let value = dictionary[key] as? String else {
    throw MetadataContractFailure("Expected a string for \(key).")
  }
  return value
}

private func requiredStringArray(
  _ key: String,
  in dictionary: [String: Any]
) throws -> [String] {
  guard let array = dictionary[key] as? [String] else {
    throw MetadataContractFailure("Expected a string array for \(key).")
  }
  return array
}

private func requiredBool(
  _ key: String,
  in dictionary: [String: Any]
) throws -> Bool {
  guard let value = dictionary[key] as? Bool else {
    throw MetadataContractFailure("Expected a Boolean for \(key).")
  }
  return value
}

private func privacyReasonCategories(
  in manifest: [String: Any]
) throws -> [String: Set<String>] {
  let records = try requiredDictionaryArray("NSPrivacyAccessedAPITypes", in: manifest)
  var categories: [String: Set<String>] = [:]

  for record in records {
    let category = try requiredString("NSPrivacyAccessedAPIType", in: record)
    let reasons = try requiredStringArray(
      "NSPrivacyAccessedAPITypeReasons",
      in: record
    )
    let uniqueReasons = Set(reasons)

    guard !reasons.isEmpty, uniqueReasons.count == reasons.count else {
      throw MetadataContractFailure(
        "Privacy category \(category) must have unique required reasons."
      )
    }
    guard categories[category] == nil else {
      throw MetadataContractFailure("Privacy category \(category) is duplicated.")
    }
    categories[category] = uniqueReasons
  }
  return categories
}

private func fileMetadataCallCounts(
  in source: String
) throws -> [String: Int] {
  let expression = try NSRegularExpression(
    pattern:
      #"(?<![A-Za-z0-9_])(?:Darwin\.)?(stat|fstat|fstatat|lstat)\s*\("#
  )
  let sourceRange = NSRange(source.startIndex..<source.endIndex, in: source)
  var callCounts: [String: Int] = [:]

  for match in expression.matches(in: source, range: sourceRange) {
    guard match.numberOfRanges == 2,
      let callRange = Range(match.range(at: 1), in: source)
    else {
      throw MetadataContractFailure("Cannot parse a file-metadata call.")
    }
    callCounts[String(source[callRange]), default: 0] += 1
  }
  return callCounts
}

private func isSourcePublicLinkValue(_ value: String, buildSetting: String) -> Bool {
  if value == "$(\(buildSetting))" {
    return true
  }

  guard let components = URLComponents(string: value),
    components.scheme?.lowercased() == "https",
    let host = components.host,
    !host.isEmpty
  else {
    return false
  }
  return true
}

private func isMarketingVersion(_ value: String) -> Bool {
  let components = value.split(separator: ".", omittingEmptySubsequences: false)
  return (1...3).contains(components.count)
    && components.allSatisfy(containsOnlyDecimalDigits)
}

private func isBuildVersion(_ value: String) -> Bool {
  containsOnlyDecimalDigits(Substring(value))
}

private func containsOnlyDecimalDigits(_ value: Substring) -> Bool {
  !value.isEmpty && value.utf8.allSatisfy { $0 >= 48 && $0 <= 57 }
}
