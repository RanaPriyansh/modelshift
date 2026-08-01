import Foundation
import Testing
@testable import ForgeCore

struct SharedStateResetTests {
  @Test
  func clearAllRemovesAppOwnedPreferenceAndPreservesUnrelatedDefaults() throws {
    let suiteName = "ForgeCoreTests.SharedStateReset.\(UUID().uuidString)"
    let defaults = try #require(UserDefaults(suiteName: suiteName))
    defer { defaults.removePersistentDomain(forName: suiteName) }

    let store = ForgeSharedStateStore(defaults: defaults)
    defaults.set(true, forKey: "forge.grown-up-manages-reminders.v1")
    defaults.set("preserve", forKey: "unrelated")

    store.clearAll()

    #expect(defaults.object(forKey: "forge.grown-up-manages-reminders.v1") == nil)
    #expect(defaults.string(forKey: "unrelated") == "preserve")
  }
}
