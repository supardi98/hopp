import React, { useState } from 'react';
import { X, QrCode, Smartphone, Terminal, Monitor, Globe, Shield, Check, Copy } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';
import type { PlatformType } from '../types';

export const PairingModal: React.FC = () => {
  const { isPairingModalOpen, setPairingModalOpen, pairNewDevice, settings, showToast } = useHoppStore();
  const [deviceName, setDeviceName] = useState('');
  const [platform, setPlatform] = useState<PlatformType>('android');
  const [ipAddress, setIpAddress] = useState('192.168.1.188');
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isPairingModalOpen) return null;

  const handlePairSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) return;

    pairNewDevice({
      name: deviceName.trim(),
      platform,
      ipAddress,
      status: 'online',
    });
    setDeviceName('');
  };

  const handleCopyPairKey = () => {
    navigator.clipboard.writeText(settings.secretKey);
    setCopiedKey(true);
    showToast('Pairing key disalin ke clipboard!');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 border border-slate-700/80 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Hubungkan Peranti Baru</h2>
              <p className="text-xs text-slate-400">Pindai QR atau masukkan Pairing Key untuk sinkronkan</p>
            </div>
          </div>

          <button
            onClick={() => setPairingModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/50 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Simulated Display & Secret Key */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-28 h-28 p-2 bg-white rounded-xl flex items-center justify-center shadow-inner flex-shrink-0">
            {/* Simulated QR Pattern SVG */}
            <svg viewBox="0 0 100 100" className="w-full h-full text-slate-950 fill-current">
              <rect x="0" y="0" width="30" height="30" />
              <rect x="5" y="5" width="20" height="20" fill="white" />
              <rect x="10" y="10" width="10" height="10" />

              <rect x="70" y="0" width="30" height="30" />
              <rect x="75" y="5" width="20" height="20" fill="white" />
              <rect x="80" y="10" width="10" height="10" />

              <rect x="0" y="70" width="30" height="30" />
              <rect x="5" y="75" width="20" height="20" fill="white" />
              <rect x="10" y="80" width="10" height="10" />

              <rect x="40" y="10" width="15" height="15" />
              <rect x="45" y="45" width="20" height="20" />
              <rect x="70" y="70" width="15" height="15" />
            </svg>
          </div>

          <div className="space-y-2 flex-1 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
              Pairing Secret Key (E2EE)
            </span>
            <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-purple-300 flex items-center justify-between">
              <span className="truncate mr-2">{settings.secretKey}</span>
              <button
                onClick={handleCopyPairKey}
                className="p-1 hover:text-white text-slate-400"
                title="Salin Key"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Buka aplikasi Hopp di peranti Android/Desktop lain lalu scan QR di atas.
            </p>
          </div>
        </div>

        {/* Manual Pairing Form */}
        <form onSubmit={handlePairSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Nama Peranti Baru</label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Contoh: Android Phone Supardi, Laptop Linux Work"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Platform Peranti</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'android', name: 'Android', icon: <Smartphone className="w-4 h-4" /> },
                { id: 'linux', name: 'Linux', icon: <Terminal className="w-4 h-4" /> },
                { id: 'windows', name: 'Windows', icon: <Monitor className="w-4 h-4" /> },
                { id: 'web', name: 'Web', icon: <Globe className="w-4 h-4" /> },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id as PlatformType)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    platform === p.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {p.icon}
                  <span className="mt-1 text-[11px]">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">IP Address (LAN Discovery)</label>
            <input
              type="text"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
          >
            <Shield className="w-4 h-4" />
            <span>Verifikasi & Hubungkan Peranti</span>
          </button>
        </form>
      </div>
    </div>
  );
};
