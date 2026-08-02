import SwiftUI

struct UniversitySurface<Content: View>: View {
  @Environment(\.colorSchemeContrast) private var colorSchemeContrast
  @Environment(\.accessibilityReduceTransparency) private var accessibilityReduceTransparency

  private let content: Content

  init(@ViewBuilder content: () -> Content) {
    self.content = content()
  }

  var body: some View {
    content
      .padding(ForgeDesign.Spacing.regular)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(surfaceColor, in: surfaceShape)
      .overlay {
        surfaceShape.stroke(ForgeDesign.universitySurfaceBorder, lineWidth: borderWidth)
      }
      .accessibilityElement(children: .contain)
  }

  private var surfaceColor: Color {
    accessibilityReduceTransparency
      ? ForgeDesign.universitySurfaceOpaque
      : ForgeDesign.universitySurface
  }

  private var surfaceShape: RoundedRectangle {
    RoundedRectangle(cornerRadius: ForgeDesign.Radius.card, style: .continuous)
  }

  private var borderWidth: CGFloat {
    colorSchemeContrast == .increased ? 2 : 1
  }
}

struct UniversitySectionLabel: View {
  let title: String

  var body: some View {
    Text(title)
      .font(ForgeDesign.Text.sectionLabel.font)
      .foregroundStyle(ForgeDesign.Text.sectionLabel.foreground)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityAddTraits(.isHeader)
  }
}

struct UniversityMetadataRow: View {
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  let label: String
  let value: String

  var body: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: ForgeDesign.Spacing.tight) {
          labelText
          valueText
        }
      } else {
        HStack(alignment: .firstTextBaseline, spacing: ForgeDesign.Spacing.regular) {
          labelText
          Spacer(minLength: ForgeDesign.Spacing.small)
          valueText
            .multilineTextAlignment(.trailing)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(label)
    .accessibilityValue(value)
  }

  private var labelText: some View {
    Text(label)
      .font(ForgeDesign.Text.metadata.font)
      .foregroundStyle(ForgeDesign.Text.metadata.foreground)
      .fixedSize(horizontal: false, vertical: true)
      .layoutPriority(1)
  }

  private var valueText: some View {
    Text(value)
      .font(ForgeDesign.Text.metadataValue.font)
      .foregroundStyle(ForgeDesign.Text.metadataValue.foreground)
      .fixedSize(horizontal: false, vertical: true)
  }
}

enum UniversityStatusColorRole: Hashable, Sendable {
  case commitment
  case caution
  case recorded
  case failure
  case information

  fileprivate var foreground: Color {
    switch self {
    case .commitment:
      ForgeDesign.StatusColor.commitment
    case .caution:
      ForgeDesign.StatusColor.caution
    case .recorded:
      ForgeDesign.StatusColor.recorded
    case .failure:
      ForgeDesign.StatusColor.failure
    case .information:
      ForgeDesign.StatusColor.information
    }
  }

  fileprivate var surface: Color {
    switch self {
    case .commitment:
      ForgeDesign.StatusColor.commitmentSurface
    case .caution:
      ForgeDesign.StatusColor.cautionSurface
    case .recorded:
      ForgeDesign.StatusColor.recordedSurface
    case .failure:
      ForgeDesign.StatusColor.failureSurface
    case .information:
      ForgeDesign.StatusColor.informationSurface
    }
  }
}

enum UniversityStatus: Hashable, Sendable {
  case navigationCommitment
  case caution
  case recordedLocalCheck
  case failedCheck
  case neutralInformation

  var label: String {
    switch self {
    case .navigationCommitment:
      "Commitment"
    case .caution:
      "Caution"
    case .recordedLocalCheck:
      "Recorded local check"
    case .failedCheck:
      "Failed check"
    case .neutralInformation:
      "Information"
    }
  }

  var symbolName: String {
    switch self {
    case .navigationCommitment:
      "flag.fill"
    case .caution:
      "exclamationmark.triangle.fill"
    case .recordedLocalCheck:
      "checkmark.seal.fill"
    case .failedCheck:
      "xmark.octagon.fill"
    case .neutralInformation:
      "info.circle.fill"
    }
  }

  var colorRole: UniversityStatusColorRole {
    switch self {
    case .navigationCommitment:
      .commitment
    case .caution:
      .caution
    case .recordedLocalCheck:
      .recorded
    case .failedCheck:
      .failure
    case .neutralInformation:
      .information
    }
  }
}

struct UniversityStatusBadge: View {
  @Environment(\.colorSchemeContrast) private var colorSchemeContrast

  let label: String
  let symbolName: String
  let colorRole: UniversityStatusColorRole

  init(status: UniversityStatus) {
    self.init(
      label: status.label,
      symbolName: status.symbolName,
      colorRole: status.colorRole
    )
  }

  init(
    label: String,
    symbolName: String,
    colorRole: UniversityStatusColorRole
  ) {
    self.label = label
    self.symbolName = symbolName
    self.colorRole = colorRole
  }

  var body: some View {
    Label {
      Text(label)
    } icon: {
      Image(systemName: symbolName)
        .accessibilityHidden(true)
    }
    .font(.caption.weight(.semibold))
    .foregroundStyle(colorRole.foreground)
    .padding(.horizontal, ForgeDesign.Spacing.small)
    .padding(.vertical, ForgeDesign.Spacing.tight)
    .background(colorRole.surface, in: Capsule())
    .overlay {
      Capsule().stroke(colorRole.foreground, lineWidth: borderWidth)
    }
    .fixedSize(horizontal: false, vertical: true)
    .accessibilityElement(children: .combine)
    .accessibilityLabel(label)
  }

  private var borderWidth: CGFloat {
    colorSchemeContrast == .increased ? 2 : 1
  }
}
