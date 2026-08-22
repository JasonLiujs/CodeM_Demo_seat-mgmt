# ---- 前端构建阶段 ----
FROM node:22-alpine AS frontend-build

WORKDIR /app

# 先复制 package.json 和 tsconfig 用于依赖缓存
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
COPY package.json package-lock.json* ./

# 安装所有依赖（含 workspace 链接）
RUN npm install

# 复制源码
COPY shared/ ./shared/
COPY frontend/ ./frontend/
COPY backend/ ./backend/

# 构建前端
RUN npm run build -w @seat-mgmt/shared
RUN npm run build -w @seat-mgmt/frontend

# ---- 后端构建阶段 ----
FROM node:22-alpine AS backend-build

WORKDIR /app

COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY package.json package-lock.json* ./

RUN npm install

COPY shared/ ./shared/
COPY backend/ ./backend/

RUN npm run build -w @seat-mgmt/shared
RUN npm run build -w @seat-mgmt/backend

# ---- 生产运行阶段 ----
FROM node:22-alpine AS production

# 安装 better-sqlite3 运行时依赖
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 复制构建产物
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/shared/dist ./shared/dist
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# 复制 package.json 用于依赖安装
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
COPY package.json package-lock.json* ./

# 安装生产依赖
RUN npm install --omit=dev

# 确保 better-sqlite3 在生产环境中编译
RUN cd backend && npm rebuild better-sqlite3

# 数据目录
RUN mkdir -p /app/backend/data
VOLUME ["/app/backend/data"]

# 环境变量
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:${PORT:-8080}/healthz || exit 1

# 启动后端服务（同时静态托管前端）
CMD ["node", "backend/dist/server.js"]
