import SwiftUI

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

extension Color {
    static let forgeCobalt = Color(red: 17 / 255, green: 79 / 255, blue: 207 / 255)
    static let forgeAlpine = Color(red: 23 / 255, green: 100 / 255, blue: 60 / 255)
    static let forgeOrange = Color(red: 240 / 255, green: 100 / 255, blue: 59 / 255)
    static let forgeMidnight = Color(red: 7 / 255, green: 23 / 255, blue: 34 / 255)
    static let forgeEvidence = Color(red: 44 / 255, green: 138 / 255, blue: 97 / 255)
    static let forgeAI = Color(red: 47 / 255, green: 102 / 255, blue: 216 / 255)
    static let forgeIvory = Color(red: 244 / 255, green: 247 / 255, blue: 241 / 255)
}

enum ForgeSpacing {
    static let compact: CGFloat = 8
    static let standard: CGFloat = 16
    static let section: CGFloat = 24
    static let generous: CGFloat = 32
}
