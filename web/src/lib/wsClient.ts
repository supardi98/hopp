import type { ClipboardItem, Device } from '../types';

type MessageHandler = (data: any) => void;

export const getEffectiveRelayUrl = (customUrl?: string): string => {
  if (customUrl && customUrl.trim()) {
    return customUrl.trim();
  }
  const envUrl = (import.meta as any).env?.VITE_HOPP_RELAY_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }
  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `ws://${host}:8080`;
};

class RealtimeWSClient {
  private ws: WebSocket | null = null;
  private serverUrl: string = 'ws://localhost:8080';
  private handlers: MessageHandler[] = [];
  private isConnected: boolean = false;
  private reconnectTimer: any = null;
  private statusListeners: ((connected: boolean) => void)[] = [];

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.notifyStatus(false);
  }

  public onStatusChange(listener: (connected: boolean) => void) {
    this.statusListeners.push(listener);
    listener(this.isConnected);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private notifyStatus(status: boolean) {
    if (this.isConnected !== status) {
      this.isConnected = status;
      this.statusListeners.forEach((l) => l(status));
    }
  }

  public connect(url?: string, currentDevice?: Device, roomCode?: string) {
    const targetUrl = url || getEffectiveRelayUrl();
    if (this.ws && this.serverUrl === targetUrl && this.isConnected) {
      return;
    }

    if (this.ws) {
      this.ws.close();
    }

    this.serverUrl = targetUrl;

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        this.notifyStatus(true);
        console.log(`[Hopp WS] Connected to real sync server at ${this.serverUrl}`);

        if (currentDevice) {
          this.send({
            type: 'REGISTER_DEVICE',
            device: currentDevice,
            roomCode: roomCode || '',
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handlers.forEach((h) => h(data));
        } catch (e) {
          console.error('[Hopp WS] Error parsing message:', e);
        }
      };

      this.ws.onclose = () => {
        this.notifyStatus(false);
        console.warn('[Hopp WS] Disconnected. Reconnecting in 3s...');
        this.scheduleReconnect(currentDevice, roomCode);
      };

      this.ws.onerror = (err) => {
        console.warn('[Hopp WS] WebSocket connection error:', err);
      };
    } catch (err) {
      console.warn('[Hopp WS] Failed to initiate WebSocket:', err);
      this.scheduleReconnect(currentDevice, roomCode);
    }
  }

  private scheduleReconnect(currentDevice?: Device, roomCode?: string) {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.serverUrl, currentDevice, roomCode);
    }, 3000);
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public broadcastClipboardItem(item: ClipboardItem, roomCode?: string) {
    this.send({
      type: 'SYNC_CLIPBOARD_ITEM',
      item,
      roomCode: roomCode || item.roomCode || '',
    });
  }

  public deleteClipboardItem(itemId: string, roomCode?: string) {
    this.send({
      type: 'DELETE_CLIPBOARD_ITEM',
      itemId,
      roomCode: roomCode || '',
    });
  }

  public clearRoomHistory(roomCode?: string) {
    this.send({
      type: 'CLEAR_ROOM_HISTORY',
      roomCode: roomCode || '',
    });
  }

  public onMessage(handler: MessageHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  public getStatus() {
    return this.isConnected;
  }
}

export const wsClient = new RealtimeWSClient();
