/**
 * 统计服务层
 * 需求 7080572472：实时利用率看板统计 API
 */

import { getDb } from '../db/connection.js';
import type {
  StatsOverview,
  StatsByArea,
  StatsByDepartment,
  StatsTrendPoint,
} from '@seat-mgmt/shared';

/** 按区域统计查询结果行 */
interface AreaRow {
  area: string;
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  maintenance: number;
}

/** 按部门统计查询结果行 */
interface DepartmentRow {
  department_id: number | null;
  department_name: string;
  total_employees: number;
  assigned_employees: number;
}

/** 每日快照查询结果行 */
interface StatsDailyRow {
  date: string;
  occupied_seats: number;
  reserved_seats: number;
  total_seats: number;
}

/**
 * 统计服务 — 提供利用率看板所需的各类统计
 * better-sqlite3 是同步的，无需 async/await
 */
export class StatsService {
  /**
   * 获取统计概览
   * 统计各状态工位数量、员工分配情况、活跃预订数，计算利用率百分比
   */
  getOverview(): StatsOverview {
    const db = getDb();

    // 按 status 分组统计工位
    const statusRows = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM seats
      GROUP BY status
    `).all() as Array<{ status: string; count: number }>;

    let available = 0;
    let occupied = 0;
    let reserved = 0;
    let maintenance = 0;
    for (const row of statusRows) {
      switch (row.status) {
        case 'available':
          available = row.count;
          break;
        case 'occupied':
          occupied = row.count;
          break;
        case 'reserved':
          reserved = row.count;
          break;
        case 'maintenance':
          maintenance = row.count;
          break;
      }
    }
    const totalSeats = available + occupied + reserved + maintenance;

    // 员工总数与已分配数（有 seat_id 即视为已分配）
    const empRow = db.prepare(`
      SELECT
        COUNT(*) as total_employees,
        COUNT(seat_id) as assigned_employees
      FROM employees
    `).get() as { total_employees: number; assigned_employees: number };

    // 活跃预订数（status 为 pending 或 confirmed）
    const bookingRow = db.prepare(`
      SELECT COUNT(*) as active_bookings
      FROM bookings
      WHERE status IN ('pending', 'confirmed')
    `).get() as { active_bookings: number };

    return {
      totalSeats,
      availableSeats: available,
      occupiedSeats: occupied,
      reservedSeats: reserved,
      maintenanceSeats: maintenance,
      totalEmployees: empRow.total_employees,
      assignedEmployees: empRow.assigned_employees,
      unassignedEmployees: empRow.total_employees - empRow.assigned_employees,
      activeBookings: bookingRow.active_bookings,
    };
  }

  /**
   * 按区域统计工位状态
   * 按 area 分组，统计各区域工位状态
   */
  getByArea(): StatsByArea[] {
    const db = getDb();

    const rows = db.prepare(`
      SELECT
        area,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
      FROM seats
      GROUP BY area
      ORDER BY area ASC
    `).all() as AreaRow[];

    return rows.map((r) => ({
      area: r.area,
      total: r.total,
      available: r.available,
      occupied: r.occupied,
      reserved: r.reserved,
      maintenance: r.maintenance,
    }));
  }

  /**
   * 获取近 N 天利用率趋势
   * 读取 stats_daily 表的历史快照；无历史数据时返回当日实时快照兜底
   */
  getTrends(days = 30): StatsTrendPoint[] {
    const db = getDb();

    // 查询最近 N 条历史快照（按日期升序返回）
    const rows = db.prepare(`
      SELECT date, occupied_seats, reserved_seats, total_seats
      FROM stats_daily
      ORDER BY date DESC
      LIMIT ?
    `).all(days) as StatsDailyRow[];

    if (rows.length > 0) {
      // 反转为升序，便于折线图按时间正序展示
      return rows
        .reverse()
        .map((r) => ({
          date: r.date,
          assigned: r.occupied_seats,
          booked: r.reserved_seats,
        }));
    }

    // 无历史数据：返回当日实时快照兜底
    const overview = this.getOverview();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return [
      {
        date: todayStr,
        assigned: overview.occupiedSeats,
        booked: overview.reservedSeats,
      },
    ];
  }

  /**
   * 获取部门工位分布
   * 联表 employees + departments 统计各部门员工数和已分配数
   */
  getDepartments(): StatsByDepartment[] {
    const db = getDb();

    const rows = db.prepare(`
      SELECT
        d.id as department_id,
        COALESCE(d.name, '未分配') as department_name,
        COUNT(e.id) as total_employees,
        SUM(CASE WHEN e.seat_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_employees
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id
      GROUP BY d.id, d.name
      ORDER BY total_employees DESC
    `).all() as DepartmentRow[];

    return rows.map((r) => ({
      departmentId: r.department_id,
      departmentName: r.department_name,
      totalEmployees: r.total_employees,
      assignedEmployees: r.assigned_employees,
    }));
  }

  /**
   * 记录当日利用率快照到 stats_daily 表
   * 使用 INSERT OR REPLACE 保证当天可重复写入
   */
  recordDailySnapshot(): void {
    const db = getDb();
    const overview = this.getOverview();

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const utilizationRate =
      overview.totalSeats > 0
        ? (overview.occupiedSeats / overview.totalSeats) * 100
        : 0;

    db.prepare(`
      INSERT OR REPLACE INTO stats_daily
        (date, total_seats, occupied_seats, available_seats, reserved_seats, utilization_rate)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      dateStr,
      overview.totalSeats,
      overview.occupiedSeats,
      overview.availableSeats,
      overview.reservedSeats,
      utilizationRate,
    );
  }
}

/** 统计服务单例 */
export const statsService = new StatsService();
