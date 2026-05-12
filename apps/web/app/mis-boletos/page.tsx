'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TicketIcon, CalendarIcon, MapPinIcon, SearchIcon, ExternalLinkIcon } from 'lucide-react';

export default function MisBoletoPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ordenes, setOrdenes] = useState<any[] | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/mis-boletos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setOrdenes(data.ordenes);
    } catch (err: any) {
      setError(err.message || 'Error consultando boletos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <TicketIcon size={22} className="text-green-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Mis Boletos</h1>
            <p className="text-xs text-gray-500">Consulta tus boletos con tu email de compra</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={buscar} className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="email">Email de compra</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={loading} className="shrink-0">
                  <SearchIcon size={16} className="mr-2" />
                  {loading ? 'Buscando…' : 'Buscar'}
                </Button>
              </div>
            </form>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          </CardContent>
        </Card>

        {ordenes !== null && ordenes.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <TicketIcon size={40} className="mx-auto mb-3 opacity-30" />
            <p>No encontramos boletos con ese email.</p>
            <p className="text-xs mt-1">Verifica que el email sea el mismo que usaste al comprar.</p>
          </div>
        )}

        {ordenes && ordenes.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{ordenes.length} orden{ordenes.length !== 1 ? 'es' : ''} encontrada{ordenes.length !== 1 ? 's' : ''}</p>
            {ordenes.map((orden: any) => (
              <Card key={orden.id}>
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{orden.evento?.nombre}</h3>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                        {orden.evento?.fechaEvento && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon size={11} />
                            {new Date(orden.evento.fechaEvento).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        {orden.evento?.lugar && (
                          <span className="flex items-center gap-1">
                            <MapPinIcon size={11} />
                            {orden.evento.lugar}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="default">{orden.estado}</Badge>
                  </div>

                  <div className="space-y-2">
                    {orden.boletos.map((boleto: any) => (
                      <div key={boleto.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{boleto.categoria?.nombre}</span>
                          <span className="text-xs text-gray-500 ml-2">#{boleto.numero}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={boleto.estado === 'VALIDO' ? 'default' : boleto.estado === 'USADO' ? 'secondary' : 'destructive'} className="text-xs">
                            {boleto.estado}
                          </Badge>
                          <a href={`/boleto/${boleto.id}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                              <ExternalLinkIcon size={12} className="mr-1" />Ver
                            </Button>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
