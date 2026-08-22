/**
 * 临时工位预约 API 集成测试
 * 需求 7079562886：验证预约创建/列表/取消/冲突检测/过期自动失效
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { closeDb } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import { runSeed } from '../db/seed.js';
import { bookingService } from '../services/booking-service.js';
import { rmSync } from 'node:fs';

const TEST_DB_PATH = '/tmp/test-bookings-api.db';

let app: Express;

beforeEach(() => {
  closeDb();
  rmSync(TEST_DB_PATH, { force: true });
  process.env.DB_PATH = TEST_DB_PATH;
  runMigrations();
  runSeed();
  app = createApp();
});

afterEach(() => {
  closeDb();
});

/** 生成未来 ISO 时间字符串 */
function futureISO(hoursFromNow: number, durationHours: number = 2): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getTime() + hoursFromNow * 3600_000);
  const end = new Date(start.getTime() + durationHours * 3600_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

describe('POST /api/bookings — 创建预约', () => {
  it('应成功创建预约，返回 201', async () => {
    const { start, end } = futureISO(1);
    const res = await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 1, startTime: start, endTime: end });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.seatId).toBe(1);
    expect(res.body.data.employeeId).toBe(1);
    expect(res.body.data.status).toBe('confirmed');
    expect(res.body.data.seatCode).toBe('A-001');
    expect(res.body.data.employeeName).toBeTruthy();
  });

  it('创建预约后工位状态应变 reserved', async () => {
    const { start, end } = futureISO(1);
    await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 1, startTime: start, endTime: end });

    const res = await request(app).get('/api/seats?pageSize=100');
    const seat = res.body.data.data.find((s: { id: number }) => s.id === 1);
    expect(seat.status).toBe('reserved');
  });

  it('同一工位同一时段应冲突，返回 409', async () => {
    const { start, end } = futureISO(1);
    // 第一次预约成功
    await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 1, startTime: start, endTime: end });

    // 第二次同一工位同一时段应冲突
    const res = await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 2, startTime: start, endTime: end });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BOOKING_CONFLICT');
  });

  it('不重叠的时段可以预约同一工位', async () => {
    const t1 = futureISO(1, 1); // 1h 后开始，持续 1h
    const t2 = futureISO(3, 1); // 3h 后开始，持续 1h

    const res1 = await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 1, startTime: t1.start, endTime: t1.end });
    expect(res1.status).toBe(201);

    const res2 = await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 2, startTime: t2.start, endTime: t2.end });
    expect(res2.status).toBe(201);
  });

  it('维护中的工位不可预约，返回 409', async () => {
    // seatId=10 是 maintenance 状态（seed 数据）
    const { start, end } = futureISO(1);
    const res = await request(app)
      .post('/api/bookings')
      .send({ seatId: 10, employeeId: 1, startTime: start, endTime: end });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SEAT_MAINTENANCE');
  });

  it('不存在的工位应返回 404', async () => {
    const { start, end } = futureISO(1);
    const res = await request(app)
      .post('/api/bookings')
      .send({ seatId: 999, employeeId: 1, startTime: start, endTime: end });
    expect(res.status).toBe(404);
  });

  it('不存在的员工应返回 404', async () => {
    const { start, end } = futureISO(1);
    const res = await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 999, startTime: start, endTime: end });
    expect(res.status).toBe(404);
  });

  it('结束时间早于开始时间应返回 400', async () => {
    const now = new Date();
    const start = new Date(now.getTime() + 2 * 3600_000);
    const end = new Date(now.getTime() + 1 * 3600_000);
    const res = await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 1, startTime: start.toISOString(), endTime: end.toISOString() });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/bookings — 预约列表', () => {
  it('应返回分页预约列表', async () => {
    const { start, end } = futureISO(1);
    await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 1, startTime: start, endTime: end });

    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].seatCode).toBe('A-001');
  });

  it('应支持按 seatId 筛选', async () => {
    const { start, end } = futureISO(1);
    await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 1, startTime: start, endTime: end });
    await request(app)
      .post('/api/bookings')
      .send({ seatId: 2, employeeId: 2, startTime: start, endTime: end });

    const res = await request(app).get('/api/bookings?seatId=1');
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].seatId).toBe(1);
  });

  it('应支持按 status 筛选', async () => {
    const { start, end } = futureISO(1);
    await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 1, startTime: start, endTime: end });

    const res = await request(app).get('/api/bookings?status=confirmed');
    expect(res.body.data.total).toBe(1);

    const res2 = await request(app).get('/api/bookings?status=cancelled');
    expect(res2.body.data.total).toBe(0);
  });
});

