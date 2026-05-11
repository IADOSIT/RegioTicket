'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, MapPinIcon } from 'lucide-react';
import { formatFecha, formatMXN } from '@/lib/utils';

interface Evento {
  id: string; slug: string; nombre: string; lugar: string;
  fechaEvento: string; imagen?: string;
  categorias: { precio: number }[];
}

export function HeroCarousel({ eventos }: { eventos: Evento[] }) {
  const [idx, setIdx] = useState(0);
  const featured = eventos.slice(0, 5);

  const next = useCallback(() => setIdx((i) => (i + 1) % featured.length), [featured.length]);
  const prev = () => setIdx((i) => (i - 1 + featured.length) % featured.length);

  useEffect(() => {
    if (featured.length <= 1) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next, featured.length]);

  if (!featured.length) return null;

  const ev = featured[idx];
  const minPrecio = ev.categorias.length ? Math.min(...ev.categorias.map((c) => c.precio)) : 0;

  const GRADIENTS = [
    'from-green-900/80',
    'from-slate-900/80',
    'from-purple-900/80',
    'from-amber-900/80',
    'from-blue-900/80',
  ];

  return (
    <div className="relative h-[420px] md:h-[520px] overflow-hidden bg-slate-900 select-none">
      {/* Imagen de fondo */}
      {ev.imagen ? (
        <img src={ev.imagen} alt={ev.nombre} className="absolute inset-0 w-full h-full object-cover transition-all duration-700" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
      )}

      {/* Gradiente overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${GRADIENTS[idx % GRADIENTS.length]} to-transparent`} />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

      {/* Contenido */}
      <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-12">
        <div className="max-w-xl">
          <span className="inline-block bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wide">
            Próximo evento
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-3 drop-shadow-lg">
            {ev.nombre}
          </h2>
          <div className="flex flex-wrap gap-4 mb-5 text-sm text-white/80">
            <span className="flex items-center gap-1.5"><CalendarIcon size={14} />{formatFecha(ev.fechaEvento)}</span>
            <span className="flex items-center gap-1.5"><MapPinIcon size={14} />{ev.lugar}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/eventos/${ev.slug}`}
              className="bg-green-500 hover:bg-green-400 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm shadow-lg"
            >
              Comprar boletos
            </Link>
            {minPrecio > 0 && (
              <span className="bg-white/10 backdrop-blur text-white text-sm font-semibold px-4 py-3 rounded-xl border border-white/20">
                Desde {formatMXN(minPrecio)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Prev / Next */}
      {featured.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white transition-colors">
            <ChevronLeftIcon size={20} />
          </button>
          <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white transition-colors">
            <ChevronRightIcon size={20} />
          </button>
        </>
      )}

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {featured.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-green-400' : 'w-1.5 bg-white/40'}`} />
        ))}
      </div>
    </div>
  );
}
