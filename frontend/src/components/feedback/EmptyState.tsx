/**
 * 通用空状态组件
 * 居中渲染提示信息，可选图标和操作按钮
 */

import type { ReactNode } from 'react';

type EmptyStateProps = {
  /** 提示信息，默认「暂无数据」 */
  message?: string;
  /** 可选图标节点 */
  icon?: ReactNode;
  /** 可选操作按钮 */
  action?: ReactNode;
};

/** 通用空状态 */
export function EmptyState({ message = '暂无数据', icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-3 text-gray-300 text-4xl">{icon}</div>}
      <p className="text-sm text-gray-400">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
