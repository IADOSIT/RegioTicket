// Ejecuta db push + seed idempotente al arrancar el contenedor
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const hash = (p: string) => bcrypt.hash(p, 10);

export async function startup() {
  // ── 1. Sync schema ──────────────────────────────────────────
  try {
    execSync(
      'node_modules/.bin/prisma db push --accept-data-loss --schema=packages/db/schema.prisma',
      { stdio: 'inherit', cwd: '/app' }
    );
  } catch (e) {
    console.error('⚠️  db push falló — continuando de todas formas');
  }

  // ── 2. Seed datos base ──────────────────────────────────────
  const prisma = new PrismaClient();
  try {
    // Admin
    const admin = await prisma.usuario.upsert({
      where:  { email: 'admin@iados.mx' },
      update: { password: await hash('admin123') },
      create: {
        email: 'admin@iados.mx',
        password: await hash('admin123'),
        nombre: 'Administrador iaDoS',
        rol: 'SUPER_ADMIN',
      },
    });

    // Cajero demo
    await prisma.usuario.upsert({
      where:  { email: 'cajero@regioticket.mx' },
      update: {},
      create: {
        email: 'cajero@regioticket.mx',
        password: await hash('Cajero123!'),
        nombre: 'Cajero Demo',
        rol: 'CAJERO',
      },
    });

    // Evento demo Palenque
    const palenque = await prisma.evento.upsert({
      where:  { slug: 'palenque-feria-nl-2026' },
      update: {},
      create: {
        slug: 'palenque-feria-nl-2026',
        nombre: 'Palenque Feria NL 2026',
        descripcion: 'El mejor palenque de la Feria de Nuevo León 2026. Artistas sorpresa, ambiente inigualable.',
        lugar: 'Parque Fundidora, Monterrey, NL',
        fechaEvento: new Date('2026-09-15T21:00:00-06:00'),
        fechaFin:    new Date('2026-09-15T23:59:00-06:00'),
        imagen: '/placeholder-evento.jpg',
        estado: 'ACTIVO',
        organizadorId: admin.id,
      },
    });

    for (const cat of [
      { nombre: 'General',    precio: 350,  totalBoletos: 500, disponibles: 500, ordenDisplay: 1 },
      { nombre: 'Preferente', precio: 650,  totalBoletos: 200, disponibles: 200, ordenDisplay: 2 },
      { nombre: 'VIP',        precio: 1200, totalBoletos: 50,  disponibles: 50,  ordenDisplay: 3 },
    ]) {
      const existe = await prisma.categoria.findFirst({ where: { eventoId: palenque.id, nombre: cat.nombre } });
      if (!existe) await prisma.categoria.create({ data: { ...cat, eventoId: palenque.id } });
    }

    // Eventos Palacio Vaquero
    const noches = [
      { slug: 'palacio-vaquero-rodeo-may25', nombre: 'Palacio Vaquero — Rodeo · Lun 25 May', fechaEvento: new Date('2026-05-25T20:00:00-06:00'), fechaFin: new Date('2026-05-26T02:30:00-06:00') },
      { slug: 'palacio-vaquero-rodeo-may26', nombre: 'Palacio Vaquero — Rodeo · Mar 26 May', fechaEvento: new Date('2026-05-26T20:00:00-06:00'), fechaFin: new Date('2026-05-27T02:30:00-06:00') },
      { slug: 'palacio-vaquero-rodeo-may27', nombre: 'Palacio Vaquero — Rodeo · Mié 27 May', fechaEvento: new Date('2026-05-27T20:00:00-06:00'), fechaFin: new Date('2026-05-28T02:30:00-06:00') },
    ];

    for (const n of noches) {
      const ev = await prisma.evento.upsert({
        where:  { slug: n.slug },
        update: {},
        create: {
          ...n,
          descripcion: 'Arturo Treviño presenta su Evento de Rodeo. ¡Lo más vaquero de Monterrey!',
          lugar: 'Palacio Vaquero, Monterrey, NL',
          imagen: '/eventos/palacio-vaquero-rodeo.jpg',
          estado: 'ACTIVO',
          organizadorId: admin.id,
        },
      });
      for (const cat of [
        { nombre: 'General',    precio: 400,  totalBoletos: 500, disponibles: 500, ordenDisplay: 1 },
        { nombre: 'Preferente', precio: 800,  totalBoletos: 200, disponibles: 200, ordenDisplay: 2 },
        { nombre: 'VIP',        precio: 1500, totalBoletos: 50,  disponibles: 50,  ordenDisplay: 3 },
      ]) {
        const existe = await prisma.categoria.findFirst({ where: { eventoId: ev.id, nombre: cat.nombre } });
        if (!existe) await prisma.categoria.create({ data: { ...cat, eventoId: ev.id } });
      }
    }

    console.log('✅ Startup OK — admin@iados.mx / admin123');
  } catch (e) {
    console.error('⚠️  Startup seed falló:', e);
  } finally {
    await prisma.$disconnect();
  }
}
