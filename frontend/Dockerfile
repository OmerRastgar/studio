# ---- Base ----
# This stage sets up the base environment for the application.
FROM node:20-alpine AS base
WORKDIR /app
# Install OpenSSL for Prisma
RUN apk add --no-cache openssl
RUN chown -R node:node /app

# ---- Dependencies ----
# This stage installs the npm dependencies.
FROM base AS dependencies
WORKDIR /app
USER node
COPY --chown=node:node package.json ./
# Copy package-lock.json if it exists, otherwise npm install will create it
COPY --chown=node:node package-lock.json* ./
# Install dependencies using npm ci for deterministic builds
RUN npm install --legacy-peer-deps

# ---- Builder ----
# This stage builds the Next.js application.
FROM base AS builder
WORKDIR /app
USER node
# Copy installed dependencies from the 'dependencies' stage
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
# Copy the rest of the application source code
COPY --chown=node:node . .
# Ensure public directory exists (even if empty) to prevent COPY error
RUN mkdir -p public
# Build the Next.js application for production with increased memory and optimizations
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
ENV JWT_SECRET=dummy_secret_for_build
ENV SKIP_OBSERVABILITY=true
# Install TypeScript explicitly to prevent Next.js auto-install from failing due to peer deps
RUN npm install typescript @types/react @types/node --save-dev --legacy-peer-deps
# Build with Docker optimizations to avoid timeout issues
RUN npm run build:docker

# ---- Runner ----
# This stage creates the final, lightweight image.
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user and group (Optimized: Combined)
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

# Set the user to the non-root user
USER nextjs

# Copy the built application from the builder stage
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static

# Expose the port the app will run on
EXPOSE 3000

# Install curl for health checks
USER root
RUN apk add --no-cache curl
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Set the command to start the application
CMD ["node", "server.js"]
