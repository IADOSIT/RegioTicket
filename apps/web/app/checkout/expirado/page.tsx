// Página de sesión de checkout expirada
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ClockIcon } from 'lucide-react';

export default function ExpiradoPage() {
  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 py-20 text-center">
        <ClockIcon size={64} className="text-amber-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900">Tiempo expirado</h1>
        <p className="text-gray-500 mt-3 text-base">
          Tu reserva de boletos expiró. Los boletos están disponibles de nuevo.
        </p>
        <Link href="/" className="mt-8 inline-block bg-green-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-green-700 transition-colors">
          Volver a intentarlo
        </Link>
      </main>
      <Footer />
    </>
  );
}
