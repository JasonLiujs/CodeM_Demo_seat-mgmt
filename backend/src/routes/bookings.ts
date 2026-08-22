/**
 * 临时工位预约 REST API 路由
 * 需求 7079562886：
 *   GET    /api/bookings          — 预约列表（按工位/员工/日期/状态筛选）
 *   POST   /api/bookings          — 创建预约（校验时段不冲突）
 *   DELETE /api/bookings/:id      — 取消预约
 */

import { Router } from 'express';
import { bookingService } from '../services/booking-service.js';
import { createBookingSchema, bookingFilterSchema } from '../schemas/booking-schema.js';
import { AppError } from '../middleware/error.js';
import type { BookingStatus } from '@seat-mgmt/shared';

export const bookingsRouter = Router();

/**
 * GET /api/bookings — 预约列表
 * 支持按 seatId/employeeId/status/startDate/endDate 筛选，page/pageSize 分页
 */
bookingsRouter.get('/', (req, res, next) => {
  try {
    const parsed = bookingFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }

    const { page, pageSize, ...filter } = parsed.data;
    const result = bookingService.listBookings({
      ...filter,
      status: filter.status as BookingStatus | undefined,
      page,
    pageSize,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/bookings — 创建预约
 * 校验同一 seat_id 同一时间段不能有多个 active 预约
 */
bookingsRouter.post('/', (req, res, next) => {
  try {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }

    const booking = bookingService.createBooking(parsed.data);
    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/bookings/:id — 取消预约
 */
bookingsRouter.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, '预约 ID 必须为正整数', 'VALIDATION_ERROR');
    }

    // 操作人从 query 参数读取，默认 'system'
    const operator = (req.query.operator as string) || 'system';

    bookingService.cancelBooking(id, operator);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
