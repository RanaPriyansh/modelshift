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
      } else if model.semesterDesk == nil {
        OnboardingView(model: model)
      } else {
        TabView(selection: $model.selectedTab) {
          Tab("Today", systemImage: "sun.max", value: AppTab.today) {
            NavigationStack(path: $model.todayPath) {
              TodayView()
                .navigationDestination(for: AppRoute.self) { route in
                  destination(for: route)
                }
                .toolbar {
                  SettingsToolbar(path: $model.todayPath)
                }
            }
            .accessibilityIdentifier("tab.today")
          }

          Tab("Semester", systemImage: "calendar", value: AppTab.semester) {
            NavigationStack(path: $model.semesterPath) {
              SemesterView()
                .navigationDestination(for: AppRoute.self) { route in
                  destination(for: route)
                }
                .toolbar {
                  SettingsToolbar(path: $model.semesterPath)
                }
            }
            .accessibilityIdentifier("tab.semester")
          }

          Tab(
            "Progress",
            systemImage: "chart.line.uptrend.xyaxis",
            value: AppTab.progress
          ) {
            NavigationStack(path: $model.progressPath) {
              SemesterProgressView()
                .navigationDestination(for: AppRoute.self) { route in
                  destination(for: route)
                }
                .toolbar {
                  SettingsToolbar(path: $model.progressPath)
                }
            }
            .accessibilityIdentifier("tab.progress")
          }
        }
        .tint(ForgeDesign.tabSelection)
        .toolbarBackground(ForgeDesign.canvas, for: .tabBar)
        .toolbarBackgroundVisibility(.visible, for: .tabBar)
      }
    }
    .sheet(
      item: $model.activeSemesterDeskSheet,
      onDismiss: {
        model.dismissSemesterDeskSheet()
      }
    ) { sheet in
      SemesterDeskSheetView(sheet: sheet)
        .environment(model)
    }
    .fullScreenCover(
      isPresented: $model.isProtectedStudyPresented,
      onDismiss: {
        model.dismissProtectedStudy()
      }
    ) {
      ProtectedStudyView()
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
      SemesterDeskSettingsView()
    case .privacySupport:
      SemesterDeskPrivacySupportView()
    }
  }
}

#Preview {
  AppRootView(model: AppModel.preview())
}
