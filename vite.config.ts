import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createChatHandler } from './server/chat-endpoint.mjs';

const geminiPreviewApi: Plugin = {
  name: 'axis-gemini-preview-api',
  configureServer(server) {
    server.middlewares.use('/api/chat', createChatHandler());
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api/chat', createChatHandler());
  },
};

export default defineConfig({
  plugins: [react(), geminiPreviewApi],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
});
