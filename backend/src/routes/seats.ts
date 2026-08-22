/**
 * 工位 REST API 路由
 * 需求 7080518042：GET/POST/PUT/DELETE /api/seats
 */

import { Router } from 'express';
import { seatService } from '../services/seat-service.js';
import { createSeatSchema, updateSeatSchema, seatFilterSchema } from '../schemas/seat-schema.js';
import { AppError } from '../middleware/error.js';
import { SeatType, SeatStatus } from '@seat-mgmt/shared';
import type { SeatFilterDto, CreateSeatDto, UpdateSeatDto } from '@seat-mgmt/shared';

export const seatsRouter = Router();

/**
 * GET /api/seats — 分页查询工位列表
 * 支持按 area/type/status/floorPlanId 筛选，page/pageSize 分页
 */
seatsRouter.get('/', (req, res, next) => {
  try {
    const parsed = seatFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }

    const { page, pageSize, ...filter } = parsed.data;
    const result = seatService.listSeats({
      ...filter as SeatFilterDto,
      page,
      pageSize,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/seats — 创建工位
 */
seatsRouter.post('/', (req, res, next) => {
  try {
    const parsed = createSeatSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }

    const seat = seatService.createSeat({
      ...parsed.data,
      type: parsed.data.type as SeatType,
      status: parsed.data.status as SeatStatus,
    } as CreateSeatDto);
    res.status(201).json({ success: true, data: seat });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/seats/:id — 更新工位
 */
seatsRouter.put('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, '工位 ID 必须为正整数', 'VALIDATION_ERROR');
    }

    const parsed = updateSeatSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }

    const data = { ...parsed.data } as UpdateSeatDto;
    if (parsed.data.type !== undefined) data.type = parsed.data.type as SeatType;
    if (parsed.data.status !== undefined) data.status = parsed.data.status as SeatStatus;

    const seat = seatService.updateSeat(id, data);
    res.json({ success: true, data: seat });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/seats/:id — 删除工位
 */
seatsRouter.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, '工位 ID 必须为正整数', 'VALIDATION_ERROR');
    }

    seatService.deleteSeat(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
