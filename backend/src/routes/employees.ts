/**
 * 员工 REST API 路由
 * 需求 7080732492：GET/POST/PUT/DELETE /api/employees + POST /api/employees/import
 */

import { Router } from 'express';
import multer from 'multer';
import { employeeService } from '../services/employee-service.js';
import { createEmployeeSchema, updateEmployeeSchema, employeeListQuerySchema } from '../schemas/employee-schema.js';
import { AppError } from '../middleware/error.js';
import type { CreateEmployeeDto, UpdateEmployeeDto } from '@seat-mgmt/shared';

export const employeesRouter = Router();

/** multer 配置 — CSV 文件内存存储 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new AppError(400, '只支持 CSV 文件格式', 'INVALID_FILE_TYPE'));
    }
  },
});

/**
 * GET /api/employees — 分页查询员工列表（含部门名称）
 * 支持按 departmentId/name 筛选，page/pageSize 分页
 */
employeesRouter.get('/', (req, res, next) => {
  try {
    const parsed = employeeListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }
    const result = employeeService.listEmployees(parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/employees/:id — 查询单个员工（含部门名称）
 */
employeesRouter.get('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, '员工 ID 必须为正整数', 'VALIDATION_ERROR');
    }
    const employee = employeeService.getEmployeeById(id);
    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/employees — 创建员工
 */
employeesRouter.post('/', (req, res, next) => {
  try {
    const parsed = createEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }
    const employee = employeeService.createEmployee(parsed.data as CreateEmployeeDto);
    res.status(201).json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/employees/:id — 更新员工
 */
employeesRouter.put('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, '员工 ID 必须为正整数', 'VALIDATION_ERROR');
    }
    const parsed = updateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }
    const employee = employeeService.updateEmployee(id, parsed.data as UpdateEmployeeDto);
    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/employees/:id — 删除员工
 */
employeesRouter.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, '员工 ID 必须为正整数', 'VALIDATION_ERROR');
    }
    employeeService.deleteEmployee(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/employees/import — CSV 批量导入员工
 * 文件字段名: file
 * CSV 格式: 工号,姓名,部门（首行可为表头）
 */
employeesRouter.post('/import', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, '未上传文件', 'NO_FILE');
    }
    const csvText = req.file.buffer.toString('utf-8');
    const result = employeeService.importFromCsv(csvText);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});
