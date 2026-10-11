import { lazy, Suspense, useEffect, useState } from 'react';
import { useReducedMotion } from './core/hooks/index.js';
import { useChapterModal } from './features/chapter/hooks/useChapterModal.js';
import { ContentProvider } from './core/services/contentService.jsx';
import AppShell from './layout/AppShell.jsx';

const ChapterModal = lazy(() => import('./features/chapter/components/ChapterModal.jsx'));
const ParticleCanvas = lazy(() => import('./features/particles/ParticleCanvas.jsx'));
export const tabUrl = tab => tab === 'home' ? '/' : `/${tab}/`;

// Each Astro route imports only its own view. Navigation releases the previous page.
export default function App({ activeTab, View }) {
  const reducedMotion = useReducedMotion();
  const { openChapter, openModal, closeModal } = useChapterModal();
  const [effectsReady, setEffectsReady] = useState(false);
  useEffect(() => {
    const syncLegacyHash = () => {
      const tab = window.location.hash.slice(1).toLowerCase();
      if (['home', 'chapters', 'qa', 'credits'].includes(tab)) window.location.replace(tabUrl(tab));
    };
    syncLegacyHash();
    window.addEventListener('hashchange', syncLegacyHash);
    const schedule = window.requestIdleCallback || (callback => window.setTimeout(callback, 200));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const id = schedule(() => setEffectsReady(true));
    return () => { cancel(id); window.removeEventListener('hashchange', syncLegacyHash); };
  }, []);
  return <ContentProvider>
    <div className="app-main">
      <Suspense fallback={null}>
        {effectsReady && !reducedMotion && !['credits', 'chapters'].includes(activeTab) && <ParticleCanvas />}
      </Suspense>
      <AppShell activeTab={activeTab}
        inChapterView={!!openChapter} onBackFromChapter={closeModal}>
        <View ready={true} onOpenChapter={openModal} />
      </AppShell>
      <Suspense fallback={<p role="status">Loading chapter…</p>}>
        {openChapter && <ChapterModal chapter={openChapter} onClose={closeModal} />}
      </Suspense>
    </div>
  </ContentProvider>;
}
