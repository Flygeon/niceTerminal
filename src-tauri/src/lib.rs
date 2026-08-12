mod commands;
mod error;
mod events;
mod pty;
mod state;

use state::SessionManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(SessionManager::default())
        .invoke_handler(tauri::generate_handler![
            commands::new_session,
            commands::write_to_session,
            commands::resize_session,
            commands::close_session,
            commands::list_sessions,
            commands::resolve_shell,
        ])
        .run(tauri::generate_context!())
        .expect("error while running niceTerminal");
}
