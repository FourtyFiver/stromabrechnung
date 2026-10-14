FROM node:24-alpine AS base

# npm auf aktuelle Major-Version (12.x), Node 24 bringt per Default npm 11 mit.
# Wird bei jedem Build frisch installiert; Version explizit gepinnt fuer reproduzierbare Builds.
RUN npm install -g npm@12.0.2

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

# Generate Prisma Client
RUN npx prisma generate

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Europe/Berlin
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

# tzdata fuer TZ, openssl fuer die Prisma-Engines.
# Prisma CLI (devDependency, nicht im Next-standalone-Output) fest ins Image installieren,
# damit start.sh `db push` ohne Netzwerk ausfuehren kann. Version = prisma in package.json.
RUN apk add --no-cache tzdata openssl \
    && mkdir -p /opt/prisma \
    && npm install --prefix /opt/prisma --no-save --no-audit --no-fund prisma@6.19.2

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy prisma directory for migrations/schema
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Schema-Kopie außerhalb des Volume-Mounts: /app/prisma wird in der Produktion
# per bind mount überschrieben (DB-Lage), dadurch schattiert der HOST sein
# schema.prisma das image-interne. db push nutzt deshalb bewusst diese Kopie,
# damit Schema-Updates aus neuen Images immer ankommen.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma-internal
# Copy db dir if it exists, or let it be created by volume? 
# We'll use a volume mount for the DB, so no need to copy a pre-existing DB.

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME=0.0.0.0

COPY --chown=nextjs:nodejs start.sh ./
RUN chmod +x start.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/login || exit 1

# Start the app
CMD ["./start.sh"]
