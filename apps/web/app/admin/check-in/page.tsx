'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { UsersIcon, CheckCircleIcon, TicketIcon, ActivityIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CheckInPage() {
  const { data: session } = useSession();
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventoId, setEventoId] = useState('');
  const [estado, setEstado] = useState<any>(null);
  const [accesosLive, setAccesosLive] = useState<any[]>([]);
  const token = (session?.user as any)?.apiToken;

  useEffect(() => {
    if (!token) return;
    api.admin.eventos.list(token).then((evs) => {
      setEventos(evs.filter((e: any) => e.estado === 'ACTIVO'));
    });
  }, [token]);

  useEffect(() => {
    if (!eventoId) return;
    setEstado(null);
    setAccesosLive([]);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
    const es = new EventSource(`${apiBase}/admin/check-in/${eventoId}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.tipo === 'init') {
        setEstado(data);
        setAccesosLive(data.accesos ?? []);
      }
      if (data.tipo === 'acceso') {
        setAccesosLive((prev) => [data, ...prev].slice(0, 100));
        setEstado((prev: any) => prev ? { ...prev, boletosUsados: (prev.boletosUsados ?? 0) + 1, boletosValidos: Math.max(0, (prev.boletosValidos ?? 0) - 1) } : prev);
      }
    };
    return () => es.close();
  }, [eventoId]);

  const totalVendidos = (estado?.boletosUsados ?? 0) + (estado?.boletosValidos ?? 0);
  const pctIngreso = totalVendidos > 0 ? Math.round(((estado?.boletosUsados ?? 0) / totalVendidos) * 100) : 0;
  const pctAforo = estado?.aforoTotal ? Math.round(((estado?.boletosUsados ?? 0) / estado.aforoTotal) * 100) : null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check-in en vivo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitoreo de accesos en tiempo real</p>
        </div>
        <select
          value={eventoId}
          onChange={(e) => setEventoId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">— Selecciona evento —</option>
          {eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
        </select>
      </div>

      {!eventoId && (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Selecciona un evento activo para monitorear accesos</div>
      )}

      {eventoId && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-gray-400 uppercase font-medium">Dentro</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{estado?.boletosUsados ?? '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">personas ingresaron</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-gray-400 uppercase font-medium">Pendientes</p>
                <p className="text-3xl font-bold text-gray-700 mt-1">{estado?.boletosValidos ?? '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">boletos sin usar</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-gray-400 uppercase font-medium">% Ingreso</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{pctIngreso}%</p>
                <p className="text-xs text-gray-400 mt-0.5">de boletos emitidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-gray-400 uppercase font-medium">Aforo</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{pctAforo !== null ? `${pctAforo}%` : '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{estado?.aforoTotal ? `de ${estado.aforoTotal}` : 'sin límite definido'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Barra global */}
          {totalVendidos > 0 && (
            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">Ingreso al evento</span>
                  <span className="text-gray-500">{estado?.boletosUsados ?? 0} / {totalVendidos} boletos ({pctIngreso}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${pctIngreso}%` }} />
                </div>
                {estado?.aforoTotal && (
                  <>
                    <div className="flex justify-between text-xs mt-2 text-gray-400">
                      <span>Aforo máximo: {estado.aforoTotal}</span>
                      <span>{pctAforo}% del aforo</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                      <div className={`h-full rounded-full transition-all duration-700 ${(pctAforo ?? 0) >= 90 ? 'bg-red-500' : (pctAforo ?? 0) >= 70 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(pctAforo ?? 0, 100)}%` }} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ocupación por categoría */}
          {estado?.categorias?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Disponibles por categoría</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {estado.categorias.map((c: any) => {
                    const vendidos = c.totalBoletos - c.disponibles;
                    const pct = c.totalBoletos > 0 ? Math.round((vendidos / c.totalBoletos) * 100) : 0;
                    return (
                      <div key={c.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{c.nombre}</span>
                          <span className="text-gray-500">{c.disponibles} disp. · {pct}% vendido</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feed de accesos en vivo */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <CardTitle className="text-sm font-semibold text-gray-700">Accesos en vivo</CardTitle>
            </CardHeader>
            <CardContent>
              {accesosLive.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Esperando accesos...</p>
              ) : (
                <div className="space-y-0 divide-y divide-gray-50 max-h-96 overflow-y-auto">
                  {accesosLive.map((a, i) => (
                    <div key={a.id ?? i} className={`flex items-center gap-3 py-2.5 ${i === 0 ? 'bg-green-50 -mx-1 px-1 rounded' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? 'bg-green-500' : 'bg-gray-100'}`}>
                        <CheckCircleIcon size={15} className={i === 0 ? 'text-white' : 'text-gray-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.compradorNombre ?? 'Cliente'}</p>
                        <p className="text-xs text-gray-400">#{a.numero} · {a.categoria}</p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(a.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
