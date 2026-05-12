'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import {
  SaveIcon, CheckCircleIcon, MailIcon, MessageCircleIcon,
  ClockIcon, PaletteIcon, GlobeIcon, ExternalLinkIcon, CreditCardIcon,
} from 'lucide-react';
import { ImageUploadField } from '@/components/ImageUploadField';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'regioticket.iados.online';

function ConfigEmpresaForm() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.apiToken;
  const rol = (session?.user as any)?.rol;
  const searchParams = useSearchParams();
  const empresaIdParam = searchParams.get('empresaId') || undefined;
  const empresaId = rol === 'SUPER_ADMIN' ? empresaIdParam : undefined;

  const [form, setForm] = useState<Record<string, any>>({
    smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '',
    smtpFrom: '', smtpFromNombre: '',
    waProvider: 'link', waToken: '', waPhoneId: '', waFrom: '',
    ventanaAntesHoras: 4, ventanaDespuesHoras: 2,
    colorPrimario: '#16a34a', descripcionCorta: '', heroTexto: '',
    bannerUrl: '', facebook: '', instagram: '', tiktok: '',
    emailContacto: '', telefonoContacto: '',
    stripePublicKey: '', stripeSecretKey: '', stripeWebhookSecret: '',
    oxxoActivo: false,
    speiActivo: false, speiClabe: '', speiNombreBanco: '', speiBeneficiario: '',
  });
  const [slug, setSlug] = useState('');
  const [guardado, setGuardado] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.admin.configEmpresa.get(token, empresaId)
      .then((data) => setForm((p) => ({ ...p, ...data })))
      .catch(() => {});
    // Si es SUPER_ADMIN con empresaId, buscar el slug de esa empresa
    if (empresaId) {
      api.admin.empresas.list(token)
        .then((list: any[]) => {
          const emp = list.find((e) => e.id === empresaId);
          if (emp) setSlug(emp.slug);
        })
        .catch(() => {});
    }
  }, [token, empresaId]);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  async function guardar() {
    setLoading(true);
    try {
      await api.admin.configEmpresa.save(form, token, empresaId);
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

  const subdomainUrl = slug ? `https://${slug}.${BASE_DOMAIN}` : null;

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de empresa</h1>
          <p className="text-sm text-gray-500 mt-1">
            {subdomainUrl
              ? <>Configurando: <a href={subdomainUrl} target="_blank" className="text-green-600 hover:underline inline-flex items-center gap-1">{subdomainUrl}<ExternalLinkIcon size={11}/></a></>
              : 'Email, WhatsApp, ventana de validación y apariencia'
            }
          </p>
        </div>
        <Button onClick={guardar} disabled={loading} className="shrink-0">
          {guardado
            ? <><CheckCircleIcon size={16} className="mr-2 text-green-500" />Guardado</>
            : <><SaveIcon size={16} className="mr-2" />Guardar</>}
        </Button>
      </div>

      {/* Apariencia del subdominio */}
      <Section title="Apariencia del subdominio" icon={PaletteIcon}>
        {subdomainUrl && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 flex items-center justify-between">
            <span>Subdominio activo: <strong>{subdomainUrl}</strong></span>
            <a href={subdomainUrl} target="_blank" rel="noopener noreferrer" className="underline ml-2">Ver →</a>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="colorPrimario">Color primario</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                id="colorPrimario"
                value={form.colorPrimario || '#16a34a'}
                onChange={(e) => set('colorPrimario', e.target.value)}
                className="h-10 w-14 rounded border border-gray-200 cursor-pointer p-0.5"
              />
              <Input
                value={form.colorPrimario || '#16a34a'}
                onChange={(e) => set('colorPrimario', e.target.value)}
                placeholder="#16a34a"
                className="flex-1"
              />
            </div>
          </div>
          <Field label="Descripción corta" id="descripcionCorta" placeholder="La mejor boletería de NL" value={form.descripcionCorta} onChange={(v: string) => set('descripcionCorta', v)} hint="Aparece en el footer del subdominio" />
        </div>
        <Field label="Texto del hero (portada)" id="heroTexto" placeholder="Bienvenido a Palacio Vaquero" value={form.heroTexto} onChange={(v: string) => set('heroTexto', v)} hint="Título principal en la página de inicio del subdominio" />
        <ImageUploadField label="Imagen de banner (hero)" id="bannerUrl" value={form.bannerUrl ?? ''} onChange={(v) => set('bannerUrl', v)} token={token} hint="Imagen de fondo del hero (1920×600px recomendado)" />
      </Section>

      {/* Redes sociales y contacto público */}
      <Section title="Redes sociales y contacto público" icon={GlobeIcon}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Facebook" id="facebook" placeholder="https://facebook.com/tuempresa" value={form.facebook} onChange={(v: string) => set('facebook', v)} />
          <Field label="Instagram" id="instagram" placeholder="https://instagram.com/tuempresa" value={form.instagram} onChange={(v: string) => set('instagram', v)} />
          <Field label="TikTok" id="tiktok" placeholder="https://tiktok.com/@tuempresa" value={form.tiktok} onChange={(v: string) => set('tiktok', v)} />
          <Field label="Email de contacto público" id="emailContacto" placeholder="info@tuempresa.com" value={form.emailContacto} onChange={(v: string) => set('emailContacto', v)} />
          <Field label="Teléfono de contacto" id="telefonoContacto" placeholder="+52 81 0000 0000" value={form.telefonoContacto} onChange={(v: string) => set('telefonoContacto', v)} />
        </div>
      </Section>

      {/* SMTP */}
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
          <strong>Gmail:</strong> smtp.gmail.com:587 con contraseña de aplicación.<br />
          <strong>Outlook:</strong> smtp-mail.outlook.com:587
        </div>
      </Section>

      {/* WhatsApp */}
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
            <Field label="Token de acceso (Meta)" id="waToken" type="password" placeholder="••••••••" value={form.waToken} onChange={(v: string) => set('waToken', v)} hint="Token permanente de tu app de Meta" />
            <Field label="Phone Number ID" id="waPhoneId" placeholder="123456789012345" value={form.waPhoneId} onChange={(v: string) => set('waPhoneId', v)} hint="ID del número en WhatsApp Business" />
            <Field label="Número From" id="waFrom" placeholder="+52 81 0000 0000" value={form.waFrom} onChange={(v: string) => set('waFrom', v)} />
          </div>
        )}
        {form.waProvider === 'link' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            Con esta opción el sistema genera links wa.me. Para envío automático configura la <strong>Meta WhatsApp Cloud API</strong>.
          </div>
        )}
      </Section>

      {/* Stripe */}
      <Section title="Pago con tarjeta (Stripe)" icon={CreditCardIcon}>
        <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800 space-y-1">
          <p>Activa el pago con tarjeta de crédito/débito para esta empresa en el checkout.</p>
          <p><strong>Publishable Key:</strong> empieza con <code className="bg-blue-100 px-1 rounded">pk_live_</code> o <code className="bg-blue-100 px-1 rounded">pk_test_</code></p>
          <p><strong>Secret Key:</strong> empieza con <code className="bg-blue-100 px-1 rounded">sk_live_</code> — nunca la compartas.</p>
          <p><strong>Webhook Secret:</strong> obtenlo en el Dashboard de Stripe → Webhooks. URL del endpoint: <code className="bg-blue-100 px-1 rounded">/api/stripe/webhook</code></p>
        </div>
        <Field label="Publishable Key" id="stripePublicKey" placeholder="pk_live_..." value={form.stripePublicKey} onChange={(v: string) => set('stripePublicKey', v)} />
        <Field label="Secret Key" id="stripeSecretKey" type="password" placeholder="sk_live_..." value={form.stripeSecretKey} onChange={(v: string) => set('stripeSecretKey', v)} hint="Se guarda cifrado, no se muestra en texto plano" />
        <Field label="Webhook Secret" id="stripeWebhookSecret" type="password" placeholder="whsec_..." value={form.stripeWebhookSecret} onChange={(v: string) => set('stripeWebhookSecret', v)} />
        <div className="pt-2 border-t border-gray-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={!!form.oxxoActivo} onChange={(e) => set('oxxoActivo', e.target.checked)} className="w-4 h-4 accent-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-800">Habilitar pago OXXO</p>
              <p className="text-xs text-gray-400">Requiere Stripe configurado. El comprador recibe un voucher para pagar en tienda OXXO.</p>
            </div>
          </label>
        </div>
      </Section>

      {/* SPEI */}
      <Section title="Transferencia bancaria (SPEI)" icon={CreditCardIcon}>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={!!form.speiActivo} onChange={(e) => set('speiActivo', e.target.checked)} className="w-4 h-4 accent-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-800">Habilitar pago por SPEI</p>
            <p className="text-xs text-gray-400">El comprador transfiere y el admin confirma el pago manualmente.</p>
          </div>
        </label>
        {form.speiActivo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Field label="CLABE interbancaria (18 dígitos)" id="speiClabe" placeholder="012345678901234567" value={form.speiClabe} onChange={(v: string) => set('speiClabe', v)} />
            <Field label="Nombre del banco" id="speiNombreBanco" placeholder="BBVA, Santander..." value={form.speiNombreBanco} onChange={(v: string) => set('speiNombreBanco', v)} />
            <Field label="Nombre del beneficiario" id="speiBeneficiario" placeholder="Razón social o nombre" value={form.speiBeneficiario} onChange={(v: string) => set('speiBeneficiario', v)} hint="Nombre que aparece en el comprobante" />
          </div>
        )}
      </Section>

      {/* Ventana de validación */}
      <Section title="Ventana de validación de boletos" icon={ClockIcon}>
        <p className="text-sm text-gray-500 -mt-2">Horas antes y después del evento en que se aceptan escaneos QR.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Horas antes del evento" id="ventanaAntes" type="number" placeholder="4" value={form.ventanaAntesHoras} onChange={(v: string) => set('ventanaAntesHoras', parseInt(v) || 4)} hint="Apertura de puertas" />
          <Field label="Horas después del evento" id="ventanaDespues" type="number" placeholder="2" value={form.ventanaDespuesHoras} onChange={(v: string) => set('ventanaDespuesHoras', parseInt(v) || 2)} hint="Cierre de accesos" />
        </div>
        <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
          Ejemplo: evento a las <strong>20:00</strong> con 4h antes y 2h después → validación de <strong>16:00 a 02:00</strong>.
        </div>
      </Section>
    </div>
  );
}

export default function ConfigEmpresaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Cargando...</div>}>
      <ConfigEmpresaForm />
    </Suspense>
  );
}
