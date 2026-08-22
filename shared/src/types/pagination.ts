/**
 * 分页与平面图上传相关共享类型定义
 * 需求 7080518042：实现工位 CRUD API 与平面图底图管理
 */

// ============================================================================
// 分页类型
// ============================================================================

/** 分页查询参数 */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// 平面图 DTO
// ============================================================================

/** 创建平面图 DTO */
export interface CreateFloorPlanDto {
  name: string;
  width?: number;
  height?: number;
}

/** 平面图响应（含完整 URL） */
export interface FloorPlanResponse {
  id: number;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  createdAt: string;
}
