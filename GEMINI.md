# 🤖 GEMINI.md - AI Coding Assistant & Project Context for Hopp

Dokumen ini berisi panduan teknis, arsitektur monorepo, dan standar pengkodean untuk AI agent/assistant (Gemini/Antigravity) saat bekerja di codebase **Hopp**.

---

## 📌 Gambaran Umum Proyek

**Hopp** adalah aplikasi penyinkron clipboard 2-arah real-time cross-platform (Web, Linux, Windows, Android) dengan enkripsi AES-256-GCM End-to-End tanpa login.

---

## 🏗️ Struktur Arsitektur Monorepo

1. **`web/`**
   - **Framework**: React 18 + Vite + TypeScript + TailwindCSS.
   - **State Management**: Zustand dengan `persist` middleware.
   - **Storage**: IndexedDB (`web/src/utils/storageDB.ts`) untuk payload file/gambar biner besar + `localStorage` untuk metadata.
   - **Crypto**: Web Crypto API (AES-256-GCM + PBKDF2). `effectivePassphrase = secretKey + '_' + roomCode`.

2. **`desktop/`**
   - **Framework**: Tauri v2 + Rust backend wrapper.
   - **Dist/Build Target**: Membungkus build output dari `web/dist`.

3. **`server/`**
   - **Engine**: Node.js + `ws` library (WebSocket Relay).
   - **Port**: 8080.
   - **Max Payload**: 15 MB.
   - **Docker**: `Dockerfile` & `docker-compose.yml` terintegrasi.

---

## ⚙️ Aturan Bisnis, Performa & Perilaku Kunci

1. **Zero-Login Multi-Room Isolation**:
   - Perangkat diisolasi berdasarkan Kode Room (`HOPP-XXXX`).
   - Tidak ada default room `HOPP-PUBLIC`. Setiap user memakai/membuat Kode Room unik.

2. **Pengelolaan File & Gambar**:
   - Limit Mobile (Android): Maksimal 2 MB.
   - Limit Web / Desktop: Maksimal 10 MB.
   - Gambar & File disimpan di IndexedDB secara asinkron (mencegah `localStorage` quota exceeded / UI freeze).

3. **Auto-Hapus & Proteksi Pinned**:
   - Item unpinned terhapus otomatis setelah 24 jam tidak aktif dihitung dari koneksi terakhir (`lastConnectedTimestamp`).
   - Item yang di-pin (`pinned: true`) **100% terproteksi** dari auto-hapus.

4. **⚡ Arsitektur Performa Event-Driven (0% CPU Idle)**:
   - **Dilarang keras menggunakan `setInterval`** untuk memuat/memeriksa clipboard OS atau status koneksi.
   - Gunakan event listener pasif (`window.onfocus`, `document.onvisibilitychange`, `window.onpaste`) untuk membaca clipboard.
   - Gunakan event listener `wsClient.onStatusChange` untuk status WebSocket tanpa mutasi state berulang.

5. **🐧 Aturan Rendering WebKitGTK (Linux NVIDIA Fix & 0 Glitch)**:
   - **Tanpa Atribut `title="..."`**: Dilarang menggunakan atribut native HTML `title="..."` pada tombol/elemen UI karena memicu `GtkTooltipWindow` native Linux GTK yang glitchy (kotak oranye fallback).
   - **Tanpa `animate-pulse` / `animate-ping` / `shadow-lg` pada SVG Icon**: Efek ini memicu kesalahan rasterisasi SVG Cairo di WebKitGTK.
   - **Tanpa `backdrop-filter: blur(...)` / `blur-[140px]`**: Gunakan warna background solid/high-opacity (`rgba(15, 23, 42, 0.95)`) dan GPU-native `radial-gradient`.
   - **Environment Variable WebKitGTK**: Selalu pertahankan `WEBKIT_DISABLE_DMABUF_RENDERER=1` di `desktop/src/main.rs` sebelum GTK dimuat untuk mencegah Mesa EGL DRI2 fallback loop pada driver NVIDIA (`10de:1f08`).
   - **Window Background Color**: Selalu tetapkan `"backgroundColor": "#090d16"` di `desktop/tauri.conf.json`.

---

## 🛠️ Perintah Pengembangan Utama

```bash
# Menjalankan WebSocket relay server
npm run server

# Menjalankan Web Dev Server (Vite)
npm run dev

# Menjalankan Tauri Desktop App (Dev)
npm run desktop

# Membersihkan cache kompilasi Rust target (menghemat 4+ GB storage)
npm run clean

# Menguji build produksi frontend
npm run build
```
