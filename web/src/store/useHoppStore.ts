import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ClipboardItem, ContentType, Device, E2EESettings, PlatformType } from '../types';
import { generateSecretKey, encryptContent, decryptContent } from '../lib/crypto';
import { syncService } from '../lib/broadcast';
import { wsClient, getEffectiveRelayUrl } from '../lib/wsClient';
import { writeSystemClipboard } from '../lib/nativeClipboard';
import { savePayloadToDB, deletePayloadFromDB, clearAllPayloadsDB } from '../utils/storageDB';
import { webrtcManager } from '../lib/webrtcClient';
import { playNotificationChime } from '../utils/sound';

// Unique Tab Instance ID per browser window/tab
const TAB_INSTANCE_ID = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

// Tab Leader Election via BroadcastChannel — WhatsApp Web style:
// New tab broadcasts TAKE_OVER → old tabs disconnect and show reconnect banner
let _isLeaderTab = false;
const _leaderChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('hopp_leader')
  : null;

interface HoppState {
  currentDevice: Device;
  pairedDevices: Device[];
  items: ClipboardItem[];
  settings: E2EESettings;
  activeTab: 'all' | ContentType | 'pinned';
  searchQuery: string;
  isPairingModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isOnboardingOpen: boolean;
  isE2EEModalOpen: boolean;
  activeToast: string | null;
  isWsConnected: boolean;
  isOtherTabActive: boolean;
  isDeviceListOpen: boolean;
  activeP2pPeers: string[];
  selectedItemIds: string[];
  isSelectMode: boolean;
  isAppLocked: boolean;

  // Actions
  initRealtimeSync: () => void;
  addClipboardItem: (content: string, senderDeviceOverride?: Partial<Device>) => Promise<void>;
  addFileItem: (file: File) => Promise<void>;
  purgeExpiredItems: () => void;
  receiveBroadcastItem: (item: ClipboardItem) => void;
  receiveRoomHistory: (incomingItems: ClipboardItem[], roomCode?: string) => void;
  deleteItem: (id: string) => void;
  togglePin: (id: string) => void;
  clearAllItems: () => void;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: 'all' | ContentType | 'pinned') => void;
  updateSettings: (newSettings: Partial<E2EESettings>) => void;
  setPairingModalOpen: (open: boolean) => void;
  setSettingsModalOpen: (open: boolean) => void;
  setOnboardingOpen: (open: boolean) => void;
  setDeviceListOpen: (open: boolean) => void;
  setE2EEModalOpen: (open: boolean) => void;
  showToast: (msg: string) => void;
  leaveRoom: () => void;
  reconnectAsLeader: () => void;
  pairNewDevice: (device: Omit<Device, 'id'>) => void;
  removeDevice: (deviceId: string) => void;
  simulateSimultaneousPaste: () => void;
  setItemTags: (id: string, tags: string[]) => void;
  setItemSelfDestruct: (id: string, durationMinutes: number | null) => void;
  setSelectMode: (active: boolean) => void;
  toggleSelectItem: (id: string) => void;
  selectAllItems: () => void;
  clearSelectedItems: () => void;
  deleteSelectedItems: () => void;
  exportSelectedItemsJSON: () => void;
  setAppPin: (pin: string | null) => void;
  lockApp: () => void;
  unlockApp: (pin: string) => boolean;
}

const isLocalLanIp = (senderIp?: string, myIp?: string): boolean => {
  if (!senderIp) return true;
  const cleanSender = senderIp.trim().replace(/^::ffff:/i, '');
  const cleanMy = myIp ? myIp.trim().replace(/^::ffff:/i, '') : '';

  // 1. If sender IP matches current device IP, they are on the SAME router / NAT network!
  if (cleanMy && (cleanSender === cleanMy || cleanSender === '127.0.0.1' || cleanMy === '127.0.0.1')) return true;

  // 2. Loopback & Localhost
  if (cleanSender === '127.0.0.1' || cleanSender === '::1' || cleanSender === 'localhost') return true;

  // 3. Private RFC1918 subnets (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  if (/^192\.168\./.test(cleanSender)) return true;
  if (/^10\./.test(cleanSender)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanSender)) return true;

  // 4. CGNAT subnets (100.64.0.0/10)
  if (/^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(cleanSender)) return true;

  return false;
};

