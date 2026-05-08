// Tarjeta de evento para el grid de la landing
import Link from 'next/link';
import Image from 'next/image';
import { formatFechaCorta, formatMXN } from '@/lib/utils';
import { Badge } from './ui/badge';
import { MapPinIcon, CalendarIcon } from 'lucide-react';

interface EventoCardProps {
  evento: {
    id: string;
    slug: string;
    nombre: string;
    lugar: string;
    fechaEvento: string;
    imagen?: string;
    estado: string;
    categorias: { precio: number }[];
  };
}

export function EventoCard({ evento }: EventoCardProps) {
  const minPrecio = Math.min(...(evento.categorias.map((c) => c.precio)));

  return (
    <Link href={`/eventos/${evento.slug}`} className="group block">
      <div className="rounded-xl border border-gray-200 overflow-hidden hover:border-green-300 transition-all hover:-translate-y-0.5">
        <div className="relative h-44 bg-gray-100">
          {evento.imagen ? (
            <Image src={evento.imagen} alt={evento.nombre} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-green-50">
              <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="6" fill="#dcfce7"/>
                <path d="M6 10h2.5c0-1.1.9-2 2-2s2 .9 2 2H19c.55 0 1 .45 1 1v2c-1.1 0-2 .9-2 2s.9 2 2 2v2c0 .55-.45 1-1 1H12.5c0 1.1-.9 2-2 2s-2-.9-2-2H6c-.55 0-1-.45-1-1V11c0-.55.45-1 1-1z" fill="#16a34a"/>
              </svg>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge variant="default">{evento.estado === 'ACTIVO' ? 'Disponible' : evento.estado}</Badge>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2 group-hover:text-green-700 transition-colors">{evento.nombre}</h3>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <CalendarIcon size={12} />
              <span>{formatFechaCorta(evento.fechaEvento)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPinIcon size={12} />
              <span className="truncate">{evento.lugar}</span>
            </div>
          </div>
          {evento.categorias.length > 0 && (
            <p className="mt-3 text-sm font-semibold text-green-600">
              Desde {formatMXN(minPrecio)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
