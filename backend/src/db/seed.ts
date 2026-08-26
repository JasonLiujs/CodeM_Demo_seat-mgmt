/**
 * 种子数据脚本
 *
 * 两个用途分离：
 * - runSeed()      单元测试基线：小规模固定 id 数据（10 工位/2 平面图/4 部门/8 员工），
 *                  对齐各测试文件里写死的 id 与数量断言。测试在 beforeEach 调用。
 * - runDemoSeed()  生产演示数据：先跑 runSeed()，再追加演示工位（坐标对齐 SVG 底图）、
 *                  更多员工、分配/预约/维护记录、变更日志、7 天统计快照。
 *                  生产环境灌数据用（npm run seed）。
 *
 * 均用 INSERT OR IGNORE / 显式 id，保证可重复执行。
 */

import { getDb, closeDb } from './connection.js';
import { runMigrations } from './migrate.js';
import { FLOOR_PLAN_WIDTH, FLOOR_PLAN_HEIGHT } from './floor-plan-svg.js';
import {
  DEFAULT_FLOOR_PLAN_URL,
  ensureDefaultFloorPlanImage,
} from '../services/floor-plan-image-service.js';

/**
 * runSeed — 单元测试基线数据（与历史 seed 完全一致，勿改 id/数量，否则测试断言失效）
 */
