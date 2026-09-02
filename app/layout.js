import './globals.css';
import { BUSINESS } from '@/lib/business';
import { SITE_URL } from '@/lib/domains';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BUSINESS.name} — Kadawatha`,
    template: `%s · ${BUSINESS.shortName}`,
  },
  description:
    'Certified petrol-vehicle repairs in Kadawatha since 2019. Engine diagnostics, servicing, brakes, electrical and transmission work with a 6-month parts warranty.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: BUSINESS.name,
    locale: 'en_LK',
    url: SITE_URL,
    title: `${BUSINESS.name} — Kadawatha`,
    description:
      'Certified petrol-vehicle repairs in Kadawatha since 2019, with a 6-month parts warranty.',
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: '#0b0e13',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-LK">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
