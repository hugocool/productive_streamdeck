# config/AGENTS.md

This folder contains templates/config that express stable “physics layer” invariants (AeroSpace).

## Scope
- `config/aerospace.toml` is a template; users copy it to `~/.aerospace.toml` and customize bundle IDs.

## Guidance
- Keep config minimal and predictable (routing + persistence + event hook).
- Avoid hard-coding task/branch naming in the config until task tracker sync is implemented; prefer a stable base set of workspaces and let Node map “task branches” dynamically.
- If adopting the “manual tracking + inbox” default, prefer an `INBOX` workspace for untracked windows (and avoid aggressive per-app routing unless it’s explicitly part of the chosen workflow).
- Debug note: `exec-on-workspace-change` is easy to “silently break” if the controller port changes; keep the port stable or regenerate the config from the same source of truth.
