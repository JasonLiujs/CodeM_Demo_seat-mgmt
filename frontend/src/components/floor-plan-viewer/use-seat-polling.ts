/**
 * useSeatPolling — 工位列表轮询自定义 hook
 * 需求 7080593490：5s 轮询 GET /api/seats 保持状态实时刷新
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SeatWithAssignee } from '@seat-mgmt/shared';
import { seatApi } from '../../api/seat-api';
import { DEFAULT_POLLING_INTERVAL, POLLING_PAGE_SIZE } from './constants';

/** useSeatPolling 返回值 */
interface UseSeatPollingResult {
  /** 当前工位列表 */
  seats: SeatWithAssignee[];
  /** 是否正在加载（首次请求中） */
  isLoading: boolean;
  /** 请求错误信息（失败不中断轮询） */
  error: string | null;
  /** 手动刷新 */
  refresh: () => void;
}

/**
 * 按平面图轮询工位列表
 * - 首次立即请求
 * - 之后按 interval 间隔重复请求
 * - 请求失败置 error 不中断后续轮询
 * - 卸载时清理定时器
 */
export function useSeatPolling(
  floorPlanId: number | null,
  interval: number = DEFAULT_POLLING_INTERVAL,
): UseSeatPollingResult {
  const [seats, setSeats] = useState<SeatWithAssignee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchSeats = useCallback(async () => {
    if (floorPlanId === null) {
      setSeats([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    try {
      const result = await seatApi.listSeats({
        floorPlanId,
        pageSize: POLLING_PAGE_SIZE,
      });
      if (!mountedRef.current) return;
      setSeats(result.data);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : '加载工位失败');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [floorPlanId]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchSeats();

    const timer = setInterval(() => {
      void fetchSeats();
    }, interval);

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [fetchSeats, interval]);

  return { seats, isLoading, error, refresh: fetchSeats };
}
