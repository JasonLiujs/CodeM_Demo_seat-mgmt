/**
 * Toast 全局状态 — zustand store
 * 仅依赖 zustand，无 React import，可在 api 层直接调用
 */

import { create } from 'zustand';

/** Toast 类型 */
type ToastType = 'success' | 'error' | 'info';

/** Toast 项 */
interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

/** 自动关闭时长（毫秒） */
const AUTO_CLOSE_DURATION = 3000;

/** 自增计数器，用于生成唯一 id */
let toastSeq = 0;

/** 生成唯一 toast id */
function genToastId(): string {
  toastSeq += 1;
  return `toast-${Date.now()}-${toastSeq}`;
}

/** 定时器句柄表，dismissToast/clearToasts 时清理 */
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Toast store 接口 */
interface ToastStore {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

/** Toast 全局 store */
export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (type, message) => {
    const id = genToastId();
    const toast: Toast = { id, type, message };
    set((state) => ({ toasts: [...state.toasts, toast] }));

    // 3s 自动关闭，保存 timer 句柄以便 dismissToast/clearToasts 清理
    const timer = setTimeout(() => {
      toastTimers.delete(id);
      get().dismissToast(id);
    }, AUTO_CLOSE_DURATION);
    toastTimers.set(id, timer);
  },

  dismissToast: (id) => {
    const timer = toastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.delete(id);
    }
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clearToasts: () => {
    toastTimers.forEach((timer) => clearTimeout(timer));
    toastTimers.clear();
    set({ toasts: [] });
  },
}));

// 为了便于 api 层等非 React 环境调用，导出 getState
export const toastStore = {
  getState: useToastStore.getState,
  addToast: (type: ToastType, message: string) => useToastStore.getState().addToast(type, message),
  dismissToast: (id: string) => useToastStore.getState().dismissToast(id),
  clearToasts: () => useToastStore.getState().clearToasts(),
};

export type { Toast, ToastType };
