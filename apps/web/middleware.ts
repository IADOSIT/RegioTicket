import { NextRequest, NextResponse } from 'next/server';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'regioticket.iados.online';
// Slugs reservados que no corresponden a empresas
const SKIP = new Set(['www', 'admin', 'api', 'mail', 'ftp', 'smtp', 'pop', 'imap']);

export function middleware(request: NextRequest) {
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(':')[0];

  let slug = '';
  if (host !== BASE_DOMAIN && host.endsWith(`.${BASE_DOMAIN}`)) {
    slug = host.slice(0, -(`.${BASE_DOMAIN}`.length));
  }

  if (!slug || SKIP.has(slug)) {
    return NextResponse.next();
  }

  // Inyecta el slug en los headers de la request para que los server components lo lean
  const headers = new Headers(request.headers);
  headers.set('x-empresa-slug', slug);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|.*\\.png|.*\\.jpg|.*\\.ico|.*\\.svg|.*\\.webp).*)'],
};
