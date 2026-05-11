// Configuración del sistema — números de contacto y datos de la empresa
'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { SaveIcon, CheckCircleIcon } from 'lucide-react';

const CAMPOS = [
  { key: 'contacto_telefono_1', label: 'Teléfono 1', placeholder: '+52 81 0000 0000', type: 'tel' },
  { key: 'contacto_telefono_2', label: 'Teléfono 2', placeholder: '+52 81 0000 0001 (opcional)', type: 'tel' },
  { key: 'contacto_telefono_3', label: 'Teléfono 3', placeholder: '+52 81 0000 0002 (opcional)', type: 'tel' },
  { key: 'contacto_whatsapp',   label: 'WhatsApp (número con código de país)', placeholder: '528112345678', type: 'tel' },
  { key: 'contacto_email',      label: 'Email de contacto', placeholder: 'contacto@regioticket.mx', type: 'email' },
  { key: 'empresa_nombre',      label: 'Nombre de la empresa', placeholder: 'RegioTicket', type: 'text' },
  { key: 'empresa_ciudad',      label: 'Ciudad / Estado', placeholder: 'Apodaca, Nuevo León', type: 'text' },
];

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.apiToken;
  const [config, setConfig] = useState<Record<string, string>>({});
  const [guardado, setGuardado] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.admin.config.get(token).then(setConfig).catch(() => {});
  }, [token]);

  async function guardar() {
    setLoading(true);
    try {
      await api.admin.config.save(config, token);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch { alert('Error guardando configuración'); }
    finally { setLoading(false); }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500 mt-1">Datos de contacto que aparecen en el sitio web</p>
        </div>
        <Button onClick={guardar} disabled={loading}>
          {guardado
            ? <><CheckCircleIcon size={16} className="mr-2 text-green-500" />Guardado</>
            : <><SaveIcon size={16} className="mr-2" />Guardar cambios</>}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide border-b border-gray-100 pb-2">Contacto y empresa</h3>
          {CAMPOS.map(({ key, label, placeholder, type }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type={type}
                placeholder={placeholder}
                value={config[key] ?? ''}
                onChange={(e) => setConfig((p) => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 mt-4">
        Los cambios se reflejan en el footer y páginas de contacto del sitio.
      </p>
    </div>
  );
}
