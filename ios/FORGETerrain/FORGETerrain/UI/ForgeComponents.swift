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
                .foregroundStyle(Color.forgeEvidence)

            Text(title)
                .font(.largeTitle.bold())
                .tracking(-0.8)
                .fixedSize(horizontal: false, vertical: true)

            if let detail {
                Text(detail)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
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
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .stroke(.separator.opacity(0.7), lineWidth: 1)
        }
    }
}

struct ForgeStatus: View {
    let label: String
    var color: Color = .forgeEvidence

    var body: some View {
        Text(label)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(color.opacity(0.11), in: Capsule())
    }
}

struct ForgePrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 52)
            .foregroundStyle(.white)
            .background(
                configuration.isPressed ? Color.forgeOrange.opacity(0.82) : .forgeOrange,
                in: RoundedRectangle(cornerRadius: 12)
            )
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
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
        .background(Color(uiColor: .systemBackground))
        .accessibilityIdentifier(screenID)
    }
}

struct ForgeRow: View {
    let model: ForgeRowModel

    var body: some View {
        HStack(alignment: .top, spacing: ForgeSpacing.standard) {
            VStack(alignment: .leading, spacing: 5) {
                Text(model.title)
                    .font(.headline)
                Text(model.detail)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: ForgeSpacing.compact)
            ForgeStatus(label: model.state)
        }
        .contentShape(Rectangle())
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
            case .protectedProof: ProtectedProofView()
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
