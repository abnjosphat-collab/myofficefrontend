import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Global app icon: the sign-in mesh as a small mark, in the app's sage greens (same as public/icons/myoffice-icon.svg). */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", borderRadius: 14, background: "#233b31" }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <g fill="none" stroke="#7fb59a" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
            <polyline points="14,18 25,17 36,18 47,22" />
            <polyline points="13,28 25,27 37,28 48,31" />
            <polyline points="12,39 25,38 38,39 49,40" />
            <polyline points="14,18 13,28 12,39" />
            <polyline points="25,17 25,27 25,38" />
            <polyline points="36,18 37,28 38,39" />
            <polyline points="47,22 48,31 49,40" />
          </g>
          <g fill="#cfeadc">
            <circle cx="14" cy="18" r="2" /><circle cx="25" cy="17" r="2" /><circle cx="36" cy="18" r="1.7" /><circle cx="47" cy="22" r="1.3" />
            <circle cx="13" cy="28" r="2" /><circle cx="25" cy="27" r="2" /><circle cx="37" cy="28" r="1.7" /><circle cx="48" cy="31" r="1.3" />
            <circle cx="12" cy="39" r="2" /><circle cx="25" cy="38" r="2" /><circle cx="38" cy="39" r="1.7" /><circle cx="49" cy="40" r="1.3" />
          </g>
        </svg>
      </div>
    ),
    { ...size },
  );
}
