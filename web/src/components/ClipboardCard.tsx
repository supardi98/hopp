import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Pin,
  Trash2,
  Lock,
  ExternalLink,
  Code,
  Link2,
  FileText,
  Terminal,
  Monitor,
  Smartphone,
  Globe,
  Image as ImageIcon,
  FileUp,
  Download,
  Eye,
  X,
} from 'lucide-react';
import type { ClipboardItem, PlatformType } from '../types';
import { useHoppStore } from '../store/useHoppStore';
import { writeSystemClipboard } from '../lib/nativeClipboard';
import { getPayloadFromDB } from '../utils/storageDB';

interface ClipboardCardProps {
  item: ClipboardItem;
}

export const ClipboardCard: React.FC<ClipboardCardProps> = ({ item }) => {
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filePayload, setFilePayload] = useState<string | null>(item.fileUrl || item.content || null);
  const [confirm, setConfirm] = useState<null | 'delete' | 'unpin'>(null);
  const { togglePin, deleteItem, showToast } = useHoppStore();

  useEffect(() => {
    // If payload is stored in IndexedDB, fetch it asynchronously
    if ((item.contentType === 'image' || item.contentType === 'file') && (!filePayload || filePayload === '[FILE_DATA]')) {
      getPayloadFromDB(item.id).then((payload) => {
        if (payload) setFilePayload(payload);
      });
    }
  }, [item.id, item.contentType, filePayload]);

  const handleCopy = async () => {
    try {
      if (item.contentType === 'image' || item.contentType === 'file') {
        const textToCopy = item.fileName || item.content;
        await writeSystemClipboard(textToCopy);
        setCopied(true);
        showToast('Nama file disalin ke clipboard!');
      } else {
        await writeSystemClipboard(item.content);
        setCopied(true);
        showToast('Disalin ke clipboard OS lokal!');
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleDownload = () => {
    const dataUrl = filePayload || item.content;
    if (!dataUrl || dataUrl === '[FILE_DATA]') {
      showToast('File sedang dimuat...');
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = item.fileName || `hopp-file-${item.id}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Mengunduh '${item.fileName || 'file'}'`);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'linux':
        return <Terminal className="w-3.5 h-3.5 text-indigo-400" />;
      case 'windows':
        return <Monitor className="w-3.5 h-3.5 text-cyan-400" />;
      case 'android':
        return <Smartphone className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  const getContentBadge = () => {
    switch (item.contentType) {
      case 'image':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 text-[10px] font-mono font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-md">
            <ImageIcon className="w-3 h-3" />
            <span>Gambar</span>
          </span>
        );
      case 'file':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 text-[10px] font-mono font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md">
            <FileUp className="w-3 h-3" />
            <span>Dokumen File</span>
          </span>
        );
      case 'code':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md">
            <Code className="w-3 h-3" />
            <span>Code / Command</span>
          </span>
        );
      case 'url':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 text-[10px] font-mono font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
            <Link2 className="w-3 h-3" />
            <span>Link URL</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-800 border border-slate-700/60 rounded-md">
            <FileText className="w-3 h-3" />
            <span>Text</span>
          </span>
        );
    }
  };

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    return `${Math.floor(diff / 3600)}j lalu`;
  };

  return (
    <>
      <div
        className={`group relative p-4 rounded-xl border transition-all duration-200 ${
          item.pinned
            ? 'glass-card bg-indigo-950/20 border-indigo-500/40 shadow-lg shadow-indigo-950/20'
            : 'glass-card bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90'
        }`}
      >
        {/* Header Info Bar */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {getContentBadge()}

            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
              {getPlatformIcon(item.senderPlatform)}
              <span className="font-medium">{item.senderDeviceName}</span>
            </div>

            <span className="text-[10px] text-slate-500 flex items-center space-x-1">
              <Lock className="w-2.5 h-2.5 text-purple-400" />
              <span>E2EE</span>
            </span>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-slate-500 mr-1 hidden sm:inline">
              {formatFileSize(item.fileSize || item.sizeBytes)} • {formatTime(item.timestamp)}
            </span>

            <button
              onClick={() => {
                if (item.pinned) {
                  setConfirm('unpin');
                } else {
                  togglePin(item.id);
                }
              }}
              className={`p-1.5 rounded-lg border transition-colors ${
                item.pinned
                  ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800 border-slate-700/40'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>

            {(item.contentType === 'image' || item.contentType === 'file') && (
              <button
                onClick={handleDownload}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium text-purple-300 bg-purple-950/80 hover:bg-purple-900 border-purple-700/50 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>Unduh</span>
              </button>
            )}

            <button
              onClick={handleCopy}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                copied
                  ? 'text-emerald-300 bg-emerald-950/80 border-emerald-500/40 shadow-sm'
                  : 'text-slate-200 bg-slate-800/80 hover:bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Salin</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (item.pinned) {
                  setConfirm('delete');
                } else {
                  deleteItem(item.id);
                }
              }}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content View */}
        <div className="relative">
          {item.contentType === 'image' ? (
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden border border-purple-500/20 bg-slate-950 max-h-64 group/img flex items-center justify-center">
                {filePayload && filePayload !== '[FILE_DATA]' ? (
                  <img
                    src={filePayload}
                    alt={item.fileName || 'Clip image'}
                    className="max-h-64 object-contain rounded-lg cursor-pointer transition-transform duration-200 group-hover/img:scale-105"
                    onClick={() => setPreviewOpen(true)}
                  />
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Memuat gambar terenkripsi...</span>
                  </div>
                )}
                <button
                  onClick={() => setPreviewOpen(true)}
                  className="absolute bottom-2 right-2 p-1.5 bg-slate-900/90 text-purple-300 hover:text-white rounded-lg border border-purple-500/30 opacity-0 group-hover/img:opacity-100 transition-opacity"
                  title="Lihat ukuran penuh"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              {item.fileName && (
                <p className="text-[11px] text-slate-400 font-mono truncate">{item.fileName}</p>
              )}
            </div>
          ) : item.contentType === 'file' ? (
            <div className="p-3 bg-slate-950/90 border border-blue-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3 truncate">
                <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <FileUp className="w-5 h-5 text-blue-400" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-200 font-mono truncate">
                    {item.fileName || 'File Dokumen'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatFileSize(item.fileSize || item.sizeBytes)} • {item.mimeType || 'Binary'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-blue-300 bg-blue-950 hover:bg-blue-900 border border-blue-700/50 rounded-lg transition-all ml-2"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Unduh File</span>
              </button>
            </div>
          ) : item.contentType === 'code' ? (
            <pre className="p-3 bg-slate-950/90 border border-slate-800/90 rounded-lg font-mono text-xs text-indigo-200 overflow-x-auto whitespace-pre-wrap break-all max-h-48">
              <code>{item.content}</code>
            </pre>
          ) : item.contentType === 'url' ? (
            <div className="p-3 bg-slate-950/80 border border-slate-800/90 rounded-lg flex items-center justify-between">
              <a
                href={item.content}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:underline font-mono truncate mr-2"
              >
                {item.content}
              </a>
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            </div>
          ) : (
            <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap break-words">
              {item.content}
            </p>
          )}
        </div>

        {/* Inline Confirmation Panel */}
        {confirm && (
          <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between gap-3 ${
            confirm === 'delete'
              ? 'bg-red-950/40 border-red-500/40'
              : 'bg-orange-950/40 border-orange-500/40'
          }`}>
            <p className={`text-xs font-medium ${
              confirm === 'delete' ? 'text-red-300' : 'text-orange-300'
            }`}>
              {confirm === 'delete'
                ? 'Hapus item yang di-pin?'
                : 'Lepas pin dari item ini?'}
            </p>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setConfirm(null)}
                className="px-3 py-1 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-700 transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (confirm === 'delete') deleteItem(item.id);
                  else togglePin(item.id);
                  setConfirm(null);
                }}
                className={`px-3 py-1 text-xs font-bold text-white rounded-lg border transition-all ${
                  confirm === 'delete'
                    ? 'bg-red-600 hover:bg-red-500 border-red-500'
                    : 'bg-orange-600 hover:bg-orange-500 border-orange-500'
                }`}
              >
                {confirm === 'delete' ? 'Ya, Hapus' : 'Ya, Unpin'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Image Preview Modal */}
      {previewOpen && filePayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 animate-fadeIn">
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-purple-500/30 rounded-2xl p-2 shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setPreviewOpen(false)}
              className="absolute -top-3 -right-3 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full border border-slate-700 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={filePayload}
              alt={item.fileName || 'Full image preview'}
              className="max-h-[80vh] max-w-full object-contain rounded-xl"
            />
            <div className="w-full flex items-center justify-between mt-3 px-3 py-1">
              <span className="text-xs font-mono text-slate-400">{item.fileName || 'Preview Gambar'}</span>
              <button
                onClick={handleDownload}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Simpan Gambar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
