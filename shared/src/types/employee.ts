/**
 * 员工与部门共享类型定义
 * 需求 7080732492：员工数据管理与 CSV 批量导入
 */

import type { SeatWithAssignee } from './index';

// ============================================================================
// 部门 DTO
// ============================================================================

/** 创建部门 DTO */
export interface CreateDepartmentDto {
  name: string;
}

/** 更新部门 DTO */
export interface UpdateDepartmentDto {
  name?: string;
}

// ============================================================================
// 员工 DTO（扩展已有 CreateEmployeeDto / EmployeeFilterDto）
// ============================================================================

/** 更新员工 DTO */
export interface UpdateEmployeeDto {
  empNo?: string;
  name?: string;
  departmentId?: number | null;
}

/** 员工列表查询参数（含分页） */
export interface EmployeeListQueryDto {
  departmentId?: number;
  name?: string;
  page?: number;
  pageSize?: number;
}

/** 带部门名称的员工实体（联表查询结果） */
export interface EmployeeWithDepartment {
  id: number;
  empNo: string;
  name: string;
  departmentId: number | null;
  departmentName: string | null;
  seatId: number | null;
  createdAt: string;
}

// ============================================================================
// CSV 导入
// ============================================================================

/** CSV 导入单行数据 */
export interface CsvImportRow {
  empNo: string;
  name: string;
  department: string;
}

/** CSV 导入结果 */
export interface CsvImportResult {
  total: number;
  inserted: number;
  skipped: number;
  errors: string[];
}

// ============================================================================
// 工位查询（需求 7079669334）
// ============================================================================

/** 员工工位查询结果 — 按工号查询员工及其当前工位 */
export interface EmployeeSeatResult {
  /** 员工 ID */
  employeeId: number;
  /** 工号 */
  empNo: string;
  /** 员工姓名 */
  employeeName: string;
  /** 部门 ID */
  departmentId: number | null;
  /** 部门名称 */
  departmentName: string | null;
  /** 工位信息（无分配时为 null） */
  seat: SeatWithAssignee | null;
}
