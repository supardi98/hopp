import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, Delete } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';

interface PinPromptProps {
  onVerify?: (success: boolean) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

export const PinLockModal: React.FC<PinPromptProps> = ({
  onVerify,
  onCancel,
  title,
  subtitle,
}) => {
  const { isAppLocked, unlockApp, settings } = useHoppStore();
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const isModalMode = Boolean(onVerify);
  const activeTitle = title || (isModalMode ? 'Verifikasi PIN Keamanan' : 'Hopp Terkunci');
  const activeSubtitle =
    subtitle || (isModalMode ? 'Masukkan PIN 4-digit untuk membuka data sensitif ini.' : 'Masukkan PIN 4-digit untuk membuka akses aplikasi.');

  useEffect(() => {
    setPinDigits([]);
    setErrorMsg(null);
  }, [isAppLocked, isModalMode]);

  // Handle keyboard typing
  useEffect(() => {
    if (!isAppLocked && !isModalMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pinDigits.length < 4) {
          handleInputDigit(e.key);
        }
      } else if (e.key === 'Backspace') {
        setPinDigits((prev) => prev.slice(0, -1));
        setErrorMsg(null);
      } else if (e.key === 'Escape' && isModalMode && onCancel) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAppLocked, isModalMode, pinDigits, onCancel]);

  if (!isAppLocked && !isModalMode) return null;

  const handleInputDigit = (digit: string) => {
    if (pinDigits.length >= 4) return;
    const newDigits = [...pinDigits, digit];
    setPinDigits(newDigits);
    setErrorMsg(null);

    if (newDigits.length === 4) {
      const enteredPin = newDigits.join('');
      setTimeout(() => {
        if (isModalMode && onVerify) {
          if (settings.appPin === enteredPin) {
            onVerify(true);
          } else {
            triggerError('PIN Salah!');
            onVerify(false);
          }
        } else {
          const success = unlockApp(enteredPin);
          if (!success) {
            triggerError('PIN Salah! Silakan coba lagi.');
          }
        }
      }, 150);
    }
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setShake(true);
    setPinDigits([]);
    setTimeout(() => setShake(false), 500);
  };

  const handleDeleteDigit = () => {
    setPinDigits((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 animate-fadeIn">
      <div
        className={`relative w-full max-w-sm glass-panel rounded-3xl p-6 border border-slate-700/80 shadow-2xl space-y-6 text-center transition-transform ${
          shake ? 'animate-bounce border-red-500/80 ring-2 ring-red-500/50' : ''
        }`}
      >
        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-0.5 mx-auto shadow-xl shadow-indigo-500/30 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            {isModalMode ? (
              <ShieldAlert className="w-8 h-8 text-amber-400" />
            ) : (
              <Lock className="w-8 h-8 text-indigo-400" />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-xl font-black text-slate-100 tracking-tight">{activeTitle}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{activeSubtitle}</p>
        </div>

        {/* PIN Dot Indicators */}
        <div className="flex items-center justify-center space-x-4 py-2">
          {[0, 1, 2, 3].map((index) => {
            const filled = index < pinDigits.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  filled
                    ? 'bg-indigo-500 border-indigo-400 scale-110 shadow-lg shadow-indigo-500/50'
                    : 'bg-slate-900 border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error Message */}
        {errorMsg && (
          <p className="text-xs font-bold text-red-400 animate-fadeIn font-mono">{errorMsg}</p>
        )}

        {/* Digital Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleInputDigit(num)}
              className="py-3 text-lg font-black font-mono text-slate-200 bg-slate-900/80 hover:bg-indigo-600 hover:text-white border border-slate-800 hover:border-indigo-400 rounded-2xl transition-all active:scale-95 shadow-sm"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleInputDigit('0')}
            className="py-3 text-lg font-black font-mono text-slate-200 bg-slate-900/80 hover:bg-indigo-600 hover:text-white border border-slate-800 hover:border-indigo-400 rounded-2xl transition-all active:scale-95 shadow-sm"
          >
            0
          </button>
          <button
            onClick={handleDeleteDigit}
            className="py-3 text-sm font-bold text-slate-400 hover:text-red-400 bg-slate-900/80 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/40 rounded-2xl transition-all flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Cancel Button (only for modal prompt mode) */}
        {isModalMode && onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-800 transition-colors"
          >
            Batal
          </button>
        )}
      </div>
    </div>
  );
};
