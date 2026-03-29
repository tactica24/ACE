import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ace Studio',
    short_name: 'Ace',
    description: 'Premium African streaming for viewers and creators.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'portrait',
    background_color: '#070b18',
    theme_color: '#070b18',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png'
      }
    ]
  };
}
