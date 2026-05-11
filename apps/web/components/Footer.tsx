import Link from 'next/link';
import Image from 'next/image';
import { MapPinIcon, PhoneIcon, MailIcon, InstagramIcon, FacebookIcon } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Image src="/logo-white.png" alt="RegioTicket" width={120} height={32} className="h-8 w-auto mb-3" />
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

          {/* Links */}
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

          {/* Ayuda */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Ayuda</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-green-400 transition-colors">¿Cómo comprar?</a></li>
              <li><a href="#" className="hover:text-green-400 transition-colors">Términos y condiciones</a></li>
              <li><a href="#" className="hover:text-green-400 transition-colors">Política de reembolso</a></li>
              <li><Link href="/admin" className="hover:text-green-400 transition-colors">Acceso organizadores</Link></li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Contacto</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><MapPinIcon size={13} className="text-green-500 shrink-0" />Apodaca, Nuevo León</li>
              <li className="flex items-center gap-2"><MailIcon size={13} className="text-green-500 shrink-0" />contacto@iados.mx</li>
              <li className="flex items-center gap-2"><PhoneIcon size={13} className="text-green-500 shrink-0" />+52 81 0000 0000</li>
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
