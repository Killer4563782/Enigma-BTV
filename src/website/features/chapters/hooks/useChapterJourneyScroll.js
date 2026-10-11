import { useEffect, useRef } from 'react';

// Only active travel uses animation frames. Native scrolling remains available
// inside tall worlds, dialogs, touch gestures, and reduced-motion mode.
export function useChapterJourneyScroll(sectionRef, chapterIds) {
  const travelRef = useRef(null);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(pointer: fine)');
    let frame = 0;
    let traveling = false;
    let lastWheel = 0;
    let gesture = 0;
    let direction = 0;
    let pointerDown = false;
    let settleAfter = 0;
    const stops = [...section.querySelectorAll('.chapter-road-header, .chapter-scene')];
    const top = element => Math.max(0, element.getBoundingClientRect().top + window.scrollY - 64);
    const nearestStop = (fitOnly = false) => {
      let nearest, distance = Infinity;
      for (const element of stops) {
        if (fitOnly && element.offsetHeight > innerHeight - 56) continue;
        const delta = Math.abs(top(element) - scrollY);
        if (delta < distance) { nearest = element; distance = delta; }
      }
      return nearest;
    };
    const blocked = () => document.body.style.overflow === 'hidden' || document.querySelector('[role="dialog"]');
    const cancel = () => {
      cancelAnimationFrame(frame); frame = 0; traveling = false;
      settleAfter = performance.now() + 400;
    };
    const travel = element => {
      cancel();
      const start = window.scrollY;
      const destination = Math.min(top(element), document.documentElement.scrollHeight - innerHeight);
      const distance = destination - start;
      if (motion.matches || Math.abs(distance) < 2) {
        window.scrollTo({ top: destination, behavior: 'instant' });
        return;
      }
      const duration = Math.min(1500, 1000 + Math.abs(distance) * .25);
      const begin = performance.now();
      traveling = true;
      const tick = now => {
        const progress = Math.min(1, (now - begin) / duration);
        // Quintic ease-in-out: continuous acceleration and a long, soft landing.
        const eased = progress < .5 ? 16 * progress ** 5 : 1 - (-2 * progress + 2) ** 5 / 2;
        window.scrollTo({ top: start + distance * eased, behavior: 'instant' });
        if (progress < 1) frame = requestAnimationFrame(tick);
        else { traveling = false; frame = 0; }
      };
      frame = requestAnimationFrame(tick);
    };
    travelRef.current = travel;
    const wheel = event => {
      if (motion.matches || !desktop.matches || blocked() || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (event.target.closest?.('button, input, textarea, select, [role="dialog"], .chapter-index')) return;
      const now = performance.now();
      const freshGesture = now - lastWheel > 200;
      lastWheel = now;
      if (traveling) { event.preventDefault(); return; }
      const nearest = nearestStop();
      if (!nearest) return;
      // Preserve free movement when a section exceeds the available viewport.
      const extra = nearest.offsetHeight - (innerHeight - 64);
      const offset = scrollY - top(nearest);
      if (extra > 8 && ((event.deltaY > 0 && offset < extra - 8) || (event.deltaY < 0 && offset > 8))) return;
      if (freshGesture) { gesture = 0; direction = Math.sign(event.deltaY); }
      if (!freshGesture && gesture === Infinity) { event.preventDefault(); return; }
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (Math.sign(delta) !== direction) { direction = Math.sign(delta); gesture = 0; }
      gesture += Math.abs(delta);
      const target = stops[stops.indexOf(nearest) + direction];
      if (!target) return;
      event.preventDefault();
      if (gesture >= 32) { gesture = Infinity; travel(target); }
    };
    const settle = () => {
      if (traveling || pointerDown || performance.now() < settleAfter || motion.matches || blocked()) return;
      const nearest = nearestStop(true);
      if (nearest && Math.abs(top(nearest) - scrollY) > 3 && Math.abs(top(nearest) - scrollY) < innerHeight * .4) travel(nearest);
    };
    const down = () => { pointerDown = true; cancel(); };
    const up = () => { pointerDown = false; };
    const key = event => { if (['Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) cancel(); };
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('scrollend', settle);
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });
    window.addEventListener('keydown', key);
    window.addEventListener('resize', cancel);
    motion.addEventListener('change', cancel);
    return () => {
      cancel(); travelRef.current = null;
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('scrollend', settle);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', key);
      window.removeEventListener('resize', cancel);
      motion.removeEventListener('change', cancel);
    };
  }, [sectionRef, chapterIds]);
  return travelRef;
}
