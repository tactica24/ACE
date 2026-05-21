export const contentType = 'image/svg+xml';

export const size = {
  width: 180,
  height: 180
};

export default function AppleIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" role="img" aria-label="ACE">
      <defs>
        <radialGradient id="glowRed" cx="24%" cy="18%" r="32%">
          <stop offset="0%" stop-color="#ff2438" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#ff2438" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glowGold" cx="82%" cy="12%" r="22%">
          <stop offset="0%" stop-color="#f4c46a" stop-opacity="0.28" />
          <stop offset="100%" stop-color="#f4c46a" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#151017" />
          <stop offset="48%" stop-color="#09080d" />
          <stop offset="100%" stop-color="#05070d" />
        </linearGradient>
        <linearGradient id="red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff2438" />
          <stop offset="52%" stop-color="#e50914" />
          <stop offset="100%" stop-color="#8f0712" />
        </linearGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff1b8" />
          <stop offset="100%" stop-color="#f4c46a" />
        </linearGradient>
      </defs>
      <rect width="180" height="180" fill="url(#bg)" rx="42" />
      <rect width="180" height="180" fill="url(#glowRed)" rx="42" />
      <rect width="180" height="180" fill="url(#glowGold)" rx="42" />
      <path d="M15 138C54 114 93 109 165 113" fill="none" stroke="#e50914" stroke-width="7" stroke-linecap="round" opacity="0.38" />
      <rect x="25" y="29" width="130" height="113" rx="30" fill="none" stroke="url(#gold)" stroke-width="4" opacity="0.28" />
      <path d="M89 32 32 147h30l9-21h38l9 21h30L102 32H89Zm-10 71 11-30 12 30H79Z" fill="url(#red)" />
      <path d="M98 77 126 94 98 111Z" fill="#fff8f1" opacity="0.96" />
    </svg>
  `.trim();

  return new Response(svg, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
