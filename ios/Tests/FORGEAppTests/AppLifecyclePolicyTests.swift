import SwiftUI
import Testing

@testable import FORGE

@Suite("App lifecycle policy")
struct AppLifecyclePolicyTests {
  @Test("SwiftUI scene phases map to lifecycle phases")
  func scenePhasesMapToLifecyclePhases() {
    #expect(AppLifecyclePolicy.phase(for: ScenePhase.active) == .active)
    #expect(AppLifecyclePolicy.phase(for: ScenePhase.inactive) == .inactive)
    #expect(AppLifecyclePolicy.phase(for: ScenePhase.background) == .background)
  }

  @Test("Active consumes a pending system route before reminder reconciliation")
  func activeConsumesSystemRouteBeforeReminderReconciliation() {
    #expect(
      AppLifecyclePolicy.actions(for: AppLifecyclePolicy.Phase.active)
        == [.consumePendingSystemDestination, .reconcileReminders]
    )
  }

  @Test("Background requests one persistence operation")
  func backgroundRequestsOnePersistenceOperation() {
    #expect(
      AppLifecyclePolicy.actions(for: AppLifecyclePolicy.Phase.background)
        == [.persistCurrentState]
    )
  }

  @Test(
    "Inactive and unknown phases request no work",
    arguments: [AppLifecyclePolicy.Phase.inactive, .unknown]
  )
  func noOpPhasesRequestNoWork(_ phase: AppLifecyclePolicy.Phase) {
    #expect(AppLifecyclePolicy.actions(for: phase).isEmpty)
  }
}
