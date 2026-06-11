ARG NODE_IMAGE=node:20-bookworm
ARG NODE_SLIM_IMAGE=node:20-bookworm-slim

FROM ${NODE_IMAGE} AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

FROM ${NODE_SLIM_IMAGE}

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY server ./server
COPY scripts ./scripts
COPY public ./public

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/index.js"]
