import SwiftUI

struct SettingsToolbar: ToolbarContent {
  var body: some ToolbarContent {
    ToolbarItem(placement: .topBarTrailing) {
      NavigationLink(value: AppRoute.settings) {
        Image(systemName: "gearshape")
      }
      .accessibilityLabel("Settings")
      .accessibilityHint("Opens reminder and data settings.")
    }
  }
}
