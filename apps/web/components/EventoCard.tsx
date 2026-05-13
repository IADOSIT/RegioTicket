'use client';
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
  tema?: 'aurora' | 'nebula' | 'regio';
  color?: string;
}

export function EventoCard({ evento, pasado, tema = 'aurora', color = '#16a34a' }: EventoCardProps) {
  const precios = evento.categorias.map((c) => c.precio);
  const minPrecio = precios.length ? Math.min(...precios) : 0;
  const fecha = new Date(evento.fechaEvento);
  const dia = fecha.getDate();
  const mes = fecha.toLocaleString('es-MX', { month: 'short' }).toUpperCase();

  // ── NEBULA ─────────────────────────────────────────────────────────
  if (tema === 'nebula') {
    return (
      <Link href={`/eventos/${evento.slug}`} className="group block">
        <div
          className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${pasado ? 'opacity-40 grayscale' : 'hover:-translate-y-1'}`}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid rgba(255,255,255,0.08)`,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          {/* Imagen */}
          <div className="relative h-44 overflow-hidden">
            {evento.imagen ? (
              <img src={evento.imagen} alt={evento.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-75" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}33 0%, #0a0a1a 100%)` }}>
                <TicketIcon size={44} className="opacity-20" style={{ color }} />
              </div>
            )}
            {/* Glow overlay on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(to top, ${color}22, transparent)` }} />
            {/* Fecha badge */}
            <div className="absolute top-3 left-3 rounded-xl px-2.5 py-1.5 text-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: `1px solid ${color}55`, minWidth: '42px' }}>
              <p className="text-xs font-bold leading-none" style={{ color }}>{mes}</p>
              <p className="text-lg font-extrabold text-white leading-tight">{dia}</p>
            </div>
            {!pasado && (
              <div className="absolute top-3 right-3 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide" style={{ background: `${color}cc`, backdropFilter: 'blur(4px)' }}>
                Disponible
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4">
            <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 mb-2 group-hover:opacity-80 transition-opacity">
              {evento.nombre}
            </h3>
            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPinIcon size={11} style={{ color }} className="shrink-0" />
                <span className="truncate">{evento.lugar}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <CalendarIcon size={11} style={{ color }} className="shrink-0" />
                <span>{formatFechaCorta(evento.fechaEvento)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {minPrecio > 0 ? (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide">Desde</span>
                  <p className="text-base font-extrabold" style={{ color }}>{formatMXN(minPrecio)}</p>
                </div>
              ) : <div />}
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all" style={{ background: `${color}20`, color, border: `1px solid ${color}44`, }}>
                Ver boletos →
              </span>
            </div>
          </div>

          {/* Bottom glow line on hover */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
        </div>
      </Link>
    );
  }

  // ── REGIO ──────────────────────────────────────────────────────────
  if (tema === 'regio') {
    return (
      <Link href={`/eventos/${evento.slug}`} className="group block">
        <div
          className={`relative overflow-hidden transition-all duration-200 ${pasado ? 'opacity-40 grayscale' : 'hover:translate-x-0.5 hover:-translate-y-0.5'}`}
          style={{
            background: '#1a1a1a',
            borderTop: `4px solid ${color}`,
            borderLeft: '1px solid #2a2a2a',
            borderRight: '1px solid #2a2a2a',
            borderBottom: '1px solid #2a2a2a',
          }}
        >
          {/* Imagen */}
          <div className="relative h-44 overflow-hidden">
            {evento.imagen ? (
              <img src={evento.imagen} alt={evento.nombre} className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 brightness-80" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#111' }}>
                <TicketIcon size={44} className="opacity-15 text-white" />
              </div>
            )}
            {/* Fecha badge — sharp */}
            <div className="absolute top-0 left-0 px-3 py-2 text-center" style={{ background: color, minWidth: '52px' }}>
              <p className="text-[9px] font-black text-white/80 leading-none uppercase">{mes}</p>
              <p className="text-xl font-black text-white leading-tight">{dia}</p>
            </div>
            {!pasado && (
              <div className="absolute top-3 right-3 bg-black/70 text-white text-[9px] font-black px-2 py-1 uppercase tracking-widest border" style={{ borderColor: color }}>
                Disponible
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4">
            <h3 className="font-black text-white text-sm uppercase leading-snug line-clamp-2 mb-2 tracking-wide">
              {evento.nombre}
            </h3>
            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wide">
                <MapPinIcon size={10} style={{ color }} className="shrink-0" />
                <span className="truncate">{evento.lugar}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wide">
                <CalendarIcon size={10} style={{ color }} className="shrink-0" />
                <span>{formatFechaCorta(evento.fechaEvento)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #2a2a2a' }}>
              {minPrecio > 0 ? (
                <div>
                  <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Desde</span>
                  <p className="text-base font-black" style={{ color }}>{formatMXN(minPrecio)}</p>
                </div>
              ) : <div />}
              <span className="text-[10px] font-black px-3 py-2 uppercase tracking-widest transition-colors text-black" style={{ background: color }}>
                Ver →
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── AURORA (default) ───────────────────────────────────────────────
  return (
    <Link href={`/eventos/${evento.slug}`} className="group block">
      <div className={`bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ${pasado ? 'opacity-60 grayscale' : ''}`} style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
        {/* Imagen */}
        <div className="relative h-48 bg-slate-50 overflow-hidden">
          {evento.imagen ? (
            <img src={evento.imagen} alt={evento.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)` }}>
              <TicketIcon size={48} style={{ color: `${color}40` }} />
            </div>
          )}

          {/* Fecha badge */}
          <div className="absolute top-3 left-3 bg-white rounded-2xl px-2.5 py-1.5 text-center shadow-lg min-w-[46px]">
            <p className="text-xs font-bold leading-none" style={{ color }}>{mes}</p>
            <p className="text-xl font-extrabold text-slate-900 leading-tight">{dia}</p>
          </div>

          {!pasado && (
            <div className="absolute top-3 right-3 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide" style={{ background: color }}>
              Disponible
            </div>
          )}
          {pasado && (
            <div className="absolute top-3 right-3 bg-slate-400 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
              Finalizado
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 mb-2 transition-colors" style={{ ['--tw-text-opacity' as any]: 1 }}>
            <span className="group-hover:opacity-70 transition-opacity">{evento.nombre}</span>
          </h3>
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPinIcon size={11} style={{ color }} className="shrink-0" />
              <span className="truncate">{evento.lugar}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarIcon size={11} style={{ color }} className="shrink-0" />
              <span>{formatFechaCorta(evento.fechaEvento)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {minPrecio > 0 ? (
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">Desde</span>
                <p className="text-lg font-extrabold" style={{ color }}>{formatMXN(minPrecio)}</p>
              </div>
            ) : <div />}
            <span className="text-xs font-semibold px-4 py-2 rounded-full transition-colors border" style={{ borderColor: color, color, background: 'transparent' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = color; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = color; }}
            >
              Ver boletos →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
