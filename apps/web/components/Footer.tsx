// Footer con créditos iaDoS
export function Footer() {
  return (
    <footer className="bg-green-700 text-white py-8 mt-16">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="font-semibold text-lg">RegioTicket</p>
        <p className="text-green-200 text-sm mt-1">Desarrollado por iaDoS · iados.mx</p>
        <p className="text-green-300 text-xs mt-3">© {new Date().getFullYear()} iaDoS Developer Operations Solutions · Apodaca, Nuevo León</p>
      </div>
    </footer>
  );
}
