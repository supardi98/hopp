export interface ColorInfo {
  isColor: boolean;
  hex: string;
  hsl: string;
  rgba: string;
}

export interface TextStats {
  isLongText: boolean;
  wordCount: number;
  charCount: number;
}

// Convert 3 or 6 hex digits to HSL and RGBA
export function analyzeColor(text: string): ColorInfo | null {
  if (!text) return null;
  const trimmed = text.trim();

  // Hex color regex (#fff, #ffffff, #ffffff80)
  const hexRegex = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  // RGB/RGBA regex: rgb(99, 102, 241) or rgba(...)
  const rgbRegex = /^rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/i;

  let r = 0, g = 0, b = 0, a = 1;
  let validHex = '';

  if (hexRegex.test(trimmed)) {
    let hex = trimmed.substring(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map((char) => char + char).join('');
    }
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
    if (hex.length === 8) {
      a = Math.round((parseInt(hex.substring(6, 8), 16) / 255) * 100) / 100;
    }
    validHex = `#${hex.substring(0, 6).toUpperCase()}`;
  } else {
    const match = rgbRegex.exec(trimmed);
    if (match) {
      r = Math.min(255, parseInt(match[1], 10));
      g = Math.min(255, parseInt(match[2], 10));
      b = Math.min(255, parseInt(match[3], 10));
      if (match[4] !== undefined) {
        a = Math.min(1, parseFloat(match[4]));
      }
      validHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    } else {
      return null;
    }
  }

  // Convert RGB to HSL
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  const hslStr = `hsl(${hDeg}, ${sPct}%, ${lPct}%)`;
  const rgbaStr = a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;

  return {
    isColor: true,
    hex: validHex,
    hsl: hslStr,
    rgba: rgbaStr,
  };
}

export function detectEmail(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (emailRegex.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function getTextStats(text: string): TextStats {
  if (!text) return { isLongText: false, wordCount: 0, charCount: 0 };
  const trimmed = text.trim();
  const charCount = trimmed.length;
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  return {
    isLongText: charCount > 100 || wordCount > 15,
    wordCount,
    charCount,
  };
}
