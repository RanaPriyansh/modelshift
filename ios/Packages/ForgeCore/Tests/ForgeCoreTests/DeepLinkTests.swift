import Foundation
import Testing

@testable import ForgeCore

struct DeepLinkTests {
  @Test(
    "Parses canonical Forge destinations",
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
    "Rejects noncanonical and hostile Forge URLs",
    arguments: [
      "FORGE://TODAY",
      "FORGE://today",
      "forge://TODAY",
      "forge://ToDaY",
      "fOrGe://FoCuS",
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
      "forge://today:000",
      "forge://today?query=value",
      "forge://today?",
      "forge://today?%71=%76",
      "forge://today#fragment",
      "forge://today#",
      "forge://today#%66",
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
      "forge://today/.",
      "forge://today/%2e",
      "forge://today//",
      "forge://today/extra",
      "forge://today/extra/",
    ]
  )
  func rejectsNoncanonicalOrHostileURLs(value: String) throws {
    let url = try #require(URL(string: value))
    #expect(ForgeDeepLink.destination(for: url) == nil)
  }
}
