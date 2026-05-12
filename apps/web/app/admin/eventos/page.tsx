// CRUD de eventos en el panel admin
'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatFechaCorta } from '@/lib/utils';
import { ImageUploadField } from '@/components/ImageUploadField';
import { PlusIcon, PencilIcon, TrashIcon, FolderIcon, MapIcon, QrCodeIcon, DownloadIcon, XIcon, BanIcon, PrinterIcon, SmartphoneIcon, TagIcon, CreditCardIcon, MailIcon, MapPinIcon, CalendarIcon } from 'lucide-react';

export default function EventosAdminPage() {
  const { data: session } = useSession();
  const [eventos, setEventos] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState({ nombre: '', lugar: '', fechaEvento: '', descripcion: '', imagen: '', estado: 'BORRADOR', ventaOnline: true, ventaTaquilla: true, aforoTotal: '', empresaId: '' });
  const [qrModal, setQrModal] = useState<{ qr: string; url: string; nombre: string; imagen: string | null; lugar: string | null; fechaEvento: string | null; empresa: { nombre: string; logo: string | null } | null } | null>(null);
  const [qrLoading, setQrLoading] = useState<string | null>(null);
  const token = (session?.user as any)?.apiToken;
  const rol = (session?.user as any)?.rol;
  const isSuperAdmin = rol === 'SUPER_ADMIN';

  const cargar = async () => {
    const [ev, em] = await Promise.all([
      api.admin.eventos.list(token),
      isSuperAdmin ? api.admin.empresas.list(token) : Promise.resolve([]),
    ]);
    setEventos(ev);
    setEmpresas(em);
  };
  useEffect(() => { if (token) cargar(); }, [token]);

  function abrirModal(ev?: any) {
    setEditando(ev ?? null);
    setForm(ev
      ? { nombre: ev.nombre, lugar: ev.lugar, fechaEvento: ev.fechaEvento?.slice(0, 16) ?? '', descripcion: ev.descripcion ?? '', imagen: ev.imagen ?? '', estado: ev.estado, ventaOnline: ev.ventaOnline, ventaTaquilla: ev.ventaTaquilla, aforoTotal: ev.aforoTotal?.toString() ?? '', empresaId: ev.empresaId ?? '' }
      : { nombre: '', lugar: '', fechaEvento: '', descripcion: '', imagen: '', estado: 'BORRADOR', ventaOnline: true, ventaTaquilla: true, aforoTotal: '', empresaId: '' }
    );
    setModal(true);
  }

  async function guardar() {
    const data: any = { ...form };
    if (!isSuperAdmin) delete data.empresaId;
    if (data.empresaId === '') data.empresaId = undefined;
    if (data.aforoTotal !== '') data.aforoTotal = parseInt(data.aforoTotal); else delete data.aforoTotal;
    if (editando) { await api.admin.eventos.update(editando.id, data, token); }
    else { await api.admin.eventos.create(data, token); }
    setModal(false);
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este evento?')) return;
    await api.admin.eventos.delete(id, token);
    cargar();
  }

  async function cancelar(id: string, nombre: string) {
    if (!confirm(`¿Cancelar el evento "${nombre}"?\n\nSe invalidarán todos los boletos activos y se notificará a los compradores. Esta acción no se puede deshacer.`)) return;
    try {
      const r = await api.admin.cancelarEvento(id, token);
      alert(`Evento cancelado. ${r.ordenesAfectadas} órdenes afectadas.`);
      cargar();
    } catch (e: any) { alert(e.message); }
  }

  async function verQR(ev: any) {
    setQrLoading(ev.id);
    try {
      const data = await api.admin.qr.get(ev.id, token);
      setQrModal(data);
    } catch { alert('Error generando QR'); }
    finally { setQrLoading(null); }
  }

  function descargarQR(qr: string, nombre: string) {
    const a = document.createElement('a');
    a.href = qr;
    a.download = `qr-${nombre.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  }

  const estadoBadge = (e: string) => e === 'ACTIVO' ? 'default' : e === 'PAUSADO' ? 'warning' : 'secondary';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
        <Button onClick={() => abrirModal()}><PlusIcon size={16} className="mr-2" />Nuevo evento</Button>
      </div>

      <div className="space-y-3">
        {eventos.map((ev) => (
          <Card key={ev.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900 truncate">{ev.nombre}</p>
                  <Badge variant={estadoBadge(ev.estado)}>{ev.estado}</Badge>
                </div>
                <p className="text-sm text-gray-500 truncate">{ev.lugar} · {formatFechaCorta(ev.fechaEvento)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{ev.categorias?.length ?? 0} categorías · {ev._count?.ordenes ?? 0} órdenes</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <Link href={`/admin/eventos/${ev.id}/categorias`}>
                  <Button variant="outline" size="sm"><FolderIcon size={14} className="mr-1" />Cats.</Button>
                </Link>
                <Link href={`/admin/eventos/${ev.id}/ordenes`}>
                  <Button variant="outline" size="sm">Órdenes</Button>
                </Link>
                <Link href={`/admin/eventos/${ev.id}/mapa`}>
                  <Button variant="outline" size="sm"><MapIcon size={14} className="mr-1" />Mapa</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => verQR(ev)} disabled={qrLoading === ev.id}>
                  <QrCodeIcon size={14} className="mr-1" />{qrLoading === ev.id ? '…' : 'QR'}
                </Button>
                <Button variant="outline" size="icon" onClick={() => abrirModal(ev)}><PencilIcon size={14} /></Button>
                {ev.estado !== 'FINALIZADO' && (
                  <Button variant="outline" size="icon" onClick={() => cancelar(ev.id, ev.nombre)} title="Cancelar evento" className="text-orange-600 border-orange-200 hover:bg-orange-50"><BanIcon size={14} /></Button>
                )}
                <Button variant="destructive" size="icon" onClick={() => eliminar(ev.id)}><TrashIcon size={14} /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal crear/editar evento */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">{editando ? 'Editar evento' : 'Nuevo evento'}</h2>
            {[
              { id: 'nombre', label: 'Nombre', type: 'text' },
              { id: 'lugar', label: 'Lugar', type: 'text' },
              { id: 'fechaEvento', label: 'Fecha del evento', type: 'datetime-local' },
              { id: 'descripcion', label: 'Descripción', type: 'text' },
            ].map(({ id, label, type }) => (
              <div key={id} className="space-y-1">
                <Label>{label}</Label>
                <Input type={type} value={(form as any)[id]} onChange={(e) => setForm((p) => ({ ...p, [id]: e.target.value }))} />
              </div>
            ))}
            <ImageUploadField
              label="Imagen del evento"
              value={form.imagen}
              onChange={(url) => setForm((p) => ({ ...p, imagen: url }))}
              token={token}
              hint="Portada del evento (16:9 recomendado)"
            />
            <div className="space-y-1">
              <Label>Estado</Label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.estado} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}>
                {['BORRADOR', 'ACTIVO', 'PAUSADO', 'FINALIZADO'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Aforo total <span className="text-gray-400 font-normal">(capacidad máxima del venue)</span></Label>
              <Input type="number" min={0} placeholder="Ej: 1000" value={form.aforoTotal} onChange={(e) => setForm((p) => ({ ...p, aforoTotal: e.target.value }))} />
            </div>
            {isSuperAdmin && (
              <div className="space-y-1">
                <Label>Empresa</Label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.empresaId} onChange={(e) => setForm((p) => ({ ...p, empresaId: e.target.value }))}>
                  <option value="">— Sin empresa —</option>
                  {empresas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.ventaOnline} onChange={(e) => setForm((p) => ({ ...p, ventaOnline: e.target.checked }))} />Venta online</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.ventaTaquilla} onChange={(e) => setForm((p) => ({ ...p, ventaTaquilla: e.target.checked }))} />Venta taquilla</label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={guardar}>Guardar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR — hoja carta imprimible */}
      {qrModal && (
        <>
          <style>{`
            @media print {
              body > * { display: none !important; }
              #qr-print-overlay { display: flex !important; position: fixed; inset: 0; background: white; z-index: 9999; align-items: flex-start; justify-content: center; padding: 0; }
              #qr-print-sheet { box-shadow: none !important; border-radius: 0 !important; width: 100% !important; max-width: 100% !important; overflow: visible !important; }
              .print-hide { display: none !important; }
            }
          `}</style>
          <div id="qr-print-overlay" className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div id="qr-print-sheet" className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-y-auto" style={{ maxHeight: '95vh' }}>

              {/* Barra de acciones — oculta al imprimir */}
              <div className="print-hide flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <span className="text-sm text-gray-500 font-medium">Vista previa de impresión</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => descargarQR(qrModal.qr, qrModal.nombre)}>
                    <DownloadIcon size={14} className="mr-1.5" />Descargar QR
                  </Button>
                  <Button size="sm" onClick={() => window.print()}>
                    <PrinterIcon size={14} className="mr-1.5" />Imprimir
                  </Button>
                  <button onClick={() => setQrModal(null)} className="ml-2 text-gray-400 hover:text-gray-600 p-1"><XIcon size={20} /></button>
                </div>
              </div>

              {/* Hoja carta: 8.5" × 11" → ~816 × 1056 px */}
              <div className="px-12 py-8 flex flex-col items-center gap-6" style={{ minHeight: 900 }}>

                {/* Encabezado: logos */}
                <div className="w-full flex items-center justify-between">
                  {qrModal.empresa?.logo
                    ? <img src={qrModal.empresa.logo} alt={qrModal.empresa.nombre} className="h-12 object-contain" />
                    : <span className="text-lg font-bold text-gray-700">{qrModal.empresa?.nombre ?? 'RegioTicket'}</span>
                  }
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-widest">boletos</p>
                    <p className="text-xl font-black text-green-600">RegioTicket</p>
                  </div>
                </div>

                {/* Llamada a la acción */}
                <div className="text-center">
                  <p className="text-4xl font-black text-green-600 leading-tight tracking-tight">¡COMPRA TUS BOLETOS AQUÍ!</p>
                  <p className="text-base text-gray-500 mt-1">Escanea el código QR con tu teléfono</p>
                </div>

                {/* Imagen del evento */}
                {qrModal.imagen && (
                  <div className="w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ maxHeight: 240 }}>
                    <img src={qrModal.imagen} alt={qrModal.nombre} className="w-full object-cover" style={{ maxHeight: 240 }} />
                  </div>
                )}

                {/* Nombre del evento */}
                <div className="text-center">
                  <h1 className="text-3xl font-black text-gray-900 leading-tight">{qrModal.nombre}</h1>
                  <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                    {qrModal.lugar && (
                      <span className="flex items-center gap-1"><MapPinIcon size={14} />{qrModal.lugar}</span>
                    )}
                    {qrModal.fechaEvento && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon size={14} />
                        {new Date(qrModal.fechaEvento).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 rounded-2xl border-4 border-green-500 shadow-lg bg-white">
                    <img src={qrModal.qr} alt="QR" className="w-56 h-56" />
                  </div>
                  <p className="text-xs text-gray-400 break-all text-center max-w-sm">{qrModal.url}</p>
                </div>

                {/* Divisor */}
                <div className="w-full flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">¿Cómo comprar?</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Flujo de compra */}
                <div className="w-full grid grid-cols-4 gap-2 pb-6">
                  {[
                    { icon: SmartphoneIcon, label: 'Escanea\nel QR', color: 'text-blue-500', bg: 'bg-blue-50' },
                    { icon: TagIcon,        label: 'Elige tu\ncategoría', color: 'text-purple-500', bg: 'bg-purple-50' },
                    { icon: CreditCardIcon, label: 'Realiza\ntu pago', color: 'text-orange-500', bg: 'bg-orange-50' },
                    { icon: MailIcon,       label: 'Recibe\ntu boleto', color: 'text-green-500', bg: 'bg-green-50' },
                  ].map(({ icon: Icon, label, color, bg }, i, arr) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center`}>
                          <Icon size={28} className={color} />
                        </div>
                        <p className="text-xs text-center text-gray-600 font-medium leading-tight whitespace-pre-line">{label}</p>
                        <span className="text-[10px] font-bold text-gray-300">PASO {i + 1}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0 -mt-6 text-gray-300">
                          <path d="M7 10h10M13 6l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
