import SwiftUI

struct EntryFlowView: View {
    @State private var goal = ""
    @State private var clarification = ""
    let onComplete: () -> Void

    var body: some View {
        NavigationStack {
            GoalEntryView(goal: $goal)
                .navigationDestination(for: EntryStep.self) { step in
                    switch step {
                    case .clarify:
                        ClarifyGoalView(
                            goal: goal,
                            clarification: $clarification
                        )
                    case .preview:
                        PathPreviewView(
                            goal: goal,
                            clarification: clarification,
                            onAccept: onComplete
                        )
                    }
                }
        }
    }
}

private enum EntryStep: Hashable {
    case clarify
    case preview
}

private struct GoalEntryView: View {
    @Binding var goal: String
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    var body: some View {
        ZStack(alignment: .bottom) {
            Image("Terrain")
                .resizable()
                .scaledToFill()
                .ignoresSafeArea()
                .accessibilityHidden(true)

            if reduceTransparency {
                ForgeTerrainColor.backgroundDeep
                    .ignoresSafeArea()
            } else {
                LinearGradient(
                    colors: [.clear, ForgeTerrainColor.background.opacity(0.94)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                .accessibilityHidden(true)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: ForgeSpacing.standard) {
                    Text("FORGE")
                        .font(.caption.weight(.bold))
                        .tracking(2)
                        .foregroundStyle(.white.opacity(0.88))

                    Text("What do you want to become able to do?")
                        .font(.largeTitle.bold())
                        .tracking(-0.8)
                        .foregroundStyle(.white)
                        .fixedSize(horizontal: false, vertical: true)

                    Text("Your goal stays local until you accept a path.")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.82))

                    TextField(
                        "I want to understand or do...",
                        text: $goal,
                        axis: .vertical
                    )
                    .textFieldStyle(.plain)
                    .lineLimit(nil)
                    .padding(ForgeSpacing.standard)
                    .background(
                        reduceTransparency ? Color.black : Color.black.opacity(0.35),
                        in: RoundedRectangle(cornerRadius: 12)
                    )
                    .overlay {
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(.white.opacity(0.45), lineWidth: 1)
                    }
                    .foregroundStyle(.white)
                    .accessibilityLabel("Learning goal")

                    NavigationLink(value: EntryStep.clarify) {
                        Text("Clarify this goal")
                    }
                    .buttonStyle(ForgePrimaryButtonStyle())
                    .accessibilityIdentifier("ios.IOS-01.primary")
                    .disabled(goal.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .opacity(goal.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.6 : 1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(ForgeSpacing.standard)
            }
            .scrollIndicators(.hidden)
            .safeAreaPadding(.bottom, ForgeSpacing.standard)
        }
        .toolbar(.hidden, for: .navigationBar)
        .accessibilityIdentifier("IOS-01")
    }
}

private struct ClarifyGoalView: View {
    let goal: String
    @Binding var clarification: String

    var body: some View {
        ForgePage(screenID: "IOS-02") {
            ForgeScreenHeader(
                "One useful question",
                title: "What should you become able to do?",
                detail: goal
            )

            TextField(
                "Explain the method and use it in a new case.",
                text: $clarification,
                axis: .vertical
            )
            .lineLimit(nil)
            .padding(ForgeSpacing.standard)
            .background(ForgeTerrainColor.surface, in: RoundedRectangle(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(.separator, lineWidth: 1)
            }
            .accessibilityLabel("Clarified outcome")
            .lineLimit(nil)

            NavigationLink(value: EntryStep.preview) {
                Text("Continue")
            }
            .buttonStyle(ForgePrimaryButtonStyle())
            .accessibilityIdentifier("ios.IOS-02.primary")
            .disabled(
                clarification.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            )
        }
        .navigationTitle("Clarify goal")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct PathPreviewView: View {
    let goal: String
    let clarification: String
    let onAccept: () -> Void

    var body: some View {
        ForgePage(screenID: "IOS-03") {
            ForgeScreenHeader(
                "Proposed path",
                title: "Use AI without outsourcing judgment.",
                detail: "Review each boundary before you accept this sample path."
            )

            ForgeCard {
                LabeledContent("Goal", value: goal)
                LabeledContent("Outcome", value: clarification)
                LabeledContent("Source state", value: "Reviewed sample")
                LabeledContent("First action", value: "Compare support and contradiction")
            }

            Button("Accept this path", action: onAccept)
                .buttonStyle(ForgePrimaryButtonStyle())
                .accessibilityIdentifier("ios.IOS-03.primary")

            Text("You can revise, reject, or save the draft before acceptance.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .navigationTitle("Path preview")
        .navigationBarTitleDisplayMode(.inline)
    }
}
