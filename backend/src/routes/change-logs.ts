/**
 * 变更日志 REST API 路由
 * 需求 7079581339：GET /api/change-logs — 变更历史查询
 * 需求 7078969349：GET /api/change-logs/export — CSV 导出
 */

import { Router } from 'express';
import { changeLogService } from '../services/change-log-service.js';
import { changeLogFilterSchema, changeLogExportSchema } from '../schemas/assignment-schema.js';
import { AppError } from '../middleware/error.js';
import type { ChangeLogAction } from '@seat-mgmt/shared';

export const changeLogsRouter = Router();

/**
 * GET /api/change-logs/export — 导出变更历史为 CSV（含 UTF-8 BOM）
 * 支持与查询接口相同的筛选条件
 */
changeLogsRouter.get('/export', (req, res, next) => {
  try {
    const parsed = changeLogExportSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }

    const csv = changeLogService.exportChangeLogsAsCsv({
      ...parsed.data,
      action: parsed.data.action as ChangeLogAction | undefined,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="change-logs.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/change-logs — 查询变更历史
 * 支持按 action/departmentId/employeeId/seatId/startDate/endDate 筛选，page/pageSize 分页
 */
changeLogsRouter.get('/', (req, res, next) => {
  try {
    const parsed = changeLogFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }

    const { page, pageSize, ...filter } = parsed.data;
    const result = changeLogService.listChangeLogs({
      ...filter,
      action: filter.action as ChangeLogAction | undefined,
      page,
      pageSize,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});
