FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

# ── Dependencies ──
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production && cp -R node_modules /prod_node_modules
RUN npm ci

# ── Local development (docker compose dev) — full deps including nodemon, ts-node ──
FROM base AS development
ENV NODE_ENV=development
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
RUN mkdir -p uploads logs
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ── Build ──
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Production ──
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /prod_node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

RUN mkdir -p uploads logs && \
    chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