const detectContentType = (text: string): ContentType => {
  const trimmed = text.trim();
  if (/^(https?:\/\/|www\.)[^\s]+$/i.test(trimmed)) {
    return 'url';
  }
  if (
    /^(const|let|var|function|import|export|class|def|if|for|while|<[a-z]|curl|\{|\}|\/\/|\/\*)/i.test(trimmed) ||
    trimmed.includes(';\n') ||
    trimmed.includes('{\n')
  ) {
    return 'code';
  }
  return 'text';
};

// Protect pinned items from automatic FIFO deletion
const limitItemsWithPinnedProtection = (allItems: ClipboardItem[], maxItems: number): ClipboardItem[] => {
  const pinned = allItems.filter((i) => i.pinned);
  const unpinned = allItems.filter((i) => !i.pinned);
  const allowedUnpinnedCount = Math.max(0, maxItems - pinned.length);
  const truncatedUnpinned = unpinned.slice(0, allowedUnpinnedCount);

  return [...pinned, ...truncatedUnpinned].sort((a, b) => b.timestamp - a.timestamp);
};

const detectDeviceFromUA = (): { name: string; platform: PlatformType } => {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (isTauri) {
    return { name: 'Linux Workstation (Tauri Desktop)', platform: 'linux' };
  }
  if (typeof navigator === 'undefined') {
    return { name: 'Web Browser Device', platform: 'web' };
  }

  const ua = navigator.userAgent;

  // Phone / Mobile Browsers
  if (/Android/i.test(ua)) {
    return { name: 'Android Browser', platform: 'android' };
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return { name: 'iOS Mobile Browser', platform: 'android' };
  }

  // PC Desktop Browsers
  let browserName = 'Web Browser';
  if (ua.includes('Firefox')) browserName = 'Firefox';
  else if (ua.includes('Edg')) browserName = 'Edge';
  else if (ua.includes('Chrome')) browserName = 'Chrome';
  else if (ua.includes('Safari')) browserName = 'Safari';

  if (/Windows/i.test(ua)) {
    return { name: `Windows PC (${browserName})`, platform: 'windows' };
  }
  if (/Macintosh|Mac OS X/i.test(ua)) {
    return { name: `Mac PC (${browserName})`, platform: 'web' };
  }
  if (/Linux/i.test(ua)) {
    return { name: `Linux PC (${browserName})`, platform: 'linux' };
  }

  const isMobile = /Mobi|Android/i.test(ua);
  return {
    name: isMobile ? `Mobile Browser (${browserName})` : `PC Browser (${browserName})`,
    platform: isMobile ? 'android' : 'web',
  };
};

const getInitialCurrentDevice = (): Device => {
  const { name, platform } = detectDeviceFromUA();
  return {
    id: `dev-${Math.random().toString(36).substring(2, 9)}`,
    name,
    platform,
    status: 'online',
    ipAddress: 'Mendeteksi...',
    isCurrentDevice: true,
    lastSync: 'Baru saja',
  };
};

const defaultDevice = getInitialCurrentDevice();
const initialDevices: Device[] = [defaultDevice];

const initialItems: ClipboardItem[] = [];

