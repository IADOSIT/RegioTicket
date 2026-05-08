// Dashboard admin con métricas SSE y gráfica recharts
'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMXN, timeAgo } from '@/lib/utils';
import { api } from '@/lib/api';
import { TrendingUpIcon, TicketIcon, DollarSignIcon, BarChart2Icon } from 'lucide-react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<string>('');
  const [metricas, setMetricas] = useState<any>(null);

  const token = (session?.user as any)?.apiToken;

  useEffect(() => {
    if (!token) return;
    api.admin.eventos.list(token).then((evs) => {
      setEventos(evs);
      if (evs.length > 0) setEventoSeleccionado(evs[0].id);
    });
  }, [token]);

  useEffect(() => {
    if (!eventoSeleccionado) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
    const es = new EventSource(`${apiBase}/admin/dashboard/${eventoSeleccionado}`, {
    });
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.tipo === 'metricas') setMetricas(data);
      if (data.tipo === 'stock') {
        setMetricas((prev: any) => prev ? {
          ...prev,
          disponiblesPorCategoria: prev.disponiblesPorCategoria.map((c: any) => {
            const upd = data.categorias.find((u: any) => u.id === c.id);
            return upd ? { ...c, disponibles: upd.disponibles } : c;
          }),
        } : prev);
      }
    };
    return () => es.close();
  }, [eventoSeleccionado, token]);

  const horaData = Array.from({ length: 24 }, (_, i) => ({
    hora: `${i}h`,
    vendidos: metricas?.ventasPorHora?.find((v: any) => v.hora === i)?.cantidad ?? 0,
    ingresos: metricas?.ventasPorHora?.find((v: any) => v.hora === i)?.ingresos ?? 0,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <select
          value={eventoSeleccionado}
          onChange={(e) => setEventoSeleccionado(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Vendidos hoy</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{metricas?.vendidosHoy ?? '—'}</p>
              </div>
              <TicketIcon size={32} className="text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ingresos del día</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{metricas ? formatMXN(metricas.ingresosDia) : '—'}</p>
              </div>
              <TrendingUpIcon size={32} className="text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ingresos totales</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{metricas ? formatMXN(metricas.ingresosTotal) : '—'}</p>
              </div>
              <DollarSignIcon size={32} className="text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disponibles por categoría */}
      {metricas?.disponiblesPorCategoria && (
        <Card>
          <CardHeader><CardTitle>Disponibles por categoría</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metricas.disponiblesPorCategoria.map((cat: any) => (
                <div key={cat.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{cat.nombre}</span>
                    <span className="text-gray-500">{cat.disponibles} / {cat.total}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(cat.disponibles / cat.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Últimas órdenes */}
      {metricas?.ultimasOrdenes && (
        <Card>
          <CardHeader><CardTitle>Últimas 20 órdenes</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-2 pr-4">Comprador</th>
                    <th className="pb-2 pr-4">Canal</th>
                    <th className="pb-2 pr-4">Categoría</th>
                    <th className="pb-2 pr-4">Monto</th>
                    <th className="pb-2 pr-4">Estado</th>
                    <th className="pb-2">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {metricas.ultimasOrdenes.map((o: any) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 font-medium text-gray-900">{o.compradorNombre ?? 'Sin nombre'}</td>
                      <td className="py-2 pr-4"><Badge variant={o.canal === 'ONLINE' ? 'default' : 'secondary'}>{o.canal}</Badge></td>
                      <td className="py-2 pr-4 text-gray-600">{o.categoria ?? '—'}</td>
                      <td className="py-2 pr-4 font-semibold">{formatMXN(o.total)}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={o.estado === 'PAGADA' ? 'default' : o.estado === 'PENDIENTE' ? 'warning' : 'secondary'}>{o.estado}</Badge>
                      </td>
                      <td className="py-2 text-gray-400 text-xs">{timeAgo(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
