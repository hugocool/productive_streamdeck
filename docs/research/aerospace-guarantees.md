# AeroSpace guarantees (ticket #3)

Sources: the official guide (`G` = <https://nikitabobko.github.io/AeroSpace/guide>), the command reference (`C` = <https://nikitabobko.github.io/AeroSpace/commands>), and the `nikitabobko/AeroSpace` repository at commit `39e5190` (2026-09-06), cited as `S:<path>`. Where the docs are silent the answer comes from source and is marked as such.

## Summary

| # | Question | One-line answer |
| --- | --- | --- |
| 1 | Closes windows on its own? | No. Only `close` / `close-all-windows-but-current` (and `--quit-if-last-window`) close anything; both are user-invoked. |
| 2 | Force-assignment pins a workspace? | Yes. `summon-workspace` and `move-workspace-to-monitor` fail for force-assigned workspaces. Disconnect/reconnect is undocumented; source falls back to main/nearest monitor and snaps back on reconnect. |
| 3 | `workspace` vs `summon-workspace` | `workspace` shows it on its assigned monitor; `summon-workspace` drags it to the focused monitor. `focus-monitor` + `summon` = drag to that monitor; `focus-monitor` + `workspace` = no drag. |
| 4 | `enable off` | Hidden windows are unhidden and key bindings released; the in-memory tree is kept, so `enable on` restores membership. Not a full "native macOS" escape hatch. |
| 5 | Separate Spaces / Mission Control / Cmd-Tab | Docs recommend disabling "Displays have separate Spaces". Hidden windows sit 1 px inside a bottom corner; Mission Control shows them tiny; Cmd-Tab to a hidden window switches the workspace. |
| 6 | `on-window-detected` by title | Yes: `if = 'test %{window-title} ~= <regex>'`. Fires for every detected window (second windows included). Titles may be set late. No documented `run` whitelist. |
| 7 | State survives restart/reboot? | No persistence to disk. `reload-config` keeps membership; relaunch and reboot re-bind every window to the workspace visible on its monitor. |
| 8 | `list-*` / `--json` / window ids | `--json` emits the `--format` variables as keys. Window id is the macOS `CGWindowID`: stable across AeroSpace restarts (source), not documented as such. |

## 1. Does AeroSpace ever close a window on its own?

No. The only AX close action is `MacApp.closeWindow` (`S:Sources/AppBundle/tree/MacApp.swift:103-111`, presses `kAXCloseButtonAttribute`), reached solely from `S:Sources/AppBundle/command/impl/CloseCommand.swift`; `--quit-if-last-window` calls `nsApp.terminate()` there. `C#close`: "Normally, you don't need to use this command, because macOS offers its own cmd+w binding." On quit or crash "AeroSpace will place all windows back to the visible area of the screen" (`G` "Emulation of virtual workspaces"). A config could close windows only by binding these commands or putting them in a callback `run`.

## 2. `workspace-to-monitor-force-assignment`

`G` "Assign workspaces to monitors": "assign workspaces to always appear on particular monitors". Patterns: `main`, `secondary` (only when exactly two monitors), 1-based left-to-right number, case-insensitive regex substring, or an array where "the first matching pattern will be used". `C#move-workspace-to-monitor`: "The command fails for workspaces that have monitor force assignment." `summon-workspace` fails the same way in source (`S:Sources/AppBundle/command/impl/SummonWorkspaceCommand.swift`, error "workspace-to-monitor-force-assignment doesn't allow it"), though `C#summon-workspace` does not say so.

Disconnect/reconnect is not documented. Source: `forceAssignedMonitor` resolves patterns against currently connected monitors and returns `nil` when none match (`S:Sources/AppBundle/tree/WorkspaceEx.swift:54-60`, `S:Sources/AppBundle/model/MonitorDescriptionEx.swift`); `workspaceMonitor` then falls back to its last visible/assigned point, else main (`S:Sources/AppBundle/tree/Workspace.swift:108-113`). On any monitor-count change `rearrangeWorkspacesOnMonitors` maps each old screen to the nearest new one (`Workspace.swift:166-190`). Once the monitor is back, `isValidAssignment` refuses to show the workspace anywhere else (`Workspace.swift:196-201`), so the next rearrange or `workspace <name>` puts it on the pinned monitor. Use the array form (`['dell', 'main']`) for a documented fallback.

## 3. `summon-workspace` vs `workspace <name>`

`G` "Multiple monitors": "Each workspace (even invisible, even empty) has a monitor assigned to it ... When you switch to a workspace: AeroSpace takes the assigned monitor of the workspace and makes the workspace visible on the monitor; AeroSpace focuses the workspace." `C#summon-workspace`: "Move the requested workspace to the focused monitor. The moved workspace becomes focused ... In single monitor setup the command is identical to workspace command." `C#focus-monitor` only changes the focused monitor. So `focus-monitor X && summon-workspace W` drags `W` onto `X` (fails if `W` is force-assigned elsewhere), while `workspace W` (with or without a preceding `focus-monitor`) shows `W` on `W`'s own assigned monitor.

## 4. `aerospace enable off` / `on`

`C#enable`: "Temporarily disable window management. When you disable AeroSpace, windows from currently invisible workspaces will be placed to the visible area of the screen. Key events are not intercepted when AeroSpace is disabled." Source: the tree is not torn down; `EnableCommand` flips `isEnabled` and clears the binding mode (`S:Sources/AppBundle/command/impl/EnableCommand.swift`); while disabled, `layoutWorkspaces` unhides every window and AX refreshes are ignored (`S:Sources/AppBundle/layout/refresh.swift:146-162`). `enable on` re-hides windows per the retained membership. Nothing beyond that is documented, and windows opened while disabled are not tracked until re-enable.

## 5. Separate Spaces, Mission Control, Cmd-Tab

`G` "A note on 'Displays have separate Spaces'": "macOS works better and more stable if you disable `Displays have separate Spaces`" (cites issues #101/#247/#289/#333); trade-off when disabled: native fullscreen blacks out the other monitor, status bar only on main. Command: `defaults write com.apple.spaces spans-displays -bool true && killall SystemUIServer`, logout required. Intended workflow: "only have one macOS Space (or as many monitors you have ...) and don't interact with macOS Spaces anymore."

Hiding (`G` "Emulation of virtual workspaces"): inactive workspaces' windows "are placed outside the visible area of the screen, in the bottom right or left corner"; "You will still be able to see a 1 pixel vertical line"; "every monitor has free space in the bottom right or left corner" is required. Cmd-Tab: "Once you switch back to the workspace, (e.g. by the means of workspace command, or cmd + tab) windows are placed back". Mission Control: "mission control doesn't like that AeroSpace puts a lot of windows in the bottom right corner ... shows windows too small"; workaround `defaults write com.apple.dock expose-group-apps -bool true`.

## 6. `on-window-detected`

`G` "'on-window-detected' callback": "run commands every time a new window is detected"; ordered list of `{if, run, check-further-callbacks}`; first matching `if` wins unless `check-further-callbacks`. Title routing: `if = 'test %{window-title} ~= <regex>'` (`C#test`: `~=` is "case insensitive regex"); available variables include `window-title`, `app-bundle-id`, `app-name`, `workspace`, `monitor-id`. Legacy `if.*` keys (soft-deprecated, `G` "Deprecations"; parser `S:Sources/AppBundle/config/parseOnWindowDetected.swift:78-84`): `app-id`, `workspace`, `app-name-regex-substring`, `window-title-regex-substring`, `during-aerospace-startup`. Caveat: "Some windows initialize their title after the window appears. `window-title-regex-substring` may not work as expected for such windows." Workaround from `G` "Environment variables": `exec-and-forget sleep 1; aerospace move-node-to-workspace W` (inherits `AEROSPACE_WINDOW_ID`).

Every registration calls `tryOnWindowDetected` (`S:Sources/AppBundle/tree/MacWindow.swift:19-44`), so second windows of a running app fire too; the one exception is a window id found in the closed-windows cache (screen-lock restore, `S:Sources/AppBundle/tree/frozen/closedWindowsCache.swift:53`). No `run` whitelist is documented; examples use `layout`, `move-node-to-workspace`, `exec-and-forget`. `if` may not use `exec-and-forget`/`eval` (parser flags).

## 7. Persistence

Nothing about layout/membership is written to disk; the only `UserDefaults` use is a UI setting (`S:Sources/AppBundle/ui/ExperimentalUISettings.swift`). Docs mention only `persistent-workspaces` (`G` "config-version", default config). `reload-config` "Reload currently active config" (`C`) leaves the tree alone. On launch each window is bound to `(window centre's monitor).activeWorkspace` (`MacWindow.swift:22-28`, `isStartup` branch) and focus goes to `Workspace.all.first` (`S:Sources/AppBundle/initAppBundle.swift`), so relaunch and reboot lose workspace membership; `during-aerospace-startup` is the documented hook.

## 8. `list-*` output

`C#list-windows`: `--all | --focused | --workspace <ws>... | --monitor <id|all|mouse|focused>...`, `--format`, `--count`, `--json` ("Can be used in combination with `--format` to specify which data to include"). Variables: `window-id`, `window-title`, `app-bundle-id`, `app-name`, `workspace`, `workspace-is-visible`, `monitor-id`, `monitor-name`, `monitor-is-main`. `C#list-workspaces`: `--monitor all --visible` gives the visible workspace per monitor; `--focused` = `--monitor focused --visible`. `C#list-monitors`: `--focused`, `--mouse`. JSON keys equal the variable names (`S:Sources/AppBundle/command/formatToJson.swift:18`). `C#subscribe` streams `window-detected`, `focused-workspace-changed`, `focused-monitor-changed` as JSON lines. Window id comes from `_AXUIElementGetWindow` (`S:Sources/AppBundle/util/accessibility.swift:362-366`), i.e. the window-server `CGWindowID`, which outlives an AeroSpace restart but not the window; the docs make no stability claim.

## Implications for this repo

- Pin the three task workspaces with `workspace-to-monitor-force-assignment` using array fallbacks; then a stray `summon-workspace` fails loudly instead of dragging.
- Use `workspace <name>` for "show it where it lives"; use `focus-monitor` + `summon-workspace` only for unpinned scratch workspaces.
- Never expect AeroSpace to close windows; any cleanup must be an explicit `close --window-id`.
- Snapshot with `list-monitors --json`, `list-workspaces --monitor all --visible --json`, `list-windows --all --json --format '%{window-id} %{workspace} %{app-bundle-id} %{window-title} %{monitor-id}'`.
- Treat window ids as valid only while the window and AeroSpace's host session live; re-resolve by title/bundle after reboot.
- Persist workspace membership in `state/` ourselves; after relaunch, replay it with `move-node-to-workspace --window-id`.
- Route VS Code windows by title regex, but keep a delayed fallback (`exec-and-forget sleep 1; aerospace move-node-to-workspace ...`) because titles arrive late.
- Recommend disabling "Displays have separate Spaces" in setup docs (cost: native fullscreen blacks other monitors).
- `enable off` is a safe pause (membership survives), but windows opened while paused need re-routing on `enable on`.
- Prefer `subscribe` over polling for change detection.

## Unanswered

- Monitor disconnect/reconnect behaviour for force-assigned workspaces is source-only; no doc statement.
- Whether `summon-workspace` failing for force-assigned workspaces is a guarantee (source) or an omission (docs say nothing).
- Window-id stability across AeroSpace restarts is inferred from `CGWindowID`, not documented.
- Whether `on-window-detected` fires for windows first seen while `enable off` is active.
- No documented `run` command whitelist for `on-window-detected`; absence of restriction is inferred from examples and parser.
