import type { ClipboardItem, Device } from '../types';
import { webrtcManager } from './webrtcClient';

type MessageHandler = (data: any) => void;

export interface WSLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'send' | 'recv';
  message: string;
  details?: string;
}

export const getEffectiveRelayUrl = (customUrl?: string): string => {
  if (customUrl && customUrl.trim()) {
    return customUrl.trim();
  }
  const envUrl = (import.meta as any).env?.VITE_HOPP_RELAY_URL;
  const currentHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  const currentPort = typeof window !== 'undefined' && window.location.port ? window.location.port : '';
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  if (envUrl && envUrl.trim()) {
    const trimmed = envUrl.trim();
    if (trimmed.includes('localhost') && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      const portPart = currentPort ? `:${currentPort}` : '';
      return `${protocol}//${currentHost}${portPart}/ws`;
    }
    return trimmed;
  }

  // If accessing from remote mobile/browser on network, use same port with /ws proxy to bypass firewall port blocks
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const portPart = currentPort ? `:${currentPort}` : '';
    return `${protocol}//${currentHost}${portPart}/ws`;
  }

  return `${protocol}//${currentHost}:4077`;
};

class RealtimeWSClient {
  private ws: WebSocket | null = null;
  private serverUrl: string = 'ws://localhost:4077';
  private handlers: MessageHandler[] = [];
  private isConnected: boolean = false;
  private reconnectTimer: any = null;
  private statusListeners: ((connected: boolean) => void)[] = [];
  private logs: WSLogEntry[] = [];
  private logListeners: ((logs: WSLogEntry[]) => void)[] = [];
  private _manualDisconnect: boolean = false; // Prevents auto-reconnect after intentional disconnect

  public addLog(type: WSLogEntry['type'], message: string, details?: string) {
    const entry: WSLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 60) this.logs.pop();
    this.logListeners.forEach((l) => l([...this.logs]));
  }

  public onLogsChange(listener: (logs: WSLogEntry[]) => void) {
    this.logListeners.push(listener);
    listener([...this.logs]);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== listener);
    };
  }

  public getLogs(): WSLogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.logListeners.forEach((l) => l([]));
  }

  public disconnect() {
    this._manualDisconnect = true; // Block auto-reconnect from onclose
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.notifyStatus(false);
    this.addLog('info', 'WebSocket diputus secara manual');
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
    this._manualDisconnect = false; // Allow reconnects again
    const targetUrl = url || getEffectiveRelayUrl();
    this.addLog('info', `Mencoba koneksi ke ${targetUrl}`, `Room Code: '${roomCode || 'Belum Set'}'`);

    if (this.ws && this.serverUrl === targetUrl && (this.isConnected || this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      this.addLog('info', `Sudah terhubung ke ${targetUrl}`);
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
        this.addLog('success', `WebSocket Terhubung ke ${this.serverUrl}`);

        if (currentDevice) {
          this.send({
            type: 'REGISTER_DEVICE',
            device: currentDevice,
            roomCode: roomCode || '',
          });
          this.addLog('send', `Mengirim REGISTER_DEVICE`, `Device: ${currentDevice.name} | Room: '${roomCode || 'Belum Set'}'`);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.addLog('recv', `Menerima event (${data.type})`, JSON.stringify(data).substring(0, 150));

          // Handle Tauri OS Remote Input Execution (Mouse & Keyboard Injection on Desktop App)
          if (data.type === 'REMOTE_CONTROL_INPUT') {
            console.log('[WS] Received REMOTE_CONTROL_INPUT payload:', data);
            if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
              import('@tauri-apps/api/core')
                .then(({ invoke }) => {
                  invoke('execute_remote_input', {
                    action: data.action,
                    dx: Math.round(data.dx || 0),
                    dy: Math.round(data.dy || 0),
                    text: data.text || '',
                    key: data.key || '',
                  })
                    .then(() => console.log('[Tauri] Remote input executed successfully'))
                    .catch((err) => console.error('[Tauri] execute_remote_input error:', err));
                })
                .catch((err) => console.error('[Tauri] Core import error:', err));
            } else {
              console.warn('[WS] Received REMOTE_CONTROL_INPUT but client is not running inside Tauri desktop app.');
            }
          }

          this.handlers.forEach((h) => h(data));
        } catch (e) {
          this.addLog('error', `Gagal parse pesan WebSocket JSON`, String(e));
        }
      };

      this.ws.onclose = (ev) => {
        this.notifyStatus(false);
        if (this._manualDisconnect) {
          // Intentional disconnect by leader election — do NOT auto-reconnect
          this.addLog('info', 'Koneksi diputus (mode non-aktif tab). Tidak akan reconnect otomatis.');
          return;
        }
        this.addLog('warn', `WebSocket Terputus (code ${ev.code}). Reconnect dalam 3s...`, ev.reason || 'Koneksi ditutup oleh server/jaringan');
        this.scheduleReconnect(currentDevice, roomCode);
      };

      this.ws.onerror = (_err) => {
        this.addLog('error', `Gagal terhubung ke WebSocket Relay (${this.serverUrl})`);
      };
    } catch (err) {
      this.addLog('error', `Gagal inisialisasi WebSocket: ${err}`);
      this.scheduleReconnect(currentDevice, roomCode);
    }
  }

  private scheduleReconnect(currentDevice?: Device, roomCode?: string) {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.addLog('info', `Memulai ulang koneksi ke ${this.serverUrl}...`);
      this.connect(this.serverUrl, currentDevice, roomCode);
    }, 3000);
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      if (data.type !== 'REGISTER_DEVICE') {
        this.addLog('send', `Mengirim payload (${data.type})`, JSON.stringify(data).substring(0, 120));
      }
    } else {
      this.addLog('warn', `Gagal mengirim (${data.type}) - WebSocket belum terhubung`);
    }
  }

  public broadcastClipboardItem(item: ClipboardItem, roomCode?: string) {
    this.send({
      type: 'SYNC_CLIPBOARD_ITEM',
      item,
      roomCode: roomCode || item.roomCode || '',
    });
  }

  public sendRemoteControlInput(
    targetDeviceId: string,
    action: string,
    payload: { dx?: number; dy?: number; text?: string; key?: string },
    roomCode?: string
  ) {
    // 1. Try ultra-low latency WebRTC Direct P2P first if data channel is OPEN!
    const p2pSent = webrtcManager.sendRemoteControlInputP2P(targetDeviceId, { action, ...payload });
    if (p2pSent) return;

    // 2. Fallback to WebSocket Relay if P2P is not connected
    this.send({
      type: 'REMOTE_CONTROL_INPUT',
      targetDeviceId,
      action,
      dx: payload.dx || 0,
      dy: payload.dy || 0,
      text: payload.text || '',
      key: payload.key || '',
      roomCode: roomCode || '',
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
