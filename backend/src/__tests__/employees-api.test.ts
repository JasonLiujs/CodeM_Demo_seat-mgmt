/**
 * 员工 API + CSV 导入集成测试
 * 需求 7080732492：验证员工 CRUD + CSV 批量导入 REST API 端点
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { closeDb } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import type { Express } from 'express';
import { rmSync } from 'node:fs';

const TEST_DB_PATH = '/tmp/test-employees-api.db';

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

// ============================================================================
// 员工 CRUD
// ============================================================================

describe('GET /api/employees', () => {
  it('应返回空列表（无数据时）', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('应返回员工列表（含部门名称）', async () => {
    // 创建部门
    const dept = await request(app).post('/api/departments').send({ name: '研发部' });
    const deptId = dept.body.data.id;

    // 创建员工
    await request(app).post('/api/employees').send({
      empNo: 'EMP001',
      name: '张伟',
      departmentId: deptId,
    });

    const res = await request(app).get('/api/employees');
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].empNo).toBe('EMP001');
    expect(res.body.data.data[0].name).toBe('张伟');
    expect(res.body.data.data[0].departmentName).toBe('研发部');
  });

  it('应支持按姓名搜索', async () => {
    await request(app).post('/api/employees').send({ empNo: 'E1', name: '张伟' });
    await request(app).post('/api/employees').send({ empNo: 'E2', name: '张三' });
    await request(app).post('/api/employees').send({ empNo: 'E3', name: '李四' });

    const res = await request(app).get('/api/employees?name=张');
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(2);
    expect(res.body.data.data.every((e: { name: string }) => e.name.includes('张'))).toBe(true);
  });

  it('应支持按部门筛选', async () => {
    const dept1 = await request(app).post('/api/departments').send({ name: '研发部' });
    const dept2 = await request(app).post('/api/departments').send({ name: '产品部' });

    await request(app).post('/api/employees').send({ empNo: 'E1', name: 'A', departmentId: dept1.body.data.id });
    await request(app).post('/api/employees').send({ empNo: 'E2', name: 'B', departmentId: dept2.body.data.id });

    const res = await request(app).get(`/api/employees?departmentId=${dept1.body.data.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].name).toBe('A');
  });

  it('应支持分页', async () => {
    for (let i = 1; i <= 25; i++) {
      await request(app).post('/api/employees').send({ empNo: `E${i}`, name: `员工${i}` });
    }

    const res = await request(app).get('/api/employees?page=1&pageSize=10');
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(10);
    expect(res.body.data.total).toBe(25);
    expect(res.body.data.totalPages).toBe(3);
  });
});

describe('GET /api/employees/:id', () => {
  it('应返回指定员工', async () => {
    const created = await request(app).post('/api/employees').send({ empNo: 'EMP001', name: '张伟' });
    const id = created.body.data.id;

    const res = await request(app).get(`/api/employees/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.empNo).toBe('EMP001');
    expect(res.body.data.name).toBe('张伟');
  });

  it('不存在的员工应返回 404', async () => {
    const res = await request(app).get('/api/employees/99999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/employees', () => {
  it('应创建员工返回 201', async () => {
    const res = await request(app).post('/api/employees').send({
      empNo: 'EMP001',
      name: '张伟',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.empNo).toBe('EMP001');
    expect(res.body.data.name).toBe('张伟');
  });

  it('缺少 empNo 应返回 400', async () => {
    const res = await request(app).post('/api/employees').send({ name: '张伟' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('缺少 name 应返回 400', async () => {
    const res = await request(app).post('/api/employees').send({ empNo: 'E1' });
    expect(res.status).toBe(400);
  });

  it('重复 empNo 应返回 409', async () => {
    await request(app).post('/api/employees').send({ empNo: 'EMP001', name: '张伟' });
    const res = await request(app).post('/api/employees').send({ empNo: 'EMP001', name: '李四' });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/employees/:id', () => {
  it('应更新员工返回 200', async () => {
    const created = await request(app).post('/api/employees').send({ empNo: 'E1', name: '张伟' });
    const id = created.body.data.id;

    const res = await request(app).put(`/api/employees/${id}`).send({ name: '张伟更新' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('张伟更新');
  });

  it('不存在的员工应返回 404', async () => {
    const res = await request(app).put('/api/employees/99999').send({ name: 'test' });
    expect(res.status).toBe(404);
  });

  it('更新为已有工号应返回 409', async () => {
    await request(app).post('/api/employees').send({ empNo: 'E1', name: 'A' });
    const emp2 = await request(app).post('/api/employees').send({ empNo: 'E2', name: 'B' });

    const res = await request(app).put(`/api/employees/${emp2.body.data.id}`).send({ empNo: 'E1' });
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/employees/:id', () => {
  it('应删除员工返回 204', async () => {
    const created = await request(app).post('/api/employees').send({ empNo: 'E1', name: '张伟' });
    const id = created.body.data.id;

    const res = await request(app).delete(`/api/employees/${id}`);
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/employees/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('不存在的员工应返回 404', async () => {
    const res = await request(app).delete('/api/employees/99999');
    expect(res.status).toBe(404);
  });
});

// ============================================================================
// CSV 批量导入
// ============================================================================

describe('POST /api/employees/import', () => {
  it('应成功导入 CSV 并返回 201', async () => {
    const csv = 'emp_no,name,department\nE001,张伟,研发部\nE002,李娜,产品部\nE003,王芳,研发部';
    const res = await request(app)
      .post('/api/employees/import')
      .attach('file', Buffer.from(csv), 'employees.csv');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.inserted).toBe(3);
    expect(res.body.data.skipped).toBe(0);
  });

  it('无表头的 CSV 也能正确导入', async () => {
    const csv = 'E001,张伟,研发部\nE002,李娜,产品部';
    const res = await request(app)
      .post('/api/employees/import')
      .attach('file', Buffer.from(csv), 'employees.csv');

    expect(res.status).toBe(201);
    expect(res.body.data.inserted).toBe(2);
  });

  it('重复工号应跳过', async () => {
    // 先创建一个员工
    await request(app).post('/api/employees').send({ empNo: 'E001', name: '张伟' });

    // 再导入含重复工号的 CSV
    const csv = 'emp_no,name,department\nE001,张伟重复,研发部\nE002,李娜,产品部';
    const res = await request(app)
      .post('/api/employees/import')
      .attach('file', Buffer.from(csv), 'employees.csv');

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.inserted).toBe(1);
    expect(res.body.data.skipped).toBe(1);
  });

  it('应自动创建不存在的部门', async () => {
    const csv = 'emp_no,name,department\nE001,张伟,新部门A\nE002,李娜,新部门B';
    const res = await request(app)
      .post('/api/employees/import')
      .attach('file', Buffer.from(csv), 'employees.csv');

    expect(res.status).toBe(201);
    expect(res.body.data.inserted).toBe(2);

    // 确认部门已创建
    const deptRes = await request(app).get('/api/departments');
    const deptNames = deptRes.body.data.map((d: { name: string }) => d.name);
    expect(deptNames).toContain('新部门A');
    expect(deptNames).toContain('新部门B');
  });

  it('应复用已存在的部门', async () => {
    // 先创建部门
    await request(app).post('/api/departments').send({ name: '研发部' });

    const csv = 'emp_no,name,department\nE001,张伟,研发部';
    const res = await request(app)
      .post('/api/employees/import')
      .attach('file', Buffer.from(csv), 'employees.csv');

    expect(res.status).toBe(201);
    expect(res.body.data.inserted).toBe(1);

    // 确认部门没有重复创建
    const deptRes = await request(app).get('/api/departments');
    const researchDepts = deptRes.body.data.filter((d: { name: string }) => d.name === '研发部');
    expect(researchDepts).toHaveLength(1);
  });

  it('支持带引号的 CSV 字段', async () => {
    const csv = 'emp_no,name,department\nE001,"张,伟","研发部"\nE002,"李\n娜",产品部';
    const res = await request(app)
      .post('/api/employees/import')
      .attach('file', Buffer.from(csv), 'employees.csv');

    expect(res.status).toBe(201);
    expect(res.body.data.inserted).toBe(2);

    // 验证员工列表
    const empRes = await request(app).get('/api/employees');
    const names = empRes.body.data.data.map((e: { name: string }) => e.name);
    expect(names).toContain('张,伟');
    expect(names).toContain('李\n娜');
  });

  it('无部门列时 departmentId 为 null', async () => {
    const csv = 'emp_no,name,department\nE001,张伟,';
    const res = await request(app)
      .post('/api/employees/import')
      .attach('file', Buffer.from(csv), 'employees.csv');

    expect(res.status).toBe(201);

    const empRes = await request(app).get('/api/employees');
    expect(empRes.body.data.data[0].departmentId).toBeNull();
  });

  it('未上传文件应返回 400', async () => {
    const res = await request(app).post('/api/employees/import');
    expect(res.status).toBe(400);
  });

  it('空 CSV 文件应返回错误信息', async () => {
    const res = await request(app)
      .post('/api/employees/import')
      .attach('file', Buffer.from(''), 'empty.csv');

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.errors.length).toBeGreaterThan(0);
  });

  it('多次导入同一 CSV 应幂等（第二次全部跳过）', async () => {
    const csv = 'emp_no,name,department\nE001,张伟,研发部\nE002,李娜,产品部';

    // 第一次导入
    const res1 = await request(app)
      .post('/api/employees/import')
      .attach('file', Buffer.from(csv), 'employees.csv');
    expect(res1.body.data.inserted).toBe(2);
    expect(res1.body.data.skipped).toBe(0);

    // 第二次导入同一 CSV
    const res2 = await request(app)
      .post('/api/employees/import')
      .attach('file', Buffer.from(csv), 'employees.csv');
    expect(res2.body.data.inserted).toBe(0);
    expect(res2.body.data.skipped).toBe(2);
  });
});
