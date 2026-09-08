/**
 * Native System Clipboard Wrapper
 * Automatically detects whether running inside Tauri v2 (Linux/Windows/Android)
 * or in a standard Web Browser.
 */

export async function isTauriEnvironment(): Promise<boolean> {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function readSystemClipboard(): Promise<string> {
  try {
    if (await isTauriEnvironment()) {
      const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
      return await readText();
    }
  } catch (err) {
    console.warn('[Native Clipboard] Tauri plugin read failed, falling back to Web API:', err);
  }

  // Fallback to Web Browser Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
    return await navigator.clipboard.readText();
  }

  throw new Error('Clipboard access not supported or permission denied.');
}

export async function writeSystemClipboard(text: string): Promise<void> {
  try {
    if (await isTauriEnvironment()) {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      await writeText(text);
      return;
    }
  } catch (err) {
    console.warn('[Native Clipboard] Tauri plugin write failed, falling back to Web API:', err);
  }

  // Fallback to Web Browser Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
  }
}
