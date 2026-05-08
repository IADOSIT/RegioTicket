// Wizard de checkout 3 pasos: Selección → Datos → Pago
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
import { ShieldCheckIcon, ClockIcon, LockIcon } from 'lucide-react';

const TIMER_SEGUNDOS = 600; // 10 min

export default function CheckoutPage() {
  const { eventoId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const catIdPreselect = searchParams.get('cat');

  const [step, setStep] = useState(1);
  const [evento, setEvento] = useState<any>(null);
  const [seleccion, setSeleccion] = useState<{ categoriaId: string; cantidad: number }[]>([]);
  const [comprador, setComprador] = useState({ nombre: '', email: '', tel: '' });
  const [timer, setTimer] = useState(TIMER_SEGUNDOS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<any>(null);

  useEffect(() => {
    api.eventos.list().then((evs) => {
      const ev = evs.find((e: any) => e.id === eventoId);
      if (ev) {
        setEvento(ev);
        if (catIdPreselect) {
          setSeleccion([{ categoriaId: catIdPreselect, cantidad: 1 }]);
        }
      }
    });
  }, [eventoId, catIdPreselect]);

  useEffect(() => {
    if (step === 1) {
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) { clearInterval(timerRef.current); router.push('/checkout/expirado'); return 0; }
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

  function getTotal() {
    return seleccion.reduce((acc, s) => {
      const cat = getCat(s.categoriaId);
      return acc + (cat?.precio ?? 0) * s.cantidad;
    }, 0);
  }

  async function handlePagar() {
    setLoading(true);
    setError('');
    try {
      const { init_point } = await api.ordenes.crear({
        eventoId,
        items: seleccion,
        compradorNombre: comprador.nombre,
        compradorEmail: comprador.email,
        compradorTel: comprador.tel,
      });
      window.location.href = init_point;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  const minutos = String(Math.floor(timer / 60)).padStart(2, '0');
  const segundos = String(timer % 60).padStart(2, '0');

  if (!evento) return (
    <>
      <Header />
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step > i + 1 ? 'bg-green-600 text-white' : step === i + 1 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {i + 1}
              </div>
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

            <Button className="w-full" size="lg" onClick={() => setStep(2)} disabled={seleccion.length === 0}>
              Continuar
            </Button>
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
              <Label htmlFor="tel">Teléfono (opcional)</Label>
              <Input id="tel" type="tel" placeholder="+52 81 1234 5678" value={comprador.tel} onChange={(e) => setComprador((p) => ({ ...p, tel: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Regresar</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={!comprador.email}>Continuar</Button>
            </div>
          </div>
        )}

        {/* Paso 3: Pago */}
        {step === 3 && (
          <div className="space-y-6">
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
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
                <span>Total</span><span className="text-green-600 text-xl">{formatMXN(getTotal())}</span>
              </div>
            </div>

            <div className="flex gap-3 text-xs text-gray-500">
              <ShieldCheckIcon size={16} className="text-green-600 shrink-0 mt-0.5" />
              <span>Pago 100% seguro con MercadoPago. Tus datos están protegidos.</span>
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              <LockIcon size={16} className="text-green-600 shrink-0 mt-0.5" />
              <span>Recibirás tu boleto en PDF al email registrado.</span>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Regresar</Button>
              <Button className="flex-1" size="lg" onClick={handlePagar} disabled={loading}>
                {loading ? 'Procesando…' : `Pagar con MercadoPago`}
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
