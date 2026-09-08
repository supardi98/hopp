export type PlatformType = 'linux' | 'windows' | 'android' | 'web';

export type DeviceStatus = 'online' | 'syncing' | 'offline';

export interface Device {
  id: string;
  name: string;
  platform: PlatformType;
  status: DeviceStatus;
  ipAddress: string;
  isCurrentDevice?: boolean;
  lastSync?: string;
  batteryLevel?: number;
}

export type ContentType = 'text' | 'code' | 'url' | 'sensitive' | 'image' | 'file';

export interface ClipboardItem {
  id: string;
  content: string;
  encryptedContent?: string;
  contentType: ContentType;
  senderDeviceId: string;
  senderDeviceName: string;
  senderPlatform: PlatformType;
  senderTabId?: string;
  roomCode?: string;
  timestamp: number;
  pinned: boolean;
  sizeBytes: number;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  fileUrl?: string;
  tags?: string[];
  expiresAt?: number;
}

export interface E2EESettings {
  enabled: boolean;
  secretKey: string;
  roomCode: string;
  isRoomSet?: boolean;
  autoSync: boolean;
  autoBroadcastClipboard?: boolean;
  soundAlert: boolean;
  maxItems: number;
  lanSyncOnly: boolean;
  retentionHours?: number;
  lastConnectedTimestamp?: number;
  customRelayUrl?: string;
  webrtcP2pEnabled?: boolean;
}
