import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ChapterInfo,
  TrailerSection,
  Screenshots,
} from './tabs/index.js';
import './ChapterModal.css';
import { useContent } from '../../../core/services/contentService.jsx';
import ChapterBgEffect from './ChapterBgEffect.jsx';

const TABS = [
  { id: 'info', label: 'Overview', mark: '01' },
  { id: 'trailer', label: 'Trailer', mark: '02' },
  { id: 'screenshots', label: 'Gallery', mark: '03' },
];
const TAB_CONTENT = {
  trailer: TrailerSection,
  screenshots: Screenshots,
};

export default function ChapterModal({ chapter: selectedChapter, onClose }) {
  const { copy, chapters } = useContent();
  const currentChapter = chapters.find(item => item.id === selectedChapter.id && item.status === 'available');
  const chapter = currentChapter || selectedChapter;
  useEffect(() => { if (!currentChapter) onClose(); }, [currentChapter, onClose]);
  const [activeTab, setActiveTab] = useState('info');
  const [atmospherePaused, setAtmospherePaused] = useState(false);
  const dialogRef = useRef(null);
  const scrollRef = useRef(null);
  const heroRef = useRef(null);
  const tabRefs = useRef({});
  const Content = TAB_CONTENT[activeTab];

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    scrollRef.current.scrollTop =
      activeTab === 'info' ? 0 : heroRef.current.offsetHeight;
  }, [activeTab]);

  const selectTab = (id, focus = false) => {
    setActiveTab(id);
    if (focus) {
      tabRefs.current[id]?.focus({ preventScroll: true });
      tabRefs.current[id]?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    }
  };

  const handleTabKey = (event, index) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    if (event.key === 'ArrowLeft')
      next = (index + TABS.length - 1) % TABS.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = TABS.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectTab(TABS[next].id, true);
  };

  return (
    <dialog
      ref={dialogRef}
      className="cv-overlay"
      aria-labelledby="chapter-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="cv-panel"
        data-atmosphere={atmospherePaused ? 'paused' : 'playing'}
        style={{
          '--card-color': chapter.cardColor || chapter.color,
          '--ch-color': chapter.color || '#6f00ff',
          '--ch-accent': chapter.accentColor || chapter.color || '#cc77ff',
        }}
      >
        <ChapterBgEffect />
        <header className="cv-toolbar">
          <div className="cv-journal">
            <span aria-hidden="true">✦</span> Enigma{' '}
            <span className="cv-journal-divider">/</span>{' '}
            <span>Beyond the veil</span>
          </div>
          <div className="cv-toolbar-actions">
            <button
              type="button"
              className="cv-motion-btn"
              aria-label="Pause atmosphere"
              aria-pressed={atmospherePaused}
              title={
                atmospherePaused ? 'Resume atmosphere' : 'Pause atmosphere'
              }
              onClick={() => setAtmospherePaused((value) => !value)}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                aria-hidden="true"
              >
                {atmospherePaused ? (
                  <path d="m9 5 10 7-10 7Z" />
                ) : (
                  <>
                    <path d="M9 5v14M15 5v14" />
                    <circle cx="12" cy="12" r="10" opacity=".4" />
                  </>
                )}
              </svg>
            </button>
            <button
              type="button"
              className="cv-close-btn"
              onClick={onClose}
              autoFocus
            >
              <span>Back to chapters</span>
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </header>
        <div className="cv-scroll" ref={scrollRef}>
          <div className="cv-hero" ref={heroRef}>
            <img className="cv-cover" src={chapter.image} alt="" />
            <div className="cv-hero-overlay" />
            <div className="cv-seal" aria-hidden="true">
              <svg className="cv-seal-orbit" viewBox="0 0 300 300" fill="none">
                <circle
                  cx="150"
                  cy="150"
                  r="142"
                  stroke="currentColor"
                  strokeOpacity=".3"
                />
                <circle
                  cx="150"
                  cy="150"
                  r="130"
                  stroke="currentColor"
                  strokeDasharray="1 10"
                  strokeOpacity=".5"
                />
                <path
                  d="M150 16 284 150 150 284 16 150Z"
                  stroke="currentColor"
                  strokeOpacity=".35"
                />
                <path
                  d="M150 8v16M150 276v16M8 150h16M276 150h16"
                  stroke="currentColor"
                />
                <circle cx="150" cy="8" r="3" fill="currentColor" />
                <circle cx="150" cy="292" r="3" fill="currentColor" />
              </svg>
              <div className="cv-seal-core">
                <span>✦</span>
                <strong>{chapter.number}</strong>
                <span>ENIGMA</span>
              </div>
            </div>
            <div className="cv-hero-text">
              <div className="cv-eyebrow">
                <span className="cv-chapter-label">{chapter.subtitle}</span>
                <span className="cv-status" data-status={chapter.status}>
                  {chapter.status === 'available'
                    ? 'Available now'
                    : 'Coming soon'}
                </span>
              </div>
              <h2 id="chapter-title" className="cv-title">
                {chapter.title}
              </h2>
              <div className="cv-title-rule" aria-hidden="true">
                <span />✧<span />
              </div>
              {chapter.description && (
                <p className="cv-description">{chapter.description}</p>
              )}
              <div className="cv-hero-meta">
                {copy.chapterMeta.split(' · ').map(item => <span key={item}>{item}</span>)}
              </div>
            </div>
          </div>
          <div
            className="cv-navigation"
            role="tablist"
            aria-label="Chapter sections"
          >
            {TABS.map((tab, index) => (
              <button
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[tab.id] = element;
                }}
                type="button"
                role="tab"
                id={`chapter-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls="chapter-tabpanel"
                tabIndex={activeTab === tab.id ? 0 : -1}
                className={`cv-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(event) => handleTabKey(event, index)}
              >
                <span className="cv-tab-mark" aria-hidden="true">
                  {tab.mark}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
          <div
            className="cv-content"
            data-section={activeTab}
            id="chapter-tabpanel"
            role="tabpanel"
            aria-labelledby={`chapter-tab-${activeTab}`}
            tabIndex={0}
            key={activeTab}
          >
            {activeTab === 'info' ? (
              <ChapterInfo
                chapter={chapter}
                onNavigate={(id) => selectTab(id, true)}
              />
            ) : (
              <Content chapter={chapter} />
            )}
          </div>
          <footer className="cv-footer">
            <span>Enigma · Beyond the Void</span>
            <span>
              Chapter {chapter.number} <span aria-hidden="true">✦</span>
            </span>
          </footer>
        </div>
      </div>
    </dialog>
  );
}
