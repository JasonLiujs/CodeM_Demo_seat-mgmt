# CodeM 最小项目模板

这是新项目建仓后的中性占位站，不预设游戏类型或业务技术栈。

- `index.html`：仓库和域名就绪后的占位页面
- `server.js`：零依赖 Node.js 静态服务器
- `Dockerfile`：最小运行镜像，监听 `8080`
- `GET /healthz`：容器及公网发布健康检查
- `.github/workflows/deploy.yml`：提交 `main` 后自动测试、部署、注册域名并验证 HTTPS

后续开发应在保留 `.github/workflows/deploy.yml`、`AGENTS.md` 和部署约定的前提下，
将占位应用替换为真实项目。
