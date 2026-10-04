# PWA, service worker and update path

**Status:** implemented and verified in a browser on 3 Oct 2026 (see "What was verified" for the limits).
**Source of truth for:** manifests, the service worker policy, how a deployed change reaches an installed app, and what
may and may not be cached. Code: `app/sw.js/route.ts`, `lib/serviceWorkerSource.ts`, `lib/registerServiceWorker.ts`,
`components/app-shell/ServiceWorkerRegistrar.tsx`, `public/manifest.json`, `public/tools/manifest.webmanifest`.

## One codebase, one deployment

The website, the installed MyOffice app and the installed Tools app are the same Next.js deployment. There is no separate
build for the installed app. Two manifests describe two installable entry points:

| | MyOffice | Tools & Equipment |
|---|---|---|
| Manifest | `/manifest.json` | `/tools/manifest.webmanifest` |
| `id` / `start_url` / `scope` | `/` / `/` / `/` | `/tools` / `/tools` / `/tools` |
| Theme and background | `#f4f6f5` (canvas) | `#f4f6f5` (canvas) |
| Icons | `/icons/icon-192.png`, `icon-512.png`, `maskable-512.png` | `/icons/tools-*` equivalents |

The older Tools manifest used dark violet colours (`#17151f`, `#f8f7fb`); those were remnants of the retired appearance
and were replaced. A stable `id` was added to both so browsers keep one app identity if the start URL ever changes.
One service worker, registered at scope `/`, serves both.

## Policy: what the worker does and does not touch

| Request | Handling | Why |
|---|---|---|
| Page navigations (including `/`) | Never intercepted: network | A reopened or navigated app must get the newest deployed HTML and hashed assets. Serving a cached document against a newer bundle caused a real bug earlier |
| `/api/**`, Supabase, any cross-origin request, any non-GET | Never intercepted: network | Account-specific records and writes must never be written to Cache Storage |
| `/_next/**` build assets | Never intercepted | Content-hashed; the normal HTTP cache already handles them |
| Same-origin `/icons/*.png` | Network first, cache as an offline fallback | Static, not account data. Network first so a changed icon is picked up |
| The manifests | Not cached by the worker | They changed once already; the browser manages them |

The worker never calls `skipWaiting()` on its own. It claims clients on activation (claiming does not reload them).
`serviceWorkerSource.test.ts` evaluates the generated source in a sandbox and asserts every row of this table.

**Consequence of changing this:** caching documents, API responses or build assets reintroduces stale-shell and
data-leak risks; adding `skipWaiting()` makes an open app change under the user.

## How a deployed change reaches users

```mermaid
sequenceDiagram
  participant U as User (installed app or browser tab)
  participant B as Browser
  participant S as Server (new deployment)
  Note over U,B: Older build is installed and its worker controls the page
  U->>B: reopens the app / navigates / returns to foreground
  B->>S: GET document and data (always network)
  S-->>B: newest HTML, assets, data
  B->>S: GET /sw.js (updateViaCache: none, Cache-Control: no-cache)
  S-->>B: worker with a new build stamp (different bytes)
  B->>B: installs the new worker; it WAITS
  alt app was closed and reopened
    B->>B: no client holds the old worker, new worker activates
  else app stayed open across the deployment
    B-->>U: toast "A new version of MyOffice is ready" with Reload
    U->>B: chooses Reload
    B->>B: postMessage SKIP_WAITING, controllerchange, reload once
  end
```

- **Detecting a deployment.** `public/sw.js` was a static file, so its bytes never changed and browsers were never told a
  newer build existed. `app/sw.js/route.ts` now serves the worker with a build stamp (`APP_BUILD_ID`, else Vercel's
  `VERCEL_GIT_COMMIT_SHA`, else `VERCEL_DEPLOYMENT_ID`, else `dev`) and `Cache-Control: no-cache`. **If a host sets none of
  these, every deployment gets the same stamp and open apps are not offered an update**; navigation and reopening
  still deliver the new code because documents always come from the network.
- **When updates are checked.** The browser checks on navigation; `registerServiceWorker` also checks when the app returns
  to the foreground and hourly.
- **No automatic refresh.** An update is only applied by `applyServiceWorkerUpdate()`, called from the toast's Reload
  button. The toast has a fixed id so two mounted registrars never stack it.

## What was verified (3 Oct 2026)

`node scripts/verify-pwa-update.mjs` (needs `npm run build`; it starts `next start` itself on port 3201, twice, with
different `APP_BUILD_ID` values, in one browser session with a fixture login and mocked API):

- the older build installs and controls the page; `sw.js` is `no-cache` and may control `/`;
- both manifests declare an `id` and the new palette;
- Cache Storage holds only `/icons/*.png` (it was empty in the run); no navigation or API response was served by the worker;
- after the "newer deployment" replaces the server, a still-open app is offered Reload, **is not reloaded**, still runs
  the older worker, and the newer worker is waiting;
- choosing Reload activates the newer worker; the prompt disappears;
- an even newer deployment, app closed and reopened: it lands on the newest worker with no prompt and no reinstall.

Unit tests: `lib/serviceWorkerSource.test.ts` (policy), `lib/registerServiceWorker.test.ts` (single registration, update
announcement only when an older worker controls the page, apply by message, foreground check).

**Limits.** Playwright cannot install a PWA, so the standalone window itself, OS-level install and uninstall, iOS and
Android installed behaviour, and push or badge features were **not** tested. The test exercises the same worker,
registration and update logic a standalone window uses, in a normal browser window. A real device check of "install the
old build, deploy, reopen" is still owed.

## Operating notes

- To force a visible update locally: build once, run `APP_BUILD_ID=a npx next start`, load the app, restart with
  `APP_BUILD_ID=b`, and bring the tab to the foreground.
- To remove a stuck worker in development: DevTools, Application, Service Workers, Unregister, and clear site data.
- The development server also serves `/sw.js`; the worker is harmless there because it never intercepts documents or data.
