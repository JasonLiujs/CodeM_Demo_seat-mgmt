/**
 * 工位 CRUD 服务层
 * 需求 7080518042：实现工位 CRUD REST API
 */

import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error.js';
import type {
  Seat,
  SeatWithAssignee,
  CreateSeatDto,
  UpdateSeatDto,
  SeatFilterDto,
} from '@seat-mgmt/shared';
import type { PaginatedResponse } from '@seat-mgmt/shared';

/** 联表查询结果行（含分配人信息） */
interface SeatJoinRow {
  id: number;
  code: string;
  area: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floor_plan_id: number | null;
  status: string;
  created_at: string;
  assignee_name: string | null;
  assignee_emp_no: string | null;
}

/** 将联表行映射为 SeatWithAssignee */
function mapJoinRow(row: SeatJoinRow): SeatWithAssignee {
  return {
    id: row.id,
    code: row.code,
    area: row.area,
    type: row.type as Seat['type'],
    x: row.x,
    y: row.y,
    w: row.w,
    h: row.h,
    floorPlanId: row.floor_plan_id,
    status: row.status as Seat['status'],
    createdAt: row.created_at,
    assigneeName: row.assignee_name,
    assigneeEmpNo: row.assignee_emp_no,
  };
}

/**
 * 工位服务 — 实现 ISeatService 接口
 * 提供工位的增删改查及分页筛选
 */
export class SeatService {
  /**
   * 查询工位列表（分页 + 筛选）
   * @param filter 筛选条件与分页参数
   * @returns 分页响应
   */
  listSeats(
    filter: SeatFilterDto & { page?: number; pageSize?: number },
  ): PaginatedResponse<SeatWithAssignee> {
    const db = getDb();
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    // 构建 WHERE 子句（条件作用于 seats 别名 s）
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.area) {
      conditions.push('s.area = ?');
      params.push(filter.area);
    }
    if (filter.type) {
      conditions.push('s.type = ?');
      params.push(filter.type);
    }
    if (filter.status) {
      conditions.push('s.status = ?');
      params.push(filter.status);
    }
    if (filter.floorPlanId) {
      conditions.push('s.floor_plan_id = ?');
      params.push(filter.floorPlanId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM seats s ${whereClause}`;
    const countResult = db.prepare(countSql).get(...params) as { total: number };
    const total = countResult.total;

    // 查询分页数据（LEFT JOIN assignments + employees 获取分配人信息）
    const offset = (page - 1) * pageSize;
    const dataSql = `
    SELECT s.*, e.name AS assignee_name, e.emp_no AS assignee_emp_no
FROM seats s
    LEFT JOIN assignments a ON s.id = a.seat_id AND a.status = 'active'
LEFT JOIN employees e ON a.employee_id = e.id
    ${whereClause}
      ORDER BY s.id ASC
      LIMIT ? OFFSET ?
      `;
    const rows = db.prepare(dataSql).all(...params, pageSize, offset) as SeatJoinRow[];

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
   * 创建工位
   * @param data 创建 DTO
   * @returns 新创建的工位
   */
  createSeat(data: CreateSeatDto): SeatWithAssignee {
    const db = getDb();

    // 检查 code 是否重复
    const existing = db.prepare('SELECT id FROM seats WHERE code = ?').get(data.code);
    if (existing) {
      throw new AppError(409, `工位编码 ${data.code} 已存在`, 'SEAT_CODE_CONFLICT');
    }

    const result = db
      .prepare(
        `
      INSERT INTO seats (code, area, type, x, y, w, h, floor_plan_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        data.code,
        data.area,
        data.type,
        data.x,
        data.y,
        data.w,
        data.h,
        data.floorPlanId ?? null,
        data.status ?? 'available',
      );

    // 查回新插入的行（含分配人信息，新工位无分配人）
    const row = db
      .prepare(
        `
    SELECT s.*, e.name AS assignee_name, e.emp_no AS assignee_emp_no
  FROM seats s
      LEFT JOIN assignments a ON s.id = a.seat_id AND a.status = 'active'
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE s.id = ?
    `,
      )
      .get(result.lastInsertRowid) as SeatJoinRow;
    return mapJoinRow(row);
  }

  /**
   * 更新工位
   * @param id 工位 ID
   * @param data 更新 DTO
   * @returns 更新后的工位
   */
  updateSeat(id: number, data: UpdateSeatDto): SeatWithAssignee {
    const db = getDb();

    // 检查工位是否存在
    const existing = db.prepare('SELECT id FROM seats WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError(404, `工位 ID ${id} 不存在`, 'SEAT_NOT_FOUND');
    }

    // 动态构建 UPDATE 语句
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.code !== undefined) {
      fields.push('code = ?');
      params.push(data.code);
    }
    if (data.area !== undefined) {
      fields.push('area = ?');
      params.push(data.area);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      params.push(data.type);
    }
    if (data.x !== undefined) {
      fields.push('x = ?');
      params.push(data.x);
    }
    if (data.y !== undefined) {
      fields.push('y = ?');
      params.push(data.y);
    }
    if (data.w !== undefined) {
      fields.push('w = ?');
      params.push(data.w);
    }
    if (data.h !== undefined) {
      fields.push('h = ?');
      params.push(data.h);
    }
    if (data.floorPlanId !== undefined) {
      fields.push('floor_plan_id = ?');
      params.push(data.floorPlanId);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      params.push(data.status);
    }

    if (fields.length === 0) {
      // 没有字段需要更新，返回当前值（含分配人信息）
      const row = db
        .prepare(
          `
    SELECT s.*, e.name AS assignee_name, e.emp_no AS assignee_emp_no
FROM seats s
    LEFT JOIN assignments a ON s.id = a.seat_id AND a.status = 'active'
    LEFT JOIN employees e ON a.employee_id = e.id
WHERE s.id = ?
    `,
        )
        .get(id) as SeatJoinRow;
      return mapJoinRow(row);
    }

    params.push(id);
    db.prepare(`UPDATE seats SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    // 查回更新后的行（含分配人信息）
    const row = db
      .prepare(
        `
      SELECT s.*, e.name AS assignee_name, e.emp_no AS assignee_emp_no
      FROM seats s
      LEFT JOIN assignments a ON s.id = a.seat_id AND a.status = 'active'
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE s.id = ?
    `,
      )
      .get(id) as SeatJoinRow;
    return mapJoinRow(row);
  }

  /**
   * 删除工位
   * @param id 工位 ID
   */
  deleteSeat(id: number): void {
    const db = getDb();

    // 检查工位是否存在
    const existing = db.prepare('SELECT id FROM seats WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError(404, `工位 ID ${id} 不存在`, 'SEAT_NOT_FOUND');
    }

    db.prepare('DELETE FROM seats WHERE id = ?').run(id);
  }
}

/** 工位服务单例 */
export const seatService = new SeatService();
