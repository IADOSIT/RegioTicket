'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatMXN } from '@/lib/utils';
import { PlusIcon, PencilIcon, GlobeIcon, StoreIcon, ArmchairIcon, TableIcon, UsersIcon } from 'lucide-react';

const TIPOS = [
  { value: 'GENERAL',  label: 'General',   desc: 'Sin asignación de lugar',         icon: UsersIcon,   color: 'text-gray-600 bg-gray-50 border-gray-200' },
  { value: 'NUMERADO', label: 'Numerado',   desc: 'Asiento específico por boleto',   icon: ArmchairIcon, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'MESA',     label: 'Mesa',       desc: 'Boletos por mesa con capacidad',  icon: TableIcon,    color: 'text-amber-600 bg-amber-50 border-amber-200' },
];

function TipoBadge({ tipo }: { tipo: string }) {
  const t = TIPOS.find((x) => x.value === tipo) ?? TIPOS[0];
  const Icon = t.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${t.color}`}>
      <Icon size={11} />{t.label}
    </span>
  );
}

const emptyForm = { nombre: '', precio: '', totalBoletos: '', ordenDisplay: '0', tipoDistribucion: 'GENERAL', capacidadMesa: '' };

export default function CategoriasPage() {
  const { id: eventoId } = useParams();
  const { data: session } = useSession();
  const [cats, setCats] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const token = (session?.user as any)?.apiToken;

  const cargar = async () => {
    const c = await api.admin.categorias.list(eventoId as string, token);
    setCats(c);
  };
  useEffect(() => { if (token) cargar(); }, [token]);

  function abrirModal(cat?: any) {
    setEditando(cat ?? null);
    setForm(cat ? {
      nombre: cat.nombre,
      precio: String(cat.precio),
      totalBoletos: String(cat.totalBoletos),
      ordenDisplay: String(cat.ordenDisplay),
      tipoDistribucion: cat.tipoDistribucion ?? 'GENERAL',
      capacidadMesa: cat.capacidadMesa ? String(cat.capacidadMesa) : '',
    } : emptyForm);
    setModal(true);
  }

  async function guardar() {
    const data: any = {
      eventoId,
      nombre: form.nombre,
      precio: parseFloat(form.precio),
      totalBoletos: parseInt(form.totalBoletos),
      ordenDisplay: parseInt(form.ordenDisplay),
      tipoDistribucion: form.tipoDistribucion,
      capacidadMesa: form.tipoDistribucion === 'MESA' && form.capacidadMesa ? parseInt(form.capacidadMesa) : null,
    };
    if (editando) { await api.admin.categorias.update(editando.id, data, token); }
    else { await api.admin.categorias.create(data, token); }
    setModal(false);
    cargar();
  }

  function set(key: string, val: string) { setForm((p) => ({ ...p, [key]: val })); }

  const totalMesas = form.tipoDistribucion === 'MESA' && form.capacidadMesa && form.totalBoletos
    ? Math.ceil(parseInt(form.totalBoletos) / parseInt(form.capacidadMesa))
    : null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
        <Button onClick={() => abrirModal()}><PlusIcon size={16} className="mr-2" />Nueva categoría</Button>
      </div>

      <div className="space-y-3">
        {cats.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-gray-900">{cat.nombre}</p>
                  <TipoBadge tipo={cat.tipoDistribucion ?? 'GENERAL'} />
                </div>
                <p className="text-green-600 font-bold">{formatMXN(cat.precio)}</p>
                <p className="text-xs text-gray-500">
                  {cat.disponibles} / {cat.totalBoletos} disponibles
                  {cat.tipoDistribucion === 'MESA' && cat.capacidadMesa && (
                    <> · {Math.ceil(cat.totalBoletos / cat.capacidadMesa)} mesas de {cat.capacidadMesa} personas</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={async () => { await api.admin.categorias.toggleOnline(cat.id, token); cargar(); }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cat.activaOnline ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                >
                  <GlobeIcon size={12} />{cat.activaOnline ? 'Online ON' : 'Online OFF'}
                </button>
                <button
                  onClick={async () => { await api.admin.categorias.toggleTaquilla(cat.id, token); cargar(); }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cat.activaTaquilla ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                >
                  <StoreIcon size={12} />{cat.activaTaquilla ? 'Taquilla ON' : 'Taquilla OFF'}
                </button>
                <Button variant="outline" size="sm" onClick={() => abrirModal(cat)}><PencilIcon size={14} /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 my-auto">
            <h2 className="text-xl font-bold">{editando ? 'Editar categoría' : 'Nueva categoría'}</h2>

            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej. VIP, General, Mesa dorada" />
            </div>

            <div className="space-y-1">
              <Label>Tipo de distribución</Label>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS.map((t) => {
                  const Icon = t.icon;
                  const active = form.tipoDistribucion === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set('tipoDistribucion', t.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-semibold transition-all ${active ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      <Icon size={18} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 pt-1">{TIPOS.find((t) => t.value === form.tipoDistribucion)?.desc}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Precio (MXN)</Label>
                <Input type="number" value={form.precio} onChange={(e) => set('precio', e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label>{form.tipoDistribucion === 'MESA' ? 'Total de personas' : 'Total de boletos'}</Label>
                <Input type="number" value={form.totalBoletos} onChange={(e) => set('totalBoletos', e.target.value)} placeholder="100" />
              </div>
            </div>

            {form.tipoDistribucion === 'MESA' && (
              <div className="space-y-1">
                <Label>Personas por mesa</Label>
                <Input type="number" value={form.capacidadMesa} onChange={(e) => set('capacidadMesa', e.target.value)} placeholder="10" />
                {totalMesas && (
                  <p className="text-xs text-amber-600 font-medium">→ {totalMesas} mesas en total</p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label>Orden de visualización</Label>
              <Input type="number" value={form.ordenDisplay} onChange={(e) => set('ordenDisplay', e.target.value)} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={guardar} disabled={!form.nombre || !form.precio || !form.totalBoletos}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
