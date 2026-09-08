import { useEffect, useState, useRef } from 'react';
import { Header } from './components/Header';
import { DeviceList } from './components/DeviceList';
import { ClipboardInput } from './components/ClipboardInput';
import { ClipboardFeed } from './components/ClipboardFeed';
import { PairingModal } from './components/PairingModal';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { E2EEModal } from './components/E2EEModal';
import { CommandPalette } from './components/CommandPalette';
import { GlobalDropzone } from './components/GlobalDropzone';
import { BatchActionBar } from './components/BatchActionBar';
import { MonitorSmartphone, RefreshCw, KeyRound, ShieldCheck, Check } from 'lucide-react';
import { useHoppStore } from './store/useHoppStore';
import { readSystemClipboard, isTauriEnvironment } from './lib/nativeClipboard';

export function App() {
  const {
    initRealtimeSync,
    isOnboardingOpen,
    setOnboardingOpen,
    settings,
    updateSettings,
    showToast,
    addClipboardItem,
    items,
    isOtherTabActive,
    reconnectAsLeader,
    isDeviceListOpen,
    setDeviceListOpen,
  } = useHoppStore();

  const [pendingJoin, setPendingJoin] = useState<{ roomCode: string; secretKey?: string } | null>(null);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const lastObservedClipboardRef = useRef<string>('');

  // Global Keyboard Shortcuts Listener (Ctrl+K for Command Palette, Esc for Modals/Sheets)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (pendingJoin) {
          e.preventDefault();
          setPendingJoin(null);
        } else if (isDeviceListOpen) {
          e.preventDefault();
          setDeviceListOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingJoin, isDeviceListOpen, setDeviceListOpen]);

  useEffect(() => {
    // Detect URL query parameters for invitation link (e.g. ?room=HOPP-1234&key=A7B9C3)
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || params.get('r');
    const keyParam = params.get('key') || params.get('k');

    if (roomParam) {
      const formattedRoom = roomParam.trim().toUpperCase().startsWith('HOPP-')
        ? roomParam.trim().toUpperCase()
        : `HOPP-${roomParam.trim().toUpperCase()}`;

      setPendingJoin({
        roomCode: formattedRoom,
        secretKey: keyParam ? keyParam.trim().toUpperCase() : undefined,
      });
    } else if (settings.isRoomSet) {
      initRealtimeSync();
    } else {
      setOnboardingOpen(true);
    }
  }, [initRealtimeSync, settings.isRoomSet, setOnboardingOpen]);

  // Native OS Clipboard Listener (Event-Driven: Focus, Visibility & Paste triggers for 0% CPU & zero typing lag)
  useEffect(() => {
    const checkOSClipboard = async () => {
      // Only run auto-broadcast if enabled in settings
      if (settings.autoBroadcastClipboard === false) return;

      // DO NOT check clipboard when user is actively typing in text input/textarea!
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      try {
        const isTauri = await isTauriEnvironment();
        if (!isTauri) return;

        const currentText = await readSystemClipboard();
        if (!currentText || !currentText.trim()) return;

        // Skip if same as last observed or already in store top item
        if (currentText === lastObservedClipboardRef.current) return;
        const topItem = items[0];
        if (topItem && topItem.content === currentText.trim()) {
          lastObservedClipboardRef.current = currentText;
          return;
        }

        // New Ctrl+C detected! Update ref & broadcast to room
        lastObservedClipboardRef.current = currentText;
        await addClipboardItem(currentText);
      } catch (err) {
        // Silently ignore clipboard permission errors
      }
    };

    const handleFocus = () => checkOSClipboard();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkOSClipboard();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('paste', handleFocus);

    // Initial check on mount
    checkOSClipboard();

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('paste', handleFocus);
    };
  }, [addClipboardItem, items, settings.autoBroadcastClipboard]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-indigo-500 selection:text-white pb-16">
      {/* Background Decorative Gradients (GPU-Native Radial Gradients for 0% CPU blur overhead) */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12)_0%,transparent_70%)] pointer-events-none -z-10 transform-gpu" />
      <div className="fixed top-1/3 right-10 w-[400px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.12)_0%,transparent_70%)] pointer-events-none -z-10 transform-gpu" />

      {/* Other Tab Active — full dedicated page, main app not rendered */}
      {isOtherTabActive ? (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center space-y-8">
          {/* Logo */}
          <div className="flex items-center space-x-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-black text-sm">H</span>
            </div>
            <span className="text-xl font-black text-slate-100 tracking-tight">Hopp</span>
          </div>

          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600/20 via-purple-600/10 to-slate-800/80 border border-indigo-500/30 flex items-center justify-center shadow-2xl shadow-indigo-950/50">
            <MonitorSmartphone className="w-11 h-11 text-indigo-400" />
          </div>

          <div className="space-y-3 max-w-xs">
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Hopp terbuka di tab lain
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Tab atau jendela browser lain sedang aktif menggunakan koneksi Hopp.
              Untuk menggunakan di tab ini, klik tombol di bawah.
            </p>
          </div>

          <button
            onClick={reconnectAsLeader}
            className="flex items-center space-x-2.5 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Gunakan di Tab Ini</span>
          </button>

          <p className="text-xs text-slate-600">
            Tab lain akan otomatis terputus saat Anda mengklik tombol di atas.
          </p>
        </div>
      ) : (
        <>
          {/* Main Top Header */}
          <Header onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

          {/* Main Dashboard Layout */}
          <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Device Manager — always visible on desktop */}
            <div className="hidden lg:block lg:col-span-4 space-y-6">
              <DeviceList />
            </div>

            {/* Right Column: Broadcast Box & Live Sync Feed */}
            <div className="col-span-1 lg:col-span-8 space-y-6">
              <ClipboardInput />
              <ClipboardFeed />
            </div>
          </main>

          {/* Device List — bottom-sheet modal on mobile only */}
          {isDeviceListOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setDeviceListOpen(false)}>
              <div className="absolute inset-0 bg-slate-950/70" />
              <div
                className="relative bg-slate-900 border-t border-slate-700/60 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Handle bar */}
                <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />
                <DeviceList />
              </div>
            </div>
          )}

          {/* Global Drag-and-Drop & Multi-Select Batch Bar */}
          <GlobalDropzone />
          <BatchActionBar />

          {/* Modals */}
          <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
          <PairingModal />
          <SettingsModal />
          <E2EEModal />
          <OnboardingModal isOpen={isOnboardingOpen && !pendingJoin} onClose={() => setOnboardingOpen(false)} />

          {/* Join Link Confirmation Modal */}
          {pendingJoin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 animate-fadeIn">
              <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 border border-indigo-500/40 shadow-2xl space-y-5 text-center">
                {/* Header Icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-0.5 mx-auto shadow-xl shadow-indigo-500/30 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <KeyRound className="w-7 h-7 text-indigo-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-slate-100 tracking-tight">
                    Undangan Gabung Room Sync
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Anda mendapatkan tautan undangan untuk bergabung ke Room Sync:
                  </p>
                </div>

                {/* Room Details Card */}
                <div className="p-4 bg-indigo-950/50 border border-indigo-500/30 rounded-2xl space-y-2">
                  <p className="text-[10px] uppercase font-mono font-semibold text-indigo-400 tracking-wider">
                    Kode Room Tujuan
                  </p>
                  <p className="text-2xl font-mono font-black text-slate-100 tracking-wider">
                    {pendingJoin.roomCode}
                  </p>
                  {pendingJoin.secretKey ? (
                    <div className="flex items-center justify-center space-x-1.5 pt-1 text-xs text-purple-300 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>Kunci E2EE Terlampir ({pendingJoin.secretKey.substring(0, 6)}...)</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 pt-1">
                      Tanpa Kunci E2EE khusus terlampir
                    </p>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">
                  Klik tombol di bawah untuk menyetujui dan menghubungkan device ini ke Room <span className="font-mono text-indigo-300">{pendingJoin.roomCode}</span>.
                </p>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={() => {
                      setPendingJoin(null);
                      window.history.replaceState({}, '', window.location.pathname);
                      if (!settings.isRoomSet) {
                        setOnboardingOpen(true);
                      }
                    }}
                    className="w-1/3 py-3 px-3 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-800 transition-all"
                  >
                    Batal
                  </button>

                  <button
                    onClick={() => {
                      const newSettings: Partial<import('./types').E2EESettings> = {
                        roomCode: pendingJoin.roomCode,
                        isRoomSet: true,
                      };
                      if (pendingJoin.secretKey) {
                        newSettings.secretKey = pendingJoin.secretKey;
                        newSettings.enabled = true;
                      }

                      updateSettings(newSettings);
                      initRealtimeSync();
                      setPendingJoin(null);
                      showToast(`Berhasil bergabung ke Room ${pendingJoin.roomCode}!`);
                      window.history.replaceState({}, '', window.location.pathname);
                    }}
                    className="w-2/3 py-3 px-4 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Ya, Gabung & Sync</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
