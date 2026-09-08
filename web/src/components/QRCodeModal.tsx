import React, { useEffect, useState } from 'react';
import { QrCode, X, Download, Copy, Check } from 'lucide-react';
import { generateQRCodeDataUrl } from '../utils/qrGenerator';
import { writeSystemClipboard } from '../lib/nativeClipboard';
import { useHoppStore } from '../store/useHoppStore';

interface QRCodeModalProps {
  text: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ text, onClose }) => {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { showToast } = useHoppStore();

  useEffect(() => {
    let isMounted = true;
    generateQRCodeDataUrl(text)
      .then((url) => {
        if (isMounted) setQrUrl(url);
      })
      .catch(() => {
        if (isMounted) showToast('Gagal memproses Kode QR');
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [text, onClose, showToast]);

  const handleCopyLink = async () => {
    try {
      await writeSystemClipboard(text);
      setCopied(true);
      showToast('Teks / Link disalin ke clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('Gagal menyalin link');
    }
  };

  const handleDownloadQR = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `hopp-qrcode-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Gambar Kode QR diunduh!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 animate-fadeIn">
      <div className="relative w-full max-w-sm glass-panel rounded-3xl p-6 border border-slate-700/80 shadow-2xl space-y-5 text-center">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-100 tracking-tight">Kode QR Instan</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center min-h-[200px]">
          {qrUrl ? (
            <img src={qrUrl} alt="QR Code" className="w-56 h-56 object-contain rounded-lg" />
          ) : (
            <div className="text-xs text-slate-500 font-mono animate-pulse">Membuat Kode QR...</div>
          )}
        </div>

        {/* Target Text Preview */}
        <p className="text-xs text-slate-400 font-mono truncate px-2 bg-slate-950 py-2 rounded-xl border border-slate-800">
          {text}
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleCopyLink}
            className="py-2.5 px-3 text-xs font-bold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex items-center justify-center space-x-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
            <span>{copied ? 'Tersalin' : 'Salin Text'}</span>
          </button>
          <button
            onClick={handleDownloadQR}
            disabled={!qrUrl}
            className="py-2.5 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh QR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
