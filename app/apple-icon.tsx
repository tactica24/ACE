export const contentType = 'image/svg+xml';

export const size = {
  width: 180,
  height: 180
};

export default function AppleIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" role="img" aria-label="ACE">
      <defs>
        <radialGradient id="glowBlue" cx="24%" cy="18%" r="28%">
          <stop offset="0%" stop-color="rgba(106,182,255,0.38)" />
          <stop offset="100%" stop-color="rgba(106,182,255,0)" />
        </radialGradient>
        <radialGradient id="glowGold" cx="82%" cy="12%" r="22%">
          <stop offset="0%" stop-color="rgba(242,191,110,0.34)" />
          <stop offset="100%" stop-color="rgba(242,191,110,0)" />
        </radialGradient>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1424" />
          <stop offset="48%" stop-color="#10203a" />
          <stop offset="100%" stop-color="#060912" />
        </linearGradient>
        <linearGradient id="badge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(106,182,255,0.24)" />
          <stop offset="100%" stop-color="rgba(242,191,110,0.2)" />
        </linearGradient>
      </defs>
      <rect width="180" height="180" fill="url(#bg)" rx="42" />
      <rect width="180" height="180" fill="url(#glowBlue)" rx="42" />
      <rect width="180" height="180" fill="url(#glowGold)" rx="42" />
      <rect x="26" y="26" width="128" height="128" rx="34" fill="url(#badge)" stroke="rgba(255,255,255,0.08)" stroke-width="4" />
      <text x="90" y="108" text-anchor="middle" font-size="78" font-weight="800" letter-spacing="-0.08em" fill="#f4f1ea" font-family="Arial, Helvetica, sans-serif">A</text>
    </svg>
  `.trim();

  return new Response(svg, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
