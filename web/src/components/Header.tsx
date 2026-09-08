import React from 'react';
import { ShieldCheck, Wifi, Laptop, Smartphone, Plus, Settings, KeyRound } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';

export const Header: React.FC = () => {
  const {
    pairedDevices,
    settings,
    setPairingModalOpen,
    setSettingsModalOpen,
    setOnboardingOpen,
    setDeviceListOpen,
    setE2EEModalOpen,
    activeToast,
  } = useHoppStore();

  const onlineCount = pairedDevices.filter((d) => d.status === 'online').length;

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-800/80 px-3 sm:px-6 py-2.5 sm:py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col space-y-2.5 md:space-y-0 md:flex-row md:items-center md:justify-between">

        {/* Top Header Bar */}
        <div className="flex items-center justify-between w-full md:w-auto">
          {/* Brand */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 border border-indigo-400/30 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[9px] sm:rounded-[10px] flex items-center justify-center">
                <span className="font-extrabold text-lg sm:text-xl tracking-wider text-indigo-400">h</span>
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">Hopp</h1>
                <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v2.4 Live
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium hidden sm:block">Multi-Device Real-Time Sync</p>
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 md:hidden">
            <button
              onClick={() => setPairingModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg border border-indigo-400/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[11px]">Hubungkan</span>
            </button>
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="p-1.5 text-slate-400 bg-slate-800/60 rounded-lg border border-slate-700/50"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Badges */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-0.5 pt-1 md:pt-0 no-scrollbar text-xs">
          {/* Room Code */}
          <div
            onClick={() => setOnboardingOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono font-bold cursor-pointer transition-all shrink-0 text-xs"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Room: {settings.roomCode || 'Belum Set'}</span>
          </div>

          {/* LAN P2P */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium shrink-0 text-xs">
            <Wifi className="w-3.5 h-3.5 shrink-0" />
            <span>LAN P2P</span>
          </div>

          {/* E2EE — opens E2EEModal */}
          <button
            onClick={() => setE2EEModalOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 font-medium shrink-0 text-xs transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{settings.enabled ? 'AES-256' : 'E2EE Off'}</span>
          </button>

          {/* Device Count — opens device list modal on mobile */}
          <button
            onClick={() => setDeviceListOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 font-medium shrink-0 text-xs hover:bg-slate-800 transition-colors"
          >
            <div className="flex -space-x-1">
              <Laptop className="w-3.5 h-3.5 text-indigo-400" />
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span>{onlineCount} Peranti</span>
          </button>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center space-x-2">
          <button
            onClick={() => setPairingModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg border border-indigo-400/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Hubungkan Peranti</span>
          </button>
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toast — fixed on top of all modals (z-[100]) */}
      {activeToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <div className="px-4 py-2 rounded-full bg-slate-900/95 text-indigo-100 border border-indigo-400/40 text-xs font-semibold shadow-2xl flex items-center space-x-2 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{activeToast}</span>
          </div>
        </div>
      )}
    </header>
  );
};
