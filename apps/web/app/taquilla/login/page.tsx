// Login taquilla — JWT guardado en localStorage
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function TaquillaLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Credenciales incorrectas');
      const data = await res.json();
      const rol = data.usuario.rol;
      if (!['CAJERO', 'ADMIN', 'SUPER_ADMIN'].includes(rol)) throw new Error('Sin acceso a taquilla');
      localStorage.setItem('taquilla_token', data.token);
      localStorage.setItem('taquilla_usuario', JSON.stringify(data.usuario));
      router.push('/taquilla/pos');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-green-400">RegioTicket</h1>
          <p className="text-gray-400 text-sm mt-1">Punto de Venta — Taquilla</p>
        </div>
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg px-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg px-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Ingresando…' : 'Entrar a taquilla'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-600 mt-6">Desarrollado por iaDoS · iados.mx</p>
      </div>
    </div>
  );
}
