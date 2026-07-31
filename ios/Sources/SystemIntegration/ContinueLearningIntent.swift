import AppIntents
import ForgeCore

struct ContinueLearningIntent: AppIntent {
    static let title: LocalizedStringResource = "Continue Learning"
    static let description = IntentDescription(
        "Open FORGE to continue learning."
    )

    @available(iOS, introduced: 16.0, obsoleted: 26.0)
    static var openAppWhenRun: Bool { true }

    @available(iOS 26.0, *)
    static var supportedModes: IntentModes {
        [.foreground(.deferred)]
    }

    func perform() async throws -> some IntentResult {
        ForgeSharedStateStore().setPendingDestination(.focus)
        return .result()
    }
}

struct ForgeAppShortcutsProvider: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ContinueLearningIntent(),
            phrases: [
                "Continue learning in \(.applicationName)",
            ],
            shortTitle: "Continue Learning",
            systemImageName: "book.pages"
        )
    }
}
