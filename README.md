# niceTerminal

> 颜值与性能并存，个性与规范统一 — a third-party Windows terminal built on **Tauri v2 + React + TypeScript + xterm.js**.

![](https://img.shields.io/badge/platform-Windows%2010%2B-0078d6)

`niceTerminal` is an event-streamed, Material-Design-3-inspired terminal for Windows. It renders with xterm.js, talks to a Rust backend that owns ConPTY sessions, and streams output over Tauri events instead of blocking request/response calls.

**This is the walking-skeleton milestone (v0.1):** a real, usable terminal end-to-end, built entirely in CI because the primary dev machine has no Tauri build environment.

---

## What works (v0.1 walking skeleton)

- ✅ Real PTY sessions over **ConPTY** — auto-detects `pwsh` (PowerShell 7) → `powershell.exe` → `cmd.exe`
- ✅ Event-driven streaming: Rust-side buffer coalesces PTY chunks into ~60fps frames → Tauri events → frontend render throttle
- ✅ 10MB per-session output cap (truncation + session teardown)
- ✅ Multi-tab, with sessions kept alive across tab switches (hidden panes stay mounted)
- ✅ Material You theming — the **whole window** (chrome + terminal) follows one MD3 dynamic-color scheme; pick a seed color (violet/blue/teal/green/orange/pink) and light/dark
- ✅ Status bar with live current-directory tracking (parses `cd`), tab count, settings
- ✅ Settings panel — theme, mode, font size/family, status-bar density, shell override — persisted to `config.json` via `tauri-plugin-store`
- ✅ Custom title bar (drag region + window controls)
- ✅ CI pipeline producing an NSIS installer as a downloadable artifact
- ✅ Copy (Ctrl+Shift+C) / paste (Ctrl+V), Ctrl+T new tab, Ctrl+W close tab
- ✅ **In-terminal find (Ctrl+F)** — live highlight-as-you-type with theme-aware match colors, ⏎/⇧⏎ navigation, Esc to close
- ✅ **Quick-action toolbar (§7.5)** — copy / paste / find / clear / interrupt (Ctrl+C), hideable to a ⋯ pill

## Deferred to later milestones (from 设计指南.md)

| Item | Phase |
|---|---|
| Command guard (rm -rf / fork bomb), output-truncation status warning | 1 |
| Config file hot-reload via fs watch | 1 |
| Session sidebar / file tree | 1.5 |
| Git branch in status bar | 1.5 |
| Split panes, tab drag-out to new windows | 1.5 |
| SSH, keyring, encrypted command history | 1.5 |
| Plugin runtime, plugin marketplace, AI suggestions | 2/3 |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│ Frontend (React + TS)                                                  │
│  ┌──────────┐   ┌───────────────────────────────┐                      │
│  │ xterm.js │ ← │ EventStreamManager (60fps)    │  src/services/       │
│  └────▲─────┘   └───────────────▲───────────────┘  eventStream.ts      │
│       │ Tauri events            │ fan-out                             │
│  ┌────┴─────────────────────────┴───────────────┐                      │
│  │ Tauri Commands  ·  src-tauri/src/commands.rs  │                      │
│  └───────────────┬───────────────────────────────┘                      │
│  ┌───────────────▼───────────────┐   ┌───────────────────────────┐      │
│  │ SessionManager (state.rs)     │   │ Emitter: buffer + truncate│      │
│  │ spawn / write / resize / kill │──→│ events/emitter.rs         │      │
│  └───────────────┬───────────────┘   └────────────▲──────────────┘      │
│                  │ read loop (blocking thread)    │ tokio channel       │
│  ┌───────────────▼───────────────┐   ┌────────────┴──────────────┐       │
│  │  portable-pty (ConPTY)        │   │  session.rs + shell.rs    │       │
│  └───────────────┬───────────────┘   └───────────────────────────┘      │
│                  ▼                                                      │
│        pwsh / powershell / cmd                                          │
└────────────────────────────────────────────────────────────────────────┘
```

Key files:

| Area | Files |
|---|---|
| Frontend | `src/App.tsx`, `src/components/*`, `src/hooks/useTerminal.ts` |
| Rendering throttle | `src/services/eventStream.ts` |
| Tauri glue | `src/services/terminal.ts`, `src/services/config.ts` |
| State | `src/stores/sessions.ts`, `src/stores/settings.ts` |
| Theming | `src/services/themeService.ts` |
| PTY lifecycle | `src-tauri/src/pty/session.rs` |
| Shell resolution | `src-tauri/src/pty/shell.rs` |
| Output buffering | `src-tauri/src/events/emitter.rs` |

---

## Development

### Prerequisites

- **Node 20+** and npm
- **Rust stable** (for `tauri dev` / `tauri build`)
- **WebView2 Runtime** (preinstalled on Windows 10/11)

### Local dev (full toolchain)

```bash
npm install
npm run tauri dev          # hot-reload dev server + app
```

### Build via CI (no local Rust/WebView2 toolchain)

The primary workflow for this project is **GitHub Actions**:

1. Push to `main` → the **Tauri build** job compiles Rust and bundles the NSIS installer.
2. Download `niceTerminal-windows-x64` from the Actions run → it's the `.exe` installer.
3. Tag `v0.1.0` (matching `tauri.conf.json` version) → the **release** job publishes a GitHub Release with the installer attached.

```bash
git tag v0.1.0 && git push origin v0.1.0
```

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server (for `tauri dev`) |
| `npm run build` | Typecheck + production bundle |
| `npm run typecheck` | TS typecheck only |
| `npm run tauri build` | Full release build + NSIS bundle |
| `node scripts/gen-icon.mjs` | Regenerate `src-tauri/icons/icon-source.png` |
| `npx @tauri-apps/cli icon src-tauri/icons/icon-source.png -o src-tauri/icons` | Re-derive icon set |

---

## Configuration

Settings live in `config.json` (app config dir, via `tauri-plugin-store`). All edits from the settings panel persist and apply live. External file hot-reload is a deferred milestone.

---

## Releases & signing

- Installers are currently **unsigned** → Windows SmartScreen shows a warning. To remove it you need a code-signing certificate (e.g. Azure Trusted Signing / self-signed + manual trust).
- To add auto-updates (`tauri-plugin-updater`) you also need a Tauri signing key — see the [Tauri updater docs](https://tauri.app/plugin/updater/).

---

## Roadmap (from 设计指南.md)

- **Phase 1 (v1.0):** the walking skeleton above, plus sidebar session list, terminal find, sensitive-command guard, output-truncation warning, config hot-reload, plugin API hook definitions.
- **Phase 1.5:** split panes + global drag, tabs out to windows, SSH + keyring, encrypted history, command suggestions, file-tree sidebar.
- **Phase 2 (v2.0):** plugin marketplace, cloud config sync, AI command suggestions, perf monitor, theme sharing.

## License

MIT (TBD).
