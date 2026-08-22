/**
 * 前端全局状态管理（Zustand）
 * 管理当前用户工号、当前平面图 ID、工位列表缓存
 */

import { create } from 'zustand';
import type { Seat } from '@seat-mgmt/shared';

/** 全局应用状态 */
interface AppState {
  /** 当前操作员工号 */
  currentUser: string | null;
  /** 当前平面图 ID */
  currentFloorPlanId: number | null;
  /** 工位列表缓存 */
  seats: Seat[];
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;

  /** 设置当前用户 */
  setCurrentUser: (empNo: string | null) => void;
  /** 设置当前平面图 */
  setCurrentFloorPlanId: (id: number | null) => void;
  /** 设置工位列表 */
  setSeats: (seats: Seat[]) => void;
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void;
  /** 设置错误信息 */
  setError: (error: string | null) => void;
}

/** 全局 Zustand store */
export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  currentFloorPlanId: null,
  seats: [],
  loading: false,
  error: null,

  setCurrentUser: (currentUser) => set({ currentUser }),
  setCurrentFloorPlanId: (currentFloorPlanId) => set({ currentFloorPlanId }),
  setSeats: (seats) => set({ seats }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
