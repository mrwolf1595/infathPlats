import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'مولد لوحات إنفاذ | Nafeth Board Generator',
  description: 'Generate large-format PDF auction boards (4m × 2m) for Nafeth platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
