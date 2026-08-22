/**
 * 工位服务层测试
 * 需求 7080518042：验证 SeatService CRUD 逻辑
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { closeDb } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import { runSeed } from '../db/seed.js';
import { seatService } from '../services/seat-service.js';
import { AppError } from '../middleware/error.js';
import { SeatStatus, SeatType } from '@seat-mgmt/shared';
import { rmSync } from 'node:fs';

const TEST_DB_PATH = '/tmp/test-seat-service.db';

beforeEach(() => {
  closeDb();
  rmSync(TEST_DB_PATH, { force: true });
  process.env.DB_PATH = TEST_DB_PATH;
  runMigrations();
  runSeed();
});

afterEach(() => {
  closeDb();
});

describe('SeatService', () => {
  describe('listSeats', () => {
    it('应返回分页工位列表', () => {
      const result = seatService.listSeats({ page: 1, pageSize: 5 });
      expect(result.data).toHaveLength(5);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(5);
      expect(result.totalPages).toBe(2);
    });

    it('应支持按区域筛选', () => {
      const result = seatService.listSeats({ area: 'A区', page: 1, pageSize: 20 });
      expect(result.data).toHaveLength(5);
      expect(result.data.every((s) => s.area === 'A区')).toBe(true);
    });

    it('应支持按状态筛选', () => {
      const result = seatService.listSeats({ status: SeatStatus.MAINTENANCE, page: 1, pageSize: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('maintenance');
    });

    it('应支持按类型筛选', () => {
      const result = seatService.listSeats({ type: SeatType.STANDING, page: 1, pageSize: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('standing');
    });
  });

  describe('createSeat', () => {
    it('应创建新工位', () => {
      const seat = seatService.createSeat({
        code: 'C-001',
        area: 'C区',
        type: SeatType.STANDARD,
        x: 100,
        y: 200,
        w: 60,
        h: 60,
      });
      expect(seat.id).toBeGreaterThan(0);
      expect(seat.code).toBe('C-001');
      expect(seat.area).toBe('C区');
      expect(seat.status).toBe('available');
    });

    it('重复 code 应抛出 409', () => {
      expect(() => {
        seatService.createSeat({
          code: 'A-001',
          area: 'A区',
          type: SeatType.STANDARD,
          x: 0,
          y: 0,
          w: 60,
          h: 60,
        });
      }).toThrow(AppError);
    });
  });

  describe('updateSeat', () => {
    it('应更新工位字段', () => {
      const updated = seatService.updateSeat(1, { status: SeatStatus.OCCUPIED, area: 'C区' });
      expect(updated.status).toBe('occupied');
      expect(updated.area).toBe('C区');
    });

    it('不存在的工位应抛出 404', () => {
      expect(() => {
        seatService.updateSeat(99999, { status: SeatStatus.AVAILABLE });
      }).toThrow(AppError);
    });
  });

  describe('deleteSeat', () => {
    it('应删除工位', () => {
      seatService.deleteSeat(1);
      const result = seatService.listSeats({ page: 1, pageSize: 20 });
      expect(result.total).toBe(9);
    });

    it('不存在的工位应抛出 404', () => {
      expect(() => {
        seatService.deleteSeat(99999);
      }).toThrow(AppError);
    });
  });
});
