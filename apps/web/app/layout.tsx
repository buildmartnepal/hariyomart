import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartProvider } from '@/components/CartProvider';
import { CartDrawer } from '@/components/CartDrawer';
import { AuthProvider } from '@/components/AuthProvider';
import { LocationProvider } from '@/components/LocationProvider';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://hariyomart.example'),
  title: {
    default: 'Hariyo Mart Nepal | Buy Fresh From Farmers Near You',
    template: '%s | Hariyo Mart Nepal',
  },
  description:
    'Nepal’s location-based multi-farmer marketplace. Discover fresh harvests nearby, buy directly from verified farmer stores, or open your own Hariyo Mart seller tenant.',
  keywords: [
    'farmer marketplace Nepal',
    'farm to home Nepal',
    'fresh vegetables delivery Nepal',
    'buy from farmers Nepal',
    'local farmers Nepal',
    'organic marketplace Nepal',
    'agriculture marketplace Nepal',
  ],
  openGraph: {
    title: 'Hariyo Mart Nepal — From the nearest farm to your table',
    description:
      'Location-matched harvests, verified farmer storefronts and multi-seller delivery across Nepal.',
    type: 'website',
    images: ['/campaigns/trusted-marketplace.webp'],
  },
  icons: { icon: '/brand/icon.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <LocationProvider>
            <CartProvider>
              <Header />
              <CartDrawer />
              {children}
              <Footer />
            </CartProvider>
          </LocationProvider>
        </AuthProvider>
      </body>
      <Script id="hariyo-theme" strategy="beforeInteractive">
        {`try{var m=localStorage.getItem('hariyo-theme')||'system';var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.dataset.themeMode=m}catch(e){}`}
      </Script>
    </html>
  );
}
