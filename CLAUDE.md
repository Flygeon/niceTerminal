# CLAUDE.md — niceTerminal

Windows-only terminal: **Tauri v2 (Rust)** + **React/TS/Vite** frontend with **xterm.js** and **zustand**.

## Commands

- `npm run dev` — Vite dev server (port 1420; used by `tauri dev`)
- `npm run build` — `tsc` typecheck + vite production build → `dist/`
- `npm run typecheck` — tsc only
- `npm run tauri build` — full release + NSIS bundle (requires Rust + WebView2)
- `cargo test --manifest-path src-tauri/Cargo.toml` — Rust unit tests

**Build environment:** this machine has node + cargo but no `tauri-cli` and no full Tauri build env. **Real builds run in GitHub Actions** (`.github/workflows/build.yml`): every push bundles the NSIS installer; a `v*` tag publishes a Release. Locally we can validate the frontend (`npm run build`) and `cargo check`/`test` the backend.

## Architecture — the event-stream pipeline

```
PTY read thread (blocking, ConPTY)  →  tokio unbounded channel  →  async emitter task
    events/emitter.rs                   coalesces @60fps, 10MB cap            │
        Tauri event "terminal:output" (camelCase JSON)                        ▼
    frontend EventStreamManager  →  requestAnimationFrame flush  →  xterm.write
    src/services/eventStream.ts
```

- Commands: `new_session`, `write_to_session`, `resize_session`, `close_session`, `list_sessions`, `resolve_shell` (`src-tauri/src/commands.rs`).
- One PTY session = one blocking thread (ConPTY reads block) + one async emitter task. Sessions live in `SessionManager` (`state.rs`), keyed by `sess-<hex>`.
- Output cap `MAX_TOTAL_OUTPUT_BYTES = 10MB`: emitter flushes with `isTruncated`, emits `terminal:exit` (reason `truncated`), frontend tears the tab down.
- The frontend **creates the session before the tab** (`src/actions/tabs.ts`), so `TerminalView` always mounts with a live `sessionId`.

## Non-obvious decisions / gotchas

1. **No React.StrictMode.** Its dev double-mount runs effect cleanup, which calls `closeSession()` and kills the PTY. `main.tsx` documents this.
2. **Shell resolution is absolute-path based, never bare-name.** GUI-launched apps don't inherit the user shell PATH. `shell.rs` checks known install locations: pwsh → powershell.exe → cmd.exe; user override wins.
3. **UTF-8 carry in the emitter.** PTY chunks can split a multi-byte char (matters for CJK). `valid_utf8_split` carries the trailing partial sequence across frames. Keep this if you touch `emitter.rs`.
4. **Hidden tabs use `visibility: hidden`, not `display: none`.** `display:none` collapses xterm to 0×0 and breaks fit/resize; visibility keeps layout so sessions survive tab switches.
5. **`decorations: false`** in tauri.conf.json → custom title bar (`TitleBar.tsx`); dragging relies on `data-tauri-drag-region`.
6. **`tauri-plugin-events` does not exist** (design doc error) — Tauri v2 events are core (`@tauri-apps/api/event`).
7. **"ClearType / subpixel AA control" is not achievable** on xterm canvas rendering — the compositor decides. We only control fonts + devicePixelRatio.
8. **`cargo check` requires `dist/`** because `generate_context!()` embeds the built frontend. Run `npm run build` first.
9. **Capabilities** (`src-tauri/capabilities/default.json`) only grant `core:default` + `store:default`. New plugins must add their permissions here.
10. **Config** is `config.json` via `tauri-plugin-store`, keyed under `settings.*`. File-watch hot reload is a deferred milestone.

## Design doc

`设计指南.md` (v2.0) is the product spec. Milestone mapping: walking skeleton (v0.1) covers the terminal engine + theming + tabs + status bar + settings + CI. Deferred: sidebar, find, command guard, hot-reload, git branch, split panes, drag-out windows, SSH, plugins.
