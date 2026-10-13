// components/shared/floor/fonts.ts — the floor's type pairing. Space Grotesk (display: headings, large figures) with a
// mechanical, engineered feel; JetBrains Mono (meters: hour counts, readings) so numbers line up like an instrument
// panel; the app's own body face for everything else. next/font bundles both with the app, so the installed app (PWA)
// has them offline too.
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';

export const floorDisplay = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-floor-display', display: 'swap' });
export const floorMono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-floor-mono', display: 'swap' });
