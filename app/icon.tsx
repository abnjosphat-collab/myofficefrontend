import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Global app icon. Kept consistent with the thin equipment iconography in Tools. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          background: "#f8f7fb",
          border: "1px solid #ded9e8",
        }}
      >
        <svg width="46" height="46" viewBox="0 0 512 512">
          <rect x="88" y="194" width="336" height="224" rx="42" fill="#ffffff" stroke="#24202e" strokeWidth="18" />
          <path d="M190 194v-42c0-32 26-58 58-58h16c32 0 58 26 58 58v42" fill="none" stroke="#24202e" strokeWidth="18" strokeLinecap="round" />
          <path d="M88 274h336" fill="none" stroke="#24202e" strokeWidth="18" />
          <path d="M222 274v38c0 10 8 18 18 18h32c10 0 18-8 18-18v-38" fill="#f8f7fb" stroke="#6f4fd6" strokeWidth="16" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
