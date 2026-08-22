/**
 * 部门 Zod 校验 schema
 * 需求 7080732492：创建/更新/筛选部门
 */

import { z } from 'zod';

/** 创建部门 schema */
export const createDepartmentSchema = z.object({
  name: z.string().min(1, '部门名称不能为空'),
});

/** 更新部门 schema */
export const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
});
