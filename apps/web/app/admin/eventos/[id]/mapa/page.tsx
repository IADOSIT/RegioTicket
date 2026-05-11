'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { SaveIcon, Trash2Icon, RotateCcwIcon, MousePointerIcon } from 'lucide-react';
import { api } from '@/lib/api';

type TipoElem = 'ESCENARIO' | 'MESA_4' | 'MESA_6' | 'MESA_8' | 'MESA_10' | 'ZONA_GENERAL' | 'BARRA' | 'PASILLO';

interface Elemento {
  id: string; tipo: TipoElem;
  x: number; y: number; w: number; h: number;
  label: string; categoriaId?: string; color: string;
}

const TIPOS: { tipo: TipoElem; label: string; color: string; w: number; h: number; icon: string }[] = [
  { tipo: 'ESCENARIO',    label: 'Escenario',   color: '#6366f1', w: 200, h: 70,  icon: '🎤' },
  { tipo: 'MESA_4',       label: 'Mesa 4 p.',   color: '#16a34a', w: 60,  h: 60,  icon: '🪑' },
  { tipo: 'MESA_6',       label: 'Mesa 6 p.',   color: '#0ea5e9', w: 70,  h: 70,  icon: '🪑' },
  { tipo: 'MESA_8',       label: 'Mesa 8 p.',   color: '#f59e0b', w: 80,  h: 80,  icon: '🪑' },
  { tipo: 'MESA_10',      label: 'Mesa 10 p.',  color: '#ef4444', w: 90,  h: 90,  icon: '🪑' },
  { tipo: 'ZONA_GENERAL', label: 'Zona Gral.',  color: '#8b5cf6', w: 180, h: 120, icon: '👥' },
  { tipo: 'BARRA',        label: 'Barra/Bar',   color: '#78716c', w: 120, h: 40,  icon: '🍺' },
  { tipo: 'PASILLO',      label: 'Pasillo',     color: '#94a3b8', w: 30,  h: 150, icon: '↕' },
];

const isMesa = (t: TipoElem) => t.startsWith('MESA_');

let nextId = 1;
const uid = () => String(nextId++);

