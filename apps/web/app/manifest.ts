import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hariyo Mart Nepal',
    short_name: 'Hariyo Mart',
    description: "Fresh local products from Nepal's seven provinces.",
    start_url: '/',
    display: 'standalone',
    background_color: '#F7FAF2',
    theme_color: '#062D22',
    icons: [{ src: '/brand/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
