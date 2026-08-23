/**
 * 404 页面 — 居中提示「页面不存在」+ 返回首页按钮
 */

import { Link } from 'react-router-dom';

/** 404 页面 */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <p className="text-6xl font-bold text-gray-300">404</p>
      <p className="mt-4 text-lg text-gray-600">页面不存在</p>
      <p className="mt-2 text-sm text-gray-400">您访问的页面可能已被移除或暂时不可用</p>
      <Link
        to="/dashboard"
        className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        返回首页
      </Link>
    </div>
  );
}
