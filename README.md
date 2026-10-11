# Enigma Remastered

The complete frontend from Enigma-Source, reorganized as one Astro project. The original source and sibling backend are untouched.

## Run

Requires Node.js 22.12 or newer.

```powershell
cd F:\Enigma-Universe\Enigma-Remastered
npm install
npm run dev
```

Development runs at `http://localhost:4321`. To preview the production build:

```powershell
npm run build
npm run preview
```

Production preview runs at `http://127.0.0.1:4321`. `npm run typecheck` checks the taskboard's TypeScript. Existing transfer checks are retained in `src/tests` and available through `npm run test:transfer`; they are not part of the build.

## Source layout

```text
src/
  pages/       Astro routes: home, chapters, Q&A, credits, taskboard
  layouts/     Astro HTML document and public stylesheet setup
  website/     Public React views, features, styles, content, and hooks
  taskboard/   Workspace components, features, API client, and state
  shared/      Session handling and editorial content schema
  public/      Static assets served from /assets
  scripts/     Asset generation and local workspace route handling
  tests/       Existing transfer checks, with updated source paths
  docs/        Migration notes and original transfer documentation
```

Only project configuration, package files, this README, and local environment files live at the root. Dependencies and build output are generated in `node_modules`, `.astro`, and `dist`.

Public features are grouped by purpose: `home`, `chapters`, `chapter` (chapter detail), `qa`, `credits`, `navigation`, and `particles`. Each feature owns its components and styles.

## Backend configuration

The frontend uses the existing Enigma backend and API contracts. Development defaults to `http://localhost:3001`; production builds default to `https://enigma-btv-backend.vercel.app`.

To override either, create `.env.local` containing `VITE_API_URL=https://your-backend.example` and restart development or rebuild. You can also set the public variable in `.env.production` for production builds. This value is embedded in the browser bundle: put only the backend URL here. The original `.env.local` and Vercel project binding were not copied.

## Pages and hosting

Public pages are prerendered at `/`, `/chapters/`, `/qa/`, and `/credits/`, then hydrated for their interactive features. Old links such as `/#credits` redirect to the corresponding page. The public site uses page navigation; each page loads its own view and releases the previous view.

The authenticated taskboard remains a React application at `/taskboard`, with its existing client router and browser session storage. `vercel.json` routes all `/taskboard/*` URLs to its static HTML document. Local development and `npm run preview` apply that same fallback. Other static hosts need an equivalent rewrite; arbitrary workspace entity IDs cannot be generated at build time.

Builds prerender the bundled public content. After hydration, the public content service fetches published content from the backend as before. Without JavaScript or during an outage, the bundled snapshot is displayed. Rebuild after changing the bundled snapshot.

## Performance changes

- Prerendered HTML appears immediately; the former mandatory loading/rift sequence no longer delays entry. Its visual components remain in `src/website/layout` for future use.
- Public routes load separate view bundles. The workspace never loads on public pages.
- Board, administration, changelog, and task details use lazy imports. Task details mount only while a task is selected; closing them releases their component state.
- Particles load during browser idle time, paint at up to 30 FPS, pause in hidden tabs, and respect reduced motion. Glow gradients use cached bitmaps. The particle count is bounded at 64 instead of 90.
- Both decorative canvas backing stores are capped near 1.5 million pixels (approximately 6 MB of raw RGBA storage per canvas, excluding browser overhead).
- Public PNG and GIF assets have WebP derivatives. Covers are capped at 1600 pixels and avatars at 256 pixels. Animated avatars retain animation. Original assets remain available at their original URLs. The initial seven assets total 17.99 MiB; their derivatives total 0.63 MiB, about 96% fewer bytes. This is an asset-size comparison, not a measured browser-memory reduction.
- Assets are rooted at `/assets` to work on every nested route. An asset manifest maps bundled originals to derivatives; externally supplied image URLs remain unchanged.
- Task dependency normalization uses indexed lookups rather than repeated full-array searches. Existing synchronization intervals, session behavior, and transfer protocols are preserved.
- Repeated identical public-content responses do not trigger content rerenders, and failed requests obey the focus-refresh cooldown.

`npm run assets` regenerates WebP derivatives and the manifest. It runs automatically before development and production builds, and skips unchanged source files. After editing local images during development, run it again and refresh the page.

See `src/docs/MIGRATION.md` for the source inventory and verification scope.
