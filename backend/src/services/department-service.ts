/**
 * 部门 CRUD 服务层
 * 需求 7080732492：实现部门管理 API
 */

import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error.js';
import type { Department, CreateDepartmentDto, UpdateDepartmentDto } from '@seat-mgmt/shared';

/** 将数据库行映射为 Department 实体 */
interface DepartmentRow {
  id: number;
  name: string;
  created_at: string;
}

/** 行映射到实体 */
function mapRow(row: DepartmentRow): Department {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

/**
 * 部门服务 — 提供部门的增删改查
 */
export class DepartmentService {
  /**
   * 查询所有部门
   * @returns 部门列表
   */
  listDepartments(): Department[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM departments ORDER BY id ASC').all() as DepartmentRow[];
    return rows.map(mapRow);
  }

  /**
   * 根据 ID 查询部门
   */
  getDepartmentById(id: number): Department {
    const db = getDb();
    const row = db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as DepartmentRow | undefined;
    if (!row) {
      throw new AppError(404, `部门 ID ${id} 不存在`, 'DEPARTMENT_NOT_FOUND');
    }
    return mapRow(row);
  }

  /**
   * 根据名称查询部门（内部使用，不抛异常）
   */
  getDepartmentByName(name: string): Department | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM departments WHERE name = ?').get(name) as DepartmentRow | undefined;
    return row ? mapRow(row) : null;
  }

  /**
   * 创建部门
   * @param data 创建 DTO
   * @returns 新创建的部门
   */
  createDepartment(data: CreateDepartmentDto): Department {
    const db = getDb();

    // 检查名称是否重复
    const existing = db.prepare('SELECT id FROM departments WHERE name = ?').get(data.name);
    if (existing) {
      throw new AppError(409, `部门名称 ${data.name} 已存在`, 'DEPARTMENT_NAME_CONFLICT');
    }

    const result = db.prepare('INSERT INTO departments (name) VALUES (?)').run(data.name);
    const row = db.prepare('SELECT * FROM departments WHERE id = ?').get(result.lastInsertRowid) as DepartmentRow;
    return mapRow(row);
  }

  /**
   * 更新部门
   * @param id 部门 ID
   * @param data 更新 DTO
   * @returns 更新后的部门
   */
  updateDepartment(id: number, data: UpdateDepartmentDto): Department {
    const db = getDb();

    const existing = db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as DepartmentRow | undefined;
    if (!existing) {
      throw new AppError(404, `部门 ID ${id} 不存在`, 'DEPARTMENT_NOT_FOUND');
    }

    if (data.name !== undefined) {
      // 检查名称是否与其他部门重复
      const dup = db.prepare('SELECT id FROM departments WHERE name = ? AND id != ?').get(data.name, id);
      if (dup) {
        throw new AppError(409, `部门名称 ${data.name} 已存在`, 'DEPARTMENT_NAME_CONFLICT');
      }
      db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(data.name, id);
    }

    const row = db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as DepartmentRow;
    return mapRow(row);
  }

  /**
   * 删除部门
   * @param id 部门 ID
   */
  deleteDepartment(id: number): void {
    const db = getDb();

    const existing = db.prepare('SELECT id FROM departments WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError(404, `部门 ID ${id} 不存在`, 'DEPARTMENT_NOT_FOUND');
    }

    db.prepare('DELETE FROM departments WHERE id = ?').run(id);
  }
}

/** 部门服务单例 */
export const departmentService = new DepartmentService();
