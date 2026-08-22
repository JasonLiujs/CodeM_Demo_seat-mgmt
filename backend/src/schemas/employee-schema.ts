/**
 * 员工 Zod 校验 schema
 * 需求 7080732492：创建/更新/筛选员工 + CSV 导入参数校验
 */

import { z } from 'zod';

/** 创建员工 schema */
export const createEmployeeSchema = z.object({
  empNo: z.string().min(1, '工号不能为空'),
  name: z.string().min(1, '姓名不能为空'),
  departmentId: z.number().int().positive().nullable().optional(),
});

/** 更新员工 schema（所有字段可选） */
export const updateEmployeeSchema = z.object({
  empNo: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  departmentId: z.number().int().positive().nullable().optional(),
});

/** 员工列表查询 schema（含分页 + 筛选） */
export const employeeListQuerySchema = z.object({
  departmentId: z.coerce.number().int().positive().optional(),
  name: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
