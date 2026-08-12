//! Windows shell resolution.
//!
//! GUI-launched apps do not inherit the full user PATH, so we must resolve the
//! shell executable to an absolute path instead of relying on PATH lookup.
//! Preference order: explicit override → pwsh (PowerShell 7) → Windows
//! PowerShell 5.1 → cmd.exe.

use serde::Serialize;
use std::env;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellInfo {
    pub name: String,
    pub path: String,
    pub args: Vec<String>,
}

pub fn resolve_shell_path(override_path: Option<&str>) -> ShellInfo {
    if let Some(raw) = override_path {
        let p = raw.trim().trim_matches('"').to_string();
        if !p.is_empty() {
            let name = shell_name(&p);
            return ShellInfo {
                name,
                path: p,
                args: default_args(&name),
            };
        }
    }

    if let Some(p) = find_pwsh() {
        return ShellInfo {
            name: "pwsh".into(),
            path: p,
            args: vec!["-NoLogo".into()],
        };
    }
    if let Some(p) = find_system32("WindowsPowerShell\\v1.0\\powershell.exe") {
        return ShellInfo {
            name: "powershell".into(),
            path: p,
            args: vec!["-NoLogo".into()],
        };
    }
    if let Some(p) = find_system32("cmd.exe") {
        return ShellInfo {
            name: "cmd".into(),
            path: p,
            args: vec![],
        };
    }

    // Last resort: let the OS resolve it from PATH.
    ShellInfo {
        name: "cmd".into(),
        path: "cmd.exe".into(),
        args: vec![],
    }
}

pub fn default_cwd() -> String {
    for key in ["USERPROFILE", "HOME"] {
        if let Ok(v) = env::var(key) {
            if !v.is_empty() {
                return v;
            }
        }
    }
    "C:\\".to_string()
}

fn shell_name(path: &str) -> String {
    let stem = Path::new(path)
        .file_stem()
        .map(|s| s.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    if stem.is_empty() {
        "shell".to_string()
    } else {
        stem
    }
}

fn default_args(name: &str) -> Vec<String> {
    match name {
        "pwsh" | "powershell" => vec!["-NoLogo".into()],
        _ => vec![],
    }
}

fn find_pwsh() -> Option<String> {
    let mut candidates: Vec<PathBuf> = Vec::new();
    for key in ["ProgramFiles", "ProgramW6432", "ProgramFiles(x86)"] {
        if let Ok(base) = env::var(key) {
            candidates.push(PathBuf::from(base).join("PowerShell\\7\\pwsh.exe"));
        }
    }
    if let Ok(local) = env::var("LOCALAPPDATA") {
        candidates.push(PathBuf::from(local).join("Microsoft\\WindowsApps\\pwsh.exe"));
    }
    for c in candidates {
        if c.exists() {
            return Some(c.to_string_lossy().into_owned());
        }
    }
    find_on_path("pwsh.exe")
}

fn find_system32(rel: &str) -> Option<String> {
    if let Ok(root) = env::var("SystemRoot") {
        let p = PathBuf::from(root).join(rel);
        if p.exists() {
            return Some(p.to_string_lossy().into_owned());
        }
    }
    None
}

fn find_on_path(file: &str) -> Option<String> {
    let path = env::var("PATH").ok()?;
    for dir in path.split(';') {
        if dir.is_empty() {
            continue;
        }
        let p = PathBuf::from(dir).join(file);
        if p.exists() {
            return Some(p.to_string_lossy().into_owned());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_returns_a_shell() {
        let info = resolve_shell_path(None);
        assert!(!info.path.is_empty());
        assert!(matches!(info.name.as_str(), "pwsh" | "powershell" | "cmd"));
    }

    #[test]
    fn explicit_override_wins() {
        let info = resolve_shell_path(Some("C:\\Windows\\System32\\cmd.exe"));
        assert_eq!(info.name, "cmd");
        assert_eq!(info.path, "C:\\Windows\\System32\\cmd.exe");
    }

    #[test]
    fn blank_override_falls_through() {
        let info = resolve_shell_path(Some("   "));
        assert!(!info.path.is_empty());
    }
}
