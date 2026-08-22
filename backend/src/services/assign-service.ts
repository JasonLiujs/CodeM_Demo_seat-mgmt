/**
 * 工位分配与变更管理服务层
 * 需求 7079581339：实现分配/取消/变更/批量分配/部门搬迁
 *
 * 业务规则：
 * - 分配时校验工位状态为 available（非占用/预约/维护）
 * - 一个员工只能有一个 type='fixed' 的 active assignment
 * - 分配后更新 seat.status='occupied'，取消时恢复 'available'
 * - 所有写操作都记 change_log
 * - 批量分配/转移用事务保证原子性
 */

import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error.js';
import { AssignmentType, ChangeLogAction } from '@seat-mgmt/shared';
import type {
  Assignment,
  AssignmentStatus,
} from '@seat-mgmt/shared';

/** 分配记录数据库行 */
interface AssignmentRow {
  id: number;
  seat_id: number;
  employee_id: number;
  assigned_at: string;
  assigned_by: string;
  type: string;
  status: string;
}

/** 工位数据库行（最小字段集） */
interface SeatRow {
  id: number;
  code: string;
  area: string;
  status: string;
}

/** 员工数据库行（最小字段集） */
interface EmployeeRow {
  id: number;
  emp_no: string;
  name: string;
  department_id: number | null;
}

/** 将分配行映射为 Assignment 实体 */
function mapAssignmentRow(row: AssignmentRow): Assignment {
  return {
    id: row.id,
    seatId: row.seat_id,
    employeeId: row.employee_id,
    assignedAt: row.assigned_at,
    assignedBy: row.assigned_by,
    type: row.type as AssignmentType,
    status: row.status as AssignmentStatus,
  };
}

/**
 * 写入变更日志（内部方法）
 * 所有写操作完成后调用，记录操作历史
 */
