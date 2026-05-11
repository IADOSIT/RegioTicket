// Layout del panel admin con sidebar
'use client';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboardIcon, CalendarIcon, UsersIcon, QrCodeIcon, LogOutIcon, SettingsIcon } from 'lucide-react';
import { SessionProvider } from 'next-auth/react';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated' && pathname !== '/admin/login') router.push('/admin/login');
  }, [status, router, pathname]);

  // La página de login no necesita sesión — renderizarla directamente
  if (pathname === '/admin/login') return <>{children}</>;

  if (status === 'loading' || !session) return (
    <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>
  );

  const links = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
    { href: '/admin/eventos', label: 'Eventos', icon: CalendarIcon },
    { href: '/admin/usuarios', label: 'Usuarios', icon: UsersIcon },
    { href: '/admin/validacion', label: 'Validación QR', icon: QrCodeIcon },
    { href: '/admin/configuracion', label: 'Configuración', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <p className="text-lg font-bold text-green-600">RegioTicket</p>
          <p className="text-xs text-gray-400">Admin</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname.startsWith(href) ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="px-3 py-2 text-xs text-gray-500 truncate">{(session.user as any)?.email}</div>
          <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <LogOutIcon size={16} />Salir
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider><AdminLayoutInner>{children}</AdminLayoutInner></SessionProvider>;
}
