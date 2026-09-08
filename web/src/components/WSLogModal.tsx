import React, { useEffect, useState } from 'react';
import { Terminal, X, Copy, Check, Trash2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { wsClient, getEffectiveRelayUrl, type WSLogEntry } from '../lib/wsClient';
import { useHoppStore } from '../store/useHoppStore';

interface WSLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WSLogModal: React.FC<WSLogModalProps> = ({ isOpen, onClose }) => {
  const { isWsConnected, settings, currentDevice, showToast } = useHoppStore();
  const [logs, setLogs] = useState<WSLogEntry[]>([]);
  const [copiedLogs, setCopiedLogs] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLogs(wsClient.getLogs());
    const unsubscribe = wsClient.onLogsChange((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveUrl = getEffectiveRelayUrl(settings.customRelayUrl);

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message} ${l.details ? `(${l.details})` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    showToast('Log WebSocket berhasil disalin!');
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleReconnect = () => {
    wsClient.connect(effectiveUrl, currentDevice, settings.roomCode);
    showToast('Mencoba reconnect WebSocket...');
  };

  const getLogBadge = (type: WSLogEntry['type']) => {
    switch (type) {
      case 'success':
        return <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">SUCCESS</span>;
      case 'error':
        return <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">ERROR</span>;
      case 'warn':
        return <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">WARN</span>;
      case 'send':
        return <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">SEND</span>;
      case 'recv':
        return <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">RECV</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">INFO</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl p-5 sm:p-6 border border-slate-700/80 shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Live WebSocket Connection Debugger</h2>
              <p className="text-xs text-slate-400">Real-time log status koneksi & sinkronisasi relay</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/50 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Server Status Box */}
        <div className="py-3 px-4 rounded-2xl bg-slate-900/90 border border-slate-800 my-3 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-medium">Target Server:</span>
              <span className="font-mono font-bold text-cyan-300">{effectiveUrl}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-medium">Kode Room:</span>
              <span className="font-mono font-bold text-purple-300">{settings.roomCode || 'Belum Set'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isWsConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
              {isWsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isWsConnected ? 'Terhubung (Online)' : 'Terputus (Offline)'}</span>
            </div>

            <button
              onClick={handleReconnect}
              className="p-1.5 text-xs text-indigo-300 hover:text-white bg-indigo-900/40 hover:bg-indigo-800 rounded-lg border border-indigo-700/50 flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reconnect</span>
            </button>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center justify-between pb-2 text-xs shrink-0">
          <span className="text-slate-400 font-mono text-[11px]">
            Log Aktivitas ({logs.length} item)
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyLogs}
              disabled={logs.length === 0}
              className="flex items-center space-x-1 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg border border-slate-700 transition-all text-xs"
            >
              {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Salin Log</span>
            </button>

            <button
              onClick={() => wsClient.clearLogs()}
              disabled={logs.length === 0}
              className="flex items-center space-x-1 px-2.5 py-1 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg border border-slate-700 transition-all text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan</span>
            </button>
          </div>
        </div>

        {/* Terminal Log Console */}
        <div className="overflow-y-auto flex-1 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs space-y-2.5 text-slate-300 max-h-[350px]">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-600 font-sans text-xs">
              Belum ada log WebSocket tercatat...
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="space-y-0.5 border-b border-slate-900 pb-2">
                <div className="flex items-start space-x-2">
                  <span className="text-[10px] text-slate-500 shrink-0 pt-0.5">{log.timestamp}</span>
                  {getLogBadge(log.type)}
                  <span className="text-slate-200 break-all">{log.message}</span>
                </div>
                {log.details && (
                  <div className="pl-14 text-[11px] text-slate-500 break-all">
                    ↳ {log.details}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-4 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
          >
            Tutup Log
          </button>
        </div>
      </div>
    </div>
  );
};
