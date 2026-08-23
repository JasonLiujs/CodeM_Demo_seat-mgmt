/**
 * 部门 API 集成测试
 * 需求 7080732492：验证部门 CRUD REST API 端点
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { closeDb } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import type { Express } from 'express';
import { rmSync } from 'node:fs';

const TEST_DB_PATH = '/tmp/test-departments-api.db';

let app: Express;

beforeEach(() => {
  closeDb();
  rmSync(TEST_DB_PATH, { force: true });
  process.env.DB_PATH = TEST_DB_PATH;
  runMigrations();
  app = createApp();
});

afterEach(() => {
  closeDb();
});

describe('GET /api/departments', () => {
  it('应返回部门列表', async () => {
    // 先创建部门
    await request(app).post('/api/departments').send({ name: '研发部' });
    await request(app).post('/api/departments').send({ name: '产品部' });

    const res = await request(app).get('/api/departments');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe('研发部');
  });

  it('空数据库时应返回空列表', async () => {
    const res = await request(app).get('/api/departments');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /api/departments/:id', () => {
  it('应返回指定部门', async () => {
    const created = await request(app).post('/api/departments').send({ name: '研发部' });
    const id = created.body.data.id;

    const res = await request(app).get(`/api/departments/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('研发部');
  });

  it('不存在的部门应返回 404', async () => {
    const res = await request(app).get('/api/departments/99999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/departments', () => {
  it('应创建部门返回 201', async () => {
    const res = await request(app).post('/api/departments').send({ name: '研发部' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('研发部');
  });

  it('缺少 name 应返回 400', async () => {
    const res = await request(app).post('/api/departments').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('重复 name 应返回 409', async () => {
    await request(app).post('/api/departments').send({ name: '研发部' });
    const res = await request(app).post('/api/departments').send({ name: '研发部' });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/departments/:id', () => {
  it('应更新部门返回 200', async () => {
    const created = await request(app).post('/api/departments').send({ name: '研发部' });
    const id = created.body.data.id;

    const res = await request(app).put(`/api/departments/${id}`).send({ name: '研发二部' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('研发二部');
  });

  it('不存在的部门应返回 404', async () => {
    const res = await request(app).put('/api/departments/99999').send({ name: 'test' });
    expect(res.status).toBe(404);
  });

  it('更新为已有名称应返回 409', async () => {
    await request(app).post('/api/departments').send({ name: '研发部' });
    const created2 = await request(app).post('/api/departments').send({ name: '产品部' });

    const res = await request(app)
      .put(`/api/departments/${created2.body.data.id}`)
      .send({ name: '研发部' });
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/departments/:id', () => {
  it('应删除部门返回 204', async () => {
    const created = await request(app).post('/api/departments').send({ name: '研发部' });
    const id = created.body.data.id;

    const res = await request(app).delete(`/api/departments/${id}`);
    expect(res.status).toBe(204);

    // 确认已删除
    const getRes = await request(app).get(`/api/departments/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('不存在的部门应返回 404', async () => {
    const res = await request(app).delete('/api/departments/99999');
    expect(res.status).toBe(404);
  });
});