function writeChangeLog(
  db: ReturnType<typeof getDb>,
  params: {
    action: ChangeLogAction;
    seatId?: number | null;
    employeeId?: number | null;
    oldSeatId?: number | null;
    newSeatId?: number | null;
    operator: string;
    reason?: string | null;
  },
): void {
  db.prepare(`
    INSERT INTO change_logs (action, seat_id, employee_id, old_seat_id, new_seat_id, operator, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.action,
    params.seatId ?? null,
    params.employeeId ?? null,
    params.oldSeatId ?? null,
    params.newSeatId ?? null,
    params.operator,
    params.reason ?? null,
  );
}

/**
 * 工位分配服务 — 实现 IAssignService 接口
 */
export class AssignService {
  /**
   * 查询分配记录列表（支持按工位/员工/状态筛选）
   */
  listAssignments(filter: {
    seatId?: number;
    employeeId?: number;
    status?: AssignmentStatus;
  }): Assignment[] {
    const db = getDb();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.seatId) {
      conditions.push('seat_id = ?');
      params.push(filter.seatId);
    }
    if (filter.employeeId) {
      conditions.push('employee_id = ?');
      params.push(filter.employeeId);
    }
    if (filter.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const rows = db.prepare(
      `SELECT * FROM assignments ${whereClause} ORDER BY id ASC`,
    ).all(...params) as AssignmentRow[];

    return rows.map(mapAssignmentRow);
  }

  /**
   * 根据 ID 查询分配记录
   */
  getAssignmentById(id: number): Assignment {
    const db = getDb();
    const row = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id) as AssignmentRow | undefined;
    if (!row) {
      throw new AppError(404, `分配记录 ID ${id} 不存在`, 'ASSIGNMENT_NOT_FOUND');
    }
    return mapAssignmentRow(row);
  }

  /**
   * 分配工位给员工
   * 校验：工位存在且状态为 available，员工存在且无 fixed active assignment
   * 分配后更新 seat.status='occupied'，写 change_log
   * @param seatId 工位 ID
   * @param employeeId 员工 ID
   * @param assignedBy 操作人
   * @param type 分配类型（默认 fixed）
   * @returns 新创建的分配记录
   */
  assign(
    seatId: number,
    employeeId: number,
    assignedBy: string,
    type: AssignmentType = AssignmentType.FIXED,
  ): Assignment {
    const db = getDb();

    // 校验工位存在
    const seat = db.prepare('SELECT * FROM seats WHERE id = ?').get(seatId) as SeatRow | undefined;
    if (!seat) {
      throw new AppError(404, `工位 ID ${seatId} 不存在`, 'SEAT_NOT_FOUND');
    }

    // 校验工位状态为 available
    if (seat.status !== 'available') {
      throw new AppError(
        409,
        `工位 ${seat.code} 当前状态为 ${seat.status}，无法分配`,
        'SEAT_NOT_AVAILABLE',
      );
    }

    // 校验员工存在
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId) as EmployeeRow | undefined;
    if (!employee) {
      throw new AppError(404, `员工 ID ${employeeId} 不存在`, 'EMPLOYEE_NOT_FOUND');
    }

    // 校验员工无 type='fixed' 的 active assignment
    if (type === AssignmentType.FIXED) {
      const existingFixed = db.prepare(
        `SELECT id FROM assignments WHERE employee_id = ? AND type = 'fixed' AND status = 'active'`,
      ).get(employeeId);
      if (existingFixed) {
        throw new AppError(
          409,
          `员工 ${employee.name} 已有固定工位分配，不能重复分配`,
          'EMPLOYEE_ALREADY_ASSIGNED',
        );
      }
    }

    // 插入分配记录
    const result = db.prepare(`
      INSERT INTO assignments (seat_id, employee_id, assigned_by, type, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(seatId, employeeId, assignedBy, type);

    // 更新工位状态为 occupied
    db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('occupied', seatId);

    // 写变更日志
    writeChangeLog(db, {
      action: ChangeLogAction.ASSIGN,
      seatId,
      employeeId,
      newSeatId: seatId,
      operator: assignedBy,
      reason: `分配工位 ${seat.code} 给员工 ${employee.name}`,
    });

    // 查回新插入的分配记录
    const row = db.prepare('SELECT * FROM assignments WHERE id = ?').get(result.lastInsertRowid) as AssignmentRow;
    return mapAssignmentRow(row);
  }

  /**
   * 取消分配
   * 将 assignment.status 设为 inactive，恢复 seat.status='available'，写 change_log
   * @param id 分配记录 ID
   */
  unassign(id: number, operator: string = 'system'): void {
    const db = getDb();

    // 查询分配记录
    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id) as AssignmentRow | undefined;
    if (!assignment) {
      throw new AppError(404, `分配记录 ID ${id} 不存在`, 'ASSIGNMENT_NOT_FOUND');
    }

    // 校验状态为 active
    if (assignment.status !== 'active') {
      throw new AppError(
        409,
        `分配记录 ID ${id} 当前状态为 ${assignment.status}，无法取消`,
        'ASSIGNMENT_NOT_ACTIVE',
      );
    }

    // 更新分配状态为 inactive
    db.prepare('UPDATE assignments SET status = ? WHERE id = ?').run('inactive', id);

    // 恢复工位状态为 available
    db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('available', assignment.seat_id);

    // 写变更日志
    const seat = db.prepare('SELECT code FROM seats WHERE id = ?').get(assignment.seat_id) as { code: string } | undefined;
    const employee = db.prepare('SELECT name FROM employees WHERE id = ?').get(assignment.employee_id) as { name: string } | undefined;
    writeChangeLog(db, {
      action: ChangeLogAction.UNASSIGN,
      seatId: assignment.seat_id,
      employeeId: assignment.employee_id,
      oldSeatId: assignment.seat_id,
      operator,
      reason: `取消工位 ${seat?.code ?? assignment.seat_id} 的分配（员工 ${employee?.name ?? assignment.employee_id}）`,
    });
  }

  /**
   * 工位变更：员工从旧工位转移到新工位
   * 事务内：旧工位 assignment inactive + 新工位 assignment active + 更新两个 seat 状态 + 写 change_log
   * @param employeeId 员工 ID
   * @param newSeatId 新工位 ID
   * @param operator 操作人
   * @returns 新分配记录
   */
  transfer(employeeId: number, newSeatId: number, operator: string): Assignment {
    const db = getDb();

    // 校验员工存在
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId) as EmployeeRow | undefined;
    if (!employee) {
      throw new AppError(404, `员工 ID ${employeeId} 不存在`, 'EMPLOYEE_NOT_FOUND');
    }

    // 校验新工位存在且可用
    const newSeat = db.prepare('SELECT * FROM seats WHERE id = ?').get(newSeatId) as SeatRow | undefined;
    if (!newSeat) {
      throw new AppError(404, `工位 ID ${newSeatId} 不存在`, 'SEAT_NOT_FOUND');
    }
    if (newSeat.status !== 'available') {
      throw new AppError(
        409,
        `新工位 ${newSeat.code} 当前状态为 ${newSeat.status}，无法转移`,
        'SEAT_NOT_AVAILABLE',
      );
    }

    // 查找员工当前 active fixed assignment
    const oldAssignment = db.prepare(
      `SELECT * FROM assignments WHERE employee_id = ? AND type = 'fixed' AND status = 'active'`,
    ).get(employeeId) as AssignmentRow | undefined;

    if (!oldAssignment) {
      throw new AppError(
        404,
        `员工 ${employee.name} 当前无固定工位分配，无法转移`,
        'NO_ACTIVE_ASSIGNMENT',
      );
    }

    const oldSeatId = oldAssignment.seat_id;
    const oldSeat = db.prepare('SELECT code FROM seats WHERE id = ?').get(oldSeatId) as { code: string } | undefined;

    // 事务执行：旧取消 + 新分配 + 状态更新 + 日志
    const newId = db.transaction(() => {
      // 旧分配设为 inactive
      db.prepare('UPDATE assignments SET status = ? WHERE id = ?').run('inactive', oldAssignment.id);

      // 旧工位恢复 available
      db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('available', oldSeatId);

      // 新分配记录
      const ins = db.prepare(`
        INSERT INTO assignments (seat_id, employee_id, assigned_by, type, status)
        VALUES (?, ?, ?, ?, 'active')
      `).run(newSeatId, employeeId, operator, AssignmentType.FIXED);

      // 新工位设为 occupied
      db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('occupied', newSeatId);

      // 写变更日志
      writeChangeLog(db, {
        action: ChangeLogAction.TRANSFER,
        seatId: newSeatId,
        employeeId,
        oldSeatId,
        newSeatId,
        operator,
        reason: `员工 ${employee.name} 从工位 ${oldSeat?.code ?? oldSeatId} 转移到工位 ${newSeat.code}`,
      });

      return ins.lastInsertRowid as number;
    })();

    const row = db.prepare('SELECT * FROM assignments WHERE id = ?').get(newId) as AssignmentRow;
    return mapAssignmentRow(row);
  }

  /**
   * 批量分配
   * 事务内逐一执行 assign，任一失败回滚整个事务
   * @param pairs 工位-员工配对数组
   * @param assignedBy 操作人
   * @returns 新创建的分配记录数组
   */
  batchAssign(
    pairs: Array<{ seatId: number; employeeId: number }>,
    assignedBy: string,
  ): Assignment[] {
    const db = getDb();

    if (pairs.length === 0) {
      throw new AppError(400, '批量分配列表不能为空', 'VALIDATION_ERROR');
    }

    // 事务内逐一分配 + 写批量日志（同一事务保证原子性）
    const results: Assignment[] = [];
    const insertedIds: number[] = [];

    db.transaction(() => {
      for (const pair of pairs) {
        // 复用 assign 的逻辑（事务内调用会共享同一个 db 连接）
        const assignment = this.assign(pair.seatId, pair.employeeId, assignedBy, AssignmentType.FIXED);
        results.push(assignment);
        insertedIds.push(assignment.id);
      }

      // 在同一事务内写批量分配日志
      writeChangeLog(db, {
        action: ChangeLogAction.BATCH_ASSIGN,
        employeeId: null,
        operator: assignedBy,
        reason: `批量分配 ${pairs.length} 个工位`,
      });
    })();

    return results;
  }

  /**
   * 部门搬迁
   * 查找部门所有员工 → 逐一转移到目标区域的空闲工位
   * 目标区域空闲工位不足时报错
   * @param deptId 部门 ID
   * @param targetArea 目标区域名称
   * @param operator 操作人
   */
  relocate(deptId: number, targetArea: string, operator: string): void {
    const db = getDb();

    // 查找部门所有员工
    const employees = db.prepare(
      'SELECT * FROM employees WHERE department_id = ? ORDER BY id ASC',
    ).all(deptId) as EmployeeRow[];

    if (employees.length === 0) {
      throw new AppError(
        404,
        `部门 ID ${deptId} 下无员工或部门不存在`,
        'DEPARTMENT_NO_EMPLOYEES',
      );
    }

    // 查找目标区域所有空闲工位
    const availableSeats = db.prepare(
      `SELECT * FROM seats WHERE area = ? AND status = 'available' ORDER BY id ASC`,
    ).all(targetArea) as SeatRow[];

    if (availableSeats.length < employees.length) {
      throw new AppError(
        409,
        `目标区域 ${targetArea} 空闲工位不足（需要 ${employees.length} 个，实际 ${availableSeats.length} 个）`,
        'INSUFFICIENT_SEATS',
      );
    }

    // 事务内逐一转移
    db.transaction(() => {
      for (let i = 0; i < employees.length; i++) {
        const employee = employees[i];
        const targetSeat = availableSeats[i];

        // 查找员工当前 active fixed assignment
        const oldAssignment = db.prepare(
          `SELECT * FROM assignments WHERE employee_id = ? AND type = 'fixed' AND status = 'active'`,
        ).get(employee.id) as AssignmentRow | undefined;

        if (oldAssignment) {
          // 有旧工位 → 执行转移
          const oldSeatId = oldAssignment.seat_id;
          const oldSeat = db.prepare('SELECT code FROM seats WHERE id = ?').get(oldSeatId) as { code: string } | undefined;

          // 旧分配设为 inactive
          db.prepare('UPDATE assignments SET status = ? WHERE id = ?').run('inactive', oldAssignment.id);
          // 旧工位恢复 available
          db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('available', oldSeatId);

          // 新分配记录
          db.prepare(`
            INSERT INTO assignments (seat_id, employee_id, assigned_by, type, status)
            VALUES (?, ?, ?, ?, 'active')
          `).run(targetSeat.id, employee.id, operator, AssignmentType.FIXED);

          // 新工位设为 occupied
          db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('occupied', targetSeat.id);

          // 写变更日志
          writeChangeLog(db, {
            action: ChangeLogAction.TRANSFER,
            seatId: targetSeat.id,
            employeeId: employee.id,
            oldSeatId,
            newSeatId: targetSeat.id,
            operator,
            reason: `部门搬迁：员工 ${employee.name} 从工位 ${oldSeat?.code ?? oldSeatId} 转移到工位 ${targetSeat.code}`,
          });
        } else {
          // 无旧工位 → 直接分配
          db.prepare(`
            INSERT INTO assignments (seat_id, employee_id, assigned_by, type, status)
            VALUES (?, ?, ?, ?, 'active')
          `).run(targetSeat.id, employee.id, operator, AssignmentType.FIXED);

          db.prepare('UPDATE seats SET status = ? WHERE id = ?').run('occupied', targetSeat.id);

          writeChangeLog(db, {
            action: ChangeLogAction.ASSIGN,
            seatId: targetSeat.id,
            employeeId: employee.id,
            newSeatId: targetSeat.id,
            operator,
            reason: `部门搬迁：分配工位 ${targetSeat.code} 给员工 ${employee.name}`,
          });
        }
      }
    })();
  }
}

/** 工位分配服务单例 */
export const assignService = new AssignService();
