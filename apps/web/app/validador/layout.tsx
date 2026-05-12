import { SessionProvider } from 'next-auth/react';

export const metadata = { title: 'Validación QR — RegioTicket' };

export default function ValidadorLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
