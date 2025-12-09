FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Install system deps required by Prisma (OpenSSL) and glibc compatibility
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install system deps required by Prisma
RUN apk add --no-cache libc6-compat openssl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package files and Prisma schema (needed for generation)
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma

# Generate Prisma Client
RUN pnpm prisma:generate

# Copy the rest of the application
COPY . .

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Helper stage to prepare Prisma files
FROM builder AS prisma-files
WORKDIR /app
RUN mkdir -p /prisma-output && \
    if [ -d "node_modules/.prisma" ]; then cp -r node_modules/.prisma /prisma-output/; fi && \
    if [ -d "node_modules/@prisma" ]; then cp -r node_modules/@prisma /prisma-output/; fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone output (this includes necessary node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files from helper stage
COPY --from=prisma-files /prisma-output /prisma-temp

# Copy Prisma files if they exist and aren't already in standalone output
RUN if [ ! -d "node_modules/.prisma" ] && [ -d "/prisma-temp/.prisma" ]; then \
      mkdir -p node_modules && \
      cp -r /prisma-temp/.prisma node_modules/ && \
      cp -r /prisma-temp/@prisma node_modules/ && \
      chown -R nextjs:nodejs node_modules/.prisma node_modules/@prisma; \
    fi || true

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

