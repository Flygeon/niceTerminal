//! Tauri command layer — thin wrappers over the PTY session module.

use tauri::{AppHandle, State};

use crate::error::AppResult;
use crate::pty::session::{
    close_session, list_sessions, resize_session, spawn_session, write_session, NewSessionRequest,
    SessionInfo,
};
use crate::pty::shell::{resolve_shell_path, ShellInfo};
use crate::state::SessionManager;

#[tauri::command]
pub fn new_session(
    state: State<SessionManager>,
    app: AppHandle,
    request: NewSessionRequest,
) -> AppResult<SessionInfo> {
    spawn_session(&state, app, request)
}

#[tauri::command]
pub fn write_to_session(state: State<SessionManager>, id: String, data: String) -> AppResult<()> {
    write_session(&state, &id, &data)
}

#[tauri::command]
pub fn resize_session(
    state: State<SessionManager>,
    id: String,
    cols: u32,
    rows: u32,
) -> AppResult<()> {
    resize_session(&state, &id, cols, rows)
}

#[tauri::command]
pub fn close_session(state: State<SessionManager>, id: String) -> AppResult<()> {
    close_session(&state, &id)
}

#[tauri::command]
pub fn list_sessions(state: State<SessionManager>) -> Vec<SessionInfo> {
    list_sessions(&state)
}

#[tauri::command]
pub fn resolve_shell(shell_override: Option<String>) -> ShellInfo {
    resolve_shell_path(shell_override.as_deref())
}
