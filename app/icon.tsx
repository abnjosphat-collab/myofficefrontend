// app/icon.tsx — Next.js file-convention favicon/app-icon. Matches the TopNavigation
// brand mark: a violet/indigo gradient badge with an office-building glyph — literally
// the "Office" in MyOffice — rather than a generic house icon.
import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

// Exact path data from @phosphor-icons/react's Buildings glyph, weight="fill" (256 viewBox).
const BUILDINGS_FILL_PATH =
  'M239.73,208H224V96a16,16,0,0,0-16-16H164a4,4,0,0,0-4,4V208H144V32.41a16.43,16.43,0,0,0-6.16-13,16,16,0,0,0-18.72-.69L39.12,72A16,16,0,0,0,32,85.34V208H16.27A8.18,8.18,0,0,0,8,215.47,8,8,0,0,0,16,224H240a8,8,0,0,0,8-8.53A8.18,8.18,0,0,0,239.73,208ZM76,184a8,8,0,0,1-8.53,8A8.18,8.18,0,0,1,60,183.72V168.27A8.19,8.19,0,0,1,67.47,160,8,8,0,0,1,76,168Zm0-56a8,8,0,0,1-8.53,8A8.19,8.19,0,0,1,60,127.72V112.27A8.19,8.19,0,0,1,67.47,104,8,8,0,0,1,76,112Zm40,56a8,8,0,0,1-8.53,8,8.18,8.18,0,0,1-7.47-8.26V168.27a8.19,8.19,0,0,1,7.47-8.26,8,8,0,0,1,8.53,8Zm0-56a8,8,0,0,1-8.53,8,8.19,8.19,0,0,1-7.47-8.26V112.27a8.19,8.19,0,0,1,7.47-8.26,8,8,0,0,1,8.53,8Z';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 16,
          background: 'linear-gradient(155deg, #a78bfa 0%, #7c3aed 55%, #5b21b6 100%)',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 256 256">
          <path d={BUILDINGS_FILL_PATH} fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
