// Both API namespaces validate the same server-side bearer session.
const key = "enigma-session";
const legacyKeys = ["enigma-admin-token", "enigma-taskboard-session"];
let memoryToken: string | null = null;

export function getSessionToken(): string | null {
  try {
    const stored = window.sessionStorage.getItem(key);
    if (stored) return stored;
    const remembered = window.localStorage.getItem(key);
    if (remembered) return remembered;
    for (const legacy of legacyKeys) {
      const token = window.sessionStorage.getItem(legacy);
      if (token) { setSessionToken(token); return token; }
    }
  } catch { /* Keep the current session usable when storage is unavailable. */ }
  return memoryToken;
}

export function setSessionToken(token: string | null, remember = false) {
  memoryToken = token || null;
  try {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
    if (token) {
      (remember ? window.localStorage : window.sessionStorage).setItem(key, token);
    }
    for (const legacy of legacyKeys) window.sessionStorage.removeItem(legacy);
  } catch { /* Keep the in-memory session when browser storage is unavailable. */ }
}
