/**
 * 平面图 Zod 校验 schema
 * 需求 7080518042：平面图上传参数校验
 */

import { z } from 'zod';

/** 创建平面图 schema（multipart 表单字段） */
export const createFloorPlanSchema = z.object({
  name: z.string().min(1, '平面图名称不能为空'),
  width: z.coerce.number().int().positive().default(1920),
  height: z.coerce.number().int().positive().default(1080),
});
