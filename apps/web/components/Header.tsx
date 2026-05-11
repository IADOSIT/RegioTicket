import Link from 'next/link';
import Image from 'next/image';
import { LockIcon } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="RegioTicket" width={140} height={36} priority />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-green-600 transition-colors">Eventos</Link>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <LockIcon size={12} />Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
