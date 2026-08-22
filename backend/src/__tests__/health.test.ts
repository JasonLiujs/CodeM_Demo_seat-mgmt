/**
 * 健康检查端点测试
 * 验证 /healthz 和 /api/health 端点
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { runMigrations } from '../db/migrate.js';
import { getDb, closeDb } from '../db/connection.js';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import type { Express } from 'express';

// 使用临时数据库
const TEST_DB = join(import.meta.dirname, '..', 'data', 'test-health.db');

let app: Express;

beforeAll(() => {
  // 清理旧测试数据库
  rmSync(TEST_DB, { force: true });
  rmSync(`${TEST_DB}-wal`, { force: true });
  rmSync(`${TEST_DB}-shm`, { force: true });

  // 设置测试数据库路径（在 getDb() 首次调用前设置，确保惰性初始化读到正确值）
  process.env.DB_PATH = TEST_DB;
  runMigrations();
  app = createApp();
});

afterAll(() => {
  closeDb();
  rmSync(TEST_DB, { force: true });
  rmSync(`${TEST_DB}-wal`, { force: true });
  rmSync(`${TEST_DB}-shm`, { force: true });
});

describe('GET /healthz', () => {
  it('应返回 200 和 {"status":"ok"}', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/health', () => {
  it('应返回 200 和服务状态', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeTruthy();
    expect(res.body.services).toBeDefined();
    expect(res.body.services.database.status).toBe('ok');
  });

  it('数据库服务应处于连接状态', async () => {
    // 验证数据库确实可用
    const result = getDb().prepare('SELECT 1 as value').get() as { value: number };
    expect(result.value).toBe(1);
  });
});
