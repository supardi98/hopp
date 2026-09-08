import React, { useState, useEffect, useRef } from 'react';
import { X, Gamepad2, MousePointer, Keyboard, Move, CornerDownLeft, Delete, Space, ArrowUp, ArrowDown } from 'lucide-react';
import type { Device } from '../types';
import { useHoppStore } from '../store/useHoppStore';
import { wsClient } from '../lib/wsClient';

interface RemoteTouchpadModalProps {
  targetDevice: Device;
  onClose: () => void;
}

export const RemoteTouchpadModal: React.FC<RemoteTouchpadModalProps> = ({
  targetDevice,
  onClose,
}) => {
  const { settings, showToast } = useHoppStore();
  const [inputText, setInputText] = useState('');
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartTimestampRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sendAction = (action: string, payload: { dx?: number; dy?: number; text?: string; key?: string } = {}) => {
    wsClient.sendRemoteControlInput(targetDevice.id, action, payload, settings.roomCode);
  };

  // Touchpad Gestures Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchStartTimestampRef.current = Date.now();
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && lastTouchRef.current) {
      const dx = (e.touches[0].clientX - lastTouchRef.current.x) * 1.5;
      const dy = (e.touches[0].clientY - lastTouchRef.current.y) * 1.5;

      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        sendAction('move_mouse', { dx, dy });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const duration = Date.now() - touchStartTimestampRef.current;
    // Tap gesture detection (< 200ms duration)
    if (duration < 200) {
      if (e.changedTouches.length === 1) {
        sendAction('left_click');
      }
    }
    lastTouchRef.current = null;
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText) return;
    sendAction('type_text', { text: inputText });
    showToast(`Teks dikirim ke ${targetDevice.name}`);
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-4 sm:p-6 border border-slate-700/80 shadow-2xl flex flex-col max-h-[95vh] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-100">Remote Touchpad & Keyboard</h3>
              <p className="text-[11px] text-slate-400">Mengendalikan {targetDevice.name} ({targetDevice.platform})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Touchpad Glass Surface */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-full h-56 sm:h-64 bg-slate-950/90 border border-indigo-500/30 rounded-2xl p-4 flex flex-col items-center justify-center select-none touch-none cursor-crosshair shadow-inner"
        >
          <Move className="w-8 h-8 text-indigo-400/40 mb-2 animate-pulse" />
          <p className="text-xs font-mono text-slate-400 font-semibold text-center">
            Geser jari untuk menggerakkan mouse PC
          </p>
          <p className="text-[10px] text-slate-500 text-center mt-1">
            Tap 1 jari = Klik Kiri
          </p>
        </div>

        {/* Physical Click Buttons Bar */}
        <div className="grid grid-cols-5 gap-2 shrink-0">
          <button
            onClick={() => sendAction('left_click')}
            className="py-2.5 px-2 text-xs font-bold text-slate-200 bg-slate-900 hover:bg-indigo-600 hover:text-white border border-slate-800 rounded-xl transition-all active:scale-95 flex items-center justify-center space-x-1"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Klik Left</span>
          </button>

          <button
            onClick={() => sendAction('double_click')}
            className="py-2.5 px-2 text-xs font-bold text-slate-200 bg-slate-900 hover:bg-indigo-600 hover:text-white border border-slate-800 rounded-xl transition-all active:scale-95"
          >
            2x Klik
          </button>

          <button
            onClick={() => sendAction('right_click')}
            className="py-2.5 px-2 text-xs font-bold text-slate-200 bg-slate-900 hover:bg-indigo-600 hover:text-white border border-slate-800 rounded-xl transition-all active:scale-95"
          >
            Klik Right
          </button>

          <button
            onClick={() => sendAction('scroll_up')}
            className="py-2.5 px-2 text-xs font-bold text-indigo-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all flex items-center justify-center"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          <button
            onClick={() => sendAction('scroll_down')}
            className="py-2.5 px-2 text-xs font-bold text-indigo-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all flex items-center justify-center"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>

        {/* Remote Keyboard Input Form */}
        <form onSubmit={handleSendText} className="space-y-2 pt-1 shrink-0">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono font-bold text-indigo-400 flex items-center space-x-1.5">
              <Keyboard className="w-3.5 h-3.5" />
              <span>Ketik & Kirim Teks Ke PC</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik teks di sini lalu tekan Kirim"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
            >
              Kirim
            </button>
          </div>

          {/* Quick Key Buttons */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 no-scrollbar">
            <button
              type="button"
              onClick={() => sendAction('press_key', { key: 'Enter' })}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center space-x-1 shrink-0"
            >
              <CornerDownLeft className="w-3 h-3 text-indigo-400" />
              <span>Enter</span>
            </button>

            <button
              type="button"
              onClick={() => sendAction('press_key', { key: 'Backspace' })}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center space-x-1 shrink-0"
            >
              <Delete className="w-3 h-3 text-red-400" />
              <span>Backspace</span>
            </button>

            <button
              type="button"
              onClick={() => sendAction('press_key', { key: 'Space' })}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center space-x-1 shrink-0"
            >
              <Space className="w-3 h-3 text-slate-400" />
              <span>Space</span>
            </button>

            <button
              type="button"
              onClick={() => sendAction('press_key', { key: 'Tab' })}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg shrink-0"
            >
              Tab
            </button>

            <button
              type="button"
              onClick={() => sendAction('press_key', { key: 'Escape' })}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg shrink-0"
            >
              Esc
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
