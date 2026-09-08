/**
 * OCR Text Extraction Utility using Tesseract.js (WebAssembly Client-Side)
 */
import { createWorker } from 'tesseract.js';

export async function extractTextFromImage(
  imageUrl: string,
  onProgress?: (progressPct: number) => void
): Promise<string> {
  if (!imageUrl) return '';

  let worker;
  try {
    // Initialize Tesseract worker for English & Indonesian text recognition
    worker = await createWorker('eng');

    if (onProgress) {
      onProgress(50);
    }

    const ret = await worker.recognize(imageUrl);
    await worker.terminate();

    if (onProgress) {
      onProgress(100);
    }

    return ret.data.text ? ret.data.text.trim() : '';
  } catch (err) {
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {
        // ignore
      }
    }
    console.warn('OCR processing failed:', err);
    throw new Error('Gagal mengekstrak teks dari gambar.');
  }
}
