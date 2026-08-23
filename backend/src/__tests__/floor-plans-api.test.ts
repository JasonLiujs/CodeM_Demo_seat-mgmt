/**
 * 平面图 API 集成测试
 * 需求 7080518042：验证平面图列表与上传
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { closeDb } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import { runSeed } from '../db/seed.js';
import type { Express } from 'express';
import { rmSync } from 'node:fs';

const TEST_DB_PATH = '/tmp/test-floor-plans-api.db';

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

describe('GET /api/floor-plans', () => {
  it('应返回平面图列表', async () => {
    const res = await request(app).get('/api/floor-plans');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe('3楼-A区');
    expect(res.body.data[1].name).toBe('3楼-B区');
  });
});

describe('POST /api/floor-plans', () => {
  it('应上传底图并返回 URL', async () => {
    const res = await request(app)
      .post('/api/floor-plans')
      .attach('image', Buffer.from('fake-png-data'), 'test.png')
      .field('name', '测试平面图')
      .field('width', '800')
      .field('height', '600');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('测试平面图');
    expect(res.body.data.imageUrl).toMatch(/^\/uploads\/.+\.png$/);
    expect(res.body.data.width).toBe(800);
    expect(res.body.data.height).toBe(600);
  });

  it('缺少文件应返回 400', async () => {
    const res = await request(app).post('/api/floor-plans').field('name', '测试');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('缺少 name 应返回 400', async () => {
    const res = await request(app)
      .post('/api/floor-plans')
      .attach('image', Buffer.from('fake-png-data'), 'test.png');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
