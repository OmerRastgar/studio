# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
RUN chown -R node:node /app
USER node

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app
COPY --chown=node:node package.json package-lock.json* ./
RUN npm install

# ---- Builder ----
FROM base AS builder
WORKDIR /app
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
# We need to copy package.json again to run postinstall scripts
COPY --chown=node:node package.json .
# Manually run postinstall to apply patches
RUN npm run postinstall
COPY --chown=node:node . .
RUN npm run build

# ---- Runner ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static

# Expose the port the app runs on
EXPOSE 3000

CMD ["node", "server.js"]
