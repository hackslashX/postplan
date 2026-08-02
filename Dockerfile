FROM node:22-bookworm-slim AS build
WORKDIR /app
# better-sqlite3 may need to compile when no prebuilt binary matches Node.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev && npm cache clean --force

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY skills ./skills
RUN mkdir -p /data && chown node:node /data
USER node
ENV DATA_DIR=/data
EXPOSE 3000 3001
CMD ["node", "dist/index.js"]
