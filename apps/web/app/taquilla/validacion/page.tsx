// Escáner QR para validación en puerta — fondo oscuro, cámara activa
'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { api } from '@/lib/api';
import { CheckCircleIcon, XCircleIcon, AlertCircleIcon } from 'lucide-react';

interface AccesoItem { uuid: string; resultado: any; tipo: 'valido' | 'usado' | 'error'; ts: Date; }

export default function ValidacionPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [token, setToken] = useState('');
  const [estado, setEstado] = useState<'idle' | 'ok' | 'usado' | 'error'>('idle');
  const [boletoInfo, setBoletoInfo] = useState<any>(null);
  const [historial, setHistorial] = useState<AccesoItem[]>([]);
  const [procesando, setProcesando] = useState(false);
  const ultimoUUID = useRef('');

  useEffect(() => {
    setToken(localStorage.getItem('taquilla_token') ?? '');
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
    if (!token) return;
    setProcesando(true);
    try {
      const info = await api.accesos.validar(uuid, token);
      setBoletoInfo(info);
      if (info.estado === 'VALIDO') { setEstado('ok'); }
      else if (info.estado === 'USADO') { setEstado('usado'); }
      else { setEstado('error'); }
      setHistorial((prev) => [{ uuid, resultado: info, tipo: (info.estado === 'VALIDO' ? 'valido' : info.estado === 'USADO' ? 'usado' : 'error') as AccesoItem['tipo'], ts: new Date() }, ...prev].slice(0, 10));
    } catch {
      setEstado('error');
      setBoletoInfo(null);
    } finally {
      setProcesando(false);
      setTimeout(() => { setEstado('idle'); setBoletoInfo(null); }, 4000);
    }
  }

  async function marcarUsado() {
    if (!boletoInfo || !token) return;
    await api.accesos.usar(boletoInfo.uuid ?? ultimoUUID.current, token);
    setEstado('usado');
  }

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] bg-gray-950">
      {/* Cámara */}
      <div className="relative flex-shrink-0 aspect-square max-h-64 w-full bg-black overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 border-2 border-green-400 rounded-2xl opacity-60" />
        </div>

        {estado !== 'idle' && (
          <div className={`absolute inset-0 flex items-center justify-center ${estado === 'ok' ? 'bg-green-600/80' : estado === 'usado' ? 'bg-amber-600/80' : 'bg-red-600/80'}`}>
            {estado === 'ok' && <CheckCircleIcon size={64} className="text-white" />}
            {estado === 'usado' && <AlertCircleIcon size={64} className="text-white" />}
            {estado === 'error' && <XCircleIcon size={64} className="text-white" />}
          </div>
        )}
      </div>

      {/* Resultado */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {boletoInfo && (
          <div className={`rounded-xl border p-4 ${estado === 'ok' ? 'bg-green-900/40 border-green-700' : estado === 'usado' ? 'bg-amber-900/40 border-amber-700' : 'bg-red-900/40 border-red-700'}`}>
            <div className="space-y-1 text-sm">
              <p className="font-bold text-white text-base">{boletoInfo.compradorNombre ?? 'Sin nombre'}</p>
              <p className="text-gray-300">{boletoInfo.categoria} · Boleto #{boletoInfo.numero}</p>
              <p className="text-gray-400">{boletoInfo.evento}</p>
              {estado === 'usado' && boletoInfo.ultimoAcceso && (
                <p className="text-amber-400 text-xs font-medium">
                  Usado: {new Date(boletoInfo.ultimoAcceso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            {estado === 'ok' && (
              <button onClick={marcarUsado} className="mt-3 w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm">
                MARCAR COMO USADO
              </button>
            )}
          </div>
        )}

        {/* Historial */}
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
