/**
 * 预约 Zod 校验 schema
 * 需求 7079562886：创建/筛选/取消预约校验
 */

import { z } from 'zod';

/** 预约状态枚举值 */
export const bookingStatusValues = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'expired',
] as const;

/** 创建预约 schema */
export const createBookingSchema = z
  .object({
    seatId: z.number().int().positive('工位 ID 必须为正整数'),
    employeeId: z.number().int().positive('员工 ID 必须为正整数'),
    startTime: z.string().min(1, '开始时间不能为空'),
    endTime: z.string().min(1, '结束时间不能为空'),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: '结束时间必须晚于开始时间',
    path: ['endTime'],
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime);
      const now = new Date();
      // 允许 1 分钟内的时间偏差（避免时钟漂移）
      return start.getTime() >= now.getTime() - 60_000;
    },
    { message: '开始时间不能早于当前时间', path: ['startTime'] },
  );

/** 预约筛选 schema */
export const bookingFilterSchema = z.object({
  seatId: z.coerce.number().int().positive().optional(),
  employeeId: z.coerce.number().int().positive().optional(),
  status: z.enum(bookingStatusValues).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

/** 预约 ID 参数校验 */
export const bookingIdSchema = z.object({
  id: z.coerce.number().int().positive('预约 ID 必须为正整数'),
});
