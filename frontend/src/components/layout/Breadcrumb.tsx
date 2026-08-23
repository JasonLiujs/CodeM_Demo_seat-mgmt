/**
 * 面包屑组件 — 基于 useLocation 解析当前路径
 */

import { useLocation, Link } from 'react-router-dom';

/** 路径到中文名称的映射 */
const routeLabels: Record<string, string> = {
  dashboard: '仪表盘',
  'seat-map': '工位地图',
  'seat-management': '工位管理',
  'seat-query': '工位查询',
  'seat-booking': '工位预约',
  'seat-assignment': '工位分配',
  'employee-management': '员工管理',
  'change-history': '变更历史',
};

/** 动态面包屑 */
export function Breadcrumb() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center text-sm text-gray-500 mb-4" aria-label="面包屑">
      <Link to="/dashboard" className="hover:text-gray-700">
        首页
      </Link>
      {pathSegments.map((segment, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        const label = routeLabels[segment] ?? segment;
        const isLast = index === pathSegments.length - 1;

        return (
          <span key={path} className="flex items-center">
            <span className="mx-2 text-gray-300">/</span>
            {isLast ? (
              <span className="text-gray-700 font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-gray-700">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
