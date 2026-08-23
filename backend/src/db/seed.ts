/**
 * 种子数据脚本
 * 插入演示用的初始数据：部门、平面图（含 SVG 底图）、工位（坐标对齐）、
 * 员工、分配记录、预约记录、变更日志、每日统计快照。
 *
 * 使用 INSERT OR IGNORE 保证可重复执行（依赖 UNIQUE 约束去重）。
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, closeDb } from './connection.js';
import { runMigrations } from './migrate.js';
import { buildFloorPlanSvg, FLOOR_PLAN_WIDTH, FLOOR_PLAN_HEIGHT } from './floor-plan-svg.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** uploads 目录（与 app.ts / floor-plans.ts 的 uploadsDir 一致：backend/uploads） */
const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads');
/** 底图文件名与对外 URL */
const FLOOR_PLAN_FILENAME = 'floor-plan-main.svg';
const FLOOR_PLAN_URL = `/uploads/${FLOOR_PLAN_FILENAME}`;

/**
 * 把 SVG 底图写入 backend/uploads/，使 /uploads/floor-plan-main.svg 可访问。
 * 每次 seed 都重写，保证底图与代码版本一致（uploads 被 gitignore，部署时由 seed 生成）。
 */
function writeFloorPlanImage(): void {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  writeFileSync(join(UPLOADS_DIR, FLOOR_PLAN_FILENAME), buildFloorPlanSvg(), 'utf-8');
  console.log(`[seed] 平面图底图已写入 ${FLOOR_PLAN_URL}`);
}

interface SeatSeed {
  code: string;
  area: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floorPlanId: number;
  status: string;
}

/** 生成 A/B 两个开放办公区的工位阵列（坐标与 SVG 底图网格对齐） */
function buildOfficeSeats(): SeatSeed[] {
  const seats: SeatSeed[] = [];
  // 底图网格：A 区 x=60 起、B 区 x=660 起，y=90 起，cell 96x85，工位略小居中（60x56）
  const cols = 5;
  const rows = 4;
  const cellW = 96;
  const cellH = 85;
  const seatW = 60;
  const seatH = 56;
  const offsetX = (cellW - seatW) / 2;   // 18
  const offsetY = (cellH - seatH) / 2;   // ~14

  const areas: Array<{ prefix: string; area: string; baseX: number; baseY: number; planId: number }> = [
    { prefix: 'A', area: 'A区', baseX: 60, baseY: 90, planId: 1 },
    { prefix: 'B', area: 'B区', baseX: 660, baseY: 90, planId: 1 },
  ];

  let seq = 1;
  for (const a of areas) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const code = `${a.prefix}-${String(seq).padStart(3, '0')}`;
        seats.push({
          code,
          area: a.area,
          type: 'standard',
          x: a.baseX + c * cellW + offsetX,
          y: a.baseY + r * cellH + offsetY,
          w: seatW,
          h: seatH,
          floorPlanId: a.planId,
          status: 'available',
        });
        seq++;
      }
    }
    seq = 1; // 每个区重新编号
  }
  return seats;
}

/** 会议室 + 经理室（落在底图对应房间内） */
function buildRoomSeats(): SeatSeed[] {
  return [
    // 会议室 M-101（房间 x=870~1160, y=570~750，会议桌附近放 6 个座位）
    { code: 'M-101-1', area: '会议室', type: 'meeting', x: 950, y: 600, w: 40, h: 40, floorPlanId: 1, status: 'available' },
    { code: 'M-101-2', area: '会议室', type: 'meeting', x: 1000, y: 600, w: 40, h: 40, floorPlanId: 1, status: 'available' },
    { code: 'M-101-3', area: '会议室', type: 'meeting', x: 1050, y: 600, w: 40, h: 40, floorPlanId: 1, status: 'available' },
    { code: 'M-101-4', area: '会议室', type: 'meeting', x: 950, y: 700, w: 40, h: 40, floorPlanId: 1, status: 'available' },
    { code: 'M-101-5', area: '会议室', type: 'meeting', x: 1000, y: 700, w: 40, h: 40, floorPlanId: 1, status: 'available' },
    { code: 'M-101-6', area: '会议室', type: 'meeting', x: 1050, y: 700, w: 40, h: 40, floorPlanId: 1, status: 'available' },
    // 经理室 P-001（x=640~745, y=570~750）
    { code: 'P-001', area: '经理室', type: 'private', x: 668, y: 630, w: 56, h: 60, floorPlanId: 1, status: 'available' },
    // 经理室 P-002（x=745~850, y=570~750）
    { code: 'P-002', area: '经理室', type: 'private', x: 773, y: 630, w: 56, h: 60, floorPlanId: 1, status: 'available' },
  ];
}

