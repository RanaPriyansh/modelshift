import SwiftUI
import UIKit

enum ForgeDesign {
  enum Spacing {
    static let tight: CGFloat = 6
    static let small: CGFloat = 10
    static let regular: CGFloat = 16
    static let large: CGFloat = 24
    static let section: CGFloat = 24
  }

  enum Radius {
    static let inset: CGFloat = 12
    static let card: CGFloat = 16
  }

  enum Layout {
    static let contentMaxWidth: CGFloat = 720
  }

  static let canvas = adaptiveColor(
    light: 0xF4F7F1,
    dark: 0x071722,
    lightHighContrast: 0xFBFDF8,
    darkHighContrast: 0x06131D
  )
  static let deepCanvas = adaptiveColor(
    light: 0xEEF3ED,
    dark: 0x06131D,
    lightHighContrast: 0xE4EBE4,
    darkHighContrast: 0x000F17
  )
  static let surface = adaptiveColor(
    light: 0xFBFDF8,
    dark: 0x0D202B,
    lightHighContrast: 0xFFFFFF,
    darkHighContrast: 0x0D202B
  )
  static let strongSurface = adaptiveColor(
    light: 0xE4EBE4,
    dark: 0x142A35,
    lightHighContrast: 0xE4EBE4,
    darkHighContrast: 0x142A35
  )
  static let boundary = adaptiveColor(
    light: 0xCDD9D0,
    dark: 0x29414B,
    lightHighContrast: 0x56645D,
    darkHighContrast: 0xA8B9B1
  )
  static let strongBoundary = adaptiveColor(
    light: 0x98AA9E,
    dark: 0x44606A,
    lightHighContrast: 0x34423B,
    darkHighContrast: 0xD5E1DA
  )
  static let text = adaptiveColor(
    light: 0x102019,
    dark: 0xF3F7F0,
    lightHighContrast: 0x102019,
    darkHighContrast: 0xFFFFFF
  )
  static let mutedText = adaptiveColor(
    light: 0x56645D,
    dark: 0xA8B9B1,
    lightHighContrast: 0x34423B,
    darkHighContrast: 0xD5E1DA
  )
  static let dimText = adaptiveColor(
    light: 0x66746C,
    dark: 0x82958B,
    lightHighContrast: 0x34423B,
    darkHighContrast: 0xD5E1DA
  )
  static let disclosedAI = adaptiveColor(
    light: 0x2F66D8,
    dark: 0x85AAFF,
    lightHighContrast: 0x174EAE,
    darkHighContrast: 0x8FB0FF
  )
  static let checkedEvidence = adaptiveColor(
    light: 0x247A53,
    dark: 0x79C995,
    lightHighContrast: 0x185F43,
    darkHighContrast: 0x79C995
  )
  static let checkedEvidenceSurface = adaptiveColor(
    light: 0xE5F1EA,
    dark: 0x15372A,
    lightHighContrast: 0xE0F2E7,
    darkHighContrast: 0x173B2D
  )
  static let focus = adaptiveColor(
    light: 0x145BD7,
    dark: 0x8FB0FF,
    lightHighContrast: 0x174EAE,
    darkHighContrast: 0xA9C2FF
  )

  struct TextRole {
    let font: Font
    let foreground: Color
  }

  enum Text {
    static let screenTitle = TextRole(
      font: .largeTitle.weight(.bold),
      foreground: ForgeDesign.text
    )
    static let taskTitle = TextRole(
      font: .title2.weight(.semibold),
      foreground: ForgeDesign.text
    )
    static let sectionLabel = TextRole(
      font: .headline.weight(.semibold),
      foreground: ForgeDesign.text
    )
    static let metadata = TextRole(
      font: .subheadline,
      foreground: ForgeDesign.mutedText
    )
    static let metadataValue = TextRole(
      font: .subheadline.weight(.medium),
      foreground: ForgeDesign.text
    )
    static let supportingCopy = TextRole(
      font: .subheadline,
      foreground: ForgeDesign.mutedText
    )
  }

