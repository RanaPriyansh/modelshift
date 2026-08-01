import SwiftUI

struct LibraryView: View {
    private let sources = [
        ForgeRowModel(
            id: "guide",
            title: "Source evaluation guide",
            detail: "Reviewed teaching reference.",
            state: "Reviewed"
        ),
        ForgeRowModel(
            id: "archive",
            title: "Primary source archive",
            detail: "External source collection.",
            state: "External"
        ),
        ForgeRowModel(
            id: "ai-checklist",
            title: "AI literacy checklist",
            detail: "Fallback copy available.",
            state: "Fallback"
        ),
    ]

    var body: some View {
        List(sources) { source in
            ForgeRow(model: source)
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Library")
        .accessibilityIdentifier("IOS-17")
    }
}

struct SettingsDataView: View {
    @AppStorage("forge.appearance") private var appearance = ForgeAppearance.system.rawValue
    @AppStorage("forge.haptics") private var hapticsEnabled = true
    @Environment(\.forgeRestartEntry) private var restartEntry
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.accessibilityDifferentiateWithoutColor) private var differentiateWithoutColor
    @State private var showDeleteConfirmation = false
    @State private var localDataState = ForgeOperationState.ready

    var body: some View {
        Form {
            Section("Appearance") {
                Picker("Theme", selection: $appearance) {
                    ForEach(ForgeAppearance.allCases) { option in
                        Text(option.title).tag(option.rawValue)
                    }
                }

                Toggle("Haptics", isOn: $hapticsEnabled)
                LabeledContent("Reduce Motion", value: reduceMotion ? "On" : "Off")
                LabeledContent("Reduce Transparency", value: reduceTransparency ? "On" : "Off")
                LabeledContent("Differentiate Without Color", value: differentiateWithoutColor ? "On" : "Off")
            }

            Section("Resources") {
                NavigationLink(value: ForgeRoute.library) {
                    Label("Reviewed source library", systemImage: "books.vertical")
                }
            }

            Section("Local data") {
                Button("Restart goal entry", action: restartEntry)
                    .accessibilityIdentifier("ios.IOS-18.secondary")
                Button("Export local sample") {
                    localDataState = .exportReady
                }
                .accessibilityIdentifier("ios.IOS-18.secondary")
                Button("Delete local sample", role: .destructive) {
                    showDeleteConfirmation = true
                }
                .accessibilityIdentifier("ios.IOS-18.primary")
                ForgeOperationStatus(state: localDataState)
            }

            Section {
                Text("This reference application stores no account record and creates no canonical evidence.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Settings and data")
        .accessibilityIdentifier("IOS-18")
        .alert("Delete the local sample?", isPresented: $showDeleteConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                localDataState = .deleted
            }
        } message: {
            Text("This action cannot be undone.")
        }
    }
}

#Preview("Settings") {
    NavigationStack {
        SettingsDataView()
            .forgeRoutes()
    }
}
