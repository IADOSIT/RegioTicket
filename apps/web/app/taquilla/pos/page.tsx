// Punto de venta taquilla — layout 2 columnas catálogo + carrito
'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { formatMXN } from '@/lib/utils';
import { PlusIcon, MinusIcon, ShoppingCartIcon, PackageIcon } from 'lucide-react';

interface CartItem { categoriaId: string; nombre: string; precio: number; cantidad: number; }

export default function POSPage() {
  const [token, setToken] = useState('');
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventoSel, setEventoSel] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [formaPago, setFormaPago] = useState<'EFECTIVO' | 'TARJETA'>('EFECTIVO');
  const [recibido, setRecibido] = useState('');
  const [referencia, setReferencia] = useState('');
  const [comprador, setComprador] = useState({ nombre: '', email: '', telefono: '' });
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [tab, setTab] = useState<'boletos' | 'productos'>('boletos');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('taquilla_token') ?? '';
    setToken(t);
    if (t) api.taquilla.eventos(t).then((evs) => { setEventos(evs); if (evs.length > 0) setEventoSel(evs[0]); });
  }, []);

  function adjustCart(cat: any, delta: number) {
    setCart((prev) => {
      const existing = prev.find((c) => c.categoriaId === cat.id);
      if (!existing && delta > 0) return [...prev, { categoriaId: cat.id, nombre: cat.nombre, precio: Number(cat.precio), cantidad: 1 }];
      return prev.map((c) => c.categoriaId === cat.id ? { ...c, cantidad: Math.max(0, c.cantidad + delta) } : c).filter((c) => c.cantidad > 0);
    });
  }

  const total = cart.reduce((a, c) => a + c.precio * c.cantidad, 0);
  const cambio = parseFloat(recibido) - total;

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
        comprador: { nombre: comprador.nombre || undefined, email: comprador.email || undefined, telefono: comprador.telefono || undefined },
      }, token);
      setResultado(res);
      setCart([]);
      setRecibido('');
      setReferencia('');
      setComprador({ nombre: '', email: '', telefono: '' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  }

  if (resultado) return (
    <div className="p-6 text-center space-y-6">
      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">¡Venta exitosa!</h2>
        <p className="text-gray-400 mt-1">{resultado.boletos.length} boleto(s) generado(s)</p>
      </div>
      <div className="bg-gray-800 rounded-xl p-4 text-left space-y-2">
        {resultado.boletos.map((b: any) => (
          <div key={b.id} className="flex justify-between text-sm">
            <span className="text-gray-300">Boleto #{b.numero}</span>
            <a href={resultado.urls_boleto.find((u: string) => u.includes(b.id))} target="_blank" className="text-green-400 underline">Ver</a>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => window.print()} className="flex-1 h-12 border border-gray-600 text-gray-300 rounded-lg font-semibold hover:bg-gray-800">Imprimir</button>
        <button onClick={() => setResultado(null)} className="flex-1 h-12 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">Nueva venta</button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-112px)]">
      {/* Catálogo */}
      <div className="flex-1 flex flex-col border-r border-gray-700 overflow-hidden">
        {/* Selector evento */}
        <div className="p-3 border-b border-gray-700">
          <select
            value={eventoSel?.id ?? ''}
            onChange={(e) => setEventoSel(eventos.find((ev) => ev.id === e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button onClick={() => setTab('boletos')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${tab === 'boletos' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-500'}`}>
            <ShoppingCartIcon size={16} />Boletos
          </button>
          <button onClick={() => setTab('productos')} disabled className="flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 text-gray-600 cursor-not-allowed">
            <PackageIcon size={16} />Productos <span className="text-xs bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded-full">Próx.</span>
          </button>
        </div>

        {/* Grid categorías */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {eventoSel?.categorias?.filter((c: any) => c.activaTaquilla).map((cat: any) => {
            const inCart = cart.find((c) => c.categoriaId === cat.id)?.cantidad ?? 0;
            return (
              <div key={cat.id} className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">{cat.nombre}</p>
                  <p className="text-green-400 font-bold">{formatMXN(cat.precio)}</p>
                  <p className="text-xs text-gray-500">{cat.disponibles} disp.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => adjustCart(cat, -1)} className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600 disabled:opacity-30" disabled={inCart === 0}><MinusIcon size={14} /></button>
                  <span className="w-6 text-center font-bold text-white">{inCart}</span>
                  <button onClick={() => adjustCart(cat, 1)} className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center hover:bg-green-600" disabled={inCart >= cat.disponibles}><PlusIcon size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carrito */}
      <div className="w-80 flex flex-col bg-gray-850 overflow-y-auto">
        <div className="p-4 flex-1 space-y-3">
          <h2 className="font-bold text-white text-base">Carrito</h2>

          {cart.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Selecciona categorías del catálogo</p>
          ) : (
            cart.map((item) => (
              <div key={item.categoriaId} className="flex justify-between items-center text-sm">
                <span className="text-gray-300">{item.nombre} × {item.cantidad}</span>
                <span className="text-white font-semibold">{formatMXN(item.precio * item.cantidad)}</span>
              </div>
            ))
          )}

          {cart.length > 0 && (
            <div className="border-t border-gray-700 pt-3">
              <div className="flex justify-between text-xl font-bold text-white"><span>Total</span><span className="text-green-400">{formatMXN(total)}</span></div>
            </div>
          )}

          {/* Datos comprador */}
          <div className="space-y-2 pt-2">
            {[
              { id: 'nombre', label: 'Nombre (opcional)', placeholder: 'Nombre del cliente' },
              { id: 'email', label: 'Email (opcional)', placeholder: 'cliente@email.com' },
              { id: 'telefono', label: 'Teléfono (opcional)', placeholder: '+52 81...' },
            ].map(({ id, label, placeholder }) => (
              <div key={id}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <input value={(comprador as any)[id]} onChange={(e) => setComprador((p) => ({ ...p, [id]: e.target.value }))} placeholder={placeholder}
                  className="w-full h-9 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
              </div>
            ))}
          </div>

          {/* Forma de pago */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Forma de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {(['EFECTIVO', 'TARJETA'] as const).map((fp) => (
                <button key={fp} onClick={() => setFormaPago(fp)}
                  className={`h-10 rounded-lg text-sm font-semibold border transition-colors ${formaPago === fp ? 'bg-green-600 border-green-600 text-white' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}>
                  {fp}
                </button>
              ))}
            </div>
          </div>

          {formaPago === 'EFECTIVO' && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Recibido $</p>
              <input type="number" value={recibido} onChange={(e) => setRecibido(e.target.value)} placeholder="0.00"
                className="w-full h-9 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
              {recibido && !isNaN(cambio) && (
                <p className={`text-sm mt-1 font-semibold ${cambio >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  Cambio: {formatMXN(Math.max(0, cambio))}
                </p>
              )}
            </div>
          )}

          {formaPago === 'TARJETA' && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Referencia / voucher</p>
              <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Nº de autorización"
                className="w-full h-9 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        <div className="p-4 border-t border-gray-700">
          <button onClick={cobrar} disabled={cart.length === 0 || procesando}
            className="w-full h-16 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg disabled:opacity-40 transition-colors">
            {procesando ? 'Procesando…' : `COBRAR ${cart.length > 0 ? formatMXN(total) : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
