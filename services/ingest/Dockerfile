# Production image for the private SportToday beta.
FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV INGEST_DATA_DIR=/app/data
WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY scripts/deploy ./scripts/deploy

RUN mkdir -p /app/data /app/reports /app/backups \
  && chown -R node:node /app
USER node

EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4173/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/cli.js", "mvp:web", "--source=xmltvfr", "--host=0.0.0.0", "--port=4173", "--refresh-hours=6", "--refresh-xmltv-if-empty"]
