/**
 * API 客户端 — 封装后端 HTTP 请求
 * API 错误统一通过 toast-store 触发错误提示
 */

import type { ApiResult } from '@seat-mgmt/shared';
import { toastStore } from '../store/toast-store';

/** API 基础路径 */
const API_BASE = '/api';

/**
 * 发送 HTTP 请求并解析统一响应格式
 * 业务错误（body.success === false）和网络错误均会触发错误 toast 后 rethrow
 */
export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  // 标记是否已在业务分支触发过 toast，避免 catch 中重复提示
  let businessError = false;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    const body: ApiResult<T> = await res.json();

    if (!body.success) {
      const message = body.error.message;
      toastStore.addToast('error', message);
      businessError = true;
      throw new Error(message);
    }

    return body.data;
  } catch (err) {
    // 仅对非业务错误（网络错误、JSON 解析失败等）触发 toast
    // 业务错误已在上文 addToast，此处不再重复
    if (!businessError) {
      const message = err instanceof Error ? err.message : '请求失败，请稍后重试';
      toastStore.addToast('error', message);
    }
    throw err;
  }
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
