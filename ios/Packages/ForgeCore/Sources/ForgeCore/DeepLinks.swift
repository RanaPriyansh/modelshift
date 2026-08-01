import Foundation

public enum ForgeDeepLink {
  public static func destination(for url: URL) -> ForgeDestination? {
    guard
      url.scheme?.lowercased() == "forge",
      url.user == nil,
      url.password == nil,
      url.port == nil,
      url.query == nil,
      url.fragment == nil,
      let route = url.host,
      !route.isEmpty,
      url.path.isEmpty,
      let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
      components.percentEncodedHost == route,
      url.absoluteString.lowercased() == "forge://\(route.lowercased())"
    else {
      return nil
    }

    return destination(forRoute: route)
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
