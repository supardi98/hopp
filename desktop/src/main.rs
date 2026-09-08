// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  #[cfg(target_os = "linux")]
  {
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    std::env::set_var("MESA_LOG_LEVEL", "error");
    std::env::set_var("EGL_LOG_LEVEL", "fatal");
  }

  app_lib::run();
}
