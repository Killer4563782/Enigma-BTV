import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { memberColor } from '../../../data/credits.js';
import { useContent } from '../../../core/services/contentService.jsx';
import ConstellationMap from './ConstellationMap.jsx';
import '../styles/CreditsSection.css';

const PAGE_SIZE = 6;
const FILTERS = [
  { id: 'all', label: 'Everyone', matches: () => true },
  { id: 'core', label: 'Team', matches: member => member.isCore },
  { id: 'development', label: 'Developers', matches: member => member.disciplines.includes('development') },
  { id: 'contributors', label: 'Contributors', matches: member => !member.isCore },
];

export default function CreditsSection({ ready = true }) {
  const { team: CREDITS, copy } = useContent();
  const [view, setView] = useState('constellation');
  const [motionPaused, setMotionPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [selectedMember, setSelectedMember] = useState(null);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    const change = event => setReducedMotion(event.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  const findPerson = () => {
    setView('directory');
    requestAnimationFrame(() => searchRef.current?.focus());
  };
  const coreTeam = CREDITS.filter(member => member.isCore);
  const activeFilter = FILTERS.find(item => item.id === filter);
  const search = query.trim().toLowerCase();
  // The team already has a spotlight above; introduce the wider group first.
  const matchingMembers = CREDITS.filter(member => (
    activeFilter.matches(member) &&
    [member.name, member.role, member.description, ...member.disciplines]
      .join(' ').toLowerCase().includes(search)
  )).sort((a, b) => Number(a.isCore) - Number(b.isCore));
  const pageCount = Math.ceil(matchingMembers.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const visibleMembers = matchingMembers.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const openProfile = (member, event) => {
    triggerRef.current = event.currentTarget;
    setSelectedMember(member);
  };

  const changePage = nextPage => {
    setPage(nextPage);
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
  };

  const resetSearch = () => {
    setQuery('');
    setFilter('all');
    setPage(0);
    searchRef.current?.focus();
  };

  return (
    <section className="page-section credits-section credits-section--cosmic" aria-labelledby="credits-title" data-motion-paused={motionPaused || reducedMotion}>
      <header className="credits-intro">
        <div className="credits-intro-copy">
          <p className="credits-eyebrow"><span aria-hidden="true">✦</span> {copy.teamEyebrow}</p>
          <h1 id="credits-title">{copy.teamTitle}</h1>
          <p className="credits-lede">{copy.teamDescription}</p>
        </div>
        <div className="credits-view-switch" role="group" aria-label="People view">
          <button type="button" aria-pressed={view === 'constellation'} onClick={() => setView('constellation')}><span aria-hidden="true">✧</span> Constellation</button>
          <button type="button" aria-pressed={view === 'directory'} onClick={() => setView('directory')}><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" aria-hidden="true"><path d="M6 4h10M6 9h10M6 14h10M1 4h2M1 9h2M1 14h2" /></svg> Directory</button>
        </div>
      </header>

      {view === 'constellation' ? (
        <ConstellationMap members={CREDITS} onOpenProfile={openProfile} paused={motionPaused || Boolean(selectedMember)} reducedMotion={reducedMotion} onToggleMotion={() => setMotionPaused(value => !value)} onFindPerson={findPerson} ready={ready} />
      ) : <>
      {coreTeam.length > 0 && (
        <section className="credits-core" aria-labelledby="credits-core-title">
          <div className="credits-section-label">
            <h2 id="credits-core-title"><span aria-hidden="true">01 /</span> Team</h2>
            <span className="credits-section-caption">The vision. The craft. The people behind it.</span>
          </div>
          <div className="credits-core-grid">
            {coreTeam.map((member, index) => (
              <button
                type="button"
                className="credits-core-card"
                key={member.name}
                style={{ '--role-color': memberColor(member), '--entry-order': index }}
                onClick={event => openProfile(member, event)}
                aria-label={`View ${member.name}'s profile, team, ${member.role}`}
                aria-haspopup="dialog"
              >
                <MemberAvatar member={member} />
                <span className="credits-member-copy">
                    <span className="credits-member-name">{member.name}</span>
                  <span className="credits-member-role">{member.role}</span>
                </span>
                <span className="credits-core-mark" aria-hidden="true">✦</span>
                <ArrowIcon />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="credits-directory" aria-labelledby="credits-directory-title">
        <header className="credits-directory-header">
          <div>
            <p className="credits-eyebrow"><span aria-hidden="true">{coreTeam.length > 0 ? '02' : '01'} /</span> The collective</p>
            <h2 id="credits-directory-title">Every name, part of the story.</h2>
          </div>
          <span className="credits-total"><strong>{String(CREDITS.length).padStart(2, '0')}</strong> people & counting</span>
        </header>

        <div className="credits-toolbar">
          <div className="credits-filters" role="group" aria-label="Filter people">
            {FILTERS.map(item => (
              <button
                type="button"
                key={item.id}
                aria-pressed={filter === item.id}
                aria-controls="credits-results"
                onClick={() => { setFilter(item.id); setPage(0); }}
              >
                {item.label}<span>{CREDITS.filter(item.matches).length}</span>
              </button>
            ))}
          </div>
          <label className="credits-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
            <input
              ref={searchRef}
              type="search"
              aria-label="Search people by name or role"
              placeholder="Find a name or role…"
              value={query}
              onChange={event => { setQuery(event.target.value); setPage(0); }}
              aria-controls="credits-results"
            />
          </label>
        </div>

        <div id="credits-results" ref={resultsRef} tabIndex={-1} className="credits-results" role="region" aria-label="People directory">
          {visibleMembers.length > 0 ? (
            <ul className="credits-people-grid" key={`${filter}-${currentPage}-${search}`}>
              {visibleMembers.map((member, index) => (
                <li key={member.name} style={{ '--entry-order': index, '--role-color': memberColor(member) }}>
                  <button type="button" className="credits-person" onClick={event => openProfile(member, event)} aria-label={`View ${member.name}'s profile, ${member.role}${member.isCore ? ', team' : ''}`} aria-haspopup="dialog">
                    <MemberAvatar member={member} />
                    <span className="credits-member-copy">
                      <span className="credits-member-name">{member.name}</span>
                      <span className="credits-member-role">{member.role}</span>
                    </span>
                    {member.isCore && <span className="credits-core-badge"><span aria-hidden="true">✦</span> Team</span>}
                    <ArrowIcon />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="credits-empty">
              <span aria-hidden="true">◇</span>
              <h3>No people found</h3>
              <p>Try another name or explore everyone behind Enigma.</p>
              <button type="button" onClick={resetSearch}>Reset search & filters <ArrowIcon /></button>
            </div>
          )}
        </div>

        <footer className="credits-directory-footer">
          <p role="status" aria-live="polite" aria-atomic="true">
            {matchingMembers.length > 0
              ? <>Showing <strong>{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, matchingMembers.length)}</strong> of {matchingMembers.length} people</>
              : '0 people found'}
          </p>
          {pageCount > 1 ? (
            <nav className="credits-pagination" aria-label="People pages">
              <button type="button" aria-label="Previous people page" disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)}><ArrowIcon back /></button>
              <span>{currentPage + 1} <span>/ {pageCount}</span></span>
              <button type="button" aria-label="Next people page" disabled={currentPage + 1 === pageCount} onClick={() => changePage(currentPage + 1)}><ArrowIcon /></button>
            </nav>
          ) : <span className="credits-profile-hint">Select a name to meet the person <ArrowIcon /></span>}
        </footer>
      </section>
      </>}

      <p className="credits-signoff"><span aria-hidden="true">✦</span> {copy.teamSignoff} <span aria-hidden="true">✦</span></p>

      {selectedMember && <MemberProfile member={selectedMember} triggerRef={triggerRef} motionPaused={motionPaused || reducedMotion} onClose={() => setSelectedMember(null)} />}
    </section>
  );
}

function ArrowIcon({ back = false }) {
  return <svg className={`credits-arrow${back ? ' credits-arrow--back' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

function MemberAvatar({ member }) {
  const [failed, setFailed] = useState(false);
  const initials = member.name.split(/\s+/).map(part => part.charAt(0)).slice(0, 2).join('').toUpperCase();
  return (
    <span className={`credits-avatar${member.avatar?.endsWith('.gif') ? ' credits-avatar--animated' : ''}`} aria-hidden="true">
      <span>{initials}</span>
      {member.avatar && !failed && <img src={member.avatar} alt="" width="64" height="64" loading="lazy" decoding="async" onError={() => setFailed(true)} />}
    </span>
  );
}

function MemberProfile({ member, triggerRef, motionPaused, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [triggerRef]);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="credits-profile"
      data-motion-paused={motionPaused}
      style={{ '--role-color': memberColor(member) }}
      aria-labelledby="credits-profile-name"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
    >
      <div className="credits-profile-cover">
        <span className="credits-profile-orbit" aria-hidden="true" />
        <p className="credits-eyebrow">Enigma / The people</p>
        <button type="button" className="credits-profile-close" aria-label="Close profile" onClick={onClose} autoFocus><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
        <MemberAvatar member={member} />
      </div>
      <div className="credits-profile-body">
        <span className="credits-profile-membership"><span aria-hidden="true">{member.isCore ? '✦' : '◇'}</span> {member.isCore ? 'Team' : 'Contributor'}</span>
        <h2 id="credits-profile-name">{member.name}</h2>
        <p className="credits-profile-role">{member.role}</p>
        {member.description && <p className="credits-profile-bio">{member.description}</p>}
        {member.socials.discord && <div className="credits-profile-social"><span>Discord</span><strong>{member.socials.discord}</strong></div>}
        {Object.entries(member.socials).filter(([key, url]) => key !== 'discord' && url).map(([key, url]) => <a className="credits-profile-social" href={url} key={key} target="_blank" rel="noreferrer">{key} ↗</a>)}
        <p className="credits-profile-footnote">Part of the story behind Beyond the Void.</p>
      </div>
    </dialog>,
    document.body,
  );
}
