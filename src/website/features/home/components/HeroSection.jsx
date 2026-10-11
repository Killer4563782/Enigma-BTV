import { useContent } from '../../../core/services/contentService.jsx';
import '../styles/HeroSection.css';

export default function HeroSection() {
  const { chapters, copy } = useContent();
  return (
    <div className="hero-section">
      {/* Ambient glow layers */}
      <div className="hero-glow-1" />
      <div className="hero-glow-2" />

      <div className="hero-content">
        <div className="hero-tag">✦ {copy.heroTag}</div>
        <h1 className="hero-title">
          <span className="hero-title-enigma">Enigma</span>
          <span className="hero-title-divider">|</span>
          <span className="hero-title-sub">Beyond the Void</span>
        </h1>
        <p className="hero-desc">
          {copy.heroDescription}
        </p>
        <div className="hero-actions">
          <a className="hero-btn-primary" href="/chapters/">
            {copy.exploreLabel}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>

        {/* Stats bar */}
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-value">{chapters.length}</span>
            <span className="hero-stat-label">Chapters</span>
          </div>
          <div className="hero-stat-sep" />
          <div className="hero-stat">
            <span className="hero-stat-value">{copy.maxPlayers}</span>
            <span className="hero-stat-label">Max Players</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button type="button" className="hero-scroll-hint" onClick={() => { const target = document.getElementById('announcements'); target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); target?.focus({ preventScroll: true }); }}>
        <span>{copy.scrollLabel}</span><span className="hero-scroll-arrow" aria-hidden="true">↓</span>
      </button>
    </div>
  );
}
