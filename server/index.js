import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT || 4077;
const MAX_PAYLOAD_MB = Number(process.env.MAX_PAYLOAD_MB || 15);
const wss = new WebSocketServer({ 
  port: Number(PORT),
  maxPayload: MAX_PAYLOAD_MB * 1024 * 1024
});

console.log(`\n==================================================`);
console.log(`🚀 Hopp Real-Time Sync Server running on port ${PORT}`);
console.log(`   WebSocket URL: ws://localhost:${PORT}`);
console.log(`   Max Payload: ${MAX_PAYLOAD_MB} MB`);
console.log(`   Multi-Room & Late-Joiner History Catch-Up: ENABLED`);
console.log(`==================================================\n`);

const clients = [];
// Store recent clipboard items per roomCode (Key: roomCode -> Array of ClipboardItems)
const roomHistories = new Map();
const MAX_ROOM_HISTORY = 20;

function sanitizeIp(ipRaw) {
  if (!ipRaw) return '127.0.0.1';
  let str = String(ipRaw).trim().replace(/^::ffff:/i, '');
  if (str === '::1' || str === '1') {
    return '127.0.0.1';
  }
  return str || '127.0.0.1';
}

function safeSend(ws, payload) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
    }
  } catch (err) {
    console.error('[WS Server] Failed to send message:', err);
  }
}

