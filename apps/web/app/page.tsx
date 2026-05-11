// Landing — eventos próximos y pasados
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { EventoCard } from '@/components/EventoCard';

async function getEventos(pasados = false) {
  const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/api/eventos${pasados ? '?pasados=1' : ''}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [proximos, pasados] = await Promise.all([getEventos(false), getEventos(true)]);

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-white py-16 px-4 border-b border-gray-100">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full mb-4">
              Nuevo León · 2026
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Tu boleto al mejor{' '}
              <span className="text-green-600">entretenimiento de NL</span>
            </h1>
            <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
              Palenques, bailes, conciertos y eventos masivos. Compra en línea o en taquilla.
            </p>
            <a
              href="#eventos"
              className="mt-6 inline-block bg-green-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Ver eventos
            </a>
          </div>
        </section>

        {/* Próximos eventos */}
        <section id="eventos" className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Eventos disponibles</h2>
          {proximos.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">No hay eventos disponibles en este momento.</p>
              <p className="text-sm mt-2">Vuelve pronto para ver la cartelera.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {proximos.map((evento: any) => (
                <EventoCard key={evento.id} evento={evento} />
              ))}
            </div>
          )}
        </section>

        {/* Eventos pasados */}
        {pasados.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-16">
            <div className="border-t border-gray-100 pt-10">
              <h2 className="text-xl font-bold text-gray-400 mb-6">Eventos pasados</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                {pasados.map((evento: any) => (
                  <EventoCard key={evento.id} evento={evento} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
