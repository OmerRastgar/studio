# ---- Base ----
FROM node:20-alpine as base
WORKDIR /app
RUN chown -R node:node /app

# ---- Dependencies ----
FROM base as deps
WORKDIR /app
COPY --chown=node:node package.json package-lock.json* ./
RUN npm ci

# ---- Builder ----
FROM base as builder
WORKDIR /app
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

# The postinstall script will run patch-package
RUN npm run build

# ---- Runner ----
FROM base as runner
WORKDIR /app

# Copy production-ready files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set the user and expose the port
USER node
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
