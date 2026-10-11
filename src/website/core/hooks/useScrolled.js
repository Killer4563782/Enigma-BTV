import { useState, useEffect } from 'react';

/**
 * Returns true once the page has scrolled past `threshold` pixels.
 * Uses a passive scroll listener for performance.
 */
export function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let previous;
    const onScroll = () => {
      const next = window.scrollY > threshold;
      if (next !== previous) { previous = next; setScrolled(next); }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrolled;
}
