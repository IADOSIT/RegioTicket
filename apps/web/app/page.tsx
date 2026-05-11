import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { EventoCard } from '@/components/EventoCard';
import { HeroCarousel } from '@/components/HeroCarousel';
import { CalendarIcon, MapPinIcon, ShieldCheckIcon, SmartphoneIcon, ZapIcon } from 'lucide-react';

async function getEventos(pasados = false) {
  const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/api/eventos${pasados ? '?pasados=1' : ''}`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export default async function HomePage() {
  const [proximos, pasados] = await Promise.all([getEventos(false), getEventos(true)]);

  return (
    <>
      <Header />
      <main className="bg-slate-50 min-h-screen">

        {/* Hero Carousel */}
        {proximos.length > 0 && <HeroCarousel eventos={proximos} />}

        {/* Hero vacío */}
        {proximos.length === 0 && (
          <section className="bg-slate-950 py-20 px-4">
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block text-xs font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1 rounded-full mb-4">Nuevo León · 2026</span>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4">
                Tu boleto al mejor<br /><span className="text-green-400">entretenimiento de NL</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8">
                Palenques, bailes, conciertos y eventos masivos. Compra en línea o en taquilla.
              </p>
            </div>
          </section>
        )}

        {/* Features strip */}
        <div className="bg-green-600">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-center gap-6 md:gap-12">
            {[
              [ZapIcon, 'Compra en segundos'],
              [ShieldCheckIcon, 'Pago 100% seguro'],
              [SmartphoneIcon, 'Boleto en tu celular'],
              [CalendarIcon, 'Eventos para todos'],
            ].map(([Icon, label]: any) => (
              <div key={label} className="flex items-center gap-2 text-white text-sm font-medium">
                <Icon size={15} />{label}
              </div>
            ))}
          </div>
        </div>

        {/* Próximos eventos */}
        <section id="eventos" className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Eventos disponibles</h2>
              <p className="text-slate-500 text-sm mt-0.5">{proximos.length} evento{proximos.length !== 1 ? 's' : ''} próximo{proximos.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {proximos.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <CalendarIcon size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-lg font-semibold text-slate-400">No hay eventos disponibles en este momento</p>
              <p className="text-sm text-slate-400 mt-1">Vuelve pronto para ver la cartelera</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {proximos.map((evento: any) => (
                <EventoCard key={evento.id} evento={evento} />
              ))}
            </div>
          )}
        </section>

        {/* Eventos pasados */}
        {pasados.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 pb-16">
            <div className="border-t border-slate-200 pt-10">
              <h2 className="text-lg font-bold text-slate-400 mb-5 uppercase tracking-wide text-sm">Eventos pasados</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {pasados.map((evento: any) => (
                  <EventoCard key={evento.id} evento={evento} pasado />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Banner */}
        <section className="bg-slate-900 py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
              ¿Organizas eventos en Nuevo León?
            </h2>
            <p className="text-slate-400 mb-6">Vende boletos en línea y en taquilla, gestiona mesas y controla accesos desde un solo panel.</p>
            <a href="/admin" className="inline-block bg-green-500 hover:bg-green-400 text-white font-bold px-8 py-3 rounded-xl transition-colors">
              Acceder al panel →
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
