/**
 * 健康检查路由
 * GET /healthz   — CI 部署契约要求（返回简单 JSON）
 * GET /api/health — 需求要求的 API 健康检查端点
 */

import { Router } from 'express';
import { getDb } from '../db/connection.js';

export const healthRouter = Router();

/**
 * CI 部署健康检查端点
 * 流水线以此判断部署是否成功，返回 {"status":"ok"}
 */
healthRouter.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * API 健康检查端点
 * 返回更详细的服务状态，包含数据库连接状态
 */
healthRouter.get('/api/health', (_req, res) => {
  let dbStatus: 'ok' | 'error' = 'ok';
  let dbMessage = '';

  try {
    // 执行简单查询验证数据库连接
    getDb().prepare('SELECT 1').get();
    dbMessage = 'connected';
  } catch (err) {
    dbStatus = 'error';
    dbMessage = err instanceof Error ? err.message : 'unknown error';
  }

  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: dbStatus,
        message: dbMessage,
      },
    },
  });
});
