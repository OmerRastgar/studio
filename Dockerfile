# Dockerfile for Next.js Application

# ---- Base ----
# Use a specific Node.js version for reproducibility
FROM node:20-alpine AS base
WORKDIR /app
RUN chown -R node:node /app
USER node

# ---- Dependencies ----
# Install dependencies in a separate stage to leverage Docker's layer caching
FROM base AS deps
WORKDIR /app
COPY --chown=node:node package.json package-lock.json* ./
RUN npm ci

# ---- Builder ----
# Build the Next.js application
FROM base AS builder
WORKDIR /app
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .
RUN npm run build

# ---- Runner ----
# Create the final, smaller production image
FROM base as runner
WORKDIR /app

# Set environment variables for production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy built assets from the builder stage
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# The default command to start the app
CMD ["node", "server.js"]
