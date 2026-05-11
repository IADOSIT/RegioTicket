// Inserta/actualiza 3 noches del Evento de Rodeo — Palacio Vaquero con Arturo Treviño
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.usuario.findFirst({ where: { rol: 'SUPER_ADMIN' } });
  if (!admin) throw new Error('No se encontró usuario SUPER_ADMIN — ejecuta el seed principal primero');

  const noches = [
    {
      slug: 'palacio-vaquero-rodeo-may25',
      nombre: 'Palacio Vaquero — Rodeo · Lun 25 May',
      fechaEvento: new Date('2026-05-25T20:00:00-06:00'),
      fechaFin:    new Date('2026-05-26T02:30:00-06:00'),
    },
    {
      slug: 'palacio-vaquero-rodeo-may26',
      nombre: 'Palacio Vaquero — Rodeo · Mar 26 May',
      fechaEvento: new Date('2026-05-26T20:00:00-06:00'),
      fechaFin:    new Date('2026-05-27T02:30:00-06:00'),
    },
    {
      slug: 'palacio-vaquero-rodeo-may27',
      nombre: 'Palacio Vaquero — Rodeo · Mié 27 May',
      fechaEvento: new Date('2026-05-27T20:00:00-06:00'),
      fechaFin:    new Date('2026-05-28T02:30:00-06:00'),
    },
  ];

  const categorias = [
    { nombre: 'General',    precio: 400,  totalBoletos: 500, disponibles: 500, ordenDisplay: 1 },
    { nombre: 'Preferente', precio: 800,  totalBoletos: 200, disponibles: 200, ordenDisplay: 2 },
    { nombre: 'VIP',        precio: 1500, totalBoletos: 50,  disponibles: 50,  ordenDisplay: 3 },
  ];

  // Elimina entradas viejas con fechas pasadas si existen
  const slugsViejos = ['palacio-vaquero-rodeo-abr30', 'palacio-vaquero-rodeo-may01', 'palacio-vaquero-rodeo-may02'];
  for (const slug of slugsViejos) {
    const viejo = await prisma.evento.findUnique({ where: { slug } });
    if (viejo) {
      await prisma.categoria.deleteMany({ where: { eventoId: viejo.id } });
      await prisma.evento.delete({ where: { slug } });
      console.log(`🗑  Eliminado: ${slug}`);
    }
  }

  for (const noche of noches) {
    const evento = await prisma.evento.upsert({
      where: { slug: noche.slug },
      update: { fechaEvento: noche.fechaEvento, fechaFin: noche.fechaFin, estado: 'ACTIVO' },
      create: {
        slug: noche.slug,
        nombre: noche.nombre,
        descripcion: 'Arturo Treviño presenta su Evento de Rodeo. Música de cabaña, Tejano Norteño, Grupo de la Frontera y más. ¡Lo más vaquero de Monterrey!',
        lugar: 'Palacio Vaquero, Monterrey, NL',
        fechaEvento: noche.fechaEvento,
        fechaFin:    noche.fechaFin,
        imagen: '/eventos/palacio-vaquero-rodeo.jpg',
        estado: 'ACTIVO',
        organizadorId: admin.id,
      },
    });

    for (const cat of categorias) {
      const existe = await prisma.categoria.findFirst({
        where: { eventoId: evento.id, nombre: cat.nombre },
      });
      if (!existe) {
        await prisma.categoria.create({ data: { ...cat, eventoId: evento.id } });
      }
    }

    console.log(`✅ ${noche.nombre}`);
  }

  console.log('\nPrecios: General $400 · Preferente $800 · VIP $1,500');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
