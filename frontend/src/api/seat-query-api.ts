/**
 * 工位查询 API 封装
 * 需求 7079669334：按工号查询员工工位
 */

import type { EmployeeSeatResult } from '@seat-mgmt/shared';

/** 通用请求方法 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
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

/** 工位查询 API 封装 */
export const seatQueryApi = {
  /** 按工号查询员工工位 */
  getEmployeeSeat(empNo: string): Promise<EmployeeSeatResult> {
    return request<EmployeeSeatResult>(`/api/employees/${encodeURIComponent(empNo)}/seat`);
  },
};
