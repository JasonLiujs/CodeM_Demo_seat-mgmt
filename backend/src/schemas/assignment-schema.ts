/**
 * 工位分配 Zod 校验 schema
 * 需求 7079581339：分配/转移/批量分配/部门搬迁/变更日志筛选校验
 */

import { z } from 'zod';

/** 分配类型枚举值 */
const assignmentTypeValues = ['fixed', 'flexible'] as const;

/** 分配 schema */
export const assignSchema = z.object({
  seatId: z.number().int().positive('工位 ID 必须为正整数'),
  employeeId: z.number().int().positive('员工 ID 必须为正整数'),
  assignedBy: z.string().min(1, '操作人不能为空'),
  type: z.enum(assignmentTypeValues).default('fixed'),
});

/** 转移 schema */
export const transferSchema = z.object({
  employeeId: z.number().int().positive('员工 ID 必须为正整数'),
  newSeatId: z.number().int().positive('新工位 ID 必须为正整数'),
  operator: z.string().min(1, '操作人不能为空'),
});

/** 批量分配 schema */
export const batchAssignSchema = z.object({
  pairs: z
    .array(
      z.object({
        seatId: z.number().int().positive(),
        employeeId: z.number().int().positive(),
      }),
    )
    .min(1, '批量分配列表不能为空'),
  assignedBy: z.string().min(1, '操作人不能为空'),
});

/** 部门搬迁 schema */
export const relocateSchema = z.object({
  departmentId: z.number().int().positive('部门 ID 必须为正整数'),
  targetArea: z.string().min(1, '目标区域不能为空'),
  operator: z.string().min(1, '操作人不能为空'),
});

/** 变更日志筛选 schema */
export const changeLogFilterSchema = z.object({
  action: z.string().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  employeeId: z.coerce.number().int().positive().optional(),
  seatId: z.coerce.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

/** 变更日志导出 schema（无分页字段，复用筛选条件） */
export const changeLogExportSchema = z.object({
  action: z.string().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  employeeId: z.coerce.number().int().positive().optional(),
  seatId: z.coerce.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/** 分配记录筛选 schema */
export const assignmentFilterSchema = z.object({
  seatId: z.coerce.number().int().positive().optional(),
  employeeId: z.coerce.number().int().positive().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
