import { useId, useState } from 'react';
import { useContent } from '../../../core/services/contentService.jsx';
import '../styles/HomeSection.css';

const PARTICLES = [
  { left: '12%', delay: '0s', duration: '11s' },
  { left: '29%', delay: '3s', duration: '14s' },
  { left: '46%', delay: '6s', duration: '10s' },
  { left: '60%', delay: '1.5s', duration: '13s' },
  { left: '75%', delay: '8s', duration: '12s' },
  { left: '88%', delay: '4.5s', duration: '15s' },
];

function formatDate(value) {
  return new Date(value + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeSection() {
  const { announcements, copy } = useContent();

  return (
    <section
      id="announcements"
      className="page-section home-section"
      aria-labelledby="announcements-heading"
      tabIndex="-1"
    >
      <AnnouncementsHeading
        title={copy.announcementsTitle}
        subtitle={copy.announcementsSubtitle}
      />

      <div className="void-transmissions">
        {announcements.map(item => (
          <VoidTransmission key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function AnnouncementsHeading({ title, subtitle }) {
  return (
    <div className="announcements-title-block">
      <div className="atb-deco" aria-hidden="true">
        <span className="atb-line" />
        <span className="atb-sigil">◇</span>
        <span className="atb-sigil atb-sigil--main">◈</span>
        <span className="atb-sigil">◇</span>
        <span className="atb-line" />
      </div>

      <div className="atb-heading-wrap">
        <h2
          id="announcements-heading"
          className="announcements-heading"
          data-glitch={title}
        >
          {title}
        </h2>
        <div className="atb-scan-beam" aria-hidden="true" />
      </div>

      <div className="atb-sub-row" aria-hidden="true">
        <span className="atb-sub-pip" />
        <span className="atb-sub-text">{subtitle}</span>
        <span className="atb-sub-pip" />
      </div>
    </div>
  );
}

function VoidTransmission({ item }) {
  const [expanded, setExpanded] = useState(false);
  const idBase = useId().replaceAll(':', '');
  const gradientId = idBase + '-crack-gradient';
  const glowId = idBase + '-crack-glow';
  const isLong = item.content.length > 180;
  const preview = isLong && !expanded
    ? item.content.slice(0, 180).trim() + '…'
    : item.content;

  return (
    <article className="void-transmission">
      <div className="vt-ambient" aria-hidden="true" />

      <svg
        className="vt-cracks"
        viewBox="0 0 420 320"
        preserveAspectRatio="xMaxYMid meet"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
            <stop offset="35%" stopColor="#9333ea" stopOpacity="0.55" />
            <stop offset="65%" stopColor="#7e22ce" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          className="vt-crack vt-crack-1"
          d="M 210 0 L 200 55 L 225 105 L 195 165 L 218 220 L 205 280 L 210 320"
          stroke={'url(#' + gradientId + ')'}
          strokeWidth="1.2"
          fill="none"
          filter={'url(#' + glowId + ')'}
        />
        <path className="vt-crack vt-crack-2" d="M 200 55 L 145 82 L 112 76" stroke={'url(#' + gradientId + ')'} strokeWidth="0.7" fill="none" />
        <path className="vt-crack vt-crack-2" d="M 225 105 L 285 118 L 320 110" stroke={'url(#' + gradientId + ')'} strokeWidth="0.6" fill="none" />
        <path className="vt-crack vt-crack-3" d="M 195 165 L 138 180 L 110 195 L 88 188" stroke={'url(#' + gradientId + ')'} strokeWidth="0.55" fill="none" />
        <path className="vt-crack vt-crack-3" d="M 218 220 L 272 234 L 305 248" stroke={'url(#' + gradientId + ')'} strokeWidth="0.5" fill="none" />
        <path className="vt-crack vt-crack-4" d="M 340 40 L 330 90 L 355 140 L 340 200" stroke="#7e22ce" strokeWidth="0.5" fill="none" opacity="0.25" />
        <circle className="vt-orb-dot" cx="210" cy="2" r="2.5" fill="#c084fc" />
      </svg>

      <div className="vt-particles" aria-hidden="true">
        {PARTICLES.map((particle, index) => (
          <span
            key={index}
            className="vt-particle"
            style={{
              left: particle.left,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

      <div className="vt-body">
        <div className="vt-tag">
          <span className="vt-tag-pip" />
          <span className="vt-tag-text">{item.epicTag}</span>
          <span className="vt-tag-line" />
        </div>

        <time className="vt-date" dateTime={item.date}>{formatDate(item.date)}</time>
        <h3 className="vt-title">{item.title}</h3>

        <div className="vt-sep" aria-hidden="true">
          <span className="vt-sep-rune">◈</span>
          <span className="vt-sep-rune">◈</span>
          <span className="vt-sep-rune">◈</span>
        </div>

        <p className="vt-content">{preview}</p>

        {isLong && (
          <button
            type="button"
            className="vt-expand"
            aria-expanded={expanded}
            onClick={() => setExpanded(value => !value)}
          >
            {expanded ? '▲ Conceal' : '▼ Uncover the truth'}
          </button>
        )}
      </div>

      <div className="vt-left-line" aria-hidden="true" />
    </article>
  );
}
