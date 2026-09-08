import React, { useState } from 'react';
import { CheckSquare, Square, Trash2, Download, X, Check } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';

export const BatchActionBar: React.FC = () => {
  const {
    items,
    selectedItemIds,
    isSelectMode,
    setSelectMode,
    selectAllItems,
    clearSelectedItems,
    deleteSelectedItems,
    exportSelectedItemsJSON,
  } = useHoppStore();

  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isSelectMode && selectedItemIds.length === 0) return null;

  const allSelected = items.length > 0 && selectedItemIds.length === items.length;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-fadeIn">
      <div className="glass-panel rounded-2xl p-3 sm:p-3.5 border border-indigo-500/40 shadow-2xl flex items-center justify-between gap-3 bg-slate-950/95 backdrop-blur-xl">
        {/* Left Status & Select All Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (allSelected) {
                clearSelectedItems();
              } else {
                selectAllItems();
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-indigo-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>{allSelected ? 'Batal Semua' : 'Pilih Semua'}</span>
          </button>

          <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 rounded-xl">
            {selectedItemIds.length} terpilih
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {/* Export JSON Button */}
          <button
            onClick={exportSelectedItemsJSON}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Ekspor JSON</span>
          </button>

          {/* Delete Batch Button */}
          {confirmDelete ? (
            <div className="flex items-center space-x-1 animate-fadeIn">
              <button
                onClick={() => {
                  deleteSelectedItems();
                  setConfirmDelete(false);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-md transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Ya, Hapus ({selectedItemIds.length})</span>
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (selectedItemIds.length > 0) {
                  setConfirmDelete(true);
                }
              }}
              disabled={selectedItemIds.length === 0}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                selectedItemIds.length > 0
                  ? 'text-red-300 bg-red-950/60 hover:bg-red-900 border-red-500/40 cursor-pointer'
                  : 'text-slate-600 bg-slate-900 border-slate-800 cursor-not-allowed opacity-50'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Hapus</span>
            </button>
          )}

          {/* Close Select Mode Button */}
          <button
            onClick={() => setSelectMode(false)}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
