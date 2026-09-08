import React from 'react';
import { Search, Trash2, Code, Link2, FileText, Pin, Layers, Image as ImageIcon, FileUp } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';
import { ClipboardCard } from './ClipboardCard';
import type { ContentType } from '../types';

export const ClipboardFeed: React.FC = () => {
  const {
    items,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    clearAllItems,
  } = useHoppStore();

  const filteredItems = items.filter((item) => {
    // Search query filter
    const matchesSearch =
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.fileName && item.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

    // Tab filter
    if (activeTab === 'pinned') return item.pinned && matchesSearch;
    if (activeTab !== 'all') return item.contentType === activeTab && matchesSearch;
    return matchesSearch;
  });

  const tabOptions: { id: 'all' | ContentType | 'pinned'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Semua', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'image', label: 'Gambar', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'file', label: 'File', icon: <FileUp className="w-3.5 h-3.5" /> },
    { id: 'code', label: 'Kode', icon: <Code className="w-3.5 h-3.5" /> },
    { id: 'url', label: 'Link URL', icon: <Link2 className="w-3.5 h-3.5" /> },
    { id: 'text', label: 'Teks', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'pinned', label: 'Pinned', icon: <Pin className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card rounded-2xl p-3 border border-slate-800/80">
        {/* Tab Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          {tabOptions.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search Bar & Clear Button */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari clipboard/file..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          {items.length > 0 && (
            <button
              onClick={clearAllItems}
              title="Bersihkan Semua History"
              className="p-2 text-slate-500 hover:text-red-400 bg-slate-900 hover:bg-red-500/10 rounded-xl border border-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => <ClipboardCard key={item.id} item={item} />)
        ) : (
          <div className="glass-card rounded-2xl p-12 text-center border border-slate-800/60 space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Belum Ada Item Clipboard</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Salin teks/link/gambar di komputer/HP Anda atau gunakan tombol Upload File di atas untuk menyinkronkan data antar peranti.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
