import ForgeCore
import Foundation
import Observation
import WidgetKit

enum AppTab: Hashable {
  case today
  case path
  case evidence
}

enum AppRoute: Hashable {
  case settings
}

@MainActor
@Observable
final class AppModel {
  private enum ReminderPreferenceKey {
    static let grownUpManagesReminders = "forge.grown-up-manages-reminders.v1"
  }

  @ObservationIgnored private let store: ForgeSharedStateStore
  @ObservationIgnored private let reminderPreferences: UserDefaults
  @ObservationIgnored private let notificationCoordinator: NotificationCoordinator
  @ObservationIgnored private var reminderOperation: Task<Void, Never>?
  @ObservationIgnored private var localDataResetOperation: Task<Void, Never>?

  var snapshot: ForgeSnapshot
  var onboardingDraft: OnboardingDraft

  var selectedTab: AppTab = .today
  var todayPath: [AppRoute] = []
  var pathPath: [AppRoute] = []
  var evidencePath: [AppRoute] = []

  var isOnboardingPresented: Bool
  var isFocusPresented = false

  var remindersEnabled: Bool
  var grownUpManagesReminders: Bool
  var isReminderOperationRunning = false
  var reminderStatusMessage: String?
  var isLocalDataResetRunning = false

  init(
    store: ForgeSharedStateStore = ForgeSharedStateStore(),
    notificationCoordinator suppliedNotificationCoordinator: NotificationCoordinator? = nil,
    snapshot suppliedSnapshot: ForgeSnapshot? = nil,
    onboarding suppliedOnboarding: OnboardingDraft? = nil,
    reminderPreferences suppliedReminderPreferences: UserDefaults? = nil
  ) {
    self.store = store
    reminderPreferences =
      suppliedReminderPreferences
      ?? UserDefaults(suiteName: ForgeSharedStateStore.appGroupIdentifier)
      ?? .standard
    notificationCoordinator =
      suppliedNotificationCoordinator ?? NotificationCoordinator()

    let savedOnboarding = suppliedOnboarding ?? store.loadOnboarding()
    let loadedSnapshot = suppliedSnapshot ?? store.loadSnapshot() ?? .sample()
    let savedGrownUpReminderPreference =
      reminderPreferences.object(
        forKey: ReminderPreferenceKey.grownUpManagesReminders
      ) as? Bool

    snapshot = loadedSnapshot
    onboardingDraft =
      savedOnboarding
      ?? OnboardingDraft(
        goal: loadedSnapshot.goal,
        mode: loadedSnapshot.mode
      )
    isOnboardingPresented = savedOnboarding == nil && !store.onboardingDismissed
    remindersEnabled = store.remindersEnabled
    grownUpManagesReminders =
      loadedSnapshot.mode == .childWithAdult
      && (savedGrownUpReminderPreference ?? savedOnboarding?.grownUpPresent ?? false)
  }

  deinit {
    reminderOperation?.cancel()
    localDataResetOperation?.cancel()
  }

  var canEnableReminders: Bool {
    snapshot.dueReturn != nil
      && (snapshot.mode != .childWithAdult || grownUpManagesReminders)
  }

  var reminderBoundaryText: String {
    guard snapshot.dueReturn != nil else {
      return "No delayed return is available."
    }

    if snapshot.mode == .childWithAdult, !grownUpManagesReminders {
      return "A grown-up must manage reminders for this learner mode."
    }

    return "FORGE schedules one local reminder. The reminder contains no goal or evidence text."
  }

  func completeOnboarding() {
    guard onboardingDraft.isReady else {
      return
    }

    snapshot = ForgeSnapshot(
      goal: onboardingDraft.normalizedGoal,
      mode: onboardingDraft.mode,
      nextAction: snapshot.nextAction,
      milestones: snapshot.milestones,
      evidence: snapshot.evidence,
      dueReturn: snapshot.dueReturn,
      updatedAt: .now
    )

    let savedGrownUpReminderPreference =
      reminderPreferences.object(
        forKey: ReminderPreferenceKey.grownUpManagesReminders
      ) as? Bool
    grownUpManagesReminders =
      onboardingDraft.mode == .childWithAdult
      && (savedGrownUpReminderPreference ?? onboardingDraft.grownUpPresent)
    try? store.save(snapshot: snapshot)
    try? store.save(onboarding: onboardingDraft)
    store.onboardingDismissed = true
    WidgetCenter.shared.reloadAllTimelines()
    isOnboardingPresented = false

    if remindersEnabled, !canEnableReminders {
      setRemindersEnabled(false)
    }
  }

