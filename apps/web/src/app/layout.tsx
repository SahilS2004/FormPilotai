import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FormPilot AI - Context Engine & Operations Dashboard',
  description: 'Context-Aware AI Form Filler & Multi-Agent Operations Copilot',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}
