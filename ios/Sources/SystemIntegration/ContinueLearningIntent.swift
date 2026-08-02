import AppIntents
import ForgeCore
import Foundation

extension Notification.Name {
  static let forgePendingFocusDidChange = Notification.Name(
    "com.forgelearning.pending-focus-did-change"
  )
}

struct ContinueLearningIntent: AppIntent {
  static let title: LocalizedStringResource = "Open local course activity"
  static let description = IntentDescription(
    "Open a local FORGE course activity."
  )

  @available(iOS, introduced: 16.0, obsoleted: 26.0)
  static var openAppWhenRun: Bool { true }

  @available(iOS 26.0, *)
  static var supportedModes: IntentModes {
    [.foreground(.deferred)]
  }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    try ForgeSharedStateStore().setPendingFocus()
    NotificationCenter.default.post(name: .forgePendingFocusDidChange, object: nil)
    return .result(dialog: "Opening FORGE.")
  }
}

struct ForgeAppShortcutsProvider: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: ContinueLearningIntent(),
      phrases: [
        "Open local course activity in \(.applicationName)"
      ],
      shortTitle: "Open local course",
      systemImageName: "graduationcap"
    )
  }
}
