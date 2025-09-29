# ---- Base ----
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Set user
RUN chown -R node:node /app

# ---- Dependencies ----
FROM base AS deps

WORKDIR /app

# Copy package files and install dependencies
COPY --chown=node:node package.json package-lock.json* ./
RUN npm install

# ---- Builder ----
FROM base AS builder

WORKDIR /app

# Copy installed dependencies
COPY --chown=node:node --from=deps /app/node_modules ./node_modules

# Copy patch-package script and package.json to run it
COPY --chown=node:node package.json .
COPY --chown=node:node -R patches ./patches
RUN npm run postinstall

# Copy the rest of the application files
COPY --chown=node:node . .

# Build the application
RUN npm run build

# ---- Runner ----
FROM base as runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy built application from the builder stage
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static

# Set the user to "node"
USER node

# Expose the port the app will run on
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
