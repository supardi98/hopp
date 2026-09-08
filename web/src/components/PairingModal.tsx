import React, { useState, useEffect } from 'react';
import { X, QrCode, Check, Link2, Globe } from 'lucide-react';
import QRCode from 'qrcode';
import { useHoppStore } from '../store/useHoppStore';
import { writeSystemClipboard } from '../lib/nativeClipboard';
import { detectLocalLanIp } from '../utils/detectLanIp';

export const PairingModal: React.FC = () => {
  const { isPairingModalOpen, setPairingModalOpen, settings, currentDevice, showToast } = useHoppStore();
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [detectedHost, setDetectedHost] = useState<string>('');
  const [hostOverride, setHostOverride] = useState<string>('');

  useEffect(() => {
    if (isPairingModalOpen) {
      detectLocalLanIp().then((ip) => {
        if (ip) {
          setDetectedHost(ip);
        }
      });
    }
  }, [isPairingModalOpen]);

  const getEffectiveHostAndPort = (): string => {
    const currentPort = typeof window !== 'undefined' && window.location.port ? window.location.port : '4078';
    const portSuffix = currentPort ? `:${currentPort}` : '';

    if (hostOverride.trim()) {
      return hostOverride.trim();
    }
    const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
      if (detectedHost) {
        return detectedHost.includes(':') ? detectedHost : `${detectedHost}${portSuffix}`;
      }
      if (currentDevice?.ipAddress) {
        const cleanIp = currentDevice.ipAddress.trim().replace(/^::ffff:/i, '');
        if (cleanIp && cleanIp !== '127.0.0.1' && cleanIp !== 'Mendeteksi...') {
          return cleanIp.includes(':') ? cleanIp : `${cleanIp}${portSuffix}`;
        }
      }
    }
    return `${currentHostname}${portSuffix}`;
  };

  const getPairingUrl = () => {
    const protocol = typeof window !== 'undefined' && window.location.protocol ? window.location.protocol : 'http:';
    const hostAndPort = getEffectiveHostAndPort();
    const room = settings.roomCode || '';
    const key = settings.secretKey || '';
    return `${protocol}//${hostAndPort}/?room=${encodeURIComponent(room)}&key=${encodeURIComponent(key)}`;
  };

  const pairingUrl = getPairingUrl();

  useEffect(() => {
    if (isPairingModalOpen && pairingUrl) {
      QRCode.toDataURL(pairingUrl, { width: 300, margin: 1 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.warn('QR Code generation failed:', err));
    }
  }, [isPairingModalOpen, pairingUrl]);

  useEffect(() => {
    if (!isPairingModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setPairingModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPairingModalOpen, setPairingModalOpen]);

  if (!isPairingModalOpen) return null;

  const handleCopyPairingLink = () => {
    writeSystemClipboard(pairingUrl);
    setCopiedLink(true);
    showToast('Link Pairing Instan disalin! Kirim ke HP/Laptop lain untuk koneksi otomatis.');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const currentHostVal = getEffectiveHostAndPort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 overflow-y-auto">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-5 sm:p-6 border border-slate-700/80 shadow-2xl flex flex-col my-auto space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Hubungkan Device Baru</h2>
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
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Scan Pairing QR Code"
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-[11px] text-slate-500 flex items-center justify-center">Membuat QR...</div>
              )}
            </div>
            <p className="text-[11px] text-slate-400 text-center leading-relaxed max-w-xs">
              Pindai Kode QR di atas menggunakan kamera HP / Device lain di Wi-Fi yang sama untuk bergabung otomatis.
            </p>
          </div>

          {/* Host & Port IP Configurator Panel (Only shown in Local/Dev/IP environments, hidden on production domain) */}
          {(typeof window !== 'undefined' && (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(window.location.hostname)
          )) && (
            <div className="p-3 bg-slate-900/70 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>IP / Host & Port Pairing (Untuk Device di Wi-Fi)</span>
                </label>
                {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                  <span className="text-[10px] text-amber-400/90 font-medium px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                    Dev Localhost
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={hostOverride || currentHostVal}
                  onChange={(e) => setHostOverride(e.target.value)}
                  placeholder="misal: 192.168.18.12:4078"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/70 focus:border-indigo-500 rounded-xl font-mono text-xs text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                />
                {hostOverride && (
                  <button
                    onClick={() => setHostOverride('')}
                    className="px-2.5 py-1.5 bg-slate-800 text-slate-300 hover:text-white text-[11px] rounded-xl shrink-0 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Ubah IP & Port di atas jika HP Anda menggunakan IP LAN atau Port yang berbeda.
              </p>
            </div>
          )}

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

          {/* Display generated URL preview */}
          <div className="px-3 py-2 bg-slate-950/80 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-400 truncate flex items-center space-x-1">
            <span className="text-slate-500 shrink-0">URL:</span>
            <span className="text-slate-300 truncate select-all">{pairingUrl}</span>
          </div>
        </div>
      </div>
    </div>
  );
};


