import React, { useState, useEffect, useRef } from 'react';
import {
  Command,
  Copy,
  Check,
  Pin,
  Image as ImageIcon,
  FileUp,
  Code,
  KeyRound,
  QrCode,
  ShieldCheck,
  Settings,
  X,
  Zap,
} from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';
import { writeSystemClipboard } from '../lib/nativeClipboard';
import type { ClipboardItem } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const {
    items,
    setActiveTab,
    setOnboardingOpen,
    setPairingModalOpen,
    setE2EEModalOpen,
    setSettingsModalOpen,
    showToast,
  } = useHoppStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // System Action Commands
  const systemActions = [
    {
      id: 'cmd-room',
      title: 'Kelola Workspace / Room Sync',
      subtitle: 'Buat room baru, ganti kode sync, atau salin kode room',
      icon: <KeyRound className="w-4 h-4 text-indigo-400" />,
      action: () => setOnboardingOpen(true),
    },
    {
      id: 'cmd-pairing',
      title: 'Hubungkan Device Baru (QR Code)',
      subtitle: 'Pindai Kode QR atau salin link pairing instan',
      icon: <QrCode className="w-4 h-4 text-purple-400" />,
      action: () => setPairingModalOpen(true),
    },
    {
      id: 'cmd-e2ee',
      title: 'Pengaturan Enkripsi E2EE (AES-256)',
      subtitle: 'Ubah Secret Key atau atur protokol keamanan',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      action: () => setE2EEModalOpen(true),
    },
    {
      id: 'cmd-settings',
      title: 'Buka Modal Pengaturan',
      subtitle: 'Atur auto-sync, WebRTC P2P, dan preferensi aplikasi',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      action: () => setSettingsModalOpen(true),
    },
    {
      id: 'cmd-tab-all',
      title: 'Filter: Semua Item Clipboard',
      subtitle: 'Tampilkan seluruh riwayat clipboard',
      icon: <Zap className="w-4 h-4 text-cyan-400" />,
      action: () => setActiveTab('all'),
    },
    {
      id: 'cmd-tab-pinned',
      title: 'Filter: Item Terpin (Pinned)',
      subtitle: 'Hanya tampilkan item yang di-pin',
      icon: <Pin className="w-4 h-4 text-amber-400" />,
      action: () => setActiveTab('pinned'),
    },
  ];

  // Filter clipboard items by search query (including text, filename, and tags)
  const filteredItems = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();

    // Tag matching (e.g. #kerja or kerja)
    if (item.tags && item.tags.some((t) => t.toLowerCase().includes(q))) return true;

    // File name matching
    if (item.fileName && item.fileName.toLowerCase().includes(q)) return true;

    // Content matching
    return item.content.toLowerCase().includes(q);
  });

  const matchingActions = systemActions.filter(
    (act) =>
      act.title.toLowerCase().includes(query.toLowerCase()) ||
      act.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const allNavigableList = [
    ...matchingActions.map((act) => ({ type: 'action' as const, data: act })),
    ...filteredItems.map((item) => ({ type: 'item' as const, data: item })),
  ];

  const handleCopyItem = async (item: ClipboardItem) => {
    try {
      const textToCopy = item.contentType === 'image' || item.contentType === 'file' ? item.fileName || item.content : item.content;
      await writeSystemClipboard(textToCopy);
      setCopiedId(item.id);
      showToast('Disalin dari Command Palette!');
      setTimeout(() => {
        setCopiedId(null);
        onClose();
      }, 300);
    } catch (err) {
      showToast('Gagal menyalin item');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allNavigableList.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allNavigableList.length) % Math.max(1, allNavigableList.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = allNavigableList[selectedIndex];
      if (current) {
        if (current.type === 'action') {
          current.data.action();
          onClose();
        } else {
          handleCopyItem(current.data);
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center space-x-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <Command className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Cari clipboard, tag (#Kerja), atau ketik perintah... (Ctrl + K)"
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800/50"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto p-2 space-y-4 divide-y divide-slate-800/40">
          {/* Quick Actions Group */}
          {matchingActions.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider px-3 py-1">
                Perintah Sistem
              </p>
              {matchingActions.map((act, index) => {
                const globalIndex = index;
                const isSelected = selectedIndex === globalIndex;

                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      act.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/30 border border-indigo-500/40 text-slate-100'
                        : 'hover:bg-slate-900/60 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                        {act.icon}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold truncate">{act.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{act.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                      Jalankan
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Clipboard Items Group */}
          <div className="space-y-1 pt-2">
            <p className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider px-3 py-1 flex items-center justify-between">
              <span>Riwayat Clipboard ({filteredItems.length})</span>
              <span className="text-[9px] text-slate-500 font-normal">Tekan Enter untuk salin</span>
            </p>

            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-1">
                <p className="text-xs font-semibold">Tidak ada clipboard yang cocok</p>
                <p className="text-[11px]">Coba ketik kata kunci lain atau hapus filter</p>
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const globalIndex = matchingActions.length + index;
                const isSelected = selectedIndex === globalIndex;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleCopyItem(item)}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/30 border border-indigo-500/40 text-slate-100'
                        : 'hover:bg-slate-900/60 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate max-w-[80%]">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 text-slate-400">
                        {item.contentType === 'image' ? (
                          <ImageIcon className="w-4 h-4 text-purple-400" />
                        ) : item.contentType === 'file' ? (
                          <FileUp className="w-4 h-4 text-blue-400" />
                        ) : item.contentType === 'code' ? (
                          <Code className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>

                      <div className="truncate space-y-0.5">
                        <div className="flex items-center space-x-2 truncate">
                          <p className="text-xs font-mono font-medium truncate">
                            {item.fileName || item.content.replace(/\n/g, ' ')}
                          </p>
                          {item.pinned && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded">
                              Pinned
                            </span>
                          )}
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex items-center space-x-1 shrink-0">
                              {item.tags.map((t) => (
                                <span key={t} className="px-1.5 py-0.2 text-[9px] font-bold text-indigo-300 bg-indigo-500/20 rounded">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                          <span>{item.senderDeviceName}</span>
                          <span>•</span>
                          <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyItem(item);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg flex items-center space-x-1 shrink-0 transition-colors"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === item.id ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Keyboard Footer Shortcuts Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
          <div className="flex items-center space-x-3">
            <span><kbd className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300">↑↓</kbd> Navigasi</span>
            <span><kbd className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300">Enter</kbd> Pilih / Salin</span>
            <span><kbd className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300">Esc</kbd> Tutup</span>
          </div>
          <span className="hidden sm:inline">Hopp Command Palette v2.4</span>
        </div>
      </div>
    </div>
  );
};
