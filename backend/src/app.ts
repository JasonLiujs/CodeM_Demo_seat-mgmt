/**
 * Express 应用配置
 * 组装中间件和路由
 * 生产环境下同时静态托管前端构建产物
 */

import express, { type Express } from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { healthRouter } from './routes/health.js';
import { seatsRouter } from './routes/seats.js';
import { floorPlansRouter } from './routes/floor-plans.js';
import { employeesRouter } from './routes/employees.js';
import { departmentsRouter } from './routes/departments.js';
import { assignmentsRouter } from './routes/assignments.js';
import { changeLogsRouter } from './routes/change-logs.js';
import { statsRouter } from './routes/stats.js';
import { bookingsRouter } from './routes/bookings.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { appConfig } from './config/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 前端构建产物目录（相对于 backend/dist/app.js 上溯三级到仓库根的 frontend/dist） */
const frontendDistPath = join(__dirname, '..', '..', 'frontend', 'dist');

/** 创建并配置 Express 应用 */
export function createApp(): Express {
  const app = express();

  // CORS — 允许前端开发服务器访问
  app.use(
    cors({
      origin: appConfig.frontendUrl,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // JSON body 解析
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 路由 — 健康检查（必须在前端静态文件之前注册）
  app.use(healthRouter); // /healthz, /api/health

  // 路由 — 工位 CRUD API
  app.use('/api/seats', seatsRouter);

  // 路由 — 平面图管理 API
  app.use('/api/floor-plans', floorPlansRouter);

  // 路由 — 部门管理 API
  app.use('/api/departments', departmentsRouter);

  // 路由 — 员工管理 API（含 CSV 批量导入）
  app.use('/api/employees', employeesRouter);

  // 路由 — 工位分配与变更管理 API
  app.use('/api/assignments', assignmentsRouter);

  // 路由 — 变更日志查询 API
  app.use('/api/change-logs', changeLogsRouter);

  // 路由 — 统计看板 API
  app.use('/api/stats', statsRouter);

  // 路由 — 临时工位预约 API
  app.use('/api/bookings', bookingsRouter);

  // 静态托管上传的图片文件
  // __dirname 编译后为 backend/dist，上溯一级到 backend/uploads
  // （与 routes/floor-plans.ts 的 uploadsDir、seed 写入路径保持一致）
  const uploadsPath = join(__dirname, '..', 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // 生产环境：静态托管前端构建产物
  if (!appConfig.isDev && existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    // SPA 回退：非 /api 和非 /healthz 的 GET 请求返回 index.html
    app.get('*', (_req, res, next) => {
      const indexPath = join(frontendDistPath, 'index.html');
      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  }

  // 404 和错误处理
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
