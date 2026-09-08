# 🚀 Hopp - Real-Time Encrypted Clipboard & File Bridge

**Hopp** adalah aplikasi penyinkron clipboard 2-arah dan pengirim file secara *real-time* untuk **Linux, Windows, Android, dan Web** berenkripsi **AES-256-GCM End-to-End (E2EE)** tanpa perlu membuat akun atau login.

---

## ✨ Fitur Utama

- 🔒 **Zero-Login & Isolation Room (Kode Sync 6-Karakter)**: Cukup masukkan atau buat Room Sync Code untuk menghubungkan HP & Komputer secara terisolasi.
- 🔐 **End-to-End Encryption (AES-256-GCM)**: Semua data teks, URL, perintah terminal, gambar, dan file di-enkripsi di perangkat pengirim sebelum ditransmisikan.
- 🖼️ **Dukungan Gambar & File**: Kirim screenshot, gambar, atau dokumen file (< 2 MB di Mobile, < 10 MB di Web/Desktop) secara instan.
- 💾 **IndexedDB Storage Engine**: Menampung data biner gambar dan file berukuran besar secara asinkron tanpa membebani *localStorage* atau membekukan UI.
- ⏱️ **Auto-Hapus 24 Jam (Terakhir Konek)**: Riwayat clipboard dan file unpinned dibersihkan secara otomatis jika perangkat tidak aktif selama 24 jam.
- 📌 **Proteksi Pin (Disematkan)**: Item yang di-pin terproteksi 100% dari auto-hapus dan batas kuota riwayat.
- 🐳 **Docker Compose Ready**: Server relay WebSocket siap dijalankan dengan satu perintah via Docker Compose.

---

## 📁 Struktur Monorepo

```text
hopp/
├── web/                    # 🌐 Web Client Application (React + Vite + TailwindCSS + Zustand + IndexedDB)
├── desktop/                # 🖥️ Native Desktop Client App (Tauri v2 + Rust Engine)
├── server/                 # ⚡ WebSocket Real-Time Sync Relay Server Engine (Docker Ready)
├── scripts/                # 🧪 Integration & Automation Test Scripts
├── docker-compose.yml      # 🐳 Production/Dev Container Orchestration
├── README.md
└── GEMINI.md
```

---

## 🚀 Panduan Memulai

### 1. Menjalankan Server Relay (Pilihan A: Tanpa Docker)
```bash
# Jalankan WebSocket Relay Server (Node.js)
npm run server
```

### 2. Menjalankan Server Relay (Pilihan B: Dengan Docker Compose)
```bash
# Jalankan server WebSocket terisolasi dengan Docker Compose
docker compose up -d --build
```

### 3. Menjalankan Web Client
```bash
npm run dev
```
Akses di browser: `http://localhost:5173`

### 4. Menjalankan Desktop App Native (Tauri v2 Linux / Windows)
```bash
npm run desktop
```

---

## 🛡️ Keamanan & Kredensial

Aplikasi ini bersifat **Zero-Knowledge** dan tidak menyimpan kredensial sensitif secara terpusat. Enkripsi dilakukan menggunakan Web Crypto API secara langsung pada peranti pengguna.

---

## 📜 Lisensi
MIT License - Bebas digunakan dan dikembangkan untuk keperluan pribadi maupun komersial.
