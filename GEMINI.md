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

## ⚙️ Aturan Bisnis & Perilaku Kunci

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

---

## 🛠️ Perintah Pengembangan Utama

```bash
# Menjalankan WebSocket relay server
npm run server

# Menjalankan Web Dev Server (Vite)
npm run dev

# Menjalankan Tauri Desktop App (Dev)
npm run desktop

# Menguji build produksi frontend
npm run build
```
