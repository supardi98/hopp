import { WebSocket } from 'ws';

console.log('🧪 Testing 2nd Device Connection & Real-time Clipboard Broadcast...');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('[Test Client] Connected to Hopp Server!');

  // Register 2nd Device (Android Phone)
  ws.send(
    JSON.stringify({
      type: 'REGISTER_DEVICE',
      device: {
        id: 'dev-android-test',
        name: 'Samsung Galaxy S24 (Simulated Remote Device)',
        platform: 'android',
      },
    })
  );

  // Send Remote Clipboard Copy after 1 second
  setTimeout(() => {
    console.log('[Test Client] Broadcasting remote clipboard item...');
    ws.send(
      JSON.stringify({
        type: 'SYNC_CLIPBOARD_ITEM',
        item: {
          id: `item-remote-${Date.now()}`,
          content: 'https://github.com/hopp-sync/hopp-app/releases/tag/v2.4.0-apk',
          contentType: 'url',
          senderDeviceId: 'dev-android-test',
          senderDeviceName: 'Samsung Galaxy S24 (Remote Device)',
          senderPlatform: 'android',
          timestamp: Date.now(),
          pinned: false,
          sizeBytes: 65,
        },
      })
    );

    setTimeout(() => {
      ws.close();
      console.log('✅ Test complete!');
      process.exit(0);
    }, 1000);
  }, 1000);
});

ws.on('error', (err) => {
  console.error('❌ Test client connection failed:', err);
  process.exit(1);
});
