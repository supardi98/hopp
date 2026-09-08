# 🤖 AGENTS.md - Rules for AI Agents Working on Hopp

This file defines strict architectural, performance, and rendering rules that ALL AI agents must follow when modifying the **Hopp** codebase.

---

## ⚡ 1. Event-Driven Performance Architecture (0% Idle CPU)

1. **NO `setInterval` Polling Loops**:
   - **NEVER** use `setInterval` to continuously read system clipboard or check WebSocket status.
   - Use passive, event-driven triggers in React:
     - `window.addEventListener('focus', ...)`
     - `document.addEventListener('visibilitychange', ...)`
     - `window.addEventListener('paste', ...)`
   - For WebSocket status, use `wsClient.onStatusChange` event callbacks to update Zustand store ONLY when state actually changes.

2. **No Unnecessary LocalStorage Serialization Churn**:
   - Do NOT mutate Zustand persistent state on timers (e.g. updating timestamp every 2 seconds). State mutations cause full store serialization and disk writes.

---

## 🐧 2. WebKitGTK & Linux NVIDIA Rendering Guidelines (Zero Glitches)

1. **NO Native HTML `title="..."` Attributes**:
   - **NEVER** add HTML `title="..."` attributes to buttons, spans, or divs.
   - On Linux GTK3 (Ubuntu WebKitGTK), native `title="..."` attributes invoke `GtkTooltipWindow`. Theme parsing mismatches on Linux cause GTK to render native tooltip windows with unstyled orange/peach fallback background boxes.

2. **NO `animate-pulse`, `animate-ping`, or `shadow-lg` on SVG Icons**:
   - Do NOT apply CSS keyframe scaling/opacity animations (`animate-pulse`, `animate-ping`) or heavy box-shadows (`shadow-lg shadow-*`) directly to SVG icons or small icon wrappers.
   - On Linux GTK Cairo SVG rasterizer, SVG masks with CSS layer animations fail color mask initialization and render as solid orange squares (`■`).

3. **NO `backdrop-filter: blur(...)` or `blur-[140px]`**:
   - Do NOT use `backdrop-filter` or large blurred background divs (`blur-[140px]`).
   - On WebKitGTK software fallback mode, `backdrop-filter` layer surfaces fail zero-fill memory initialization, leading to solid orange/peach background boxes.
   - **Use high-opacity solid slate backgrounds** (`rgba(15, 23, 42, 0.95)` / `bg-slate-950/95`) and GPU-native `radial-gradient` backgrounds instead.

4. **Required Environment Variables in Rust**:
   - Always maintain `std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");` in `desktop/src/main.rs` before GTK initialization on Linux target builds to prevent Mesa EGL DRI2 GPU fallback loops on NVIDIA drivers (`10de:1f08`).

5. **Window Background Color**:
   - Always keep `"backgroundColor": "#090d16"` set in `desktop/tauri.conf.json` so GTK window redraws never expose theme fallback colors.

---

## 🧹 3. Storage & Build Cache Management

1. **Target Build Cache**:
   - `desktop/target/` accumulates Rust build artifacts and debug symbols (can take 4+ GB).
   - Maintain the `npm run clean` script (`cargo clean --manifest-path desktop/Cargo.toml && rm -rf web/dist`).
