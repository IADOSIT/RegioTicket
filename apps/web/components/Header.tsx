'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { SearchIcon, MenuIcon, XIcon, LockIcon, TicketIcon } from 'lucide-react';

interface HeaderProps {
  empresaNombre?: string;
  empresaLogo?: string;
  color?: string;
}

export function Header({ empresaNombre, empresaLogo, color = '#0f172a' }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const bg = empresaNombre ? color : '#0f172a';

  return (
    <header className="sticky top-0 z-50 text-white shadow-lg" style={{ backgroundColor: bg }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link href="/" className="flex-shrink-0 flex items-center gap-2">
          {empresaLogo ? (
            <img src={empresaLogo} alt={empresaNombre} className="h-9 w-auto rounded-xl object-contain bg-white/10 p-0.5" />
          ) : (
            <Image src="/logo.svg" alt="RegioTicket" width={36} height={36} priority className="h-9 w-auto rounded-lg" />
          )}
          <span className="text-white font-extrabold text-lg tracking-tight hidden sm:block">
            {empresaNombre || <><span>Regio</span><span className="text-green-400">Ticket</span></>}
          </span>
        </Link>

        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <div className="relative">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              placeholder="Buscar eventos…"
              className="w-full bg-white/10 text-white placeholder-white/40 pl-9 pr-4 py-2 rounded-lg text-sm border border-white/20 focus:outline-none focus:border-white/40 transition-colors"
            />
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 ml-auto">
          <Link href="/" className="px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5">
            <TicketIcon size={15} />Eventos
          </Link>
          <Link href="/mis-boletos" className="px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5">
            Mis boletos
          </Link>
          {!empresaNombre && (
            <Link href="/admin" className="ml-2 flex items-center gap-1.5 text-xs text-white/50 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-2 transition-colors">
              <LockIcon size={12} />Admin
            </Link>
          )}
        </nav>

        <button className="md:hidden ml-auto p-2 text-white/60" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 px-4 py-3 space-y-1" style={{ backgroundColor: bg }}>
          <div className="relative mb-3">
            <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input type="search" placeholder="Buscar eventos…" className="w-full bg-white/10 text-white placeholder-white/40 pl-9 pr-4 py-2 rounded-lg text-sm border border-white/20 focus:outline-none" />
          </div>
          <Link href="/" className="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg">Eventos</Link>
          <Link href="/mis-boletos" className="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg">Mis boletos</Link>
          {!empresaNombre && (
            <Link href="/admin" className="block px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/10 rounded-lg">Panel Admin</Link>
          )}
        </div>
      )}
    </header>
  );
}
