import React, { useState } from 'react';
import { ShieldCheck, Wifi, Laptop, Smartphone, Plus, Settings, HelpCircle, KeyRound, Copy, Check } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';
import { writeSystemClipboard } from '../lib/nativeClipboard';

export const Header: React.FC = () => {
  const {
    pairedDevices,
    settings,
    setPairingModalOpen,
    setSettingsModalOpen,
    setGuideModalOpen,
    setOnboardingOpen,
    activeToast,
    showToast,
  } = useHoppStore();

  const [copiedRoom, setCopiedRoom] = useState(false);
  const onlineCount = pairedDevices.filter((d) => d.status === 'online').length;

  const handleCopyRoomCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const room = settings.roomCode;
    if (!room) {
      showToast('Belum ada Kode Room');
      return;
    }
    writeSystemClipboard(room);
    setCopiedRoom(true);
    showToast(`Kode Room '${room}' berhasil disalin ke clipboard!`);
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-800/80 px-3 sm:px-6 py-2.5 sm:py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col space-y-2.5 md:space-y-0 md:flex-row md:items-center md:justify-between">
        
        {/* Top Header Bar (Brand & Action Buttons for Mobile) */}
        <div className="flex items-center justify-between w-full md:w-auto">
          {/* Brand & Title */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 border border-indigo-400/30 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[9px] sm:rounded-[10px] flex items-center justify-center">
                <span className="font-extrabold text-lg sm:text-xl tracking-wider text-indigo-400">
                  h
                </span>
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
                  Hopp
                </h1>
                <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v2.4 Live
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium hidden sm:block">
                Multi-Device Real-Time Sync
              </p>
            </div>
          </div>

          {/* Action Controls for Mobile (rendered right beside Brand on mobile header bar) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 md:hidden">
            <button
              onClick={() => setPairingModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 active:from-indigo-500 active:to-purple-500 rounded-lg border border-indigo-400/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[11px]">Hubungkan</span>
            </button>

            <button
              onClick={() => setGuideModalOpen(true)}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800/60 rounded-lg border border-slate-700/50"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSettingsModalOpen(true)}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800/60 rounded-lg border border-slate-700/50"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Badges (Room Code, LAN, E2EE, Peranti Count) - VISIBLE ON BOTH DESKTOP & MOBILE */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-0.5 pt-1 md:pt-0 no-scrollbar text-xs">
          {/* Room Code Badge */}
          <div
            onClick={() => setOnboardingOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono font-bold cursor-pointer transition-all group shrink-0 text-xs"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Room: {settings.roomCode || 'Belum Set'}</span>
            <button
              onClick={handleCopyRoomCode}
              className="p-0.5 hover:bg-indigo-500/30 text-indigo-300 hover:text-white rounded transition-colors ml-0.5"
            >
              {copiedRoom ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              )}
            </button>
          </div>

          {/* LAN P2P Status */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium shrink-0 text-xs">
            <Wifi className="w-3.5 h-3.5 shrink-0" />
            <span>LAN P2P</span>
          </div>

          {/* E2EE Status */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-medium shrink-0 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{settings.enabled ? 'AES-256' : 'E2EE Off'}</span>
          </div>

          {/* Devices Count */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 font-medium shrink-0 text-xs">
            <div className="flex -space-x-1">
              <Laptop className="w-3.5 h-3.5 text-indigo-400" />
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span>{onlineCount} Peranti</span>
          </div>
        </div>

        {/* Action Controls for Desktop */}
        <div className="hidden md:flex items-center space-x-2">
          <button
            onClick={() => setPairingModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg border border-indigo-400/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Hubungkan Peranti</span>
          </button>

          <button
            onClick={() => setGuideModalOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSettingsModalOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Floating Toast Notification */}
      {activeToast && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-45px] z-50">
          <div className="px-4 py-1.5 rounded-full bg-slate-900 text-indigo-100 border border-indigo-400/40 text-xs font-medium shadow-xl flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{activeToast}</span>
          </div>
        </div>
      )}
    </header>
  );
};
