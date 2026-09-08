import React from 'react';
import { X, Terminal, Monitor, Smartphone, Globe, Download, CheckCircle } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';

export const GuideModal: React.FC = () => {
  const { isGuideModalOpen, setGuideModalOpen } = useHoppStore();

  if (!isGuideModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 overflow-y-auto">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl p-5 sm:p-6 border border-slate-700/80 shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* Header (Fixed at top) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Panduan Install Multi-Platform Hopp</h2>
              <p className="text-xs text-slate-400">Aplikasi Desktop (Linux & Windows) & Mobile (Android)</p>
            </div>
          </div>

          <button
            onClick={() => setGuideModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/50 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto flex-1 space-y-4 py-4 pr-1 text-xs text-slate-300">
          {/* Linux */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-400 font-bold">
              <Terminal className="w-4 h-4 shrink-0" />
              <span>1. Linux (Ubuntu / Fedora / Arch) - Tauri v2 Desktop App</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Dibutuhkan `arboard` native plugin dan system tray Rust. Jalankan perintah di terminal project ini:
            </p>
            <pre className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-indigo-200 border border-slate-800 overflow-x-auto">
              npm install @tauri-apps/api @tauri-apps/plugin-clipboard-manager{"\n"}
              npx tauri init{"\n"}
              npx tauri dev
            </pre>
            <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 font-medium pt-1">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Mendukung auto-start background system tray & deteksi Ctrl+C otomatis.</span>
            </div>
          </div>

          {/* Windows */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold">
              <Monitor className="w-4 h-4 shrink-0" />
              <span>2. Windows 10/11 - Tauri v2 Executable (.exe / .msi)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Jalankan build kompilasi native Windows:
            </p>
            <pre className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-cyan-200 border border-slate-800 overflow-x-auto">
              npx tauri build --target x86_64-pc-windows-msvc
            </pre>
          </div>

          {/* Android */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>3. Android (APK / Android Studio)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Android 10+ membatasi background clipboard. Kita menggunakan <strong>Android Foreground Service</strong> dengan Notifikasi Persistent atau Tile di Quick Settings:
            </p>
            <pre className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-emerald-200 border border-slate-800 overflow-x-auto">
              npx tauri android init{"\n"}
              npx tauri android dev
            </pre>
          </div>

          {/* Web / PWA */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-purple-400 font-bold">
              <Globe className="w-4 h-4 shrink-0" />
              <span>4. Web Client (PWA Mode)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Web Client dapat diakses langsung dari browser apapun (Chrome, Firefox, Edge, Safari) dengan fitur install ke Home Screen.
            </p>
          </div>
        </div>

        {/* Footer (Fixed at bottom) */}
        <div className="pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={() => setGuideModalOpen(false)}
            className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
