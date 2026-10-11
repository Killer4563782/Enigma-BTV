import { useEffect } from 'react';

/**
 * Locks document.body scroll while the component is mounted (or while `active` is true).
 * Automatically restores scroll on cleanup.
 *
 * @param {boolean} active - Whether the lock should be applied. Defaults to true.
 */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [active]);
}
