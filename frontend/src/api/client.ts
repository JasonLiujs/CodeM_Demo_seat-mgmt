/**
 * API 客户端 — 封装后端 HTTP 请求
 */

import type { ApiResult } from '@seat-mgmt/shared';

/** API 基础路径 */
const API_BASE = '/api';

/** 发送 HTTP 请求并解析统一响应格式 */
async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const body: ApiResult<T> = await res.json();

  if (!body.success) {
    throw new Error(body.error.message);
  }

  return body.data;
}

/** GET 请求 */
export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

/** POST 请求 */
export function apiPost<T>(path: string, data?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/** PUT 请求 */
export function apiPut<T>(path: string, data?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/** DELETE 请求 */
export function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE' });
}
