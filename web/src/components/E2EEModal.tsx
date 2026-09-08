import React from 'react';
import { ShieldCheck, X, Lock, Eye, Server, Cpu } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';

export const E2EEModal: React.FC = () => {
  const { isE2EEModalOpen, setE2EEModalOpen, settings } = useHoppStore();

  if (!isE2EEModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80"
      onClick={() => setE2EEModalOpen(false)}
    >
      <div
        className="relative w-full max-w-sm bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Enkripsi End-to-End</h3>
              <p className="text-[10px] text-purple-400 font-semibold">AES-256-GCM · Zero-Knowledge</p>
            </div>
          </div>
          <button
            onClick={() => setE2EEModalOpen(false)}
            className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature list */}
        <div className="space-y-2.5">
          {[
            {
              icon: <Cpu className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />,
              title: 'Enkripsi di Peranti',
              desc: 'Teks, gambar & file di-enkripsi menggunakan AES-256-GCM sebelum meninggalkan peranti Anda.',
            },
            {
              icon: <Server className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />,
              title: 'Server Zero-Knowledge',
              desc: 'Relay server hanya meneruskan data terenkripsi — tidak dapat membaca isi pesan sama sekali.',
            },
            {
              icon: <Eye className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />,
              title: 'Kunci Berbasis Room',
              desc: 'Kunci diturunkan dari Secret Key + Room Code via PBKDF2. Hanya sesama room yang bisa mendekripsi.',
            },
            {
              icon: <Lock className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />,
              title: 'Status Saat Ini',
              desc: settings.enabled
                ? '✓ Enkripsi AKTIF — semua data terlindungi'
                : '✗ Enkripsi NON-AKTIF — aktifkan di Settings',
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start space-x-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              {item.icon}
              <div>
                <p className="text-xs font-semibold text-slate-200">{item.title}</p>
                <p
                  className={`text-[11px] leading-relaxed ${
                    i === 3
                      ? settings.enabled
                        ? 'text-emerald-400 font-semibold'
                        : 'text-red-400 font-semibold'
                      : 'text-slate-400'
                  }`}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
