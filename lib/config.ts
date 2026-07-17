// lib/config.ts — single source for app-wide runtime config.
//
// The backend base URL was previously redefined in ~46 files, each with its own
// `process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com'`
// literal. Import API_BASE from here instead so the fallback lives in exactly one
// place and a URL change is a one-line edit.

/** Backend API origin (no trailing slash). Override with NEXT_PUBLIC_API_URL. */
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com'
).replace(/\/$/, '');
