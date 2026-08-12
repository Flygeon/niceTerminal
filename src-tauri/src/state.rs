use std::collections::HashMap;
use std::sync::atomic::AtomicU64;
use std::sync::{Arc, Mutex};

use portable_pty::{Child, MasterPty};

/// A single live PTY session. The master + writer + child are owned here;
/// the read loop and the async emitter run detached and only share the
/// `total_bytes` counter.
pub struct Session {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Mutex<Box<dyn std::io::Write + Send>>,
    pub child: Mutex<Box<dyn Child + Send + Sync>>,
    pub shell: String,
    pub shell_path: String,
    pub cwd: String,
    pub total_bytes: Arc<AtomicU64>,
    pub started_at: u64,
}

#[derive(Default)]
pub struct SessionManager {
    pub sessions: Mutex<HashMap<String, Session>>,
}
