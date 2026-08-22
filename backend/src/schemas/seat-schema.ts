/**
 * 工位 Zod 校验 schema
 * 需求 7080518042：创建/更新/筛选工位 + 分页参数校验
 */

import { z } from 'zod';

/** 工位状态枚举值 */
const seatStatusValues = ['available', 'occupied', 'reserved', 'maintenance'] as const;
/** 工位类型枚举值 */
const seatTypeValues = ['standard', 'standing', 'meeting', 'private'] as const;

/** 创建工位 schema */
export const createSeatSchema = z.object({
  code: z.string().min(1, '工位编码不能为空'),
  area: z.string().min(1, '区域不能为空'),
  type: z.enum(seatTypeValues).default('standard'),
  x: z.number().default(0),
  y: z.number().default(0),
  w: z.number().positive().default(60),
  h: z.number().positive().default(60),
  floorPlanId: z.number().int().positive().nullable().optional(),
  status: z.enum(seatStatusValues).default('available'),
});

/** 更新工位 schema（所有字段可选） */
export const updateSeatSchema = z.object({
  code: z.string().min(1).optional(),
  area: z.string().min(1).optional(),
  type: z.enum(seatTypeValues).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().positive().optional(),
  h: z.number().positive().optional(),
  floorPlanId: z.number().int().positive().nullable().optional(),
  status: z.enum(seatStatusValues).optional(),
});

/** 工位筛选 schema */
export const seatFilterSchema = z.object({
  area: z.string().optional(),
  type: z.enum(seatTypeValues).optional(),
  status: z.enum(seatStatusValues).optional(),
  floorPlanId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
