import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'CJC Racers · Race Clock',
    short_name: 'CJC Racers',
    description: 'Cup schedules and farming timers for CJC Racers.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0e17',
    theme_color: '#0a0e17',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  }
}
