import React, { useState, useRef, useEffect } from 'react';
import { Plus, ArrowRight, KeyRound, Sparkles, X, Copy, Check, LogOut, Camera, Upload } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';
import { generateRoomCode } from '../lib/crypto';
import { writeSystemClipboard } from '../lib/nativeClipboard';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, showToast, initRealtimeSync, leaveRoom } = useHoppStore();
  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [inputCode, setInputCode] = useState('');
  const [inputSecretKey, setInputSecretKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Live Camera Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleParsedQRValue = (val: string) => {
    if (!val) return;
    stopCameraScan();
    setCameraError(null);

    try {
      if (val.includes('?') && (val.includes('room=') || val.includes('r='))) {
        const urlObj = new URL(val);
        const roomParam = urlObj.searchParams.get('room') || urlObj.searchParams.get('r');
        const keyParam = urlObj.searchParams.get('key') || urlObj.searchParams.get('k');

        if (roomParam) {
          const formatted = roomParam.trim().toUpperCase().startsWith('HOPP-')
            ? roomParam.trim().toUpperCase()
            : `HOPP-${roomParam.trim().toUpperCase()}`;
          setInputCode(formatted);
          if (keyParam) {
            const formattedKey = keyParam.trim().toUpperCase();
            setInputSecretKey(formattedKey);
            showToast(`QR Code dipindai! Room '${formatted}' & Kunci E2EE otomatis terisi.`);
          } else {
            showToast(`QR Code dipindai! Room: ${formatted}`);
          }
          return;
        }
      }

      const cleaned = val.trim().toUpperCase();
      const formattedRoom = cleaned.startsWith('HOPP-') ? cleaned : `HOPP-${cleaned}`;
      setInputCode(formattedRoom);
      showToast(`QR Code dipindai: ${formattedRoom}`);
    } catch (err) {
      const cleaned = val.trim().toUpperCase();
      setInputCode(cleaned);
      showToast(`QR Code dipindai: ${cleaned}`);
    }
  };

  const startCameraScan = async () => {
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Browser atau koneksi (harus HTTPS / localhost) tidak mendukung akses kamera.';
      setCameraError(msg);
      showToast(msg);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // Try rear camera first (ideal for mobile phones)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      } catch (fallbackErr) {
        // Fallback to default video device (ideal for desktop webcams)
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setIsScanning(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsScanning(false);

      let msg = `Gagal membuka kamera: ${err?.message || 'Peranti kamera tidak tersedia'}`;
      if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        msg = 'Kamera tidak ditemukan pada peranti ini. Gunakan fitur Unggah Foto QR.';
      } else if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        msg = 'Izin akses kamera ditolak. Silakan berikan izin kamera pada browser Anda.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        msg = 'Kamera sedang digunakan oleh aplikasi/tab lain.';
      }

      setCameraError(msg);
      showToast(msg);
    }
  };

  const stopCameraScan = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  // Continuous frame scanning using requestAnimationFrame (0% setInterval CPU overhead)
  useEffect(() => {
    if (!isScanning) return;
    let animId: number;

    const scanFrame = async () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        try {
          if ('BarcodeDetector' in window) {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              handleParsedQRValue(barcodes[0].rawValue);
              return;
            }
          }
        } catch (e) {
          // Frame decode skip
        }
      }
      animId = requestAnimationFrame(scanFrame);
    };

    animId = requestAnimationFrame(scanFrame);
    return () => cancelAnimationFrame(animId);
  }, [isScanning]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = async () => {
        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(img);
          if (barcodes.length > 0) {
            handleParsedQRValue(barcodes[0].rawValue);
          } else {
            showToast('QR Code tidak terdeteksi pada gambar ini.');
          }
        } else {
          showToast('Browser belum mendukung deteksi gambar QR otomatis.');
        }
      };
    } catch (err) {
      showToast('Gagal membaca berkas gambar QR.');
    }
  };

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
    const newSettings: Partial<import('../types').E2EESettings> = {
      roomCode: finalCode,
      isRoomSet: true,
    };
    if (inputSecretKey.trim()) {
      newSettings.secretKey = inputSecretKey.trim().toUpperCase();
      newSettings.enabled = true;
    }

    updateSettings(newSettings);
    initRealtimeSync();
    showToast(`Berhasil bergabung ke Room '${finalCode}'!`);
    stopCameraScan();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (settings.isRoomSet && e.target === e.currentTarget) {
      stopCameraScan();
      onClose();
    }
  };

  // MUST BE PLACED AFTER ALL HOOKS!
  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 overflow-y-auto"
    >
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-5 sm:p-7 border border-slate-700/80 shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-y-auto space-y-5">
        {/* Close Button if user is already in a room */}
        {settings.isRoomSet && (
          <button
            onClick={() => {
              stopCameraScan();
              onClose();
            }}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-800 rounded-full border border-slate-700/60 transition-all shrink-0 z-10"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Header Icon */}
        <div className="text-center space-y-2 pt-2 sm:pt-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-0.5 mx-auto flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400" />
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-slate-100 tracking-tight">
            {settings.isRoomSet ? 'Kelola Workspace / Room Sync' : 'Selamat Datang di Hopp'}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {mode === 'join'
              ? 'Masukkan Kode Sync atau pindai QR Code peranti asal untuk bergabung.'
              : settings.isRoomSet
              ? `Saat ini Anda berada di Room '${settings.roomCode}'. Buat room baru atau pindah ke Kode Sync lain.`
              : 'Hubungkan peranti Anda (Web, Desktop Linux/Windows, & Android) dalam satu Room Sync tanpa perlu membuat akun / login!'}
          </p>
        </div>

        {/* Current Room Badge + Copy Button — only show in choose mode */}
        {settings.isRoomSet && mode === 'choose' && (
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
              className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shrink-0"
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
                      Sudah punya Kode Sync dari peranti lain? Masukkan di sini / scan QR.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </button>

            {/* Cancel + Leave Room — only when already in a room */}
            {settings.isRoomSet && (
              <>
                {!confirmLeave ? (
                  <>
                    <button
                      onClick={() => {
                        stopCameraScan();
                        onClose();
                      }}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-2xl border border-slate-800 transition-all text-center"
                    >
                      Batal / Tetap di Room {settings.roomCode}
                    </button>
                    <button
                      onClick={() => setConfirmLeave(true)}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-red-400 hover:text-white hover:bg-red-600/20 bg-transparent rounded-2xl border border-red-500/30 hover:border-red-500/60 transition-all text-center flex items-center justify-center space-x-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar dari Room {settings.roomCode}</span>
                    </button>
                  </>
                ) : (
                  /* Inline Confirmation Panel */
                  <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 space-y-3">
                    <p className="text-xs font-semibold text-red-300 text-center">
                      Yakin ingin keluar dari Room <span className="font-mono text-red-200">{settings.roomCode}</span>?
                    </p>
                    <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                      Semua item lokal akan dihapus dan koneksi WS diputus.
                    </p>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setConfirmLeave(false)}
                        className="w-1/2 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => {
                          leaveRoom();
                          setConfirmLeave(false);
                          stopCameraScan();
                          onClose();
                        }}
                        className="w-1/2 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl border border-red-500 transition-all flex items-center justify-center space-x-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Ya, Keluar</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Join Existing Room Form */
          <form onSubmit={handleJoinExistingRoom} className="space-y-4 pt-1">
            {/* Camera / Photo QR Scanner Section */}
            <div className="space-y-2 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Camera className="w-3.5 h-3.5 text-purple-400" />
                  <span>Pindai QR Code Peranti Asal</span>
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center space-x-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>Unggah Foto</span>
                </button>
              </div>

              {cameraError && (
                <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-500/40 text-[11px] text-red-300 flex items-center justify-between gap-2">
                  <span>⚠️ {cameraError}</span>
                  <button
                    type="button"
                    onClick={() => setCameraError(null)}
                    className="text-red-400 hover:text-red-200 font-bold px-1 shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )}

              {isScanning ? (
                <div className="relative rounded-xl overflow-hidden bg-black border border-purple-500/50 aspect-video flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={stopCameraScan}
                    className="absolute top-2 right-2 px-2.5 py-1 text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all"
                  >
                    Tutup Kamera
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startCameraScan}
                  className="w-full py-2.5 px-3 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 hover:border-purple-500/60 text-purple-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Kamera untuk Pindai QR</span>
                </button>
              )}
            </div>

            {/* Visual Divider: ATAU */}
            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-slate-800/80 w-full" />
              <span className="bg-slate-950 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-bold shrink-0 rounded-full border border-slate-800 shadow-sm">
                ATAU MASUKKAN KODE MANUAL
              </span>
              <div className="border-t border-slate-800/80 w-full" />
            </div>

            {/* Manual Input Card Panel */}
            <div className="space-y-3.5 p-3.5 sm:p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Kode Sync Room (Wajib)
                </label>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Contoh: HOPP-89F1 atau 89F1"
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-indigo-500/40 rounded-xl text-center font-mono text-base sm:text-lg tracking-widest text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Pairing Secret Key (E2EE)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Opsional</span>
                </label>
                <input
                  type="text"
                  value={inputSecretKey}
                  onChange={(e) => setInputSecretKey(e.target.value)}
                  placeholder="Kosongkan jika room tidak memakai enkripsi"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-purple-300 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
                <p className="text-[11px] text-slate-500 leading-snug">
                  Disalin dari peranti asal (menu <i>Hubungkan Peranti</i>) jika room menggunakan enkripsi AES-256.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  stopCameraScan();
                  setMode('choose');
                }}
                className="w-1/3 py-2.5 sm:py-3 px-3 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-800 transition-all"
              >
                Kembali
              </button>

              <button
                type="submit"
                disabled={!inputCode.trim()}
                className="w-2/3 py-2.5 sm:py-3 px-4 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 rounded-xl shadow-indigo-600/30 transition-all"
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
