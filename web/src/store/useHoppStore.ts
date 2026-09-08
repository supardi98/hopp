import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ClipboardItem, ContentType, Device, E2EESettings, PlatformType } from '../types';
import { generateSecretKey, encryptContent } from '../lib/crypto';
import { syncService } from '../lib/broadcast';
import { wsClient } from '../lib/wsClient';
import { writeSystemClipboard } from '../lib/nativeClipboard';
import { savePayloadToDB, deletePayloadFromDB, clearAllPayloadsDB } from '../utils/storageDB';

// Unique Tab Instance ID per browser window/tab
const TAB_INSTANCE_ID = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

interface HoppState {
  currentDevice: Device;
  pairedDevices: Device[];
  items: ClipboardItem[];
  settings: E2EESettings;
  activeTab: 'all' | ContentType | 'pinned';
  searchQuery: string;
  isPairingModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isGuideModalOpen: boolean;
  isOnboardingOpen: boolean;
  activeToast: string | null;
  isWsConnected: boolean;

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
  setGuideModalOpen: (open: boolean) => void;
  setOnboardingOpen: (open: boolean) => void;
  showToast: (msg: string) => void;
  pairNewDevice: (device: Omit<Device, 'id'>) => void;
  removeDevice: (deviceId: string) => void;
  simulateSimultaneousPaste: () => void;
}

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

const initialDevices: Device[] = [
  {
    id: 'dev-linux-01',
    name: 'Linux Workstation (Ubuntu 24.04)',
    platform: 'linux',
    status: 'online',
    ipAddress: '192.168.1.104',
    isCurrentDevice: true,
    lastSync: 'Baru saja',
  },
  {
    id: 'dev-win-02',
    name: 'Windows Desktop (Win 11)',
    platform: 'windows',
    status: 'online',
    ipAddress: '192.168.1.112',
    lastSync: '2 menit lalu',
  },
  {
    id: 'dev-android-03',
    name: 'Galaxy S24 Ultra (Android 14)',
    platform: 'android',
    status: 'online',
    ipAddress: '192.168.1.150',
    batteryLevel: 88,
    lastSync: '5 menit lalu',
  },
];

const initialItems: ClipboardItem[] = [];

