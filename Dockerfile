# Dockerfile

# ---- Base ----
# Use a specific Node.js version for reproducibility.
# Alpine Linux is used for its small size.
FROM node:20-alpine AS base
WORKDIR /app
# Create a non-root user 'node' and give it ownership of the /app directory
RUN chown -R node:node /app

# ---- Dependencies ----
# This stage installs all npm dependencies.
FROM base AS dependencies
WORKDIR /app
USER node
# Copy package files and the patches directory
COPY --chown=node:node package.json package-lock.json* ./
COPY --chown=node:node patches ./patches
# Install dependencies. The 'postinstall' script in package.json will run 'patch-package'
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
# Build the Next.js application for production
RUN npm run build

# ---- Runner ----
# This is the final, production-ready image.
FROM base AS runner
WORKDIR /app
USER node

ENV NODE_ENV production

# Copy the standalone output from the builder stage.
# This includes only the necessary files to run the app.
COPY --chown=node:node --from=builder /app/.next/standalone ./
# Copy the static assets
COPY --chown=node:node --from=builder /app/.next/static ./.next/static
# Copy public assets
COPY --chown=node:node --from=builder /app/public ./public


EXPOSE 3000
ENV PORT 3000

# Start the Next.js server
CMD ["node", "server.js"]
