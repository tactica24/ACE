export const contentType = 'image/svg+xml';

export const size = {
  width: 512,
  height: 512
};

export default function Icon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="ACE">
      <defs>
        <radialGradient id="glowRed" cx="22%" cy="18%" r="34%">
          <stop offset="0%" stop-color="#ff2438" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#ff2438" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glowGold" cx="84%" cy="14%" r="24%">
          <stop offset="0%" stop-color="#f4c46a" stop-opacity="0.26" />
          <stop offset="100%" stop-color="#f4c46a" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#151017" />
          <stop offset="46%" stop-color="#09080d" />
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
      <rect width="512" height="512" fill="url(#bg)" rx="108" />
      <rect width="512" height="512" fill="url(#glowRed)" rx="108" />
      <rect width="512" height="512" fill="url(#glowGold)" rx="108" />
      <path d="M42 392C154 324 263 308 470 320" fill="none" stroke="#e50914" stroke-width="20" stroke-linecap="round" opacity="0.38" />
      <rect x="72" y="82" width="368" height="320" rx="82" fill="none" stroke="url(#gold)" stroke-width="12" opacity="0.28" />
      <path d="M254 90 92 416h84l26-60h108l26 60h84L290 90h-36Zm-28 200 32-84 32 84h-64Z" fill="url(#red)" />
      <path d="M278 218 356 266 278 314Z" fill="#fff8f1" opacity="0.96" />
    </svg>
  `.trim();

  return new Response(svg, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