/** 执行种子数据插入 */
export function runSeed(): void {
  runMigrations();
  writeFloorPlanImage();

  const db = getDb();

  // --- 部门 ---
  const insertDept = db.prepare('INSERT OR IGNORE INTO departments (id, name) VALUES (?, ?)');
  const depts: Array<[number, string]> = [
    [1, '研发部'],
    [2, '产品部'],
    [3, '设计部'],
    [4, '市场部'],
    [5, '运营部'],
    [6, '人事行政部'],
  ];
  for (const d of depts) insertDept.run(...d);

  // --- 楼层平面图（指向 SVG 底图） ---
  const insertPlan = db.prepare(
    'INSERT OR IGNORE INTO floor_plans (id, name, image_url, width, height) VALUES (?, ?, ?, ?, ?)',
  );
  insertPlan.run(1, '3楼 · 办公区', FLOOR_PLAN_URL, FLOOR_PLAN_WIDTH, FLOOR_PLAN_HEIGHT);

  // --- 工位（坐标对齐底图） ---
  const insertSeat = db.prepare(`
    INSERT OR IGNORE INTO seats (code, area, type, x, y, w, h, floor_plan_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const allSeats = [...buildOfficeSeats(), ...buildRoomSeats()];
  for (const s of allSeats) {
    insertSeat.run(s.code, s.area, s.type, s.x, s.y, s.w, s.h, s.floorPlanId, s.status);
  }

  // 工位 id 按 code 查回（用于分配/预约/维护标记）
  const seatIdByCode = new Map<string, number>();
  for (const row of db.prepare('SELECT id, code FROM seats').all() as Array<{ id: number; code: string }>) {
    seatIdByCode.set(row.code, row.id);
  }

  // --- 员工 ---
  const insertEmp = db.prepare(`
    INSERT OR IGNORE INTO employees (emp_no, name, department_id, seat_id)
    VALUES (?, ?, ?, ?)
  `);
  // [emp_no, name, dept_id, 分配的工位code(可空)]
  const empData: Array<[string, string, number, string | null]> = [
    ['EMP001', '张伟', 1, 'A-001'],
    ['EMP002', '李娜', 1, 'A-002'],
    ['EMP003', '王芳', 1, 'A-003'],
    ['EMP004', '刘洋', 1, 'A-006'],
    ['EMP005', '陈静', 1, 'A-007'],
    ['EMP006', '杨光', 2, 'A-008'],
    ['EMP007', '赵敏', 2, 'A-011'],
    ['EMP008', '孙磊', 2, 'A-012'],
    ['EMP009', '周杰', 2, 'B-001'],
    ['EMP010', '吴倩', 3, 'B-002'],
    ['EMP011', '郑爽', 3, 'B-003'],
    ['EMP012', '冯浩', 3, 'B-006'],
    ['EMP013', '褚燕', 4, 'B-007'],
    ['EMP014', '卫民', 4, 'B-008'],
    ['EMP015', '蒋丽', 4, 'B-011'],
    ['EMP016', '沈涛', 5, 'B-012'],
    ['EMP017', '韩雪', 5, null],
    ['EMP018', '曹阳', 5, null],
    ['EMP019', '严华', 6, 'P-001'],
    ['EMP020', '魏琳', 6, 'P-002'],
    ['EMP021', '陶俊', 1, null],
    ['EMP022', '姜薇', 2, null],
    ['EMP023', '戚斌', 3, null],
    ['EMP024', '谢雯', 4, null],
  ];
  for (const [empNo, name, deptId, seatCode] of empData) {
    const seatId = seatCode ? (seatIdByCode.get(seatCode) ?? null) : null;
    insertEmp.run(empNo, name, deptId, seatId);
  }

  // 把已分配工位标记为 occupied，并写 assignments 记录
  const empIdByNo = new Map<string, number>();
  for (const row of db.prepare('SELECT id, emp_no FROM employees').all() as Array<{ id: number; emp_no: string }>) {
    empIdByNo.set(row.emp_no, row.id);
  }
  const markOccupied = db.prepare("UPDATE seats SET status = 'occupied' WHERE code = ?");
  const insertAssign = db.prepare(`
    INSERT INTO assignments (seat_id, employee_id, assigned_by, type, status)
    VALUES (?, ?, ?, 'fixed', 'active')
  `);
  const insertChangeLog = db.prepare(`
    INSERT INTO change_logs (action, seat_id, employee_id, new_seat_id, operator, reason)
    VALUES ('assign', ?, ?, ?, ?, ?)
  `);
  for (const [empNo, , , seatCode] of empData) {
    if (!seatCode) continue;
    const seatId = seatIdByCode.get(seatCode);
    const empId = empIdByNo.get(empNo);
    if (!seatId || !empId) continue;
    markOccupied.run(seatCode);
    insertAssign.run(seatId, empId, '系统管理员');
    insertChangeLog.run(seatId, empId, seatId, '系统管理员', '初始分配');
  }

  // --- 预约（reserved）：选几个空闲工位造预约 ---
  const reservedPlan: Array<{ code: string; empNo: string; startH: number; endH: number }> = [
    { code: 'A-004', empNo: 'EMP017', startH: 9, endH: 12 },
    { code: 'A-005', empNo: 'EMP018', startH: 13, endH: 18 },
    { code: 'B-004', empNo: 'EMP021', startH: 10, endH: 12 },
    { code: 'M-101-1', empNo: 'EMP022', startH: 14, endH: 16 },
    { code: 'M-101-2', empNo: 'EMP022', startH: 14, endH: 16 },
  ];
  const markReserved = db.prepare("UPDATE seats SET status = 'reserved' WHERE code = ?");
  const insertBooking = db.prepare(`
    INSERT INTO bookings (seat_id, employee_id, start_time, end_time, status)
    VALUES (?, ?, ?, ?, 'confirmed')
  `);
  const today = new Date();
  const fmt = (h: number): string => {
    const d = new Date(today);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };
  for (const b of reservedPlan) {
    const seatId = seatIdByCode.get(b.code);
    const empId = empIdByNo.get(b.empNo);
    if (!seatId || !empId) continue;
    markReserved.run(b.code);
    insertBooking.run(seatId, empId, fmt(b.startH), fmt(b.endH));
  }

  // --- 维护（maintenance）：标几个工位为维护中 ---
  const maintenanceCodes = ['A-016', 'B-016', 'M-101-6'];
  const markMaint = db.prepare("UPDATE seats SET status = 'maintenance' WHERE code = ?");
  for (const code of maintenanceCodes) markMaint.run(code);

  // --- 每日统计快照（近 7 天，让看板有数据） ---
  const counts = db.prepare(`
    SELECT
      COUNT(*) AS total,
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
    // 让历史数据略有波动（i 越大占用越少），最后一天用真实值
    const jitter = i === 0 ? 0 : Math.min(counts.occupied, Math.floor(Math.random() * 4));
    const occupied = Math.max(0, counts.occupied - jitter);
    const rate = counts.total > 0 ? Number(((occupied / counts.total) * 100).toFixed(1)) : 0;
    insertStat.run(dateStr, counts.total, occupied, counts.available + jitter, counts.reserved, rate);
  }

  const seatCount = (db.prepare('SELECT COUNT(*) AS c FROM seats').get() as { c: number }).c;
  const empCount = (db.prepare('SELECT COUNT(*) AS c FROM employees').get() as { c: number }).c;
  console.log(`[seed] 种子数据完成：${depts.length} 部门 / ${seatCount} 工位 / ${empCount} 员工 / 含分配·预约·维护·统计`);
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
