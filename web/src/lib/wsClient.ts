import type { ClipboardItem, Device } from '../types';

type MessageHandler = (data: any) => void;

class RealtimeWSClient {
  private ws: WebSocket | null = null;
  private serverUrl: string = 'ws://localhost:8080';
  private handlers: MessageHandler[] = [];
  private isConnected: boolean = false;
  private reconnectTimer: any = null;

  public connect(url: string = 'ws://localhost:8080', currentDevice?: Device, roomCode?: string) {
    this.serverUrl = url;

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
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
        this.isConnected = false;
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
