# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
RUN chown -R node:node /app

# ---- Dependencies ----
FROM base AS dependencies
WORKDIR /app
COPY --chown=node:node package.json package-lock.json* ./
RUN npm ci

# ---- Builder ----
FROM base AS builder
WORKDIR /app
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node . .

# Build the Next.js application for production
RUN npm run build

# ---- Runner ----
FROM base AS runner
WORKDIR /app

# Set the NODE_ENV to production
ENV NODE_ENV=production

# Create a non-root user and switch to it
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Copy the built application from the builder stage
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static

# Expose the port the app runs on
EXPOSE 3000

# Set the default command to start the app
CMD ["node", "server.js"]
