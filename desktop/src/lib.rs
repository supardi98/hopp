fn run_cmd(cmd: &str, args: &[&str]) {
  let display_val = std::env::var("DISPLAY").unwrap_or_else(|_| ":1".to_string());
  match std::process::Command::new(cmd).env("DISPLAY", &display_val).args(args).output() {
    Ok(out) => {
      if !out.status.success() {
        println!("[Remote Exec ERR] {} {:?} -> status: {}, stderr: '{}'", cmd, args, out.status, String::from_utf8_lossy(&out.stderr).trim());
      } else {
        println!("[Remote Exec OK] {} {:?}", cmd, args);
      }
    }
    Err(err) => {
      println!("[Remote Exec Failed] {} {:?} -> {}", cmd, args, err);
    }
  }
}

#[tauri::command]
fn execute_remote_input(action: String, dx: i32, dy: i32, text: String, key: String) -> Result<(), String> {
  println!("[Remote Input Received] action: '{}', dx: {}, dy: {}, text: '{}', key: '{}'", action, dx, dy, text, key);
  #[cfg(target_os = "linux")]
  {
    let has_wtype = std::process::Command::new("which")
      .arg("wtype")
      .output()
      .map(|o| o.status.success())
      .unwrap_or(false);

    let has_ydotool_bin = std::process::Command::new("which")
      .arg("ydotool")
      .output()
      .map(|o| o.status.success())
      .unwrap_or(false);

    let is_ydotoold_running = std::process::Command::new("pgrep")
      .arg("ydotoold")
      .output()
      .map(|o| o.status.success())
      .unwrap_or(false);

    let has_ydotool = has_ydotool_bin && is_ydotoold_running;

    let has_xdotool = std::process::Command::new("which")
      .arg("xdotool")
      .output()
      .map(|o| o.status.success())
      .unwrap_or(false);

    // 1. Text Typing (Wayland native wtype preferred)
    if action == "type_text" {
      if !text.is_empty() {
        let is_unicode_or_complex = text.chars().any(|c| !c.is_ascii() || c == '\n');
        if is_unicode_or_complex {
          let has_wl_copy = std::process::Command::new("which").arg("wl-copy").output().map(|o| o.status.success()).unwrap_or(false);
          let has_xclip = std::process::Command::new("which").arg("xclip").output().map(|o| o.status.success()).unwrap_or(false);

          if has_wl_copy {
            let prev_clip = std::process::Command::new("wl-paste").output().map(|o| String::from_utf8_lossy(&o.stdout).to_string()).unwrap_or_default();

            let child = std::process::Command::new("wl-copy").stdin(std::process::Stdio::piped()).spawn();
            if let Ok(mut c) = child {
              if let Some(stdin) = c.stdin.as_mut() {
                use std::io::Write;
                let _ = stdin.write_all(text.as_bytes());
              }
              let _ = c.wait();
            }

            if has_wtype {
              run_cmd("wtype", &["-M", "ctrl", "-k", "v", "-m", "ctrl"]);
            }
            if has_xdotool {
              run_cmd("xdotool", &["key", "ctrl+v"]);
            }

            std::thread::sleep(std::time::Duration::from_millis(80));
            let restore_child = std::process::Command::new("wl-copy").stdin(std::process::Stdio::piped()).spawn();
            if let Ok(mut c) = restore_child {
              if let Some(stdin) = c.stdin.as_mut() {
                use std::io::Write;
                let _ = stdin.write_all(prev_clip.as_bytes());
              }
              let _ = c.wait();
            }

            return Ok(());
          } else if has_xclip {
            let prev_clip = std::process::Command::new("xclip").args(["-selection", "clipboard", "-o"]).output().map(|o| String::from_utf8_lossy(&o.stdout).to_string()).unwrap_or_default();

            let child = std::process::Command::new("xclip").args(["-selection", "clipboard"]).stdin(std::process::Stdio::piped()).spawn();
            if let Ok(mut c) = child {
              if let Some(stdin) = c.stdin.as_mut() {
                use std::io::Write;
                let _ = stdin.write_all(text.as_bytes());
              }
              let _ = c.wait();
            }

            if has_xdotool {
              run_cmd("xdotool", &["key", "ctrl+v"]);
            }

            std::thread::sleep(std::time::Duration::from_millis(80));
            let restore_child = std::process::Command::new("xclip").args(["-selection", "clipboard"]).stdin(std::process::Stdio::piped()).spawn();
            if let Ok(mut c) = restore_child {
              if let Some(stdin) = c.stdin.as_mut() {
                use std::io::Write;
                let _ = stdin.write_all(prev_clip.as_bytes());
              }
              let _ = c.wait();
            }

            return Ok(());
          }
        }

        // Direct ASCII & Spaces Typing
        if has_wtype {
          run_cmd("wtype", &["--", &text]);
        }
        if has_ydotool {
          run_cmd("ydotool", &["type", "--", &text]);
        }
        if has_xdotool {
          run_cmd("xdotool", &["type", "--", &text]);
        }

        return Ok(());
      }
    }

    // 2. Key Press (Multi-Engine Dispatch for Wayland & XWayland apps)
    if action == "press_key" {
      match key.as_str() {
        "Space" | "space" | " " => {
          if has_wtype {
            run_cmd("wtype", &["--", " "]);
          }
          if has_ydotool {
            run_cmd("ydotool", &["type", "--", " "]);
          }
          if has_xdotool {
            run_cmd("xdotool", &["type", "--", " "]);
            run_cmd("xdotool", &["key", "space"]);
          }
        }
        "Backspace" | "BackSpace" => {
          if has_ydotool {
            run_cmd("ydotool", &["key", "14:1", "14:0"]);
          }
          if has_wtype {
            run_cmd("wtype", &["-k", "BackSpace"]);
          }
          if has_xdotool {
            run_cmd("xdotool", &["key", "BackSpace"]);
          }
        }
        "Return" | "Enter" => {
          if has_ydotool {
            run_cmd("ydotool", &["key", "28:1", "28:0"]);
          }
          if has_wtype {
            run_cmd("wtype", &["-k", "Return"]);
          }
          if has_xdotool {
            run_cmd("xdotool", &["key", "Return"]);
          }
        }
        "Tab" => {
          if has_ydotool {
            run_cmd("ydotool", &["key", "15:1", "15:0"]);
          }
          if has_wtype {
            run_cmd("wtype", &["-k", "Tab"]);
          }
          if has_xdotool {
            run_cmd("xdotool", &["key", "Tab"]);
          }
        }
        "Ctrl_down" | "ctrl_down" => {
          if has_wtype { run_cmd("wtype", &["-M", "ctrl"]); }
          if has_xdotool { run_cmd("xdotool", &["keydown", "Control_L"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "29:1"]); }
        }
        "Ctrl_up" | "ctrl_up" => {
          if has_wtype { run_cmd("wtype", &["-m", "ctrl"]); }
          if has_xdotool { run_cmd("xdotool", &["keyup", "Control_L"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "29:0"]); }
        }
        "Alt_down" | "alt_down" => {
          if has_wtype { run_cmd("wtype", &["-M", "alt"]); }
          if has_xdotool { run_cmd("xdotool", &["keydown", "Alt_L"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "56:1"]); }
        }
        "Alt_up" | "alt_up" => {
          if has_wtype { run_cmd("wtype", &["-m", "alt"]); }
          if has_xdotool { run_cmd("xdotool", &["keyup", "Alt_L"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "56:0"]); }
        }
        "Shift_down" | "shift_down" => {
          if has_wtype { run_cmd("wtype", &["-M", "shift"]); }
          if has_xdotool { run_cmd("xdotool", &["keydown", "Shift_L"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "42:1"]); }
        }
        "Shift_up" | "shift_up" => {
          if has_wtype { run_cmd("wtype", &["-m", "shift"]); }
          if has_xdotool { run_cmd("xdotool", &["keyup", "Shift_L"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "42:0"]); }
        }
        "Win_down" | "win_down" | "Super_down" => {
          if has_wtype { run_cmd("wtype", &["-M", "logo"]); }
          if has_xdotool { run_cmd("xdotool", &["keydown", "Super_L"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "125:1"]); }
        }
        "Win_up" | "win_up" | "Super_up" => {
          if has_wtype { run_cmd("wtype", &["-m", "logo"]); }
          if has_xdotool { run_cmd("xdotool", &["keyup", "Super_L"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "125:0"]); }
        }
        "Ctrl+c" | "ctrl+c" | "Ctrl+C" => {
          if has_wtype { run_cmd("wtype", &["-M", "ctrl", "-k", "c", "-m", "ctrl"]); }
          if has_xdotool { run_cmd("xdotool", &["key", "ctrl+c"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "29:1", "46:1", "46:0", "29:0"]); }
        }
        "Ctrl+v" | "ctrl+v" | "Ctrl+V" => {
          if has_wtype { run_cmd("wtype", &["-M", "ctrl", "-k", "v", "-m", "ctrl"]); }
          if has_xdotool { run_cmd("xdotool", &["key", "ctrl+v"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "29:1", "47:1", "47:0", "29:0"]); }
        }
        "Ctrl+a" | "ctrl+a" | "Ctrl+A" => {
          if has_wtype { run_cmd("wtype", &["-M", "ctrl", "-k", "a", "-m", "ctrl"]); }
          if has_xdotool { run_cmd("xdotool", &["key", "ctrl+a"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "29:1", "30:1", "30:0", "29:0"]); }
        }
        "Ctrl+z" | "ctrl+z" | "Ctrl+Z" => {
          if has_wtype { run_cmd("wtype", &["-M", "ctrl", "-k", "z", "-m", "ctrl"]); }
          if has_xdotool { run_cmd("xdotool", &["key", "ctrl+z"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "29:1", "44:1", "44:0", "29:0"]); }
        }
        "Ctrl+x" | "ctrl+x" | "Ctrl+X" => {
          if has_wtype { run_cmd("wtype", &["-M", "ctrl", "-k", "x", "-m", "ctrl"]); }
          if has_xdotool { run_cmd("xdotool", &["key", "ctrl+x"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "29:1", "45:1", "45:0", "29:0"]); }
        }
        "Alt+Tab" | "alt+tab" => {
          if has_wtype { run_cmd("wtype", &["-M", "alt", "-k", "Tab", "-m", "alt"]); }
          if has_xdotool { run_cmd("xdotool", &["key", "alt+Tab"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "56:1", "15:1", "15:0", "56:0"]); }
        }
        "Super" | "Win" | "Super_L" => {
          if has_wtype { run_cmd("wtype", &["-k", "Super_L"]); }
          if has_xdotool { run_cmd("xdotool", &["key", "Super_L"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "125:1", "125:0"]); }
        }
        "Up" | "ArrowUp" => {
          if has_wtype { run_cmd("wtype", &["-k", "Up"]); }
          if has_xdotool { run_cmd("xdotool", &["key", "Up"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "103:1", "103:0"]); }
        }
        "Down" | "ArrowDown" => {
          if has_wtype { run_cmd("wtype", &["-k", "Down"]); }
          if has_xdotool { run_cmd("xdotool", &["key", "Down"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "108:1", "108:0"]); }
        }
        "Left" | "ArrowLeft" => {
          if has_wtype { run_cmd("wtype", &["-k", "Left"]); }
          if has_xdotool { run_cmd("xdotool", &["key", "Left"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "105:1", "105:0"]); }
        }
        "Right" | "ArrowRight" => {
          if has_wtype { run_cmd("wtype", &["-k", "Right"]); }
          if has_xdotool { run_cmd("xdotool", &["key", "Right"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "106:1", "106:0"]); }
        }
        "Delete" | "Del" => {
          if has_wtype { run_cmd("wtype", &["-k", "Delete"]); }
          if has_xdotool { run_cmd("xdotool", &["key", "Delete"]); }
          if has_ydotool { run_cmd("ydotool", &["key", "111:1", "111:0"]); }
        }
        _ => {
          let has_plus = key.contains('+');
          if has_plus {
            let parts: Vec<&str> = key.split('+').collect();
            let mut wtype_args: Vec<&str> = Vec::new();

            for p in &parts[..parts.len() - 1] {
              let p_lower = p.to_lowercase();
              let mod_name = match p_lower.as_str() {
                "ctrl" | "control" => "ctrl",
                "alt" => "alt",
                "shift" => "shift",
                "win" | "super" => "logo",
                _ => p,
              };
              wtype_args.push("-M");
              wtype_args.push(mod_name);
            }

            let main_key = parts[parts.len() - 1];
            wtype_args.push("-k");
            wtype_args.push(main_key);

            for p in (&parts[..parts.len() - 1]).iter().rev() {
              let p_lower = p.to_lowercase();
              let mod_name = match p_lower.as_str() {
                "ctrl" | "control" => "ctrl",
                "alt" => "alt",
                "shift" => "shift",
                "win" | "super" => "logo",
                _ => p,
              };
              wtype_args.push("-m");
              wtype_args.push(mod_name);
            }

            if has_wtype {
              run_cmd("wtype", &wtype_args);
            }
            if has_xdotool {
              let xdo_key = key.to_lowercase();
              run_cmd("xdotool", &["key", &xdo_key]);
            }
          } else {
            if has_wtype {
              run_cmd("wtype", &["-k", &key]);
            }
            if has_xdotool {
              run_cmd("xdotool", &["key", &key]);
            }
          }
        }
      }
      return Ok(());
    }

    // 3. Mouse Movement & Clicks
    if has_ydotool {
      match action.as_str() {
        "move_mouse" => {
          let dx_str = dx.to_string();
          let dy_str = dy.to_string();
          run_cmd("ydotool", &["mousemove", "-x", &dx_str, "-y", &dy_str]);
        }
        "left_click" => {
          run_cmd("ydotool", &["click", "0xC0"]);
        }
        "left_down" => {
          run_cmd("ydotool", &["click", "0x40"]);
        }
        "left_up" => {
          run_cmd("ydotool", &["click", "0x80"]);
        }
        "right_click" => {
          run_cmd("ydotool", &["click", "0xC1"]);
        }
        "middle_click" => {
          run_cmd("ydotool", &["click", "0xC2"]);
        }
        "double_click" => {
          run_cmd("ydotool", &["click", "0xC0"]);
          run_cmd("ydotool", &["click", "0xC0"]);
        }
        "scroll_up" => {
          run_cmd("ydotool", &["mousemove", "-w", "-x", "0", "-y", "5"]);
          if has_xdotool {
            run_cmd("xdotool", &["click", "4"]);
          }
        }
        "scroll_down" => {
          run_cmd("ydotool", &["mousemove", "-w", "-x", "0", "-y", "-5"]);
          if has_xdotool {
            run_cmd("xdotool", &["click", "5"]);
          }
        }
        _ => {}
      }
    } else if has_xdotool {
      let dx_str = dx.to_string();
      let dy_str = dy.to_string();
      match action.as_str() {
        "move_mouse" => {
          run_cmd("xdotool", &["mousemove_relative", "--", &dx_str, &dy_str]);
        }
        "left_click" => {
          run_cmd("xdotool", &["click", "1"]);
        }
        "left_down" => {
          run_cmd("xdotool", &["mousedown", "1"]);
        }
        "left_up" => {
          run_cmd("xdotool", &["mouseup", "1"]);
        }
        "right_click" => {
          run_cmd("xdotool", &["click", "3"]);
        }
        "middle_click" => {
          run_cmd("xdotool", &["click", "2"]);
        }
        "double_click" => {
          run_cmd("xdotool", &["click", "--repeat", "2", "1"]);
        }
        "scroll_up" => {
          run_cmd("xdotool", &["click", "4"]);
        }
        "scroll_down" => {
          run_cmd("xdotool", &["click", "5"]);
        }
        _ => {}
      }
    } else {
      eprintln!("[Remote Input] Neither ydotool nor xdotool is installed on this Linux system!");
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
      "left_down" => {
        let _ = std::process::Command::new("powershell")
          .args(["-NoProfile", "-NonInteractive", "-Command", "$w=Add-Type -name W -member '[DllImport(\"user32.dll\")] public static extern void mouse_event(int f,int x,int y,int d,int i);' -pass; $w::mouse_event(2,0,0,0,0)"])
          .output();
      }
      "left_up" => {
        let _ = std::process::Command::new("powershell")
          .args(["-NoProfile", "-NonInteractive", "-Command", "$w=Add-Type -name W -member '[DllImport(\"user32.dll\")] public static extern void mouse_event(int f,int x,int y,int d,int i);' -pass; $w::mouse_event(4,0,0,0,0)"])
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
