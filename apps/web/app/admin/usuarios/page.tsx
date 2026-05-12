'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { PlusIcon, PencilIcon, BuildingIcon } from 'lucide-react';

const ROL_OPCIONES = ['ADMIN', 'CAJERO', 'VALIDADOR'];

export default function UsuariosPage() {
  const { data: session } = useSession();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState({ email: '', password: '', nombre: '', rol: 'CAJERO', activo: true, empresaId: '' });
  const token = (session?.user as any)?.apiToken;
  const rol = (session?.user as any)?.rol;
  const isSuperAdmin = rol === 'SUPER_ADMIN';

  const cargar = async () => {
    const [u, e] = await Promise.all([
      api.admin.usuarios.list(token),
      isSuperAdmin ? api.admin.empresas.list(token) : Promise.resolve([]),
    ]);
    setUsuarios(u);
    setEmpresas(e);
  };

  useEffect(() => { if (token) cargar(); }, [token]);

  function abrirModal(u?: any) {
    setEditando(u ?? null);
    setForm(u
      ? { email: u.email, password: '', nombre: u.nombre, rol: u.rol, activo: u.activo, empresaId: u.empresaId ?? '' }
      : { email: '', password: '', nombre: '', rol: 'CAJERO', activo: true, empresaId: '' }
    );
    setModal(true);
  }

  async function guardar() {
    const data: any = { ...form };
    if (!data.password) delete data.password;
    if (!isSuperAdmin) delete data.empresaId;
    if (data.empresaId === '') data.empresaId = undefined;
    try {
      if (editando) await api.admin.usuarios.update(editando.id, data, token);
      else await api.admin.usuarios.create(data, token);
      setModal(false);
      cargar();
    } catch (e: any) { alert(e.message); }
  }

  const rolColor = (r: string) =>
    r === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700' :
    r === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
    r === 'CAJERO' ? 'bg-green-100 text-green-700' :
    'bg-gray-100 text-gray-600';

  function empresaNombre(empresaId?: string) {
    if (!empresaId) return null;
    return empresas.find((e) => e.id === empresaId)?.nombre ?? empresaId;
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => abrirModal()}><PlusIcon size={16} className="mr-2" />Nuevo usuario</Button>
      </div>

      <div className="space-y-2">
        {usuarios.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{u.nombre}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rolColor(u.rol)}`}>{u.rol}</span>
                  {!u.activo && <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">Inactivo</span>}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{u.email}</p>
                {isSuperAdmin && u.empresaId && (
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <BuildingIcon size={10} />{empresaNombre(u.empresaId)}
                  </p>
                )}
              </div>
              <Button variant="outline" size="icon" onClick={() => abrirModal(u)}><PencilIcon size={14} /></Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold">{editando ? 'Editar usuario' : 'Nuevo usuario'}</h2>

            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{editando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder={editando ? '••••••••' : ''} />
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.rol} onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))}>
                {ROL_OPCIONES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Campo empresa — solo visible para SUPER_ADMIN */}
            {isSuperAdmin && (
              <div className="space-y-1">
                <Label>Empresa</Label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={form.empresaId}
                  onChange={(e) => setForm((p) => ({ ...p, empresaId: e.target.value }))}
                >
                  <option value="">— Sin empresa (SUPER_ADMIN) —</option>
                  {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                <p className="text-xs text-gray-400">Asigna una empresa para limitar el acceso del usuario a esa empresa</p>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} />
              Usuario activo
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
