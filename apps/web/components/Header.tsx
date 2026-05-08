// Header público con logo RegioTicket
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="6" fill="#16a34a"/>
            <path d="M6 10h2.5c0-1.1.9-2 2-2s2 .9 2 2H19c.55 0 1 .45 1 1v2c-1.1 0-2 .9-2 2s.9 2 2 2v2c0 .55-.45 1-1 1H12.5c0 1.1-.9 2-2 2s-2-.9-2-2H6c-.55 0-1-.45-1-1V11c0-.55.45-1 1-1z" fill="white"/>
          </svg>
          <span className="text-xl font-bold text-green-600">RegioTicket</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-green-600 transition-colors">Eventos</Link>
        </nav>
      </div>
    </header>
  );
}
