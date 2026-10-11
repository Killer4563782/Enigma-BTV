import { useEffect, useRef, useState } from 'react';
import { memberColor, isPlanet } from '../../../data/credits.js';
import ConstellationAtmosphere from './ConstellationAtmosphere.jsx';
import '../styles/ConstellationMap.css';

const CORE_POSITIONS = [[29, 30], [73, 25], [23, 65], [78, 65], [50, 77], [50, 16]];
const MOBILE_CORE_POSITIONS = [[25, 25], [76, 25], [25, 51], [76, 51], [25, 77], [76, 77]];
const STAR_POSITIONS = [[15, 12], [50, 6], [87, 42], [87, 89], [12, 88], [12, 43]];
const MOBILE_STAR_POSITIONS = [[24, 7], [76, 7], [24, 94], [76, 94]];

export default function ConstellationMap({ members, onOpenProfile, paused, reducedMotion, onToggleMotion, onFindPerson, ready = true }) {
  const [compact, setCompact] = useState(false);
  const [planetSector, setPlanetSector] = useState(0);
  const planetSectorCount = Math.max(1, Math.ceil(members.filter(isPlanet).length / 6));
  const currentPlanetSector = Math.min(planetSector, planetSectorCount - 1);
  const [sector, setSector] = useState(0);
  const [hovered, setHovered] = useState(null);
  const [arrival, setArrival] = useState(0);
  const [entranceComplete, setEntranceComplete] = useState(false);
  const [visible, setVisible] = useState(true);
  const mapRef = useRef(null);
  const pointerFrame = useRef(null);
  const planets = members.filter(isPlanet);
  const core = planets.slice(currentPlanetSector * 6, (currentPlanetSector + 1) * 6);
  const contributors = members.filter(member => !isPlanet(member));
  const slots = compact ? MOBILE_STAR_POSITIONS : STAR_POSITIONS;
  const sectorCount = Math.max(1, Math.ceil(contributors.length / slots.length));
  const currentSector = Math.min(sector, sectorCount - 1);
  const stars = contributors.slice(currentSector * slots.length, (currentSector + 1) * slots.length);
  const motionStopped = paused || reducedMotion || !visible;
  const focusColor = memberColor(members.find(member => member.name === hovered) || {});
  const corePositions = compact ? MOBILE_CORE_POSITIONS : CORE_POSITIONS;
  const positionForCore = index => corePositions[index];

  useEffect(() => {
    const media = window.matchMedia('(max-width: 800px)');
    setCompact(media.matches);
    const change = event => { setCompact(event.matches); setSector(0); };
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  useEffect(() => () => cancelAnimationFrame(pointerFrame.current), []);

  const moveDepth = event => {
    if (motionStopped || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = requestAnimationFrame(() => {
      mapRef.current?.style.setProperty('--depth-x', `${x * 12}px`);
      mapRef.current?.style.setProperty('--depth-y', `${y * 9}px`);
    });
  };

  const resetDepth = () => {
    cancelAnimationFrame(pointerFrame.current);
    mapRef.current?.style.setProperty('--depth-x', '0px');
    mapRef.current?.style.setProperty('--depth-y', '0px');
  };

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ready || entranceComplete) return undefined;
    if (motionStopped) {
      setEntranceComplete(true);
      return undefined;
    }
    const timer = setTimeout(() => setEntranceComplete(true), 3400);
    return () => clearTimeout(timer);
  }, [ready, motionStopped, entranceComplete, arrival]);

  const changeSector = next => {
    setSector(next);
    setHovered(null);
  };

  return (
    <section className="constellation-map" ref={mapRef} aria-label="The Enigma star system" data-paused={motionStopped} data-ready={ready} data-arrived={entranceComplete} style={{ '--system-accent': focusColor }}>
      <div className="system-toolbar">
        <div className="system-coordinate"><span aria-hidden="true">✦</span><span>Enigma system <b>/</b> {String(members.length).padStart(2, '0')} people</span></div>
        <div className="system-actions">
          <button type="button" onClick={onFindPerson} aria-label="Find a person"><SystemIcon name="search" /><span>Find a person</span></button>
          <button type="button" onClick={() => { setArrival(value => value + 1); setEntranceComplete(false); }} disabled={motionStopped || !ready} aria-label="Replay constellation arrival" title="Replay arrival"><SystemIcon name="replay" /></button>
          <button type="button" onClick={onToggleMotion} disabled={reducedMotion} aria-pressed={paused || reducedMotion} aria-label={reducedMotion ? 'Motion reduced by your device settings' : paused ? 'Resume constellation motion' : 'Pause constellation motion'} title={reducedMotion ? 'Reduced motion enabled' : paused ? 'Resume motion' : 'Pause motion'}><SystemIcon name={paused || reducedMotion ? 'play' : 'pause'} /></button>
        </div>
      </div>

      <div className="system-space" data-hovering={Boolean(hovered)} onPointerMove={moveDepth} onPointerLeave={resetDepth}>
        <ConstellationAtmosphere paused={motionStopped} active={ready} />
        <div className="system-vignette" aria-hidden="true" />
        <div className="system-arrival" key={`arrival-${arrival}`} aria-hidden="true">
          <div className="system-shockwave" /><div className="system-shockwave system-shockwave--second" />
          <div className="system-warp-rays">{Array.from({ length: 16 }, (_, index) => <i key={index} style={{ '--ray-angle': `${index * 22.5}deg`, '--ray-delay': `${index % 3 * 0.08}s` }} />)}</div>
        </div>
        <div className="system-orbit-plane system-orbit-plane--outer" aria-hidden="true"><div className="system-orbit-current" /><span /><span /></div>
        <div className="system-orbit-plane system-orbit-plane--inner" aria-hidden="true"><div className="system-orbit-current" /></div>

        <svg className="system-connections" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
          {[...core.map((member, index) => ({ member, point: positionForCore(index) })), ...stars.map((member, index) => ({ member, point: slots[index] }))].map(({ member, point }) => (
            <path key={member.name} className={hovered === member.name ? 'is-lit' : ''} style={{ '--node-color': memberColor(member) }} d={`M 500 294 Q ${(point[0] * 10 + 500) / 2 + 35} ${(point[1] * 6 + 294) / 2 - 40}, ${point[0] * 10} ${point[1] * 6}`} />
          ))}
        </svg>

        <div className="system-heart" aria-hidden="true">
          <div className="system-heart-halo" />
          <div className="system-heart-orbit" />
          <div className="system-heart-diamond" />
          <svg className="system-heart-star" viewBox="0 0 100 100"><path d="M50 0 60 37 100 50 60 61 50 100 39 61 0 50 39 38Z" fill="currentColor" /><path d="m16 16 28 23 40-23-23 28 23 40-28-23-40 23 23-28Z" fill="currentColor" opacity=".23" /></svg>
          <span className="system-heart-name">Enigma</span>
          <span className="system-heart-caption">Beyond the Void</span>
        </div>

        <div className="system-people" key={`people-${arrival}`}>
          {core.map((member, index) => {
            const [x, y] = positionForCore(index);
            return (
              <div className="system-node system-node--planet" key={member.name} style={{ left: `${x}%`, top: `${y}%`, '--node-color': memberColor(member), '--node-order': index, '--planet-angle': `${-30 + index * 19}deg` }}>
                <button type="button" className="system-planet" data-active={hovered === member.name} aria-label={`${member.name}, planet, ${member.role}. Open profile`} aria-haspopup="dialog" onClick={event => onOpenProfile(member, event)} onPointerEnter={() => setHovered(member.name)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(member.name)} onBlur={() => setHovered(null)}>
                  <span className="system-planet-aura" aria-hidden="true" />
                  <span className="system-planet-ring system-planet-ring--back" aria-hidden="true" />
                  <span className="system-planet-sphere" aria-hidden="true"><span className="system-planet-clouds" /><span className="system-planet-shade" /></span>
                  <span className="system-planet-ring system-planet-ring--front" aria-hidden="true" />
                  <span className="system-planet-reticle" aria-hidden="true" />
                  <span className="system-planet-label"><span className="system-membership">{member.isCore ? 'Team' : 'Contributor'}</span><strong>{member.name}</strong><span className="system-role">{member.role}</span></span>
                </button>
              </div>
            );
          })}
          {stars.map((member, index) => (
            <div className="system-node system-node--star" key={member.name} style={{ left: `${slots[index][0]}%`, top: `${slots[index][1]}%`, '--node-color': memberColor(member), '--node-order': index + core.length }}>
              <button type="button" className="system-contributor" data-active={hovered === member.name} aria-label={`${member.name}, star, ${member.role}. Open profile`} aria-haspopup="dialog" onClick={event => onOpenProfile(member, event)} onPointerEnter={() => setHovered(member.name)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(member.name)} onBlur={() => setHovered(null)}>
                <span className="system-star-hitbox"><span className="system-star-orbit" aria-hidden="true" /><svg viewBox="0 0 40 40" aria-hidden="true"><path d="m20 0 5 15 15 5-15 5-5 15-5-15L0 20l15-5Z" fill="currentColor" /></svg></span>
                <span className="system-star-name">{member.name}</span>
              </button>
            </div>
          ))}
        </div>

        <p className="system-scene-note"><span aria-hidden="true">✧</span> Every light has a story. Select one to discover it.</p>
      </div>

      {planetSectorCount > 1 && <div className="system-planet-pages"><button type="button" disabled={currentPlanetSector === 0} onClick={() => setPlanetSector(value => value - 1)} aria-label="Previous planets">←</button><span role="status">Planet field {currentPlanetSector + 1} of {planetSectorCount}</span><button type="button" disabled={currentPlanetSector + 1 === planetSectorCount} onClick={() => setPlanetSector(value => value + 1)} aria-label="Next planets">→</button></div>}
      <footer className="system-footer">
        <div className="system-legend"><span><i className="system-legend-planet" aria-hidden="true" /> Planets <b>{planets.length}</b></span><span><i className="system-legend-star" aria-hidden="true">✦</i> Stars <b>{contributors.length}</b></span></div>
        <div className="system-sectors">
          <span className="system-sector-status" role="status" aria-live="polite">{sectorCount > 1 ? `Star field ${currentSector + 1} of ${sectorCount}` : 'One shared universe'}</span>
          {sectorCount > 1 && <><button type="button" aria-label="Previous star field" disabled={currentSector === 0} onClick={() => changeSector(currentSector - 1)}><SystemIcon name="previous" /></button><button type="button" aria-label="Next star field" disabled={currentSector + 1 === sectorCount} onClick={() => changeSector(currentSector + 1)}><SystemIcon name="next" /></button></>}
        </div>
      </footer>
    </section>
  );
}

function SystemIcon({ name }) {
  const paths = { pause: 'M8 5v14M16 5v14', play: 'm9 5 10 7-10 7Z', replay: 'M4 10a8 8 0 1 1 1 8M4 4v6h6', previous: 'M19 12H5m6-6-6 6 6 6', next: 'M5 12h14m-6-6 6 6-6 6' };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{name === 'search' ? <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></> : <path d={paths[name]} />}</svg>;
}
