'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PlusIcon, TagIcon, TrashIcon, ToggleLeftIcon, ToggleRightIcon } from 'lucide-react';

const TIPOS = [
  { value: 'PORCENTAJE', label: '% Descuento' },
  { value: 'FIJO', label: 'Descuento fijo (MXN)' },
  { value: 'CORTESIA', label: 'Cortesía (100% gratis)' },
];

export default function CodigosPromoPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.apiToken;
  const rol = (session?.user as any)?.rol;

  const [codigos, setCodigos] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [form, setForm] = useState({ codigo: '', tipo: 'PORCENTAJE', valor: '', maxUsos: '', eventoId: '', expiresAt: '' });
  const [showing, setShowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    if (!token) return;
    setCodigos(await api.admin.codigosPromo.list(token));
  };

  useEffect(() => {
    if (!token) return;
    cargar();
    api.admin.eventos.list(token).then(setEventos);
  }, [token]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function crear() {
    if (!form.codigo || !form.valor) return alert('Completa código y valor');
    setLoading(true);
    try {
      await api.admin.codigosPromo.create({
        codigo: form.codigo,
        tipo: form.tipo,
        valor: Number(form.valor),
        maxUsos: form.maxUsos ? Number(form.maxUsos) : undefined,
        eventoId: form.eventoId || undefined,
        expiresAt: form.expiresAt || undefined,
      }, token);
      setForm({ codigo: '', tipo: 'PORCENTAJE', valor: '', maxUsos: '', eventoId: '', expiresAt: '' });
      setShowing(false);
      cargar();
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  }

  async function toggleActivo(id: string, activo: boolean) {
    await api.admin.codigosPromo.update(id, { activo: !activo }, token);
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este código?')) return;
    await api.admin.codigosPromo.delete(id, token);
    cargar();
  }

  function tipoLabel(tipo: string) {
    return TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
  }

  function valorLabel(tipo: string, valor: number) {
    if (tipo === 'PORCENTAJE') return `${valor}%`;
    if (tipo === 'CORTESIA') return '100% gratis';
    return `$${valor} MXN`;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Códigos promocionales</h1>
          <p className="text-sm text-gray-500 mt-1">Descuentos, cortesías y códigos de acceso</p>
        </div>
        <Button onClick={() => setShowing((v) => !v)}>
          <PlusIcon size={15} className="mr-1.5" />Nuevo código
        </Button>
      </div>

      {showing && (
        <Card className="mb-6 border-green-200 bg-green-50/40">
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><TagIcon size={16} />Crear código</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Código</Label>
                <Input placeholder="PROMO2026" value={form.codigo} onChange={(e) => set('codigo', e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {form.tipo !== 'CORTESIA' && (
                <div className="space-y-1">
                  <Label>{form.tipo === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Monto (MXN)'}</Label>
                  <Input type="number" placeholder={form.tipo === 'PORCENTAJE' ? '20' : '100'} value={form.valor} onChange={(e) => set('valor', e.target.value)} />
                </div>
              )}
              {form.tipo === 'CORTESIA' && (
                <div className="space-y-1">
                  <Label>Valor</Label>
                  <Input value="100" disabled />
                </div>
              )}
              <div className="space-y-1">
                <Label>Máx. usos <span className="text-gray-400">(vacío = ilimitado)</span></Label>
                <Input type="number" placeholder="50" value={form.maxUsos} onChange={(e) => set('maxUsos', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Evento <span className="text-gray-400">(vacío = todos)</span></Label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.eventoId} onChange={(e) => set('eventoId', e.target.value)}>
                  <option value="">Todos los eventos</option>
                  {eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Expira <span className="text-gray-400">(opcional)</span></Label>
                <Input type="datetime-local" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={crear} disabled={loading}>Crear código</Button>
              <Button variant="outline" onClick={() => setShowing(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      {codigos.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <TagIcon size={32} className="mx-auto mb-3 opacity-30" />
          <p>No hay códigos creados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {codigos.map((c) => (
            <Card key={c.id} className={!c.activo ? 'opacity-50' : ''}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-sm">{c.codigo}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.tipo === 'CORTESIA' ? 'bg-violet-100 text-violet-700' : c.tipo === 'PORCENTAJE' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {tipoLabel(c.tipo)}
                    </span>
                    <span className="text-sm font-semibold text-green-700">{valorLabel(c.tipo, c.valor)}</span>
                    {!c.activo && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>{c.usosActuales} / {c.maxUsos ?? '∞'} usos</span>
                    {c.evento && <span>Evento: {c.evento.nombre}</span>}
                    {c.expiresAt && <span>Expira: {new Date(c.expiresAt).toLocaleDateString('es-MX')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActivo(c.id, c.activo)}
                    className={`text-gray-400 hover:text-gray-700 transition-colors ${c.activo ? 'text-green-600' : ''}`}
                    title={c.activo ? 'Desactivar' : 'Activar'}
                  >
                    {c.activo ? <ToggleRightIcon size={22} className="text-green-600" /> : <ToggleLeftIcon size={22} />}
                  </button>
                  <button onClick={() => eliminar(c.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <TrashIcon size={16} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