  func skipOnboarding() {
    store.onboardingDismissed = true
    isOnboardingPresented = false
  }

  func reviewOnboarding() {
    isOnboardingPresented = true
  }

  func presentFocus() {
    isFocusPresented = true
  }

  func open(url: URL) {
    guard let destination = ForgeDeepLink.destination(for: url) else {
      return
    }

    open(destination: destination)
  }

  func consumePendingDestination() {
    guard let destination = store.consumePendingDestination() else {
      return
    }

    open(destination: destination)
  }

  private func open(destination: ForgeDestination) {
    switch destination {
    case .today, .returns:
      selectedTab = .today
    case .path:
      selectedTab = .path
    case .evidence:
      selectedTab = .evidence
    case .focus:
      isOnboardingPresented = false
      isFocusPresented = true
    case .settings:
      selectedTab = .today
      todayPath = [.settings]
    }
  }

  func setGrownUpManagesReminders(_ isManaged: Bool) {
    guard !isLocalDataResetRunning, snapshot.mode == .childWithAdult else {
      return
    }

    grownUpManagesReminders = isManaged
    reminderPreferences.set(
      isManaged,
      forKey: ReminderPreferenceKey.grownUpManagesReminders
    )

    if !isManaged, remindersEnabled {
      setRemindersEnabled(false)
    }
  }

  func setRemindersEnabled(_ isEnabled: Bool) {
    guard !isLocalDataResetRunning else {
      return
    }

    reminderOperation?.cancel()

    if isEnabled, !canEnableReminders {
      reminderStatusMessage = reminderBoundaryText
      return
    }

    remindersEnabled = isEnabled
    reminderStatusMessage = nil

    reminderOperation = Task { @MainActor [weak self] in
      guard let self else {
        return
      }

      isReminderOperationRunning = true
      defer {
        isReminderOperationRunning = false
      }

      if isEnabled {
        let didSchedule = await notificationCoordinator.requestAndSchedule(
          snapshot: snapshot,
          mode: snapshot.mode,
          grownUpManaged: grownUpManagesReminders
        )

        guard !Task.isCancelled else {
          return
        }

        remindersEnabled = didSchedule
        store.remindersEnabled = didSchedule
        reminderStatusMessage =
          didSchedule
          ? "The local return reminder is scheduled."
          : "Notifications are not enabled. You can change this setting later."
      } else {
        await notificationCoordinator.disableReminders()

        guard !Task.isCancelled else {
          return
        }

        remindersEnabled = false
        store.remindersEnabled = false
        reminderStatusMessage = "Return reminders are off."
      }
    }
  }

  func clearLocalData() {
    guard !isLocalDataResetRunning else {
      return
    }

    reminderOperation?.cancel()
    localDataResetOperation?.cancel()

    localDataResetOperation = Task { @MainActor [weak self] in
      guard let self else {
        return
      }

      isLocalDataResetRunning = true
      defer {
        isLocalDataResetRunning = false
      }

      await notificationCoordinator.disableReminders()

      guard !Task.isCancelled else {
        return
      }

      store.clearAll()
      reminderPreferences.removeObject(
        forKey: ReminderPreferenceKey.grownUpManagesReminders
      )
      WidgetCenter.shared.reloadAllTimelines()

      snapshot = .sample()
      onboardingDraft = OnboardingDraft()
      selectedTab = .today
      todayPath = []
      pathPath = []
      evidencePath = []
      isFocusPresented = false
      remindersEnabled = false
      grownUpManagesReminders = false
      isReminderOperationRunning = false
      reminderStatusMessage = nil
      isOnboardingPresented = true
    }
  }
}

extension AppModel {
  static func preview(
    snapshot: ForgeSnapshot = .sample(),
    onboarding: OnboardingDraft = OnboardingDraft(
      goal: "Become AI-literate",
      mode: .adult
    )
  ) -> AppModel {
    let defaults =
      UserDefaults(
        suiteName: "com.forgelearning.preview.\(UUID().uuidString)"
      ) ?? .standard

    return AppModel(
      store: ForgeSharedStateStore(defaults: defaults),
      notificationCoordinator: NotificationCoordinator(),
      snapshot: snapshot,
      onboarding: onboarding,
      reminderPreferences: defaults
    )
  }
}
