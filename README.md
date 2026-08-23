# 工位管理系统 MVP v1.0

工位管理系统 — 前后端脚手架与数据库基础。

## 技术栈

- **Monorepo 结构**：`frontend/` + `backend/` + `shared/`（npm workspaces）
- **前端**：Vite + React 18 + TypeScript（strict）+ TailwindCSS + ReactRouter 6 + Zustand
- **后端**：Node.js 22 + TypeScript（strict）+ Express 4 + better-sqlite3 + Zod
- **数据库**：SQLite（better-sqlite3，嵌入式零运维）
- **容器化**：Docker 多阶段构建 + Docker Compose

## 开发

```bash
# 安装依赖
npm install

# 启动开发环境（前后端热重载）
npm run dev

# 或通过 Docker Compose
docker compose --profile dev up
```

开发模式下：

- 前端 Vite dev server 监听 `http://localhost:5173`，自动代理 `/api` 和 `/healthz` 到后端
- 后端 Express 监听 `http://localhost:3001`

## 构建

```bash
# 构建所有包（shared → backend → frontend）
npm run build

# 类型检查
npm run typecheck

# 运行测试
npm test
```

## 部署

代码 push 到 `main` 分支后，GitHub Actions 自动：

1. 安装依赖并运行测试
2. 构建 Docker 镜像
3. 部署到生产服务器
4. 通过 Caddy 反代发布到 `https://seat-mgmt.meegodemo.com`
5. 验证公网 HTTPS 健康检查

### 部署契约

- 服务监听 `0.0.0.0`，端口从 `PORT` 环境变量读取（默认 `8080`）
- 健康检查端点：`GET /healthz`（返回 `{"status":"ok"}`）
- API 健康端点：`GET /api/health`（返回服务与数据库状态）
- 保留 `.github/workflows/deploy.yml`、`AGENTS.md`、`Dockerfile`、`docker-compose.yml`
