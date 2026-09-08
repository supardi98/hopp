# 🚀 Hopp - Multi-Device Clipboard & Data Bridge (Monorepo)

**Hopp** adalah aplikasi penyinkron clipboard 2-arah secara *real-time* untuk **Linux, Windows, Android, dan Web** berenkripsi **AES-256-GCM End-to-End (E2EE)**.

---

## 💡 Mengapa Folder Dipisah? (Monorepo Architecture)

1. **`web/`**: Khusus aplikasi **Frontend Website** (React + Vite + TailwindCSS). Bisa dideploy ke Vercel/Netlify atau diakses via Web Browser.
2. **`desktop/`**: Khusus aplikasi **Native Desktop Engine (Tauri v2 + Rust)**. Tauri bertugas membungkus (*wrap*) UI dari `web/` menjadi aplikasi native desktop (.exe di Windows & AppImage/deb di Linux) yang memiliki System Tray dan membaca clipboard OS secara langsung.
3. **`server/`**: Khusus **WebSocket Sync Relay Server Engine** yang menghubungkan komunikasi jaringan antar peranti secara real-time.
4. **`scripts/`**: Skrip otomatisasi & pengujian multi-device.

---

## 📁 Struktur Direktori Project

```text
hopp/
├── web/                    # 🌐 Web Client Application (React + Vite + TailwindCSS)
│   ├── src/                # UI Components, Crypto, State, & Data Models
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── desktop/                # 🖥️ Native Desktop Client App (Tauri v2 + Rust Engine)
│   ├── capabilities/       # OS Permissions (Clipboard Manager, System Tray)
│   ├── src/                # Rust Main Entry & Handlers
│   ├── Cargo.toml          # Rust Package Configuration
│   └── tauri.conf.json     # Tauri Desktop App Configuration
├── server/                 # ⚡ WebSocket Real-Time Sync Server Engine
│   └── index.js            # Node.js WebSocket Relay Server (Port 8080)
├── scripts/                # 🧪 Skrip Pengujian & Otomatisasi
│   └── test-sync.js        # Multi-device WebSocket sync integration test
└── package.json            # Main Workspace Monorepo Scripts
```

---

## 🛠️ Perintah Utama

### 1. Menjalankan Server Relay Network Real-Time
```bash
npm run server
```

### 2. Menjalankan Frontend Web (Dev Server)
```bash
npm run dev
```

### 3. Menjalankan Desktop App Native (Linux / Windows via Tauri v2)
```bash
npm run desktop
```

### 4. Menguji Sinkronisasi Peranti ke-2 (Test Automation)
```bash
npm run test:sync
```

### 5. Membangun Production Bundle Web
```bash
npm run build
```
