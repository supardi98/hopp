import React, { useState, useEffect, useRef } from 'react';
import { X, Gamepad2, MousePointer, Keyboard, Move, CornerDownLeft, Delete, Space, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Copy, Clipboard, Scissors, Command, Layers } from 'lucide-react';
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
  const [activeCtrl, setActiveCtrl] = useState<boolean>(false);
  const [activeAlt, setActiveAlt] = useState<boolean>(false);
  const [activeShift, setActiveShift] = useState<boolean>(false);
  const [activeWin, setActiveWin] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<'shortcuts' | 'keys' | 'emojis'>('shortcuts');
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

  const sendActionWithModifiers = (action: string, payload: { dx?: number; dy?: number; text?: string; key?: string } = {}) => {
    if (action === 'press_key' && payload.key) {
      let keyStr = payload.key;

      // When system-level modifier toggles are ON, convert combo shortcuts to single keypresses
      if (activeAlt && keyStr.toLowerCase() === 'alt+tab') {
        keyStr = 'Tab';
      }
      if (activeCtrl && keyStr.toLowerCase() === 'ctrl+c') {
        keyStr = 'c';
      }
      if (activeCtrl && keyStr.toLowerCase() === 'ctrl+v') {
        keyStr = 'v';
      }
      if (activeCtrl && keyStr.toLowerCase() === 'ctrl+a') {
        keyStr = 'a';
      }
      if (activeCtrl && keyStr.toLowerCase() === 'ctrl+z') {
        keyStr = 'z';
      }
      if (activeCtrl && keyStr.toLowerCase() === 'ctrl+x') {
        keyStr = 'x';
      }

      sendAction('press_key', { ...payload, key: keyStr });
      return;
    }

    sendAction(action, payload);
  };

  const isMouseDownRef = useRef<boolean>(false);
  const isTouchActiveRef = useRef<boolean>(false);
  const lastTapTimestampRef = useRef<number>(0);
  const lastMoveTimestampRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const [isDraggingVisual, setIsDraggingVisual] = useState<boolean>(false);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // OS Native Acceleration Curve for Pixel-Perfect Micro Control + Fast Sweeps
  const calculateAcceleratedDelta = (rawDx: number, rawDy: number, timeDeltaMs: number) => {
    if (timeDeltaMs <= 0) return { dx: Math.round(rawDx * 1.2), dy: Math.round(rawDy * 1.2) };

    const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    const speed = dist / timeDeltaMs; // px per ms

    let accelFactor = 1.0;
    if (speed < 0.2) {
      // Micro precision for precise text selection between letters
      accelFactor = 0.85;
    } else if (speed < 0.6) {
      // Normal speed
      accelFactor = 1.1 + (speed - 0.2) * 1.2;
    } else {
      // Fast flick acceleration
      accelFactor = 1.6 + Math.min(1.4, (speed - 0.6) * 1.8);
    }

    return {
      dx: Math.round(rawDx * accelFactor),
      dy: Math.round(rawDy * accelFactor),
    };
  };

  const startContinuousScroll = (direction: 'scroll_up' | 'scroll_down') => {
    stopContinuousScroll();
    sendAction(direction);

    scrollTimerRef.current = setTimeout(() => {
      scrollIntervalRef.current = setInterval(() => {
        sendAction(direction);
      }, 60);
    }, 180);
  };

  const stopContinuousScroll = () => {
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const toggleModifier = (mod: 'ctrl' | 'alt' | 'shift' | 'win') => {
    if (mod === 'ctrl') {
      const next = !activeCtrl;
      setActiveCtrl(next);
      sendAction('press_key', { key: next ? 'Ctrl_down' : 'Ctrl_up' });
    } else if (mod === 'alt') {
      const next = !activeAlt;
      setActiveAlt(next);
      sendAction('press_key', { key: next ? 'Alt_down' : 'Alt_up' });
    } else if (mod === 'shift') {
      const next = !activeShift;
      setActiveShift(next);
      sendAction('press_key', { key: next ? 'Shift_down' : 'Shift_up' });
    } else if (mod === 'win') {
      const next = !activeWin;
      setActiveWin(next);
      sendAction('press_key', { key: next ? 'Win_down' : 'Win_up' });
    }
  };

  useEffect(() => {
    return () => {
      stopContinuousScroll();
      if (isDraggingRef.current) {
        sendAction('left_up');
      }
      if (activeCtrl) sendAction('press_key', { key: 'Ctrl_up' });
      if (activeAlt) sendAction('press_key', { key: 'Alt_up' });
      if (activeShift) sendAction('press_key', { key: 'Shift_up' });
      if (activeWin) sendAction('press_key', { key: 'Win_up' });
    };
  }, [activeCtrl, activeAlt, activeShift, activeWin]);

  // Touchpad Gestures Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isTouchActiveRef.current = true;
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimestampRef.current;

    if (e.targetTouches.length === 1) {
      lastTouchRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
      touchStartTimestampRef.current = now;
      lastMoveTimestampRef.current = now;

      // Double-Tap & Drag Detection (2nd tap within 350ms)
      if (timeSinceLastTap < 350 && timeSinceLastTap > 30) {
        isDraggingRef.current = true;
        setIsDraggingVisual(true);
        sendAction('left_down');
      } else {
        isDraggingRef.current = false;
        setIsDraggingVisual(false);
      }
    } else if (e.targetTouches.length === 2) {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDraggingVisual(false);
        sendAction('left_up');
      }
      lastTouchRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
      touchStartTimestampRef.current = now;
      lastMoveTimestampRef.current = now;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const timeDelta = Math.max(1, now - lastMoveTimestampRef.current);
    lastMoveTimestampRef.current = now;

    if (e.targetTouches.length === 1 && lastTouchRef.current) {
      const rawDx = e.targetTouches[0].clientX - lastTouchRef.current.x;
      const rawDy = e.targetTouches[0].clientY - lastTouchRef.current.y;

      lastTouchRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };

      const { dx, dy } = calculateAcceleratedDelta(rawDx, rawDy, timeDelta);

      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        sendAction('move_mouse', { dx, dy });
      }
    } else if (e.targetTouches.length === 2 && lastTouchRef.current) {
      const dy = e.targetTouches[0].clientY - lastTouchRef.current.y;
      if (Math.abs(dy) > 6) {
        sendAction(dy < 0 ? 'scroll_down' : 'scroll_up');
        lastTouchRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const duration = Date.now() - touchStartTimestampRef.current;

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDraggingVisual(false);
      sendAction('left_up');
      lastTapTimestampRef.current = 0;
    } else if (duration < 250 && duration > 20) {
      if (e.changedTouches.length === 1) {
        sendAction('left_click');
        lastTapTimestampRef.current = Date.now();
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
    lastMoveTimestampRef.current = Date.now();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchActiveRef.current) return;
    if (isMouseDownRef.current && lastTouchRef.current) {
      const now = Date.now();
      const timeDelta = Math.max(1, now - lastMoveTimestampRef.current);
      lastMoveTimestampRef.current = now;

      const rawDx = e.clientX - lastTouchRef.current.x;
      const rawDy = e.clientY - lastTouchRef.current.y;
      lastTouchRef.current = { x: e.clientX, y: e.clientY };

      const { dx, dy } = calculateAcceleratedDelta(rawDx, rawDy, timeDelta);

      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
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

      {/* Laptop Style Integrated Trackpad Container */}
      <div className={`relative flex-1 w-full my-2 transition-all rounded-3xl flex flex-col select-none touch-none shadow-2xl overflow-hidden ${
        isDraggingVisual
          ? 'bg-emerald-950/20 border-2 border-emerald-500/80 ring-4 ring-emerald-500/20'
          : 'bg-slate-900/40 border border-indigo-500/30'
      }`}>
        {/* Touch Surface */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex-1 w-full p-4 flex flex-col items-center justify-center cursor-crosshair relative"
        >
          <Move className={`w-10 h-10 transition-colors mb-2 ${isDraggingVisual ? 'text-emerald-400 animate-pulse' : 'text-indigo-400/40'}`} />
          <p className="text-xs sm:text-sm font-mono text-slate-300 font-bold text-center select-none pointer-events-none">
            Geser 1 jari untuk mouse • 2 jari untuk scroll
          </p>
          <p className={`text-[11px] font-semibold text-center mt-1 select-none pointer-events-none transition-colors ${
            isDraggingVisual ? 'text-emerald-400 font-bold' : 'text-indigo-300'
          }`}>
            {isDraggingVisual ? '⚡ Mode Drag & Seleksi Teks Aktif' : 'Tap 2x & tahan jari untuk seleksi teks / drag window'}
          </p>
        </div>

        {/* Laptop Trackpad Bottom Click Buttons (50% / 50% Full Width Split) */}
        <div className="grid grid-cols-2 w-full border-t border-slate-800 bg-slate-950/90 shrink-0">
          <button
            onMouseDown={() => {
              sendAction('left_down');
              setIsDraggingVisual(true);
            }}
            onMouseUp={() => {
              sendAction('left_up');
              setIsDraggingVisual(false);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendAction('left_down');
              setIsDraggingVisual(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              sendAction('left_up');
              setIsDraggingVisual(false);
            }}
            onTouchCancel={() => {
              sendAction('left_up');
              setIsDraggingVisual(false);
            }}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-r border-slate-800/80 transition-all flex items-center justify-center space-x-2 select-none cursor-pointer ${
              isDraggingVisual
                ? 'bg-emerald-600/40 text-emerald-200 border-emerald-500/50'
                : 'text-slate-200 hover:text-white hover:bg-indigo-600/30 active:bg-indigo-600/50'
            }`}
          >
            <MousePointer className={`w-4 h-4 ${isDraggingVisual ? 'text-emerald-400' : 'text-indigo-400'}`} />
            <span>{isDraggingVisual ? 'Dragging...' : 'Klik Kiri'}</span>
          </button>

          <button
            onClick={() => sendAction('right_click')}
            className="py-3.5 px-4 text-xs sm:text-sm font-bold text-slate-200 hover:text-white hover:bg-indigo-600/30 transition-all active:bg-indigo-600/50 active:scale-[0.99] flex items-center justify-center space-x-2 select-none cursor-pointer"
          >
            <MousePointer className="w-4 h-4 text-slate-400" />
            <span>Klik Kanan</span>
          </button>
        </div>
      </div>

      {/* Bottom Controls Container */}
      <div className="space-y-2 shrink-0 select-none">
        {/* Tier 1: Fixed Sticky Modifier Toggles & Navigation D-Pad */}
        <div className="flex items-center justify-between gap-1.5 shrink-0 bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5">
          {/* Modifier Toggle Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleModifier('ctrl')}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-xl border transition-all active:scale-95 cursor-pointer ${
                activeCtrl
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400/40'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              CTRL
            </button>

            <button
              type="button"
              onClick={() => toggleModifier('alt')}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-xl border transition-all active:scale-95 cursor-pointer ${
                activeAlt
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/30 ring-2 ring-purple-400/40'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              ALT
            </button>

            <button
              type="button"
              onClick={() => toggleModifier('shift')}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-xl border transition-all active:scale-95 cursor-pointer ${
                activeShift
                  ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/40'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              SHIFT
            </button>

            <button
              type="button"
              onClick={() => toggleModifier('win')}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-xl border transition-all active:scale-95 cursor-pointer ${
                activeWin
                  ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-500/30 ring-2 ring-sky-400/40'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              WIN
            </button>
          </div>

          {/* Navigation Arrow D-Pad */}
          <div className="flex items-center gap-0.5 bg-slate-950/80 border border-slate-800/80 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => sendActionWithModifiers('press_key', { key: 'Left' })}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => sendActionWithModifiers('press_key', { key: 'Up' })}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg active:scale-95 cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => sendActionWithModifiers('press_key', { key: 'Down' })}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg active:scale-95 cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => sendActionWithModifiers('press_key', { key: 'Right' })}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg active:scale-95 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tier 2: Remote Keyboard Input Form */}
        <form onSubmit={handleSendText} className="space-y-1.5 shrink-0">
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
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1.5 transition-all border cursor-pointer active:scale-95 ${
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
              className={`w-full px-3.5 py-2 bg-slate-900/90 border transition-all rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono select-text ${
                subscribeTyping ? 'border-emerald-500/50 focus:border-emerald-400 ring-1 ring-emerald-500/20' : 'border-slate-800 focus:border-indigo-500'
              }`}
            />
            <button
              type="submit"
              disabled={!inputText}
              className={`px-4 py-2 text-xs font-bold text-white transition-all shrink-0 cursor-pointer active:scale-95 select-none rounded-2xl shadow-md ${
                subscribeTyping
                  ? 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40'
                  : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40'
              }`}
            >
              {subscribeTyping ? 'Bersihkan' : 'Kirim'}
            </button>
          </div>

          {/* Tier 3: Focused Category Tab Bar & Content */}
          <div className="space-y-1 pt-0.5">
            {/* Category Selection Tabs */}
            <div className="flex items-center space-x-1.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveCategory('shortcuts')}
                className={`px-3 py-1 rounded-xl transition-all border ${
                  activeCategory === 'shortcuts'
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
                }`}
              >
                Shortcuts ⚡
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('keys')}
                className={`px-3 py-1 rounded-xl transition-all border ${
                  activeCategory === 'keys'
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
                }`}
              >
                Keys ⌨️
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('emojis')}
                className={`px-3 py-1 rounded-xl transition-all border ${
                  activeCategory === 'emojis'
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
                }`}
              >
                Emojis 😀
              </button>
            </div>

            {/* Focused Category Content */}
            <div className="flex items-center space-x-2 overflow-x-auto py-1 no-scrollbar select-none min-h-[36px]">
              {activeCategory === 'shortcuts' && (
                <>
                  <button
                    type="button"
                    onClick={() => sendActionWithModifiers('press_key', { key: 'Ctrl+c' })}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy (Ctrl+C)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendActionWithModifiers('press_key', { key: 'Ctrl+v' })}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Paste (Ctrl+V)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendActionWithModifiers('press_key', { key: 'Ctrl+a' })}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    <span>Select All (Ctrl+A)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendActionWithModifiers('press_key', { key: 'Ctrl+z' })}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    <span>Undo (Ctrl+Z)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendActionWithModifiers('press_key', { key: 'Ctrl+x' })}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Cut (Ctrl+X)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendActionWithModifiers('press_key', { key: 'Alt+Tab' })}
                    className="px-3 py-1.5 text-xs font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Alt+Tab</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendActionWithModifiers('press_key', { key: 'Super' })}
                    className="px-3 py-1.5 text-xs font-semibold text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    <Command className="w-3.5 h-3.5" />
                    <span>Win / Super</span>
                  </button>
                </>
              )}

              {activeCategory === 'keys' && (
                <>
                  <button
                    type="button"
                    onClick={() => sendActionWithModifiers('press_key', { key: 'Enter' })}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    <CornerDownLeft className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Enter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendActionWithModifiers('press_key', { key: 'Backspace' })}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    <Delete className="w-3.5 h-3.5 text-red-400" />
                    <span>Backspace</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendActionWithModifiers('press_key', { key: 'Delete' })}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    Del
                  </button>

                  <button
                    type="button"
                    onClick={() => sendActionWithModifiers('press_key', { key: 'Space' })}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    <Space className="w-3.5 h-3.5 text-slate-400" />
                    <span>Space</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendActionWithModifiers('press_key', { key: 'Tab' })}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    Tab
                  </button>

                  <button
                    type="button"
                    onClick={() => sendActionWithModifiers('press_key', { key: 'Escape' })}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    Esc
                  </button>

                  {/* Continuous Scroll Buttons */}
                  <button
                    type="button"
                    onMouseDown={() => startContinuousScroll('scroll_up')}
                    onMouseUp={stopContinuousScroll}
                    onMouseLeave={stopContinuousScroll}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      startContinuousScroll('scroll_up');
                    }}
                    onTouchEnd={stopContinuousScroll}
                    onTouchCancel={stopContinuousScroll}
                    className="px-3 py-1.5 text-xs font-bold text-indigo-300 bg-slate-900/90 hover:bg-indigo-600/30 border border-slate-800 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Scroll Up</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={() => startContinuousScroll('scroll_down')}
                    onMouseUp={stopContinuousScroll}
                    onMouseLeave={stopContinuousScroll}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      startContinuousScroll('scroll_down');
                    }}
                    onTouchEnd={stopContinuousScroll}
                    onTouchCancel={stopContinuousScroll}
                    className="px-3 py-1.5 text-xs font-bold text-indigo-300 bg-slate-900/90 hover:bg-indigo-600/30 border border-slate-800 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 select-none cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Scroll Down</span>
                  </button>
                </>
              )}

              {activeCategory === 'emojis' && (
                <>
                  {['😀', '🚀', '🔥', '👍', '❤️', '🎉', '😂', '✨', '💯', '📌', '💡', '✅', '❌', '👀', '⭐', '🙌'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => sendAction('type_text', { text: emoji })}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl shrink-0 active:scale-95 select-none transition-transform hover:scale-110 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
