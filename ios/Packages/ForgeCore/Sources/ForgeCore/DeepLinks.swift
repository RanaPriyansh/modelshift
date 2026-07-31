import Foundation

public enum ForgeDeepLink {
  public static func destination(for url: URL) -> ForgeDestination? {
    if url.scheme?.lowercased() == "forge" {
      let route = url.host ?? url.pathComponents.dropFirst().first
      return destination(forRoute: route)
    }

    guard url.scheme == "https" || url.scheme == "http" else {
      return nil
    }

    let path = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))

    switch path {
    case "app", "app/today":
      return .today
    case "app/path", "app/paths":
      return .path
    case "app/evidence":
      return .evidence
    case "app/returns":
      return .returns
    case let value where value.hasPrefix("app/study"):
      return .focus
    case "app/settings":
      return .settings
    default:
      return nil
    }
  }

  private static func destination(forRoute route: String?) -> ForgeDestination? {
    switch route?.lowercased() {
    case "today":
      .today
    case "path":
      .path
    case "evidence":
      .evidence
    case "returns":
      .returns
    case "focus":
      .focus
    case "settings":
      .settings
    default:
      nil
    }
  }
}
