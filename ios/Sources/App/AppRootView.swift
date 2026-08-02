import ForgeCore
import Foundation
import SwiftUI
import UIKit

struct AppRootView: View {
  let model: AppModel
  @Environment(\.scenePhase) private var scenePhase

  var body: some View {
    @Bindable var model = model

    Group {
      if model.launchState == .loading {
        ProgressView("Loading local data")
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .background(ForgeDesign.canvas)
          .accessibilityIdentifier("launch.loading")
      } else if model.recoveryState != nil {
        LocalDataRecoveryView(model: model)
      } else if !model.isCourseStarted {
        OnboardingView(model: model)
      } else {
        TabView(selection: $model.selectedTab) {
          NavigationStack(path: $model.todayPath) {
            TodayView()
              .navigationDestination(for: AppRoute.self) { route in
                destination(for: route)
              }
              .toolbar {
                SettingsToolbar(path: $model.todayPath)
              }
          }
          .tabItem {
            Label("Today", systemImage: "sun.max")
              .accessibilityIdentifier("tab.today")
          }
          .tag(AppTab.today)

          NavigationStack(path: $model.pathPath) {
            PathView()
              .navigationDestination(for: AppRoute.self) { route in
                destination(for: route)
              }
              .toolbar {
                SettingsToolbar(path: $model.pathPath)
              }
          }
          .tabItem {
            Label("Path", systemImage: "point.topleft.down.to.point.bottomright.curvepath")
              .accessibilityIdentifier("tab.path")
          }
          .tag(AppTab.path)

          NavigationStack(path: $model.evidencePath) {
            EvidenceView()
              .navigationDestination(for: AppRoute.self) { route in
                destination(for: route)
              }
              .toolbar {
                SettingsToolbar(path: $model.evidencePath)
              }
          }
          .tabItem {
            Label("Evidence", systemImage: "doc.text.magnifyingglass")
              .accessibilityIdentifier("tab.evidence")
          }
          .tag(AppTab.evidence)
        }
        .tint(ForgeDesign.tabSelection)
        .toolbarBackground(ForgeDesign.canvas, for: .tabBar)
        .toolbarBackgroundVisibility(.visible, for: .tabBar)
      }
    }
    .sheet(
      isPresented: $model.isActivityPresented,
      onDismiss: {
        model.dismissActivity()
      }
    ) {
      UniversityActivityView()
        .environment(model)
    }
    .onOpenURL { url in
      model.route(url)
    }
    .onReceive(
      NotificationCenter.default.publisher(for: .forgePendingFocusDidChange)
    ) { _ in
      model.consumePendingFocus()
    }
    .onChange(of: scenePhase) { _, phase in
      model.handleScenePhaseChange(phase)
    }
    .onReceive(
      NotificationCenter.default.publisher(
        for: UIApplication.significantTimeChangeNotification
      )
    ) { _ in
      model.handleTimeEnvironmentChange()
    }
    .onReceive(
      NotificationCenter.default.publisher(
        for: Notification.Name.NSSystemTimeZoneDidChange
      )
    ) { _ in
      model.handleTimeEnvironmentChange()
    }
    .onReceive(
      NotificationCenter.default.publisher(
        for: Notification.Name.NSCalendarDayChanged
      )
    ) { _ in
      model.handleTimeEnvironmentChange()
    }
    .task {
      model.handleScenePhaseChange(scenePhase)
      await model.launch()
    }
    .environment(model)
  }

  @ViewBuilder
  private func destination(for route: AppRoute) -> some View {
    switch route {
    case .settings:
      SettingsView()
    case .privacySupport:
      PrivacySupportView()
    }
  }
}

#Preview {
  AppRootView(model: AppModel.preview())
}