wss.on('connection', (ws, req) => {
  const forwarded = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
  const ipRaw = forwarded ? String(forwarded).split(',')[0].trim() : (req.socket.remoteAddress || '127.0.0.1');
  const ip = sanitizeIp(ipRaw);
  const session = { ws, roomCode: '', ipAddress: ip };
  clients.push(session);

  console.log(`[+] Device connected from ${ip}`);

  ws.on('error', (err) => {
    console.warn(`[!] Socket error from ${ip}:`, err.message);
  });

  ws.on('message', (messageData) => {
    try {
      const data = JSON.parse(messageData.toString());

      // 1. Device Registration / Handshake with Room Code
      if (data.type === 'REGISTER_DEVICE') {
        session.deviceId = data.device.id;
        session.deviceName = data.device.name;
        session.platform = data.device.platform;
        session.roomCode = data.roomCode || data.device.roomCode || '';

        // Broadcast updated online devices list ONLY to clients in this room
        broadcastDeviceList(session.roomCode);

        // Send Recent Room History to Late-Joiner Device!
        if (session.roomCode && roomHistories.has(session.roomCode)) {
          const historyItems = roomHistories.get(session.roomCode);
          if (historyItems && historyItems.length > 0) {
            safeSend(ws, {
              type: 'ROOM_HISTORY_SYNC',
              roomCode: session.roomCode,
              items: historyItems,
            });
          }
        }
        return;
      }

      // 2. Real-time Clipboard Item Broadcast (Isolated per Room Code + Save to Room History Cache)
      if (data.type === 'SYNC_CLIPBOARD_ITEM') {
        const targetRoom = data.roomCode || session.roomCode;
        if (!targetRoom) return;

        // Store item in Room History Buffer for late joiners
        if (!roomHistories.has(targetRoom)) {
          roomHistories.set(targetRoom, []);
        }
        const history = roomHistories.get(targetRoom);
        // Avoid duplicate items
        if (!history.some(i => i.id === data.item.id)) {
          history.unshift(data.item);
          if (history.length > MAX_ROOM_HISTORY) {
            history.pop();
          }
        }

        // Forward ONLY to connected clients in the SAME roomCode
        clients.forEach((client) => {
          if (
            client.roomCode === targetRoom &&
            client.ws !== ws &&
            client.ws.readyState === WebSocket.OPEN
          ) {
            safeSend(client.ws, {
              type: 'RECEIVE_CLIPBOARD_ITEM',
              item: data.item,
            });
          }
        });
      }

      // 2.5. WebRTC P2P Signaling Relay
      if (data.type === 'WEBRTC_SIGNAL') {
        const targetRoom = data.roomCode || session.roomCode;
        if (!targetRoom) return;

        clients.forEach((client) => {
          if (
            client.roomCode === targetRoom &&
            client.ws !== ws &&
            client.ws.readyState === WebSocket.OPEN &&
            (!data.targetDeviceId || client.deviceId === data.targetDeviceId)
          ) {
            safeSend(client.ws, {
              type: 'WEBRTC_SIGNAL',
              senderDeviceId: data.senderDeviceId || session.deviceId,
              targetDeviceId: data.targetDeviceId,
              signal: data.signal,
              roomCode: targetRoom,
            });
          }
        });
        return;
      }

      // 2.6. Remote Control Input Relay (Touchpad & Keyboard Injection)
      if (data.type === 'REMOTE_CONTROL_INPUT') {
        const targetRoom = data.roomCode || session.roomCode;
        if (!targetRoom) return;

        clients.forEach((client) => {
          if (
            client.roomCode === targetRoom &&
            client.ws !== ws &&
            client.ws.readyState === WebSocket.OPEN &&
            (!data.targetDeviceId || client.deviceId === data.targetDeviceId)
          ) {
            safeSend(client.ws, {
              action: data.action,
              dx: data.dx || 0,
              dy: data.dy || 0,
              text: data.text || '',
              key: data.key || '',
              senderDeviceId: data.senderDeviceId || session.deviceId,
              targetDeviceId: data.targetDeviceId,
              type: 'REMOTE_CONTROL_INPUT',
            });
          }
        });
        return;
      }

      // 3. Delete Clipboard Item from Room History Cache & Broadcast to Room
      if (data.type === 'DELETE_CLIPBOARD_ITEM') {
        const targetRoom = data.roomCode || session.roomCode;
        if (targetRoom && roomHistories.has(targetRoom)) {
          const history = roomHistories.get(targetRoom);
          roomHistories.set(targetRoom, history.filter(i => i.id !== data.itemId));
        }

        clients.forEach((client) => {
          if (
            client.roomCode === targetRoom &&
            client.ws !== ws &&
            client.ws.readyState === WebSocket.OPEN
          ) {
            safeSend(client.ws, {
              type: 'DELETE_CLIPBOARD_ITEM',
              itemId: data.itemId,
            });
          }
        });
      }

      // 4. Clear All Items from Room History Cache
      if (data.type === 'CLEAR_ROOM_HISTORY') {
        const targetRoom = data.roomCode || session.roomCode;
        if (targetRoom) {
          roomHistories.set(targetRoom, []);
        }

        clients.forEach((client) => {
          if (
            client.roomCode === targetRoom &&
            client.ws !== ws &&
            client.ws.readyState === WebSocket.OPEN
          ) {
            safeSend(client.ws, {
              type: 'CLEAR_ROOM_HISTORY',
            });
          }
        });
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`[-] Device disconnected (${ip})`);
    const index = clients.indexOf(session);
    if (index !== -1) clients.splice(index, 1);
    broadcastDeviceList(session.roomCode);
  });
});

function broadcastDeviceList(roomCode) {
  if (!roomCode) {
    clients.forEach((client) => {
      if (!client.roomCode && client.ws.readyState === WebSocket.OPEN && client.deviceId) {
        safeSend(client.ws, {
          type: 'DEVICE_LIST_UPDATE',
          devices: [
            {
              id: client.deviceId,
              name: client.deviceName,
              platform: client.platform,
              ipAddress: client.ipAddress || '127.0.0.1',
              status: 'online',
            },
          ],
        });
      }
    });
    return;
  }

  const seenDeviceIds = new Set();
  const roomDevices = [];

  for (const c of clients) {
    if (c.roomCode === roomCode && c.deviceId && c.ws.readyState === WebSocket.OPEN) {
      if (!seenDeviceIds.has(c.deviceId)) {
        seenDeviceIds.add(c.deviceId);
        roomDevices.push({
          id: c.deviceId,
          name: c.deviceName,
          platform: c.platform,
          ipAddress: c.ipAddress || '127.0.0.1',
          status: 'online',
        });
      }
    }
  }

  const payload = {
    type: 'DEVICE_LIST_UPDATE',
    devices: roomDevices,
  };

  clients.forEach((client) => {
    if (client.roomCode === roomCode && client.ws.readyState === WebSocket.OPEN) {
      safeSend(client.ws, payload);
    }
  });
}
