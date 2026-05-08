// Detalle del evento con categorías y SSE de stock
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatFecha, formatMXN } from '@/lib/utils';
import { api } from '@/lib/api';
import { MapPinIcon, CalendarIcon, ShoppingCartIcon } from 'lucide-react';

export default function EventoPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [evento, setEvento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState<Record<string, number>>({});

  const cargarEvento = useCallback(async () => {
    try {
      const data = await api.eventos.get(slug as string);
      setEvento(data);
      const s: Record<string, number> = {};
      data.categorias.forEach((c: any) => { s[c.id] = c.disponibles; });
      setStock(s);
    } catch {
      setEvento(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { cargarEvento(); }, [cargarEvento]);

  useEffect(() => {
    if (!evento) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
    const es = new EventSource(`${apiBase}/eventos/${evento.id}/stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.tipo === 'stock' && data.categorias) {
        const s: Record<string, number> = {};
        data.categorias.forEach((c: any) => { s[c.id] = c.disponibles; });
        setStock((prev) => ({ ...prev, ...s }));
      }
    };
    return () => es.close();
  }, [evento?.id]);

  if (loading) return (
    <>
      <Header />
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>
    </>
  );

  if (!evento) return (
    <>
      <Header />
      <div className="text-center py-20 text-gray-400"><p>Evento no encontrado.</p></div>
      <Footer />
    </>
  );

  return (
    <>
      <Header />
      <main>
        {/* Banner */}
        <div className="relative h-64 md:h-80 bg-gray-900 overflow-hidden">
          {evento.imagen && (
            <img src={evento.imagen} alt={evento.nombre} className="w-full h-full object-cover opacity-50" />
          )}
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 bg-gradient-to-t from-gray-900/80">
            <h1 className="text-3xl md:text-4xl font-bold text-white">{evento.nombre}</h1>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-sm text-gray-200">
                <CalendarIcon size={14} />{formatFecha(evento.fechaEvento)}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-200">
                <MapPinIcon size={14} />{evento.lugar}
              </span>
            </div>
          </div>
        </div>

        {/* Descripción y categorías */}
        <div className="max-w-4xl mx-auto px-4 py-10">
          {evento.descripcion && (
            <p className="text-gray-600 mb-8 text-base leading-relaxed">{evento.descripcion}</p>
          )}

          <div className="flex gap-2 mb-6">
            {evento.ventaOnline && <Badge variant="default">Venta en línea</Badge>}
            {evento.ventaTaquilla && <Badge variant="secondary">También en taquilla</Badge>}
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-4">Selecciona tu categoría</h2>

          <div className="grid gap-4">
            {evento.categorias.map((cat: any) => {
              const disponibles = stock[cat.id] ?? cat.disponibles;
              const agotado = disponibles <= 0 || !cat.activaOnline;
              return (
                <div key={cat.id} className="border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base">{cat.nombre}</h3>
                    <p className="text-2xl font-bold text-green-600 mt-1">{formatMXN(cat.precio)}</p>
                    <p className={`text-xs mt-1 ${agotado ? 'text-red-500' : 'text-gray-500'}`}>
                      {agotado ? 'Sin disponibilidad' : `${disponibles} disponibles`}
                    </p>
                  </div>
                  <Button
                    disabled={agotado}
                    onClick={() => router.push(`/checkout/${evento.id}?cat=${cat.id}`)}
                    size="lg"
                  >
                    {agotado ? 'Agotado' : (
                      <><ShoppingCartIcon size={16} className="mr-2" />Comprar</>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
