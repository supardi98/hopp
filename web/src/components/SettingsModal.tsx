import React from 'react';
import { X, ShieldCheck, RefreshCw, Key, Database, Sliders, Globe, RotateCcw } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';
import { generateSecretKey } from '../lib/crypto';
import { getEffectiveRelayUrl } from '../lib/wsClient';

export const SettingsModal: React.FC = () => {
  const { isSettingsModalOpen, setSettingsModalOpen, settings, updateSettings, showToast } = useHoppStore();

  if (!isSettingsModalOpen) return null;

  const handleRegenerateKey = () => {
    const newKey = generateSecretKey();
    updateSettings({ secretKey: newKey });
    showToast('Secret Key baru telah dibuat!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-5 sm:p-6 border border-slate-700/80 shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* Header (Fixed at top) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Pengaturan Hopp</h2>
              <p className="text-xs text-slate-400">Konfigurasi Keamanan E2EE & Sinkronisasi</p>
            </div>
          </div>

          <button
            onClick={() => setSettingsModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/50 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto flex-1 space-y-4 py-4 pr-1 text-xs text-slate-300">
          {/* E2EE Section */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs font-bold text-slate-200">End-to-End Encryption (AES-256-GCM)</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => updateSettings({ enabled: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Semua teks clipboard dienkripsi di peranti sebelum dikirim ke peranti lain. Peranti tanpa Secret Key yang sama tidak bisa membaca teks.
            </p>

            <div className="pt-2">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between mb-1">
                <span>Secret Pairing Key</span>
                <button
                  type="button"
                  onClick={handleRegenerateKey}
                  className="text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Acak Key</span>
                </button>
              </label>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-indigo-300 flex items-center justify-between">
                <Key className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                <span className="truncate flex-1">{settings.secretKey}</span>
              </div>
            </div>
          </div>

          {/* Server Sync / Relay URL */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs font-bold text-slate-200">Alamat Relay / Server Sync</span>
              </div>
              {settings.customRelayUrl && (
                <button
                  type="button"
                  onClick={() => updateSettings({ customRelayUrl: '' })}
                  className="text-[11px] text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pengaturan dinamis server sync. Kosongkan untuk menggunakan Server Default (.env / Auto-Detect Wi-Fi).
            </p>

            <div className="relative">
              <input
                type="text"
                value={settings.customRelayUrl || ''}
                onChange={(e) => updateSettings({ customRelayUrl: e.target.value })}
                placeholder={getEffectiveRelayUrl()}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60"
              />
            </div>

            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1">
              <span>Status Aktif:</span>
              <span className="text-emerald-400 font-bold truncate max-w-[200px]">{getEffectiveRelayUrl(settings.customRelayUrl)}</span>
            </div>
          </div>

          {/* Sync Behavior Options */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                Pengaturan Lokal Peranti Ini (Per-Device Settings)
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-slate-200">Auto-Kirim saat Ctrl+C (Auto-Broadcast)</span>
                <p className="text-[11px] text-slate-400">Otomatis kirim data clipboard ke server saat Anda menyalin (Ctrl+C)</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoBroadcastClipboard ?? true}
                onChange={(e) => updateSettings({ autoBroadcastClipboard: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 gap-2">
              <div>
                <span className="text-xs font-semibold text-slate-200">Auto-Paste ke OS Clipboard</span>
                <p className="text-[11px] text-slate-400">Otomatis masukkan data baru dari server langsung ke clipboard OS lokal</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSync}
                onChange={(e) => updateSettings({ autoSync: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 gap-2">
              <div>
                <span className="text-xs font-semibold text-slate-200">Mode Jaringan Lokal (LAN Only)</span>
                <p className="text-[11px] text-slate-400">Hanya sinkronkan peranti di Wi-Fi yang sama (mDNS)</p>
              </div>
              <input
                type="checkbox"
                checked={settings.lanSyncOnly}
                onChange={(e) => updateSettings({ lanSyncOnly: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 gap-2">
              <div>
                <span className="text-xs font-semibold text-slate-200">Notifikasi Suara / Toast</span>
                <p className="text-[11px] text-slate-400">Tampilkan notifikasi saat clipboard masuk</p>
              </div>
              <input
                type="checkbox"
                checked={settings.soundAlert}
                onChange={(e) => updateSettings({ soundAlert: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
              />
            </div>
          </div>

          {/* History Limit */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Batas Riwayat Clipboard ({settings.maxItems} item)</span>
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={settings.maxItems}
              onChange={(e) => updateSettings({ maxItems: Number(e.target.value) })}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer (Fixed at bottom) */}
        <div className="pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={() => setSettingsModalOpen(false)}
            className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all"
          >
            Simpan & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
