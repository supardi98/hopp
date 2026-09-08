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
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Status */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/25">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="font-extrabold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300">
                h
              </span>
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-100 tracking-tight glow-text">
                Hopp
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v2.4 Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Multi-Device Real-Time Clipboard & Data Bridge
            </p>
          </div>
        </div>

        {/* Live Badges */}
        <div className="hidden lg:flex items-center space-x-3">
          <div
            onClick={() => setOnboardingOpen(true)}
            title="Klik untuk Kelola / Ganti Room Sync Code"
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold cursor-pointer transition-all group"
          >
            <div className="flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Room: {settings.roomCode || 'Belum Set'}</span>
            </div>
            <button
              onClick={handleCopyRoomCode}
              title="Salin Kode Room ke Clipboard"
              className="p-1 hover:bg-indigo-500/30 text-indigo-300 hover:text-white rounded-lg transition-colors ml-1"
            >
              {copiedRoom ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              )}
            </button>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>LAN P2P Active</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{settings.enabled ? 'AES-256 E2EE On' : 'E2EE Disabled'}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-medium">
            <div className="flex -space-x-1">
              <Laptop className="w-3.5 h-3.5 text-indigo-400" />
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span>{onlineCount} Peranti</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 self-end md:self-auto">
          <button
            onClick={() => setPairingModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Hubungkan Peranti</span>
          </button>

          <button
            onClick={() => setGuideModalOpen(true)}
            title="Panduan Install Linux/Windows/Android"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSettingsModalOpen(true)}
            title="Pengaturan E2EE & App"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {activeToast && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-45px] z-50 animate-bounce">
          <div className="px-4 py-1.5 rounded-full bg-indigo-900/90 text-indigo-100 border border-indigo-400/40 text-xs font-medium shadow-xl backdrop-blur-md flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{activeToast}</span>
          </div>
        </div>
      )}
    </header>
  );
};
