import React, { useState } from 'react';
import { X, QrCode, Check, Copy, Link2, KeyRound, ShieldCheck } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';
import { writeSystemClipboard } from '../lib/nativeClipboard';

export const PairingModal: React.FC = () => {
  const { isPairingModalOpen, setPairingModalOpen, settings, showToast } = useHoppStore();
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isPairingModalOpen) return null;

  const getPairingUrl = () => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:4080';
    const room = settings.roomCode || '';
    const key = settings.secretKey || '';
    return `${origin}/?room=${encodeURIComponent(room)}&key=${encodeURIComponent(key)}`;
  };

  const handleCopyRoomCode = () => {
    if (!settings.roomCode) return;
    writeSystemClipboard(settings.roomCode);
    setCopiedRoom(true);
    showToast('Kode Room disalin ke clipboard!');
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  const handleCopyPairKey = () => {
    writeSystemClipboard(settings.secretKey);
    setCopiedKey(true);
    showToast('Secret Key disalin ke clipboard!');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyPairingLink = () => {
    const pairingUrl = getPairingUrl();
    writeSystemClipboard(pairingUrl);
    setCopiedLink(true);
    showToast('Link Pairing Instan disalin! Kirim ke HP/Laptop lain untuk koneksi otomatis.');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const pairingUrl = getPairingUrl();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-5 sm:p-6 border border-slate-700/80 shadow-2xl flex flex-col my-auto space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Hubungkan Peranti Baru</h2>
              <p className="text-xs text-slate-400">Scan QR atau salin link pairing untuk koneksi instant</p>
            </div>
          </div>

          <button
            onClick={() => setPairingModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 pt-1 text-xs text-slate-300">
          {/* Top Section: Prominent Centered QR Code */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center space-y-3">
            <div className="w-36 h-36 sm:w-44 sm:h-44 p-2 bg-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pairingUrl)}`}
                alt="Scan Pairing QR Code"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <p className="text-[11px] text-slate-400 text-center leading-relaxed max-w-xs">
              Pindai Kode QR di atas menggunakan kamera HP / Peranti lain untuk bergabung otomatis.
            </p>
          </div>

          {/* Quick Copy Pairing Link Button */}
          <button
            onClick={handleCopyPairingLink}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-bold text-xs shadow-indigo-600/30 transition-all transform active:scale-95"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Link Pairing Instan Tersalin!</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                <span>Salin Link Pairing Instant (Otomatis Konek)</span>
              </>
            )}
          </button>

          {/* Divider OR / ATAU */}
          <div className="relative flex py-1 items-center justify-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-950 px-3 py-0.5 rounded-full border border-slate-800">
              ATAU SALIN KODE MANUAL
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Manual Code Card Panel */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            {/* Room Code Display */}
            <div>
              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
                Kode Room Sync Saat Ini
              </span>
              <div className="p-2.5 bg-slate-950 border border-indigo-500/30 rounded-xl font-mono text-xs text-indigo-300 font-extrabold flex items-center justify-between">
                <div className="flex items-center space-x-1.5 truncate mr-2">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{settings.roomCode || 'Belum Set'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  className="p-1 hover:text-white text-slate-400 shrink-0 transition-colors"
                >
                  {copiedRoom ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Secret Key Display */}
            <div>
              <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider block mb-1">
                Pairing Secret Key (E2EE)
              </span>
              <div className="p-2.5 bg-slate-950 border border-purple-500/30 rounded-xl font-mono text-xs text-purple-300 font-extrabold flex items-center justify-between">
                <div className="flex items-center space-x-1.5 truncate mr-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">{settings.secretKey}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPairKey}
                  className="p-1 hover:text-white text-slate-400 shrink-0 transition-colors"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
