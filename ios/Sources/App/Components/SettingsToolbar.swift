import SwiftUI

struct SettingsToolbar: ToolbarContent {
  var body: some ToolbarContent {
    ToolbarItem(placement: .topBarTrailing) {
      NavigationLink(value: AppRoute.settings) {
        Label("Settings", systemImage: "gearshape")
          .labelStyle(.iconOnly)
          .frame(width: 44, height: 44)
          .contentShape(Rectangle())
      }
      .accessibilityLabel("Settings")
      .accessibilityHint("Opens reminder and data settings.")
      .accessibilityIdentifier("settings.open")
    }
  }
}
