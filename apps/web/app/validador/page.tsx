'use client';
import { useEffect, useRef, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { api } from '@/lib/api';
import { CheckCircleIcon, XCircleIcon, AlertCircleIcon, LogOutIcon, QrCodeIcon } from 'lucide-react';

interface AccesoItem { uuid: string; resultado: any; tipo: 'valido' | 'usado' | 'error'; ts: Date; }

function ValidadorScanner({ token }: { token: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<'idle' | 'ok' | 'usado' | 'error'>('idle');
  const [boletoInfo, setBoletoInfo] = useState<any>(null);
  const [alerta, setAlerta] = useState('');
  const [historial, setHistorial] = useState<AccesoItem[]>([]);
  const [procesando, setProcesando] = useState(false);
  const ultimoUUID = useRef('');

  useEffect(() => {
    const codeReader = new BrowserQRCodeReader();
    let controls: any;
    if (videoRef.current) {
      codeReader.decodeFromVideoDevice(undefined, videoRef.current, async (result, _, c) => {
        controls = c;
        if (!result || procesando) return;
        const uuid = result.getText();
        if (uuid === ultimoUUID.current) return;
        ultimoUUID.current = uuid;
        await procesarQR(uuid);
        setTimeout(() => { ultimoUUID.current = ''; }, 3000);
      });
    }
    return () => { try { controls?.stop(); } catch {} };
  }, [token]);

  async function procesarQR(uuid: string) {
    setProcesando(true);
    setAlerta('');
    try {
      const info = await api.accesos.validar(uuid, token);
      setBoletoInfo(info);
      if (info.alerta) setAlerta(info.alerta);
      if (info.estado === 'VALIDO') setEstado('ok');
      else if (info.estado === 'USADO') setEstado('usado');
      else setEstado('error');
      setHistorial((prev) => [{ uuid, resultado: info, tipo: (info.estado === 'VALIDO' ? 'valido' : info.estado === 'USADO' ? 'usado' : 'error') as any, ts: new Date() }, ...prev].slice(0, 10));
    } catch {
      setEstado('error');
      setBoletoInfo(null);
    } finally {
      setProcesando(false);
      setTimeout(() => { setEstado('idle'); setBoletoInfo(null); setAlerta(''); }, 5000);
    }
  }

  async function marcarUsado() {
    if (!boletoInfo) return;
    await api.accesos.usar(boletoInfo.uuid ?? ultimoUUID.current, token);
    setEstado('usado');
  }

  return (
    <div className="flex flex-col bg-gray-950 min-h-screen">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <QrCodeIcon size={18} className="text-green-400" />
          <span className="text-white font-bold text-sm">Validación QR</span>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/validador' })} className="text-gray-400 hover:text-white flex items-center gap-1.5 text-xs">
          <LogOutIcon size={14} />Salir
        </button>
      </div>

      <div className="relative w-full bg-black overflow-hidden" style={{ height: 280 }}>
        <video ref={videoRef} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-52 h-52 border-2 border-green-400 rounded-2xl opacity-60" />
        </div>
        {estado !== 'idle' && (
          <div className={`absolute inset-0 flex items-center justify-center ${estado === 'ok' ? 'bg-green-600/80' : estado === 'usado' ? 'bg-amber-600/80' : 'bg-red-600/80'}`}>
            {estado === 'ok' && <CheckCircleIcon size={72} className="text-white" />}
            {estado === 'usado' && <AlertCircleIcon size={72} className="text-white" />}
            {estado === 'error' && <XCircleIcon size={72} className="text-white" />}
          </div>
        )}
      </div>

      <div className="flex-1 p-4 space-y-3">
        {alerta && <div className="p-3 bg-amber-900/60 border border-amber-600 rounded-lg text-xs text-amber-200">{alerta}</div>}

        {boletoInfo && (
          <div className={`rounded-xl border p-4 ${estado === 'ok' ? 'bg-green-900/40 border-green-700' : estado === 'usado' ? 'bg-amber-900/40 border-amber-700' : 'bg-red-900/40 border-red-700'}`}>
            <div className="space-y-1 text-sm">
              <p className="font-bold text-white text-base">{boletoInfo.compradorNombre ?? 'Sin nombre'}</p>
              <p className="text-gray-300">{boletoInfo.categoria} · Boleto #{boletoInfo.numero}</p>
              <p className="text-gray-400">{boletoInfo.evento}</p>
              {estado === 'usado' && boletoInfo.ultimoAcceso && (
                <p className="text-amber-400 text-xs font-medium">Usado: {new Date(boletoInfo.ultimoAcceso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
              )}
            </div>
            {estado === 'ok' && (
              <button onClick={marcarUsado} className="mt-3 w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors">
                MARCAR COMO USADO
              </button>
            )}
          </div>
        )}

        {historial.length > 0 && (
          <div>
            <p className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Últimos accesos</p>
            <div className="space-y-1.5">
              {historial.map((h, i) => (
                <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${h.tipo === 'valido' ? 'bg-green-950 text-green-300' : h.tipo === 'usado' ? 'bg-amber-950 text-amber-300' : 'bg-red-950 text-red-300'}`}>
                  <span className="font-medium">{h.resultado?.compradorNombre ?? h.uuid.slice(0, 8)}</span>
                  <span>{h.ts.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ValidadorPage() {
  const { data: session, status } = useSession();
  const token = (session?.user as any)?.apiToken ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'authenticated' && token) {
    return <ValidadorScanner token={token} />;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setLoginError('Credenciales incorrectas');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <QrCodeIcon size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Validación QR</h1>
          <p className="text-gray-400 text-sm mt-1">Ingresa con tu cuenta de validador</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
              placeholder="••••••••"
            />
          </div>
          {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
