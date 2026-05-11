// Layout raíz — fuente Inter, metadata global
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RegioTicket — Boletos para eventos en Nuevo León',
  description: 'Compra boletos para palenques, bailes, conciertos y eventos masivos en Nuevo León. Plataforma de iaDoS.',
  keywords: 'boletos, eventos, Nuevo León, Monterrey, palenque, conciertos',
  icons: {
    icon: [
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: { url: '/favicon-192.png', sizes: '192x192' },
    shortcut: '/favicon-48.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-gray-900 font-sans antialiased">{children}</body>
    </html>
  );
}
