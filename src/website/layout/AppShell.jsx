import Nav from '../features/navigation/components/Nav.jsx';

/**
 * Shared navigation and main area for each Astro page.
 */
export default function AppShell({
  activeTab,
  inChapterView,
  onBackFromChapter,
  children,
}) {
  const noTopPad = activeTab === 'home';

  return (
    <>
      <Nav
        activeTab={activeTab}
        inChapterView={inChapterView}
        onBackFromChapter={onBackFromChapter}
      />
      <main style={{ paddingTop: noTopPad ? '0' : '60px' }}>
        {children}
      </main>
    </>
  );
}
