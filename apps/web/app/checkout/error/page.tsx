'use client';
// Página de error post-pago
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { XCircleIcon } from 'lucide-react';

export default function ErrorPagoPage() {
  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 py-20 text-center">
        <XCircleIcon size={64} className="text-red-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900">Pago no completado</h1>
        <p className="text-gray-500 mt-3 text-base">
          El pago fue rechazado o cancelado. No se realizó ningún cargo.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link href="/" className="inline-block border border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors">
            Ver eventos
          </Link>
          <button onClick={() => window.history.back()} className="inline-block bg-green-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
            Intentar de nuevo
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
