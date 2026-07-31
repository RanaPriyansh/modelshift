import ForgeCore
import SwiftUI

@main
@MainActor
struct FORGEApp: App {
  @State private var model: AppModel

  init() {
    #if DEBUG
      if ProcessInfo.processInfo.arguments.contains("-FORGEUITestingReset") {
        ForgeSharedStateStore().clearAll()
      }
    #endif

    _model = State(initialValue: AppModel())
  }

  var body: some Scene {
    WindowGroup {
      AppRootView()
        .environment(model)
    }
  }
}
