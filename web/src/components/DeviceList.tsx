import React from 'react';
import { Terminal, Monitor, Smartphone, Globe, BatteryMedium, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';
import type { PlatformType } from '../types';

export const DeviceList: React.FC = () => {
  const { pairedDevices, removeDevice, setPairingModalOpen } = useHoppStore();

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
        return <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">Linux (Tauri)</span>;
      case 'windows':
        return <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">Windows (Tauri)</span>;
      case 'android':
        return <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Android App</span>;
      default:
        return <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">Web Client</span>;
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800/80 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
            <span>Peranti Terhubung</span>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
              {pairedDevices.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400">Node sinkronisasi jaringan lokal (mDNS / WebSocket)</p>
        </div>

        <button
          onClick={() => setPairingModalOpen(true)}
          className="p-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 transition-all flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tambah</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {pairedDevices.map((device) => (
          <div
            key={device.id}
            className={`group relative p-3 rounded-xl border transition-all ${
              device.isCurrentDevice
                ? 'bg-indigo-950/40 border-indigo-500/40 shadow-inner'
                : 'bg-slate-900/50 border-slate-800/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                  {getPlatformIcon(device.platform)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                      {device.name}
                    </span>
                    {device.isCurrentDevice && (
                      <span className="flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Peranti Ini</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {getPlatformBadge(device.platform)}
                    <span className="text-[11px] text-slate-400">{device.ipAddress}</span>
                  </div>
                </div>
              </div>

              {/* Status & Battery */}
              <div className="flex items-center space-x-2">
                {device.batteryLevel && (
                  <div className="hidden sm:flex items-center space-x-1 text-[11px] text-slate-400">
                    <BatteryMedium className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{device.batteryLevel}%</span>
                  </div>
                )}

                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
                    {device.lastSync}
                  </span>
                </div>

                {!device.isCurrentDevice && (
                  <button
                    onClick={() => removeDevice(device.id)}
                    title="Putuskan koneksi peranti"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
