import { createContext, useContext, useEffect, useState } from 'react';
import defaults from '../../data/site-content.json';
import { publicAsset } from './assets.js';

export const publicContent = content => ({
  ...content,
  chapters: content.chapters.filter(item => item.published).map(item => ({
    ...item, image: publicAsset(item.image), screenshots: item.screenshots.map(publicAsset),
  })),
  team: content.team.map(item => ({ ...item, avatar: publicAsset(item.avatar) })),
  announcements: content.announcements.filter(item => item.published),
  qa: content.qa.filter(item => item.published),
});

const fallback = publicContent(defaults);
const ContentContext = createContext(fallback);
const origin = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export function ContentProvider({ children }) {
  const [content, setContent] = useState(fallback);
  useEffect(() => {
    let controller;
    let active = true;
    let pending = false;
    let lastRefresh = 0;
    let signature = JSON.stringify(fallback);
    const refresh = async () => {
      if (pending || Date.now() - lastRefresh < 15000) return;
      pending = true;
      const requestController = new AbortController();
      controller = requestController;
      const timeout = setTimeout(() => requestController.abort(), 10000);
      try {
        const response = await fetch(`${origin}/api/admin/content/public`, { signal: requestController.signal });
        if (!response.ok) return;
        const result = await response.json();
        if (active && result.content?.version === 1) {
          const next = publicContent(result.content);
          const nextSignature = JSON.stringify(next);
          if (nextSignature !== signature) { signature = nextSignature; setContent(next); }
        }
      } catch { /* Bundled public content remains usable during an outage. */ }
      finally { lastRefresh = Date.now(); pending = false; clearTimeout(timeout); }
    };
    const onFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    window.addEventListener('focus', onFocus);
    return () => { active = false; controller?.abort(); window.removeEventListener('focus', onFocus); };
  }, []);
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
