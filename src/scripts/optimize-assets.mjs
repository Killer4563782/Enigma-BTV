import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../', import.meta.url));
const publicDir = path.join(root, 'src/public');
const manifest = {};
let originalBytes = 0;
let optimizedBytes = 0;
async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    if (entry.isDirectory()) { await walk(source); continue; }
    if (!/\.(png|gif)$/i.test(entry.name)) continue;
    const relative = path.relative(publicDir, source).replaceAll('\\', '/');
    const destination = source.replace(/\.(png|gif)$/i, '.webp');
    const sourceStat = await fs.stat(source);
    const outputStat = await fs.stat(destination).catch(() => null);
    if (!outputStat || outputStat.mtimeMs < sourceStat.mtimeMs) {
      const avatar = relative.includes('/Teammembers/');
      const limit = avatar ? 256 : 1600;
      await sharp(source, { animated: /\.gif$/i.test(source) })
        .resize({ width: limit, height: limit, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 }).toFile(destination);
    }
    manifest[`/${relative}`] = `/${relative.replace(/\.(png|gif)$/i, '.webp')}`;
    originalBytes += sourceStat.size;
    optimizedBytes += (await fs.stat(destination)).size;
  }
}
await walk(path.join(publicDir, 'assets'));
await fs.writeFile(path.join(root, 'src/website/data/asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Bundled images: ${(originalBytes / 1048576).toFixed(2)} MiB → ${(optimizedBytes / 1048576).toFixed(2)} MiB. Originals retained.`);
