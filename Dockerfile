# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS backend-dependencies
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/prisma ./prisma
RUN npx prisma generate

FROM node:22-bookworm-slim AS backend-build
WORKDIR /app/backend
COPY --from=backend-dependencies /app/backend/node_modules ./node_modules
COPY backend/package.json backend/package-lock.json backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app/backend

ENV NODE_ENV=production \
    PORT=4000 \
    UPLOAD_DIR=/app/backend/uploads \
    RUN_DB_SEED=false \
    DB_MIGRATION_RETRIES=10

COPY --chown=node:node --from=backend-dependencies /app/backend/node_modules ./node_modules
COPY --chown=node:node --from=backend-dependencies /app/backend/prisma ./prisma
COPY --chown=node:node --from=backend-build /app/backend/dist ./dist
COPY --chown=node:node --from=frontend-build /app/frontend/dist ./public
COPY --chown=node:node backend/package.json backend/package-lock.json ./
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /app/backend/uploads && chown node:node /app/backend/uploads

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["sh", "./docker-entrypoint.sh"]
