//! Rust-side output buffer ("Buffer Manager" in the design doc).
//!
//! A dedicated async task per session coalesces raw PTY chunks into ~60fps
//! frames and emits them over Tauri events (`terminal:output`). It also
//! enforces the per-session output cap (default 10MB): once exceeded the
//! stream is truncated, the session is flagged, and an exit event is emitted
//! so the frontend can tear the tab down.
//!
//! UTF-8 safety: PTY chunks can split a multi-byte character across frames.
//! We carry the trailing partial sequence across flushes so CJK output is
//! never corrupted at frame boundaries.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc::UnboundedReceiver;

pub const OUTPUT_EVENT: &str = "terminal:output";
pub const EXIT_EVENT: &str = "terminal:exit";

const FLUSH_INTERVAL_MS: u64 = 16;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOutputEvent {
    pub session_id: String,
    pub data: String,
    pub frame_id: u64,
    pub is_truncated: bool,
    pub total_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalExitEvent {
    pub session_id: String,
    pub reason: String,
}

/// Coalescing emitter task. Runs until the channel closes (EOF) or the output
/// cap is hit.
pub async fn run_emitter(
    app: AppHandle,
    session_id: String,
    mut rx: UnboundedReceiver<Vec<u8>>,
    total_bytes: Arc<AtomicU64>,
    max_total: u64,
) {
    let mut buf: Vec<u8> = Vec::with_capacity(32 * 1024);
    let mut carry: Vec<u8> = Vec::with_capacity(4);
    let mut frame_id: u64 = 0;

    let mut ticker = tokio::time::interval(Duration::from_millis(FLUSH_INTERVAL_MS));
    ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

    loop {
        tokio::select! {
            chunk = rx.recv() => {
                match chunk {
                    Some(c) => {
                        let new_total = total_bytes.fetch_add(c.len() as u64, Ordering::Relaxed)
                            + c.len() as u64;
                        if new_total > max_total {
                            flush(
                                &app, &session_id, &mut buf, &mut carry,
                                &mut frame_id, true, new_total,
                            );
                            let _ = app.emit(
                                EXIT_EVENT,
                                TerminalExitEvent {
                                    session_id: session_id.clone(),
                                    reason: "truncated".into(),
                                },
                            );
                            return;
                        }
                        buf.extend_from_slice(&c);
                    }
                    None => {
                        flush(
                            &app, &session_id, &mut buf, &mut carry,
                            &mut frame_id, false, total_bytes.load(Ordering::Relaxed),
                        );
                        let _ = app.emit(
                            EXIT_EVENT,
                            TerminalExitEvent {
                                session_id: session_id.clone(),
                                reason: "eof".into(),
                            },
                        );
                        return;
                    }
                }
            }
            _ = ticker.tick() => {
                flush(
                    &app, &session_id, &mut buf, &mut carry,
                    &mut frame_id, false, total_bytes.load(Ordering::Relaxed),
                );
            }
        }
    }
}

fn flush(
    app: &AppHandle,
    session_id: &str,
    buf: &mut Vec<u8>,
    carry: &mut Vec<u8>,
    frame_id: &mut u64,
    truncated: bool,
    total: u64,
) {
    if buf.is_empty() && !truncated {
        return;
    }
    let chunk = std::mem::take(buf);

    let mut full = Vec::with_capacity(carry.len() + chunk.len());
    full.append(carry);
    full.extend_from_slice(&chunk);

    let split = valid_utf8_split(&full);
    let data = String::from_utf8_lossy(&full[..split]).into_owned();
    carry.extend_from_slice(&full[split..]);

    let _ = app.emit(
        OUTPUT_EVENT,
        TerminalOutputEvent {
            session_id: session_id.to_string(),
            data,
            frame_id: *frame_id,
            is_truncated: truncated,
            total_bytes: total,
        },
    );
    *frame_id += 1;
}

/// Longest prefix of `data` that is valid UTF-8. A trailing partial sequence
/// (up to 3 bytes) is left for the caller to carry over to the next frame.
fn valid_utf8_split(data: &[u8]) -> usize {
    let n = data.len();
    for drop in 0..=3.min(n) {
        let end = n - drop;
        if std::str::from_utf8(&data[..end]).is_ok() {
            return end;
        }
    }
    n
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_keeps_partial_utf8_tail() {
        // "你好" = 6 bytes. Split it so a 4-byte prefix is valid UTF-8.
        let s = "你好".as_bytes();
        let split = valid_utf8_split(&s[..4]);
        assert_eq!(split, 3); // first 汉 (3 bytes)
        assert!(std::str::from_utf8(&s[..split]).is_ok());
    }

    #[test]
    fn split_full_valid_data() {
        let s = b"hello world";
        assert_eq!(valid_utf8_split(s), s.len());
    }

    #[test]
    fn split_handles_ascii_tail() {
        let s = "abc".as_bytes();
        assert_eq!(valid_utf8_split(s), 3);
    }
}
