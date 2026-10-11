import { preview } from 'vite';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { workspaceRoutes } from './workspace-routes.mjs';

// Astro's static preview does not apply deployment rewrites. Vite's static
// preview lets us apply the same workspace fallback as development and Vercel.
const { values } = parseArgs({ options: { host: { type: 'string', default: '127.0.0.1' }, port: { type: 'string', default: '4321' } } });
const server = await preview({
  configFile: false,
  root: fileURLToPath(new URL('../../', import.meta.url)),
  appType: 'mpa',
  build: { outDir: 'dist' },
  plugins: [workspaceRoutes],
  preview: { host: values.host, port: Number(values.port), strictPort: true },
});
server.printUrls();
