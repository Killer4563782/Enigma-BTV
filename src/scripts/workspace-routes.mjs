function install(server) {
  server.middlewares.use((req, _res, next) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (req.headers.accept?.includes('text/html') && /^\/taskboard\/.+/.test(url.pathname)) {
      req.url = `/taskboard/${url.search}`;
    }
    next();
  });
}

// Keep the URL in the browser so the React workspace can resolve entity IDs.
export const workspaceRoutes = {
  name: 'enigma-workspace-routes',
  configureServer: install,
  configurePreviewServer: install,
};
