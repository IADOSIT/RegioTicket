# RegioTicket

Plataforma SaaS de venta de boletos para eventos en Nuevo León (palenques, bailes, conciertos).

**Desarrollado por iaDoS · iados.mx — Apodaca, Nuevo León, México**

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL 15 |
| Cache | Redis 7 |
| Pagos | MercadoPago SDK (México) |
| PDF | Puppeteer + Chromium |
| Email | Nodemailer |
| Auth | NextAuth.js (admin) + JWT (taquilla) |
| Realtime | Server-Sent Events (SSE) |

---

## Requisitos

- Docker + Docker Compose
- Node.js 20 (solo para desarrollo local)
- Acceso al VPS con Portainer

---

## Variables de entorno

Copia `.env.example` → `.env` y rellena los valores:

```env
DATABASE_URL=postgresql://administrador:PASS@postgres_local:5432/regioticket
JWT_SECRET=<32+ chars aleatorios>
NEXTAUTH_SECRET=<32+ chars aleatorios>
NEXTAUTH_URL=https://tu-dominio.com
NEXT_PUBLIC_API_URL=https://tu-dominio.com/api
MP_ACCESS_TOKEN=<MercadoPago access token México>
MP_WEBHOOK_SECRET=<clave secreta del webhook>
SMTP_HOST=smtp.gmail.com
SMTP_USER=noreply@regioticket.mx
SMTP_PASS=<app password>
```

---

## Despliegue en VPS (Portainer)

1. Crea el archivo `.env` en el servidor con las variables de producción
2. En Portainer → Stack → RegioTicket → **Redeploy**
   - Esto ejecuta `git pull + docker compose up --build`

```
Puerto expuesto: 8089
Red Docker: web_network (externa, ya existente)
Redis: regioticket_redis (nuevo contenedor propio)
PostgreSQL: postgres_local (contenedor existente en el VPS)
```

**Punto de retroceso:** antes de cualquier cambio destructivo, crea un tag:
```bash
git tag v1.0.0-backup
git push origin v1.0.0-backup
# Para retroceder:
git checkout v1.0.0-backup
# En Portainer: Redeploy
```

---

## Desarrollo local

```bash
# Instalar dependencias
npm install --legacy-peer-deps

# Generar cliente Prisma
npm run db:generate

# Migrar base de datos
npm run db:migrate

# Seed inicial (admin + cajero + evento de ejemplo)
npm run db:seed

# Iniciar API (puerto 4000)
npm run dev:api

# Iniciar Web (puerto 3000)
npm run dev:web
```

---

## Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f regioticket_api
docker compose logs -f regioticket_web

# Acceder al contenedor API
docker exec -it regioticket_api sh

# Ejecutar migraciones en producción
docker exec regioticket_api npx prisma migrate deploy --schema=packages/db/schema.prisma

# Ejecutar seed en producción
docker exec regioticket_api node -e "require('./apps/api/dist/seed')"
```

---

## Canales de venta

| Canal | Descripción |
|-------|-------------|
| **ONLINE** | Cliente compra desde web, paga con MercadoPago |
| **TAQUILLA** | Cajero vende presencialmente, cobra efectivo o tarjeta |
| ~~PRODUCTOS~~ | v2 — estructura lista, no implementada |

---

## URLs del sistema

| Panel | URL |
|-------|-----|
| Landing pública | `http://vps:8089/` |
| Admin | `http://vps:8089/admin` |
| Taquilla POS | `http://vps:8089/taquilla/pos` |
| API Health | `http://vps:8089/api/health` |

---

## Credenciales de prueba (seed)

| Usuario | Email | Password | Rol |
|---------|-------|----------|-----|
| Admin | admin@regioticket.mx | Admin123! | SUPER_ADMIN |
| Cajero | cajero@regioticket.mx | Cajero123! | CAJERO |
