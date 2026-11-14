import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FormPilot AI | Intelligent Context-Aware Form Filling Platform',
  description: 'Autonomous AI form filling copilot powered by your verified knowledge base documents and universal DOM reasoning.',
  icons: {
    icon: '/brand/logo-mark.png',
    apple: '/brand/logo-mark.png',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        {children}
      </body>
    </html>
  );
}
