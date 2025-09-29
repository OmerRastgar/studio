# Dockerfile

# ---- Base ----
FROM node:20-alpine as base
WORKDIR /app
RUN chown -R node:node /app

# ---- Dependencies ----
FROM base as dependencies
WORKDIR /app
COPY --chown=node:node package.json package-lock.json* ./
# install dependencies and run postinstall scripts
RUN npm ci

# ---- Builder ----
FROM base as builder
WORKDIR /app
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node . .
RUN npm run build

# ---- Runner ----
FROM base as runner
WORKDIR /app

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

USER nextjs

# Copy the built application from the builder stage
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
# Create the public directory before copying into it
RUN mkdir -p public
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
