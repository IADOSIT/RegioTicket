'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { SearchIcon, MenuIcon, XIcon, LockIcon, TicketIcon } from 'lucide-react';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-slate-950 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 flex items-center gap-2">
          <Image src="/logo-white.png" alt="RegioTicket" width={130} height={34} priority className="h-8 w-auto" />
        </Link>

        {/* Search bar */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <div className="relative">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar eventos, artistas, lugares…"
              className="w-full bg-slate-800 text-white placeholder-slate-400 pl-9 pr-4 py-2 rounded-lg text-sm border border-slate-700 focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 ml-auto">
          <Link href="/" className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5">
            <TicketIcon size={15} />Eventos
          </Link>
          <Link href="/admin" className="ml-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-2 transition-colors">
            <LockIcon size={12} />Admin
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button className="md:hidden ml-auto p-2 text-slate-400" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-3 space-y-2">
          <div className="relative mb-3">
            <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Buscar eventos…" className="w-full bg-slate-800 text-white placeholder-slate-400 pl-9 pr-4 py-2 rounded-lg text-sm border border-slate-700 focus:outline-none" />
          </div>
          <Link href="/" className="block px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg">Eventos</Link>
          <Link href="/admin" className="block px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">Panel Admin</Link>
        </div>
      )}
    </header>
  );
}
