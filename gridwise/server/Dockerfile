FROM node:24-alpine AS builder

WORKDIR /app

COPY server/package*.json ./
RUN npm install --no-audit --no-fund

COPY server/tsconfig.json ./
COPY server/src ./src

RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production

WORKDIR /app

COPY server/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY public-sample-cases ./public-sample-cases

EXPOSE 4000

ENV PORT=4000
ENV HOST=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||4000)+'/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/src/server.js"]
