// CRUD de eventos en el panel admin
'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatFechaCorta } from '@/lib/utils';
import { PlusIcon, PencilIcon, TrashIcon, FolderIcon } from 'lucide-react';

export default function EventosAdminPage() {
  const { data: session } = useSession();
  const [eventos, setEventos] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState({ nombre: '', lugar: '', fechaEvento: '', descripcion: '', estado: 'BORRADOR', ventaOnline: true, ventaTaquilla: true });
  const token = (session?.user as any)?.apiToken;

  const cargar = async () => { const ev = await api.admin.eventos.list(token); setEventos(ev); };
  useEffect(() => { if (token) cargar(); }, [token]);

  function abrirModal(ev?: any) {
    setEditando(ev ?? null);
    setForm(ev ? { nombre: ev.nombre, lugar: ev.lugar, fechaEvento: ev.fechaEvento?.slice(0, 16) ?? '', descripcion: ev.descripcion ?? '', estado: ev.estado, ventaOnline: ev.ventaOnline, ventaTaquilla: ev.ventaTaquilla } : { nombre: '', lugar: '', fechaEvento: '', descripcion: '', estado: 'BORRADOR', ventaOnline: true, ventaTaquilla: true });
    setModal(true);
  }

  async function guardar() {
    const data = { ...form, fechaEvento: form.fechaEvento };
    if (editando) { await api.admin.eventos.update(editando.id, data, token); }
    else { await api.admin.eventos.create(data, token); }
    setModal(false);
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este evento?')) return;
    await api.admin.eventos.delete(id, token);
    cargar();
  }

  const estadoBadge = (e: string) => e === 'ACTIVO' ? 'default' : e === 'PAUSADO' ? 'warning' : 'secondary';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
        <Button onClick={() => abrirModal()}><PlusIcon size={16} className="mr-2" />Nuevo evento</Button>
      </div>

      <div className="space-y-3">
        {eventos.map((ev) => (
          <Card key={ev.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900 truncate">{ev.nombre}</p>
                  <Badge variant={estadoBadge(ev.estado)}>{ev.estado}</Badge>
                </div>
                <p className="text-sm text-gray-500 truncate">{ev.lugar} · {formatFechaCorta(ev.fechaEvento)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{ev.categorias?.length ?? 0} categorías · {ev._count?.ordenes ?? 0} órdenes</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/admin/eventos/${ev.id}/categorias`}>
                  <Button variant="outline" size="sm"><FolderIcon size={14} className="mr-1" />Cats.</Button>
                </Link>
                <Link href={`/admin/eventos/${ev.id}/ordenes`}>
                  <Button variant="outline" size="sm">Órdenes</Button>
                </Link>
                <Button variant="outline" size="icon" onClick={() => abrirModal(ev)}><PencilIcon size={14} /></Button>
                <Button variant="destructive" size="icon" onClick={() => eliminar(ev.id)}><TrashIcon size={14} /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">{editando ? 'Editar evento' : 'Nuevo evento'}</h2>
            {[
              { id: 'nombre', label: 'Nombre', type: 'text' },
              { id: 'lugar', label: 'Lugar', type: 'text' },
              { id: 'fechaEvento', label: 'Fecha del evento', type: 'datetime-local' },
              { id: 'descripcion', label: 'Descripción', type: 'text' },
            ].map(({ id, label, type }) => (
              <div key={id} className="space-y-1">
                <Label>{label}</Label>
                <Input type={type} value={(form as any)[id]} onChange={(e) => setForm((p) => ({ ...p, [id]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-1">
              <Label>Estado</Label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.estado} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}>
                {['BORRADOR', 'ACTIVO', 'PAUSADO', 'FINALIZADO'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.ventaOnline} onChange={(e) => setForm((p) => ({ ...p, ventaOnline: e.target.checked }))} />Venta online</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.ventaTaquilla} onChange={(e) => setForm((p) => ({ ...p, ventaTaquilla: e.target.checked }))} />Venta taquilla</label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={guardar}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