export function runSeed(): void {
  runMigrations();
  const db = getDb();

  const insertDept = db.prepare('INSERT OR IGNORE INTO departments (id, name) VALUES (?, ?)');
  insertDept.run(1, '研发部');
  insertDept.run(2, '产品部');
  insertDept.run(3, '设计部');
  insertDept.run(4, '市场部');

  const insertPlan = db.prepare(
    'INSERT OR IGNORE INTO floor_plans (id, name, image_url, width, height) VALUES (?, ?, ?, ?, ?)',
  );
  insertPlan.run(1, '3楼-A区', '', 1920, 1080);
  insertPlan.run(2, '3楼-B区', '', 1920, 1080);

  const insertSeat = db.prepare(`
    INSERT OR IGNORE INTO seats (id, code, area, type, x, y, w, h, floor_plan_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seatData: Array<[number, string, string, string, number, number, number, number, number, string]> = [
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
  for (const row of seatData) insertSeat.run(...row);

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
  for (const row of empData) insertEmp.run(...row);

  console.log('[seed] 基线种子数据已插入');
}

/** 演示工位（坐标对齐 SVG 底图，id 从 100 起避开基线） */
function buildDemoSeats(): Array<[number, string, string, string, number, number, number, number, number, string]> {
  const seats: Array<[number, string, string, string, number, number, number, number, number, string]> = [];
  const cols = 5, rows = 4, cellW = 96, cellH = 85, seatW = 60, seatH = 56;
  const offX = (cellW - seatW) / 2, offY = (cellH - seatH) / 2;
  const areas = [
    { prefix: 'A', area: 'A区', baseX: 60, baseY: 90 },
    { prefix: 'B', area: 'B区', baseX: 660, baseY: 90 },
  ];
  let id = 100;
  for (const a of areas) {
    let seq = 6; // A-006 / B-006 起（1~5 为基线）
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        seats.push([
          id++,
          `${a.prefix}-${String(seq).padStart(3, '0')}`,
          a.area, 'standard',
          a.baseX + c * cellW + offX, a.baseY + r * cellH + offY, seatW, seatH, 1, 'available',
        ]);
        seq++;
      }
    }
  }
  // 会议室 M-101（底图房间 x=870~1160, y=570~750）
  const meeting: Array<[number, number, number]> = [[950, 600, 40], [1000, 600, 40], [1050, 600, 40], [950, 700, 40], [1000, 700, 40], [1050, 700, 40]];
  meeting.forEach(([x, y, s], i) => {
    seats.push([id++, `M-101-${i + 1}`, '会议室', 'meeting', x, y, s, s, 1, 'available']);
  });
  // 经理室 P-001/P-002
  seats.push([id++, 'P-001', '经理室', 'private', 668, 630, 56, 60, 1, 'available']);
  seats.push([id++, 'P-002', '经理室', 'private', 773, 630, 56, 60, 1, 'available']);
  return seats;
}

/**
 * runDemoSeed — 生产演示数据（基线之上追加演示工位/员工/分配/预约/维护/统计 + SVG 底图）
 */
export function runDemoSeed(): void {
  runSeed(); // 先保证基线数据存在
  ensureDefaultFloorPlanImage();

  const db = getDb();

  // 补 2 个演示部门（基线已有 1~4）
  const insertDept = db.prepare('INSERT OR IGNORE INTO departments (id, name) VALUES (?, ?)');
  insertDept.run(5, '运营部');
  insertDept.run(6, '人事行政部');

  // 平面图 id=1 指向 SVG 底图（基线 id=1 是空 image_url，这里更新指向底图）
  db.prepare('UPDATE floor_plans SET image_url = ?, name = ?, width = ?, height = ? WHERE id = 1')
    .run(DEFAULT_FLOOR_PLAN_URL, '3楼 · 办公区', FLOOR_PLAN_WIDTH, FLOOR_PLAN_HEIGHT);

  // 演示工位（id 100+）
  const insertSeat = db.prepare(`
    INSERT OR IGNORE INTO seats (id, code, area, type, x, y, w, h, floor_plan_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of buildDemoSeats()) insertSeat.run(...row);

  const seatIdByCode = new Map<string, number>();
  for (const r of db.prepare('SELECT id, code FROM seats').all() as Array<{ id: number; code: string }>) {
    seatIdByCode.set(r.code, r.id);
  }

  // 演示员工（id 从 100 起，避开基线 1~8；EMP001/EMP002 等基线员工保持无分配）
  const insertEmp = db.prepare(`
    INSERT OR IGNORE INTO employees (id, emp_no, name, department_id, seat_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const demoEmps: Array<[number, string, string, number, string | null]> = [
    [100, 'EMP100', '周杰', 2, 'A-006'],
    [101, 'EMP101', '吴倩', 3, 'A-007'],
    [102, 'EMP102', '郑爽', 3, 'A-008'],
    [103, 'EMP103', '冯浩', 1, 'A-009'],
    [104, 'EMP104', '褚燕', 4, 'A-010'],
    [105, 'EMP105', '卫民', 4, 'A-011'],
    [106, 'EMP106', '蒋丽', 2, 'B-006'],
    [107, 'EMP107', '沈涛', 5, 'B-007'],
    [108, 'EMP108', '韩雪', 5, 'B-008'],
    [109, 'EMP109', '曹阳', 5, 'B-009'],
    [110, 'EMP110', '严华', 6, 'B-010'],
    [111, 'EMP111', '魏琳', 6, 'B-011'],
    [112, 'EMP112', '陶俊', 1, 'B-012'],
    [113, 'EMP113', '姜薇', 2, 'B-013'],
    [114, 'EMP114', '戚斌', 3, 'P-001'],
    [115, 'EMP115', '谢雯', 4, 'P-002'],
    [116, 'EMP116', '韩雪梅', 5, null],
    [117, 'EMP117', '曹志刚', 5, null],
    [118, 'EMP118', '严立婷', 6, null],
  ];
  for (const [id, empNo, name, deptId, seatCode] of demoEmps) {
    insertEmp.run(id, empNo, name, deptId, seatCode ? (seatIdByCode.get(seatCode) ?? null) : null);
  }

  // 标记演示分配（occupied）+ assignments + change_logs
  const markOccupied = db.prepare("UPDATE seats SET status = 'occupied' WHERE code = ?");
  const insertAssign = db.prepare(`
    INSERT INTO assignments (seat_id, employee_id, assigned_by, type, status)
    VALUES (?, ?, '系统管理员', 'fixed', 'active')
  `);
  const insertLog = db.prepare(`
    INSERT INTO change_logs (action, seat_id, employee_id, new_seat_id, operator, reason)
    VALUES ('assign', ?, ?, ?, '系统管理员', '初始分配')
  `);
  for (const [id, , , , seatCode] of demoEmps) {
    if (!seatCode) continue;
    const seatId = seatIdByCode.get(seatCode);
    if (!seatId) continue;
    markOccupied.run(seatCode);
    insertAssign.run(seatId, id);
    insertLog.run(seatId, id, seatId);
  }

  // 预约（reserved）— 用演示工位，避开基线
  const reservedPlan: Array<{ code: string; empId: number; startH: number; endH: number }> = [
    { code: 'A-013', empId: 116, startH: 9, endH: 12 },
    { code: 'A-014', empId: 117, startH: 13, endH: 18 },
    { code: 'B-014', empId: 118, startH: 10, endH: 12 },
    { code: 'M-101-1', empId: 116, startH: 14, endH: 16 },
    { code: 'M-101-2', empId: 116, startH: 14, endH: 16 },
  ];
  const markReserved = db.prepare("UPDATE seats SET status = 'reserved' WHERE code = ?");
  const insertBooking = db.prepare(`
    INSERT INTO bookings (seat_id, employee_id, start_time, end_time, status)
    VALUES (?, ?, ?, ?, 'confirmed')
  `);
  const today = new Date();
  const fmt = (h: number): string => { const d = new Date(today); d.setHours(h, 0, 0, 0); return d.toISOString(); };
  for (const b of reservedPlan) {
    const seatId = seatIdByCode.get(b.code);
    if (!seatId) continue;
    markReserved.run(b.code);
    insertBooking.run(seatId, b.empId, fmt(b.startH), fmt(b.endH));
  }

  // 维护（maintenance）— 演示工位
  const markMaint = db.prepare("UPDATE seats SET status = 'maintenance' WHERE code = ?");
  for (const code of ['A-016', 'B-016', 'M-101-6']) markMaint.run(code);

  // 每日统计快照（近 7 天）
  const counts = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) AS occupied,
      SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) AS available,
      SUM(CASE WHEN status='reserved' THEN 1 ELSE 0 END) AS reserved
    FROM seats
  `).get() as { total: number; occupied: number; available: number; reserved: number };
  const insertStat = db.prepare(`
    INSERT OR IGNORE INTO stats_daily (date, total_seats, occupied_seats, available_seats, reserved_seats, utilization_rate)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const jitter = i === 0 ? 0 : Math.min(counts.occupied, Math.floor(Math.random() * 4));
    const occupied = Math.max(0, counts.occupied - jitter);
    const rate = counts.total > 0 ? Number(((occupied / counts.total) * 100).toFixed(1)) : 0;
    insertStat.run(dateStr, counts.total, occupied, counts.available + jitter, counts.reserved, rate);
  }

  const seatCount = (db.prepare('SELECT COUNT(*) AS c FROM seats').get() as { c: number }).c;
  const empCount = (db.prepare('SELECT COUNT(*) AS c FROM employees').get() as { c: number }).c;
  console.log(`[demo-seed] 演示数据完成：${seatCount} 工位 / ${empCount} 员工 / 含分配·预约·维护·统计 + SVG 底图`);
}

// 直接运行此脚本时执行【演示版】seed（生产灌数据）
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  try {
    runDemoSeed();
    closeDb();
    process.exit(0);
  } catch (err) {
    console.error('[seed] 失败:', err);
    process.exit(1);
  }
}
