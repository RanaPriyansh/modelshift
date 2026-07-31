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
}
