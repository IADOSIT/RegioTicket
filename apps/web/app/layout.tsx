// Layout raíz — fuente Inter, metadata global
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RegioTicket — Boletos para eventos en Nuevo León',
  description: 'Compra boletos para palenques, bailes, conciertos y eventos masivos en Nuevo León. Plataforma de iaDoS.',
  keywords: 'boletos, eventos, Nuevo León, Monterrey, palenque, conciertos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-gray-900 font-sans antialiased">{children}</body>
    </html>
  );
}
