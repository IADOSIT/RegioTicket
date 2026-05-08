// Layout de taquilla — dark mode, navegación inferior
'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCartIcon, ClockIcon, QrCodeIcon, LogOutIcon } from 'lucide-react';

export default function TaquillaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('taquilla_token');
    if (!token && !pathname.includes('/login')) router.push('/taquilla/login');
  }, []);

  function salir() {
    localStorage.removeItem('taquilla_token');
    localStorage.removeItem('taquilla_usuario');
    router.push('/taquilla/login');
  }

  if (!mounted) return null;
  if (pathname.includes('/login')) return <>{children}</>;

  const links = [
    { href: '/taquilla/pos', label: 'Venta', icon: ShoppingCartIcon },
    { href: '/taquilla/historial', label: 'Historial', icon: ClockIcon },
    { href: '/taquilla/validacion', label: 'Validar', icon: QrCodeIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-4 h-14 flex items-center justify-between">
        <p className="text-green-400 font-bold text-lg">RegioTicket · Taquilla</p>
        <button onClick={salir} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm">
          <LogOutIcon size={16} />Salir
        </button>
      </header>
      <main className="flex-1 overflow-auto pb-16">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 h-14 flex items-center">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${pathname === href ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Icon size={20} />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
