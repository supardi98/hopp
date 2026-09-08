pub mod server;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  #[cfg(target_os = "linux")]
  {
    if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
      std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
  }

  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Start embedded serverless WebSocket relay server inside active Tokio runtime
      server::start_embedded_server();

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
