import Foundation

public struct ForgeSharedStateStore {
  public static let appGroupIdentifier = "group.com.forgelearning.shared"

  private enum Key {
    static let snapshot = "forge.snapshot.v1"
    static let onboarding = "forge.onboarding.v1"
    static let onboardingDismissed = "forge.onboarding-dismissed.v1"
    static let pendingDestination = "forge.pending-destination.v1"
    static let remindersEnabled = "forge.reminders-enabled.v1"
  }

  private let defaults: UserDefaults
  private let encoder: JSONEncoder
  private let decoder: JSONDecoder

  public init(defaults: UserDefaults) {
    self.defaults = defaults
    encoder = JSONEncoder()
    decoder = JSONDecoder()
  }

  public init() {
    self.init(
      defaults: UserDefaults(suiteName: Self.appGroupIdentifier) ?? .standard
    )
  }

  public func save(snapshot: ForgeSnapshot) throws {
    defaults.set(try encoder.encode(snapshot), forKey: Key.snapshot)
  }

  public func loadSnapshot() -> ForgeSnapshot? {
    guard let data = defaults.data(forKey: Key.snapshot) else {
      return nil
    }

    return try? decoder.decode(ForgeSnapshot.self, from: data)
  }

  public func save(onboarding: OnboardingDraft) throws {
    defaults.set(try encoder.encode(onboarding), forKey: Key.onboarding)
  }

  public func loadOnboarding() -> OnboardingDraft? {
    guard let data = defaults.data(forKey: Key.onboarding) else {
      return nil
    }

    return try? decoder.decode(OnboardingDraft.self, from: data)
  }

  public func setPendingDestination(_ destination: ForgeDestination) {
    defaults.set(destination.rawValue, forKey: Key.pendingDestination)
  }

  public func consumePendingDestination() -> ForgeDestination? {
    guard
      let value = defaults.string(forKey: Key.pendingDestination),
      let destination = ForgeDestination(rawValue: value)
    else {
      return nil
    }

    defaults.removeObject(forKey: Key.pendingDestination)
    return destination
  }

  public var remindersEnabled: Bool {
    get { defaults.bool(forKey: Key.remindersEnabled) }
    nonmutating set { defaults.set(newValue, forKey: Key.remindersEnabled) }
  }

  public var onboardingDismissed: Bool {
    get { defaults.bool(forKey: Key.onboardingDismissed) }
    nonmutating set { defaults.set(newValue, forKey: Key.onboardingDismissed) }
  }

  public func clearAll() {
    defaults.removeObject(forKey: Key.snapshot)
    defaults.removeObject(forKey: Key.onboarding)
    defaults.removeObject(forKey: Key.onboardingDismissed)
    defaults.removeObject(forKey: Key.pendingDestination)
    defaults.removeObject(forKey: Key.remindersEnabled)
  }
}
