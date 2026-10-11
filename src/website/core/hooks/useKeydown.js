import { useEffect } from 'react';

/**
 * Attaches a keydown listener that calls `handler` when `key` is pressed.
 * Cleans up automatically on unmount or when deps change.
 *
 * @param {string}   key     - The key to listen for (e.g. 'Escape')
 * @param {Function} handler - Callback to invoke
 * @param {Array}    deps    - Additional useEffect deps
 */
export function useKeydown(key, handler, deps = []) {
  useEffect(() => {
    const listener = (e) => { if (e.key === key) handler(e); };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, handler, ...deps]);
}
