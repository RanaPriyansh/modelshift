import AppIntents
import ForgeCore
import Foundation

extension Notification.Name {
  static let forgePendingDestinationDidChange = Notification.Name(
    "com.forgelearning.pending-destination-did-change"
  )
}

struct ContinueLearningIntent: AppIntent {
  static let title: LocalizedStringResource = "Open Today in FORGE"
  static let description = IntentDescription(
    "Open the FORGE Today view."
  )

  @available(iOS, introduced: 16.0, obsoleted: 26.0)
  static var openAppWhenRun: Bool { true }

  @available(iOS 26.0, *)
  static var supportedModes: IntentModes {
    [.foreground(.deferred)]
  }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    try ForgeSharedStateStore().setPendingDestination(.today)
    NotificationCenter.default.post(name: .forgePendingDestinationDidChange, object: nil)
    return .result(dialog: "Opening Today.")
  }
}

struct ForgeAppShortcutsProvider: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: ContinueLearningIntent(),
      phrases: [
        "Open Today in \(.applicationName)"
      ],
      shortTitle: "Open Today",
      systemImageName: "sun.max"
    )
  }
}
