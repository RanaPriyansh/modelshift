import SwiftUI

@main
@MainActor
struct FORGEApp: App {
  @State private var model = AppModel()

  var body: some Scene {
    WindowGroup {
      AppRootView()
        .environment(model)
    }
  }
}
