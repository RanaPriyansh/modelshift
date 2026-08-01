import SwiftUI

struct ForgeScreenHeader: View {
    let context: String
    let title: String
    let detail: String?

    init(_ context: String, title: String, detail: String? = nil) {
        self.context = context
        self.title = title
        self.detail = detail
    }

    var body: some View {
        VStack(alignment: .leading, spacing: ForgeSpacing.compact) {
            Text(context.uppercased())
                .font(.caption.weight(.semibold))
                .tracking(1.2)
                .foregroundStyle(ForgeTerrainColor.testedEvidence)

            Text(title)
                .font(.largeTitle.bold())
                .tracking(-0.8)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)

            if let detail {
                Text(detail)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

struct ForgeCard<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: ForgeSpacing.standard) {
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(ForgeSpacing.standard)
        .background(ForgeTerrainColor.surface, in: RoundedRectangle(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .stroke(ForgeTerrainColor.border, lineWidth: 1)
        }
    }
}

struct ForgeStatus: View {
    let label: String
    var color: Color = ForgeTerrainColor.testedEvidence
    @Environment(\.accessibilityDifferentiateWithoutColor) private var differentiateWithoutColor
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    var body: some View {
        Label {
            Text(label)
        } icon: {
            Image(systemName: differentiateWithoutColor ? "diamond.fill" : "circle.fill")
                .accessibilityHidden(true)
        }
        .font(.caption.weight(.semibold))
        .foregroundStyle(color)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            reduceTransparency ? ForgeTerrainColor.surfaceStrong : color.opacity(0.11),
            in: Capsule()
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label) status")
    }
}

struct ForgePrimaryButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 52)
            .foregroundStyle(ForgeTerrainColor.onLearnerAction)
            .background(
                reduceTransparency
                    ? ForgeTerrainColor.learnerAction
                    : (configuration.isPressed
                        ? ForgeTerrainColor.learnerAction.opacity(0.82)
                        : ForgeTerrainColor.learnerAction),
                in: RoundedRectangle(cornerRadius: 12)
            )
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.985 : 1)
    }
}

struct ForgePage<Content: View>: View {
    let screenID: String
    @ViewBuilder let content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: ForgeSpacing.section) {
                content
            }
            .frame(maxWidth: 680, alignment: .leading)
            .padding(.horizontal, ForgeSpacing.standard)
            .padding(.top, ForgeSpacing.standard)
            .padding(.bottom, 48)
            .frame(maxWidth: .infinity)
        }
        .background(ForgeTerrainColor.background)
        .foregroundStyle(ForgeTerrainColor.text)
        .safeAreaPadding(.bottom, ForgeSpacing.standard)
        .accessibilityIdentifier(screenID)
    }
}

struct ForgeRow: View {
    let model: ForgeRowModel
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    private var stacksAtAccessibilitySize: Bool {
        switch dynamicTypeSize {
        case .accessibility1, .accessibility2, .accessibility3, .accessibility4, .accessibility5:
            true
        default:
            false
        }
    }

    @ViewBuilder
    private var rowText: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(model.title)
                .font(.headline)
            Text(model.detail)
                .font(.subheadline)
                .foregroundStyle(ForgeTerrainColor.textMuted)
        }
    }

    var body: some View {
        Group {
            if stacksAtAccessibilitySize {
                VStack(alignment: .leading, spacing: ForgeSpacing.compact) {
                    rowText
                    ForgeStatus(label: model.state)
                }
            } else {
                HStack(alignment: .top, spacing: ForgeSpacing.standard) {
                    rowText
                    Spacer(minLength: ForgeSpacing.compact)
                    ForgeStatus(label: model.state)
                }
            }
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(model.title). \(model.state). \(model.detail)")
    }
}

struct ForgeOperationStatus: View {
    let state: ForgeOperationState

    var body: some View {
        Label(state.label, systemImage: state.symbolName)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(state.color)
            .accessibilityElement(children: .combine)
    }
}

struct ForgeRouteModifier: ViewModifier {
    func body(content: Content) -> some View {
        content.navigationDestination(for: ForgeRoute.self) { route in
            switch route {
            case .actionBrief: ActionBriefView()
            case .attempt: AttemptView()
            case .repair: RepairView()
            case .proof: ProtectedProofView()
            case .pathDetail: PathDetailView()
            case .evidenceDetail: EvidenceDetailView()
            case .returnQueue: ReturnQueueView()
            case .protectedReturn: ProtectedReturnView()
            case .projectWorkspace: ProjectWorkspaceView()
            case .library: LibraryView()
            case .settings: SettingsDataView()
            }
        }
    }
}

extension View {
    func forgeRoutes() -> some View {
        modifier(ForgeRouteModifier())
    }
}
