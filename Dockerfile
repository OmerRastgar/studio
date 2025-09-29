
# ---- Base ----
FROM node:20-alpine as base
WORKDIR /app
RUN chown -R node:node /app

# ---- Dependencies ----
FROM base as deps
WORKDIR /app
COPY --chown=node:node package.json package-lock.json* ./
RUN npm install
# patch-package is run via postinstall script

# ---- Builder ----
FROM base as builder
WORKDIR /app
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}
ENV NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}

COPY --chown=node:node --from=deps /app/node_modules ./node_modules
# Copy patch-package script and package.json to run it
COPY --chown=node:node package.json .
COPY --chown=node:node patches ./patches
RUN npm run postinstall

# Copy app source
COPY --chown=node:node . .

RUN npm run build

# ---- Runner ----
FROM base as runner
WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static

USER node

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
