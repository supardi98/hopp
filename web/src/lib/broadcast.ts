import type { ClipboardItem } from '../types';

const CHANNEL_NAME = 'hopp_sync_channel';

class SyncBroadcastService {
  private channel: BroadcastChannel | null = null;
  private listeners: ((item: ClipboardItem) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        if (event.data && event.data.type === 'NEW_CLIPBOARD_ITEM') {
          this.notifyListeners(event.data.item);
        }
      };
    }
  }

  public broadcastItem(item: ClipboardItem) {
    if (this.channel) {
      this.channel.postMessage({
        type: 'NEW_CLIPBOARD_ITEM',
        item,
      });
    }
  }

  public onNewItem(callback: (item: ClipboardItem) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(item: ClipboardItem) {
    this.listeners.forEach(fn => fn(item));
  }
}

export const syncService = new SyncBroadcastService();
