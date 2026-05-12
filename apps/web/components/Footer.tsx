'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { MapPinIcon, PhoneIcon, MailIcon, InstagramIcon, FacebookIcon } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface FooterProps {
  empresaNombre?: string;
  empresaColor?: string;
  cfg?: Record<string, any>;
}

export function Footer({ empresaNombre, empresaColor, cfg: empresaCfg }: FooterProps) {
  const [syscfg, setSyscfg] = useState<Record<string, string>>({});

  useEffect(() => {
    if (empresaNombre) return; // subdominio usa empresaCfg, no necesita syscfg
    fetch(`${API_BASE}/config/public`)
      .then((r) => r.ok ? r.json() : {})
      .then(setSyscfg)
      .catch(() => {});
  }, [empresaNombre]);

  const color = empresaColor || '#16a34a';

  if (empresaNombre && empresaCfg) {
    // Footer de subdominio — usa config de la empresa
    return (
      <footer className="bg-slate-950 text-slate-300 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-white font-extrabold text-lg mb-2">{empresaNombre}</p>
              <p className="text-sm text-slate-400 leading-relaxed">
                {empresaCfg.descripcionCorta || `Boletos para eventos de ${empresaNombre}.`}
              </p>
              <div className="flex gap-3 mt-4">
                {empresaCfg.facebook && (
                  <a href={empresaCfg.facebook} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                    style={{ backgroundColor: color }}>
                    <FacebookIcon size={15} className="text-white" />
                  </a>
                )}
                {empresaCfg.instagram && (
                  <a href={empresaCfg.instagram} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                    style={{ backgroundColor: color }}>
                    <InstagramIcon size={15} className="text-white" />
                  </a>
                )}
                {empresaCfg.tiktok && (
                  <a href={empresaCfg.tiktok} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                    style={{ backgroundColor: color }}>
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.02-.07z"/></svg>
                  </a>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Accesos rápidos</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-white transition-colors">Eventos</Link></li>
                <li><Link href="/mis-boletos" className="hover:text-white transition-colors">Mis boletos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Contacto</h4>
              <ul className="space-y-2 text-sm">
                {empresaCfg.telefonoContacto && (
                  <li className="flex items-center gap-2">
                    <PhoneIcon size={13} style={{ color }} className="shrink-0" />
                    {empresaCfg.telefonoContacto}
                  </li>
                )}
                {empresaCfg.emailContacto && (
                  <li className="flex items-center gap-2">
                    <MailIcon size={13} style={{ color }} className="shrink-0" />
                    {empresaCfg.emailContacto}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} {empresaNombre}</span>
            <span>Powered by <a href="https://regioticket.iados.online" className="hover:text-slate-400">RegioTicket</a> · <a href="https://iados.mx" style={{ color }} className="hover:opacity-80">iaDoS</a></span>
          </div>
        </div>
      </footer>
    );
  }

  // Footer principal (dominio raíz)
  const telefonos = [syscfg.contacto_telefono_1, syscfg.contacto_telefono_2, syscfg.contacto_telefono_3].filter(Boolean);
  const ciudad = syscfg.empresa_ciudad || 'Apodaca, Nuevo León';
  const email = syscfg.contacto_email || 'contacto@regioticket.mx';

  return (
    <footer className="bg-slate-950 text-slate-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-white rounded-lg p-1">
                <Image src="/logo.png" alt="iaDoS" width={28} height={28} className="h-7 w-auto" />
              </div>
              <span className="text-white font-extrabold text-lg">Regio<span className="text-green-400">Ticket</span></span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              La plataforma líder de boletería para eventos en Nuevo León. Compra en línea o en taquilla.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="w-8 h-8 bg-slate-800 hover:bg-green-600 rounded-lg flex items-center justify-center transition-colors">
                <FacebookIcon size={15} />
              </a>
              <a href="#" className="w-8 h-8 bg-slate-800 hover:bg-green-600 rounded-lg flex items-center justify-center transition-colors">
                <InstagramIcon size={15} />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Explorar</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Todos los eventos</Link></li>
              <li><Link href="/?cat=palenques" className="hover:text-green-400 transition-colors">Palenques</Link></li>
              <li><Link href="/?cat=conciertos" className="hover:text-green-400 transition-colors">Conciertos</Link></li>
              <li><Link href="/?cat=bailes" className="hover:text-green-400 transition-colors">Bailes</Link></li>
              <li><Link href="/?cat=rodeo" className="hover:text-green-400 transition-colors">Rodeo & Vaquero</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Ayuda</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/mis-boletos" className="hover:text-green-400 transition-colors">Mis boletos</Link></li>
              <li><a href="#" className="hover:text-green-400 transition-colors">¿Cómo comprar?</a></li>
              <li><a href="#" className="hover:text-green-400 transition-colors">Términos y condiciones</a></li>
              <li><a href="#" className="hover:text-green-400 transition-colors">Política de reembolso</a></li>
              <li><Link href="/admin" className="hover:text-green-400 transition-colors">Acceso organizadores</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Contacto</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><MapPinIcon size={13} className="text-green-500 shrink-0" />{ciudad}</li>
              <li className="flex items-center gap-2"><MailIcon size={13} className="text-green-500 shrink-0" />{email}</li>
              {telefonos.length > 0
                ? telefonos.map((tel, i) => <li key={i} className="flex items-center gap-2"><PhoneIcon size={13} className="text-green-500 shrink-0" />{tel}</li>)
                : <li className="flex items-center gap-2"><PhoneIcon size={13} className="text-green-500 shrink-0" />+52 81 0000 0000</li>
              }
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} RegioTicket · Desarrollado por <a href="https://iados.mx" className="text-green-500 hover:text-green-400">iaDoS</a></span>
          <span>Developer Operations Solutions · Apodaca, NL</span>
        </div>
      </div>
    </footer>
  );
}
