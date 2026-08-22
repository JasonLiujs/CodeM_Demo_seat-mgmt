/**
 * 统计 API 集成测试
 * 需求 7080572472：验证 4 个统计端点
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { closeDb, getDb } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import { runSeed } from '../db/seed.js';
import type { Express } from 'express';
import { rmSync } from 'node:fs';

const TEST_DB_PATH = '/tmp/test-stats-api.db';

let app: Express;

beforeEach(() => {
  closeDb();
  rmSync(TEST_DB_PATH, { force: true });
  process.env.DB_PATH = TEST_DB_PATH;
  runMigrations();
  runSeed();
  // 给部分员工分配工位，制造 occupied 状态
  const db = getDb();
  db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('occupied', 1);
  db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('occupied', 2);
  db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('reserved', 3);
  db.prepare('UPDATE employees SET seat_id = ? WHERE id = ?').run(1, 1);
  db.prepare('UPDATE employees SET seat_id = ? WHERE id = ?').run(2, 2);
  app = createApp();
});

afterEach(() => {
  closeDb();
});

describe('GET /api/stats/overview', () => {
  it('应返回正确的统计概览字段和数值', async () => {
    const res = await request(app).get('/api/stats/overview');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    // 10 个工位：5 available + 2 occupied + 1 reserved + 2 maintenance(seed 中 B-005 改为 available)
    // seed 中 B-005 为 maintenance，其余 available；上面把 1、2 改 occupied，3 改 reserved
    expect(data.totalSeats).toBe(10);
    expect(data.occupiedSeats).toBe(2);
    expect(data.reservedSeats).toBe(1);
    expect(data.availableSeats).toBe(6); // 10 - 2 - 1 - 1(maintenance)
    expect(data.maintenanceSeats).toBe(1);
    expect(data.totalEmployees).toBe(8);
    expect(data.assignedEmployees).toBe(2);
    expect(data.unassignedEmployees).toBe(6);
  });
});

describe('GET /api/stats/by-area', () => {
  it('应按区域正确分组统计', async () => {
    const res = await request(app).get('/api/stats/by-area');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);

    const areaA = res.body.data.find((a: { area: string }) => a.area === 'A区');
    expect(areaA).toBeDefined();
    expect(areaA.total).toBe(5);
    expect(areaA.occupied).toBe(2);
    expect(areaA.reserved).toBe(1);
    expect(areaA.available).toBe(2);

    const areaB = res.body.data.find((a: { area: string }) => a.area === 'B区');
    expect(areaB).toBeDefined();
    expect(areaB.total).toBe(5);
    expect(areaB.maintenance).toBe(1);
    expect(areaB.available).toBe(4);
  });
});

describe('GET /api/stats/trends', () => {
  it('无历史数据时应返回当日实时快照兜底', async () => {
    const res = await request(app).get('/api/stats/trends?days=30');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const point = res.body.data[0];
    expect(point).toHaveProperty('date');
    expect(point).toHaveProperty('assigned');
    expect(point).toHaveProperty('booked');
    expect(point.assigned).toBe(2); // occupied seats
    expect(point.booked).toBe(1); // reserved seats
  });

  it('有历史数据时应返回历史趋势', async () => {
    // 先写入 stats_daily 历史数据
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO stats_daily (date, total_seats, occupied_seats, available_seats, reserved_seats, utilization_rate)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('2024-01-01', 10, 5, 5, 0, 50);
    db.prepare(`
      INSERT OR REPLACE INTO stats_daily (date, total_seats, occupied_seats, available_seats, reserved_seats, utilization_rate)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('2024-01-02', 10, 6, 4, 0, 60);

    const res = await request(app).get('/api/stats/trends?days=365');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    const first = res.body.data.find((p: { date: string }) => p.date === '2024-01-01');
    expect(first).toBeDefined();
    expect(first.assigned).toBe(5);
    expect(first.booked).toBe(0);
  });

  it('days 参数非法时应返回 400', async () => {
    const res = await request(app).get('/api/stats/trends?days=abc');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/stats/departments', () => {
  it('应返回部门工位分布', async () => {
    const res = await request(app).get('/api/stats/departments');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(4); // 4 个部门

    const dept = res.body.data[0];
    expect(dept).toHaveProperty('departmentId');
    expect(dept).toHaveProperty('departmentName');
    expect(dept).toHaveProperty('totalEmployees');
    expect(dept).toHaveProperty('assignedEmployees');

    // 研发部有 3 个员工（EMP001, EMP002, EMP008），其中 EMP001 和 EMP002 已分配
    const research = res.body.data.find(
      (d: { departmentName: string }) => d.departmentName === '研发部',
    );
    expect(research).toBeDefined();
    expect(research.totalEmployees).toBe(3);
    expect(research.assignedEmployees).toBe(2);
  });
});
