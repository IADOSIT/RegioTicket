// Página de éxito post-pago MercadoPago
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CheckCircleIcon } from 'lucide-react';

export default function GraciasPage() {
  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 py-20 text-center">
        <CheckCircleIcon size={64} className="text-green-600 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900">¡Compra exitosa!</h1>
        <p className="text-gray-500 mt-3 text-base">
          Tu boleto fue procesado. Revisa tu correo electrónico, te enviamos el PDF con tu código QR.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Si no recibes el email en los próximos minutos, revisa tu carpeta de spam.
        </p>
        <Link href="/" className="mt-8 inline-block bg-green-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-green-700 transition-colors">
          Ver más eventos
        </Link>
      </main>
      <Footer />
    </>
  );
}
