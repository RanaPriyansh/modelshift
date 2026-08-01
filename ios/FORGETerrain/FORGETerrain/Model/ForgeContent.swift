import SwiftUI

enum ForgeTab: Hashable {
    case today
    case paths
    case projects
    case evidence
}

enum ForgeRoute: Hashable {
    case actionBrief
    case attempt
    case repair
    case protectedProof
    case pathDetail
    case evidenceDetail
    case returnQueue
    case protectedReturn
    case projectWorkspace
    case library
    case settings
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
