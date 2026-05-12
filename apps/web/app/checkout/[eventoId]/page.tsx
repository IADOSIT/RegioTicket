'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMXN, formatFecha } from '@/lib/utils';
import { api } from '@/lib/api';
import { ShieldCheckIcon, ClockIcon, LockIcon, CreditCardIcon, SmartphoneIcon } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const TIMER_SEGUNDOS = 600;

// ── Formulario de pago con Stripe Elements ──────────────────────────────────
function StripeForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');
    const { error: err } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (err) {
      setError(err.message || 'Error procesando pago');
      setLoading(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>Regresar</Button>
        <Button type="submit" className="flex-1" size="lg" disabled={loading || !stripe}>
          {loading ? 'Procesando…' : 'Confirmar pago'}
        </Button>
      </div>
    </form>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { eventoId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const catIdPreselect = searchParams.get('cat');

  const [step, setStep] = useState(1);
  const [evento, setEvento] = useState<any>(null);
  const [eventoError, setEventoError] = useState(false);
  const [seleccion, setSeleccion] = useState<{ categoriaId: string; cantidad: number }[]>([]);
  const [comprador, setComprador] = useState({ nombre: '', email: '', tel: '', whatsapp: '' });
  const [metodoPago, setMetodoPago] = useState<'mercadopago' | 'stripe' | 'oxxo' | 'spei'>('mercadopago');
  const [oxxoResult, setOxxoResult] = useState<{ numero: string; expira: string } | null>(null);
  const [speiResult, setSpeiResult] = useState<{ clabe: string; banco: string; beneficiario: string; monto: number; referencia: string } | null>(null);
  const [timer, setTimer] = useState(TIMER_SEGUNDOS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stripeState, setStripeState] = useState<{ clientSecret: string; stripePromise: any } | null>(null);
  const [pagado, setPagado] = useState(false);
  const timerRef = useRef<any>(null);
  const [codigoInput, setCodigoInput] = useState('');
  const [promo, setPromo] = useState<{ promoId: string; descuento: number; totalFinal: number; codigo: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  useEffect(() => {
    api.eventos.get(eventoId as string)
      .then((ev) => {
        setEvento(ev);
        if (catIdPreselect) setSeleccion([{ categoriaId: catIdPreselect, cantidad: 1 }]);
        // Si Stripe disponible y no MP, auto-seleccionar tarjeta
        if (ev.stripePublicKey && !ev.mpPublicKey) setMetodoPago('stripe');
      })
      .catch(() => setEventoError(true));
  }, [eventoId, catIdPreselect]);

  useEffect(() => {
    if (step === 1) {
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) { clearInterval(timerRef.current); router.push('/'); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [step, router]);

  function getCat(id: string) { return evento?.categorias?.find((c: any) => c.id === id); }

  function adjustCantidad(catId: string, delta: number) {
    setSeleccion((prev) => {
      const existing = prev.find((s) => s.categoriaId === catId);
      const cat = getCat(catId);
      if (!existing && delta > 0) return [...prev, { categoriaId: catId, cantidad: 1 }];
      return prev
        .map((s) => s.categoriaId === catId ? { ...s, cantidad: Math.max(0, Math.min(s.cantidad + delta, cat?.disponibles ?? 10)) } : s)
        .filter((s) => s.cantidad > 0);
    });
  }

  function getSubtotal() {
    return seleccion.reduce((acc, s) => acc + (getCat(s.categoriaId)?.precio ?? 0) * s.cantidad, 0);
  }
  function getTotal() { return promo ? promo.totalFinal : getSubtotal(); }

  async function aplicarPromo() {
    if (!codigoInput.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const endpoint = evento?.stripePublicKey ? api.stripe.validarPromo : api.ordenes.validarPromo;
      const r = await endpoint({ codigo: codigoInput.trim(), eventoId, subtotal: getSubtotal() });
      setPromo({ promoId: r.promoId, descuento: r.descuento, totalFinal: r.totalFinal, codigo: codigoInput.trim().toUpperCase() });
    } catch (e: any) { setPromoError(e.message); }
    setPromoLoading(false);
  }

  function quitarPromo() { setPromo(null); setCodigoInput(''); setPromoError(''); }

  async function handlePagar() {
    setLoading(true);
    setError('');
    try {
      const base = {
        eventoId, items: seleccion,
        compradorNombre: comprador.nombre, compradorEmail: comprador.email,
        compradorTel: comprador.tel, compradorWhatsapp: comprador.whatsapp,
        codigoPromo: promo?.codigo,
      };
      if (metodoPago === 'stripe') {
        const { clientSecret, publicKey } = await api.stripe.intent(base);
        setStripeState({ clientSecret, stripePromise: loadStripe(publicKey) });
      } else if (metodoPago === 'oxxo') {
        const { clientSecret, publicKey } = await api.stripe.oxxoIntent(base);
        const stripe = await loadStripe(publicKey);
        if (!stripe) throw new Error('No se pudo cargar Stripe');
        const { paymentIntent, error: stripeErr } = await stripe.confirmOxxoPayment(clientSecret, {
          payment_method: { billing_details: { name: comprador.nombre || 'Cliente', email: comprador.email } },
        });
        if (stripeErr) throw new Error(stripeErr.message);
        const oxxo = (paymentIntent as any)?.next_action?.oxxo_display_details;
        setOxxoResult({
          numero: oxxo?.number ?? '—',
          expira: oxxo?.expires_after ? new Date(oxxo.expires_after * 1000).toLocaleDateString('es-MX') : '—',
        });
      } else if (metodoPago === 'spei') {
        const r = await api.ordenes.crearSpei(base);
        setSpeiResult(r);
      } else {
        const { init_point } = await api.ordenes.crear(base);
        window.location.href = init_point;
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const tieneStripe = !!evento?.stripePublicKey;
  const tieneOxxo = !!evento?.oxxoActivo;
  const tieneSpei = !!evento?.speiActivo;
  const tieneMP = true;
  const minutos = String(Math.floor(timer / 60)).padStart(2, '0');
  const segundos = String(timer % 60).padStart(2, '0');

  if (eventoError) return (
    <><Header /><div className="text-center py-20 text-gray-400"><p>Evento no encontrado.</p></div><Footer /></>
  );
  if (!evento) return (
    <><Header /><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div></>
  );

  // Pantalla OXXO
  if (oxxoResult) return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl font-black text-red-600">O</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Voucher OXXO generado!</h1>
        <p className="text-gray-500 mb-6">Paga en cualquier tienda OXXO antes de que expire el voucher.</p>
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-6 text-left space-y-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Número de referencia</p>
            <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest mt-1">{oxxoResult.numero}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Expira el</p>
            <p className="font-semibold text-gray-700">{oxxoResult.expira}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Monto a pagar</p>
            <p className="font-bold text-green-600 text-xl">{formatMXN(getTotal())}</p>
          </div>
        </div>
        <p className="text-sm text-gray-400 mb-6">Recibirás tus boletos por email después de confirmar el pago.</p>
        <Button onClick={() => router.push('/')}>Ir al inicio</Button>
      </main>
      <Footer />
    </>
  );

  // Pantalla SPEI
  if (speiResult) return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-black text-blue-600">$</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Realiza tu transferencia SPEI</h1>
        <p className="text-gray-500 mb-6">Transfiere desde tu app bancaria con los siguientes datos.</p>
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-6 text-left space-y-4">
          {[
            { label: 'CLABE interbancaria', value: speiResult.clabe, mono: true },
            { label: 'Banco', value: speiResult.banco },
            { label: 'Beneficiario', value: speiResult.beneficiario },
            { label: 'Monto', value: formatMXN(speiResult.monto) },
            { label: 'Concepto / Referencia', value: speiResult.referencia, mono: true },
          ].map(({ label, value, mono }) => (
            <div key={label}>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
              <p className={`font-semibold text-gray-900 mt-0.5 ${mono ? 'font-mono tracking-widest' : ''}`}>{value}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-400 mb-6">Una vez confirmada la transferencia, recibirás tus boletos por email. Este proceso puede tardar hasta 24 horas.</p>
        <Button onClick={() => router.push('/')}>Ir al inicio</Button>
      </main>
      <Footer />
    </>
  );

  // Pago exitoso con Stripe
  if (pagado) return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheckIcon size={32} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Pago exitoso!</h1>
        <p className="text-gray-500 mb-6">Recibirás tu boleto por email en unos minutos.</p>
        <Button onClick={() => router.push('/mis-boletos')}>Ver mis boletos</Button>
      </main>
      <Footer />
    </>
  );

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {['Selección', 'Datos', 'Pago'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= i + 1 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</div>
              <span className={`text-sm font-medium hidden sm:inline ${step === i + 1 ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
              {i < 2 && <div className="flex-1 h-px bg-gray-200 min-w-[24px]" />}
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5 text-sm font-mono text-amber-600">
            <ClockIcon size={14} />{minutos}:{segundos}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{evento.nombre}</h1>
        <p className="text-sm text-gray-500 mb-6">{formatFecha(evento.fechaEvento)} · {evento.lugar}</p>

        {/* Paso 1: Selección */}
        {step === 1 && (
          <div className="space-y-4">
            {evento.categorias.filter((c: any) => c.activaOnline).map((cat: any) => {
              const sel = seleccion.find((s) => s.categoriaId === cat.id);
              const cantidad = sel?.cantidad ?? 0;
              return (
                <div key={cat.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{cat.nombre}</p>
                    <p className="text-green-600 font-bold">{formatMXN(cat.precio)}</p>
                    <p className="text-xs text-gray-500">{cat.disponibles} disponibles</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => adjustCantidad(cat.id, -1)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-700" disabled={cantidad === 0}>−</button>
                    <span className="w-6 text-center font-semibold">{cantidad}</span>
                    <button onClick={() => adjustCantidad(cat.id, 1)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-700" disabled={cantidad >= cat.disponibles}>+</button>
                  </div>
                </div>
              );
            })}
            {seleccion.length > 0 && (
              <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                <span className="text-gray-600">Subtotal ({seleccion.reduce((a, s) => a + s.cantidad, 0)} boletos)</span>
                <span className="font-bold text-xl text-gray-900">{formatMXN(getTotal())}</span>
              </div>
            )}
            <Button className="w-full" size="lg" onClick={() => setStep(2)} disabled={seleccion.length === 0}>Continuar</Button>
          </div>
        )}

        {/* Paso 2: Datos del comprador */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input id="nombre" placeholder="Tu nombre" value={comprador.nombre} onChange={(e) => setComprador((p) => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Correo electrónico <span className="text-red-500">*</span></Label>
              <Input id="email" type="email" placeholder="tu@email.com" value={comprador.email} onChange={(e) => setComprador((p) => ({ ...p, email: e.target.value }))} />
              <p className="text-xs text-gray-400">Te enviaremos tu boleto aquí</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="whatsapp">WhatsApp <span className="text-red-500">*</span></Label>
              <Input id="whatsapp" type="tel" placeholder="+52 81 1234 5678" value={comprador.whatsapp} onChange={(e) => setComprador((p) => ({ ...p, whatsapp: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tel">Teléfono (opcional)</Label>
              <Input id="tel" type="tel" placeholder="+52 81 1234 5678" value={comprador.tel} onChange={(e) => setComprador((p) => ({ ...p, tel: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Regresar</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={!comprador.email || !comprador.whatsapp}>Continuar</Button>
            </div>
          </div>
        )}

        {/* Paso 3: Pago */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Resumen */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-gray-900">Resumen de compra</h3>
              {seleccion.map((s) => {
                const cat = getCat(s.categoriaId);
                return (
                  <div key={s.categoriaId} className="flex justify-between text-sm">
                    <span>{cat?.nombre} × {s.cantidad}</span>
                    <span className="font-medium">{formatMXN(cat?.precio * s.cantidad)}</span>
                  </div>
                );
              })}
              {promo && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>Descuento ({promo.codigo})</span>
                  <span>−{formatMXN(promo.descuento)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
                <span>Total</span><span className="text-green-600 text-xl">{formatMXN(getTotal())}</span>
              </div>
            </div>

            {/* Código promo */}
            {!stripeState && (
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Código promocional</p>
                {promo ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-green-700">✓ {promo.codigo} — −{formatMXN(promo.descuento)}</span>
                    <button onClick={quitarPromo} className="text-xs text-gray-400 hover:text-red-500 ml-3">Quitar</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input placeholder="PROMO2026" value={codigoInput} onChange={(e) => setCodigoInput(e.target.value.toUpperCase())} className="flex-1" />
                    <Button variant="outline" onClick={aplicarPromo} disabled={promoLoading || !codigoInput.trim()}>
                      {promoLoading ? '…' : 'Aplicar'}
                    </Button>
                  </div>
                )}
                {promoError && <p className="text-xs text-red-500 mt-1">{promoError}</p>}
              </div>
            )}

            {/* Selector de método de pago */}
            {!stripeState && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Método de pago</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setMetodoPago('mercadopago')} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-colors ${metodoPago === 'mercadopago' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <SmartphoneIcon size={20} className={metodoPago === 'mercadopago' ? 'text-green-600' : 'text-gray-400'} />
                    <span className={`text-xs font-semibold ${metodoPago === 'mercadopago' ? 'text-green-700' : 'text-gray-500'}`}>MercadoPago</span>
                    <span className="text-[10px] text-gray-400">App / transferencia</span>
                  </button>
                  {tieneStripe && (
                    <button onClick={() => setMetodoPago('stripe')} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-colors ${metodoPago === 'stripe' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <CreditCardIcon size={20} className={metodoPago === 'stripe' ? 'text-green-600' : 'text-gray-400'} />
                      <span className={`text-xs font-semibold ${metodoPago === 'stripe' ? 'text-green-700' : 'text-gray-500'}`}>Tarjeta</span>
                      <span className="text-[10px] text-gray-400">Crédito / débito</span>
                    </button>
                  )}
                  {tieneOxxo && (
                    <button onClick={() => setMetodoPago('oxxo')} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-colors ${metodoPago === 'oxxo' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className={`text-lg font-black ${metodoPago === 'oxxo' ? 'text-red-600' : 'text-gray-400'}`}>OXXO</span>
                      <span className={`text-xs font-semibold ${metodoPago === 'oxxo' ? 'text-red-700' : 'text-gray-500'}`}>Pagar en tienda</span>
                      <span className="text-[10px] text-gray-400">Voucher electrónico</span>
                    </button>
                  )}
                  {tieneSpei && (
                    <button onClick={() => setMetodoPago('spei')} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-colors ${metodoPago === 'spei' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className={`text-sm font-black ${metodoPago === 'spei' ? 'text-blue-600' : 'text-gray-400'}`}>SPEI</span>
                      <span className={`text-xs font-semibold ${metodoPago === 'spei' ? 'text-blue-700' : 'text-gray-500'}`}>Transferencia</span>
                      <span className="text-[10px] text-gray-400">Banco / CLABE</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Stripe Elements (se muestra tras crear el intent) */}
            {stripeState ? (
              <Elements stripe={stripeState.stripePromise} options={{ clientSecret: stripeState.clientSecret, locale: 'es-419' }}>
                <StripeForm onSuccess={() => setPagado(true)} onBack={() => setStripeState(null)} />
              </Elements>
            ) : (
              <>
                <div className="flex gap-3 text-xs text-gray-500">
                  <ShieldCheckIcon size={16} className="text-green-600 shrink-0 mt-0.5" />
                  <span>Pago 100% seguro. Tus datos están protegidos con cifrado SSL.</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <LockIcon size={16} className="text-green-600 shrink-0 mt-0.5" />
                  <span>Recibirás tu boleto en PDF al email registrado.</span>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Regresar</Button>
                  <Button className="flex-1" size="lg" onClick={handlePagar} disabled={loading}>
                    {loading ? 'Procesando…' : metodoPago === 'stripe' ? 'Continuar al pago' : metodoPago === 'oxxo' ? 'Generar voucher OXXO' : metodoPago === 'spei' ? 'Ver datos de transferencia' : 'Pagar con MercadoPago'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
