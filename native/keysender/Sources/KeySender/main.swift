import AppKit
import CoreGraphics

struct Config {
  let bundleId: String
  let shortcut: String
  let requireVisibleOnActiveDisplay: Bool
  let requireVisibleOnScreen: Bool
  let restoreFocus: Bool
  let probeOnly: Bool
}

struct ResultPayload: Codable {
  let ok: Bool
  let code: Int
  let message: String
  let bundleId: String
  let visibleOnActiveDisplay: Bool
  let visibleOnScreen: Bool
}

enum ExitCode {
  static let success = 0
  static let edgeNotRunning = 10
  static let edgeNotVisible = 11
  static let postEventDenied = 20
  static let postEventRequestDenied = 21
  static let activationFailed = 30
  static let unsupportedShortcut = 40
  static let invalidArgs = 50
}

func printJSON(_ payload: ResultPayload) {
  let encoder = JSONEncoder()
  encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
  if let data = try? encoder.encode(payload), let json = String(data: data, encoding: .utf8) {
    print(json)
  }
}

func parseArgs() -> Config? {
  var bundleId = "com.microsoft.edgemac"
  var shortcut = "opt+w"
  var requireVisible = false
  var requireVisibleOnScreen = false
  var restoreFocus = true
  var probeOnly = false

  var it = CommandLine.arguments.dropFirst().makeIterator()
  while let arg = it.next() {
    switch arg {
    case "--bundle-id":
      if let value = it.next() { bundleId = value }
    case "--shortcut":
      if let value = it.next() { shortcut = value }
    case "--require-visible-on-active-display":
      requireVisible = true
    case "--require-visible":
      requireVisibleOnScreen = true
    case "--no-restore-focus":
      restoreFocus = false
    case "--probe":
      probeOnly = true
    default:
      return nil
    }
  }

  return Config(
    bundleId: bundleId,
    shortcut: shortcut,
    requireVisibleOnActiveDisplay: requireVisible,
    requireVisibleOnScreen: requireVisibleOnScreen,
    restoreFocus: restoreFocus,
    probeOnly: probeOnly
  )
}

func activeDisplayBounds() -> CGRect {
  let mouseLocation = NSEvent.mouseLocation
  for displayId in NSScreen.screens.compactMap({ $0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber }) {
    let cgId = CGDirectDisplayID(displayId.uint32Value)
    let bounds = CGDisplayBounds(cgId)
    if bounds.contains(mouseLocation) {
      return bounds
    }
  }
  if let main = NSScreen.main {
    return main.frame
  }
  return CGRect(x: 0, y: 0, width: 0, height: 0)
}

func edgeWindowVisibleOnActiveDisplay(bundleId: String) -> Bool {
  let activeBounds = activeDisplayBounds()
  let options: CGWindowListOption = [.excludeDesktopElements, .optionOnScreenOnly]
  guard let infoList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
    return false
  }

  let edgeApps = NSRunningApplication.runningApplications(withBundleIdentifier: bundleId)
  let edgePids = Set(edgeApps.map { $0.processIdentifier })
  if edgePids.isEmpty { return false }

  for info in infoList {
    guard let pid = info[kCGWindowOwnerPID as String] as? pid_t else { continue }
    if !edgePids.contains(pid) { continue }

    guard let boundsDict = info[kCGWindowBounds as String] as? [String: Any] else { continue }
    var rect = CGRect.zero
    if !CGRectMakeWithDictionaryRepresentation(boundsDict as CFDictionary, &rect) { continue }

    let intersection = rect.intersection(activeBounds)
    if intersection.width > 40 && intersection.height > 40 {
      return true
    }
  }

  return false
}

func edgeWindowVisibleOnScreen(bundleId: String) -> Bool {
  let options: CGWindowListOption = [.excludeDesktopElements, .optionOnScreenOnly]
  guard let infoList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
    return false
  }

  let edgeApps = NSRunningApplication.runningApplications(withBundleIdentifier: bundleId)
  let edgePids = Set(edgeApps.map { $0.processIdentifier })
  if edgePids.isEmpty { return false }

  for info in infoList {
    guard let pid = info[kCGWindowOwnerPID as String] as? pid_t else { continue }
    if !edgePids.contains(pid) { continue }
    return true
  }

  return false
}

func requestPostEventAccess() -> Bool {
  if CGPreflightPostEventAccess() { return true }
  return CGRequestPostEventAccess()
}

func activateApp(bundleId: String) -> NSRunningApplication? {
  let apps = NSRunningApplication.runningApplications(withBundleIdentifier: bundleId)
  guard let app = apps.first else { return nil }
  app.activate(options: [.activateAllWindows, .activateIgnoringOtherApps])

  let start = Date()
  while Date().timeIntervalSince(start) < 0.3 {
    if NSWorkspace.shared.frontmostApplication?.bundleIdentifier == bundleId { return app }
    RunLoop.current.run(until: Date().addingTimeInterval(0.01))
  }
  return app
}

