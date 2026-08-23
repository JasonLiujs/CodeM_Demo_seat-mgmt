/**
 * 员工 CRUD + CSV 批量导入服务层
 * 需求 7080732492：实现员工数据管理与 CSV 批量导入
 */

import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error.js';
import { departmentService } from './department-service.js';
import type {
  Employee,
  EmployeeWithDepartment,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  CsvImportRow,
  CsvImportResult,
  EmployeeSeatResult,
  SeatWithAssignee,
  Seat,
  SeatStatus,
} from '@seat-mgmt/shared';
import type { PaginatedResponse } from '@seat-mgmt/shared';

/** 员工数据库行（联表查询结果） */
interface EmployeeJoinRow {
  id: number;
  emp_no: string;
  name: string;
  department_id: number | null;
  department_name: string | null;
  seat_id: number | null;
  created_at: string;
}

/** 员工数据库行（单表） */
interface EmployeeRow {
  id: number;
  emp_no: string;
  name: string;
  department_id: number | null;
  seat_id: number | null;
  created_at: string;
}

/** 联表行映射为 EmployeeWithDepartment */
function mapJoinRow(row: EmployeeJoinRow): EmployeeWithDepartment {
  return {
    id: row.id,
    empNo: row.emp_no,
    name: row.name,
    departmentId: row.department_id,
    departmentName: row.department_name,
    seatId: row.seat_id,
    createdAt: row.created_at,
  };
}

/**
 * 手写 CSV 解析器
 * 支持逗号分隔、双引号包裹、引号内换行
 * @param csvText CSV 文本
 * @returns 解析后的行数组（每行为字符串数组）
 */
function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  // 剥离 UTF-8 BOM（Windows Excel 导出常见）
  const text = csvText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        // 双引号转义
        if (text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // 处理最后一行（无换行结尾）
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // 移除空行
  return rows.filter((row) => row.some((field) => field.trim() !== ''));
}

/**
 * 员工服务 — CRUD + CSV 批量导入
 */