  enum Action {
    static let commitment = ForgeDesign.adaptiveColor(
      light: 0xF0643B,
      dark: 0xFF8059,
      lightHighContrast: 0xFF8059,
      darkHighContrast: 0xFF9B7B
    )
    static let commitmentSurface = ForgeDesign.adaptiveColor(
      light: 0xFDE7DE,
      dark: 0x3A211B,
      lightHighContrast: 0xFFE3D8,
      darkHighContrast: 0x44231C
    )
    static let commitmentForeground = ForgeDesign.adaptiveColor(
      light: 0x102019,
      dark: 0x071722,
      lightHighContrast: 0x102019,
      darkHighContrast: 0x071722
    )
  }

  enum StatusColor {
    static let commitment = Action.commitment
    static let commitmentSurface = Action.commitmentSurface
    static let caution = ForgeDesign.text
    static let cautionSurface = ForgeDesign.strongSurface
    static let recorded = ForgeDesign.checkedEvidence
    static let recordedSurface = ForgeDesign.checkedEvidenceSurface
    static let failure = ForgeDesign.text
    static let failureSurface = ForgeDesign.strongSurface
    static let information = ForgeDesign.mutedText
    static let informationSurface = ForgeDesign.surface
  }

  // Existing source aliases retain current feature call sites while semantic roles move into those views.
  static let hairline = boundary
  static let accentWash = strongSurface
  static let secondaryText = mutedText
  static let primaryActionForeground = Action.commitmentForeground
  static let secondaryActionForeground = text
  static let tabSelection = text
  static let successText = checkedEvidence
  static let warningText = text
  static let raisedSurface = surface
  static let universitySurface = surface
  static let universitySurfaceOpaque = surface
  static let universitySurfaceBorder = boundary

  static let navigationCommitment = Action.commitment
  static let navigationCommitmentSurface = Action.commitmentSurface
  static let caution = StatusColor.caution
  static let cautionSurface = StatusColor.cautionSurface
  static let recordedLocalCheck = StatusColor.recorded
  static let recordedLocalCheckSurface = StatusColor.recordedSurface
  static let failedCheck = StatusColor.failure
  static let failedCheckSurface = StatusColor.failureSurface
  static let neutralInformation = StatusColor.information
  static let neutralInformationSurface = StatusColor.informationSurface

  private static func adaptiveColor(
    light: UInt32,
    dark: UInt32,
    lightHighContrast: UInt32,
    darkHighContrast: UInt32
  ) -> Color {
    Color(
      uiColor: UIColor { traits in
        let isDark = traits.userInterfaceStyle == .dark
        let isHighContrast = traits.accessibilityContrast == .high
        let value: UInt32

        switch (isDark, isHighContrast) {
        case (false, false):
          value = light
        case (false, true):
          value = lightHighContrast
        case (true, false):
          value = dark
        case (true, true):
          value = darkHighContrast
        }

        return UIColor(
          red: CGFloat((value >> 16) & 0xFF) / 255,
          green: CGFloat((value >> 8) & 0xFF) / 255,
          blue: CGFloat(value & 0xFF) / 255,
          alpha: 1
        )
      }
    )
  }
}

struct ForgeCommitmentButtonStyle: ButtonStyle {
  @Environment(\.colorSchemeContrast) private var colorSchemeContrast
  @Environment(\.isEnabled) private var isEnabled

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.body.weight(.semibold))
      .foregroundStyle(ForgeDesign.Action.commitmentForeground)
      .padding(.horizontal, ForgeDesign.Spacing.regular)
      .frame(maxWidth: .infinity, minHeight: 48)
      .contentShape(RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous))
      .background(
        ForgeDesign.Action.commitment,
        in: RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
      )
      .overlay {
        RoundedRectangle(cornerRadius: ForgeDesign.Radius.inset, style: .continuous)
          .stroke(
            ForgeDesign.Action.commitmentForeground,
            lineWidth: colorSchemeContrast == .increased ? 2 : 0
          )
      }
      .opacity(configuration.isPressed ? 0.8 : (isEnabled ? 1 : 0.48))
  }
}

struct ForgeSecondaryButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .foregroundStyle(ForgeDesign.secondaryActionForeground)
      .padding(.horizontal, ForgeDesign.Spacing.regular)
      .frame(maxWidth: .infinity, minHeight: 48)
      .contentShape(Rectangle())
      .opacity(configuration.isPressed ? 0.7 : 1)
  }
}
