import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { workspaceRoutes } from './src/scripts/workspace-routes.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const apiUrl = loadEnv(process.env.NODE_ENV || 'development', root, 'VITE_').VITE_API_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://enigma-btv-backend.vercel.app'
    : 'http://localhost:3001');

export default defineConfig({
  output: 'static',
  publicDir: './src/public',
  integrations: [react()],
  vite: {
    plugins: [workspaceRoutes],
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl) },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src/taskboard', import.meta.url)),
        '@enigma/session': fileURLToPath(new URL('./src/shared/session.ts', import.meta.url)),
      },
      dedupe: ['react', 'react-dom'],
    },
  },
});
