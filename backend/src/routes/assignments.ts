/**
 * 工位分配与变更管理 REST API 路由
 * 需求 7079581339：
 *   POST   /api/assignments          — 分配工位给员工
 *   DELETE /api/assignments/:id      — 取消分配
 *   POST   /api/assignments/transfer — 工位变更（转移）
 *   POST   /api/assignments/batch    — 批量分配
 *   POST   /api/assignments/relocate — 部门搬迁
 *   GET    /api/assignments           — 查询分配记录
 */

import { Router } from 'express';
import { assignService } from '../services/assign-service.js';
import {
  assignSchema,
  transferSchema,
  batchAssignSchema,
  relocateSchema,
  assignmentFilterSchema,
} from '../schemas/assignment-schema.js';
import { AppError } from '../middleware/error.js';
import type { AssignmentType, AssignmentStatus } from '@seat-mgmt/shared';

export const assignmentsRouter = Router();

/**
 * GET /api/assignments — 查询分配记录列表
 * 支持按 seatId/employeeId/status 筛选
 */
assignmentsRouter.get('/', (req, res, next) => {
  try {
    const parsed = assignmentFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }

    const result = assignService.listAssignments({
      seatId: parsed.data.seatId,
      employeeId: parsed.data.employeeId,
      status: parsed.data.status as AssignmentStatus | undefined,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/assignments — 分配工位给员工
 * 校验工位空闲 + 员工无固定工位，分配后 seat.status='occupied'
 */
assignmentsRouter.post('/', (req, res, next) => {
  try {
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }

    const assignment = assignService.assign(
      parsed.data.seatId,
      parsed.data.employeeId,
      parsed.data.assignedBy,
      parsed.data.type as AssignmentType,
    );
    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/assignments/:id — 取消分配
 * 释放工位（seat.status='available'），写 change_log
 */
assignmentsRouter.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, '分配记录 ID 必须为正整数', 'VALIDATION_ERROR');
    }

    // 操作人从 query 参数读取，默认 'system'
    const operator = (req.query.operator as string) || 'system';

    assignService.unassign(id, operator);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/assignments/transfer — 工位变更
 * 员工从旧工位转移到新工位，记录 change_log
 */
assignmentsRouter.post('/transfer', (req, res, next) => {
  try {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }

    const assignment = assignService.transfer(
      parsed.data.employeeId,
      parsed.data.newSeatId,
      parsed.data.operator,
    );
    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/assignments/batch — 批量分配
 * 多工位+多员工一一对应，事务保证原子性
 */
assignmentsRouter.post('/batch', (req, res, next) => {
  try {
    const parsed = batchAssignSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }

    const assignments = assignService.batchAssign(
      parsed.data.pairs,
      parsed.data.assignedBy,
    );
    res.status(201).json({ success: true, data: assignments });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/assignments/relocate — 部门搬迁
 * 部门所有员工统一移动到目标区域
 */
assignmentsRouter.post('/relocate', (req, res, next) => {
  try {
    const parsed = relocateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }

    assignService.relocate(
      parsed.data.departmentId,
      parsed.data.targetArea,
      parsed.data.operator,
    );
    res.json({ success: true, data: { message: '部门搬迁完成' } });
  } catch (err) {
    next(err);
  }
});
