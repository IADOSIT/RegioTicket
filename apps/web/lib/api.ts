// Cliente API — fetch hacia /api/* que Nginx proxea al backend Express
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const api = {
  eventos: {
    list: () => request<any[]>('/eventos'),
    get: (slug: string) => request<any>(`/eventos/${slug}`),
  },

  ordenes: {
    crear: (body: object) => request<any>('/ordenes', { method: 'POST', body: JSON.stringify(body) }),
    validarPromo: (body: object) => request<any>('/ordenes/validar-promo', { method: 'POST', body: JSON.stringify(body) }),
  },

  stripe: {
    intent: (body: object) => request<{ clientSecret: string; ordenId: string; publicKey: string }>(
      '/stripe/intent', { method: 'POST', body: JSON.stringify(body) }
    ),
    validarPromo: (body: object) => request<any>('/stripe/validar-promo', { method: 'POST', body: JSON.stringify(body) }),
  },

  boletos: {
    get: (uuid: string) => request<any>(`/boletos/${uuid}`),
    reenviar: (uuid: string, email?: string) =>
      request<any>(`/boletos/${uuid}/reenviar`, { method: 'POST', body: JSON.stringify({ email }) }),
    whatsapp: (uuid: string, telefono: string) =>
      request<any>(`/boletos/${uuid}/whatsapp`, { method: 'POST', body: JSON.stringify({ telefono }) }),
  },

  accesos: {
    validar: (uuid: string, token: string) =>
      request<any>('/accesos/validar', { method: 'POST', body: JSON.stringify({ uuid }), headers: authHeaders(token) }),
    usar: (uuid: string, token: string) =>
      request<any>('/accesos/usar', { method: 'POST', body: JSON.stringify({ uuid }), headers: authHeaders(token) }),
  },

  taquilla: {
    eventos: (token: string) => request<any[]>('/taquilla/eventos-activos', { headers: authHeaders(token) }),
    venta: (body: object, token: string) =>
      request<any>('/taquilla/venta', { method: 'POST', body: JSON.stringify(body), headers: authHeaders(token) }),
    turno: (token: string) => request<any>('/taquilla/turno', { headers: authHeaders(token) }),
  },

  admin: {
    eventos: {
      list: (token: string) => request<any[]>('/admin/eventos', { headers: authHeaders(token) }),
      create: (body: object, token: string) =>
        request<any>('/admin/eventos', { method: 'POST', body: JSON.stringify(body), headers: authHeaders(token) }),
      update: (id: string, body: object, token: string) =>
        request<any>(`/admin/eventos/${id}`, { method: 'PUT', body: JSON.stringify(body), headers: authHeaders(token) }),
      delete: (id: string, token: string) =>
        request<any>(`/admin/eventos/${id}`, { method: 'DELETE', headers: authHeaders(token) }),
    },
    categorias: {
      list: (eventoId: string, token: string) =>
        request<any[]>(`/admin/categorias?eventoId=${eventoId}`, { headers: authHeaders(token) }),
      create: (body: object, token: string) =>
        request<any>('/admin/categorias', { method: 'POST', body: JSON.stringify(body), headers: authHeaders(token) }),
      update: (id: string, body: object, token: string) =>
        request<any>(`/admin/categorias/${id}`, { method: 'PUT', body: JSON.stringify(body), headers: authHeaders(token) }),
      toggleOnline: (id: string, token: string) =>
        request<any>(`/admin/categorias/${id}/toggle-online`, { method: 'PUT', headers: authHeaders(token) }),
      toggleTaquilla: (id: string, token: string) =>
        request<any>(`/admin/categorias/${id}/toggle-taquilla`, { method: 'PUT', headers: authHeaders(token) }),
    },
    mapa: {
      get:  (eventoId: string, token: string) => request<any>(`/admin/mapa/${eventoId}`, { headers: authHeaders(token) }),
      save: (eventoId: string, body: object, token: string) =>
        request<any>(`/admin/mapa/${eventoId}`, { method: 'PUT', body: JSON.stringify(body), headers: authHeaders(token) }),
    },
    config: {
      get:  (token: string) => request<Record<string, string>>('/admin/config', { headers: authHeaders(token) }),
      save: (body: Record<string, string>, token: string) =>
        request<any>('/admin/config', { method: 'PUT', body: JSON.stringify(body), headers: authHeaders(token) }),
    },
    configEmpresa: {
      get:  (token: string, empresaId?: string) =>
        request<any>(`/admin/config-empresa${empresaId ? `?empresaId=${empresaId}` : ''}`, { headers: authHeaders(token) }),
      save: (body: object, token: string, empresaId?: string) =>
        request<any>(`/admin/config-empresa${empresaId ? `?empresaId=${empresaId}` : ''}`, { method: 'PUT', body: JSON.stringify(body), headers: authHeaders(token) }),
    },
    qr: {
      get: (eventoId: string, token: string) =>
        request<{ qr: string; url: string; nombre: string; imagen: string | null; lugar: string | null; fechaEvento: string | null; empresa: { nombre: string; logo: string | null } | null }>(`/admin/eventos/${eventoId}/qr`, { headers: authHeaders(token) }),
    },
    ordenes: {
      list: (params: Record<string, string>, token: string) => {
        const qs = new URLSearchParams(params).toString();
        return request<any>(`/admin/ordenes?${qs}`, { headers: authHeaders(token) });
      },
      reembolsar: (id: string, token: string) =>
        request<any>(`/admin/ordenes/${id}/reembolsar`, { method: 'PUT', headers: authHeaders(token) }),
    },
    dashboard: {
      global: (token: string) => request<any>('/admin/dashboard-global', { headers: authHeaders(token) }),
    },
    codigosPromo: {
      list: (token: string, eventoId?: string) =>
        request<any[]>(`/admin/codigos-promo${eventoId ? `?eventoId=${eventoId}` : ''}`, { headers: authHeaders(token) }),
      create: (body: object, token: string) =>
        request<any>('/admin/codigos-promo', { method: 'POST', body: JSON.stringify(body), headers: authHeaders(token) }),
      update: (id: string, body: object, token: string) =>
        request<any>(`/admin/codigos-promo/${id}`, { method: 'PUT', body: JSON.stringify(body), headers: authHeaders(token) }),
      delete: (id: string, token: string) =>
        request<any>(`/admin/codigos-promo/${id}`, { method: 'DELETE', headers: authHeaders(token) }),
      validar: (body: object, token: string) =>
        request<any>('/admin/codigos-promo/validar', { method: 'POST', body: JSON.stringify(body), headers: authHeaders(token) }),
    },
    cancelarEvento: (id: string, token: string) =>
      request<any>(`/admin/eventos/${id}/cancelar`, { method: 'POST', headers: authHeaders(token) }),
    usuarios: {
      list: (token: string) => request<any[]>('/admin/usuarios', { headers: authHeaders(token) }),
      create: (body: object, token: string) =>
        request<any>('/admin/usuarios', { method: 'POST', body: JSON.stringify(body), headers: authHeaders(token) }),
      update: (id: string, body: object, token: string) =>
        request<any>(`/admin/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(body), headers: authHeaders(token) }),
    },
    empresas: {
      list: (token: string) => request<any[]>('/admin/empresas', { headers: authHeaders(token) }),
      create: (body: object, token: string) =>
        request<any>('/admin/empresas', { method: 'POST', body: JSON.stringify(body), headers: authHeaders(token) }),
      update: (id: string, body: object, token: string) =>
        request<any>(`/admin/empresas/${id}`, { method: 'PUT', body: JSON.stringify(body), headers: authHeaders(token) }),
    },
  },
};
