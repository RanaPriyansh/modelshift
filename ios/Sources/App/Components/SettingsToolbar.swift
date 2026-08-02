import SwiftUI

struct SettingsToolbar: ToolbarContent {
  @Binding var path: [AppRoute]

  var body: some ToolbarContent {
    if !path.contains(.settings) {
      ToolbarItem(placement: .topBarTrailing) {
        Button {
          path.append(.settings)
        } label: {
          Label("Settings", systemImage: "gearshape")
            .labelStyle(.iconOnly)
            .foregroundStyle(ForgeDesign.secondaryText)
            .frame(width: 44, height: 44)
            .contentShape(Rectangle())
        }
        .accessibilityLabel("Settings")
        .accessibilityHint("Opens return reminder, privacy, and support settings.")
        .accessibilityIdentifier("settings.toolbar-button")
      }
    }
  }
}