export const useHoppStore = create<HoppState>()(
  persist(
    (set, get) => {
      // Cross-tab broadcast channel listener
      syncService.onNewItem((newItem) => {
        get().receiveBroadcastItem(newItem);
      });

      return {
        currentDevice: initialDevices[0],
        pairedDevices: initialDevices,
        items: initialItems,
        settings: {
          enabled: true,
          secretKey: generateSecretKey(),
          roomCode: '',
          isRoomSet: false,
          autoSync: true,
          soundAlert: true,
          maxItems: 50,
          lanSyncOnly: true,
          retentionHours: 24,
          lastConnectedTimestamp: Date.now(),
        },
        activeTab: 'all',
        searchQuery: '',
        isPairingModalOpen: false,
        isSettingsModalOpen: false,
        isGuideModalOpen: false,
        isOnboardingOpen: false,
        activeToast: null,
        isWsConnected: false,

        initRealtimeSync: () => {
          const { currentDevice, settings } = get();

          // Purge expired unpinned items based on last connection session
          get().purgeExpiredItems();

          // Connect real WebSocket client with Room Code
          wsClient.connect('ws://localhost:8080', currentDevice, settings.roomCode);

          wsClient.onMessage((data) => {
            if (data.type === 'RECEIVE_CLIPBOARD_ITEM') {
              get().receiveBroadcastItem(data.item);
            } else if (data.type === 'ROOM_HISTORY_SYNC') {
              get().receiveRoomHistory(data.items, data.roomCode);
            } else if (data.type === 'DEVICE_LIST_UPDATE') {
              set({ pairedDevices: data.devices });
            }
          });

          // Periodically check WS connection state & hydrate payloads
          setInterval(() => {
            const status = wsClient.getStatus();
            if (status) {
              set((state) => ({
                isWsConnected: status,
                settings: { ...state.settings, lastConnectedTimestamp: Date.now() },
              }));
            } else {
              set({ isWsConnected: status });
            }
          }, 2000);
        },

        purgeExpiredItems: () => {
          const { items, settings } = get();
          const now = Date.now();
          const lastConn = settings.lastConnectedTimestamp || now;
          const retentionHours = settings.retentionHours || 24;
          const retentionMs = retentionHours * 60 * 60 * 1000;

          // Check if user hasn't been connected for more than retention period
          if (now - lastConn >= retentionMs) {
            const expiredCutoff = now - retentionMs;
            const keptItems = items.filter((item) => item.pinned || item.timestamp >= expiredCutoff);
            const removedItems = items.filter((item) => !item.pinned && item.timestamp < expiredCutoff);

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
            } else {
              set({ settings: { ...settings, lastConnectedTimestamp: now } });
            }
          } else {
            set({ settings: { ...settings, lastConnectedTimestamp: now } });
          }
        },

        addClipboardItem: async (content: string, senderOverride) => {
          const { currentDevice, settings, items } = get();
          if (!content || !content.trim()) return;

          const device = senderOverride
            ? { ...currentDevice, ...senderOverride }
            : currentDevice;

          const contentType = detectContentType(content);
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

          // 1. Broadcast to open browser tabs
          syncService.broadcastItem(newItem);

          // 2. Broadcast to real WebSocket network server with room isolation
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

          // Check if already exists in store
          if (items.some((i) => i.id === newItem.id)) return;

          // If item is image or file, persist to IndexedDB
          if ((newItem.contentType === 'image' || newItem.contentType === 'file') && newItem.content) {
            savePayloadToDB(newItem.id, newItem.content);
          }

          set({ items: limitItemsWithPinnedProtection([newItem, ...items], settings.maxItems) });

          // If auto-sync is enabled, automatically write incoming text to local OS system clipboard!
          if (settings.autoSync && newItem.contentType !== 'image' && newItem.contentType !== 'file') {
            try {
              await writeSystemClipboard(newItem.content);
            } catch (err) {
              console.warn('Auto-write to system clipboard failed:', err);
            }
          }

          get().showToast(`Clipboard tersinkron dari ${newItem.senderDeviceName}!`);
        },

        receiveRoomHistory: (incomingItems, roomCode) => {
          const { items, settings } = get();
          if (roomCode && roomCode !== settings.roomCode) return;

          const existingIds = new Set(items.map((i) => i.id));
          const newItemsToAppend = incomingItems.filter((i) => !existingIds.has(i.id));

          if (newItemsToAppend.length > 0) {
            newItemsToAppend.forEach((item) => {
              if ((item.contentType === 'image' || item.contentType === 'file') && item.content) {
                savePayloadToDB(item.id, item.content);
              }
            });
            const updated = limitItemsWithPinnedProtection([...newItemsToAppend, ...items], settings.maxItems);
            set({ items: updated });
            get().showToast(`Tersinkron ${newItemsToAppend.length} riwayat room!`);
          }
        },

        deleteItem: (id) => {
          const target = get().items.find((i) => i.id === id);
          if (target && (target.contentType === 'image' || target.contentType === 'file')) {
            deletePayloadFromDB(id);
          }
          set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
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
          clearAllPayloadsDB();
          set({ items: [] });
          get().showToast('Semua item dibersihkan');
        },

        setSearchQuery: (query) => set({ searchQuery: query }),
        setActiveTab: (tab) => set({ activeTab: tab }),

        updateSettings: (newSettings) => {
          const currentRoom = get().settings.roomCode;
          const isRoomChanged = Boolean(newSettings.roomCode && newSettings.roomCode !== currentRoom);

          set((state) => ({
            settings: { ...state.settings, ...newSettings },
            // If room changed, reset items so previous room history doesn't leak!
            items: isRoomChanged ? [] : state.items,
          }));

          if (isRoomChanged && newSettings.roomCode) {
            wsClient.connect('ws://localhost:8080', get().currentDevice, newSettings.roomCode);
          }
        },

        setPairingModalOpen: (open) => set({ isPairingModalOpen: open }),
        setSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),
        setGuideModalOpen: (open) => set({ isGuideModalOpen: open }),
        setOnboardingOpen: (open) => set({ isOnboardingOpen: open }),

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
          get().showToast(`Peranti '${newDev.name}' terhubung!`);
        },

        removeDevice: (deviceId) => {
          set((state) => ({
            pairedDevices: state.pairedDevices.filter((d) => d.id !== deviceId),
          }));
          get().showToast('Peranti diputus koneksinya');
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
      };
    },
    {
      name: 'hopp_persistent_storage_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        pairedDevices: state.pairedDevices,
        settings: state.settings,
        currentDevice: state.currentDevice,
      }),
    }
  )
);
