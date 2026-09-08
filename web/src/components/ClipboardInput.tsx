import React, { useState, useRef } from 'react';
import { Send, ClipboardCheck, Lock, Unlock, Sparkles, Paperclip } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';
import { readSystemClipboard } from '../lib/nativeClipboard';
import { isSubtleCryptoAvailable } from '../lib/crypto';

export const ClipboardInput: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isReadingClipboard, setIsReadingClipboard] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addClipboardItem, addFileItem, settings, showToast } = useHoppStore();

  const handleManualSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    await addClipboardItem(inputText);
    setInputText('');
  };

  const handleReadSystemClipboard = async () => {
    setIsReadingClipboard(true);
    try {
      const text = await readSystemClipboard();
      if (text && text.trim()) {
        await addClipboardItem(text);
        showToast('Clipboard OS berhasil dibaca & disinkronkan!');
      } else {
        showToast('Clipboard OS kosong!');
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
      showToast('Klik atau beri izin akses clipboard');
    } finally {
      setIsReadingClipboard(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      await addFileItem(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await addFileItem(file);
    }
  };

  const isWebCryptoActive = isSubtleCryptoAvailable();
  const isE2EEActive = settings.enabled && isWebCryptoActive;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`glass-card rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 shadow-xl shadow-indigo-950/20 relative overflow-hidden ${
        isDragging ? 'border-indigo-400 bg-indigo-950/40 ring-2 ring-indigo-500/50' : 'border-indigo-500/20'
      }`}
    >
      {/* Background GPU Radial Glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] pointer-events-none -z-10 transform-gpu" />

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.zip,.txt,.json,.csv"
      />

      <form onSubmit={handleManualSend} className="space-y-2.5 relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-1.5">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Kirim ke Device (Teks, Gambar & File)
            </span>
          </div>

          {!isWebCryptoActive ? (
            <div className="flex items-center space-x-1 text-[10px] sm:text-[11px] text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
              <Unlock className="w-3 h-3 text-amber-400" />
              <span>HTTP / Tanpa E2EE</span>
            </div>
          ) : isE2EEActive ? (
            <div className="flex items-center space-x-1 text-[10px] sm:text-[11px] text-purple-400 font-medium bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 shrink-0">
              <Lock className="w-3 h-3 text-purple-400" />
              <span>E2EE Encrypted</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-[10px] sm:text-[11px] text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700/60 shrink-0">
              <Unlock className="w-3 h-3 text-slate-400" />
              <span>Plain Text</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ketik teks, link URL, atau drag & drop file/gambar ke sini..."
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleManualSend(e);
              }
            }}
            className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono resize-none"
          />

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-purple-300 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 rounded-lg transition-all active:scale-95"
            >
              <Paperclip className="w-3.5 h-3.5 text-purple-400" />
              <span>Upload File</span>
            </button>

            <button
              type="button"
              onClick={handleReadSystemClipboard}
              disabled={isReadingClipboard}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/50 rounded-lg transition-all active:scale-95"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isReadingClipboard ? 'Membaca...' : 'Clipboard OS'}</span>
            </button>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              <span>Kirim</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
