/**
 * 全局布局组件 — 侧边栏导航 + 内容区域
 */

import { Outlet, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: '仪表盘' },
  { to: '/seat-map', label: '工位地图' },
];

export function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏 */}
      <aside className="w-64 bg-slate-800 text-white flex flex-col">
        <div className="px-6 py-4 border-b border-slate-700">
          <h1 className="text-xl font-bold">工位管理系统</h1>
          <p className="text-xs text-slate-400 mt-1">MVP v1.0</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 主内容区域 */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
