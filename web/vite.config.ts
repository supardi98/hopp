import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn } from 'child_process'
import path from 'path'

function nodeServerPlugin() {
  let serverProcess: any = null;
  return {
    name: 'node-server-plugin',
    configureServer() {
      if (!serverProcess) {
        const serverPath = path.resolve(import.meta.dirname || '.', '../server/index.js');
        serverProcess = spawn('node', [serverPath], {
          stdio: 'inherit',
          env: process.env,
        });

        const cleanup = () => {
          if (serverProcess) {
            try { serverProcess.kill(); } catch (e) {}
            serverProcess = null;
          }
        };

        // 'exit' covers all normal exits (including Ctrl+C after Vite handles SIGINT)
        process.on('exit', cleanup);
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodeServerPlugin(),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:8080',
        ws: true,
        changeOrigin: true,
        xfwd: true, // Pass X-Forwarded-For header containing client IP
        rewrite: (path) => path.replace(/^\/ws/, ''),
        configure: (proxy) => {
          proxy.on('error', (err: Error, _req, _res) => {
            // Suppress expected connection errors:
            // - ECONNREFUSED: server not ready yet on startup
            // - ECONNRESET: client (e.g. Safari/mobile) closed connection abruptly without WS close frame
            if (err.message.includes('ECONNREFUSED') || err.message.includes('ECONNRESET')) return;
            console.error('[ws proxy error]', err.message);
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (proxy as any).on('proxyReqWsError', (err: Error) => {
            if (err.message.includes('ECONNRESET')) return;
            console.error('[ws proxy req error]', err.message);
          });
        },
      },
    },
  },
})
