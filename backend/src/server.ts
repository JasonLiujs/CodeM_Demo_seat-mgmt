/**
 * 后端服务入口
 * 启动 Express 服务器，自动执行数据库 migration
 */

import { createApp } from './app.js';
import { appConfig } from './config/index.js';
import { runMigrations } from './db/migrate.js';
import { closeDb } from './db/connection.js';

// 启动时执行数据库 migration（增量、可向后兼容）
runMigrations();

const app = createApp();

const server = app.listen(appConfig.port, '0.0.0.0', () => {
  console.log(`[server] 工位管理系统后端已启动，监听 0.0.0.0:${appConfig.port}`);
  console.log(`[server] 环境: ${appConfig.isDev ? 'development' : 'production'}`);
});

// 优雅关闭
function shutdown(signal: string): void {
  console.log(`[server] 收到 ${signal} 信号，正在关闭...`);
  server.close(() => {
    closeDb();
    console.log('[server] 已关闭');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
