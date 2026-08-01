import AppIntents
import ForgeCore

struct ContinueLearningIntent: AppIntent {
  static let title: LocalizedStringResource = "Continue Learning"
  static let description = IntentDescription(
    "Open the FORGE focus preview."
  )

  @available(iOS, introduced: 16.0, obsoleted: 26.0)
  static var openAppWhenRun: Bool { true }

  @available(iOS 26.0, *)
  static var supportedModes: IntentModes {
    [.foreground(.deferred)]
  }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    ForgeSharedStateStore().setPendingDestination(.focus)
    return .result(dialog: "Opening the FORGE focus preview.")
  }
}

struct ForgeAppShortcutsProvider: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: ContinueLearningIntent(),
      phrases: [
        "Continue learning in \(.applicationName)"
      ],
      shortTitle: "Continue Learning",
      systemImageName: "book.pages"
    )
  }
}
