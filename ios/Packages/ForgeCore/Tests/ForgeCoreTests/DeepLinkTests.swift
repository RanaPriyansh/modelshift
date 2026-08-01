import Foundation
import Testing

@testable import ForgeCore

struct DeepLinkTests {
  @Test(
    arguments: [
      ("forge://today", ForgeDestination.today),
      ("forge://path", ForgeDestination.path),
      ("forge://evidence", ForgeDestination.evidence),
      ("forge://returns", ForgeDestination.returns),
      ("forge://focus", ForgeDestination.focus),
      ("forge://settings", ForgeDestination.settings),
    ]
  )
  func acceptsAllowlistedForgeHosts(
    value: String,
    expected: ForgeDestination
  ) throws {
    let url = try #require(URL(string: value))
    #expect(ForgeDeepLink.destination(for: url) == expected)
  }

  @Test(
    arguments: [
      ("FORGE://TODAY", ForgeDestination.today),
      ("forge://ToDaY", ForgeDestination.today),
      ("fOrGe://FoCuS", ForgeDestination.focus),
    ]
  )
  func acceptsMixedCaseSchemeAndHost(
    value: String,
    expected: ForgeDestination
  ) throws {
    let url = try #require(URL(string: value))
    #expect(ForgeDeepLink.destination(for: url) == expected)
  }

  @Test(
    arguments: [
      "http://today",
      "https://today",
      "HTTP://TODAY",
      "mailto:today@example.com",
      "forge://unknown",
      "forge://user@today",
      "forge://user:secret@today",
      "forge://@today",
      "forge://today:",
      "forge://today:443",
      "forge://today?query=value",
      "forge://today#fragment",
      "forge://today?query=value#fragment",
      "forge://today.",
      "forge://%74oday",
      "forge://tod%61y",
      "forge://today%2E",
      "forge://today%2Fextra",
      "forge://today%252Fextra",
      "forge://",
      "forge:today",
      "forge:/today",
      "forge:///today",
      "forge://today/",
      "forge://today//",
      "forge://today/extra",
      "forge://today/extra/",
    ]
  )
  func rejectsUnsupportedOrAmbiguousRoutes(value: String) throws {
    let url = try #require(URL(string: value))
    #expect(ForgeDeepLink.destination(for: url) == nil)
  }

  @Test
  func invalidRoutesDoNotChangePendingDestination() throws {
    let suiteName = "DeepLinkTests.\(UUID().uuidString)"
    let defaults = try #require(UserDefaults(suiteName: suiteName))
    defer { defaults.removePersistentDomain(forName: suiteName) }

    let store = ForgeSharedStateStore(defaults: defaults)
    store.setPendingDestination(.settings)

    let url = try #require(URL(string: "forge://settings?unexpected=1"))
    #expect(ForgeDeepLink.destination(for: url) == nil)
    #expect(store.consumePendingDestination() == .settings)
    #expect(store.consumePendingDestination() == nil)
  }
}
