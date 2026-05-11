// Inserta 3 noches del Evento de Rodeo — Palacio Vaquero con Arturo Treviño
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.usuario.findFirst({ where: { rol: 'SUPER_ADMIN' } });
  if (!admin) throw new Error('No se encontró usuario SUPER_ADMIN — ejecuta el seed principal primero');

  const noches = [
    {
      slug: 'palacio-vaquero-rodeo-abr30',
      nombre: 'Palacio Vaquero — Rodeo · Jue 30 Abr',
      fechaEvento: new Date('2026-04-30T20:00:00-06:00'),
      fechaFin:    new Date('2026-05-01T02:30:00-06:00'),
    },
    {
      slug: 'palacio-vaquero-rodeo-may01',
      nombre: 'Palacio Vaquero — Rodeo · Vie 1° May',
      fechaEvento: new Date('2026-05-01T20:00:00-06:00'),
      fechaFin:    new Date('2026-05-02T02:30:00-06:00'),
    },
    {
      slug: 'palacio-vaquero-rodeo-may02',
      nombre: 'Palacio Vaquero — Rodeo · Sáb 2 May',
      fechaEvento: new Date('2026-05-02T20:00:00-06:00'),
      fechaFin:    new Date('2026-05-03T02:30:00-06:00'),
    },
  ];

  const categorias = [
    { nombre: 'General',    precio: 400,  totalBoletos: 500, disponibles: 500, ordenDisplay: 1 },
    { nombre: 'Preferente', precio: 800,  totalBoletos: 200, disponibles: 200, ordenDisplay: 2 },
    { nombre: 'VIP',        precio: 1500, totalBoletos: 50,  disponibles: 50,  ordenDisplay: 3 },
  ];

  for (const noche of noches) {
    const evento = await prisma.evento.upsert({
      where: { slug: noche.slug },
      update: {},
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

  console.log('\nPrecios insertados: General $400 · Preferente $800 · VIP $1,500');
  console.log('Ajusta precios desde el panel admin si es necesario.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
