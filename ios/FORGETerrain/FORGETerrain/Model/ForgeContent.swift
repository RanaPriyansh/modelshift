import SwiftUI

enum ForgeTab: Hashable {
    case today
    case paths
    case projects
    case evidence
}

enum ForgeRoute: Hashable {
    case actionBrief(id: String)
    case attempt(id: String)
    case repair(id: String)
    case proof(id: String)
    case pathDetail(id: String)
    case evidenceDetail(id: String)
    case returnQueue
    case protectedReturn(id: String)
    case projectWorkspace(id: String)
    case library
    case settings
}

enum ForgeOperationState: Equatable {
    case ready
    case saving
    case saved
    case submitted
    case exportReady
    case deleted
    case failed(String)

    var label: String {
        switch self {
        case .ready: "Ready"
        case .saving: "Saving locally"
        case .saved: "Saved on this device"
        case .submitted: "Submitted locally"
        case .exportReady: "Export ready"
        case .deleted: "Local sample deleted"
        case .failed(let message): message
        }
    }

    var symbolName: String {
        switch self {
        case .ready: "pencil.line"
        case .saving: "arrow.triangle.2.circlepath"
        case .saved: "checkmark.circle"
        case .submitted: "checkmark.seal"
        case .exportReady: "square.and.arrow.up"
        case .deleted: "trash"
        case .failed: "exclamationmark.triangle"
        }
    }

    var color: Color {
        switch self {
        case .failed: ForgeTerrainColor.learnerActionStrong
        case .submitted, .saved, .exportReady: ForgeTerrainColor.testedEvidence
        case .deleted: ForgeTerrainColor.textMuted
        case .saving: ForgeTerrainColor.aiContribution
        case .ready: ForgeTerrainColor.textMuted
        }
    }
}

struct ForgeRowModel: Identifiable, Hashable {
    let id: String
    let title: String
    let detail: String
    let state: String
}

enum ForgeSamples {
    static let paths = [
        ForgeRowModel(
            id: "support-contradiction",
            title: "Compare support and contradiction",
            detail: "Next: inspect two reviewed sources.",
            state: "Active"
        ),
        ForgeRowModel(
            id: "primary-sources",
            title: "Reason from primary sources",
            detail: "Saved before the first attempt.",
            state: "Saved"
        ),
        ForgeRowModel(
            id: "models",
            title: "Understand force models",
            detail: "Independent proof accepted.",
            state: "Complete"
        ),
    ]

    static let evidence = [
        ForgeRowModel(
            id: "claim-source",
            title: "Distinguished a claim from its source",
            detail: "One first-party source receipt.",
            state: "Tested"
        ),
        ForgeRowModel(
            id: "corroboration",
            title: "Compared support and contradiction",
            detail: "Conditions remain visible.",
            state: "Bounded"
        ),
        ForgeRowModel(
            id: "model-limit",
            title: "Found a model limit",
            detail: "A later return is due.",
            state: "Return due"
        ),
    ]

    static let projects = [
        ForgeRowModel(
            id: "verification-memo",
            title: "Verification memo",
            detail: "Revise the decision language.",
            state: "Critique"
        ),
        ForgeRowModel(
            id: "source-map",
            title: "Source relationship map",
            detail: "Add one contradiction.",
            state: "Active"
        ),
        ForgeRowModel(
            id: "force-model",
            title: "Force model",
            detail: "Closed after independent defence.",
            state: "Closed"
        ),
    ]
}