describe('DELETE /api/bookings/:id — 取消预约', () => {
  it('应成功取消预约，返回 204', async () => {
    const { start, end } = futureISO(1);
    const createRes = await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 1, startTime: start, endTime: end });
    const bookingId = createRes.body.data.id;

    const res = await request(app).delete(`/api/bookings/${bookingId}`);
    expect(res.status).toBe(204);

    // 验证预约状态为 cancelled
    const listRes = await request(app).get('/api/bookings');
    expect(listRes.body.data.data[0].status).toBe('cancelled');
  });

  it('取消预约后工位状态应恢复 available', async () => {
    const { start, end } = futureISO(1);
    const createRes = await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 1, startTime: start, endTime: end });

    await request(app).delete(`/api/bookings/${createRes.body.data.id}`);

    const seatRes = await request(app).get('/api/seats?pageSize=100');
    const seat = seatRes.body.data.data.find((s: { id: number }) => s.id === 1);
    expect(seat.status).toBe('available');
  });

  it('取消不存在的预约应返回 404', async () => {
    const res = await request(app).delete('/api/bookings/999');
    expect(res.status).toBe(404);
  });

  it('重复取消应返回 409', async () => {
    const { start, end } = futureISO(1);
    const createRes = await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 1, startTime: start, endTime: end });

    await request(app).delete(`/api/bookings/${createRes.body.data.id}`);
    const res = await request(app).delete(`/api/bookings/${createRes.body.data.id}`);
    expect(res.status).toBe(409);
  });
});

describe('expireBookings — 到期预约自动失效', () => {
  it('应将到期 active 预约标记为 expired', async () => {
    // 插入一条已经过期的预约（end_time 在过去）
    const db = (await import('../db/connection.js')).getDb();
    const pastStart = new Date(Date.now() - 3 * 3600_000).toISOString();
    const pastEnd = new Date(Date.now() - 1 * 3600_000).toISOString();
    db.prepare(`
      INSERT INTO bookings (seat_id, employee_id, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(1, 1, pastStart, pastEnd, 'confirmed');

    const expiredCount = bookingService.expireBookings();
    expect(expiredCount).toBe(1);

    // 验证状态已变为 expired
    const list = bookingService.listBookings({ page: 1, pageSize: 10 });
    expect(list.data[0].status).toBe('expired');
  });

  it('到期后工位状态应恢复 available', async () => {
    const db = (await import('../db/connection.js')).getDb();
    const pastStart = new Date(Date.now() - 3 * 3600_000).toISOString();
    const pastEnd = new Date(Date.now() - 1 * 3600_000).toISOString();
    db.prepare(`
      INSERT INTO bookings (seat_id, employee_id, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(1, 1, pastStart, pastEnd, 'confirmed');
    // 手动将工位设为 reserved
    db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('reserved', 1);

    bookingService.expireBookings();

    const seat = db.prepare('SELECT status FROM seats WHERE id = ?').get(1) as { status: string };
    expect(seat.status).toBe('available');
  });

  it('未到期的预约不受影响', async () => {
    const { start, end } = futureISO(1);
    await request(app)
      .post('/api/bookings')
      .send({ seatId: 1, employeeId: 1, startTime: start, endTime: end });

    const expiredCount = bookingService.expireBookings();
    expect(expiredCount).toBe(0);
  });
});
