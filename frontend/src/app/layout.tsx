import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NexMonitor - Real-time Multi-Server Monitoring System',
  description: 'High-performance real-time telemetry dashboard for Windows and Linux servers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
