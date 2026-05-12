// Tabla de órdenes paginada con filtros, exportar CSV y reembolso
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatMXN, timeAgo } from '@/lib/utils';
import { DownloadIcon, RotateCcwIcon } from 'lucide-react';

export default function OrdenesPage() {
  const { id: eventoId } = useParams();
  const { data: session } = useSession();
  const [data, setData] = useState<any>({ ordenes: [], total: 0 });
  const [page, setPage] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCanal, setFiltroCanal] = useState('');
  const token = (session?.user as any)?.apiToken;

  const cargar = async () => {
    const params: Record<string, string> = { eventoId: eventoId as string, page: String(page), limit: '50' };
    if (filtroEstado) params.estado = filtroEstado;
    if (filtroCanal) params.canal = filtroCanal;
    const result = await api.admin.ordenes.list(params, token);
    setData(result);
  };

  useEffect(() => { if (token) cargar(); }, [token, page, filtroEstado, filtroCanal]);

  const estadoBadge = (e: string) => e === 'PAGADA' ? 'default' : e === 'PENDIENTE' ? 'warning' : 'secondary';

  async function reembolsar(ordenId: string) {
    if (!confirm('¿Reembolsar esta orden? Los boletos quedarán cancelados y el stock se restaurará.')) return;
    try {
      await api.admin.ordenes.reembolsar(ordenId, token);
      cargar();
    } catch { alert('Error procesando reembolso'); }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Órdenes <span className="text-gray-400 text-lg">({data.total})</span></h1>
        <div className="flex items-center gap-2">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            {['PENDIENTE', 'PAGADA', 'EXPIRADA', 'REEMBOLSADA', 'FALLIDA'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={filtroCanal} onChange={(e) => { setFiltroCanal(e.target.value); setPage(1); }}>
            <option value="">Todos los canales</option>
            <option value="ONLINE">ONLINE</option>
            <option value="TAQUILLA">TAQUILLA</option>
          </select>
          <a href={`/api/admin/ordenes/exportar?eventoId=${eventoId}`} target="_blank">
            <Button variant="outline" size="sm"><DownloadIcon size={14} className="mr-1" />CSV</Button>
          </a>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-3 pr-4">Comprador</th>
              <th className="pb-3 pr-4">Canal</th>
              <th className="pb-3 pr-4">Pago</th>
              <th className="pb-3 pr-4">Monto</th>
              <th className="pb-3 pr-4">Estado</th>
              <th className="pb-3 pr-4">Fecha</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.ordenes.map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="py-3 pr-4">
                  <p className="font-medium text-gray-900">{o.compradorNombre ?? 'Sin nombre'}</p>
                  <p className="text-xs text-gray-400">{o.compradorEmail ?? ''}</p>
                </td>
                <td className="py-3 pr-4"><Badge variant={o.canal === 'ONLINE' ? 'default' : 'secondary'}>{o.canal}</Badge></td>
                <td className="py-3 pr-4 text-gray-600 text-xs">{o.formaPago}</td>
                <td className="py-3 pr-4 font-semibold">{formatMXN(o.total)}</td>
                <td className="py-3 pr-4"><Badge variant={estadoBadge(o.estado)}>{o.estado}</Badge></td>
                <td className="py-3 pr-4 text-gray-400 text-xs">{timeAgo(o.createdAt)}</td>
                <td className="py-3">
                  {o.estado === 'PAGADA' && (
                    <Button variant="outline" size="sm" onClick={() => reembolsar(o.id)} className="text-xs text-red-600 border-red-200 hover:bg-red-50">
                      <RotateCcwIcon size={12} className="mr-1" />Reembolsar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">Página {page}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={data.ordenes.length < 50}>Siguiente</Button>
        </div>
      </div>
    </div>
  );
}
