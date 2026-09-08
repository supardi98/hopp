import React, { useState } from 'react';
import { Terminal, Monitor, Smartphone, Globe, Plus, CheckCircle2, Info, X, ShieldCheck, Activity } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';
import { WSLogModal } from './WSLogModal';
import type { Device, PlatformType } from '../types';

export const DeviceList: React.FC = () => {
  const { pairedDevices, setPairingModalOpen, settings, isWsConnected, setDeviceListOpen } = useHoppStore();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isLogModalOpen, setLogModalOpen] = useState(false);

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'linux':
        return <Terminal className="w-4 h-4 text-indigo-400" />;
      case 'windows':
        return <Monitor className="w-4 h-4 text-cyan-400" />;
      case 'android':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      default:
        return <Globe className="w-4 h-4 text-purple-400" />;
    }
  };

  const getPlatformBadge = (platform: PlatformType) => {
    switch (platform) {
      case 'linux':
        return <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Linux (Tauri)</span>;
      case 'windows':
        return <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">Windows (Tauri)</span>;
      case 'android':
        return <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Android App</span>;
      default:
        return <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">Web Client</span>;
    }
  };

  const formatIp = (ip?: string) => {
    if (!ip || ip === 'Mendeteksi...') {
      return isWsConnected ? 'Terverifikasi' : 'Mendeteksi...';
    }
    const str = ip.trim().replace(/^::ffff:/i, '');
    if (str === '::1' || str === '1') {
      return '127.0.0.1';
    }
    return str;
  };

  return (
    <>
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <span>Peranti Terhubung</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
                  {pairedDevices.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Klik kartu peranti untuk melihat detail koneksi</p>
            </div>
            {/* Close button — mobile only */}
            <button
              onClick={() => setDeviceListOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setLogModalOpen(true)}
              className="p-1.5 px-2.5 text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/80 rounded-lg border border-cyan-700/50 transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Log WS</span>
            </button>

            <button
              onClick={() => setPairingModalOpen(true)}
              className="p-1.5 px-2.5 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 rounded-lg border border-indigo-700/50 transition-all flex items-center space-x-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tambah</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {pairedDevices.map((device) => (
            <div
              key={device.id}
              onClick={() => setSelectedDevice(device)}
              className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                device.isCurrentDevice
                  ? 'bg-indigo-950/40 border-indigo-500/40 shadow-inner hover:border-indigo-400'
                  : 'bg-slate-900/50 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 truncate">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                    {getPlatformIcon(device.platform)}
                  </div>

                  <div className="space-y-1 truncate">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                        {device.name}
                      </span>
                      {device.isCurrentDevice && (
                        <span className="shrink-0 flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Peranti Ini</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-mono font-medium text-slate-400">
                        IP: {formatIp(device.ipAddress)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center space-x-2 shrink-0 ml-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDevice(device);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-300 rounded hover:bg-indigo-500/10"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Device Detail Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 animate-fadeIn">
          <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 border border-indigo-500/30 shadow-2xl space-y-5">
            <button
              onClick={() => setSelectedDevice(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/50 hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                {getPlatformIcon(selectedDevice.platform)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedDevice.name}</h3>
                <p className="text-xs text-slate-400">Detail Status Client & Jaringan</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Platform / Client:</span>
                <div>{getPlatformBadge(selectedDevice.platform)}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Alamat IP (Jaringan):</span>
                <span className="font-mono font-bold text-indigo-300">
                  {formatIp(selectedDevice.ipAddress)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Status Koneksi:</span>
                <span className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Aktif (Online)</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Room Sync Code:</span>
                <span className="font-mono font-bold text-purple-300">{settings.roomCode}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Protokol Keamanan:</span>
                <span className="text-purple-400 font-medium flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>AES-256-GCM E2EE</span>
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedDevice(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live WebSocket Debugger Log Modal */}
      <WSLogModal isOpen={isLogModalOpen} onClose={() => setLogModalOpen(false)} />
    </>
  );
};
