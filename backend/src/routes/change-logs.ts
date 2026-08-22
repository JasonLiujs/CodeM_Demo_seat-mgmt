/**
 * 变更日志 REST API 路由
 * 需求 7079581339：GET /api/change-logs — 变更历史查询
 */

import { Router } from 'express';
import { changeLogService } from '../services/change-log-service.js';
import { changeLogFilterSchema } from '../schemas/assignment-schema.js';
import { AppError } from '../middleware/error.js';
import type { ChangeLogAction } from '@seat-mgmt/shared';

export const changeLogsRouter = Router();

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
