import { useState } from 'react';
import { useScrolled } from '../../../core/hooks/index.js';
import { NAV_TABS } from '../config/navTabs.jsx';
import './Nav.css';

export default function Nav({ activeTab, inChapterView, onBackFromChapter }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled(20);

  return (
    <nav className={`main-nav${scrolled ? ' scrolled' : ''}`}>
      <div className="nav-inner">

        {/* Logo */}
        <div className="nav-logo">
          <span className="nav-logo-symbol">✦</span>
          <div className="nav-logo-text-wrap">
            <span className="nav-logo-text">Enigma</span>
            <span className="nav-logo-sub">Beyond the Void</span>
          </div>
        </div>

        {/* Desktop: tabs or back-button */}
        {inChapterView ? (
          <button className="nav-back-btn" onClick={onBackFromChapter}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to Site
          </button>
        ) : (
          <div className="nav-tabs">
            {NAV_TABS.map(tab => (
              <a
                key={tab.id}
                className={`nav-tab${activeTab === tab.id ? ' active' : ''}`}
                href={tab.id === 'home' ? '/' : `/${tab.id}/`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </a>
            ))}
          </div>
        )}

        {/* Mobile hamburger */}
        {!inChapterView && (
          <button
            className={`nav-hamburger${menuOpen ? ' open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            <span /><span /><span />
          </button>
        )}
      </div>

      {/* Mobile dropdown */}
      {menuOpen && !inChapterView && (
        <div id="mobile-navigation" className={`nav-mobile-menu${menuOpen ? ' open' : ''}`}>
          {NAV_TABS.map(tab => (
            <a
              key={tab.id}
              className={`nav-mobile-tab${activeTab === tab.id ? ' active' : ''}`}
              href={tab.id === 'home' ? '/' : `/${tab.id}/`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