export default function MapaPage() {
  const { id: eventoId } = useParams();
  const { data: session } = useSession();
  const token = (session?.user as any)?.apiToken;

  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [tipoActivo, setTipoActivo] = useState<TipoElem | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null);

  const W = 900, H = 600;

  useEffect(() => {
    if (!token) return;
    api.admin.categorias.list(eventoId as string, token).then(setCategorias);
    api.admin.mapa.get(eventoId as string, token)
      .then((m: any) => { if (m?.elementos) setElementos(m.elementos); })
      .catch(() => {});
  }, [token, eventoId]);

  const svgPoint = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleSvgClick = (e: React.MouseEvent) => {
    if (!tipoActivo || dragging.current) return;
    if ((e.target as Element).closest('[data-elem]')) return;
    const { x, y } = svgPoint(e);
    const def = TIPOS.find((t) => t.tipo === tipoActivo)!;
    const elem: Elemento = {
      id: uid(), tipo: tipoActivo,
      x: x - def.w / 2, y: y - def.h / 2,
      w: def.w, h: def.h,
      label: isMesa(tipoActivo) ? `M${nextId - 1}` : def.label,
      color: def.color,
    };
    setElementos((p) => [...p, elem]);
    setSeleccionado(elem.id);
  };

  const startDrag = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { x, y } = svgPoint(e);
    const el = elementos.find((el) => el.id === id)!;
    dragging.current = { id, ox: x - el.x, oy: y - el.y };
    setSeleccionado(id);
    setTipoActivo(null);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const { x, y } = svgPoint(e);
    const { id, ox, oy } = dragging.current;
    setElementos((p) => p.map((el) => el.id === id ? { ...el, x: Math.max(0, x - ox), y: Math.max(0, y - oy) } : el));
  };

  const onMouseUp = () => { dragging.current = null; };

  const eliminar = () => {
    if (!seleccionado) return;
    setElementos((p) => p.filter((el) => el.id !== seleccionado));
    setSeleccionado(null);
  };

  const setCatElem = (catId: string) => {
    if (!seleccionado) return;
    setElementos((p) => p.map((el) => el.id === seleccionado ? { ...el, categoriaId: catId } : el));
  };

  const setLabelElem = (label: string) => {
    if (!seleccionado) return;
    setElementos((p) => p.map((el) => el.id === seleccionado ? { ...el, label } : el));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await api.admin.mapa.save(eventoId as string, { elementos }, token);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    } finally { setGuardando(false); }
  };

  const selEl = elementos.find((el) => el.id === seleccionado);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-3 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Elementos</p>
          <div className="space-y-1">
            <button
              onClick={() => setTipoActivo(null)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${!tipoActivo ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <MousePointerIcon size={13} />Seleccionar
            </button>
          </div>
        </div>
        <div className="p-3 space-y-1 flex-1">
          {TIPOS.map((t) => (
            <button
              key={t.tipo}
              onClick={() => setTipoActivo(t.tipo)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors text-left ${tipoActivo === t.tipo ? 'text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
              style={tipoActivo === t.tipo ? { backgroundColor: t.color } : {}}
            >
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Properties panel */}
        {selEl && (
          <div className="p-3 border-t border-gray-100 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Propiedades</p>
            <div>
              <label className="text-xs text-gray-500">Etiqueta</label>
              <input
                className="w-full border border-gray-200 rounded px-2 py-1 text-xs mt-0.5"
                value={selEl.label}
                onChange={(e) => setLabelElem(e.target.value)}
              />
            </div>
            {isMesa(selEl.tipo) && categorias.length > 0 && (
              <div>
                <label className="text-xs text-gray-500">Categoría</label>
                <select
                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs mt-0.5"
                  value={selEl.categoriaId ?? ''}
                  onChange={(e) => setCatElem(e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre} — ${c.precio}</option>)}
                </select>
              </div>
            )}
            <button onClick={eliminar} className="w-full flex items-center justify-center gap-1 text-xs text-red-500 hover:bg-red-50 py-1.5 rounded border border-red-200 transition-colors">
              <Trash2Icon size={12} />Eliminar
            </button>
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-700">
            {tipoActivo ? `Haz clic en el canvas para colocar: ${TIPOS.find(t => t.tipo === tipoActivo)?.label}` : 'Haz clic en un elemento para seleccionarlo y arrastrarlo'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setElementos([]); setSeleccionado(null); }}>
              <RotateCcwIcon size={14} className="mr-1" />Limpiar
            </Button>
            <Button size="sm" onClick={guardar} disabled={guardando}>
              <SaveIcon size={14} className="mr-1" />
              {guardado ? '¡Guardado!' : guardando ? 'Guardando…' : 'Guardar mapa'}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          <div className="inline-block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ cursor: tipoActivo ? 'crosshair' : 'default' }}>
            <svg
              ref={svgRef}
              width={W} height={H}
              onClick={handleSvgClick}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              style={{ display: 'block' }}
            >
              {/* Grid */}
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={W} height={H} fill="url(#grid)" />

              {/* Elementos */}
              {elementos.map((el) => {
                const isSelected = el.id === seleccionado;
                const isMesaEl = isMesa(el.tipo);
                const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
                const r = el.w / 2;

                return (
                  <g key={el.id} data-elem={el.id}
                    onMouseDown={(e) => startDrag(e, el.id)}
                    style={{ cursor: 'grab' }}
                  >
                    {isMesaEl ? (
                      <>
                        <circle cx={cx} cy={cy} r={r} fill={el.color} fillOpacity={0.2} stroke={el.color} strokeWidth={isSelected ? 3 : 1.5} />
                        {/* Sillas decorativas */}
                        {Array.from({ length: parseInt(el.tipo.split('_')[1]) }).map((_, i) => {
                          const n = parseInt(el.tipo.split('_')[1]);
                          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
                          const sx = cx + (r + 8) * Math.cos(angle);
                          const sy = cy + (r + 8) * Math.sin(angle);
                          return <circle key={i} cx={sx} cy={sy} r={5} fill={el.color} opacity={0.7} />;
                        })}
                      </>
                    ) : (
                      <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={6} fill={el.color} fillOpacity={0.15} stroke={el.color} strokeWidth={isSelected ? 3 : 1.5} />
                    )}
                    <text x={isMesaEl ? cx : el.x + el.w / 2} y={isMesaEl ? cy + 4 : el.y + el.h / 2 + 4} textAnchor="middle" fontSize={11} fontWeight="600" fill={el.color}>
                      {el.label}
                    </text>
                    {isSelected && (
                      <rect x={el.x - 2} y={el.y - 2} width={el.w + 4} height={el.h + 4} rx={8} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5,3" />
                    )}
                  </g>
                );
              })}

              {/* Leyenda */}
              <text x={10} y={H - 8} fontSize={10} fill="#94a3b8">RegioTicket · Editor de Mapa — {elementos.filter(e => isMesa(e.tipo)).length} mesas · {elementos.length} elementos</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
