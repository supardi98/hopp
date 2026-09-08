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
  const [subscribeTyping, setSubscribeTyping] = useState<boolean>(false);
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

  const isMouseDownRef = useRef<boolean>(false);
  const isTouchActiveRef = useRef<boolean>(false);

  // Touchpad Gestures Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isTouchActiveRef.current = true;
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
    if (duration < 250 && duration > 20) {
      if (e.changedTouches.length === 1) {
        sendAction('left_click');
      }
    }
    lastTouchRef.current = null;
    setTimeout(() => {
      isTouchActiveRef.current = false;
    }, 400);
  };

  // Mouse Handlers for Desktop Testing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchActiveRef.current) return;
    isMouseDownRef.current = true;
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
    touchStartTimestampRef.current = Date.now();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchActiveRef.current) return;
    if (isMouseDownRef.current && lastTouchRef.current) {
      const dx = (e.clientX - lastTouchRef.current.x) * 1.5;
      const dy = (e.clientY - lastTouchRef.current.y) * 1.5;
      lastTouchRef.current = { x: e.clientX, y: e.clientY };
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        sendAction('move_mouse', { dx, dy });
      }
    }
  };

  const handleMouseUp = () => {
    if (isTouchActiveRef.current) return;
    if (isMouseDownRef.current) {
      const duration = Date.now() - touchStartTimestampRef.current;
      if (duration < 250 && duration > 20) {
        sendAction('left_click');
      }
    }
    isMouseDownRef.current = false;
    lastTouchRef.current = null;
  };

  const handleBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
    if (subscribeTyping) {
      const nativeEvent = e.nativeEvent as InputEvent;
      if (nativeEvent.data) {
        e.preventDefault();
        sendAction('type_text', { text: nativeEvent.data });
        setInputText('');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (subscribeTyping) {
      if (newValue.length > 0) {
        sendAction('type_text', { text: newValue });
        setInputText('');
        return;
      }
    }
    setInputText(newValue);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (subscribeTyping) {
      if (e.key === 'Backspace') {
        e.preventDefault();
        sendAction('press_key', { key: 'Backspace' });
        setInputText('');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        sendAction('press_key', { key: 'Enter' });
        setInputText('');
      }
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText) return;
    if (!subscribeTyping) {
      sendAction('type_text', { text: inputText });
      showToast(`Teks dikirim ke ${targetDevice.name}`);
    }
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between p-3 sm:p-5 bg-slate-950/98 select-none animate-fadeIn overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 shrink-0 select-none">
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
          className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Fullscreen Dynamic Touchpad Glass Surface */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative flex-1 w-full my-3 bg-slate-900/40 border border-indigo-500/30 rounded-3xl p-4 flex flex-col items-center justify-center select-none touch-none cursor-crosshair shadow-2xl overflow-hidden"
      >
        <Move className="w-10 h-10 text-indigo-400/50 mb-3" />
        <p className="text-xs sm:text-sm font-mono text-slate-300 font-bold text-center select-none pointer-events-none">
          Geser jari / mouse untuk menggerakkan mouse PC
        </p>
        <p className="text-[11px] text-slate-500 text-center mt-1 select-none pointer-events-none">
          Tap / Click = Klik Kiri
        </p>
      </div>

      {/* Bottom Controls Container */}
      <div className="space-y-3 shrink-0 select-none">
        {/* Physical Click Buttons Bar */}
        <div className="grid grid-cols-5 gap-2 shrink-0">
          <button
            onClick={() => sendAction('left_click')}
            className="py-3 px-2 text-xs font-bold text-slate-200 bg-slate-900/90 hover:bg-indigo-600 hover:text-white border border-slate-800 rounded-2xl transition-all active:scale-95 flex items-center justify-center space-x-1 select-none"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Klik Left</span>
          </button>

          <button
            onClick={() => sendAction('double_click')}
            className="py-3 px-2 text-xs font-bold text-slate-200 bg-slate-900/90 hover:bg-indigo-600 hover:text-white border border-slate-800 rounded-2xl transition-all active:scale-95 select-none"
          >
            2x Klik
          </button>

          <button
            onClick={() => sendAction('right_click')}
            className="py-3 px-2 text-xs font-bold text-slate-200 bg-slate-900/90 hover:bg-indigo-600 hover:text-white border border-slate-800 rounded-2xl transition-all active:scale-95 select-none"
          >
            Klik Right
          </button>

          <button
            onClick={() => sendAction('scroll_up')}
            className="py-3 px-2 text-xs font-bold text-indigo-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-all flex items-center justify-center active:scale-95 select-none"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          <button
            onClick={() => sendAction('scroll_down')}
            className="py-3 px-2 text-xs font-bold text-indigo-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-all flex items-center justify-center active:scale-95 select-none"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>

        {/* Remote Keyboard Input Form */}
        <form onSubmit={handleSendText} className="space-y-2 pt-1 shrink-0">
          <div className="flex items-center justify-between select-none flex-wrap gap-1">
            <label className="text-[11px] font-mono font-bold text-indigo-400 flex items-center space-x-1.5">
              <Keyboard className="w-3.5 h-3.5" />
              <span>Ketik & Kirim Teks Ke PC</span>
            </label>

            {/* Subscribe Ketikan (Live Typing) Toggle Switch */}
            <button
              type="button"
              onClick={() => {
                const nextState = !subscribeTyping;
                setSubscribeTyping(nextState);
                setInputText('');
                showToast(nextState ? 'Subscribe Ketikan Aktif (Live Instant)' : 'Subscribe Ketikan Non-aktif (Manual)');
              }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center space-x-1.5 transition-all border cursor-pointer active:scale-95 ${
                subscribeTyping
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${subscribeTyping ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>Subscribe Ketikan: {subscribeTyping ? 'ON (Live)' : 'OFF'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={inputText}
              onBeforeInput={handleBeforeInput}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder={subscribeTyping ? '⚡ Mode Live Aktif: Karakter terkirim saat mengetik...' : 'Ketik teks di sini lalu tekan Kirim'}
              className={`w-full px-3.5 py-2.5 bg-slate-900/90 border transition-all rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono select-text ${
                subscribeTyping ? 'border-emerald-500/50 focus:border-emerald-400 ring-1 ring-emerald-500/20' : 'border-slate-800 focus:border-indigo-500'
              }`}
            />
            <button
              type="submit"
              disabled={!inputText}
              className={`px-4 py-2.5 text-xs font-bold text-white transition-all shrink-0 cursor-pointer active:scale-95 select-none rounded-2xl shadow-md ${
                subscribeTyping
                  ? 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40'
                  : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40'
              }`}
            >
              {subscribeTyping ? 'Bersihkan' : 'Kirim'}
            </button>
          </div>

          {/* Quick Key & Quick Emoji Buttons */}
          <div className="flex items-center space-x-2 overflow-x-auto pt-1 no-scrollbar select-none">
            <button
              type="button"
              onClick={() => sendAction('press_key', { key: 'Enter' })}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none"
            >
              <CornerDownLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span>Enter</span>
            </button>

            <button
              type="button"
              onClick={() => sendAction('press_key', { key: 'Backspace' })}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none"
            >
              <Delete className="w-3.5 h-3.5 text-red-400" />
              <span>Backspace</span>
            </button>

            <button
              type="button"
              onClick={() => sendAction('press_key', { key: 'Space' })}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none"
            >
              <Space className="w-3.5 h-3.5 text-slate-400" />
              <span>Space</span>
            </button>

            <button
              type="button"
              onClick={() => sendAction('press_key', { key: 'Tab' })}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl shrink-0 active:scale-95 select-none"
            >
              Tab
            </button>

            <button
              type="button"
              onClick={() => sendAction('press_key', { key: 'Escape' })}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl shrink-0 active:scale-95 select-none"
            >
              Esc
            </button>

            <div className="h-4 w-px bg-slate-800 shrink-0 mx-1" />

            {['😀', '🚀', '🔥', '👍', '❤️', '🎉', '😂', '✨', '💯', '📌'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendAction('type_text', { text: emoji })}
                className="px-2.5 py-1.5 text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl shrink-0 active:scale-95 select-none transition-transform hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
};
