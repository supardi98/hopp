import React, { useState, useRef, useEffect } from 'react';
import { Search, Trash2, Code, Link2, FileText, Pin, Layers, Image as ImageIcon, FileUp, AlertTriangle, X, Tag, Check, ChevronLeft, ChevronRight, CheckSquare } from 'lucide-react';
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
    isSelectMode,
    setSelectMode,
  } = useHoppStore();

  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);

  // Extract all unique tags across items
  const allTags = Array.from(new Set(items.flatMap((i) => i.tags || []))).sort();

  // Mouse Drag-to-Scroll & Mouse Wheel horizontal scroll logic for desktop
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  // Scroll Indicators State
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollIndicators();
    window.addEventListener('resize', updateScrollIndicators);
    return () => window.removeEventListener('resize', updateScrollIndicators);
  }, [items]);

  const handleScrollBy = (amount: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsMouseDown(true);
    setHasDragged(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 5) {
      setHasDragged(true);
    }
    scrollRef.current.scrollLeft = scrollLeftState - walk;
    updateScrollIndicators();
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollRef.current) return;
    if (e.deltaY !== 0) {
      scrollRef.current.scrollLeft += e.deltaY;
      updateScrollIndicators();
    }
  };

  const handleConfirmClear = () => {
    clearAllItems();
    setShowConfirmClear(false);
  };

  const filteredItems = items.filter((item) => {
    // Search query & tag filter
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.content.toLowerCase().includes(q) ||
      (item.fileName && item.fileName.toLowerCase().includes(q)) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(q) || `#${t.toLowerCase()}`.includes(q)));

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
      <div className="flex items-center justify-between gap-2 sm:gap-3 glass-card rounded-2xl p-2 sm:p-2.5 border border-slate-800/80">
        {/* Tab Filters Wrapper with Clean Icon-Only Scroll Arrows */}
        <div className="flex items-center space-x-1 flex-1 min-w-0">
          {/* Left Arrow Button */}
          {canScrollLeft && (
            <button
              onClick={() => handleScrollBy(-150)}
              className="p-1 text-indigo-400 hover:text-white transition-colors shrink-0 animate-fadeIn cursor-pointer"
              title="Geser Tab ke Kiri"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Tab Filters Container */}
          <div
            ref={scrollRef}
            onScroll={updateScrollIndicators}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeaveOrUp}
            onMouseUp={handleMouseLeaveOrUp}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            className={`flex items-center space-x-1 overflow-x-auto no-scrollbar flex-1 min-w-0 py-0.5 select-none ${
              isMouseDown ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {tabOptions.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (!hasDragged) {
                    setActiveTab(tab.id);
                  }
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 touch-manipulation active:scale-95 ${
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

          {/* Right Arrow Button */}
          {canScrollRight && (
            <button
              onClick={() => handleScrollBy(150)}
              className="p-1 text-indigo-400 hover:text-white transition-colors shrink-0 animate-fadeIn cursor-pointer"
              title="Geser Tab ke Kanan"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Bar, Tag List Popover & Clear Button */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Tag List Popover Button */}
          <div className="relative">
            <button
              onClick={() => setTagMenuOpen((prev) => !prev)}
              className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                searchQuery.startsWith('#') || tagMenuOpen
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-950/40'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
              }`}
              title="Lihat semua Tag"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span className="px-1.5 py-0.2 text-[10px] font-bold text-indigo-300 bg-indigo-500/20 rounded-full">
                {allTags.length}
              </span>
            </button>

            {/* Tag List Popover Dropdown */}
            {tagMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 glass-panel rounded-2xl p-3 border border-slate-700/80 shadow-2xl z-50 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <p className="text-[11px] uppercase font-mono font-bold text-indigo-400 tracking-wider flex items-center space-x-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Daftar Tag ({allTags.length})</span>
                  </p>
                  <button
                    onClick={() => setTagMenuOpen(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {allTags.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 space-y-1">
                    <p className="text-xs font-semibold">Belum Ada Tag</p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Tambahkan tag pada kartu clipboard dengan mengklik ikon tag (+ Tag).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    <p className="text-[10px] text-slate-400">Klik tag di bawah untuk memfilter feed:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allTags.map((t) => {
                        const isSelected = searchQuery.toLowerCase() === t.toLowerCase();
                        return (
                          <button
                            key={t}
                            onClick={() => {
                              if (isSelected) {
                                setSearchQuery('');
                              } else {
                                setSearchQuery(t);
                              }
                              setTagMenuOpen(false);
                            }}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center space-x-1 transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                                : 'bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30'
                            }`}
                          >
                            <span>{t}</span>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </button>
                        );
                      })}
                    </div>

                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setTagMenuOpen(false);
                        }}
                        className="w-full mt-2 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors text-center"
                      >
                        Hapus Filter Tag
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative w-32 sm:w-36 md:w-40 focus-within:w-44 sm:focus-within:w-52 transition-all duration-200">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari..."
              className="w-full pl-7 pr-7 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {items.length > 0 && (
            <>
              <button
                onClick={() => setSelectMode(!isSelectMode)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isSelectMode
                    ? 'text-indigo-300 bg-indigo-600/30 border-indigo-500/50 shadow-md shadow-indigo-950/40'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800'
                }`}
                title="Mode pilih / centang banyak item"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowConfirmClear(true)}
                className="p-2 text-slate-500 hover:text-red-400 bg-slate-900 hover:bg-red-500/10 rounded-xl border border-slate-800 transition-colors"
                title="Bersihkan seluruh item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
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
              Salin teks/link/gambar di komputer/HP Anda atau gunakan tombol Upload File di atas untuk menyinkronkan data antar device.
            </p>
          </div>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 animate-fadeIn">
          <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 border border-red-500/30 shadow-2xl space-y-5">
            <button
              onClick={() => setShowConfirmClear(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/50 hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Bersihkan Semua Riwayat?</h3>
                <p className="text-xs text-slate-400">Konfirmasi Penghapusan Seluruh Item</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tindakan ini akan menghapus **seluruh {items.length} item clipboard & file** di device ini dan memicu pembersihan riwayat di room server.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
