import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ascii-studio',
  description: 'audio-visual ASCII art studio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
