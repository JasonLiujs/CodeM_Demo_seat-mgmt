/**
 * 前端 API 封装 — 变更历史查询与 CSV 导出
 * 需求 7078969349：封装 change-logs 查询 + export 接口调用
 */

import type {
  ChangeLogWithDetail,
  ChangeLogFilterDto,
  PaginatedResponse,
} from '@seat-mgmt/shared';

/** 通用请求方法（解析 JSON 响应） */
async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body?.error?.message || `请求失败: ${res.status}`);
  }
  return body.data as T;
}

/** 变更日志查询参数（筛选 + 分页） */
type ChangeLogQueryParams = ChangeLogFilterDto;

/** 构建变更日志查询的 query string */
function buildChangeLogQuery(params: ChangeLogQueryParams): URLSearchParams {
  const query = new URLSearchParams();
  if (params.action) query.set('action', params.action);
  if (params.departmentId) query.set('departmentId', String(params.departmentId));
  if (params.employeeId) query.set('employeeId', String(params.employeeId));
  if (params.seatId) query.set('seatId', String(params.seatId));
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return query;
}

/** 变更历史 API 封装 */
export const changeLogApi = {
  /** 查询变更历史（分页 + 筛选） */
  listChangeLogs(params: ChangeLogQueryParams): Promise<PaginatedResponse<ChangeLogWithDetail>> {
    const query = buildChangeLogQuery(params);
    return request<PaginatedResponse<ChangeLogWithDetail>>(`/api/change-logs?${query.toString()}`);
  },

  /**
   * 导出变更历史为 CSV（触发浏览器下载）
   * 使用 window.open 让浏览器直接处理文件流下载
   */
  exportChangeLogs(params: ChangeLogFilterDto): void {
    const query = buildChangeLogQuery(params);
    window.open(`/api/change-logs/export?${query.toString()}`, '_blank');
  },
};
