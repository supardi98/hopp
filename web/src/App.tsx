import { useEffect } from 'react';
import { Header } from './components/Header';
import { DeviceList } from './components/DeviceList';
import { ClipboardInput } from './components/ClipboardInput';
import { ClipboardFeed } from './components/ClipboardFeed';
import { PairingModal } from './components/PairingModal';
import { SettingsModal } from './components/SettingsModal';
import { GuideModal } from './components/GuideModal';
import { OnboardingModal } from './components/OnboardingModal';
import { Terminal, Shield, ArrowRightLeft } from 'lucide-react';
import { useHoppStore } from './store/useHoppStore';

import { useRef } from 'react';
import { readSystemClipboard, isTauriEnvironment } from './lib/nativeClipboard';

export function App() {
  const { setGuideModalOpen, initRealtimeSync, isOnboardingOpen, setOnboardingOpen, settings, addClipboardItem, items } = useHoppStore();
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

      {/* Main Top Header */}
      <Header />

      {/* Hero Quick Banner */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 pb-2">
        <div className="glass-card rounded-2xl p-4 border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-100">
                  Real-time 2-Way Sync Clipboard (Web • Linux • Windows • Android)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                  Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Data clipboard yang Anda salin di peranti manapun akan secara langsung disinkronkan secara aman dengan enkripsi AES-256-GCM.
              </p>
            </div>
          </div>

          <button
            onClick={() => setGuideModalOpen(true)}
            className="flex items-center space-x-2 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-900/40 hover:bg-indigo-900/80 px-3.5 py-2 rounded-xl border border-indigo-700/50 transition-all flex-shrink-0"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Cara Setup Desktop & Android</span>
          </button>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Device Manager & Security Summary */}
        <div className="lg:col-span-4 space-y-6">
          <DeviceList />

          {/* E2EE Info Box */}
          <div className="glass-card rounded-2xl p-4 border border-slate-800/80 space-y-2">
            <div className="flex items-center space-x-2 text-purple-400 font-semibold text-xs">
              <Shield className="w-4 h-4" />
              <span>Proteksi Privasi E2EE (Zero-Knowledge)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Teks, gambar, dan file di-enkripsi di peranti (AES-256-GCM) sebelum dikirim via WebSocket Relay. Server relay bersifat Zero-Knowledge dan tidak dapat membaca teks asli Anda.
            </p>
          </div>
        </div>

        {/* Right Column: Broadcast Box & Live Sync Feed */}
        <div className="lg:col-span-8 space-y-6">
          <ClipboardInput />
          <ClipboardFeed />
        </div>
      </main>

      {/* Modals */}
      <PairingModal />
      <SettingsModal />
      <GuideModal />
      <OnboardingModal isOpen={isOnboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </div>
  );
}

export default App;
