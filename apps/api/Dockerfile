# RegioTicket API — Node 20 Alpine + Chromium para Puppeteer
FROM node:20-alpine AS deps

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    make \
    g++

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Copiar manifests del monorepo (cache de capas)
COPY package.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN npm install --legacy-peer-deps

# ────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY packages/db/ ./packages/db/
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Generar Prisma client
RUN cd packages/db && npx prisma generate --schema=schema.prisma

# Compilar TypeScript
RUN cd apps/api && npm run build

# ────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/schema.prisma ./packages/db/schema.prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
