import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartProvider } from '@/components/CartProvider';
import { CartDrawer } from '@/components/CartDrawer';
import { AuthProvider } from '@/components/AuthProvider';
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
  },
  icons: { icon: '/brand/icon.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            <Header />
            <CartDrawer />
            {children}
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
