/**
 * 变更日志查询服务层
 * 需求 7079581339：变更历史查询，支持时间/部门/操作类型筛选
 */

import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error.js';
import type {
  ChangeLog,
  ChangeLogAction,
  ChangeLogWithDetail,
} from '@seat-mgmt/shared';

/** 变更日志联表查询结果行 */
interface ChangeLogJoinRow {
  id: number;
  action: string;
  seat_id: number | null;
  employee_id: number | null;
  old_seat_id: number | null;
  new_seat_id: number | null;
  operator: string;
  reason: string | null;
  created_at: string;
  seat_code: string | null;
  employee_name: string | null;
  employee_emp_no: string | null;
  employee_department_id: number | null;
  employee_department_name: string | null;
  old_seat_code: string | null;
  new_seat_code: string | null;
}

/** 变更日志筛选条件 */
export interface ChangeLogFilter {
  action?: ChangeLogAction;
  departmentId?: number;
  employeeId?: number;
  seatId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/** 将联表行映射为 ChangeLogWithDetail */
function mapJoinRow(row: ChangeLogJoinRow): ChangeLogWithDetail {
  return {
    id: row.id,
    action: row.action as ChangeLogAction,
    seatId: row.seat_id,
    employeeId: row.employee_id,
    oldSeatId: row.old_seat_id,
    newSeatId: row.new_seat_id,
    operator: row.operator,
    reason: row.reason,
    createdAt: row.created_at,
    seatCode: row.seat_code,
    employeeName: row.employee_name,
    employeeEmpNo: row.employee_emp_no,
    employeeDepartmentId: row.employee_department_id,
    employeeDepartmentName: row.employee_department_name,
    oldSeatCode: row.old_seat_code,
    newSeatCode: row.new_seat_code,
  };
}

/**
 * 变更日志服务 — 提供变更历史查询
 */
export class ChangeLogService {
  /**
   * 查询变更日志列表（分页 + 筛选，含联表详情）
   * 支持按操作类型、部门、员工、工位、时间范围筛选
   */
  listChangeLogs(filter: ChangeLogFilter): {
    data: ChangeLogWithDetail[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } {
    const db = getDb();
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.action) {
      conditions.push('cl.action = ?');
      params.push(filter.action);
    }
    if (filter.employeeId) {
      conditions.push('cl.employee_id = ?');
      params.push(filter.employeeId);
    }
    if (filter.seatId) {
      conditions.push('(cl.seat_id = ? OR cl.old_seat_id = ? OR cl.new_seat_id = ?)');
      params.push(filter.seatId, filter.seatId, filter.seatId);
    }
    if (filter.departmentId) {
      conditions.push('e.department_id = ?');
      params.push(filter.departmentId);
    }
    if (filter.startDate) {
      conditions.push('cl.created_at >= ?');
      params.push(filter.startDate);
    }
    if (filter.endDate) {
      conditions.push('cl.created_at <= ?');
      params.push(filter.endDate);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // 查询总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM change_logs cl
      LEFT JOIN employees e ON cl.employee_id = e.id
      ${whereClause}
    `;
    const countResult = db.prepare(countSql).get(...params) as { total: number };
    const total = countResult.total;

    // 查询分页数据（联表获取工位编码、员工姓名、部门名称）
    const offset = (page - 1) * pageSize;
    const dataSql = `
      SELECT
        cl.id, cl.action, cl.seat_id, cl.employee_id, cl.old_seat_id, cl.new_seat_id,
        cl.operator, cl.reason, cl.created_at,
        s.code AS seat_code,
        e.name AS employee_name,
        e.emp_no AS employee_emp_no,
        e.department_id AS employee_department_id,
        d.name AS employee_department_name,
        os.code AS old_seat_code,
        ns.code AS new_seat_code
      FROM change_logs cl
      LEFT JOIN seats s ON cl.seat_id = s.id
      LEFT JOIN employees e ON cl.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN seats os ON cl.old_seat_id = os.id
      LEFT JOIN seats ns ON cl.new_seat_id = ns.id
      ${whereClause}
      ORDER BY cl.id DESC
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(dataSql).all(...params, pageSize, offset) as ChangeLogJoinRow[];

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
   * 根据 ID 查询单条变更日志
   */
  getChangeLogById(id: number): ChangeLog {
    const db = getDb();
    const row = db.prepare('SELECT * FROM change_logs WHERE id = ?').get(id) as
      | {
          id: number;
          action: string;
          seat_id: number | null;
          employee_id: number | null;
          old_seat_id: number | null;
          new_seat_id: number | null;
          operator: string;
          reason: string | null;
          created_at: string;
        }
      | undefined;

    if (!row) {
      throw new AppError(404, `变更日志 ID ${id} 不存在`, 'CHANGE_LOG_NOT_FOUND');
    }

    return {
      id: row.id,
      action: row.action as ChangeLogAction,
      seatId: row.seat_id,
      employeeId: row.employee_id,
      oldSeatId: row.old_seat_id,
      newSeatId: row.new_seat_id,
      operator: row.operator,
      reason: row.reason,
      createdAt: row.created_at,
    };
  }
}

/** 变更日志服务单例 */
export const changeLogService = new ChangeLogService();
