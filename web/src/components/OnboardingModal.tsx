import React, { useState } from 'react';
import { Plus, ArrowRight, KeyRound, Sparkles, X, Copy, Check } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';
import { generateRoomCode } from '../lib/crypto';
import { writeSystemClipboard } from '../lib/nativeClipboard';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, showToast, initRealtimeSync } = useHoppStore();
  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCurrentRoom = () => {
    const room = settings.roomCode;
    if (!room) return;
    writeSystemClipboard(room);
    setCopied(true);
    showToast(`Kode Room '${room}' disalin ke clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateNewRoom = () => {
    const newCode = generateRoomCode();
    updateSettings({ roomCode: newCode, isRoomSet: true });
    initRealtimeSync();
    showToast(`Room Sync baru '${newCode}' berhasil dibuat!`);
    onClose();
  };

  const handleJoinExistingRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = inputCode.trim().toUpperCase();
    if (!formatted) return;

    const finalCode = formatted.startsWith('HOPP-') ? formatted : `HOPP-${formatted}`;
    updateSettings({ roomCode: finalCode, isRoomSet: true });
    initRealtimeSync();
    showToast(`Berhasil bergabung ke Room '${finalCode}'!`);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (settings.isRoomSet && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 overflow-y-auto animate-fadeIn"
    >
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-5 sm:p-7 border border-slate-700/80 shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-y-auto space-y-5">
        {/* Close Button if user is already in a room */}
        {settings.isRoomSet && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-800 rounded-full border border-slate-700/60 transition-all shrink-0 z-10"
            title="Tutup / Batal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Header Icon */}
        <div className="text-center space-y-2 pt-2 sm:pt-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-0.5 mx-auto shadow-xl shadow-indigo-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400" />
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-slate-100 tracking-tight">
            {settings.isRoomSet ? 'Kelola Workspace / Room Sync' : 'Selamat Datang di Hopp'}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {settings.isRoomSet
              ? `Saat ini Anda berada di Room '${settings.roomCode}'. Buat room baru atau pindah ke Kode Sync lain.`
              : 'Hubungkan peranti Anda (Web, Desktop Linux/Windows, & Android) dalam satu Room Sync tanpa perlu membuat akun / login!'}
          </p>
        </div>

        {/* Current Room Badge + Copy Button */}
        {settings.isRoomSet && (
          <div className="p-3.5 bg-indigo-950/50 border border-indigo-500/30 rounded-2xl flex items-center justify-between shadow-inner gap-2">
            <div>
              <p className="text-[10px] uppercase font-mono font-semibold text-indigo-400 tracking-wider">
                Kode Room Anda Saat Ini
              </p>
              <p className="text-base sm:text-lg font-mono font-extrabold text-slate-100 tracking-wider">
                {settings.roomCode}
              </p>
            </div>
            <button
              onClick={handleCopyCurrentRoom}
              className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
            </button>
          </div>
        )}

        {mode === 'choose' ? (
          <div className="space-y-3 pt-1">
            {/* Option 1: Create New Room */}
            <button
              onClick={handleCreateNewRoom}
              className="w-full p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 to-purple-950/60 hover:from-indigo-900/90 hover:to-purple-900/80 border border-indigo-500/30 hover:border-indigo-400 text-left transition-all group shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-indigo-300">
                      Buat Workspace / Room Baru
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 leading-snug">
                      Buat 6-karakter Kode Sync rahasia baru untuk HP & Komputer Anda.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </button>

            {/* Option 2: Join Existing Room */}
            <button
              onClick={() => setMode('join')}
              className="w-full p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-purple-300">
                      Gabung ke Kode Sync Yang Ada
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 leading-snug">
                      Sudah punya Kode Sync dari peranti lain? Masukkan di sini.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </button>

            {/* Cancel Button if user already has a room */}
            {settings.isRoomSet && (
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-2xl border border-slate-800 transition-all text-center"
              >
                Batal / Tetap di Room {settings.roomCode}
              </button>
            )}
          </div>
        ) : (
          /* Join Existing Room Form */
          <form onSubmit={handleJoinExistingRoom} className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Masukkan Kode Sync (Contoh: HOPP-89F1 atau 89F1)
              </label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="HOPP-XXXX"
                autoFocus
                required
                className="w-full px-4 py-3 bg-slate-950 border border-indigo-500/40 rounded-xl text-center font-mono text-base sm:text-lg tracking-widest text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="w-1/3 py-2.5 sm:py-3 px-3 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-800 transition-all"
              >
                Kembali
              </button>

              <button
                type="submit"
                disabled={!inputCode.trim()}
                className="w-2/3 py-2.5 sm:py-3 px-4 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
              >
                Gabung Room & Sync
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
