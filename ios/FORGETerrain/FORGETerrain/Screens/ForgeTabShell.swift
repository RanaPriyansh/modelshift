import SwiftUI

struct ForgeTabShell: View {
    @State private var selectedTab: ForgeTab = .today
    let onRestartEntry: () -> Void

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                TodayView()
                    .forgeRoutes()
            }
            .tabItem { Label("Today", systemImage: "sun.max") }
            .tag(ForgeTab.today)

            NavigationStack {
                PathCollectionView()
                    .forgeRoutes()
            }
            .tabItem { Label("Paths", systemImage: "point.topleft.down.to.point.bottomright.curvepath") }
            .tag(ForgeTab.paths)

            NavigationStack {
                ProjectCollectionView()
                    .forgeRoutes()
            }
            .tabItem { Label("Projects", systemImage: "folder") }
            .tag(ForgeTab.projects)

            NavigationStack {
                EvidenceCollectionView()
                    .forgeRoutes()
            }
            .tabItem { Label("Evidence", systemImage: "checkmark.seal") }
            .tag(ForgeTab.evidence)
        }
        .environment(\.forgeRestartEntry, onRestartEntry)
    }
}

private struct ForgeRestartEntryKey: EnvironmentKey {
    static let defaultValue: () -> Void = {}
}

extension EnvironmentValues {
    var forgeRestartEntry: () -> Void {
        get { self[ForgeRestartEntryKey.self] }
        set { self[ForgeRestartEntryKey.self] = newValue }
    }
}