export const useHoppStore = create<HoppState>()(
  persist(
    (set, get) => {
      // Cross-tab broadcast channel listener
      syncService.onNewItem((newItem) => {
        get().receiveBroadcastItem(newItem);
      });

      return {
        currentDevice: defaultDevice,
        pairedDevices: initialDevices,
        items: initialItems,
        settings: {
          enabled: true,
          secretKey: generateSecretKey(),
          roomCode: '',
          isRoomSet: false,
          autoSync: true,
          autoBroadcastClipboard: true,
          soundAlert: true,
          maxItems: 50,
          lanSyncOnly: true,
          retentionHours: 24,
          lastConnectedTimestamp: Date.now(),
          webrtcP2pEnabled: true,
        },
        activeTab: 'all',
        searchQuery: '',
        isOtherTabActive: false,
        isDeviceListOpen: false,
        isPairingModalOpen: false,
        isSettingsModalOpen: false,
        isOnboardingOpen: false,
        isE2EEModalOpen: false,
        activeToast: null,
        isWsConnected: false,
        activeP2pPeers: [],
        selectedItemIds: [],
        isSelectMode: false,
        isAppLocked: false,

        initRealtimeSync: () => {
          const { name, platform } = detectDeviceFromUA();

          const freshCurrentDevice: Device = {
            id: get().currentDevice?.id || `dev-${Math.random().toString(36).substring(2, 9)}`,
            name,
            platform,
            status: 'online',
            ipAddress: get().currentDevice?.ipAddress || 'Mendeteksi...',
            isCurrentDevice: true,
            lastSync: 'Baru saja',
          };

          set({ currentDevice: freshCurrentDevice });

          // Purge expired unpinned items based on last connection session
          get().purgeExpiredItems();

          // Initialize WebRTC P2P Direct Client
          const currentSettings = get().settings;
          webrtcManager.init(
            freshCurrentDevice.id,
            currentSettings.roomCode,
            (signalData) => wsClient.send(signalData)
          );
          webrtcManager.setEnabled(currentSettings.webrtcP2pEnabled ?? true);

          webrtcManager.onItemReceived((item) => {
            get().receiveBroadcastItem(item);
          });

          webrtcManager.onP2PStatusChange((_count, activePeerIds) => {
            set({ activeP2pPeers: activePeerIds });
          });

          // 1. Register message listener BEFORE connecting to prevent dropping instant server handshake messages
          wsClient.onMessage((data) => {
            if (data.type === 'RECEIVE_CLIPBOARD_ITEM') {
              get().receiveBroadcastItem(data.item);
            } else if (data.type === 'ROOM_HISTORY_SYNC') {
              get().receiveRoomHistory(data.items, data.roomCode);
            } else if (data.type === 'WEBRTC_SIGNAL') {
              webrtcManager.handleSignal(data);
            } else if (data.type === 'DEVICE_LIST_UPDATE') {
              const currentId = get().currentDevice?.id;
              const myServerDevice = (data.devices || []).find((d: Device) => d.id === currentId);

              // Deduplicate devices by ID to prevent duplicate React keys
              const deviceMap = new Map<string, Device>();
              (data.devices || []).forEach((d: Device) => {
                if (d && d.id && !deviceMap.has(d.id)) {
                  deviceMap.set(d.id, {
                    ...d,
                    isCurrentDevice: d.id === currentId,
                  });
                }
              });
              const mergedDevices: Device[] = Array.from(deviceMap.values());

              if (myServerDevice && myServerDevice.ipAddress) {
                set({
                  pairedDevices: mergedDevices,
                  currentDevice: {
                    ...get().currentDevice,
                    ipAddress: myServerDevice.ipAddress,
                  },
                });
              } else {
                set({ pairedDevices: mergedDevices });
              }

              // Connect P2P WebRTC DataChannel to active devices if P2P is enabled
              if (get().settings.webrtcP2pEnabled ?? true) {
                mergedDevices.forEach((d) => {
                  if (d.id && d.id !== currentId) {
                    webrtcManager.initiateConnection(d.id);
                  }
                });
              }
            } else if (data.type === 'DELETE_CLIPBOARD_ITEM') {
              const target = get().items.find((i) => i.id === data.itemId);
              if (target && (target.contentType === 'image' || target.contentType === 'file')) {
                deletePayloadFromDB(data.itemId);
              }
              set((state) => ({ items: state.items.filter((item) => item.id !== data.itemId) }));
            } else if (data.type === 'CLEAR_ROOM_HISTORY') {
              clearAllPayloadsDB();
              set({ items: [] });
            }
          });

          // 2. WhatsApp-style Tab Takeover via BroadcastChannel
          const doConnect = () => {
            const s = get().settings;
            wsClient.connect(getEffectiveRelayUrl(s.customRelayUrl), get().currentDevice, s.roomCode);
          };

          if (_leaderChannel) {
            // Listen for other tabs claiming leadership
            _leaderChannel.onmessage = (e) => {
              if (e.data.type === 'TAKE_OVER' && e.data.tabId !== TAB_INSTANCE_ID) {
                if (_isLeaderTab) {
                  _isLeaderTab = false;
                  wsClient.disconnect();
                  set({ isWsConnected: false, isOtherTabActive: true });
                }
              }
            };

            // Broadcast takeover to kick other tabs
            _leaderChannel.postMessage({ type: 'TAKE_OVER', tabId: TAB_INSTANCE_ID });
          }

          _isLeaderTab = true;
          set({ isOtherTabActive: false });
          doConnect();

          // Event-driven WS connection status updates (0% timer overhead)
          wsClient.onStatusChange((status) => {
            if (status) {
              set((state) => ({
                isWsConnected: status,
                settings: { ...state.settings, lastConnectedTimestamp: Date.now() },
              }));
            } else {
              set({ isWsConnected: status });
            }
          });
        },

        purgeExpiredItems: () => {
          const { items, settings } = get();
          const now = Date.now();

          // 1. Purge items with individual self-destruct expiresAt reached
          const selfDestructExpired = items.filter(
            (item) => item.expiresAt && now >= item.expiresAt
          );
          if (selfDestructExpired.length > 0) {
            selfDestructExpired.forEach((item) => {
              if (item.contentType === 'image' || item.contentType === 'file') {
                deletePayloadFromDB(item.id);
              }
            });
          }

          const currentItems = items.filter((item) => !item.expiresAt || now < item.expiresAt);

          const lastConn = settings.lastConnectedTimestamp || now;
          const retentionHours = settings.retentionHours || 24;
          const retentionMs = retentionHours * 60 * 60 * 1000;

          // 2. Check if user hasn't been connected for more than retention period
          if (now - lastConn >= retentionMs) {
            const expiredCutoff = now - retentionMs;
            const keptItems = currentItems.filter((item) => item.pinned || item.timestamp >= expiredCutoff);
            const removedItems = currentItems.filter((item) => !item.pinned && item.timestamp < expiredCutoff);

            if (removedItems.length > 0) {
              removedItems.forEach((item) => {
                if (item.contentType === 'image' || item.contentType === 'file') {
                  deletePayloadFromDB(item.id);
                }
              });
              set({
                items: keptItems,
                settings: { ...settings, lastConnectedTimestamp: now },
              });
              get().showToast(`Auto-hapus 24 jam: ${removedItems.length} item unpinned dibersihkan`);
              return;
            }
          }

          if (selfDestructExpired.length > 0) {
            set({ items: currentItems });
            get().showToast(`${selfDestructExpired.length} item rahasia terhapus otomatis (Self-Destruct)`);
          } else {
            set({ settings: { ...settings, lastConnectedTimestamp: now } });
          }
        },

        setItemTags: (id, tags) => {
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, tags } : item
            ),
          }));
        },

        setItemSelfDestruct: (id, durationMinutes) => {
          const now = Date.now();
          const expiresAt = durationMinutes ? now + durationMinutes * 60 * 1000 : undefined;
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, expiresAt } : item
            ),
          }));
          if (durationMinutes) {
            get().showToast(`Self-destruct disetel ${durationMinutes} menit`);
          } else {
            get().showToast('Self-destruct dibatalkan');
          }
        },

        addClipboardItem: async (content: string, senderOverride) => {
          const { currentDevice, settings, items } = get();
          if (!content || !content.trim()) return;

          const device = senderOverride
            ? { ...currentDevice, ...senderOverride }
            : currentDevice;

          const contentType = detectContentType(content);

          // Deduplicate: if same content already exists, bump timestamp and move to top
          const existing = items.find(
            (i) => i.content.trim() === content.trim() && i.contentType === contentType
          );
          if (existing) {
            const bumped = { ...existing, timestamp: Date.now() };
            const rest = items.filter((i) => i.id !== existing.id);
            set({ items: limitItemsWithPinnedProtection([bumped, ...rest], settings.maxItems) });
            wsClient.broadcastClipboardItem(bumped, settings.roomCode);
            get().showToast('Konten sama dipindahkan ke atas');
            return;
          }

          const encrypted = settings.enabled
            ? await encryptContent(content, settings.secretKey, settings.roomCode)
            : undefined;

          const newItem: ClipboardItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            content: content.trim(),
            encryptedContent: encrypted,
            contentType,
            senderDeviceId: device.id,
            senderDeviceName: device.name,
            senderPlatform: device.platform as PlatformType,
            senderTabId: TAB_INSTANCE_ID,
            roomCode: settings.roomCode,
            timestamp: Date.now(),
            pinned: false,
            sizeBytes: new TextEncoder().encode(content).length,
          };

          const updatedItems = limitItemsWithPinnedProtection([newItem, ...items], settings.maxItems);

          set({ items: updatedItems });

          // 1. Send via direct WebRTC P2P DataChannel if active
          webrtcManager.sendItemP2P(newItem);

          // 2. Broadcast to open browser tabs
          syncService.broadcastItem(newItem);

          // 3. Broadcast to real WebSocket network server with room isolation
          wsClient.broadcastClipboardItem(newItem, settings.roomCode);

          get().showToast(`Tersinkron di Room ${settings.roomCode}`);
        },

        addFileItem: async (file: File) => {
          const { currentDevice, settings, items } = get();
          if (!file) return;

          const isMobile = currentDevice.platform === 'android' || window.innerWidth < 768;
          const maxBytes = isMobile ? 2 * 1024 * 1024 : 10 * 1024 * 1024;
          const maxMBText = isMobile ? '2 MB (Mobile)' : '10 MB (Web/Desktop)';

          if (file.size > maxBytes) {
            get().showToast(`File terlalu besar (${(file.size / (1024 * 1024)).toFixed(1)} MB)! Maksimal ${maxMBText}`);
            return;
          }

          const isImage = file.type.startsWith('image/');
          const contentType: ContentType = isImage ? 'image' : 'file';

          const base64Content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const encrypted = settings.enabled
            ? await encryptContent(base64Content, settings.secretKey, settings.roomCode)
            : undefined;

          const newItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

          // Save large payload to IndexedDB
          await savePayloadToDB(newItemId, base64Content);

          const newItem: ClipboardItem = {
            id: newItemId,
            content: base64Content,
            encryptedContent: encrypted,
            contentType,
            senderDeviceId: currentDevice.id,
            senderDeviceName: currentDevice.name,
            senderPlatform: currentDevice.platform as PlatformType,
            senderTabId: TAB_INSTANCE_ID,
            roomCode: settings.roomCode,
            timestamp: Date.now(),
            pinned: false,
            sizeBytes: file.size,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || (isImage ? 'image/png' : 'application/octet-stream'),
            fileUrl: base64Content,
          };

          const updatedItems = limitItemsWithPinnedProtection([newItem, ...items], settings.maxItems);
          set({ items: updatedItems });

          webrtcManager.sendItemP2P(newItem);
          syncService.broadcastItem(newItem);
          wsClient.broadcastClipboardItem(newItem, settings.roomCode);

          get().showToast(`${isImage ? 'Gambar' : 'File'} '${file.name}' tersinkron di Room ${settings.roomCode}!`);
        },

        receiveBroadcastItem: async (newItem) => {
          const { items, settings } = get();

          // Ignore self-broadcast from THIS EXACT tab instance
          if (newItem.senderTabId && newItem.senderTabId === TAB_INSTANCE_ID) return;

          // Ignore items from different room code if specified
          if (newItem.roomCode && newItem.roomCode !== settings.roomCode) return;

          // If LAN-Only mode is enabled, filter out items from non-LAN IP addresses
          if (settings.lanSyncOnly) {
            const senderDev = get().pairedDevices.find((d) => d.id === newItem.senderDeviceId);
            const myIp = get().currentDevice?.ipAddress;
            if (senderDev && senderDev.ipAddress && !isLocalLanIp(senderDev.ipAddress, myIp)) {
              console.warn('[LAN Only] Broadcast item ignored from non-LAN sender IP:', senderDev.ipAddress);
              return;
            }
          }

          let processedItem = { ...newItem };
          if (newItem.encryptedContent && settings.enabled) {
            const decrypted = await decryptContent(newItem.encryptedContent, settings.secretKey, settings.roomCode);
            processedItem.content = decrypted;
          }

          // Deduplicate by content: bump timestamp and move to top if same content exists
          const existing = items.find(
            (i) =>
              i.contentType === processedItem.contentType &&
              i.content.trim() === processedItem.content.trim()
          );
          if (existing) {
            const bumped = { ...existing, timestamp: processedItem.timestamp };
            const rest = items.filter((i) => i.id !== existing.id);
            set({ items: limitItemsWithPinnedProtection([bumped, ...rest], settings.maxItems) });
            return;
          }

          // Check if already exists by ID
          if (items.some((i) => i.id === processedItem.id)) return;

          // If item is image or file, persist to IndexedDB
          if ((processedItem.contentType === 'image' || processedItem.contentType === 'file') && processedItem.content) {
            savePayloadToDB(processedItem.id, processedItem.content);
          }

          set({ items: limitItemsWithPinnedProtection([processedItem, ...items], settings.maxItems) });

          // If auto-sync is enabled, automatically write incoming text to local OS system clipboard!
          // Guard: Skip if document is not focused — browser blocks clipboard write in background tab
          // (item is still added to the store/UI, user can copy manually when they return)
          if (
            settings.autoSync &&
            processedItem.contentType !== 'image' &&
            processedItem.contentType !== 'file' &&
            !processedItem.content.includes('[Encrypted content') &&
            document.hasFocus()
          ) {
            try {
              await writeSystemClipboard(processedItem.content);
            } catch (err) {
              console.warn('Auto-write to system clipboard failed:', err);
            }
          }

          if (settings.soundAlert) {
            playNotificationChime();
            get().showToast(`Clipboard tersinkron dari ${processedItem.senderDeviceName}!`);
          }
        },

        receiveRoomHistory: async (incomingItems, roomCode) => {
          const { items, settings } = get();
          if (roomCode && roomCode !== settings.roomCode) return;

          const existingIds = new Set(items.map((i) => i.id));
          const newItemsToAppend = incomingItems.filter((i) => !existingIds.has(i.id));

          if (newItemsToAppend.length > 0) {
            const processedItems = await Promise.all(
              newItemsToAppend.map(async (item) => {
                if (item.encryptedContent && settings.enabled) {
                  const decrypted = await decryptContent(item.encryptedContent, settings.secretKey, settings.roomCode);
                  return { ...item, content: decrypted };
                }
                return item;
              })
            );

            processedItems.forEach((item) => {
              if ((item.contentType === 'image' || item.contentType === 'file') && item.content) {
                savePayloadToDB(item.id, item.content);
              }
            });
            const updated = limitItemsWithPinnedProtection([...processedItems, ...items], settings.maxItems);
            set({ items: updated });
            get().showToast(`Tersinkron ${processedItems.length} riwayat room!`);
          }
        },

        deleteItem: (id) => {
          const { items, settings } = get();
          const target = items.find((i) => i.id === id);
          if (target && (target.contentType === 'image' || target.contentType === 'file')) {
            deletePayloadFromDB(id);
          }
          set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
          wsClient.deleteClipboardItem(id, settings.roomCode);
          get().showToast('Item dihapus');
        },

        togglePin: (id) => {
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, pinned: !item.pinned } : item
            ),
          }));
        },

        clearAllItems: () => {
          const { settings } = get();
          clearAllPayloadsDB();
          set({ items: [] });
          wsClient.clearRoomHistory(settings.roomCode);
          get().showToast('Semua item dibersihkan');
        },

        setSearchQuery: (query) => set({ searchQuery: query }),
        setActiveTab: (tab) => set({ activeTab: tab }),

        updateSettings: (newSettings) => {
          const currentRoom = get().settings.roomCode;
          const currentRelay = get().settings.customRelayUrl;
          const currentKey = get().settings.secretKey;
          const currentEnabled = get().settings.enabled;

          const isRoomChanged = Boolean(newSettings.roomCode && newSettings.roomCode !== currentRoom);
          const isRelayChanged = Boolean(newSettings.customRelayUrl !== undefined && newSettings.customRelayUrl !== currentRelay);
          const isKeyChanged = Boolean(newSettings.secretKey && newSettings.secretKey !== currentKey);
          const isEnabledChanged = Boolean(newSettings.enabled !== undefined && newSettings.enabled !== currentEnabled);

          const updatedSettings = { ...get().settings, ...newSettings };

          set((state) => ({
            settings: updatedSettings,
            // If room changed, reset items so previous room history doesn't leak!
            items: isRoomChanged ? [] : state.items,
          }));

          // Re-decrypt existing items if secretKey or E2EE status changed
          if ((isKeyChanged || isEnabledChanged) && !isRoomChanged) {
            const activeKey = updatedSettings.secretKey;
            const isE2EEActive = updatedSettings.enabled;
            const roomCode = updatedSettings.roomCode;

            Promise.all(
              get().items.map(async (item) => {
                if (item.encryptedContent && isE2EEActive) {
                  const decrypted = await decryptContent(item.encryptedContent, activeKey, roomCode);
                  return { ...item, content: decrypted };
                }
                return item;
              })
            ).then((reDecrypted) => {
              set({ items: reDecrypted });
            });
          }

          if (newSettings.webrtcP2pEnabled !== undefined) {
            webrtcManager.setEnabled(newSettings.webrtcP2pEnabled);
            if (newSettings.webrtcP2pEnabled) {
              const currentId = get().currentDevice?.id;
              get().pairedDevices.forEach((d) => {
                if (d.id && d.id !== currentId) {
                  webrtcManager.initiateConnection(d.id);
                }
              });
            }
          }

          if (isRoomChanged) {
            webrtcManager.closeAll();
            webrtcManager.init(
              get().currentDevice.id,
              updatedSettings.roomCode,
              (signalData) => wsClient.send(signalData)
            );
          }

          // Only reconnect if this tab is the current WS leader
          if ((isRoomChanged || isRelayChanged) && get().settings.roomCode && _isLeaderTab) {
            const targetUrl = getEffectiveRelayUrl(get().settings.customRelayUrl);
            wsClient.connect(targetUrl, get().currentDevice, get().settings.roomCode);
          }
        },

        setPairingModalOpen: (open) => set({ isPairingModalOpen: open }),
        setSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),
        setOnboardingOpen: (open) => set({ isOnboardingOpen: open }),
        setDeviceListOpen: (open) => set({ isDeviceListOpen: open }),
        setE2EEModalOpen: (open) => set({ isE2EEModalOpen: open }),

        showToast: (msg) => {
          set({ activeToast: msg });
          setTimeout(() => {
            set((state) => (state.activeToast === msg ? { activeToast: null } : {}));
          }, 3000);
        },

        pairNewDevice: (deviceData) => {
          const newDev: Device = {
            ...deviceData,
            id: `dev-${Date.now()}`,
            status: 'online',
            lastSync: 'Baru saja',
          };
          set((state) => ({
            pairedDevices: [...state.pairedDevices, newDev],
            isPairingModalOpen: false,
          }));
          get().showToast(`Device '${newDev.name}' terhubung!`);
        },

        leaveRoom: () => {
          const { currentDevice } = get();
          // Disconnect WS and cancel reconnect
          wsClient.disconnect();
          // Clear all IndexedDB payloads
          clearAllPayloadsDB();
          set((state) => ({
            items: [],
            pairedDevices: [{ ...currentDevice }],
            isWsConnected: false,
            settings: {
              ...state.settings,
              roomCode: '',
              isRoomSet: false,
            },
          }));
          get().showToast('Keluar dari room berhasil');
        },

        reconnectAsLeader: () => {
          // Kick any other tab that's currently the leader
          if (_leaderChannel) {
            _leaderChannel.postMessage({ type: 'TAKE_OVER', tabId: TAB_INSTANCE_ID });
          }
          _isLeaderTab = true;
          set({ isOtherTabActive: false });
          const s = get().settings;
          wsClient.connect(getEffectiveRelayUrl(s.customRelayUrl), get().currentDevice, s.roomCode);
        },

        removeDevice: (deviceId) => {
          set((state) => ({
            pairedDevices: state.pairedDevices.filter((d) => d.id !== deviceId),
          }));
          get().showToast('Device diputus koneksinya');
        },

        simulateSimultaneousPaste: () => {
          const sampleTexts = [
            { text: 'npm run tauri dev -- --target x86_64-unknown-linux-gnu', sender: initialDevices[0] },
            { text: 'https://hopp.net/download/android-v1.2.apk', sender: initialDevices[2] },
            { text: 'E2EE Secret Cipher Hash: 0x98A17F20B', sender: initialDevices[1] },
          ];
          const randomSample = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
          get().addClipboardItem(randomSample.text, randomSample.sender);
        },

        setSelectMode: (active) => set((state) => ({ isSelectMode: active, selectedItemIds: active ? state.selectedItemIds : [] })),

        toggleSelectItem: (id) =>
          set((state) => {
            const exists = state.selectedItemIds.includes(id);
            return {
              selectedItemIds: exists
                ? state.selectedItemIds.filter((item) => item !== id)
                : [...state.selectedItemIds, id],
            };
          }),

        selectAllItems: () => set((state) => ({ selectedItemIds: state.items.map((i) => i.id) })),

        clearSelectedItems: () => set({ selectedItemIds: [] }),

        deleteSelectedItems: () => {
          const { selectedItemIds, settings, items } = get();
          if (selectedItemIds.length === 0) return;

          selectedItemIds.forEach((id) => {
            deletePayloadFromDB(id);
            wsClient.deleteClipboardItem(id, settings.roomCode);
          });

          const selectedSet = new Set(selectedItemIds);
          set({
            items: items.filter((i) => !selectedSet.has(i.id)),
            selectedItemIds: [],
            isSelectMode: false,
          });
          get().showToast(`${selectedItemIds.length} item berhasil dihapus`);
        },

        exportSelectedItemsJSON: () => {
          const { selectedItemIds, items } = get();
          const targetItems = selectedItemIds.length > 0
            ? items.filter((i) => selectedItemIds.includes(i.id))
            : items;

          if (targetItems.length === 0) return;

          const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(targetItems, null, 2));
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute('href', dataStr);
          downloadAnchor.setAttribute('download', `hopp_backup_${Date.now()}.json`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();

          get().showToast(`${targetItems.length} item berhasil diekspor ke JSON!`);
        },

        setAppPin: (pin) => {
          set((state) => ({
            settings: {
              ...state.settings,
              appPin: pin ? pin.trim() : undefined,
            },
          }));
          if (pin) {
            get().showToast('PIN Kunci Aplikasi berhasil disetel!');
          } else {
            get().showToast('PIN Kunci Aplikasi dihapus.');
          }
        },

        lockApp: () => {
          const { settings } = get();
          if (!settings.appPin) {
            get().showToast('Setel PIN terlebih dahulu di Pengaturan.');
            return;
          }
          set({ isAppLocked: true });
          get().showToast('Aplikasi terkunci. Masukkan PIN untuk membuka.');
        },

        unlockApp: (inputPin) => {
          const { settings } = get();
          if (!settings.appPin || settings.appPin === inputPin.trim()) {
            set({ isAppLocked: false });
            get().showToast('Aplikasi berhasil dibuka!');
            return true;
          }
          return false;
        },
      };
    },
    {
      name: 'hopp_persistent_storage_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        settings: state.settings,
        currentDevice: state.currentDevice,
      }),
    }
  )
);
