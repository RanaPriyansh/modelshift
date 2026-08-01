import SwiftUI

@main
struct FORGETerrainApp: App {
    var body: some Scene {
        WindowGroup {
            ForgeRootView()
        }
    }
}

struct ForgeRootView: View {
    @AppStorage("forge.entry.complete") private var entryComplete = false
    @AppStorage("forge.appearance") private var appearance = ForgeAppearance.system.rawValue

    var body: some View {
        Group {
            if entryComplete {
                ForgeTabShell {
                    entryComplete = false
                }
            } else {
                EntryFlowView {
                    entryComplete = true
                }
            }
        }
        .tint(.forgeOrange)
        .preferredColorScheme(ForgeAppearance(rawValue: appearance)?.colorScheme)
    }
}

#Preview("First use") {
    EntryFlowView(onComplete: {})
}

#Preview("Today") {
    ForgeTabShell(onRestartEntry: {})
}
