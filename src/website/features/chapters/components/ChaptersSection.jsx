'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDown, LockKeyhole, Check, Map as MapIcon } from 'lucide-react';
import { useContent } from '../../../core/services/contentService.jsx';
import '../styles/ChaptersSection.css';
import { useChapterJourneyScroll } from '../hooks/useChapterJourneyScroll.js';

const stopId = chapter => `chapter-road-stop-${chapter.id}`;
const roadLight = chapter => chapter?.status === 'available' ? chapter.accentColor || '#b8a2d4' : '#a68cc5';
const dimensionTone = chapter => chapter?.status !== 'available' ? '#150c22'
  : chapter.theme === 'void' ? '#230c08' : '#081322';
const worldName = chapter => chapter.status !== 'available' ? 'Beyond the known world'
  : chapter.theme === 'fragment' ? 'The Overworld' : chapter.theme === 'void' ? 'The Nether' : 'A world beyond';

export default function ChaptersSection({ onOpenChapter }) {
  const { chapters } = useContent();
  const sectionRef = useRef(null);
  const [activeId, setActiveId] = useState(chapters[0]?.id);
  const [replay, setReplay] = useState(0);
  const availableCount = chapters.filter(chapter => chapter.status === 'available').length;
  const chapterIds = chapters.map(chapter => chapter.id).join('|');
  const travelRef = useChapterJourneyScroll(sectionRef, chapterIds);
  const activeChapter = chapters.find(chapter => chapter.id === activeId) || chapters[0];
  const entranceChapter = chapters.find(chapter => chapter.status === 'available') || chapters[0];
  const entrancePaintId = `chapter-entrance-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    document.documentElement.classList.add('chapter-scroll-journey');
    return () => document.documentElement.classList.remove('chapter-scroll-journey');
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !('IntersectionObserver' in window)) return;
    const visible = new Map();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          visible.set(entry.target.dataset.chapterId, entry.intersectionRatio);
        } else visible.delete(entry.target.dataset.chapterId);
      }
      const leading = [...visible].sort((a, b) => b[1] - a[1])[0];
      setActiveId(leading?.[0] ?? null);
    }, { rootMargin: '-15% 0px -30% 0px', threshold: [0, 0.15, 0.4, 0.7] });
    section.querySelectorAll('[data-chapter-id]').forEach(scene => observer.observe(scene));
    return () => observer.disconnect();
  }, [chapterIds]);

  const navigateTo = (event, chapter) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destination = document.getElementById(stopId(chapter));
    if (destination && travelRef.current) {
      event.preventDefault();
      history.replaceState(history.state, '', `#${stopId(chapter)}`);
      travelRef.current(destination);
    }
    setReplay(value => value + 1);
    // The anchor performs the scroll. Focus stays attached to the destination.
    document.getElementById(`${stopId(chapter)}-title`)?.focus({ preventScroll: true });
  };

  return (
    <section ref={sectionRef} className="chapters-section" aria-labelledby="chapters-heading"
      style={{ '--world-light': activeChapter?.status === 'available' ? activeChapter.accentColor || activeChapter.color : '#a68cc5' }}>
      <header className="chapter-road-header">
        <div className="chapter-intro-world" aria-hidden="true">
          {entranceChapter?.image && <img src={entranceChapter.image} alt="" width="800" height="640" decoding="async" />}
        </div>
        <div className="chapter-intro-route" aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              {[['bed', 14, '#100c1b'], ['edge', 45, '#30253c']].map(([layer, strength, base]) =>
                <linearGradient key={layer} id={`${entrancePaintId}-${layer}`} gradientUnits="userSpaceOnUse" x1="0" y1="45" x2="0" y2="100">
                  <stop offset="0%" style={{ stopColor: `color-mix(in srgb, #c7a9dc ${strength}%, ${base})` }} />
                  <stop offset="100%" style={{ stopColor: `color-mix(in srgb, ${roadLight(chapters[0])} ${strength}%, ${base})` }} />
                </linearGradient>)}
            </defs>
            <path className="chapter-intro-route-bed" style={{ stroke: `url(#${entrancePaintId}-bed)` }} d="M85 45 C85 82 50 70 50 100" />
            <path className="chapter-intro-route-edge" style={{ stroke: `url(#${entrancePaintId}-edge)` }} d="M85 45 C85 82 50 70 50 100" />
            <path className="chapter-intro-route-center" d="M85 45 C85 82 50 70 50 100" />
            <path className="chapter-intro-route-signal" pathLength="100" d="M85 45 C85 82 50 70 50 100" />
          </svg>
        </div>
        <div className="chapter-intro-copy">
          <h1 id="chapters-heading">The Road <span>Beyond</span></h1>
          <p>Across the Void, every chapter opens a different world. Choose your passage.</p>
          {entranceChapter && <a className="chapter-intro-enter" href={`#${stopId(entranceChapter)}`}
            onClick={event => navigateTo(event, entranceChapter)}>
            Enter the journey <ArrowDown size={18} strokeWidth={1.5} aria-hidden="true" />
          </a>}
        </div>
      </header>

      {chapters.length ? <div className="chapter-road-layout">
        <nav className="chapter-index" aria-label="Chapter roadmap">
          <div className="chapter-index-summary">
            <MapIcon size={18} strokeWidth={1.5} aria-hidden="true" />
            <span>{availableCount} of {chapters.length} chapters available</span>
          </div>
          <ol>
            {chapters.map(chapter => {
              const available = chapter.status === 'available';
              return <li key={chapter.id}>
                <a href={`#${stopId(chapter)}`} onClick={event => navigateTo(event, chapter)}
                  aria-current={activeId === chapter.id ? 'location' : undefined}>
                  <span className="chapter-index-number">{chapter.number}</span>
                  <span className="chapter-index-label">
                    {available ? chapter.title : chapter.title === 'Unknown' ? 'Uncharted chapter' : chapter.title}
                    <small>{available ? 'Available now' : 'Coming soon'}</small>
                  </span>
                </a>
              </li>;
            })}
          </ol>
        </nav>

        <div className="chapter-journey">
          {chapters.map((chapter, index) => <ChapterStop key={chapter.id} chapter={chapter} index={index}
            previous={chapters[index - 1]} next={chapters[index + 1]}
            first={index === 0} active={activeId === chapter.id} replay={replay} onOpen={() => onOpenChapter(chapter)} />)}
          <p className="chapter-road-end">The story continues.</p>
        </div>
      </div> : <p className="chapter-road-empty">New chapters are on their way. Check back soon.</p>}
    </section>
  );
}

