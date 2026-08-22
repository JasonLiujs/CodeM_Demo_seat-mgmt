/**
 * 数据库迁移脚本
 * 创建所有业务表结构
 * 使用 IF NOT EXISTS 保证增量执行、可向后兼容
 */

import { getDb, closeDb } from './connection.js';

/**
 * 执行所有 migration
 * 按依赖顺序创建表：先建无外键依赖的表，再建有依赖的表
 */
export function runMigrations(): void {
  const db = getDb();
  // 部门表（无外键依赖）
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 楼层平面图表（无外键依赖）
  db.exec(`
    CREATE TABLE IF NOT EXISTS floor_plans (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      image_url   TEXT NOT NULL DEFAULT '',
      width       INTEGER NOT NULL DEFAULT 1920,
      height      INTEGER NOT NULL DEFAULT 1080,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 工位表（外键：floor_plans）
  db.exec(`
    CREATE TABLE IF NOT EXISTS seats (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      code           TEXT NOT NULL UNIQUE,
      area           TEXT NOT NULL DEFAULT '',
      type           TEXT NOT NULL DEFAULT 'standard',
      x              REAL NOT NULL DEFAULT 0,
      y              REAL NOT NULL DEFAULT 0,
      w              REAL NOT NULL DEFAULT 60,
      h              REAL NOT NULL DEFAULT 60,
      floor_plan_id  INTEGER,
      status         TEXT NOT NULL DEFAULT 'available',
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id) ON DELETE SET NULL
    );
  `);

  // 员工表（外键：departments, seats）
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_no         TEXT NOT NULL UNIQUE,
      name           TEXT NOT NULL,
      department_id  INTEGER,
      seat_id        INTEGER,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
      FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE SET NULL
    );
  `);

  // 分配记录表（外键：seats, employees）
  db.exec(`
    CREATE TABLE IF NOT EXISTS assignments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      seat_id      INTEGER NOT NULL,
      employee_id  INTEGER NOT NULL,
      assigned_at  TEXT NOT NULL DEFAULT (datetime('now')),
      assigned_by  TEXT NOT NULL DEFAULT '',
      type         TEXT NOT NULL DEFAULT 'fixed',
      status       TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  // 预订表（外键：seats, employees）
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      seat_id      INTEGER NOT NULL,
      employee_id  INTEGER NOT NULL,
      start_time   TEXT NOT NULL,
      end_time     TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  // 变更日志表（外键：seats, employees — 可为 NULL）
  db.exec(`
    CREATE TABLE IF NOT EXISTS change_logs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      action       TEXT NOT NULL,
      seat_id      INTEGER,
      employee_id  INTEGER,
      old_seat_id  INTEGER,
      new_seat_id  INTEGER,
      operator     TEXT NOT NULL DEFAULT '',
      reason       TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE SET NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
    );
  `);

  // 每日统计快照表（定时任务每天 23:59 写入当日利用率）
  db.exec(`
    CREATE TABLE IF NOT EXISTS stats_daily (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    date             TEXT NOT NULL UNIQUE,
    total_seats      INTEGER NOT NULL DEFAULT 0,
    occupied_seats   INTEGER NOT NULL DEFAULT 0,
    available_seats  INTEGER NOT NULL DEFAULT 0,
    reserved_seats   INTEGER NOT NULL DEFAULT 0,
    utilization_rate REAL NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    `);

    // 创建索引以提升查询性能
    db.exec(`
  CREATE INDEX IF NOT EXISTS idx_seats_area        ON seats(area);
    CREATE INDEX IF NOT EXISTS idx_seats_status       ON seats(status);
    CREATE INDEX IF NOT EXISTS idx_seats_floor_plan   ON seats(floor_plan_id);
    CREATE INDEX IF NOT EXISTS idx_employees_dept     ON employees(department_id);
    CREATE INDEX IF NOT EXISTS idx_employees_seat     ON employees(seat_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_seat   ON assignments(seat_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_emp    ON assignments(employee_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_seat      ON bookings(seat_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_emp       ON bookings(employee_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_change_logs_seat   ON change_logs(seat_id);
    CREATE INDEX IF NOT EXISTS idx_change_logs_emp    ON change_logs(employee_id);
    CREATE INDEX IF NOT EXISTS idx_change_logs_action ON change_logs(action);
    CREATE INDEX IF NOT EXISTS idx_stats_daily_date   ON stats_daily(date);
  `);

  console.log('[migration] 所有表和索引已创建');
}

// 直接运行此脚本时执行 migration
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  try {
    runMigrations();
    closeDb();
    process.exit(0);
  } catch (err) {
    console.error('[migration] 失败:', err);
    process.exit(1);
  }
}
