/**
 * 工位分配 API 集成测试
 * 需求 7079581339：验证分配/取消/变更/批量/搬迁 API
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { closeDb } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import { runSeed } from '../db/seed.js';
import { rmSync } from 'node:fs';

const TEST_DB_PATH = '/tmp/test-assignments-api.db';

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

describe('POST /api/assignments — 分配工位', () => {
  it('应成功分配工位给员工，返回 201', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.seatId).toBe(1);
    expect(res.body.data.employeeId).toBe(1);
    expect(res.body.data.type).toBe('fixed');
    expect(res.body.data.status).toBe('active');
  });

  it('分配后工位状态应变为 occupied', async () => {
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });

    const res = await request(app).get('/api/seats?pageSize=100');
    const seat = res.body.data.data.find((s: { id: number }) => s.id === 1);
    expect(seat.status).toBe('occupied');
  });

  it('分配不存在的工位应返回 404', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .send({ seatId: 99999, employeeId: 1, assignedBy: 'admin' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SEAT_NOT_FOUND');
  });

  it('分配不存在的员工应返回 404', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 99999, assignedBy: 'admin' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EMPLOYEE_NOT_FOUND');
  });

  it('分配已占用的工位应返回 409', async () => {
    // 先分配工位1给员工1
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });

    // 再把工位1分配给员工2 → 应失败
    const res = await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 2, assignedBy: 'admin' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SEAT_NOT_AVAILABLE');
  });

  it('员工已有固定工位时不能重复分配 fixed 工位', async () => {
    // 员工1 分配工位1
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });

    // 员工1 再分配工位2 → 应失败
    const res = await request(app)
      .post('/api/assignments')
      .send({ seatId: 2, employeeId: 1, assignedBy: 'admin' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMPLOYEE_ALREADY_ASSIGNED');
  });

  it('缺少 assignedBy 应返回 400', async () => {
    const res = await request(app).post('/api/assignments').send({ seatId: 1, employeeId: 1 });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/assignments/:id — 取消分配', () => {
  it('应成功取消分配，返回 204', async () => {
    const assignRes = await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });
    const assignmentId = assignRes.body.data.id;

    const res = await request(app).delete(`/api/assignments/${assignmentId}`);
    expect(res.status).toBe(204);
  });

  it('取消分配后工位状态应恢复 available', async () => {
    const assignRes = await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });
    const assignmentId = assignRes.body.data.id;

    await request(app).delete(`/api/assignments/${assignmentId}`);

    const seatRes = await request(app).get('/api/seats?pageSize=100');
    const seat = seatRes.body.data.data.find((s: { id: number }) => s.id === 1);
    expect(seat.status).toBe('available');
  });

  it('取消不存在的分配记录应返回 404', async () => {
    const res = await request(app).delete('/api/assignments/99999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/assignments/transfer — 工位变更', () => {
  it('应成功转移工位，旧工位释放、新工位占用', async () => {
    // 先分配员工1到工位1
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });

    // 转移到工位2
    const res = await request(app)
      .post('/api/assignments/transfer')
      .send({ employeeId: 1, newSeatId: 2, operator: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.data.seatId).toBe(2);
    expect(res.body.data.employeeId).toBe(1);
    expect(res.body.data.status).toBe('active');

    // 验证工位状态
    const seatRes = await request(app).get('/api/seats?pageSize=100');
    const seats = seatRes.body.data.data;
    const seat1 = seats.find((s: { id: number }) => s.id === 1);
    const seat2 = seats.find((s: { id: number }) => s.id === 2);
    expect(seat1.status).toBe('available');
    expect(seat2.status).toBe('occupied');
  });

  it('员工无固定工位时转移应返回 404', async () => {
    const res = await request(app)
      .post('/api/assignments/transfer')
      .send({ employeeId: 1, newSeatId: 2, operator: 'admin' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NO_ACTIVE_ASSIGNMENT');
  });

  it('转移到已占用工位应返回 409', async () => {
    // 员工1 → 工位1
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });
    // 员工2 → 工位2
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 2, employeeId: 2, assignedBy: 'admin' });

    // 员工1 转移到工位2（已被员工2占用）→ 应失败
    const res = await request(app)
      .post('/api/assignments/transfer')
      .send({ employeeId: 1, newSeatId: 2, operator: 'admin' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/assignments/batch — 批量分配', () => {
  it('应成功批量分配多个工位', async () => {
    const res = await request(app)
      .post('/api/assignments/batch')
      .send({
        pairs: [
          { seatId: 1, employeeId: 1 },
          { seatId: 2, employeeId: 2 },
          { seatId: 3, employeeId: 3 },
        ],
        assignedBy: 'admin',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(3);
  });

  it('批量分配后所有工位应为 occupied', async () => {
    await request(app)
      .post('/api/assignments/batch')
      .send({
        pairs: [
          { seatId: 1, employeeId: 1 },
          { seatId: 2, employeeId: 2 },
        ],
        assignedBy: 'admin',
      });

    const seatRes = await request(app).get('/api/seats?pageSize=100');
    const seats = seatRes.body.data.data;
    expect(seats.find((s: { id: number }) => s.id === 1).status).toBe('occupied');
    expect(seats.find((s: { id: number }) => s.id === 2).status).toBe('occupied');
  });

  it('批量分配中工位重复应回滚并返回 409', async () => {
    // pairs 中包含同一个工位两次 → 第二次分配时工位已被占用
    const res = await request(app)
      .post('/api/assignments/batch')
      .send({
        pairs: [
          { seatId: 1, employeeId: 1 },
          { seatId: 1, employeeId: 2 },
        ],
        assignedBy: 'admin',
      });
    expect(res.status).toBe(409);

    // 验证事务回滚：工位1 应仍为 available
    const seatRes = await request(app).get('/api/seats?pageSize=100');
    const seat = seatRes.body.data.data.find((s: { id: number }) => s.id === 1);
    expect(seat.status).toBe('available');
  });

  it('空列表应返回 400', async () => {
    const res = await request(app)
      .post('/api/assignments/batch')
      .send({ pairs: [], assignedBy: 'admin' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/assignments/relocate — 部门搬迁', () => {
  it('应成功搬迁部门所有员工到目标区域', async () => {
    // 研发部 (dept_id=1) 有员工 1, 2, 8
    // 先给员工1和2分配 A区 工位
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 2, employeeId: 2, assignedBy: 'admin' });

    // 搬迁研发部到 B区（有5个空闲工位 6,7,8,9；10是maintenance）
    const res = await request(app)
      .post('/api/assignments/relocate')
      .send({ departmentId: 1, targetArea: 'B区', operator: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('目标区域空闲工位不足应返回 409', async () => {
    // 研发部有3个员工，A区只剩少量空闲工位
    // 先占用 A区 的大部分工位
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 3, assignedBy: 'admin' });
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 2, employeeId: 4, assignedBy: 'admin' });
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 3, employeeId: 5, assignedBy: 'admin' });
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 4, employeeId: 6, assignedBy: 'admin' });

    // 研发部3个员工搬到 A区，但 A区只剩1个空闲工位（A-005）
    const res = await request(app)
      .post('/api/assignments/relocate')
      .send({ departmentId: 1, targetArea: 'A区', operator: 'admin' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_SEATS');
  });

  it('部门无员工应返回 404', async () => {
    const res = await request(app)
      .post('/api/assignments/relocate')
      .send({ departmentId: 999, targetArea: 'B区', operator: 'admin' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/assignments — 查询分配记录', () => {
  it('应返回所有分配记录', async () => {
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });

    const res = await request(app).get('/api/assignments');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('应支持按 seatId 筛选', async () => {
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 1, employeeId: 1, assignedBy: 'admin' });
    await request(app)
      .post('/api/assignments')
      .send({ seatId: 2, employeeId: 2, assignedBy: 'admin' });

    const res = await request(app).get('/api/assignments?seatId=1');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].seatId).toBe(1);
  });
});
