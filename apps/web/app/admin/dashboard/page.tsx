'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMXN, timeAgo } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  TrendingUpIcon, TicketIcon, DollarSignIcon, UsersIcon,
  BarChart2Icon, RefreshCwIcon, BuildingIcon, ActivityIcon,
  ShoppingCartIcon, CheckCircleIcon, ZapIcon,
} from 'lucide-react';

const CANAL_COLORS: Record<string, string> = { ONLINE: '#16a34a', TAQUILLA: '#2563eb' };
const PIE_COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

function KPI({ label, value, sub, icon: Icon, trend, color = 'green' }: {
  label: string; value: string; sub?: string; icon: any; trend?: string; color?: string;
}) {
  const bg = color === 'blue' ? 'bg-blue-50' : color === 'amber' ? 'bg-amber-50' : color === 'violet' ? 'bg-violet-50' : 'bg-green-50';
  const ic = color === 'blue' ? 'text-blue-600' : color === 'amber' ? 'text-amber-600' : color === 'violet' ? 'text-violet-600' : 'text-green-600';
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            {trend && <span className="text-xs font-medium text-green-600 mt-1 flex items-center gap-1"><TrendingUpIcon size={11} />{trend}</span>}
          </div>
          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
            <Icon size={20} className={ic} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OcupacionBar({ categorias }: { categorias: any[] }) {
  return (
    <div className="space-y-3">
      {categorias.map((c) => {
        const pct = c.total > 0 ? Math.round((c.vendidos / c.total) * 100) : 0;
        const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500';
        return (
          <div key={c.id}>
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="font-medium text-gray-700 truncate">{c.nombre}</span>
              <span className="text-gray-500 ml-2 shrink-0">{c.vendidos}/{c.total} · {pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrdenesTable({ ordenes, compact = false }: { ordenes: any[]; compact?: boolean }) {
  const estadoColor = (e: string) =>
    e === 'PAGADA' ? 'bg-green-100 text-green-700' : e === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="pb-2 pr-4 text-xs font-medium text-gray-400 uppercase">Comprador</th>
            {!compact && <th className="pb-2 pr-4 text-xs font-medium text-gray-400 uppercase">Evento</th>}
            <th className="pb-2 pr-4 text-xs font-medium text-gray-400 uppercase">Canal</th>
            <th className="pb-2 pr-4 text-xs font-medium text-gray-400 uppercase">Monto</th>
            <th className="pb-2 pr-4 text-xs font-medium text-gray-400 uppercase">Estado</th>
            <th className="pb-2 text-xs font-medium text-gray-400 uppercase">Hora</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {ordenes.map((o) => (
            <tr key={o.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-2.5 pr-4">
                <p className="font-medium text-gray-900 truncate max-w-[140px]">{o.compradorNombre ?? 'Sin nombre'}</p>
                {!compact && o.empresaNombre && <p className="text-xs text-gray-400">{o.empresaNombre}</p>}
              </td>
              {!compact && <td className="py-2.5 pr-4 text-gray-600 text-xs truncate max-w-[160px]">{o.eventoNombre ?? o.categoria ?? '—'}</td>}
              <td className="py-2.5 pr-4">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${o.canal === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {o.canal === 'ONLINE' ? '🌐' : '🎭'} {o.canal}
                </span>
              </td>
              <td className="py-2.5 pr-4 font-semibold text-gray-900">{formatMXN(o.total)}</td>
              <td className="py-2.5 pr-4">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${estadoColor(o.estado)}`}>{o.estado}</span>
              </td>
              <td className="py-2.5 text-gray-400 text-xs whitespace-nowrap">{timeAgo(o.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Vista global SUPER_ADMIN ───────────────────────────────────────────────

function DashboardGlobal({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { setData(await api.admin.dashboard.global(token)); } catch { }
    setLoading(false);
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return null;

  const maxIngreso = Math.max(...(data.byEmpresa?.map((e: any) => e.ingresos) ?? [1]), 1);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPI label="Ingresos hoy" value={formatMXN(data.ingresosHoy)} icon={DollarSignIcon} color="green" />
        <KPI label="Ingresos totales" value={formatMXN(data.ingresosTotal)} icon={TrendingUpIcon} color="green" />
        <KPI label="Boletos hoy" value={String(data.boletosHoy)} icon={TicketIcon} color="blue" />
        <KPI label="Boletos emitidos" value={String(data.boletosTotal)} icon={CheckCircleIcon} color="blue" />
        <KPI label="Eventos activos" value={String(data.eventosActivos)} icon={ZapIcon} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventas por día */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Ingresos — últimos 30 días</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.ventasPorDia ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradGlobal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatMXN(v)} labelFormatter={(l) => `Día: ${l}`} />
                <Area type="monotone" dataKey="ingresos" stroke="#16a34a" strokeWidth={2} fill="url(#gradGlobal)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por empresa */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Ingresos por empresa</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data.byEmpresa ?? []).slice(0, 8).map((e: any, i: number) => (
                <div key={e.empresaId ?? i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700 truncate">{e.nombre}</span>
                    <span className="text-gray-500 ml-2 shrink-0">{formatMXN(e.ingresos)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${(e.ingresos / maxIngreso) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Últimas órdenes globales */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700">Órdenes recientes — todas las empresas</CardTitle>
          <button onClick={cargar} className="text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCwIcon size={14} />
          </button>
        </CardHeader>
        <CardContent>
          <OrdenesTable ordenes={data.ordenesRecientes ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Vista por evento ───────────────────────────────────────────────────────

function DashboardEvento({ token, eventoId }: { token: string; eventoId: string }) {
  const [metricas, setMetricas] = useState<any>(null);

  useEffect(() => {
    if (!eventoId) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
    const es = new EventSource(`${apiBase}/admin/dashboard/${eventoId}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.tipo === 'metricas') setMetricas(data);
      if (data.tipo === 'stock') {
        setMetricas((prev: any) => prev ? {
          ...prev,
          disponiblesPorCategoria: prev.disponiblesPorCategoria.map((c: any) => {
            const upd = data.categorias?.find((u: any) => u.id === c.id);
            return upd ? { ...c, disponibles: upd.disponibles, vendidos: c.total - upd.disponibles } : c;
          }),
        } : prev);
      }
    };
    return () => es.close();
  }, [eventoId]);

  if (!metricas) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  const horaData = Array.from({ length: 24 }, (_, i) => ({
    hora: `${i}h`,
    ingresos: metricas.ventasPorHora?.find((v: any) => v.hora === i)?.ingresos ?? 0,
    count: metricas.ventasPorHora?.find((v: any) => v.hora === i)?.count ?? 0,
  }));

  const canalData = metricas.byCanal ?? [];
  const totalIngresos = canalData.reduce((a: number, c: any) => a + c.ingresos, 0) || 1;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPI label="Ingresos hoy" value={formatMXN(metricas.ingresosDia)} icon={DollarSignIcon} color="green" />
        <KPI label="Ingresos totales" value={formatMXN(metricas.ingresosTotal)} icon={TrendingUpIcon} color="green" />
        <KPI label="Vendidos hoy" value={String(metricas.vendidosHoy)} icon={ShoppingCartIcon} color="blue" />
        <KPI label="Total órdenes" value={String(metricas.ordenesTotal)} icon={BarChart2Icon} color="blue" />
        <KPI label="Accesos usados" value={String(metricas.boletosUsados)} icon={CheckCircleIcon} color="violet" />
        <KPI label="Ocupación" value={`${metricas.ocupacion}%`} sub={`${metricas.vendidosTotal}/${metricas.totalBoletos}`} icon={ActivityIcon} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventas por hora */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Ventas últimas 24h</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={horaData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="hora" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatMXN(v)} labelFormatter={(l) => `${l}`} />
                <Bar dataKey="ingresos" fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Canal de venta */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Canal de venta</CardTitle></CardHeader>
          <CardContent>
            {canalData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={canalData} dataKey="ingresos" nameKey="canal" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                      {canalData.map((c: any, i: number) => (
                        <Cell key={c.canal} fill={CANAL_COLORS[c.canal] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatMXN(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {canalData.map((c: any, i: number) => (
                    <div key={c.canal} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CANAL_COLORS[c.canal] ?? PIE_COLORS[i] }} />
                        {c.canal}
                      </span>
                      <span className="font-medium text-gray-700">{formatMXN(c.ingresos)} · {Math.round((c.ingresos / totalIngresos) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-sm text-gray-400 text-center py-8">Sin ventas aún</p>}
          </CardContent>
        </Card>
      </div>

      {/* Ocupación por categoría */}
      {metricas.disponiblesPorCategoria?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Ocupación por categoría</CardTitle></CardHeader>
          <CardContent>
            <OcupacionBar categorias={metricas.disponiblesPorCategoria} />
          </CardContent>
        </Card>
      )}

      {/* Últimas órdenes */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Últimas órdenes</CardTitle></CardHeader>
        <CardContent>
          <OrdenesTable ordenes={metricas.ultimasOrdenes ?? []} compact />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<string>('');
  const [vista, setVista] = useState<'global' | 'evento'>('evento');

  const token = (session?.user as any)?.apiToken;
  const rol = (session?.user as any)?.rol;
  const isSuperAdmin = rol === 'SUPER_ADMIN';

  useEffect(() => {
    if (!token) return;
    api.admin.eventos.list(token).then((evs) => {
      setEventos(evs);
      if (evs.length > 0) setEventoSeleccionado(evs[0].id);
    });
    if (isSuperAdmin) setVista('global');
  }, [token, isSuperAdmin]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Métricas en tiempo real</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setVista('global')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${vista === 'global' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <BuildingIcon size={13} />Global
              </button>
              <button
                onClick={() => setVista('evento')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${vista === 'evento' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <BarChart2Icon size={13} />Evento
              </button>
            </div>
          )}
          {(vista === 'evento' || !isSuperAdmin) && (
            <select
              value={eventoSeleccionado}
              onChange={(e) => setEventoSeleccionado(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              {eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Contenido */}
      {vista === 'global' && isSuperAdmin ? (
        <DashboardGlobal token={token} />
      ) : (
        eventoSeleccionado ? <DashboardEvento token={token} eventoId={eventoSeleccionado} /> : (
          <div className="text-center text-gray-400 py-16">Selecciona un evento para ver métricas</div>
        )
      )}
    </div>
  );
}
