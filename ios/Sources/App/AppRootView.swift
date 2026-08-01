import ForgeCore
import SwiftUI

struct AppRootView: View {
  @Environment(AppModel.self) private var model
  @Environment(\.scenePhase) private var scenePhase

  var body: some View {
    @Bindable var model = model

    TabView(selection: $model.selectedTab) {
      NavigationStack(path: $model.todayPath) {
        TodayView()
          .navigationDestination(for: AppRoute.self) { route in
            destination(for: route)
          }
      }
      .tabItem {
        Label("Today", systemImage: "sun.max")
      }
      .accessibilityIdentifier("tab.today")
      .tag(AppTab.today)

      NavigationStack(path: $model.pathPath) {
        PathView()
          .navigationDestination(for: AppRoute.self) { route in
            destination(for: route)
          }
      }
      .tabItem {
        Label("Path", systemImage: "point.topleft.down.to.point.bottomright.curvepath")
      }
      .accessibilityIdentifier("tab.path")
      .tag(AppTab.path)

      NavigationStack(path: $model.evidencePath) {
        EvidenceView()
          .navigationDestination(for: AppRoute.self) { route in
            destination(for: route)
          }
      }
      .tabItem {
        Label("Evidence", systemImage: "doc.text.magnifyingglass")
      }
      .accessibilityIdentifier("tab.evidence")
      .tag(AppTab.evidence)
    }
    .tint(ForgeDesign.tabSelection)
    .toolbarBackground(ForgeDesign.canvas, for: .tabBar)
    .toolbarBackgroundVisibility(.visible, for: .tabBar)
    .sheet(isPresented: $model.isOnboardingPresented) {
      OnboardingView(model: model)
    }
    .fullScreenCover(isPresented: $model.isFocusPresented) {
      FocusPreviewView(snapshot: model.snapshot)
    }
    .onOpenURL { url in
      model.open(url: url)
    }
    .onChange(of: scenePhase, initial: true) { _, phase in
      guard phase == .active else {
        return
      }

      model.consumePendingDestination()
    }
  }

  @ViewBuilder
  private func destination(for route: AppRoute) -> some View {
    switch route {
    case .settings:
      SettingsView()
    }
  }
}

#Preview {
  AppRootView()
    .environment(AppModel.preview())
}
