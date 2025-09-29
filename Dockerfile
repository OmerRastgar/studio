# ---- Base ----
# This stage sets up the base environment for the application.
FROM node:20-alpine AS base
WORKDIR /app
RUN chown -R node:node /app

# ---- Dependencies ----
# This stage installs the npm dependencies.
FROM base AS dependencies
WORKDIR /app
USER node
COPY --chown=node:node package.json package-lock.json* ./
RUN npm ci

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
# Build the Next.js application for production
RUN npm run build

# ---- Runner ----
# This stage creates the final, lightweight image.
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user and group
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the user to the non-root user
USER nextjs

# Copy the built application from the builder stage
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static

# Expose the port the app will run on
EXPOSE 3000

# Set the command to start the application
CMD ["node", "server.js"]
