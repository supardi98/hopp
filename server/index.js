import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT || 8080;
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

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress || 'unknown';
  const session = { ws, roomCode: '' };
  clients.push(session);

  console.log(`[+] Device connected from ${ip}`);

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
            ws.send(
              JSON.stringify({
                type: 'ROOM_HISTORY_SYNC',
                roomCode: session.roomCode,
                items: historyItems,
              })
            );
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
            client.ws.send(
              JSON.stringify({
                type: 'RECEIVE_CLIPBOARD_ITEM',
                item: data.item,
              })
            );
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
  if (!roomCode) return;

  const roomDevices = clients
    .filter((c) => c.roomCode === roomCode && c.deviceId)
    .map((c) => ({
      id: c.deviceId,
      name: c.deviceName,
      platform: c.platform,
      status: 'online',
    }));

  const payload = JSON.stringify({
    type: 'DEVICE_LIST_UPDATE',
    devices: roomDevices,
  });

  clients.forEach((client) => {
    if (client.roomCode === roomCode && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  });
}
