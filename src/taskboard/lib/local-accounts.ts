const storageKey = "enigma-taskboard-local-accounts-v1";

// Only account identifiers are remembered on this browser. Authentication
// always happens through /auth/login with the account's password.
export function getLocalAccounts(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return Array.isArray(value)
      ? value.filter((email): email is string => typeof email === "string" && /^\S+@\S+\.\S+$/.test(email)).slice(0, 20)
      : [];
  } catch {
    return [];
  }
}

export function rememberLocalAccount(email: string): string[] {
  const normalized = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalized) || normalized.length > 254)
    return getLocalAccounts();
  const accounts = [normalized, ...getLocalAccounts().filter((known) => known !== normalized)].slice(0, 20);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(accounts));
  } catch {
    // Account history is optional when browser storage is unavailable.
  }
  return accounts;
}

export function removeLocalAccount(email: string): string[] {
  const normalized = email.trim().toLowerCase();
  const accounts = getLocalAccounts().filter((known) => known.toLowerCase() !== normalized);
  window.localStorage.setItem(storageKey, JSON.stringify(accounts));
  return accounts;
}
