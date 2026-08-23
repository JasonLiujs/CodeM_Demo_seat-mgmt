/**
 * 临时工位预约服务层
 * 需求 7079562886：实现临时工位预约系统
 *
 * 业务规则：
 * - 同一 seat_id 同一时间段不能有多个 active（pending/confirmed）预约（时段冲突检测）
 * - 创建预约后 seat.status 变为 'reserved'
 * - 取消预约后 status='cancelled'，若该工位无其他 active 预约则恢复 seat.status='available'
 * - 定时任务：预约到期（end_time < now）自动 status='expired'
 */

import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error.js';
import { BookingStatus, ChangeLogAction } from '@seat-mgmt/shared';
import type { Booking, CreateBookingDto, BookingFilterDto } from '@seat-mgmt/shared';
import type { PaginatedResponse } from '@seat-mgmt/shared';

/** 联表查询结果行（含工位编码、员工信息） */
interface BookingJoinRow {
  id: number;
  seat_id: number;
  employee_id: number;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  seat_code: string | null;
  seat_area: string | null;
  employee_name: string | null;
  employee_emp_no: string | null;
}

/** 预约详情（含联表信息） */
export interface BookingWithDetail extends Booking {
  seatCode: string | null;
  seatArea: string | null;
  employeeName: string | null;
  employeeEmpNo: string | null;
}

/** 将联表行映射为 BookingWithDetail */
function mapJoinRow(row: BookingJoinRow): BookingWithDetail {
  return {
    id: row.id,
    seatId: row.seat_id,
    employeeId: row.employee_id,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status as BookingStatus,
    createdAt: row.created_at,
    seatCode: row.seat_code,
    seatArea: row.seat_area,
    employeeName: row.employee_name,
    employeeEmpNo: row.employee_emp_no,
  };
}

/**
 * 检查两个时间段是否重叠
 * [startA, endA) 与 [startB, endB) 重叠的条件：startA < endB && startB < endA
 */
function isTimeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return new Date(startA) < new Date(endB) && new Date(startB) < new Date(endA);
}

/**
 * 预约服务 — 实现临时工位预约系统
 */
