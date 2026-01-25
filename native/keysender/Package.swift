// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "KeySender",
  platforms: [.macOS(.v12)],
  products: [
    .executable(name: "keysender", targets: ["KeySender"])
  ],
  targets: [
    .executableTarget(
      name: "KeySender",
      path: "Sources/KeySender"
    )
  ]
)
