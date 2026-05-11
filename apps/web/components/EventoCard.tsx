import Link from 'next/link';
import { formatFechaCorta, formatMXN } from '@/lib/utils';
import { MapPinIcon, CalendarIcon, TicketIcon } from 'lucide-react';

interface EventoCardProps {
  evento: {
    id: string; slug: string; nombre: string; lugar: string;
    fechaEvento: string; imagen?: string; estado: string;
    categorias: { precio: number }[];
  };
  pasado?: boolean;
}

export function EventoCard({ evento, pasado }: EventoCardProps) {
  const precios = evento.categorias.map((c) => c.precio);
  const minPrecio = precios.length ? Math.min(...precios) : 0;
  const fecha = new Date(evento.fechaEvento);
  const dia = fecha.getDate();
  const mes = fecha.toLocaleString('es-MX', { month: 'short' }).toUpperCase();

  return (
    <Link href={`/eventos/${evento.slug}`} className="group block">
      <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${pasado ? 'opacity-60 grayscale' : ''}`}>
        {/* Imagen */}
        <div className="relative h-48 bg-slate-100 overflow-hidden">
          {evento.imagen ? (
            <img src={evento.imagen} alt={evento.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-green-700 to-slate-800 flex items-center justify-center">
              <TicketIcon size={48} className="text-white/30" />
            </div>
          )}

          {/* Fecha badge */}
          <div className="absolute top-3 left-3 bg-white rounded-xl px-2.5 py-1.5 text-center shadow-lg min-w-[46px]">
            <p className="text-xs font-bold text-green-600 leading-none">{mes}</p>
            <p className="text-lg font-extrabold text-slate-900 leading-tight">{dia}</p>
          </div>

          {/* Estado */}
          {!pasado && (
            <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
              Disponible
            </div>
          )}
          {pasado && (
            <div className="absolute top-3 right-3 bg-slate-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">
              Finalizado
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-green-700 transition-colors mb-2">
            {evento.nombre}
          </h3>
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPinIcon size={11} className="text-green-500 shrink-0" />
              <span className="truncate">{evento.lugar}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarIcon size={11} className="text-green-500 shrink-0" />
              <span>{formatFechaCorta(evento.fechaEvento)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {minPrecio > 0 ? (
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">Desde</span>
                <p className="text-lg font-extrabold text-green-600">{formatMXN(minPrecio)}</p>
              </div>
            ) : <div />}
            <span className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 group-hover:bg-green-600 group-hover:text-white transition-colors">
              Ver boletos →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
