import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FormPilot AI | Intelligent Context-Aware Form Filling Platform by InnovChromatic',
  description: 'Autonomous AI form filling copilot powered by your verified knowledge base documents and universal DOM reasoning. An InnovChromatic product.',
  creator: 'InnovChromatic',
  publisher: 'InnovChromatic',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('formpilot_theme');
                  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 dark:bg-[#080E21] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
