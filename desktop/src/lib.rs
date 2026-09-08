#[tauri::command]
fn execute_remote_input(action: String, dx: i32, dy: i32, text: String, key: String) -> Result<(), String> {
  #[cfg(target_os = "linux")]
  {
    let has_ydotool = std::process::Command::new("which")
      .arg("ydotool")
      .output()
      .map(|o| o.status.success())
      .unwrap_or(false);

    let has_xdotool = std::process::Command::new("which")
      .arg("xdotool")
      .output()
      .map(|o| o.status.success())
      .unwrap_or(false);

    if has_ydotool {
      match action.as_str() {
        "move_mouse" => {
          let _ = std::process::Command::new("ydotool")
            .args(["mousemove", "-x", &dx.to_string(), "-y", &dy.to_string()])
            .output();
        }
        "left_click" => {
          let _ = std::process::Command::new("ydotool")
            .args(["click", "0xC0"])
            .output();
        }
        "right_click" => {
          let _ = std::process::Command::new("ydotool")
            .args(["click", "0xC1"])
            .output();
        }
        "middle_click" => {
          let _ = std::process::Command::new("ydotool")
            .args(["click", "0xC2"])
            .output();
        }
        "double_click" => {
          let _ = std::process::Command::new("ydotool").args(["click", "0xC0"]).output();
          let _ = std::process::Command::new("ydotool").args(["click", "0xC0"]).output();
        }
        "type_text" => {
          if !text.is_empty() {
            let _ = std::process::Command::new("ydotool")
              .args(["type", "--", &text])
              .output();
          }
        }
        "press_key" => {
          let key_code = match key.as_str() {
            "Return" | "Enter" => "28:1",
            "Backspace" => "14:1",
            "Space" => "57:1",
            "Escape" | "Esc" => "1:1",
            "Tab" => "15:1",
            _ => "",
          };
          if !key_code.is_empty() {
            let _ = std::process::Command::new("ydotool")
              .args(["key", key_code])
              .output();
          }
        }
        _ => {}
      }
    } else if has_xdotool {
      match action.as_str() {
        "move_mouse" => {
          let dx_str = dx.to_string();
          let dy_str = dy.to_string();
          let _ = std::process::Command::new("xdotool")
            .args(["mousemove_relative", "--", &dx_str, &dy_str])
            .output();
        }
        "left_click" => {
          let _ = std::process::Command::new("xdotool")
            .args(["click", "1"])
            .output();
        }
        "right_click" => {
          let _ = std::process::Command::new("xdotool")
            .args(["click", "3"])
            .output();
        }
        "middle_click" => {
          let _ = std::process::Command::new("xdotool")
            .args(["click", "2"])
            .output();
        }
        "double_click" => {
          let _ = std::process::Command::new("xdotool")
            .args(["click", "--repeat", "2", "1"])
            .output();
        }
        "scroll_up" => {
          let _ = std::process::Command::new("xdotool")
            .args(["click", "4"])
            .output();
        }
        "scroll_down" => {
          let _ = std::process::Command::new("xdotool")
            .args(["click", "5"])
            .output();
        }
        "type_text" => {
          if !text.is_empty() {
            let _ = std::process::Command::new("xdotool")
              .args(["type", "--", &text])
              .output();
          }
        }
        "press_key" => {
          let key_code = match key.as_str() {
            "Return" | "Enter" => "Return",
            "Backspace" => "BackSpace",
            "Space" => "space",
            "Escape" | "Esc" => "Escape",
            "Tab" => "Tab",
            _ => &key,
          };
          if !key_code.is_empty() {
            let _ = std::process::Command::new("xdotool")
              .args(["key", key_code])
              .output();
          }
        }
        _ => {}
      }
    } else {
      eprintln!("[Remote Input] Neither xdotool nor ydotool is installed on this Linux system!");
      return Err("Paket xdotool atau ydotool belum terinstal di Linux PC".into());
    }
  }

  #[cfg(target_os = "windows")]
  {
    match action.as_str() {
      "move_mouse" => {
        let ps_cmd = format!(
          "[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(([System.Windows.Forms.Cursor]::Position.X + {}), ([System.Windows.Forms.Cursor]::Position.Y + {}))",
          dx, dy
        );
        let _ = std::process::Command::new("powershell")
          .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
          .output();
      }
      "left_click" => {
        let _ = std::process::Command::new("powershell")
          .args(["-NoProfile", "-NonInteractive", "-Command", "$w=Add-Type -name W -member '[DllImport(\"user32.dll\")] public static extern void mouse_event(int f,int x,int y,int d,int i);' -pass; $w::mouse_event(6,0,0,0,0)"])
          .output();
      }
      "right_click" => {
        let _ = std::process::Command::new("powershell")
          .args(["-NoProfile", "-NonInteractive", "-Command", "$w=Add-Type -name W -member '[DllImport(\"user32.dll\")] public static extern void mouse_event(int f,int x,int y,int d,int i);' -pass; $w::mouse_event(24,0,0,0,0)"])
          .output();
      }
      "type_text" => {
        if !text.is_empty() {
          let escaped = text.replace('"', "`\"");
          let ps_cmd = format!("Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\"{}\")", escaped);
          let _ = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
            .output();
        }
      }
      _ => {}
    }
  }

  Ok(())
}

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
    .invoke_handler(tauri::generate_handler![execute_remote_input])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
