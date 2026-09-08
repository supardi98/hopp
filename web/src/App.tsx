import { useEffect } from 'react';
import { Header } from './components/Header';
import { DeviceList } from './components/DeviceList';
import { ClipboardInput } from './components/ClipboardInput';
import { ClipboardFeed } from './components/ClipboardFeed';
import { PairingModal } from './components/PairingModal';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { E2EEModal } from './components/E2EEModal';
import { MonitorSmartphone, RefreshCw } from 'lucide-react';
import { useHoppStore } from './store/useHoppStore';

import { useRef } from 'react';
import { readSystemClipboard, isTauriEnvironment } from './lib/nativeClipboard';

export function App() {
  const { initRealtimeSync, isOnboardingOpen, setOnboardingOpen, settings, addClipboardItem, items, isOtherTabActive, reconnectAsLeader, isDeviceListOpen, setDeviceListOpen } = useHoppStore();
  const lastObservedClipboardRef = useRef<string>('');

  useEffect(() => {
    if (settings.isRoomSet) {
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
          <Header />

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

          {/* Modals */}
          <PairingModal />
          <SettingsModal />
          <E2EEModal />
          <OnboardingModal isOpen={isOnboardingOpen} onClose={() => setOnboardingOpen(false)} />
        </>
      )}
    </div>
  );
}

export default App;