func keyCodeForToken(_ token: String) -> CGKeyCode? {
  switch token.lowercased() {
  case "a": return 0
  case "b": return 11
  case "c": return 8
  case "d": return 2
  case "e": return 14
  case "f": return 3
  case "g": return 5
  case "h": return 4
  case "i": return 34
  case "j": return 38
  case "k": return 40
  case "l": return 37
  case "m": return 46
  case "n": return 45
  case "o": return 31
  case "p": return 35
  case "q": return 12
  case "r": return 15
  case "s": return 1
  case "t": return 17
  case "u": return 32
  case "v": return 9
  case "w": return 13
  case "x": return 7
  case "y": return 16
  case "z": return 6
  case "tab": return 48
  case "enter", "return": return 36
  case "esc", "escape": return 53
  case "up": return 126
  case "down": return 125
  case "left": return 123
  case "right": return 124
  case "[": return 33
  case "]": return 30
  default: return nil
  }
}

func parseShortcut(_ shortcut: String) -> (CGEventFlags, CGKeyCode)? {
  let parts = shortcut.lowercased().split(separator: "+").map { String($0) }
  var flags: CGEventFlags = []
  var keyToken: String?

  for part in parts {
    switch part {
    case "cmd", "command", "meta":
      flags.insert(.maskCommand)
    case "shift":
      flags.insert(.maskShift)
    case "opt", "option", "alt":
      flags.insert(.maskAlternate)
    case "ctrl", "control":
      flags.insert(.maskControl)
    default:
      keyToken = part
    }
  }

  guard let token = keyToken, let keyCode = keyCodeForToken(token) else { return nil }
  return (flags, keyCode)
}

func postShortcut(shortcut: String) -> Bool {
  guard let parsed = parseShortcut(shortcut) else { return false }
  let (flags, keyCode) = parsed
  guard let source = CGEventSource(stateID: .combinedSessionState) else { return false }

  let keyDown = CGEvent(keyboardEventSource: source, virtualKey: keyCode, keyDown: true)
  let keyUp = CGEvent(keyboardEventSource: source, virtualKey: keyCode, keyDown: false)
  keyDown?.flags = flags
  keyUp?.flags = flags

  keyDown?.post(tap: .cghidEventTap)
  RunLoop.current.run(until: Date().addingTimeInterval(0.01))
  keyUp?.post(tap: .cghidEventTap)
  return true
}

let config = parseArgs()
if config == nil {
  printJSON(ResultPayload(ok: false, code: ExitCode.invalidArgs, message: "Invalid arguments", bundleId: "", visibleOnActiveDisplay: false, visibleOnScreen: false))
  exit(Int32(ExitCode.invalidArgs))
}

let cfg = config!
let visibleOnActive = edgeWindowVisibleOnActiveDisplay(bundleId: cfg.bundleId)
let visibleOnScreen = edgeWindowVisibleOnScreen(bundleId: cfg.bundleId)
if cfg.probeOnly {
  printJSON(ResultPayload(ok: true, code: ExitCode.success, message: "probe", bundleId: cfg.bundleId, visibleOnActiveDisplay: visibleOnActive, visibleOnScreen: visibleOnScreen))
  exit(Int32(ExitCode.success))
}

if NSRunningApplication.runningApplications(withBundleIdentifier: cfg.bundleId).isEmpty {
  printJSON(ResultPayload(ok: false, code: ExitCode.edgeNotRunning, message: "App not running", bundleId: cfg.bundleId, visibleOnActiveDisplay: false, visibleOnScreen: false))
  exit(Int32(ExitCode.edgeNotRunning))
}

if cfg.requireVisibleOnActiveDisplay && !visibleOnActive {
  printJSON(ResultPayload(ok: false, code: ExitCode.edgeNotVisible, message: "App not visible on active display", bundleId: cfg.bundleId, visibleOnActiveDisplay: false, visibleOnScreen: visibleOnScreen))
  exit(Int32(ExitCode.edgeNotVisible))
}

if cfg.requireVisibleOnScreen && !visibleOnScreen {
  printJSON(ResultPayload(ok: false, code: ExitCode.edgeNotVisible, message: "App not visible on screen", bundleId: cfg.bundleId, visibleOnActiveDisplay: visibleOnActive, visibleOnScreen: false))
  exit(Int32(ExitCode.edgeNotVisible))
}

if !requestPostEventAccess() {
  printJSON(ResultPayload(ok: false, code: ExitCode.postEventDenied, message: "Post event permission not granted", bundleId: cfg.bundleId, visibleOnActiveDisplay: visibleOnActive, visibleOnScreen: visibleOnScreen))
  exit(Int32(ExitCode.postEventDenied))
}

let previousApp = NSWorkspace.shared.frontmostApplication
if activateApp(bundleId: cfg.bundleId) == nil {
  printJSON(ResultPayload(ok: false, code: ExitCode.activationFailed, message: "Activation failed", bundleId: cfg.bundleId, visibleOnActiveDisplay: visibleOnActive, visibleOnScreen: visibleOnScreen))
  exit(Int32(ExitCode.activationFailed))
}

if !postShortcut(shortcut: cfg.shortcut) {
  printJSON(ResultPayload(ok: false, code: ExitCode.unsupportedShortcut, message: "Unsupported shortcut", bundleId: cfg.bundleId, visibleOnActiveDisplay: visibleOnActive, visibleOnScreen: visibleOnScreen))
  exit(Int32(ExitCode.unsupportedShortcut))
}

if cfg.restoreFocus, let app = previousApp {
  app.activate(options: [.activateAllWindows, .activateIgnoringOtherApps])
}

printJSON(ResultPayload(ok: true, code: ExitCode.success, message: "sent", bundleId: cfg.bundleId, visibleOnActiveDisplay: visibleOnActive, visibleOnScreen: visibleOnScreen))
exit(Int32(ExitCode.success))
