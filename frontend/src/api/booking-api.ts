/**
 * 前端 API 封装 — 临时工位预约接口
 * 需求 7079562886：封装 bookings API 调用
 */

import type {
  CreateBookingDto,
  BookingFilterDto,
  BookingWithDetail,
  PaginatedResponse,
} from '@seat-mgmt/shared';

/** 预约查询参数（筛选 + 分页） */
type BookingQueryParams = BookingFilterDto & {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

/** 通用请求方法 */
async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  // 204 无内容（取消预约）
  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body?.error?.message || `请求失败: ${res.status}`);
  }
  return body.data as T;
}

/** 预约 API 封装 */
export const bookingApi = {
  /** 查询预约列表（分页 + 筛选） */
  listBookings(params: BookingQueryParams): Promise<PaginatedResponse<BookingWithDetail>> {
    const query = new URLSearchParams();
    if (params.seatId) query.set('seatId', String(params.seatId));
    if (params.employeeId) query.set('employeeId', String(params.employeeId));
    if (params.status) query.set('status', params.status);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    return request<PaginatedResponse<BookingWithDetail>>(`/api/bookings?${query}`);
  },

  /** 创建预约 */
  createBooking(data: CreateBookingDto): Promise<BookingWithDetail> {
    return request<BookingWithDetail>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** 取消预约 */
  async cancelBooking(id: number, operator?: string): Promise<void> {
    const query = operator ? `?operator=${encodeURIComponent(operator)}` : '';
    await request<void>(`/api/bookings/${id}${query}`, { method: 'DELETE' });
  },
};
