// app/sw.js/route.ts — serves the service worker (see lib/serviceWorkerSource.ts for the policy and the reason it
// is generated). APP_BUILD_ID is read at request time so a deployment, or a restart with a different id, changes
// the bytes; on Vercel the commit SHA is used. `no-cache` makes the browser revalidate the file on every check.
import { buildServiceWorkerSource } from '@/lib/serviceWorkerSource';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  const buildId = process.env.APP_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'dev';
  return new Response(buildServiceWorkerSource(buildId), {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, max-age=0, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
}
