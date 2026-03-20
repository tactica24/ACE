import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ace Studio',
    short_name: 'Ace',
    description: 'Premium African streaming for viewers and creators.',
    start_url: '/',
    display: 'standalone',
    background_color: '#070b18',
    theme_color: '#070b18',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      }
    ]
  };
}
