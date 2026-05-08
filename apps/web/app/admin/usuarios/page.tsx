// CRUD de usuarios del sistema
'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { PlusIcon, PencilIcon } from 'lucide-react';

const ROL_OPCIONES = ['ADMIN', 'CAJERO', 'VALIDADOR'];

export default function UsuariosPage() {
  const { data: session } = useSession();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState({ email: '', password: '', nombre: '', rol: 'CAJERO', activo: true });
  const token = (session?.user as any)?.apiToken;

  const cargar = async () => { const u = await api.admin.usuarios.list(token); setUsuarios(u); };
  useEffect(() => { if (token) cargar(); }, [token]);

  function abrirModal(u?: any) {
    setEditando(u ?? null);
    setForm(u ? { email: u.email, password: '', nombre: u.nombre, rol: u.rol, activo: u.activo } : { email: '', password: '', nombre: '', rol: 'CAJERO', activo: true });
    setModal(true);
  }

  async function guardar() {
    const data = { ...form };
    if (!data.password) delete (data as any).password;
    if (editando) { await api.admin.usuarios.update(editando.id, data, token); }
    else { await api.admin.usuarios.create(data, token); }
    setModal(false); cargar();
  }

  const rolBadge = (r: string) => r === 'SUPER_ADMIN' || r === 'ADMIN' ? 'default' : 'secondary';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <Button onClick={() => abrirModal()}><PlusIcon size={16} className="mr-2" />Nuevo usuario</Button>
      </div>

      <div className="space-y-3">
        {usuarios.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{u.nombre}</p>
                  <Badge variant={rolBadge(u.rol)}>{u.rol}</Badge>
                  {!u.activo && <Badge variant="destructive">Inactivo</Badge>}
                </div>
                <p className="text-sm text-gray-500">{u.email}</p>
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
            {[
              { id: 'nombre', label: 'Nombre' },
              { id: 'email', label: 'Email', type: 'email' },
              { id: 'password', label: editando ? 'Nueva contraseña (opcional)' : 'Contraseña', type: 'password' },
            ].map(({ id, label, type = 'text' }) => (
              <div key={id} className="space-y-1">
                <Label>{label}</Label>
                <Input type={type} value={(form as any)[id]} onChange={(e) => setForm((p) => ({ ...p, [id]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-1">
              <Label>Rol</Label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.rol} onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))}>
                {ROL_OPCIONES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.activo} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} />Usuario activo</label>
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
