'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setOk(true);
      setTimeout(() => router.push('/admin/login'), 2500);
    } catch (err: any) {
      setError(err.message || 'Error restableciendo contraseña');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <p className="text-red-500 text-sm">Enlace inválido o expirado.</p>
        <Link href="/admin/forgot-password" className="text-sm text-green-600 hover:underline">Solicitar nuevo enlace</Link>
      </div>
    );
  }

  return ok ? (
    <div className="text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
        <span className="text-2xl">✅</span>
      </div>
      <p className="text-sm text-gray-700">Contraseña actualizada. Redirigiendo al login…</p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus placeholder="Mínimo 6 caracteres" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirm">Confirmar contraseña</Label>
        <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Repite la contraseña" />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Guardando…' : 'Restablecer contraseña'}</Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-green-600">RegioTicket</h1>
          <p className="text-gray-500 text-sm mt-1">Nueva contraseña</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <Suspense fallback={<div className="text-center text-gray-400 text-sm">Cargando…</div>}>
            <ResetForm />
          </Suspense>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Desarrollado por iaDoS · iados.mx</p>
      </div>
    </div>
  );
}
