'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } finally {
      setEnviado(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-green-600">RegioTicket</h1>
          <p className="text-gray-500 text-sm mt-1">Recuperar contraseña</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {enviado ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <span className="text-2xl">✉️</span>
              </div>
              <p className="text-sm text-gray-700">Si ese email tiene una cuenta activa, recibirás un enlace para restablecer tu contraseña en los próximos minutos.</p>
              <Link href="/admin/login" className="block text-sm text-green-600 hover:underline">Volver al login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email de tu cuenta</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="tu@correo.com" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Enviando…' : 'Enviar enlace'}</Button>
              <div className="text-center">
                <Link href="/admin/login" className="text-xs text-gray-400 hover:text-gray-600">Volver al login</Link>
              </div>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Desarrollado por iaDoS · iados.mx</p>
      </div>
    </div>
  );
}
