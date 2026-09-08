import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCw, Check, Undo2, ShieldAlert } from 'lucide-react';
import type { ClipboardItem } from '../types';
import { useHoppStore } from '../store/useHoppStore';
import { savePayloadToDB } from '../utils/storageDB';
import { wsClient } from '../lib/wsClient';

interface ImageAnnotatorModalProps {
  item: ClipboardItem;
  initialImageData: string;
  onClose: () => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export const ImageAnnotatorModal: React.FC<ImageAnnotatorModalProps> = ({
  item,
  initialImageData,
  onClose,
}) => {
  const { showToast, settings } = useHoppStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [censorColor, setCensorColor] = useState<string>('#ef4444'); // Default red
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [censorBoxes, setCensorBoxes] = useState<Rect[]>([]);

  // Canvas drawing state for sensor box
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);

  // Original loaded HTML Image object
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = initialImageData;
    img.onload = () => {
      imgRef.current = img;
      renderCanvas();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [initialImageData]);

  useEffect(() => {
    renderCanvas();
  }, [rotationDegrees, censorBoxes, currentPos]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle rotation dimensions
    const isRotated90 = (rotationDegrees / 90) % 2 !== 0;
    const canvasWidth = isRotated90 ? img.height : img.width;
    const canvasHeight = isRotated90 ? img.width : img.height;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Save context transform state for rotation
    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate((rotationDegrees * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // Draw applied censor boxes
    censorBoxes.forEach((rect) => {
      ctx.fillStyle = rect.color;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

      // Draw subtle border over censor box
      ctx.strokeStyle = '#ffffff50';
      ctx.lineWidth = 1;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    });

    // Draw active dragging censor box preview
    if (isDrawing && startPos && currentPos) {
      const rectX = Math.min(startPos.x, currentPos.x);
      const rectY = Math.min(startPos.y, currentPos.y);
      const rectW = Math.abs(currentPos.x - startPos.x);
      const rectH = Math.abs(currentPos.y - startPos.y);

      ctx.fillStyle = censorColor + 'C0'; // Semi-transparent preview
      ctx.fillRect(rectX, rectY, rectW, rectH);
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(rectX, rectY, rectW, rectH);
      ctx.setLineDash([]);
    }
  };

  const handleRotate = () => {
    setRotationDegrees((prev) => (prev + 90) % 360);
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasCoordinates(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentPos(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    const pos = getCanvasCoordinates(e);
    setCurrentPos(pos);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !startPos || !currentPos) return;
    setIsDrawing(false);

    const rectX = Math.min(startPos.x, currentPos.x);
    const rectY = Math.min(startPos.y, currentPos.y);
    const rectW = Math.abs(currentPos.x - startPos.x);
    const rectH = Math.abs(currentPos.y - startPos.y);

    // Add box if larger than 5x5 px
    if (rectW > 5 && rectH > 5) {
      setCensorBoxes((prev) => [
        ...prev,
        { x: rectX, y: rectY, w: rectW, h: rectH, color: censorColor },
      ]);
    }

    setStartPos(null);
    setCurrentPos(null);
  };

  const handleUndo = () => {
    if (censorBoxes.length > 0) {
      setCensorBoxes((prev) => prev.slice(0, -1));
    }
  };

  const handleSaveAndSync = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const editedDataUrl = canvas.toDataURL('image/png', 0.95);

      // Save to IndexedDB
      await savePayloadToDB(item.id, editedDataUrl);

      // Update store item
      const updatedItem: ClipboardItem = {
        ...item,
        content: editedDataUrl,
        fileUrl: editedDataUrl,
        fileSize: editedDataUrl.length,
        timestamp: Date.now(),
      };

      useHoppStore.setState((state) => ({
        items: state.items.map((i) => (i.id === item.id ? updatedItem : i)),
      }));

      // Broadcast to room
      wsClient.broadcastClipboardItem(updatedItem, settings.roomCode);
      showToast('Gambar berhasil diedit & disinkronkan!');
      onClose();
    } catch (err) {
      showToast('Gagal menyimpan hasil edit gambar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/95 animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl glass-panel rounded-3xl p-4 sm:p-6 border border-slate-700/80 shadow-2xl flex flex-col max-h-[95vh]">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-100">Editor & Sensor Gambar</h3>
              <p className="text-[11px] text-slate-400 hidden sm:block">Tarik mouse pada gambar untuk menutup data sensitif</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            {/* Color Palette Picker */}
            <div className="flex items-center space-x-1 px-2 py-1 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono mr-1">Warna Sensor:</span>
              {[
                { label: 'Merah', hex: '#ef4444' },
                { label: 'Hitam', hex: '#0f172a' },
                { label: 'Kuning Warning', hex: '#f59e0b' },
              ].map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setCensorColor(c.hex)}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    censorColor === c.hex ? 'scale-125 ring-2 ring-white border-transparent' : 'border-slate-700'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>

            <button
              onClick={handleRotate}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
            >
              <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Rotasi 90°</span>
            </button>

            <button
              onClick={handleUndo}
              disabled={censorBoxes.length === 0}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-xl transition-all"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Display Viewport */}
        <div className="flex-1 overflow-auto my-4 bg-slate-950/90 rounded-2xl border border-slate-800/80 p-2 flex items-center justify-center min-h-[300px]">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="max-w-full max-h-[60vh] object-contain rounded-lg cursor-crosshair shadow-lg"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
          <p className="text-xs text-slate-400 font-mono hidden sm:block">
            {censorBoxes.length} Kotak Sensor Diterapkan
          </p>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSaveAndSync}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan & Sync Ke Device</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
