'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { SaveIcon, CheckCircleIcon, MailIcon, MessageCircleIcon, ClockIcon } from 'lucide-react';

export default function ConfigEmpresaPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.apiToken;
  const [form, setForm] = useState<Record<string, any>>({
    smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '',
    smtpFrom: '', smtpFromNombre: '',
    waProvider: 'link', waToken: '', waPhoneId: '', waFrom: '',
    ventanaAntesHoras: 4, ventanaDespuesHoras: 2,
  });
  const [guardado, setGuardado] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.admin.configEmpresa.get(token)
      .then((data) => setForm((p) => ({ ...p, ...data })))
      .catch(() => {});
  }, [token]);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  async function guardar() {
    setLoading(true);
    try {
      await api.admin.configEmpresa.save(form, token);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch { alert('Error guardando configuración'); }
    finally { setLoading(false); }
  }

  const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <Card className="mb-4">
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <Icon size={16} className="text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="space-y-4">{children}</div>
      </CardContent>
    </Card>
  );

  const Field = ({ label, id, type = 'text', placeholder, value, onChange, hint }: any) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} placeholder={placeholder} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de empresa</h1>
          <p className="text-sm text-gray-500 mt-1">Email, WhatsApp y ventana de validación</p>
        </div>
        <Button onClick={guardar} disabled={loading} className="shrink-0">
          {guardado
            ? <><CheckCircleIcon size={16} className="mr-2 text-green-500" />Guardado</>
            : <><SaveIcon size={16} className="mr-2" />Guardar</>}
        </Button>
      </div>

      <Section title="Correo saliente (SMTP)" icon={MailIcon}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Servidor SMTP" id="smtpHost" placeholder="smtp.gmail.com" value={form.smtpHost} onChange={(v: string) => set('smtpHost', v)} />
          <Field label="Puerto" id="smtpPort" type="number" placeholder="587" value={form.smtpPort} onChange={(v: string) => set('smtpPort', v)} />
          <Field label="Usuario" id="smtpUser" placeholder="tu@correo.com" value={form.smtpUser} onChange={(v: string) => set('smtpUser', v)} />
          <Field label="Contraseña" id="smtpPass" type="password" placeholder="••••••••" value={form.smtpPass} onChange={(v: string) => set('smtpPass', v)} />
          <Field label="Email remitente" id="smtpFrom" placeholder="noreply@tu-empresa.com" value={form.smtpFrom} onChange={(v: string) => set('smtpFrom', v)} />
          <Field label="Nombre remitente" id="smtpFromNombre" placeholder="Mi Empresa" value={form.smtpFromNombre} onChange={(v: string) => set('smtpFromNombre', v)} />
        </div>
        <div className="mt-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
          <strong>Gmail:</strong> usa smtp.gmail.com:587 y una contraseña de aplicación (no tu contraseña normal).<br/>
          <strong>Outlook:</strong> smtp-mail.outlook.com:587 · <strong>SMTP genérico:</strong> consulta con tu proveedor.
        </div>
      </Section>

      <Section title="WhatsApp" icon={MessageCircleIcon}>
        <div className="space-y-1">
          <Label>Proveedor</Label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={form.waProvider}
            onChange={(e) => set('waProvider', e.target.value)}
          >
            <option value="link">Solo enlace wa.me (sin API)</option>
            <option value="meta">Meta WhatsApp Cloud API</option>
          </select>
        </div>

        {form.waProvider === 'meta' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Token de acceso (Meta)"
              id="waToken" type="password"
              placeholder="••••••••"
              value={form.waToken}
              onChange={(v: string) => set('waToken', v)}
              hint="Token permanente de tu app de Meta"
            />
            <Field
              label="Phone Number ID"
              id="waPhoneId"
              placeholder="123456789012345"
              value={form.waPhoneId}
              onChange={(v: string) => set('waPhoneId', v)}
              hint="ID del número en WhatsApp Business"
            />
            <Field
              label="Número From"
              id="waFrom"
              placeholder="+52 81 0000 0000"
              value={form.waFrom}
              onChange={(v: string) => set('waFrom', v)}
            />
          </div>
        )}

        {form.waProvider === 'link' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            Con esta opción el sistema no envía WA automáticamente. Los links wa.me aparecerán en el panel para envío manual. Para envío automático, configura la <strong>Meta WhatsApp Cloud API</strong>.
          </div>
        )}
      </Section>

      <Section title="Ventana de validación de boletos" icon={ClockIcon}>
        <p className="text-sm text-gray-500 -mt-2">Define cuántas horas antes y después del evento se aceptan escaneos de QR.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Horas antes del evento"
            id="ventanaAntes" type="number"
            placeholder="4"
            value={form.ventanaAntesHoras}
            onChange={(v: string) => set('ventanaAntesHoras', parseInt(v) || 4)}
            hint="Apertura de puertas"
          />
          <Field
            label="Horas después del evento"
            id="ventanaDespues" type="number"
            placeholder="2"
            value={form.ventanaDespuesHoras}
            onChange={(v: string) => set('ventanaDespuesHoras', parseInt(v) || 2)}
            hint="Cierre de accesos"
          />
        </div>
        <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
          Ejemplo: si el evento es a las <strong>20:00</strong> con 4h antes y 2h después → validación activa de <strong>16:00 a 02:00</strong>.
        </div>
      </Section>
    </div>
  );
}
