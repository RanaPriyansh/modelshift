import SwiftUI
import UIKit

enum ForgeDesign {
  enum Spacing {
    static let tight: CGFloat = 6
    static let small: CGFloat = 10
    static let regular: CGFloat = 16
    static let large: CGFloat = 24
    static let section: CGFloat = 32
  }

  enum Radius {
    static let inset: CGFloat = 14
    static let card: CGFloat = 22
  }

  enum Layout {
    static let contentMaxWidth: CGFloat = 720
  }

  static let canvas = Color(uiColor: .systemGroupedBackground)
  static let surface = Color(uiColor: .secondarySystemGroupedBackground)
  static let raisedSurface = Color(uiColor: .systemBackground)
  static let hairline = Color(uiColor: .separator).opacity(0.32)
  static let accentWash = Color.accentColor.opacity(0.12)
  static let secondaryText = Color.primary.opacity(0.72)
  static let primaryActionForeground = Color(
    uiColor: UIColor { traits in
      traits.userInterfaceStyle == .dark ? .black : .white
    }
  )
  static let secondaryActionForeground = Color(
    uiColor: UIColor { traits in
      traits.userInterfaceStyle == .dark ? .white : .black
    }
  )
  static let tabSelection = Color(
    uiColor: UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(red: 0.88, green: 0.70, blue: 0.23, alpha: 1)
        : .black
    }
  )
  static let successText = Color(
    uiColor: UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(red: 0.38, green: 0.84, blue: 0.48, alpha: 1)
        : UIColor(red: 0.08, green: 0.42, blue: 0.18, alpha: 1)
    }
  )
  static let warningText = Color(
    uiColor: UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(red: 1, green: 0.70, blue: 0.25, alpha: 1)
        : UIColor(red: 0.48, green: 0.26, blue: 0, alpha: 1)
    }
  )
}

struct ForgeSecondaryButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .foregroundStyle(ForgeDesign.secondaryActionForeground)
      .padding(.horizontal, ForgeDesign.Spacing.regular)
      .frame(maxWidth: .infinity, minHeight: 48)
      .contentShape(Rectangle())
      .opacity(configuration.isPressed ? 0.62 : 1)
  }
}
