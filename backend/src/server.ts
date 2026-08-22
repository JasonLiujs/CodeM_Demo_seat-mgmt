/**
 * 后端服务入口
 * 启动 Express 服务器，自动执行数据库 migration
 */

import { createApp } from './app.js';
import { appConfig } from './config/index.js';
import { runMigrations } from './db/migrate.js';
import { closeDb } from './db/connection.js';
import { statsService } from './services/stats-service.js';
import { bookingService } from './services/booking-service.js';

// 启动时执行数据库 migration（增量、可向后兼容）
runMigrations();

const app = createApp();

const server = app.listen(appConfig.port, '0.0.0.0', () => {
  console.log(`[server] 工位管理系统后端已启动，监听 0.0.0.0:${appConfig.port}`);
  console.log(`[server] 环境: ${appConfig.isDev ? 'development' : 'production'}`);
});

// 每日利用率快照定时任务
// 每分钟检查一次是否到 23:59，到点则记录当日快照
let lastSnapshotDate: string | null = null;

function getDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function checkAndSnapshot(): void {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const todayStr = getDateString();

  // 23:59 执行，且当天尚未记录过
  if (hours === 23 && minutes === 59 && lastSnapshotDate !== todayStr) {
    try {
      statsService.recordDailySnapshot();
      lastSnapshotDate = todayStr;
      console.log(`[snapshot] 已记录 ${todayStr} 的利用率快照`);
    } catch (err) {
      console.error(`[snapshot] 记录快照失败:`, err);
    }
  }
}

const snapshotInterval = setInterval(checkAndSnapshot, 60_000);

// 预约到期自动失效定时任务
// 每分钟检查一次，将 end_time < now 的 active 预约标记为 expired
function checkAndExpireBookings(): void {
  try {
    const count = bookingService.expireBookings();
    if (count > 0) {
      console.log(`[booking] ${count} 条预约已到期自动失效`);
    }
  } catch (err) {
    console.error('[booking] 预约过期处理失败:', err);
  }
}

const expireBookingsInterval = setInterval(checkAndExpireBookings, 60_000);

// 优雅关闭
function shutdown(signal: string): void {
  console.log(`[server] 收到 ${signal} 信号，正在关闭...`);
  clearInterval(snapshotInterval);
  clearInterval(expireBookingsInterval);
  server.close(() => {
    closeDb();
    console.log('[server] 已关闭');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
