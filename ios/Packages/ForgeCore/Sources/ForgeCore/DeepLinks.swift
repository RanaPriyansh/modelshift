import Foundation

public enum ForgeDestination: String, Codable, CaseIterable, Sendable {
  case today
  case path
  case evidence
  case returns
  case focus
  case settings
}

public enum ForgeDeepLink {
  public static func destination(for url: URL) -> ForgeDestination? {
    guard
      let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
      components.scheme == "forge",
      components.user == nil,
      components.password == nil,
      components.port == nil,
      components.percentEncodedPath.isEmpty,
      components.percentEncodedQuery == nil,
      components.percentEncodedFragment == nil,
      let host = components.percentEncodedHost,
      let destination = ForgeDestination(rawValue: host),
      url.absoluteString == "forge://\(destination.rawValue)"
    else {
      return nil
    }

    return destination
  }
}