function ChapterStop({ chapter, previous, next, index, first, active, replay, onOpen }) {
  const available = chapter.status === 'available';
  const id = stopId(chapter);
  const sceneRef = useRef(null);
  const paintId = `chapter-road-${useId().replace(/:/g, '')}`;
  const light = roadLight(chapter);
  // Both halves of a join meet at the same 50/50 color. Keep the chapter's
  // own color through the middle, blending only near its road endpoints.
  const roadStops = [
    ['0%', `color-mix(in srgb, ${roadLight(previous || chapter)} 50%, ${light})`],
    ['18%', light], ['82%', light],
    ['100%', `color-mix(in srgb, ${light} 50%, ${roadLight(next || chapter)})`],
  ];
  // Tangents align at scene boundaries; the bend opens a generous space for each world.
  const route = index % 2
    ? 'M50 0 C50 5 92 3 92 12 L92 88 C92 97 50 95 50 100'
    : 'M50 0 C50 5 8 3 8 12 L8 88 C8 97 50 95 50 100';

  useEffect(() => {
    if (!active) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) return;
    const scene = sceneRef.current;
    const animations = [];
    const animate = (selector, frames, options) => {
      const target = scene?.querySelector(selector);
      if (target?.animate) animations.push(target.animate(frames, options));
    };
    // A finite three-pass signal gives the journey time to read without perpetual work.
    animate('.chapter-road-signal', [
      { strokeDashoffset: '12', opacity: 0, offset: 0 },
      { strokeDashoffset: '-5', opacity: 1, offset: .12 },
      { strokeDashoffset: '-88', opacity: 1, offset: .85 },
      { strokeDashoffset: '-100', opacity: 0, offset: 1 },
    ], { duration: 2800, iterations: 3, easing: 'linear' });
    animate('.chapter-stop-content', [
      { opacity: .6, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateX(0) translateY(0)' },
    ], { duration: 1000, easing: 'cubic-bezier(.16,1,.3,1)' });
    animate('.chapter-milestone-halo', [
      { opacity: 0, transform: 'scale(.8)' },
      { opacity: .8, transform: 'scale(1)', offset: .25 },
      { opacity: 0, transform: 'scale(1.8)' },
    ], { duration: 2800, delay: 700, iterations: 3, easing: 'ease-out' });
    const cancel = () => animations.forEach(animation => animation.cancel());
    preference.addEventListener('change', cancel);
    return () => { cancel(); preference.removeEventListener('change', cancel); };
  }, [active, replay, index]);

  return <article ref={sceneRef} id={id} data-chapter-id={chapter.id} aria-labelledby={`${id}-title`}
    className={`chapter-scene chapter-theme--${available ? chapter.theme === 'void' ? 'ember' : 'overworld' : 'void'}${available ? ' chapter-scene--available' : ' chapter-scene--sealed'}${active ? ' is-active' : ''}${index % 2 ? ' chapter-scene--right' : ' chapter-scene--left'}`}
    style={{ '--chapter-light': light, '--chapter-color': available ? chapter.color || '#74578f' : '#34213e', '--chapter-image': available ? `url("${chapter.image}")` : 'none',
      '--dimension-tone': dimensionTone(chapter),
      '--dimension-entry': previous ? `color-mix(in srgb, ${dimensionTone(previous)} 50%, ${dimensionTone(chapter)})` : '#080610',
      '--dimension-exit': next ? `color-mix(in srgb, ${dimensionTone(chapter)} 50%, ${dimensionTone(next)})` : '#080610' }}>
    <div className="chapter-landscape" aria-hidden="true" />
    <div className="chapter-atmosphere" aria-hidden="true" />
    <div className="chapter-dimension-landmark" aria-hidden="true"><i /><i /><i /></div>
    <div className="chapter-dimension-ground" aria-hidden="true" />
    <div className="chapter-road-ribbon" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ '--road-bed-paint': `url(#${paintId}-bed)`, '--road-edge-paint': `url(#${paintId}-edge)`, '--road-markings-paint': `url(#${paintId}-markings)` }}>
        <defs>
          {[['bed', 14, '#100c1b'], ['edge', 45, '#30253c'], ['markings', 100, '#000000']].map(([layer, strength, base]) =>
            <linearGradient key={layer} id={`${paintId}-${layer}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
              {roadStops.map(([offset, color]) => <stop key={offset} offset={offset}
                style={{ stopColor: strength === 100 ? color : `color-mix(in srgb, ${color} ${strength}%, ${base})` }} />)}
            </linearGradient>)}
        </defs>
        <path className="chapter-road-shadow" d={route} />
        <path className="chapter-road-bed" d={route} />
        <path className="chapter-road-edge" d={route} />
        <path className="chapter-road-center" d={route} />
        <path className="chapter-road-markings" pathLength="100" d={route} />
        <path className="chapter-road-signal" pathLength="100" d={route} />
      </svg>
    </div>
    <span className="chapter-milestone" aria-hidden="true"><span className="chapter-milestone-halo" /><span>{chapter.number}</span></span>
    {available ? <div className="chapter-stop-content chapter-destination">
      <div className="chapter-artwork">
        <img src={chapter.image} alt="" width="800" height="640" loading={first ? 'eager' : 'lazy'}
          fetchPriority={first ? 'high' : 'auto'} decoding="async" />
      </div>
      <div className="chapter-story">
        <span className="chapter-story-number">{chapter.subtitle || `Chapter ${chapter.number}`}</span>
        <span className="chapter-world-name">{worldName(chapter)}</span>
        <span className="chapter-availability"><Check size={15} strokeWidth={1.5} aria-hidden="true" />Available now</span>
        <h2 id={`${id}-title`} tabIndex={-1}>{chapter.title}</h2>
        <p>{chapter.description}</p>
        {chapter.roadmapText && <p className="chapter-story-note">{chapter.roadmapText}</p>}
        <button type="button" className="chapter-explore" onClick={onOpen}
          aria-label={`Explore ${chapter.subtitle}: ${chapter.title}`}>
          Explore chapter <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div> : <div className="chapter-stop-content chapter-unrevealed">
      <div>
        <span className="chapter-story-number">{chapter.subtitle || `Chapter ${chapter.number}`}</span>
        <span className="chapter-world-name">{worldName(chapter)}</span>
        <h2 id={`${id}-title`} tabIndex={-1}>{chapter.title === 'Unknown' ? 'An uncharted world' : chapter.title}</h2>
        <p>{chapter.roadmapText || 'This chapter is yet to be revealed.'}</p>
      </div>
      <span className="chapter-coming-soon"><LockKeyhole size={16} strokeWidth={1.5} aria-hidden="true" />Coming soon</span>
    </div>}
  </article>;
}
