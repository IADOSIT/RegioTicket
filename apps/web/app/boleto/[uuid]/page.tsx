// Boleto digital con QR, estado y opciones de descarga/reenvío
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatFecha, formatMXN } from '@/lib/utils';
import { api } from '@/lib/api';
import { DownloadIcon, MailIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon } from 'lucide-react';

export default function BoletoPage() {
  const { uuid } = useParams();
  const [boleto, setBoleto] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reenvioEmail, setReenvioEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.boletos.get(uuid as string)
      .then(setBoleto)
      .catch(() => setError('Boleto no encontrado'))
      .finally(() => setLoading(false));
  }, [uuid]);

  async function handleReenvio() {
    try {
      await api.boletos.reenviar(uuid as string, reenvioEmail);
      setEnviado(true);
    } catch (e: any) { alert(e.message); }
  }

  if (loading) return (
    <>
      <Header />
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>
    </>
  );

  if (error || !boleto) return (
    <>
      <Header />
      <div className="text-center py-20 text-gray-400"><p>Boleto no encontrado.</p></div>
      <Footer />
    </>
  );

  const usado = boleto.estado === 'USADO';
  const cancelado = boleto.estado === 'CANCELADO';

  return (
    <>
      <Header />
      <main className="max-w-md mx-auto px-4 py-10">
        {usado && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 mb-6">
            <XCircleIcon size={20} className="text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-red-700">Este boleto ya fue utilizado</p>
              {boleto.ultimoAcceso && <p className="text-xs text-red-500">Acceso: {new Date(boleto.ultimoAcceso).toLocaleString('es-MX')}</p>}
            </div>
          </div>
        )}
        {cancelado && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 mb-6">
            <AlertCircleIcon size={20} className="text-amber-500 shrink-0" />
            <p className="font-semibold text-amber-700">Boleto cancelado</p>
          </div>
        )}
        {!usado && !cancelado && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 mb-6">
            <CheckCircleIcon size={20} className="text-green-600 shrink-0" />
            <p className="font-semibold text-green-700">Boleto válido</p>
          </div>
        )}

        {/* Ticket visual */}
        <div className="border-2 border-dashed border-green-400 rounded-2xl p-6 bg-white">
          <div className="text-center mb-6">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-widest">RegioTicket</p>
          </div>

          <div className="flex justify-center mb-6">
            <div className={`p-3 rounded-xl border-2 ${usado ? 'border-red-200 opacity-60 grayscale' : 'border-green-100'}`}>
              <QRCodeSVG value={uuid as string} size={220} level="H" />
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Evento</p>
              <p className="font-semibold text-gray-900 text-base">{boleto.evento.nombre}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Lugar</p>
              <p className="font-medium text-gray-700">{boleto.evento.lugar}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Fecha</p>
              <p className="font-medium text-gray-700">{boleto.evento.fechaEvento}</p>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Categoría</p>
                <p className="font-semibold text-gray-900">{boleto.categoria.nombre}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Boleto #</p>
                <p className="font-semibold text-gray-900">{boleto.numero}</p>
              </div>
            </div>
            {boleto.compradorNombre && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Titular</p>
                <p className="font-medium text-gray-700">{boleto.compradorNombre}</p>
              </div>
            )}
            <div>
              <Badge variant={boleto.canal === 'ONLINE' ? 'default' : 'secondary'}>{boleto.canal}</Badge>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 break-all">{uuid}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-6 space-y-3">
          <a href={`/api/boletos/${uuid}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full" size="lg">
              <DownloadIcon size={16} className="mr-2" />Descargar PDF
            </Button>
          </a>

          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email para reenvío"
              value={reenvioEmail}
              onChange={(e) => setReenvioEmail(e.target.value)}
              className="flex-1 h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Button variant="outline" onClick={handleReenvio} disabled={!reenvioEmail || enviado}>
              <MailIcon size={16} className="mr-1" />{enviado ? '✓ Enviado' : 'Enviar'}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
