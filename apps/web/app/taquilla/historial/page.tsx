// Historial del turno del cajero
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatMXN } from '@/lib/utils';

export default function HistorialPage() {
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('taquilla_token') ?? '';
    api.taquilla.turno(token)
      .then(setResumen)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-white">Resumen del turno</h2>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total vendido', value: formatMXN(resumen?.total ?? 0), color: 'text-green-400' },
          { label: 'Efectivo', value: formatMXN(resumen?.efectivo ?? 0), color: 'text-white' },
          { label: 'Tarjeta', value: formatMXN(resumen?.tarjeta ?? 0), color: 'text-white' },
          { label: 'Boletos', value: resumen?.boletos ?? 0, color: 'text-white' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => window.print()}
        className="w-full h-12 border border-gray-600 text-gray-300 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
      >
        Imprimir corte de caja
      </button>
    </div>
  );
}
