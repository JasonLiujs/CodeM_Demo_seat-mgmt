/**
 * 前端 API 封装 — 工位与平面图接口调用
 * 需求 7080518042：封装后端 REST API 调用
 */

import type {
  SeatWithAssignee,
  CreateSeatDto,
  UpdateSeatDto,
  SeatFilterDto,
  PaginatedResponse,
  FloorPlanResponse,
} from '@seat-mgmt/shared';

/** 查询参数类型（筛选 + 分页） */
type SeatQueryParams = SeatFilterDto & { page?: number; pageSize?: number };

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

/** 工位 API 封装 */
export const seatApi = {
  /** 分页查询工位列表（含分配人信息） */
  listSeats(params: SeatQueryParams): Promise<PaginatedResponse<SeatWithAssignee>> {
    const query = new URLSearchParams();
    if (params.area) query.set('area', params.area);
    if (params.type) query.set('type', params.type);
    if (params.status) query.set('status', params.status);
    if (params.floorPlanId) query.set('floorPlanId', String(params.floorPlanId));
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    return request<PaginatedResponse<SeatWithAssignee>>(`/api/seats?${query}`);
  },

  /** 创建工位 */
  createSeat(data: CreateSeatDto): Promise<SeatWithAssignee> {
    return request<SeatWithAssignee>('/api/seats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** 更新工位 */
  updateSeat(id: number, data: UpdateSeatDto): Promise<SeatWithAssignee> {
    return request<SeatWithAssignee>(`/api/seats/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /** 删除工位 */
  async deleteSeat(id: number): Promise<void> {
    const res = await fetch(`/api/seats/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message || `删除失败: ${res.status}`);
    }
  },
};

/** 平面图 API 封装 */
export const floorPlanApi = {
  /** 查询所有平面图 */
  listFloorPlans(): Promise<FloorPlanResponse[]> {
    return request<FloorPlanResponse[]>('/api/floor-plans');
  },

  /** 上传平面图底图 */
  async uploadFloorPlan(
    file: File,
    name: string,
    width?: number,
    height?: number,
  ): Promise<FloorPlanResponse> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', name);
    if (width) formData.append('width', String(width));
    if (height) formData.append('height', String(height));

    const res = await fetch('/api/floor-plans', {
      method: 'POST',
      body: formData,
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body?.error?.message || `上传失败: ${res.status}`);
    }
    return body.data as FloorPlanResponse;
  },
};
