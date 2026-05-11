'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { PlusIcon, PencilIcon, BuildingIcon, UsersIcon, CalendarIcon } from 'lucide-react';

export default function EmpresasPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.apiToken;
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState({ nombre: '', slug: '', logo: '', activo: true });

  const cargar = async () => {
    const data = await api.admin.empresas.list(token);
    setEmpresas(data);
  };

  useEffect(() => { if (token) cargar(); }, [token]);

  function abrirModal(emp?: any) {
    setEditando(emp ?? null);
    setForm(emp
      ? { nombre: emp.nombre, slug: emp.slug, logo: emp.logo ?? '', activo: emp.activo }
      : { nombre: '', slug: '', logo: '', activo: true });
    setModal(true);
  }

  async function guardar() {
    if (editando) { await api.admin.empresas.update(editando.id, form, token); }
    else { await api.admin.empresas.create(form, token); }
    setModal(false);
    cargar();
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de organizaciones del sistema</p>
        </div>
        <Button onClick={() => abrirModal()}><PlusIcon size={16} className="mr-2" />Nueva empresa</Button>
      </div>

      <div className="space-y-3">
        {empresas.map((emp) => (
          <Card key={emp.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <BuildingIcon size={20} className="text-green-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{emp.nombre}</p>
                    <Badge variant={emp.activo ? 'default' : 'secondary'}>{emp.activo ? 'Activa' : 'Inactiva'}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">/{emp.slug}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-500"><UsersIcon size={11} />{emp._count?.usuarios ?? 0} usuarios</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500"><CalendarIcon size={11} />{emp._count?.eventos ?? 0} eventos</span>
                    {emp.config?.smtpHost && <span className="text-xs text-green-600">✓ SMTP</span>}
                    {emp.config?.waProvider === 'meta' && <span className="text-xs text-green-600">✓ WhatsApp API</span>}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="icon" onClick={() => abrirModal(emp)}>
                <PencilIcon size={14} />
              </Button>
            </CardContent>
          </Card>
        ))}
        {empresas.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <BuildingIcon size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay empresas registradas</p>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">{editando ? 'Editar empresa' : 'Nueva empresa'}</h2>
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Mi Empresa SA" />
            </div>
            <div className="space-y-1">
              <Label>Slug (URL)</Label>
              <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="mi-empresa" />
            </div>
            <div className="space-y-1">
              <Label>Logo URL (opcional)</Label>
              <Input value={form.logo} onChange={(e) => setForm((p) => ({ ...p, logo: e.target.value }))} placeholder="https://..." />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} />
              Empresa activa
            </label>
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
