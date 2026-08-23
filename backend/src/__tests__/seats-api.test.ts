/**
 * 工位 API 集成测试
 * 需求 7080518042：验证 REST API 端点
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { closeDb } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import { runSeed } from '../db/seed.js';
import type { Express } from 'express';
import { rmSync } from 'node:fs';

const TEST_DB_PATH = '/tmp/test-seats-api.db';

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

describe('GET /api/seats', () => {
  it('应返回分页工位列表', async () => {
    const res = await request(app).get('/api/seats?page=1&pageSize=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(5);
    expect(res.body.data.total).toBe(10);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.totalPages).toBe(2);
  });

  it('应支持按区域筛选', async () => {
    const res = await request(app).get('/api/seats?area=A区');
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(5);
    expect(res.body.data.data.every((s: { area: string }) => s.area === 'A区')).toBe(true);
  });

  it('应支持按状态筛选', async () => {
    const res = await request(app).get('/api/seats?status=maintenance');
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].status).toBe('maintenance');
  });
});

describe('POST /api/seats', () => {
  it('应创建新工位返回 201', async () => {
    const res = await request(app).post('/api/seats').send({
      code: 'C-001',
      area: 'C区',
      type: 'standard',
      x: 100,
      y: 200,
      w: 60,
      h: 60,
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('C-001');
    expect(res.body.data.area).toBe('C区');
    expect(res.body.data.status).toBe('available');
  });

  it('缺少 code 应返回 400', async () => {
    const res = await request(app).post('/api/seats').send({ area: 'C区', type: 'standard' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('重复 code 应返回 409', async () => {
    const res = await request(app).post('/api/seats').send({
      code: 'A-001',
      area: 'A区',
      type: 'standard',
      x: 0,
      y: 0,
      w: 60,
      h: 60,
    });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/seats/:id', () => {
  it('应更新工位返回 200', async () => {
    const res = await request(app).put('/api/seats/1').send({ status: 'occupied', area: 'C区' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('occupied');
    expect(res.body.data.area).toBe('C区');
  });

  it('不存在的工位应返回 404', async () => {
    const res = await request(app).put('/api/seats/99999').send({ status: 'available' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/seats/:id', () => {
  it('应删除工位返回 204', async () => {
    const res = await request(app).delete('/api/seats/1');
    expect(res.status).toBe(204);
  });

  it('不存在的工位应返回 404', async () => {
    const res = await request(app).delete('/api/seats/99999');
    expect(res.status).toBe(404);
  });
});