export class BookingService {
  /**
   * 查询预约列表（分页 + 筛选）
   * 支持按 seatId/employeeId/status/startDate/endDate 筛选
   */
  listBookings(
    filter: BookingFilterDto & {
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
    },
  ): PaginatedResponse<BookingWithDetail> {
    const db = getDb();
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.seatId) {
      conditions.push('b.seat_id = ?');
      params.push(filter.seatId);
    }
    if (filter.employeeId) {
      conditions.push('b.employee_id = ?');
      params.push(filter.employeeId);
    }
    if (filter.status) {
      conditions.push('b.status = ?');
      params.push(filter.status);
    }
    // 日期范围筛选：按 start_time 落在 [startDate, endDate] 区间
    if (filter.startDate) {
      conditions.push('b.start_time >= ?');
      params.push(filter.startDate);
    }
    if (filter.endDate) {
      conditions.push('b.start_time <= ?');
      params.push(filter.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM bookings b ${whereClause}`;
    const countResult = db.prepare(countSql).get(...params) as { total: number };
    const total = countResult.total;

    const offset = (page - 1) * pageSize;
    const dataSql = `
      SELECT b.*, s.code AS seat_code, s.area AS seat_area,
             e.name AS employee_name, e.emp_no AS employee_emp_no
      FROM bookings b
      LEFT JOIN seats s ON b.seat_id = s.id
      LEFT JOIN employees e ON b.employee_id = e.id
      ${whereClause}
      ORDER BY b.start_time DESC
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(dataSql).all(...params, pageSize, offset) as BookingJoinRow[];

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: rows.map(mapJoinRow),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 创建预约
   * 校验：工位存在、员工存在、时段不冲突
   */
  createBooking(data: CreateBookingDto): BookingWithDetail {
    const db = getDb();

    // 校验工位存在
    const seat = db.prepare('SELECT id, code, status FROM seats WHERE id = ?').get(data.seatId) as
      { id: number; code: string; status: string } | undefined;
    if (!seat) {
      throw new AppError(404, `工位 ID ${data.seatId} 不存在`, 'SEAT_NOT_FOUND');
    }

    // 校验工位状态（maintenance 的工位不可预约）
    if (seat.status === 'maintenance') {
      throw new AppError(409, `工位 ${seat.code} 处于维护中，不可预约`, 'SEAT_MAINTENANCE');
    }

    // 校验员工存在
    const employee = db
      .prepare('SELECT id, name FROM employees WHERE id = ?')
      .get(data.employeeId) as { id: number; name: string } | undefined;
    if (!employee) {
      throw new AppError(404, `员工 ID ${data.employeeId} 不存在`, 'EMPLOYEE_NOT_FOUND');
    }

    // 时段冲突检测：同一 seat_id 下，active（pending/confirmed）预约的时段不能与新预约重叠
    const activeBookings = db
      .prepare(
        `
      SELECT start_time, end_time FROM bookings
      WHERE seat_id = ? AND status IN ('pending', 'confirmed')
    `,
      )
      .all(data.seatId) as { start_time: string; end_time: string }[];

    for (const existing of activeBookings) {
      if (isTimeOverlap(data.startTime, data.endTime, existing.start_time, existing.end_time)) {
        throw new AppError(
          409,
          `工位 ${seat.code} 在该时段已被预约（${existing.start_time} ~ ${existing.end_time}）`,
          'BOOKING_CONFLICT',
        );
      }
    }

    // 插入预约记录（默认 status='confirmed'）
    const result = db
      .prepare(
        `
      INSERT INTO bookings (seat_id, employee_id, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(data.seatId, data.employeeId, data.startTime, data.endTime, BookingStatus.CONFIRMED);

    const bookingId = result.lastInsertRowid as number;

    // 更新工位状态为 reserved
    db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('reserved', data.seatId);

    // 写变更日志
    db.prepare(
      `
      INSERT INTO change_logs (action, seat_id, employee_id, operator, reason)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(
      ChangeLogAction.BOOK,
      data.seatId,
      data.employeeId,
      employee.name,
      `预约临时工位 ${seat.code}（${data.startTime} ~ ${data.endTime}）`,
    );

    // 查回完整预约详情
    const row = db
      .prepare(
        `
      SELECT b.*, s.code AS seat_code, s.area AS seat_area,
             e.name AS employee_name, e.emp_no AS employee_emp_no
      FROM bookings b
      LEFT JOIN seats s ON b.seat_id = s.id
      LEFT JOIN employees e ON b.employee_id = e.id
      WHERE b.id = ?
    `,
      )
      .get(bookingId) as BookingJoinRow;

    return mapJoinRow(row);
  }

  /**
   * 取消预约
   * status -> cancelled，若该工位无其他 active 预约则恢复 seat.status='available'
   */
  cancelBooking(id: number, operator: string): void {
    const db = getDb();

    const booking = db
      .prepare(
        `
      SELECT b.id, b.seat_id, b.status, s.code AS seat_code
      FROM bookings b
      LEFT JOIN seats s ON b.seat_id = s.id
      WHERE b.id = ?
    `,
      )
      .get(id) as
      { id: number; seat_id: number; status: string; seat_code: string | null } | undefined;

    if (!booking) {
      throw new AppError(404, `预约 ID ${id} 不存在`, 'BOOKING_NOT_FOUND');
    }

    if (booking.status === 'cancelled') {
      throw new AppError(409, `预约 ${id} 已取消`, 'BOOKING_ALREADY_CANCELLED');
    }
    if (booking.status === 'expired' || booking.status === 'completed') {
      throw new AppError(
        409,
        `预约 ${id} 已${booking.status === 'expired' ? '过期' : '完成'}，不可取消`,
        'BOOKING_NOT_CANCELLABLE',
      );
    }

    // 更新预约状态为 cancelled
    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(BookingStatus.CANCELLED, id);

    // 检查该工位是否还有其他 active 预约
    const activeCount = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM bookings
      WHERE seat_id = ? AND status IN ('pending', 'confirmed')
    `,
      )
      .get(booking.seat_id) as { count: number };

    if (activeCount.count === 0) {
      // 无其他 active 预约，恢复工位状态为 available
      db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('available', booking.seat_id);
    }

    // 写变更日志
    db.prepare(
      `
      INSERT INTO change_logs (action, seat_id, reason, operator)
      VALUES (?, ?, ?, ?)
    `,
    ).run(
      ChangeLogAction.CANCEL_BOOKING,
      booking.seat_id,
      `取消预约 ${id}（工位 ${booking.seat_code ?? booking.seat_id}）`,
      operator,
    );
  }

  /**
   * 过期预约自动失效
   * 将所有 end_time < now 且 status IN ('pending', 'confirmed') 的预约标记为 expired
   * 同时恢复对应工位状态（若无其他 active 预约）
   */
  expireBookings(): number {
    const db = getDb();
    const now = new Date().toISOString();

    // 查找到期的 active 预约
    const expired = db
      .prepare(
        `
      SELECT id, seat_id FROM bookings
      WHERE end_time < ? AND status IN ('pending', 'confirmed')
    `,
      )
      .all(now) as { id: number; seat_id: number }[];

    if (expired.length === 0) {
      return 0;
    }

    // 事务批量更新
    db.transaction(() => {
      const updateStmt = db.prepare('UPDATE bookings SET status = ? WHERE id = ?');
      const logStmt = db.prepare(`
        INSERT INTO change_logs (action, seat_id, reason, operator)
        VALUES (?, ?, ?, ?)
      `);

      for (const booking of expired) {
        updateStmt.run(BookingStatus.EXPIRED, booking.id);

        // 检查工位是否还有其他 active 预约
        const activeCount = db
          .prepare(
            `
          SELECT COUNT(*) as count FROM bookings
          WHERE seat_id = ? AND status IN ('pending', 'confirmed')
        `,
          )
          .get(booking.seat_id) as { count: number };

        if (activeCount.count === 0) {
          db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('available', booking.seat_id);
        }

        logStmt.run(
          ChangeLogAction.CANCEL_BOOKING,
          booking.seat_id,
          `预约 ${booking.id} 到期自动失效`,
          'system',
        );
      }
    })();

    return expired.length;
  }
}

/** 预约服务单例 */
export const bookingService = new BookingService();
