/**
 * 统计 REST API 路由
 * 需求 7080572472：GET /api/stats/*
 */

import { Router } from 'express';
import { statsService } from '../services/stats-service.js';
import { AppError } from '../middleware/error.js';

export const statsRouter = Router();

/**
 * GET /api/stats/overview — 统计概览
 * 返回总工位数、已分配数、空闲数、预约中数、利用率等
 */
statsRouter.get('/overview', (_req, res, next) => {
  try {
    const data = statsService.getOverview();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stats/by-area — 按区域统计
 * 返回各区域工位状态分布
 */
statsRouter.get('/by-area', (_req, res, next) => {
  try {
    const data = statsService.getByArea();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stats/trends?days=30 — 近 N 天利用率趋势
 * 读取 stats_daily 表返回历史快照，无历史数据时返回当日实时兜底
 */
statsRouter.get('/trends', (req, res, next) => {
  try {
    const daysRaw = req.query.days;
    const days = daysRaw ? Number(daysRaw) : 30;
    if (!Number.isInteger(days) || days <= 0 || days > 365) {
      throw new AppError(400, 'days 参数必须为 1-365 之间的整数', 'VALIDATION_ERROR');
    }
    const data = statsService.getTrends(days);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stats/departments — 部门工位分布
 * 联表 employees + departments 统计各部门员工数和已分配数
 */
statsRouter.get('/departments', (_req, res, next) => {
  try {
    const data = statsService.getDepartments();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});
