'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { formatMXN } from '@/lib/utils';
import {
  PlusIcon, MinusIcon, TrashIcon, PrinterIcon, CheckCircleIcon,
  TicketIcon, ReceiptIcon, UserIcon, CreditCardIcon, BanknoteIcon, GiftIcon,
} from 'lucide-react';

interface CartItem { categoriaId: string; nombre: string; precio: number; cantidad: number; }

const FORMAS_PAGO = [
  { value: 'EFECTIVO',  label: 'Efectivo',  icon: BanknoteIcon },
  { value: 'TARJETA',   label: 'Tarjeta',   icon: CreditCardIcon },
  { value: 'CORTESIA',  label: 'Cortesía',  icon: GiftIcon },
] as const;

export default function AdminPOSPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.apiToken ?? '';
  const cajeroNombre = (session?.user as any)?.nombre ?? (session?.user as any)?.email ?? '';

  const [eventos, setEventos]       = useState<any[]>([]);
  const [eventoSel, setEventoSel]   = useState<any>(null);
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [formaPago, setFormaPago]   = useState<'EFECTIVO' | 'TARJETA' | 'CORTESIA'>('EFECTIVO');
  const [recibido, setRecibido]     = useState('');
  const [referencia, setReferencia] = useState('');
  const [comprador, setComprador]   = useState({ nombre: '', email: '', whatsapp: '', telefono: '' });
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado]   = useState<any>(null);
  const [error, setError]           = useState('');
  const [corte, setCorte]           = useState<any>(null);
  const [verCorte, setVerCorte]     = useState(false);

  useEffect(() => {
    if (!token) return;
    api.taquilla.eventos(token).then((evs) => {
      setEventos(evs);
      if (evs.length > 0) setEventoSel(evs[0]);
    }).catch(() => {});
    api.taquilla.turno(token).then(setCorte).catch(() => {});
  }, [token]);

  function adjustCart(cat: any, delta: number) {
    setCart((prev) => {
      const existing = prev.find((c) => c.categoriaId === cat.id);
      if (!existing && delta > 0) return [...prev, { categoriaId: cat.id, nombre: cat.nombre, precio: Number(cat.precio), cantidad: 1 }];
      return prev
        .map((c) => c.categoriaId === cat.id ? { ...c, cantidad: Math.max(0, Math.min(c.cantidad + delta, cat.disponibles)) } : c)
        .filter((c) => c.cantidad > 0);
    });
  }

  function removeFromCart(catId: string) {
    setCart((prev) => prev.filter((c) => c.categoriaId !== catId));
  }

  const subtotal = cart.reduce((a, c) => a + c.precio * c.cantidad, 0);
  const total = formaPago === 'CORTESIA' ? 0 : subtotal;
  const cambio = parseFloat(recibido || '0') - total;
  const totalBoletos = cart.reduce((a, c) => a + c.cantidad, 0);

  async function cobrar() {
    if (cart.length === 0) return;
    setError('');
    setProcesando(true);
    try {
      const res = await api.taquilla.venta({
        eventoId: eventoSel.id,
        items: cart.map((c) => ({ categoriaId: c.categoriaId, cantidad: c.cantidad })),
        formaPago,
        referenciaPago: formaPago === 'TARJETA' ? referencia : undefined,
        comprador: {
          nombre: comprador.nombre || undefined,
          email: comprador.email || undefined,
          whatsapp: comprador.whatsapp || undefined,
          telefono: comprador.telefono || undefined,
        },
      }, token);
      setResultado({ ...res, eventoNombre: eventoSel.nombre, formaPago, total, cambio: formaPago === 'EFECTIVO' ? Math.max(0, cambio) : 0 });
      setCart([]);
      setRecibido('');
      setReferencia('');
      setComprador({ nombre: '', email: '', whatsapp: '', telefono: '' });
    } catch (e: any) {
      setError(e.message ?? 'Error procesando venta');
    } finally {
      setProcesando(false);
    }
  }

  function nuevaVenta() {
    setResultado(null);
    setError('');
  }

  // ── Corte del día ────────────────────────────────────────────────────────
  if (verCorte && corte) return (
    <>
      <style>{`@media print { .no-print { display: none !important; } @page { size: 80mm auto; margin: 2mm; } }`}</style>
      <div className="p-4 max-w-xs mx-auto font-mono text-sm">
        <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
          <p className="font-bold text-base">RegioTicket</p>
          <p className="text-xs text-gray-500">CORTE DE CAJA</p>
          <p className="text-xs text-gray-500">{new Date().toLocaleString('es-MX')}</p>
          {cajeroNombre && <p className="text-xs text-gray-500">Cajero: {cajeroNombre}</p>}
        </div>
        <div className="space-y-1 border-b border-dashed border-gray-400 pb-3 mb-3">
          <div className="flex justify-between"><span>Efectivo</span><span className="font-bold">${Number(corte.efectivo).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tarjeta</span><span className="font-bold">${Number(corte.tarjeta).toFixed(2)}</span></div>
          <div className="flex justify-between border-t border-gray-300 pt-1 mt-1 text-base font-black"><span>TOTAL</span><span>${Number(corte.total).toFixed(2)}</span></div>
        </div>
        <div className="space-y-1 border-b border-dashed border-gray-400 pb-3 mb-3">
          <div className="flex justify-between"><span>Boletos vendidos</span><span>{corte.boletos}</span></div>
          <div className="flex justify-between"><span>Órdenes</span><span>{corte.ordenes}</span></div>
        </div>
        <p className="text-center text-xs text-gray-400">* Ventas del día de hoy *</p>
        <div className="no-print flex gap-2 mt-4">
          <button onClick={() => window.print()} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2">
            <PrinterIcon size={14} />Imprimir
          </button>
          <button onClick={() => setVerCorte(false)} className="flex-1 h-10 bg-green-600 text-white rounded-xl text-sm font-semibold">
            Cerrar
          </button>
        </div>
      </div>
    </>
  );

  // ── Pantalla de éxito ────────────────────────────────────────────────────
  if (resultado) return (
    <>
      <style>{`@media print { .no-print { display: none !important; } @page { size: 80mm auto; margin: 2mm; } body { font-family: monospace; } }`}</style>
    <div className="p-6 max-w-sm mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden print:rounded-none print:border-none print:shadow-none">
        {/* Header recibo */}
        <div className="bg-gray-900 px-6 py-5 text-center">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircleIcon size={24} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">¡Venta exitosa!</h2>
          <p className="text-gray-400 text-sm mt-1">{resultado.eventoNombre}</p>
        </div>

        {/* Boletos */}
        <div className="p-5 space-y-3">
          <div className="space-y-2">
            {resultado.boletos.map((b: any, i: number) => (
              <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <TicketIcon size={15} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Boleto #{b.numero}</span>
                </div>
                <a
                  href={resultado.urls_boleto[i]}
                  target="_blank"
                  className="text-xs text-green-600 font-semibold hover:underline"
                >
                  Ver boleto →
                </a>
              </div>
            ))}
          </div>

          {/* Resumen de cobro */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Forma de pago</span>
              <span className="font-medium text-gray-700">{resultado.formaPago}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Total cobrado</span>
              <span className="font-bold text-gray-900 text-base">{formatMXN(resultado.total)}</span>
            </div>
            {resultado.formaPago === 'EFECTIVO' && resultado.cambio > 0 && (
              <div className="flex justify-between text-green-700 font-semibold border-t border-gray-100 pt-2">
                <span>Cambio a dar</span>
                <span className="text-xl">{formatMXN(resultado.cambio)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1 no-print">
            <button
              onClick={() => window.print()}
              className="flex-1 h-11 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
            >
              <PrinterIcon size={15} />Imprimir ticket
            </button>
            <button
              onClick={nuevaVenta}
              className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Nueva venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Pantalla POS principal ───────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Columna izquierda: Catálogo ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 overflow-hidden">

        {/* Selector de evento + corte */}
        <div className="px-4 py-3 border-b border-gray-100 bg-white shrink-0 flex items-center gap-2">
          <select
            value={eventoSel?.id ?? ''}
            onChange={(e) => {
              setEventoSel(eventos.find((ev) => ev.id === e.target.value));
              setCart([]);
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {eventos.length === 0 && <option value="">Sin eventos activos</option>}
            {eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
          </select>
          {corte && (
            <button onClick={() => setVerCorte(true)} title="Corte del día" className="shrink-0 h-9 px-3 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 whitespace-nowrap">
              <ReceiptIcon size={13} />Corte
            </button>
          )}
        </div>

        {/* Header evento */}
        {eventoSel && (
          <div className="px-4 py-2 bg-green-50 border-b border-green-100 shrink-0">
            <p className="text-xs text-green-700 font-medium">{eventoSel.lugar}</p>
          </div>
        )}

        {/* Grid de categorías */}
        <div className="flex-1 overflow-y-auto p-4">
          {!eventoSel ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <TicketIcon size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Selecciona un evento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {eventoSel.categorias?.filter((c: any) => c.activaTaquilla).map((cat: any) => {
                const inCart = cart.find((c) => c.categoriaId === cat.id)?.cantidad ?? 0;
                const agotado = cat.disponibles === 0;
                return (
                  <div
                    key={cat.id}
                    className={`relative bg-white border rounded-xl p-4 flex flex-col gap-3 transition-all ${
                      agotado ? 'opacity-50 border-gray-100' :
                      inCart > 0 ? 'border-green-400 shadow-sm ring-1 ring-green-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {inCart > 0 && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {inCart}
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{cat.nombre}</p>
                      <p className="text-green-600 font-bold text-lg mt-1">{formatMXN(cat.precio)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{cat.disponibles} disponibles</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => adjustCart(cat, -1)}
                        disabled={inCart === 0}
                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors"
                      >
                        <MinusIcon size={14} className="text-gray-600" />
                      </button>
                      <span className="flex-1 text-center font-bold text-gray-900">{inCart}</span>
                      <button
                        onClick={() => adjustCart(cat, 1)}
                        disabled={agotado || inCart >= cat.disponibles}
                        className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center hover:bg-green-700 disabled:opacity-30 transition-colors"
                      >
                        <PlusIcon size={14} className="text-white" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Columna derecha: Carrito + cobro ─────────────────────────────── */}
      <div className="w-80 shrink-0 flex flex-col bg-gray-50 overflow-y-auto">

        {/* Carrito */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <ReceiptIcon size={15} className="text-gray-400" />
            Carrito
            {totalBoletos > 0 && <span className="ml-auto text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">{totalBoletos} {totalBoletos === 1 ? 'boleto' : 'boletos'}</span>}
          </h2>

          {cart.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Selecciona categorías del catálogo</p>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.categoriaId} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 truncate">{item.nombre}</p>
                    <p className="text-xs text-gray-400">× {item.cantidad} · {formatMXN(item.precio)} c/u</p>
                  </div>
                  <span className="font-semibold text-gray-900 shrink-0">{formatMXN(item.precio * item.cantidad)}</span>
                  <button onClick={() => removeFromCart(item.categoriaId)} className="text-gray-300 hover:text-red-400 transition-colors ml-1">
                    <TrashIcon size={13} />
                  </button>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                <span className="text-sm text-gray-500">Subtotal</span>
                <span className="font-bold text-gray-900">{formatMXN(subtotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Datos comprador (colapsable) */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <UserIcon size={11} />Comprador <span className="font-normal normal-case text-gray-400">(opcional)</span>
          </p>
          <div className="space-y-2">
            {[
              { key: 'nombre', placeholder: 'Nombre completo', type: 'text' },
              { key: 'email', placeholder: 'Email (para enviar boleto)', type: 'email' },
              { key: 'whatsapp', placeholder: 'WhatsApp', type: 'tel' },
            ].map(({ key, placeholder, type }) => (
              <input
                key={key}
                type={type}
                placeholder={placeholder}
                value={(comprador as any)[key]}
                onChange={(e) => setComprador((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full h-8 border border-gray-200 rounded-lg px-3 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
            ))}
          </div>
        </div>

        {/* Forma de pago */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Forma de pago</p>
          <div className="grid grid-cols-3 gap-2">
            {FORMAS_PAGO.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setFormaPago(value)}
                className={`h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all text-xs font-semibold ${
                  formaPago === value
                    ? value === 'CORTESIA' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Efectivo: monto recibido */}
          {formaPago === 'EFECTIVO' && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-gray-500">Monto recibido</p>
              <input
                type="number"
                value={recibido}
                onChange={(e) => setRecibido(e.target.value)}
                placeholder="0.00"
                className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
              {recibido && (
                <div className={`flex justify-between text-sm font-bold px-1 pt-1 ${cambio >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  <span>Cambio</span>
                  <span>{cambio >= 0 ? formatMXN(cambio) : `Faltan ${formatMXN(-cambio)}`}</span>
                </div>
              )}
            </div>
          )}

          {/* Tarjeta: referencia */}
          {formaPago === 'TARJETA' && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-gray-500">Referencia / N° voucher</p>
              <input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Número de autorización"
                className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
            </div>
          )}

          {/* Cortesía: info */}
          {formaPago === 'CORTESIA' && (
            <div className="mt-3 p-3 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-700">
              El boleto se emitirá sin costo. Asegúrate de tener autorización para emitir cortesías.
            </div>
          )}
        </div>

        {/* Total y botón cobrar */}
        <div className="p-4 mt-auto">
          {error && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
          )}

          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-500">Total a cobrar</span>
            <span className={`text-2xl font-bold ${formaPago === 'CORTESIA' ? 'text-violet-600 line-through opacity-50' : 'text-gray-900'}`}>
              {formatMXN(formaPago === 'CORTESIA' ? subtotal : total)}
            </span>
          </div>
          {formaPago === 'CORTESIA' && (
            <p className="text-center text-xs text-violet-600 font-semibold mb-3">— CORTESÍA —</p>
          )}

          <button
            onClick={cobrar}
            disabled={cart.length === 0 || procesando || (formaPago === 'EFECTIVO' && recibido !== '' && cambio < 0)}
            className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-base disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {procesando ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Procesando…</>
            ) : (
              <><TicketIcon size={18} />
                {formaPago === 'CORTESIA' ? 'Emitir cortesía' : `Cobrar ${cart.length > 0 ? formatMXN(total) : ''}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
