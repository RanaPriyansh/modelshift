import SwiftUI

struct TodayView: View {
    var body: some View {
        ForgePage(screenID: "IOS-04") {
            ForgeScreenHeader(
                "My next action",
                title: "Verify a claim before you use it.",
                detail: "One action is ready. One protected return is due later."
            )

            ForgeCard {
                ForgeStatus(label: "Ready now", color: .forgeAI)
                Text("Compare support and contradiction.")
                    .font(.title2.bold())
                Text("Use two reviewed sources. Record the condition that could change your conclusion.")
                    .foregroundStyle(.secondary)
                NavigationLink(value: ForgeRoute.actionBrief) {
                    Text("Open action brief")
                }
                .buttonStyle(ForgePrimaryButtonStyle())
            }

            NavigationLink(value: ForgeRoute.returnQueue) {
                ForgeCard {
                    ForgeStatus(label: "Due tomorrow", color: .forgeOrange)
                    Text("Can you use the distinction without the lesson?")
                        .font(.headline)
                    Text("About 8 minutes. No instructional help.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: ForgeSpacing.standard) {
                Text("Useful alternatives")
                    .font(.headline)
                ForEach(ForgeSamples.paths.dropFirst()) { path in
                    ForgeRow(model: path)
                }
            }
        }
        .navigationTitle("Today")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink(value: ForgeRoute.settings) {
                    Image(systemName: "gearshape")
                }
                .accessibilityLabel("Settings and data")
            }
        }
    }
}

struct PathCollectionView: View {
    var body: some View {
        List {
            Section {
                ForEach(ForgeSamples.paths) { path in
                    NavigationLink(value: ForgeRoute.pathDetail) {
                        ForgeRow(model: path)
                    }
                }
            } header: {
                Text("Accepted sequences")
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Paths")
        .accessibilityIdentifier("IOS-05")
    }
}

struct PathDetailView: View {
    var body: some View {
        ForgePage(screenID: "IOS-06") {
            ForgeScreenHeader(
                "Path detail",
                title: "Use AI without outsourcing judgment.",
                detail: "The path begins with your goal and keeps each limitation visible."
            )

            ForgeCard {
                LabeledContent("Current milestone", value: "Compare sources")
                LabeledContent("Source state", value: "Reviewed")
                LabeledContent("Next action", value: "Action brief")
                LabeledContent("Known limit", value: "One claim remains untested")
            }

            NavigationLink(value: ForgeRoute.actionBrief) {
                Text("Start next action")
            }
            .buttonStyle(ForgePrimaryButtonStyle())
        }
        .navigationTitle("Path")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ProjectCollectionView: View {
    var body: some View {
        List(ForgeSamples.projects) { project in
            NavigationLink(value: ForgeRoute.projectWorkspace) {
                ForgeRow(model: project)
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Projects")
        .accessibilityIdentifier("IOS-15")
    }
}

struct ProjectWorkspaceView: View {
    @State private var revision = ""

    var body: some View {
        ForgePage(screenID: "IOS-16") {
            ForgeScreenHeader(
                "Current operation",
                title: "Revise the decision language.",
                detail: "Keep claims inside the reviewed source boundary."
            )

            ForgeCard {
                ForgeStatus(label: "Critique")
                Text("The memo states a universal result. The source supports one tested condition.")
                    .font(.headline)
            }

            TextField("Write the bounded revision.", text: $revision, axis: .vertical)
                .lineLimit(4...8)
                .padding(ForgeSpacing.standard)
                .background(.background.secondary, in: RoundedRectangle(cornerRadius: 12))

            Button("Save revision") {}
                .buttonStyle(ForgePrimaryButtonStyle())
        }
        .navigationTitle("Verification memo")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct EvidenceCollectionView: View {
    var body: some View {
        List(ForgeSamples.evidence) { evidence in
            NavigationLink(value: ForgeRoute.evidenceDetail) {
                ForgeRow(model: evidence)
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Evidence")
        .accessibilityIdentifier("IOS-11")
    }
}

struct EvidenceDetailView: View {
    var body: some View {
        ForgePage(screenID: "IOS-12") {
            ForgeScreenHeader(
                "Bounded record",
                title: "Distinguished a claim from its source.",
                detail: "The record states what happened and what remains unknown."
            )

            ForgeCard {
                LabeledContent("Claim", value: "Source text does not equal tested evidence")
                LabeledContent("Scope", value: "One reviewed comparison")
                LabeledContent("Source receipt", value: "Available")
                LabeledContent("Limit", value: "No independent transfer claim")
            }

            Button("Inspect source") {}
                .buttonStyle(ForgePrimaryButtonStyle())
        }
        .navigationTitle("Evidence detail")
        .navigationBarTitleDisplayMode(.inline)
    }
}
