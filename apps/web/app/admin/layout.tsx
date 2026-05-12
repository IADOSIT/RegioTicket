'use client';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboardIcon, CalendarIcon, UsersIcon, QrCodeIcon,
  LogOutIcon, SettingsIcon, BuildingIcon, WrenchIcon, MenuIcon, XIcon,
  ActivityIcon, TagIcon, ShoppingBagIcon,
} from 'lucide-react';
import { SessionProvider } from 'next-auth/react';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated' && pathname !== '/admin/login') router.push('/admin/login');
  }, [status, router, pathname]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (pathname === '/admin/login') return <>{children}</>;

  if (status === 'loading' || !session) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const rol = (session.user as any)?.rol;
  const isSuperAdmin = rol === 'SUPER_ADMIN';

  const links = [
    { href: '/admin/dashboard',            label: 'Dashboard',       icon: LayoutDashboardIcon },
    { href: '/admin/eventos',              label: 'Eventos',         icon: CalendarIcon },
    { href: '/admin/pos',                  label: 'Punto de venta',  icon: ShoppingBagIcon },
    { href: '/admin/check-in',             label: 'Check-in live',   icon: ActivityIcon },
    { href: '/admin/codigos-promo',        label: 'Códigos promo',   icon: TagIcon },
    { href: '/admin/usuarios',             label: 'Usuarios',        icon: UsersIcon },
    { href: '/admin/validacion',           label: 'Validación QR',   icon: QrCodeIcon },
    { href: '/admin/configuracion-empresa',label: 'Config. Empresa', icon: WrenchIcon },
    ...(isSuperAdmin ? [
      { href: '/admin/empresas',     label: 'Empresas',       icon: BuildingIcon },
      { href: '/admin/configuracion',label: 'Config. Sistema', icon: SettingsIcon },
    ] : []),
  ];

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-white">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-green-600">RegioTicket</p>
          <p className="text-xs text-gray-400">{isSuperAdmin ? 'Super Admin' : 'Admin'}</p>
        </div>
        <button className="md:hidden text-gray-400 hover:text-gray-600 p-1" onClick={() => setSidebarOpen(false)}>
          <XIcon size={18} />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith(href) ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <div className="px-3 py-2 text-xs text-gray-500 truncate">{(session.user as any)?.email}</div>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <LogOutIcon size={16} />Salir
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar desktop */}
      <div className="hidden md:flex md:flex-col md:w-56 md:shrink-0 border-r border-gray-200">
        <Sidebar />
      </div>

      {/* Sidebar mobile drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-200 flex flex-col transform transition-transform duration-200 md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">
            <MenuIcon size={22} />
          </button>
          <span className="text-base font-bold text-green-600">RegioTicket</span>
        </div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider><AdminLayoutInner>{children}</AdminLayoutInner></SessionProvider>;
}
