import Link from 'next/link';
import Image from 'next/image';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="RegioTicket" width={140} height={36} priority />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-green-600 transition-colors">Eventos</Link>
        </nav>
      </div>
    </header>
  );
}
