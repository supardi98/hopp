import React, { useState, useEffect } from 'react';
import { UploadCloud, FileUp, Sparkles } from 'lucide-react';
import { useHoppStore } from '../store/useHoppStore';

export const GlobalDropzone: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const { addFileItem, showToast } = useHoppStore();

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
        dragCounter++;
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        showToast(`Mengunggah ${files.length} file...`);

        for (const file of files) {
          try {
            await addFileItem(file);
          } catch (err) {
            console.error('File drop error:', err);
          }
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [addFileItem, showToast]);

  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md border-4 border-dashed border-indigo-500/80 animate-fadeIn">
      <div className="text-center space-y-4 max-w-md p-8 glass-panel rounded-3xl border border-indigo-500/50 shadow-2xl animate-bounce">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-0.5 mx-auto shadow-xl shadow-indigo-500/40 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <UploadCloud className="w-10 h-10 text-indigo-400 animate-pulse" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center justify-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>Lepaskan File / Gambar</span>
          </h2>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            File akan otomatis dienkripsi dan disinkronkan ke seluruh perangkat di Room Sync saat ini.
          </p>
        </div>

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[11px] font-mono font-bold">
          <FileUp className="w-3.5 h-3.5" />
          <span>Global Drag-and-Drop Active</span>
        </div>
      </div>
    </div>
  );
};
