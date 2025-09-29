# ---- Base ----
FROM node:20-alpine as base
WORKDIR /app
RUN chown -R node:node /app
USER node

# ---- Dependencies ----
FROM base as deps
WORKDIR /app
COPY --chown=node:node package.json package-lock.json* ./
COPY --chown=node:node patches ./patches
RUN npm install

# ---- Builder ----
FROM base as builder
WORKDIR /app
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .
RUN npm run build

# ---- Runner ----
FROM base as runner
WORKDIR /app
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME 0.0.0.0

CMD ["node", "server.js"]
