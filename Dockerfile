
# ---- Base ----
FROM node:20-alpine as base
WORKDIR /app
RUN chown -R node:node /app
USER node

# ---- Dependencies ----
FROM base as deps
WORKDIR /app

COPY --chown=node:node package.json package-lock.json* ./
RUN npm ci

# ---- Builder ----
FROM base as builder
WORKDIR /app

# Copy dependencies
COPY --chown=node:node --from=deps /app/node_modules ./node_modules

# Copy source code and patch files
COPY --chown=node:node . .

# The postinstall script will run patch-package
RUN npm run build

# ---- Runner ----
FROM base as runner
WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
