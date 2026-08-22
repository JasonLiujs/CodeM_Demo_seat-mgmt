/**
 * 前端 API 封装 — 工位分配与变更日志接口
 * 需求 7079581339：封装 assignments + change-logs API 调用
 */

import type {
  Assignment,
  ChangeLogWithDetail,
  AssignDto,
  TransferDto,
  BatchAssignDto,
  RelocateDto,
  ChangeLogFilterDto,
  PaginatedResponse,
} from '@seat-mgmt/shared';

/** 通用请求方法 */
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

/** 批量分配/搬迁结果类型 */
interface RelocateResult {
  message: string;
}

/** 分配变更日志分页响应 */
type ChangeLogPaginated = PaginatedResponse<ChangeLogWithDetail>;

/** 工位分配 API 封装 */
export const assignmentApi = {
  /** 查询分配记录列表 */
  listAssignments(params?: {
    seatId?: number;
    employeeId?: number;
    status?: 'active' | 'inactive';
  }): Promise<Assignment[]> {
    const query = new URLSearchParams();
    if (params?.seatId) query.set('seatId', String(params.seatId));
    if (params?.employeeId) query.set('employeeId', String(params.employeeId));
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return request<Assignment[]>(`/api/assignments${qs ? `?${qs}` : ''}`);
  },

  /** 分配工位给员工 */
  assign(data: AssignDto): Promise<Assignment> {
    return request<Assignment>('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** 取消分配 */
  async unassign(id: number, operator?: string): Promise<void> {
    const query = operator ? `?operator=${encodeURIComponent(operator)}` : '';
    const res = await fetch(`/api/assignments/${id}${query}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message || `取消失败: ${res.status}`);
    }
  },

  /** 工位变更（转移） */
  transfer(data: TransferDto): Promise<Assignment> {
    return request<Assignment>('/api/assignments/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** 批量分配 */
  batchAssign(data: BatchAssignDto): Promise<Assignment[]> {
    return request<Assignment[]>('/api/assignments/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** 部门搬迁 */
  relocate(data: RelocateDto): Promise<RelocateResult> {
    return request<RelocateResult>('/api/assignments/relocate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/** 变更日志 API 封装 */
export const changeLogApi = {
  /** 查询变更历史（分页 + 筛选） */
  listChangeLogs(params: ChangeLogFilterDto): Promise<ChangeLogPaginated> {
    const query = new URLSearchParams();
    if (params.action) query.set('action', params.action);
    if (params.departmentId) query.set('departmentId', String(params.departmentId));
    if (params.employeeId) query.set('employeeId', String(params.employeeId));
    if (params.seatId) query.set('seatId', String(params.seatId));
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    return request<ChangeLogPaginated>(`/api/change-logs?${query.toString()}`);
  },
};
