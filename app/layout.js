import './globals.css';
import { BUSINESS } from '@/lib/business';

export const metadata = {
  title: {
    default: `${BUSINESS.name} — Kadawatha`,
    template: `%s · ${BUSINESS.shortName}`,
  },
  description:
    'Certified petrol-vehicle repairs in Kadawatha since 2019. Engine diagnostics, servicing, brakes, electrical and transmission work with a 6-month parts warranty.',
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
