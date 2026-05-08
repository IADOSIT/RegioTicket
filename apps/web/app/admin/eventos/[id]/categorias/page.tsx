// CRUD de categorías con toggle online/taquilla
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatMXN } from '@/lib/utils';
import { PlusIcon, PencilIcon, GlobeIcon, StoreIcon } from 'lucide-react';

export default function CategoriasPage() {
  const { id: eventoId } = useParams();
  const { data: session } = useSession();
  const [cats, setCats] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState({ nombre: '', precio: '', totalBoletos: '', ordenDisplay: '0' });
  const token = (session?.user as any)?.apiToken;

  const cargar = async () => { const c = await api.admin.categorias.list(eventoId as string, token); setCats(c); };
  useEffect(() => { if (token) cargar(); }, [token]);

  function abrirModal(cat?: any) {
    setEditando(cat ?? null);
    setForm(cat ? { nombre: cat.nombre, precio: String(cat.precio), totalBoletos: String(cat.totalBoletos), ordenDisplay: String(cat.ordenDisplay) } : { nombre: '', precio: '', totalBoletos: '', ordenDisplay: '0' });
    setModal(true);
  }

  async function guardar() {
    const data = { eventoId, nombre: form.nombre, precio: parseFloat(form.precio), totalBoletos: parseInt(form.totalBoletos), ordenDisplay: parseInt(form.ordenDisplay) };
    if (editando) { await api.admin.categorias.update(editando.id, data, token); }
    else { await api.admin.categorias.create(data, token); }
    setModal(false); cargar();
  }

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
              <div>
                <p className="font-semibold text-gray-900">{cat.nombre}</p>
                <p className="text-green-600 font-bold">{formatMXN(cat.precio)}</p>
                <p className="text-xs text-gray-500">{cat.disponibles} / {cat.totalBoletos} disponibles</p>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold">{editando ? 'Editar categoría' : 'Nueva categoría'}</h2>
            {[
              { id: 'nombre', label: 'Nombre' },
              { id: 'precio', label: 'Precio (MXN)', type: 'number' },
              { id: 'totalBoletos', label: 'Total de boletos', type: 'number' },
              { id: 'ordenDisplay', label: 'Orden de visualización', type: 'number' },
            ].map(({ id, label, type = 'text' }) => (
              <div key={id} className="space-y-1">
                <Label>{label}</Label>
                <Input type={type} value={(form as any)[id]} onChange={(e) => setForm((p) => ({ ...p, [id]: e.target.value }))} />
              </div>
            ))}
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
