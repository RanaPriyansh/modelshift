import SwiftUI

#if DEBUG
  import ForgeCore
  import Foundation
#endif

@main
@MainActor
struct FORGEApp: App {
  #if DEBUG
    @State private var model: AppModel

    init() {
      let uiTestLaunch = Self.configureUITestLaunch()
      if let uiTestLaunch {
        if let clock = uiTestLaunch.clock {
          _model = State(
            initialValue: AppComposition.makeAppModel(
              privateStateStore: uiTestLaunch.privateStateStore,
              now: clock.now,
              launchPreparation: uiTestLaunch.prepare
            )
          )
        } else {
          _model = State(
            initialValue: AppComposition.makeAppModel(
              privateStateStore: uiTestLaunch.privateStateStore,
              launchPreparation: uiTestLaunch.prepare
            )
          )
        }
      } else {
        _model = State(initialValue: AppComposition.makeAppModel())
      }
    }
  #else
    @State private var model: AppModel = AppComposition.makeAppModel()
  #endif

  var body: some Scene {
    WindowGroup {
      AppRootView(model: model)
    }
  }

  #if DEBUG
    private static func configureUITestLaunch() -> UITestLaunchConfiguration? {
      let arguments = ProcessInfo.processInfo.arguments
      let isUITestLaunch =
        arguments.contains("-FORGEUITestingReset")
        || arguments.contains("-FORGEUITestingCorruptPrivateState")
        || arguments.contains("-FORGEUITestingClockStart")

      guard isUITestLaunch else {
        return nil
      }

      let uiTestClock = makeUITestClock(arguments: arguments)
      let privateStateStore = PrivateStateStore(
        protectedDataAvailability: UITestProtectedDataAvailability()
      )

      return UITestLaunchConfiguration(
        clock: uiTestClock,
        privateStateStore: privateStateStore,
        resetsState: arguments.contains("-FORGEUITestingReset"),
        seedsCorruptState:
          arguments.contains("-FORGEUITestingCorruptPrivateState")
      )
    }

    private static func resetUITestState(
      privateStateStore: PrivateStateStore
    ) async throws -> UInt64 {
      let resetEpoch: UInt64
      do {
        resetEpoch =
          try await privateStateStore.pendingResetIntent()?.resetEpoch ?? 1
      } catch PrivateStateStoreError.resetIntentMismatch {
        resetEpoch = 1
      }
      let result = try await privateStateStore.clear(
        resetEpoch: resetEpoch
      )
      switch result {
      case .completed(let receipt):
        guard receipt.isComplete else {
          throw PrivateStateStoreError.clearVerification(receipt: receipt)
        }
      case .superseded:
        throw PrivateStateStoreError.writeVerification
      }

      let sharedReceipt = try ForgeSharedStateStore().clearAll()
      guard sharedReceipt.namespace != .synchronizationUncertain else {
        throw PrivateStateStoreError.writeVerification
      }

      guard await NotificationCoordinator().disableReminders() else {
        throw PrivateStateStoreError.writeVerification
      }

      switch try await privateStateStore.completeReset(
        resetEpoch: resetEpoch
      ) {
      case .completed(let namespace):
        guard namespace != .changed(.synchronizationUncertain) else {
          throw PrivateStateStoreError.resetIntentSynchronizationUncertain
        }
      case .superseded:
        throw PrivateStateStoreError.writeVerification
      }

      return resetEpoch
    }

    private static func corruptPrivateStateForUITesting(
      privateStateStore: PrivateStateStore
    ) async throws {
      try await privateStateStore.seedCorruptStateForUITesting()
    }

    private static func makeUITestClock(
      arguments: [String]
    ) -> UITestMonotonicClock? {
      let clockArgumentIndices = arguments.indices.filter {
        arguments[$0] == "-FORGEUITestingClockStart"
      }

      guard clockArgumentIndices.count <= 1 else {
        fatalError("FORGE UI test clock start must occur once.")
      }

      guard let clockArgumentIndex = clockArgumentIndices.first else {
        return nil
      }

      let valueIndex = arguments.index(after: clockArgumentIndex)
      guard valueIndex < arguments.endIndex else {
        fatalError("FORGE UI test clock start is missing.")
      }

      let value = arguments[valueIndex]
      guard let unixStart = Double(value), unixStart.isFinite else {
        fatalError("FORGE UI test clock start is invalid.")
      }

      return UITestMonotonicClock(unixStart: unixStart)
    }

    private struct UITestLaunchConfiguration {
      let clock: UITestMonotonicClock?
      let privateStateStore: PrivateStateStore
      let resetsState: Bool
      let seedsCorruptState: Bool

      @MainActor
      func prepare() async throws -> UInt64? {
        let resetEpoch: UInt64?
        if resetsState {
          resetEpoch = try await FORGEApp.resetUITestState(
            privateStateStore: privateStateStore
          )
        } else {
          resetEpoch = nil
        }
        if seedsCorruptState {
          try await FORGEApp.corruptPrivateStateForUITesting(
            privateStateStore: privateStateStore
          )
        }
        return resetEpoch
      }
    }

    @MainActor
    private struct UITestProtectedDataAvailability:
      ProtectedDataAvailability
    {
      let isAvailable = true
    }

    @MainActor
    final class UITestMonotonicClock {
      private var unixTime: TimeInterval

      init(unixStart: TimeInterval) {
        unixTime = unixStart
      }

      func now() -> Date {
        let currentUnixTime = unixTime
        unixTime += 1
        return Date(timeIntervalSince1970: currentUnixTime)
      }
    }
  #endif
}
