/**
 * useToast — 封装 toast-store 的调用 hook
 * 页面/组件直接调用 showSuccess / showError / showInfo
 */

import { useCallback } from 'react';
import { toastStore } from '../../store/toast-store';

/** Toast 调用 hook */
export function useToast() {
  const showSuccess = useCallback((message: string) => {
    toastStore.addToast('success', message);
  }, []);

  const showError = useCallback((message: string) => {
    toastStore.addToast('error', message);
  }, []);

  const showInfo = useCallback((message: string) => {
    toastStore.addToast('info', message);
  }, []);

  return { showSuccess, showError, showInfo };
}
