import manifest from '../../data/asset-manifest.json';

// Original content uses relative paths. Root them for Astro's nested page URLs.
export function publicAsset(value) {
  if (typeof value !== 'string') return value;
  const rooted = value.startsWith('assets/') ? `/${value}` : value;
  return manifest[rooted] || rooted;
}
