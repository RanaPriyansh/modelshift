import Foundation

public enum ForgePublicWebURL {
  public static func validated(_ value: String?) -> URL? {
    guard let value else {
      return nil
    }

    let trimmedValue = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard
      !trimmedValue.isEmpty,
      let components = URLComponents(string: trimmedValue),
      components.scheme?.lowercased() == "https",
      components.user == nil,
      components.password == nil,
      components.port == nil,
      let host = components.host?.lowercased()
    else {
      return nil
    }

    guard
      isValidDNSHost(host),
      !isPlaceholderHost(host),
      !isNumericAddress(host)
    else {
      return nil
    }

    return components.url
  }

  private static func isPlaceholderHost(_ host: String) -> Bool {
    host == "localhost"
      || host.hasSuffix(".localhost")
      || host.hasSuffix(".local")
      || host == "example.com"
      || host == "example.org"
      || host == "example.net"
      || host.hasSuffix(".example")
      || host.hasSuffix(".example.com")
      || host.hasSuffix(".example.org")
      || host.hasSuffix(".example.net")
      || host.hasSuffix(".invalid")
      || host.hasSuffix(".test")
  }

  private static func isValidDNSHost(_ host: String) -> Bool {
    guard
      !host.hasPrefix("."),
      !host.hasSuffix("."),
      host.count <= 253
    else {
      return false
    }

    let labels = host.split(separator: ".", omittingEmptySubsequences: false)
    guard
      labels.count >= 2,
      let topLevelLabel = labels.last,
      topLevelLabel.contains(where: \.isLetter)
    else {
      return false
    }

    return labels.allSatisfy { label in
      guard
        !label.isEmpty,
        label.count <= 63,
        label.first != "-",
        label.last != "-"
      else {
        return false
      }

      return label.allSatisfy { character in
        character.isLetter || character.isNumber || character == "-"
      }
    }
  }

  private static func isNumericAddress(_ host: String) -> Bool {
    if host.contains(":") {
      return true
    }

    let parts = host.split(separator: ".", omittingEmptySubsequences: false)
    return parts.allSatisfy(isNumericAddressPart)
  }

  private static func isNumericAddressPart(_ part: Substring) -> Bool {
    if !part.isEmpty, part.allSatisfy(\.isNumber) {
      return true
    }

    if part.lowercased().hasPrefix("0x") {
      let hexadecimalPart = part.dropFirst(2)
      return !hexadecimalPart.isEmpty
        && hexadecimalPart.allSatisfy(\.isHexDigit)
    }

    return false
  }
}
