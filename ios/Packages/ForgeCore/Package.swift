// swift-tools-version: 6.2

import PackageDescription

let package = Package(
  name: "ForgeCore",
  platforms: [
    .iOS(.v18),
    .macOS(.v15),
  ],
  products: [
    .library(name: "ForgeCore", targets: ["ForgeCore"])
  ],
  targets: [
    .target(name: "ForgeCore"),
    .testTarget(
      name: "ForgeCoreTests",
      dependencies: ["ForgeCore"]
    ),
  ],
  swiftLanguageModes: [.v6]
)
