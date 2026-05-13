import { headers } from 'next/headers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { EventoCard } from '@/components/EventoCard';
import { HeroCarousel } from '@/components/HeroCarousel';
import { CalendarIcon, ShieldCheckIcon, SmartphoneIcon, ZapIcon, FacebookIcon, InstagramIcon, PhoneIcon, MailIcon } from 'lucide-react';

const API = process.env.API_INTERNAL_URL || 'http://localhost:4000';

async function getEventos(pasados = false, empresaSlug?: string) {
  try {
    const qs = new URLSearchParams({
      ...(pasados ? { pasados: '1' } : {}),
      ...(empresaSlug ? { empresa: empresaSlug } : {}),
    });
    const res = await fetch(`${API}/api/eventos?${qs}`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

async function getEmpresa(slug: string) {
  try {
    const res = await fetch(`${API}/api/empresa/slug/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

// Tema helpers
type Tema = 'aurora' | 'nebula' | 'regio';

function getTemaCSS(tema: Tema, colorFondo: string, color: string) {
  if (tema === 'nebula') return {
    pageBg: '#080b14',
    sectionBg: '#080b14',
    cardsBg: '#080b14',
    titleColor: '#f1f5f9',
    subColor: '#64748b',
    dividerColor: 'rgba(255,255,255,0.06)',
    pastTitle: '#334155',
    ctaBg: '#0d1117',
    ctaTitle: '#f1f5f9',
    ctaSub: '#64748b',
    heroGradient: `radial-gradient(ellipse at 60% 0%, ${color}25 0%, #080b14 60%)`,
  };
  if (tema === 'regio') return {
    pageBg: '#111111',
    sectionBg: '#111111',
    cardsBg: '#111111',
    titleColor: '#ffffff',
    subColor: '#6b7280',
    dividerColor: '#1f1f1f',
    pastTitle: '#374151',
    ctaBg: '#0a0a0a',
    ctaTitle: '#ffffff',
    ctaSub: '#6b7280',
    heroGradient: `linear-gradient(135deg, ${color} 0%, #000 100%)`,
  };
  // aurora
  return {
    pageBg: colorFondo,
    sectionBg: colorFondo,
    cardsBg: colorFondo,
    titleColor: '#0f172a',
    subColor: '#64748b',
    dividerColor: '#e2e8f0',
    pastTitle: '#94a3b8',
    ctaBg: '#0f172a',
    ctaTitle: '#ffffff',
    ctaSub: '#94a3b8',
    heroGradient: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
  };
}

export default async function HomePage() {
  const headersList = await headers();
  const empresaSlug = headersList.get('x-empresa-slug') || undefined;

  const [proximos, pasados, empresa] = await Promise.all([
    getEventos(false, empresaSlug),
    getEventos(true, empresaSlug),
    empresaSlug ? getEmpresa(empresaSlug) : Promise.resolve(null),
  ]);

  const cfg = empresa?.config ?? {};
  const color = cfg.colorPrimario || '#16a34a';
  const colorNavbar = cfg.colorNavbar || color;
  const colorBoton = cfg.colorBoton || color;
  const colorTextoBoton = cfg.colorTextoBoton || '#ffffff';
  const colorHero = cfg.colorHero || color;
  const colorFondo = cfg.colorFondo || '#f8fafc';
  const colorSecundario = cfg.colorSecundario || color;
  const colorLight = `${colorSecundario}20`;
  const empresaNombre = empresa?.nombre;
  const esSubdominio = !!empresaSlug && !!empresa;
  const tema: Tema = (cfg.tema as Tema) || 'aurora';
  const tc = getTemaCSS(tema, colorFondo, color);

  return (
    <>
      <Header empresaNombre={esSubdominio ? empresaNombre : undefined} empresaLogo={empresa?.logo} color={esSubdominio ? colorNavbar : undefined} />
      <main className="min-h-screen" style={{ backgroundColor: tc.pageBg }}>

        {/* Hero carrusel (dominio principal con eventos) */}
        {proximos.length > 0 && !esSubdominio && !cfg.bannerUrl && <HeroCarousel eventos={proximos} />}

        {/* Hero con banner personalizado */}
        {esSubdominio && cfg.bannerUrl && (
          <section className="relative py-24 px-4 bg-cover bg-center" style={{ backgroundImage: `url(${cfg.bannerUrl})` }}>
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative max-w-3xl mx-auto text-center">
              {empresa.logo && <img src={empresa.logo} alt={empresaNombre} className="h-20 mx-auto mb-6 object-contain" />}
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">{cfg.heroTexto || empresaNombre}</h1>
              {cfg.descripcionCorta && <p className="text-lg text-white/80 max-w-xl mx-auto">{cfg.descripcionCorta}</p>}
              <a href="#eventos" className="mt-6 inline-block font-bold px-8 py-3 transition-colors"
                style={{ backgroundColor: colorBoton, color: colorTextoBoton, borderRadius: tema === 'aurora' ? '100px' : tema === 'regio' ? '0px' : '12px' }}>
                Ver boletos →
              </a>
            </div>
          </section>
        )}

        {/* Hero AURORA — empresa sin banner */}
        {esSubdominio && !cfg.bannerUrl && tema === 'aurora' && (
          <section className="relative py-24 px-4 overflow-hidden" style={{ background: tc.heroGradient }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            <div className="relative max-w-3xl mx-auto text-center">
              {empresa.logo && <img src={empresa.logo} alt={empresaNombre} className="h-20 mx-auto mb-6 object-contain" />}
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">{cfg.heroTexto || empresaNombre}</h1>
              {cfg.descripcionCorta && <p className="text-lg text-white/80 max-w-xl mx-auto">{cfg.descripcionCorta}</p>}
              <a href="#eventos" className="mt-6 inline-block font-bold px-8 py-3 rounded-full shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
                style={{ backgroundColor: colorBoton, color: colorTextoBoton }}>
                Ver boletos →
              </a>
            </div>
          </section>
        )}

        {/* Hero NEBULA — empresa sin banner */}
        {esSubdominio && !cfg.bannerUrl && tema === 'nebula' && (
          <section className="relative py-28 px-4 overflow-hidden" style={{ background: '#080b14' }}>
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% -20%, ${color}30 0%, transparent 60%)` }} />
            <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, ${color}15 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
            <div className="relative max-w-3xl mx-auto text-center">
              {empresa.logo && <img src={empresa.logo} alt={empresaNombre} className="h-20 mx-auto mb-6 object-contain" />}
              <div className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                {cfg.descripcionCorta || empresaNombre}
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight">{cfg.heroTexto || empresaNombre}</h1>
              <a href="#eventos" className="mt-6 inline-block font-bold px-8 py-3 rounded-xl transition-all"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: colorTextoBoton, boxShadow: `0 0 30px ${color}50` }}>
                Ver boletos →
              </a>
            </div>
          </section>
        )}

        {/* Hero REGIO — empresa sin banner */}
        {esSubdominio && !cfg.bannerUrl && tema === 'regio' && (
          <section className="relative py-24 px-4 overflow-hidden" style={{ background: '#111' }}>
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}22 0%, transparent 50%)` }} />
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: color }} />
            <div className="relative max-w-3xl mx-auto">
              {empresa.logo && <img src={empresa.logo} alt={empresaNombre} className="h-16 mb-6 object-contain" />}
              <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color }}>— {cfg.descripcionCorta || 'Eventos'}</div>
              <h1 className="text-5xl md:text-6xl font-black text-white mb-4 uppercase leading-none">{cfg.heroTexto || empresaNombre}</h1>
              <a href="#eventos" className="mt-6 inline-block font-black px-8 py-3 uppercase tracking-widest text-sm transition-colors"
                style={{ background: color, color: colorTextoBoton }}>
                Ver boletos →
              </a>
            </div>
          </section>
        )}

        {/* Hero genérico vacío (dominio principal sin eventos) */}
        {!esSubdominio && proximos.length === 0 && (
          <section className="bg-slate-950 py-20 px-4">
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block text-xs font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1 rounded-full mb-4">Nuevo León · 2026</span>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4">
                Tu boleto al mejor<br /><span className="text-green-400">entretenimiento de NL</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-xl mx-auto">
                Palenques, bailes, conciertos y eventos masivos. Compra en línea o en taquilla.
              </p>
            </div>
          </section>
        )}

        {/* Features strip */}
        <div style={{ backgroundColor: color }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-center gap-6 md:gap-12">
            {[
              [ZapIcon, 'Compra en segundos'],
              [ShieldCheckIcon, 'Pago 100% seguro'],
              [SmartphoneIcon, 'Boleto en tu celular'],
              [CalendarIcon, 'Eventos para todos'],
            ].map(([Icon, label]: any) => (
              <div key={label} className="flex items-center gap-2 text-white text-sm font-medium">
                <Icon size={15} />{label}
              </div>
            ))}
          </div>
        </div>

        {/* Eventos */}
        <section id="eventos" className="max-w-7xl mx-auto px-4 py-12">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold" style={{ color: tc.titleColor }}>
              {esSubdominio ? `Eventos de ${empresaNombre}` : 'Eventos disponibles'}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: tc.subColor }}>
              {proximos.length} evento{proximos.length !== 1 ? 's' : ''} próximo{proximos.length !== 1 ? 's' : ''}
            </p>
          </div>

          {proximos.length === 0 ? (
            <div className="text-center py-20 rounded-2xl" style={{ background: tema === 'aurora' ? '#ffffff' : 'rgba(255,255,255,0.04)', border: `1px solid ${tc.dividerColor}` }}>
              <CalendarIcon size={48} className="mx-auto mb-4" style={{ color: tc.subColor }} />
              <p className="text-lg font-semibold" style={{ color: tc.subColor }}>No hay eventos disponibles en este momento</p>
              <p className="text-sm mt-1" style={{ color: tc.subColor }}>Vuelve pronto para ver la cartelera</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {proximos.map((evento: any) => (
                <EventoCard key={evento.id} evento={evento} tema={esSubdominio ? tema : 'aurora'} color={color} />
              ))}
            </div>
          )}
        </section>

        {/* Eventos pasados */}
        {pasados.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 pb-16">
            <div className="pt-10" style={{ borderTop: `1px solid ${tc.dividerColor}` }}>
              <h2 className="text-sm font-bold mb-5 uppercase tracking-wide" style={{ color: tc.pastTitle }}>Eventos pasados</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {pasados.map((evento: any) => (
                  <EventoCard key={evento.id} evento={evento} pasado tema={esSubdominio ? tema : 'aurora'} color={color} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Contacto empresa — solo en subdominio */}
        {esSubdominio && (cfg.facebook || cfg.instagram || cfg.tiktok || cfg.emailContacto || cfg.telefonoContacto) && (
          <section className="py-12 px-4" style={{ backgroundColor: colorLight }}>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-xl font-bold mb-6" style={{ color: colorSecundario }}>Contáctanos</h2>
              <div className="flex flex-wrap justify-center gap-4">
                {cfg.telefonoContacto && (
                  <a href={`tel:${cfg.telefonoContacto}`} className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                    <PhoneIcon size={16} />{cfg.telefonoContacto}
                  </a>
                )}
                {cfg.emailContacto && (
                  <a href={`mailto:${cfg.emailContacto}`} className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                    <MailIcon size={16} />{cfg.emailContacto}
                  </a>
                )}
                {cfg.facebook && (
                  <a href={cfg.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium" style={{ color: colorSecundario }}>
                    <FacebookIcon size={16} />Facebook
                  </a>
                )}
                {cfg.instagram && (
                  <a href={cfg.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium" style={{ color: colorSecundario }}>
                    <InstagramIcon size={16} />Instagram
                  </a>
                )}
                {cfg.tiktok && (
                  <a href={cfg.tiktok} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium" style={{ color: colorSecundario }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.02-.07z"/></svg>
                    TikTok
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CTA solo en dominio principal */}
        {!esSubdominio && (
          <section className="bg-slate-900 py-16 px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">¿Organizas eventos en Nuevo León?</h2>
              <p className="text-slate-400 mb-6">Vende boletos en línea y en taquilla, gestiona mesas y controla accesos desde un solo panel.</p>
              <a href="/admin" className="inline-block bg-green-500 hover:bg-green-400 text-white font-bold px-8 py-3 rounded-xl transition-colors">
                Acceder al panel →
              </a>
            </div>
          </section>
        )}
      </main>
      <Footer empresaNombre={esSubdominio ? empresaNombre : undefined} empresaColor={esSubdominio ? color : undefined} cfg={esSubdominio ? cfg : undefined} />
    </>
  );
}
