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
            try {
              serverProcess.kill();
            } catch (e) {}
            serverProcess = null;
          }
        };

        process.on('exit', cleanup);
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
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
          proxy.on('error', (_err, _req, _res) => {
            // Silently ignore initial startup ECONNREFUSED before server finishes starting
          });
        },
      },
    },
  },
})
