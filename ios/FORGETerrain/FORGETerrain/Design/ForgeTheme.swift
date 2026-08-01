import SwiftUI
import UIKit

enum ForgeAppearance: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: "System"
        case .light: "Light"
        case .dark: "Dark"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}

enum ForgeTerrainColor {
    static let background = adaptive(light: 0xF4F7F1, dark: 0x071722)
    static let backgroundDeep = adaptive(light: 0xEEF3ED, dark: 0x06131D)
    static let surface = adaptive(light: 0xFBFDF8, dark: 0x0D202B)
    static let surfaceStrong = adaptive(light: 0xE4EBE4, dark: 0x142A35)
    static let border = adaptive(light: 0xCDD9D0, dark: 0x29414B)
    static let borderStrong = adaptive(light: 0x98AA9E, dark: 0x44606A)
    static let text = adaptive(light: 0x102019, dark: 0xF3F7F0)
    static let textMuted = adaptive(light: 0x56645D, dark: 0xA8B9B1)
    static let textDim = adaptive(light: 0x66746C, dark: 0x82958B)
    static let learnerAction = adaptive(light: 0xF0643B, dark: 0xFF8059)
    static let learnerActionStrong = adaptive(light: 0xA93C20, dark: 0xFF9B7B)
    static let onLearnerAction = adaptive(light: 0x102019, dark: 0x071722)
    static let aiContribution = adaptive(light: 0x2F66D8, dark: 0x85AAFF)
    static let aiContributionStrong = adaptive(light: 0x174EAE, dark: 0x6F96EE)
    static let testedEvidence = adaptive(light: 0x247A53, dark: 0x79C995)
    static let testedEvidenceStrong = adaptive(light: 0x185F43, dark: 0x67BD84)
    static let focus = adaptive(light: 0x145BD7, dark: 0x8FB0FF)

    private static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            let value = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(
                red: CGFloat((value >> 16) & 0xFF) / 255,
                green: CGFloat((value >> 8) & 0xFF) / 255,
                blue: CGFloat(value & 0xFF) / 255,
                alpha: 1
            )
        })
    }
}

enum ForgeSpacing {
    static let compact: CGFloat = 8
    static let standard: CGFloat = 16
    static let section: CGFloat = 24
    static let generous: CGFloat = 32
}
