export const contentType = 'image/svg+xml';

export const size = {
  width: 512,
  height: 512
};

export default function Icon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="ACE">
      <defs>
        <radialGradient id="glowBlue" cx="20%" cy="20%" r="30%">
          <stop offset="0%" stop-color="rgba(106,182,255,0.35)" />
          <stop offset="100%" stop-color="rgba(106,182,255,0)" />
        </radialGradient>
        <radialGradient id="glowGold" cx="84%" cy="14%" r="24%">
          <stop offset="0%" stop-color="rgba(242,191,110,0.3)" />
          <stop offset="100%" stop-color="rgba(242,191,110,0)" />
        </radialGradient>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#09111d" />
          <stop offset="46%" stop-color="#0f1b31" />
          <stop offset="100%" stop-color="#05070d" />
        </linearGradient>
        <linearGradient id="badge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(106,182,255,0.22)" />
          <stop offset="100%" stop-color="rgba(242,191,110,0.18)" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#bg)" rx="108" />
      <rect width="512" height="512" fill="url(#glowBlue)" rx="108" />
      <rect width="512" height="512" fill="url(#glowGold)" rx="108" />
      <rect x="76" y="76" width="360" height="360" rx="96" fill="url(#badge)" stroke="rgba(255,255,255,0.08)" stroke-width="12" />
      <text x="256" y="314" text-anchor="middle" font-size="220" font-weight="800" letter-spacing="-0.08em" fill="#f4f1ea" font-family="Arial, Helvetica, sans-serif">A</text>
    </svg>
  `.trim();

  return new Response(svg, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
