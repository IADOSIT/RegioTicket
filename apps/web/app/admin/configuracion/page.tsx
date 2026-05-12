// Configuración del sistema — números de contacto y datos de la empresa
'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { SaveIcon, CheckCircleIcon, MailIcon } from 'lucide-react';

const CAMPOS = [
  { key: 'contacto_telefono_1', label: 'Teléfono 1', placeholder: '+52 81 0000 0000', type: 'tel' },
  { key: 'contacto_telefono_2', label: 'Teléfono 2', placeholder: '+52 81 0000 0001 (opcional)', type: 'tel' },
  { key: 'contacto_telefono_3', label: 'Teléfono 3', placeholder: '+52 81 0000 0002 (opcional)', type: 'tel' },
  { key: 'contacto_whatsapp',   label: 'WhatsApp (número con código de país)', placeholder: '528112345678', type: 'tel' },
  { key: 'contacto_email',      label: 'Email de contacto', placeholder: 'contacto@regioticket.mx', type: 'email' },
  { key: 'empresa_nombre',      label: 'Nombre de la empresa', placeholder: 'RegioTicket', type: 'text' },
  { key: 'empresa_ciudad',      label: 'Ciudad / Estado', placeholder: 'Apodaca, Nuevo León', type: 'text' },
];

const CAMPOS_SMTP = [
  { key: 'smtp_host',          label: 'Servidor SMTP',      placeholder: 'smtp.resend.com',             type: 'text' },
  { key: 'smtp_port',          label: 'Puerto',             placeholder: '465',                          type: 'number' },
  { key: 'smtp_user',          label: 'Usuario',            placeholder: 'resend',                       type: 'text' },
  { key: 'smtp_pass',          label: 'Contraseña / API Key', placeholder: 're_xxxxxxxxxxxx',            type: 'password' },
  { key: 'smtp_from',          label: 'Email remitente',    placeholder: 'noreply@iados.mx',             type: 'email' },
  { key: 'smtp_from_nombre',   label: 'Nombre remitente',   placeholder: 'RegioTicket',                  type: 'text' },
];

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.apiToken;
  const esSuperAdmin = (session?.user as any)?.rol === 'SUPER_ADMIN';
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

      {esSuperAdmin && (
        <Card className="mt-6">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <MailIcon size={15} className="text-green-600" />
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Correo saliente del sistema (SMTP)</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800 space-y-1">
              <p><strong>Resend.com:</strong> Host <code className="bg-blue-100 px-1 rounded">smtp.resend.com</code> · Puerto <code className="bg-blue-100 px-1 rounded">465</code> · Usuario <code className="bg-blue-100 px-1 rounded">resend</code> · Contraseña = tu API Key (<code className="bg-blue-100 px-1 rounded">re_...</code>)</p>
              <p>El remitente debe ser de un dominio verificado en Resend (actualmente verificado: <strong>iados.mx</strong>).</p>
              <p className="text-blue-600">Este SMTP es el fallback del sistema. Las empresas pueden configurar el suyo propio en <em>Configuración de empresa</em>.</p>
            </div>
            {CAMPOS_SMTP.map(({ key, label, placeholder, type }) => (
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
      )}
    </div>
  );
}