export class EmployeeService {
  /**
   * 查询员工列表（分页 + 筛选，含部门名称）
   */
  listEmployees(filter: {
    departmentId?: number;
    name?: string;
    page?: number;
    pageSize?: number;
  }): PaginatedResponse<EmployeeWithDepartment> {
    const db = getDb();
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.departmentId) {
      conditions.push('e.department_id = ?');
      params.push(filter.departmentId);
    }
    if (filter.name) {
      conditions.push('e.name LIKE ?');
      params.push(`%${filter.name}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM employees e ${whereClause}`;
    const countResult = db.prepare(countSql).get(...params) as { total: number };
    const total = countResult.total;

    // 查询分页数据（联表获取部门名称）
    const offset = (page - 1) * pageSize;
    const dataSql = `
      SELECT e.id, e.emp_no, e.name, e.department_id, e.seat_id, e.created_at,
             d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      ORDER BY e.id ASC
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(dataSql).all(...params, pageSize, offset) as EmployeeJoinRow[];

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
   * 根据 ID 查询员工（含部门名称）
   */
  getEmployeeById(id: number): EmployeeWithDepartment {
    const db = getDb();
    const row = db
      .prepare(
        `
      SELECT e.id, e.emp_no, e.name, e.department_id, e.seat_id, e.created_at,
             d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = ?
    `,
      )
      .get(id) as EmployeeJoinRow | undefined;

    if (!row) {
      throw new AppError(404, `员工 ID ${id} 不存在`, 'EMPLOYEE_NOT_FOUND');
    }
    return mapJoinRow(row);
  }

  /**
   * 创建员工
   */
  createEmployee(data: CreateEmployeeDto): Employee {
    const db = getDb();

    // 检查工号是否重复
    const existing = db.prepare('SELECT id FROM employees WHERE emp_no = ?').get(data.empNo);
    if (existing) {
      throw new AppError(409, `工号 ${data.empNo} 已存在`, 'EMPLOYEE_NO_CONFLICT');
    }

    const result = db
      .prepare(
        `
      INSERT INTO employees (emp_no, name, department_id)
      VALUES (?, ?, ?)
    `,
      )
      .run(data.empNo, data.name, data.departmentId ?? null);

    const row = db
      .prepare('SELECT * FROM employees WHERE id = ?')
      .get(result.lastInsertRowid) as EmployeeRow;
    return {
      id: row.id,
      empNo: row.emp_no,
      name: row.name,
      departmentId: row.department_id,
      seatId: row.seat_id,
      createdAt: row.created_at,
    };
  }

  /**
   * 更新员工
   */
  updateEmployee(id: number, data: UpdateEmployeeDto): Employee {
    const db = getDb();

    const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as
      EmployeeRow | undefined;
    if (!existing) {
      throw new AppError(404, `员工 ID ${id} 不存在`, 'EMPLOYEE_NOT_FOUND');
    }

    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.empNo !== undefined) {
      // 检查工号是否与其他员工重复
      const dup = db
        .prepare('SELECT id FROM employees WHERE emp_no = ? AND id != ?')
        .get(data.empNo, id);
      if (dup) {
        throw new AppError(409, `工号 ${data.empNo} 已存在`, 'EMPLOYEE_NO_CONFLICT');
      }
      fields.push('emp_no = ?');
      params.push(data.empNo);
    }
    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name);
    }
    if (data.departmentId !== undefined) {
      fields.push('department_id = ?');
      params.push(data.departmentId);
    }

    if (fields.length === 0) {
      return {
        id: existing.id,
        empNo: existing.emp_no,
        name: existing.name,
        departmentId: existing.department_id,
        seatId: existing.seat_id,
        createdAt: existing.created_at,
      };
    }

    params.push(id);
    db.prepare(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as EmployeeRow;
    return {
      id: row.id,
      empNo: row.emp_no,
      name: row.name,
      departmentId: row.department_id,
      seatId: row.seat_id,
      createdAt: row.created_at,
    };
  }

  /**
   * 删除员工
   */
  deleteEmployee(id: number): void {
    const db = getDb();

    const existing = db.prepare('SELECT id FROM employees WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError(404, `员工 ID ${id} 不存在`, 'EMPLOYEE_NOT_FOUND');
    }

    db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  }

  /**
   * 按工号查询员工及其当前工位（需求 7079669334）
   * 查 assignments 表中 status='active' 的分配记录，联表获取工位信息
   * @param empNo 员工工号
   * @returns 员工工位查询结果（工位为 null 表示无分配）
   */
  getEmployeeSeatByEmpNo(empNo: string): EmployeeSeatResult {
    const db = getDb();

    // 查员工 + 部门名称
    const empRow = db
      .prepare(
        `
      SELECT e.id, e.emp_no, e.name, e.department_id, e.seat_id,
             d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.emp_no = ?
    `,
      )
      .get(empNo) as
      | {
          id: number;
          emp_no: string;
          name: string;
          department_id: number | null;
          seat_id: number | null;
          department_name: string | null;
        }
      | undefined;

    if (!empRow) {
      throw new AppError(404, `工号 ${empNo} 不存在`, 'EMPLOYEE_NOT_FOUND');
    }

    // 查 active 分配记录对应的工位
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

    const seatRow = db
      .prepare(
        `
      SELECT s.id, s.code, s.area, s.type, s.x, s.y, s.w, s.h,
             s.floor_plan_id, s.status, s.created_at,
             e2.name AS assignee_name, e2.emp_no AS assignee_emp_no
      FROM assignments a
      JOIN seats s ON a.seat_id = s.id
      LEFT JOIN employees e2 ON a.employee_id = e2.id
      WHERE a.employee_id = ? AND a.status = 'active'
      ORDER BY a.id DESC
      LIMIT 1
    `,
      )
      .get(empRow.id) as SeatJoinRow | undefined;

    let seat: SeatWithAssignee | null = null;
    if (seatRow) {
      seat = {
        id: seatRow.id,
        code: seatRow.code,
        area: seatRow.area,
        type: seatRow.type as Seat['type'],
        x: seatRow.x,
        y: seatRow.y,
        w: seatRow.w,
        h: seatRow.h,
        floorPlanId: seatRow.floor_plan_id,
        status: seatRow.status as SeatStatus,
        createdAt: seatRow.created_at,
        assigneeName: seatRow.assignee_name,
        assigneeEmpNo: seatRow.assignee_emp_no,
      };
    }

    return {
      employeeId: empRow.id,
      empNo: empRow.emp_no,
      employeeName: empRow.name,
      departmentId: empRow.department_id,
      departmentName: empRow.department_name,
      seat,
    };
  }

  /** CSV 批量导入员工
   * 解析工号/姓名/部门，去重（工号已存在则跳过），批量插入
   * 部门按名称查找，不存在时自动创建
   * @param csvText CSV 文件内容
   * @returns 导入结果
   */
  importFromCsv(csvText: string): CsvImportResult {
    const db = getDb();
    const rows = parseCsv(csvText);

    const result: CsvImportResult = {
      total: 0,
      inserted: 0,
      skipped: 0,
      errors: [],
    };

    if (rows.length === 0) {
      result.errors.push('CSV 文件为空');
      return result;
    }

    // 检测表头：第一行如果包含 emp_no/工号 等关键词则视为表头
    const headerRow = rows[0].map((h) => h.trim().toLowerCase());
    const hasHeader = headerRow.some(
      (h) =>
        h.includes('emp_no') ||
        h.includes('工号') ||
        h.includes('name') ||
        h.includes('姓名') ||
        h.includes('department') ||
        h.includes('部门'),
    );

    const dataRows = hasHeader ? rows.slice(1) : rows;
    result.total = dataRows.length;

    if (dataRows.length === 0) {
      return result;
    }

    // 预加载所有部门（名称 → id 缓存）
    const allDepts = departmentService.listDepartments();
    const deptCache = new Map<string, number>();
    for (const d of allDepts) {
      deptCache.set(d.name, d.id);
    }

    // 预加载所有已有工号
    const existingEmpNos = new Set<string>();
    const empNoRows = db.prepare('SELECT emp_no FROM employees').all() as { emp_no: string }[];
    for (const r of empNoRows) {
      existingEmpNos.add(r.emp_no);
    }

    // 事务批量插入
    const insertStmt = db.prepare(
      'INSERT INTO employees (emp_no, name, department_id) VALUES (?, ?, ?)',
    );

    const insertMany = db.transaction((records: CsvImportRow[]) => {
      for (const record of records) {
        if (!record.empNo || !record.name) {
          result.errors.push(`行数据不完整：工号或姓名为空`);
          continue;
        }

        // 去重：工号已存在则跳过
        if (existingEmpNos.has(record.empNo)) {
          result.skipped++;
          continue;
        }

        // 部门处理：查找或创建
        let departmentId: number | null = null;
        if (record.department && record.department.trim()) {
          const deptName = record.department.trim();
          if (deptCache.has(deptName)) {
            departmentId = deptCache.get(deptName)!;
          } else {
            // 自动创建新部门
            const newDept = departmentService.createDepartment({ name: deptName });
            deptCache.set(deptName, newDept.id);
            departmentId = newDept.id;
          }
        }

        insertStmt.run(record.empNo, record.name, departmentId);
        existingEmpNos.add(record.empNo);
        result.inserted++;
      }
    });

    // 解析 CSV 行为 CsvImportRow
    const csvImportRows: CsvImportRow[] = dataRows.map((row) => ({
      empNo: (row[0] || '').trim(),
      name: (row[1] || '').trim(),
      department: (row[2] || '').trim(),
    }));

    insertMany(csvImportRows);

    return result;
  }
}

/** 员工服务单例 */
export const employeeService = new EmployeeService();
