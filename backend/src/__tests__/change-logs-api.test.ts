/**
 * 变更日志 API 集成测试
 * 需求 7079581339：验证变更历史查询与筛选
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { closeDb } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import { runSeed } from '../db/seed.js';
import { rmSync } from 'node:fs';

const TEST_DB_PATH = '/tmp/test-change-logs-api.db';

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

describe('GET /api/change-logs — 变更历史查询', () => {
  it('无操作时应返回空列表', async () => {
    const res = await request(app).get('/api/change-logs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('分配工位后应记录 assign 日志', async () => {
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });

    const res = await request(app).get('/api/change-logs');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    const assignLog = res.body.data.data.find(
      (log: { action: string }) => log.action === 'assign',
    );
    expect(assignLog).toBeDefined();
    expect(assignLog.seatId).toBe(1);
    expect(assignLog.employeeId).toBe(1);
    expect(assignLog.seatCode).toBe('A-001');
    expect(assignLog.employeeName).toBe('张伟');
  });

  it('取消分配后应记录 unassign 日志', async () => {
    const assignRes = await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });
    await request(app).delete(`/api/assignments/${assignRes.body.data.id}`);

    const res = await request(app).get('/api/change-logs');
    const unassignLog = res.body.data.data.find(
      (log: { action: string }) => log.action === 'unassign',
    );
    expect(unassignLog).toBeDefined();
    expect(unassignLog.oldSeatId).toBe(1);
  });

  it('转移工位后应记录 transfer 日志', async () => {
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });
    await request(app)
      .post('/api/assignments/transfer')
      .send({ employeeId: 1, newSeatId: 2, operator: 'admin' });

    const res = await request(app).get('/api/change-logs');
    const transferLog = res.body.data.data.find(
      (log: { action: string }) => log.action === 'transfer',
    );
    expect(transferLog).toBeDefined();
    expect(transferLog.oldSeatId).toBe(1);
    expect(transferLog.newSeatId).toBe(2);
    expect(transferLog.oldSeatCode).toBe('A-001');
    expect(transferLog.newSeatCode).toBe('A-002');
  });

  it('批量分配后应记录 batch_assign 日志', async () => {
    await request(app)
      .post('/api/assignments/batch')
      .send({
        pairs: [
          { seatId: 1, employeeId: 1 },
          { seatId: 2, employeeId: 2 },
        ],
        assignedBy: 'admin',
      });

    const res = await request(app).get('/api/change-logs');
    const batchLog = res.body.data.data.find(
      (log: { action: string }) => log.action === 'batch_assign',
    );
    expect(batchLog).toBeDefined();
  });

  it('应支持按 action 筛选', async () => {
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 2, employeeId: 2, assignedBy: 'admin' });

    const res = await request(app).get('/api/change-logs?action=assign');
    expect(res.status).toBe(200);
    expect(res.body.data.data.every((log: { action: string }) => log.action === 'assign')).toBe(true);
  });

  it('应支持按 departmentId 筛选', async () => {
    // 员工1 属于研发部 (dept_id=1)
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });
    // 员工3 属于产品部 (dept_id=2)
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 2, employeeId: 3, assignedBy: 'admin' });

    const res = await request(app).get('/api/change-logs?departmentId=1');
    expect(res.status).toBe(200);
    // 所有日志的员工都应属于研发部
    expect(
      res.body.data.data.every(
        (log: { employeeDepartmentId: number | null }) =>
          log.employeeDepartmentId === 1,
      ),
    ).toBe(true);
  });

  it('应支持按 employeeId 筛选', async () => {
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 2, employeeId: 2, assignedBy: 'admin' });

    const res = await request(app).get('/api/change-logs?employeeId=1');
    expect(res.status).toBe(200);
    expect(
      res.body.data.data.every(
        (log: { employeeId: number | null }) => log.employeeId === 1,
      ),
    ).toBe(true);
  });

  it('应支持分页', async () => {
    // 产生多条日志
    for (let i = 1; i <= 5; i++) {
      await request(app)
        .post('/api/assignments')
        .send({ seatId: i, employeeId: i, assignedBy: 'admin' });
    }

    const res = await request(app).get('/api/change-logs?page=1&pageSize=3');
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(3);
    expect(res.body.data.total).toBeGreaterThanOrEqual(5);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(3);
    expect(res.body.data.totalPages).toBeGreaterThanOrEqual(2);
  });

  it('应按时间倒序返回', async () => {
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 2, employeeId: 2, assignedBy: 'admin' });

    const res = await request(app).get('/api/change-logs');
    const data = res.body.data.data;
    // 后创建的日志 ID 更大，应排在前面
    expect(data[0].id).toBeGreaterThan(data[1].id);
  });
});
