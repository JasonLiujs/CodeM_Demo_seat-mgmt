/**
 * 部门 REST API 路由
 * 需求 7080732492：GET/POST/PUT/DELETE /api/departments
 */

import { Router } from 'express';
import { departmentService } from '../services/department-service.js';
import { createDepartmentSchema, updateDepartmentSchema } from '../schemas/department-schema.js';
import { AppError } from '../middleware/error.js';
import type { CreateDepartmentDto, UpdateDepartmentDto } from '@seat-mgmt/shared';

export const departmentsRouter = Router();

/**
 * GET /api/departments — 查询所有部门
 */
departmentsRouter.get('/', (_req, res, next) => {
  try {
    const departments = departmentService.listDepartments();
    res.json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/departments/:id — 查询单个部门
 */
departmentsRouter.get('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, '部门 ID 必须为正整数', 'VALIDATION_ERROR');
    }
    const department = departmentService.getDepartmentById(id);
    res.json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/departments — 创建部门
 */
departmentsRouter.post('/', (req, res, next) => {
  try {
    const parsed = createDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }
    const department = departmentService.createDepartment(parsed.data as CreateDepartmentDto);
    res.status(201).json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/departments/:id — 更新部门
 */
departmentsRouter.put('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, '部门 ID 必须为正整数', 'VALIDATION_ERROR');
    }
    const parsed = updateDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }
    const department = departmentService.updateDepartment(id, parsed.data as UpdateDepartmentDto);
    res.json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/departments/:id — 删除部门
 */
departmentsRouter.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, '部门 ID 必须为正整数', 'VALIDATION_ERROR');
    }
    departmentService.deleteDepartment(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
