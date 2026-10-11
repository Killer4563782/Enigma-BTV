// Shared by the client and HTTP server so deep links and 404s agree.
export const taskboardViews = ['home', 'board', 'space', 'my-tasks', 'notifications', 'trash', 'settings', 'admin', 'profile', 'releases', 'changelog'];
const authViews = ['login', 'register', 'setup'];
export function taskboardParts(pathname) {
  if (!/^\/taskboard(?:\/|$)/.test(pathname)) return [];
  return pathname.slice('/taskboard'.length).split('/').filter(Boolean);
}
export function isTaskboardPath(pathname) {
  if (!/^\/taskboard(?:\/|$)/.test(pathname)) return false;
  const parts = taskboardParts(pathname);
  if (pathname === '/taskboard/index.html') return true;
  if (!parts.length) return true;
  return parts.length <= 2 && [...taskboardViews, ...authViews].includes(parts[0]);
}
export function taskboardUrl(view, id = '') {
  return `/taskboard/${view}${id ? `/${encodeURIComponent(id)}` : ''}`;
}
