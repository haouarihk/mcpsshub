FROM node:20-slim AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm rebuild better-sqlite3
RUN npm run build
RUN [ -f db.sqlite ] && npx tsx server.ts || true
RUN npx tsx --tsconfig tsconfig.json -e "console.log('compile check')"

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 mcpsshub

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

RUN mkdir -p /app/data && chown mcpsshub:nodejs /app/data
VOLUME /app/data

USER mcpsshub
EXPOSE 3000

ENV DB_PATH=/app/data/mcpsshub.db

CMD ["sh", "-c", "npx drizzle-kit push && npx tsx server.ts"]
