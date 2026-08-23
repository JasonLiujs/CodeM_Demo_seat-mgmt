/**
 * ToastProvider — 订阅 toast store 并渲染固定容器
 */

import { createPortal } from 'react-dom';
import { useToastStore } from '../../store/toast-store';
import type { ToastType } from '../../store/toast-store';

/** Toast 类型对应的颜色样式 */
const toastStyles: Record<ToastType, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
};

/** Toast 类型对应的图标 */
const toastIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

/** Toast 容器与渲染 */
export function ToastProvider() {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[260px] max-w-sm transition-all duration-300 animate-[slideIn_0.3s_ease-out] ${toastStyles[toast.type]}`}
        >
          <span className="font-bold">{toastIcons[toast.type]}</span>
          <p className="flex-1 text-sm">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="text-white/70 hover:text-white text-lg leading-none"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
