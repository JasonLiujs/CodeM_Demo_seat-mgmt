# ---- 构建阶段：编译 TypeScript + Vite 构建 ----
FROM node:20-alpine AS build

WORKDIR /app

# 先拷贝依赖清单，利用 Docker 层缓存
COPY package.json ./
RUN npm install

# 拷贝源码并构建
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY server.js ./
COPY public ./public
RUN npm run build

# ---- 运行阶段：最小化镜像，仅托管构建产物 ----
FROM node:20-alpine AS runtime

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY --from=build /app/dist ./dist

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["node", "server.js"]
