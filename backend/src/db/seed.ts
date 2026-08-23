/**
 * 种子数据脚本
 * 插入演示用的初始数据：部门、平面图、工位、员工
 */

import { getDb, closeDb } from './connection.js';
import { runMigrations } from './migrate.js';

/**
 * 执行种子数据插入
 * 使用 INSERT OR IGNORE 保证可重复执行（依赖 UNIQUE 约束去重）
 */
export function runSeed(): void {
  // 先确保表结构存在
  runMigrations();

  const db = getDb();

  // --- 部门 ---
  const insertDept = db.prepare('INSERT OR IGNORE INTO departments (id, name) VALUES (?, ?)');
  insertDept.run(1, '研发部');
  insertDept.run(2, '产品部');
  insertDept.run(3, '设计部');
  insertDept.run(4, '市场部');

  // --- 楼层平面图 ---
  const insertPlan = db.prepare(
    'INSERT OR IGNORE INTO floor_plans (id, name, image_url, width, height) VALUES (?, ?, ?, ?, ?)',
  );
  insertPlan.run(1, '3楼-A区', '', 1920, 1080);
  insertPlan.run(2, '3楼-B区', '', 1920, 1080);

  // --- 工位 ---
  const insertSeat = db.prepare(`
    INSERT OR IGNORE INTO seats (id, code, area, type, x, y, w, h, floor_plan_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seatData: Array<
    [number, string, string, string, number, number, number, number, number, string]
  > = [
    [1, 'A-001', 'A区', 'standard', 100, 100, 60, 60, 1, 'available'],
    [2, 'A-002', 'A区', 'standard', 200, 100, 60, 60, 1, 'available'],
    [3, 'A-003', 'A区', 'standard', 300, 100, 60, 60, 1, 'available'],
    [4, 'A-004', 'A区', 'standard', 400, 100, 60, 60, 1, 'available'],
    [5, 'A-005', 'A区', 'standing', 500, 100, 60, 60, 1, 'available'],
    [6, 'B-001', 'B区', 'standard', 100, 300, 60, 60, 2, 'available'],
    [7, 'B-002', 'B区', 'standard', 200, 300, 60, 60, 2, 'available'],
    [8, 'B-003', 'B区', 'standard', 300, 300, 60, 60, 2, 'available'],
    [9, 'B-004', 'B区', 'private', 400, 300, 80, 80, 2, 'available'],
    [10, 'B-005', 'B区', 'meeting', 500, 300, 120, 80, 2, 'maintenance'],
  ];
  for (const row of seatData) {
    insertSeat.run(...row);
  }

  // --- 员工 ---
  const insertEmp = db.prepare(`
    INSERT OR IGNORE INTO employees (id, emp_no, name, department_id, seat_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const empData: Array<[number, string, string, number | null, number | null]> = [
    [1, 'EMP001', '张伟', 1, null],
    [2, 'EMP002', '李娜', 1, null],
    [3, 'EMP003', '王芳', 2, null],
    [4, 'EMP004', '刘洋', 2, null],
    [5, 'EMP005', '陈静', 3, null],
    [6, 'EMP006', '杨光', 3, null],
    [7, 'EMP007', '赵敏', 4, null],
    [8, 'EMP008', '孙磊', 1, null],
  ];
  for (const row of empData) {
    insertEmp.run(...row);
  }

  console.log('[seed] 种子数据已插入');
}

// 直接运行此脚本时执行 seed
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  try {
    runSeed();
    closeDb();
    process.exit(0);
  } catch (err) {
    console.error('[seed] 失败:', err);
    process.exit(1);
  }
}
