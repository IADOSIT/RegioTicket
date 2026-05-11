// Seed inicial: admin, cajero y evento de ejemplo Palenque Feria NL 2026
import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = async (p: string) => bcrypt.hash(p, 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@iados.mx' },
    update: { password: await hash('admin123') },
    create: {
      email: 'admin@iados.mx',
      password: await hash('admin123'),
      nombre: 'Administrador iaDoS',
      rol: Rol.SUPER_ADMIN,
    },
  });

  // Eliminar usuario viejo si existe
  await prisma.usuario.deleteMany({ where: { email: { in: ['admin@regioticket.mx', 'cajero@regioticket.mx'] } } });

  await prisma.usuario.upsert({
    where: { email: 'cajero@regioticket.mx' },
    update: {},
    create: {
      email: 'cajero@regioticket.mx',
      password: await hash('Cajero123!'),
      nombre: 'Cajero Demo',
      rol: Rol.CAJERO,
    },
  });

  const evento = await prisma.evento.upsert({
    where: { slug: 'palenque-feria-nl-2026' },
    update: {},
    create: {
      slug: 'palenque-feria-nl-2026',
      nombre: 'Palenque Feria NL 2026',
      descripcion: 'El mejor palenque de la Feria de Nuevo León 2026. Artistas sorpresa, peleas de gallos y ambiente inigualable.',
      lugar: 'Parque Fundidora, Monterrey, NL',
      fechaEvento: new Date('2026-09-15T21:00:00-06:00'),
      fechaFin: new Date('2026-09-15T23:59:00-06:00'),
      imagen: '/placeholder-evento.jpg',
      estado: 'ACTIVO',
      organizadorId: admin.id,
    },
  });

  const categorias = [
    { nombre: 'General',    precio: 350, totalBoletos: 500, disponibles: 500, ordenDisplay: 1 },
    { nombre: 'Preferente', precio: 650, totalBoletos: 200, disponibles: 200, ordenDisplay: 2 },
    { nombre: 'VIP',        precio: 1200, totalBoletos: 50, disponibles: 50,  ordenDisplay: 3 },
  ];

  for (const cat of categorias) {
    const existing = await prisma.categoria.findFirst({
      where: { eventoId: evento.id, nombre: cat.nombre },
    });
    if (!existing) {
      await prisma.categoria.create({ data: { ...cat, eventoId: evento.id } });
    }
  }

  console.log('✅ Seed completado:');
  console.log('   admin@iados.mx / admin123');
  console.log('   cajero@regioticket.mx / Cajero123!');
  console.log('   Evento: Palenque Feria NL 2026');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
