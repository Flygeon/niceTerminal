//! PTY session lifecycle: spawn, write, resize, close.
//!
//! Windows ConPTY via `portable-pty`. Each session runs one blocking read
//! thread (ConPTY reads block until data arrives) that forwards raw bytes to a
//! tokio channel; the async emitter task coalesces and emits them to the UI.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tokio::sync::mpsc::unbounded_channel;

use crate::error::{AppError, AppResult};
use crate::events::emitter::run_emitter;
use crate::pty::shell::{default_cwd, resolve_shell_path};
use crate::state::{Session, SessionManager};

/// Output cap per session. Beyond this the stream is truncated (design doc §1.3).
pub const MAX_TOTAL_OUTPUT_BYTES: u64 = 10 * 1024 * 1024;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub id: String,
    pub shell: String,
    pub shell_path: String,
    pub cwd: String,
    pub started_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewSessionRequest {
    pub cols: u32,
    pub rows: u32,
    pub cwd: Option<String>,
    pub shell: Option<String>,
}

pub fn spawn_session(
    state: &SessionManager,
    app: AppHandle,
    req: NewSessionRequest,
) -> AppResult<SessionInfo> {
    let shell = resolve_shell_path(req.shell.as_deref());
    let cwd = match req.cwd.as_deref() {
        Some(c) if !c.trim().is_empty() => c.to_string(),
        _ => default_cwd(),
    };

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: req.rows as u16,
            cols: req.cols as u16,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(AppError::from)?;

    let mut cmd = CommandBuilder::new(&shell.path);
    for arg in &shell.args {
        cmd.arg(arg);
    }
    cmd.cwd(&cwd);
    cmd.env("TERM", "xterm-256color");

    let child = pair.slave.spawn_command(cmd).map_err(AppError::from)?;
    drop(pair.slave);

    let writer = pair.master.take_writer().map_err(AppError::from)?;
    let reader = pair.master.try_clone_reader().map_err(AppError::from)?;

    let id = new_session_id();
    let total_bytes = Arc::new(AtomicU64::new(0));

    let (tx, rx) = unbounded_channel::<Vec<u8>>();

    // Blocking read loop. ConPTY returns bytes as the shell produces them.
    std::thread::spawn(move || {
        let mut reader = reader;
        let mut buf = vec![0u8; 16 * 1024];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = buf[..n].to_vec();
                    if tx.send(chunk).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });

    // Async coalescing emitter → frontend events.
    let _ = tauri::async_runtime::spawn(run_emitter(
        app.clone(),
        id.clone(),
        rx,
        total_bytes.clone(),
        MAX_TOTAL_OUTPUT_BYTES,
    ));

    state.sessions.lock().unwrap().insert(
        id.clone(),
        Session {
            master: pair.master,
            writer: Mutex::new(writer),
            child: Mutex::new(child),
            shell: shell.name.clone(),
            shell_path: shell.path.clone(),
            cwd: cwd.clone(),
            total_bytes,
            started_at: now_ms(),
        },
    );

    Ok(SessionInfo {
        id,
        shell: shell.name,
        shell_path: shell.path,
        cwd,
        started_at: now_ms(),
    })
}

pub fn write_session(state: &SessionManager, id: &str, data: &str) -> AppResult<()> {
    let mut sessions = state.sessions.lock().unwrap();
    let session = sessions
        .get_mut(id)
        .ok_or_else(|| AppError(format!("session not found: {id}")))?;
    let mut guard = session.writer.lock().unwrap();
    guard.write_all(data.as_bytes()).map_err(AppError::from)?;
    let _ = guard.flush();
    Ok(())
}

pub fn resize_session(state: &SessionManager, id: &str, cols: u32, rows: u32) -> AppResult<()> {
    let mut sessions = state.sessions.lock().unwrap();
    let session = sessions
        .get_mut(id)
        .ok_or_else(|| AppError(format!("session not found: {id}")))?;
    session
        .master
        .resize(PtySize {
            rows: rows as u16,
            cols: cols as u16,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(AppError::from)
}

pub fn close_session(state: &SessionManager, id: &str) -> AppResult<()> {
    let mut sessions = state.sessions.lock().unwrap();
    if let Some(session) = sessions.remove(id) {
        let mut guard = session.child.lock().unwrap();
        let _ = guard.kill();
    }
    Ok(())
}

pub fn list_sessions(state: &SessionManager) -> Vec<SessionInfo> {
    let sessions = state.sessions.lock().unwrap();
    sessions
        .iter()
        .map(|(id, s)| SessionInfo {
            id: id.clone(),
            shell: s.shell.clone(),
            shell_path: s.shell_path.clone(),
            cwd: s.cwd.clone(),
            started_at: s.started_at,
        })
        .collect()
}

fn new_session_id() -> String {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("sess-{:08x}", n)
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
